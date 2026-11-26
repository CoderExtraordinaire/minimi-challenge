# Minimi chat agent

A chat agent with one tool, web search, and a memory across chats. It can answer questions like "What did i ask you on 3 November? Is that still correct?" by loading what it said before and re-checking it on the web.

How it works and why: see [DESIGN.md](DESIGN.md).

## Run it

Requires Node 22.13  or newer.

...

npm install
cp .env.example .env  (on Windows: copy .env.example .env)
...

Open `.env` and add your keys:
- `EXA_API_KEY`: from the exa dashboard
- `GEMINI_API_KEY`: from Google AI Studio

...

npm run dev

...

Then open http://localhost:3000. The SQLite database (`data/memory.db`) is created on the first run.

## Try the memory

Memory is per browser, and each browser gets its own anonymous use id.

1. Start a chat and ask something that need search, for example "What does Superbase Pro cost per month?".

2. Start a new chat and ask "Today I asked about Superbase pricing, has it changed?". The agent loads the earlier answer, searches again and answers with CHANGED, UNCHANGED, or COULD NOT VERIFY, plus a source and date.

To try older dates without waiting, load sample history:

1. In the browser console, run `localStorage.getItem("userId")` and copy the id. 
2. `npm run seed -- <your-id>`
3. Ask "What did I ask you on 3 November?", or "On Monday we shorlisted 5 CRM tools. has any of them changed pricing?".

`npm run eval` sends example questions to the running server and prints the answers and times.Set `EVAL_USER` to your user id first, so it finds the seeded history.

## Notes

- Stack: TypeScript on Node (run with tsx), Express, SQLite(Node's built-in `node:sqlite`), chrono-node, Exa search and Gemini.
- The free Gemini tier can return 503 or 429 errors whrn busy.wait a minute and try again.
- Recommanded Gemini Model : "gemini-3.5-flash" OR " gemini-3.5-flash-lite". Switch between two if one hits free tier linits.
- Clearning the browser's site data creates a new user, and the earlier history is no longer visible to it.