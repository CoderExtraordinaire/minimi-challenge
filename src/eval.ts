const BASE = "http://localhost:3000";
const USER = process.env.EVAL_USER ?? "eval-user";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "x-user-id": USER, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function ask(question: string) {
  const chat = await call("/api/chats", { method: "POST" });
  const t0 = Date.now();
  const out = await call(`/api/chats/${chat.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: question }),
  });
  const last = Array.isArray(out) ? out[out.length - 1] : out;
  return { answer: last?.content ?? "(no answer)", ms: Date.now() - t0 };
}

const QUESTIONS = [
  "What did I ask you on 3 November? Is your answer still correct today?",
  "Last Tuesday I asked you about postgres hosting. Has any pricing changed since then?",
  "On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?",
  "What did I ask you on 10 October?",
  "hi",
];

for (const q of QUESTIONS) {
  console.log("\nQ:", q);
  try {
    const { answer, ms } = await ask(q);
    console.log(`A (${(ms / 1000).toFixed(1)}s):`, answer);
  } catch (e) {
    console.log("FAILED:", (e as Error).message);
  }
}