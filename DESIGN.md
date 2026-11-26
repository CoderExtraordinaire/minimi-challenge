# Design

**What it is.** A chat agent with one tool, web search, and memory across
chats. It answers time-anchored questions such as "What did I ask you on
3 November? Is that still correct?" by loading what it said then and
re-checking it on the web.

## How a request flows

```
User message
   |
   v
Context resolver (code, no LLM)  <---- read ----  Memory (SQLite, by user_id)
   chrono-node: date phrase -> range              chats, messages,
   loads that user's saved questions,             facts (valid_from, valid_to,
   answers and facts, across chats                source_url)
   (no date in the message = no lookup)                 ^
   |                                                    |
   v                                                    |
Agent loop (one LLM, max 4 steps)                       |
   plans, searches in parallel (Exa)                    |
   last step has tools off                              |
   |                                                    |
   v                                                    |
Answer per item: was -> now -> CHANGED / UNCHANGED /    |
   COULD NOT VERIFY, with source and page date          |
   |                                                    |
   v                                                    |
Post-processing (code, no LLM)  ------- write ----------+
   plain-text cleanup, save the answer
   keep a fact only if its URL came from this turn's search;
   a changed value retires the old fact
```

1. **Resolver (code, no LLM).** chrono-node turns a phrase like "last Tuesday"
   into a date range. Code loads that user's saved questions, answers and
   facts from SQLite for those dates and adds them to the prompt. If nothing
   is saved, the prompt says so, so the agent says "no saved chat" and
   doesn't invent one.
2. **Agent loop (one LLM, max 4 steps).** The model decides what to search,
   and the Exa searches run in parallel. On the last step, tools are switched
   off, so the loop always ends with a written answer.
3. **Post-processing (code, no LLM).** The answer ends with a hidden block of
   facts (item, value, source URL). A fact is saved only if its URL appeared
   in this turn's search results. A changed value retires the old fact and
   adds the new one. The reply is converted to plain text and saved.