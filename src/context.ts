import { resolveDateRange } from "./dates.js";
import { getUserMessagesInRange, getFactsInRange, getMessages } from "./db.js";

export function buildContext(userId: string, chatId: string, text: string): string {
    const range = resolveDateRange(text);
    if (!range) return "";

    const asked = getUserMessagesInRange(userId, range.from, range.to, chatId, 4);
    const facts = getFactsInRange(userId, range.from, range.to, 8);

    if (asked.length === 0 && facts.length === 0) {
        return `Note: there are no saved records for "${range.label}". If the user is asking what they asked or were told in that period, reply with exactly one short sentence: "I found no saved chat from ${range.label}." Do not give a reason, and never say that chats or history are not saved or not retained. Otherwise ignore this note and never mention it.`;
    }

    const lines: string[] = [];
    for (const m of asked) {
        const day = m.created_at.slice(0, 10);
        const answer = getMessages(m.chat_id).find((x) => x.role === "assistant" && x.id > m.id);
        lines.push(
            `- ${day}, user asked: "${m.content}"` + (answer ? ` | assistant answered: "${answer.content}"` : "")
        );
    }
    for (const f of facts) {
        const day = f.observed_at.slice(0, 10);
        lines.push(`- ${day}, saved fact: ${f.item} = ${f.value}` + (f.source_url ? ` (source: ${f.source_url})` : ""));
    }

    return `Saved records for "${range.label}" from the user's earlier chats. To check what happened since, search the web (one search per tool or company, all at once). Write one line per saved item, using the product's plain name and not the item label, in exactly this form:
    **Name**: was <saved value> → now <value you found> → CHANGED / UNCHANGED / COULD NOT VERIFY (source URL, page date or "date unknown").
    Write both values. Say UNCHANGED only if they are the same. If you found nothing, write "now: not found" and COULD NOT VERIFY. After the list, add one line about a big new feature or launch only if you have its source URL and page date. Otherwise add nothing. Do not write a general summary. Only include saved items relevant to the user's question.
    ${lines.join("\n")}`;
    }