import { GoogleGenAI, Type, FunctionCallingConfigMode, type Content, ThinkingLevel } from "@google/genai";
import { webSearch } from "./search.js";
import type { Message } from "./db.js";

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

export async function reply(history: Message[]): Promise<string> {
  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  for (let step = 0; step < 4; step++) {

    const lastStep = step === 3;

    const response = await generateWithRetry({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
      systemInstruction: `You are a helpful assistant with web search. Today is ${new Date().toDateString()}.
      Search the web before answering anything about the outside world that could have changed: prices, plans, versions, releases, news, companies, products, people, or any question using words like latest, current, today, still, or since.
      Do not search for greetings, arithmetic, or rewriting the user's own text.
      Search at most twice per topic. After searching, name the source and page date for each fact. If a page has no date, say "date unknown".
      If the searches find nothing useful, say plainly that you could not find it. You may share what you know, but label it as unverified.
      Never invent facts or sources.`,
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
    if (!calls || calls.length === 0) return response.text ?? "";

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

        const parts = await Promise.all(
      calls.map(async (call) => {
        console.log("tool call:", JSON.stringify(call));

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