import Database from "better-sqlite3";

const userId = process.argv[2];
if (!userId) {
  console.log("usage: npx tsx src/seed.ts <userId>");
  process.exit(1);
}

const db = new Database("data/memory.db");
db.pragma("foreign_keys = ON");

function lastWeekday(dow: number, hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() !== dow);
  return d;
}

function seedChat(id: string, title: string, when: Date, question: string, answer: string): string {
  db.prepare("DELETE FROM facts WHERE chat_id = ?").run(id);
  db.prepare("DELETE FROM chats WHERE id = ?").run(id);
  const t1 = when.toISOString();
  const t2 = new Date(when.getTime() + 5000).toISOString();
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

function seedFact(chatId: string, item: string, value: string, url: string, when: Date): void {
  const t = when.toISOString();
  db.prepare(
    "INSERT INTO facts (user_id, chat_id, item, value, source_url, observed_at, valid_from) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, chatId, item, value, url, t, t);
}

const nov3 = new Date(new Date().getFullYear(), 10, 3, 10, 0, 0);
const tuesday = lastWeekday(2, 11);
const monday = lastWeekday(1, 9);

const pg = seedChat(
  "seed-pg-nov3",
  "Postgres hosting for a startup",
  nov3,
  "What is the best Postgres hosting for a small startup?",
  "Two good options: Neon (Launch plan, $19/month) and Supabase (Pro plan, $25/month)."
);
seedFact(pg, "neon launch plan price", "$19/month", "https://neon.tech/pricing", nov3);
seedFact(pg, "supabase pro plan price", "$25/month", "https://supabase.com/pricing", nov3);

const pg2 = seedChat(
  "seed-pg-tuesday",
  "Postgres hosting pricing check",
  tuesday,
  "Compare Postgres hosting pricing for small projects, including Railway.",
  "Railway is usage-based, roughly $5/month for a small database. Neon and Supabase are priced per plan."
);
seedFact(pg2, "railway postgres price", "$5/month", "https://railway.com/pricing", tuesday);

const crm = seedChat(
  "seed-crm-monday",
  "CRM shortlist for sales team",
  monday,
  "We have a 20-person sales team. Shortlist 5 CRM tools for us and give entry prices.",
  "Shortlist: HubSpot Starter $20, Pipedrive Essential $14, Zoho CRM Standard $14, Salesforce Starter $25, Freshsales Growth $9 (per seat per month)."
);
seedFact(crm, "crm shortlist", "HubSpot, Pipedrive, Zoho CRM, Salesforce Starter, Freshsales", "", monday);
seedFact(crm, "hubspot starter price", "$20/seat/month", "https://www.hubspot.com/pricing/crm", monday);
seedFact(crm, "pipedrive essential price", "$14/seat/month", "https://www.pipedrive.com/en/pricing", monday);
seedFact(crm, "zoho crm standard price", "$14/seat/month", "https://www.zoho.com/crm/zohocrm-pricing.html", monday);
seedFact(crm, "salesforce starter price", "$25/seat/month", "https://www.salesforce.com/crm/pricing/", monday);
seedFact(crm, "freshsales growth price", "$9/seat/month", "https://www.freshworks.com/crm/pricing/", monday);

console.log("seeded 3 chats and 9 facts for", userId);
console.log("  3 Nov chat:", nov3.toDateString());
console.log("  last Tuesday chat:", tuesday.toDateString());
console.log("  last Monday chat:", monday.toDateString());