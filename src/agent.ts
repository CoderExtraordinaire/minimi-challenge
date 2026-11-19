import { GoogleGenAI, Type, type Content } from "@google/genai";
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
    const response = await generateWithRetry({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: `You are a helpful assistant with web search. Today is ${new Date().toDateString()}. Always search before answering questions about current prices, versions, news or anything that may have changed.`,
        tools,
      },
    });

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) return response.text ?? "";

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const parts = await Promise.all(
      calls.map(async (call) => {
        const query = (call.args as { query: string }).query;
        
        console.log("searching:", query)

        const results = await webSearch(query);
        return {
          functionResponse: {
            name: call.name ?? "web_search",
            response: { results },
          },
        };
      })
    );

    contents.push({ role: "user", parts });
  }

  return "I could not find a good answer after searching.";
}