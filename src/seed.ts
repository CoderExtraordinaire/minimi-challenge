import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const userId = process.argv[2];
if (!userId) {
    console.log("usage: npx tsx src/seed.ts <userId>");
    process.exit(1);
}

const db = new Database("data/memory.db");
db.pragma("foreign_keys = ON");

function seedChat(title: string, when: string, question: string, answer: string): string {
    const id = randomUUID();
    const t1 = new Date(when).toISOString();
    const t2 = new Date(new Date(when).getTime() + 5000).toISOString();
    db.prepare(
        "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, userId, title, t1, t2);
    db.prepare(
        "INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, 'user', ?, ?)"
    ).run(id, question, t1);
    db.prepare(
        "INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, 'assistant', ?, ?)"
    ).run(id, answer, t2);
    return id;
}

function seedFact(chatId: string, item: string, value: string, url: string, when: string): void {
    const t = new Date(when).toISOString();
    db.prepare(
        "INSERT INTO facts (user_id, chat_id, item, value, source_url, observed_at, valid_from) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, chatId, item, value, url, t, t);
}

const pg = seedChat(
    "Postgres hosting for a startup",
    "2026-11-03T10:00:00",
    "What is the best Postgres hosting for a small startup?",
    "Two good options: Neon (Launch plan, $19/month) and Supabase (Pro plan, $25/month)."
);
seedFact(pg, "neon launch plan price", "$19/month", "https://neon.tech/pricing", "2026-11-03T10:00:00");
seedFact(pg, "supabase pro plan price", "$25/month", "https://supabase.com/pricing", "2026-11-03T10:00:00");

const crm = seedChat(
    "CRM shortlist for sales team",
    "2026-11-16T09:00:00",
    "We have a 20-person sales team. Shortlist 5 CRM tools for us.",
    "Shortlist: HubSpot, Pipedrive, Zoho CRM, Salesforce Starter, Freshsales."
);
seedFact(crm, "crm shortlist", "HubSpot, Pipedrive, Zoho CRM, Salesforce Starter, Freshsales", "", "2026-11-16T09:00:00");

console.log("seeded 2 chats and 3 facts for", userId);