import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

mkdirSync("data", { recursive: true });
const db = new DatabaseSync("data/memory.db");
db.exec("PRAGMA foreign_keys = ON;");
console.log("Database opened");

db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT 'New chat',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS facts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    chat_id     TEXT REFERENCES chats(id) ON DELETE SET NULL,
    item        TEXT NOT NULL,
    value       TEXT NOT NULL,
    source_url  TEXT,
    observed_at TEXT NOT NULL,
    valid_from  TEXT NOT NULL,
    valid_to    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_facts_user_item ON facts (user_id, item);
`);

export interface Chat {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export function createChat(userId: string): Chat {
    const now = new Date().toISOString();
    const chat: Chat = {
        id: randomUUID(),
        user_id: userId,
        title: "New chat",
        created_at: now,
        updated_at: now,
    };

    db.prepare(
        "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(chat.id, chat.user_id, chat.title, chat.created_at, chat.updated_at);

    return chat;
}

export function listChats(userId: string): Chat[] {
    return db
        .prepare("SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC")
        .all(userId) as unknown as Chat[];
}

export function getChat(userId: string, chatId: string): Chat | undefined {
    return db
        .prepare("SELECT * FROM chats WHERE id = ? AND user_id = ?")
        .get(chatId, userId) as unknown as Chat | undefined;
}

export type Role = "user" | "assistant";

export interface Message {
    id: number;
    chat_id: string;
    role: Role;
    content: string;
    created_at: string;
}

export function addMessage(chatId: string, role: Role, content: string): Message {
    const created_at = new Date().toISOString();

    const info = db
        .prepare("INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)")
        .run(chatId, role, content, created_at);

    db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?").run(created_at, chatId);

    return { id: Number(info.lastInsertRowid), chat_id: chatId, role, content, created_at };
}

export function getMessages(chatId: string): Message[] {
    return db
        .prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY id")
        .all(chatId) as unknown as Message[];
}

export function setTitle(chatId: string, title: string): void {
    db.prepare("UPDATE chats SET title = ? WHERE id = ?").run(title, chatId);
}

export function deleteChat(userId: string, chatId: string): boolean {
    const result = db
        .prepare("DELETE FROM chats WHERE id = ? AND user_id = ?")
        .run(chatId, userId);
    return Number(result.changes) > 0;
}

export interface Fact {
    id: number;
    user_id: string;
    chat_id: string | null;
    item: string;
    value: string;
    source_url: string | null;
    observed_at: string;
    valid_from: string;
    valid_to: string | null;
}

export function getCurrentFact(userId: string, item: string): Fact | undefined {
    return db
        .prepare("SELECT * FROM facts WHERE user_id = ? AND item = ? AND valid_to IS NULL")
        .get(userId, item) as unknown as Fact | undefined;
}

export function saveFact(
    userId: string,
    chatId: string | null,
    item: string,
    value: string,
    sourceUrl: string | null
): "added" | "unchanged" | "changed" {
    const now = new Date().toISOString();
    const current = getCurrentFact(userId, item);

    if (current && current.value === value) return "unchanged";

    db.exec("BEGIN");
    try {
        if (current) {
            db.prepare("UPDATE facts SET valid_to = ? WHERE id = ?").run(now, current.id);
        }
        db.prepare(
            "INSERT INTO facts (user_id, chat_id, item, value, source_url, observed_at, valid_from) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(userId, chatId, item, value, sourceUrl, now, now);
        db.exec("COMMIT");
    } catch (e) {
        db.exec("ROLLBACK");
        throw e;
    }

    return current ? "changed" : "added";
}

export function getUserMessagesInRange(
    userId: string,
    fromIso: string,
    toIso: string,
    excludeChatId: string = "",
    limit: number = 5
): (Message & { chat_title: string })[] {
    return db
        .prepare(
            `SELECT m.*, c.title AS chat_title
             FROM messages m JOIN chats c ON c.id = m.chat_id
             WHERE c.user_id = ? AND m.role = 'user'
               AND m.created_at BETWEEN ? AND ?
               AND m.chat_id != ?
             ORDER BY m.created_at DESC LIMIT ?`
        )
        .all(userId, fromIso, toIso, excludeChatId, limit) as unknown as (Message & { chat_title: string })[];
}

export function getFactsInRange(
    userId: string,
    fromIso: string,
    toIso: string,
    limit: number = 5
): Fact[] {
    return db
        .prepare(
            `SELECT * FROM facts
             WHERE user_id = ? AND observed_at BETWEEN ? AND ?
             ORDER BY observed_at DESC LIMIT ?`
        )
        .all(userId, fromIso, toIso, limit) as unknown as Fact[];
}