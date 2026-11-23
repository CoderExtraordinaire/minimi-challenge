import { resolveDateRange } from "./dates.js";
import { getUserMessagesInRange, getFactsInRange, getMessages } from "./db.js";

export function buildContext(userId: string, chatId: string, text: string): string {
    const range = resolveDateRange(text);
    if (!range) return "";

    const asked = getUserMessagesInRange(userId, range.from, range.to, chatId, 4);
    const facts = getFactsInRange(userId, range.from, range.to, 4);

    if (asked.length === 0 && facts.length === 0) {
        return `Note: there are no saved records for "${range.label}". If the user is asking what they asked or were told in that period, say plainly that there is no record. Never invent past chats. Otherwise ignore this note.`;
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

        return `Saved records for "${range.label}" from the user's earlier chats. Use them to answer questions about the past. To check whether they are still correct, search the web, then give one verdict per saved item: CHANGED (old value, then new value), UNCHANGED, or COULD NOT VERIFY, with the source and its page date. Say UNCHANGED only if a source you just found shows the same value.\n${lines.join("\n")}`;
}