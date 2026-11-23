import { GoogleGenAI, Type, FunctionCallingConfigMode, ThinkingLevel, type Content } from "@google/genai";
import { saveFact, type Message } from "./db.js";
import { extractFacts } from "./facts.js";
import { buildContext } from "./context.js";
import { webSearch } from "./search.js";

const MODEL = "gemini-3.5-flash-lite";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const tools = [
  {
    functionDeclarations: [
      {
        name: "web_search",
        description:
          "Search the web for current information. Use this for any question that needs up-to-date facts.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "The search query" },
          },
          required: ["query"],
        },
      },
    ],
  },
];

async function generateWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0]
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (e: any) {
      if (e.status !== 503 || attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

export async function reply(history: Message[], userId: string, chatId: string): Promise<string> {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const memory = lastUser ? buildContext(userId, chatId, lastUser.content) : "";

  const seenUrls = new Set<string>();
  const norm = (u: string) => u.replace(/\/+$/, "");

  const finish = (text: string): string => {
    const { clean, facts } = extractFacts(text);
    for (const f of facts) {
      if (seenUrls.has(norm(f.source_url))) {
        saveFact(userId, chatId, f.item.toLowerCase().trim(), f.value.trim(), f.source_url);
      }
    }
    return clean;
  };

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  for (let step = 0; step < 4; step++) {
    const lastStep = step === 3;

    const response = await generateWithRetry({
      model: MODEL,
      contents,
      config: {
        systemInstruction: `You are a fast, helpful assistant with web search. Today is ${new Date().toDateString()}.
Search before answering anything that can change: prices, plans, versions, news, products, people, or words like latest, current, today, still, since. Don't search for greetings, math or rewriting.
Run all searches at once, at most two per topic. Name each source and its page date ("date unknown" if none).
If nothing useful is found, say so. Never invent facts or sources. Keep answers short.
If you searched, end with <facts>[{"item":"...","value":"...","source_url":"..."}]</facts> listing each price, limit, version or shortlist you found. Use the exact item names from saved records, and a URL from your search results. Skip the block if there is nothing to list.` + (memory ? "\n\n" + memory : ""),
        tools,
        toolConfig: {
          functionCallingConfig: {
            mode: lastStep
              ? FunctionCallingConfigMode.NONE
              : FunctionCallingConfigMode.AUTO,
          },
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) return finish(response.text ?? "");

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const parts = await Promise.all(
      calls.map(async (call) => {
        const name = call.name ?? "web_search";
        const args = (call.args ?? {}) as { query?: unknown };
        const query = typeof args.query === "string" ? args.query.trim() : "";

        if (!query) {
          return {
            functionResponse: {
              id: call.id,
              name,
              response: { error: "Missing 'query'. Call web_search again with a query string." },
            },
          };
        }

        try {
          const results = await webSearch(query);
          for (const r of results) seenUrls.add(norm(r.url));
          if (results.length === 0) {
            return {
              functionResponse: {
                id: call.id,
                name,
                response: {
                  results: [],
                  note: "No results found. Try at most one differently worded query, then tell the user you could not find it.",
                },
              },
            };
          }
          return { functionResponse: { id: call.id, name, response: { results } } };
        } catch (e) {
          return {
            functionResponse: {
              id: call.id,
              name,
              response: { error: `Search failed: ${(e as Error).message}` },
            },
          };
        }
      })
    );

    contents.push({ role: "user", parts });
  }

  return "I could not find a good answer after searching.";
}