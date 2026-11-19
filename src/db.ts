import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

mkdirSync("data", { recursive: true });
const db = new Database("data/memory.db");
console.log("Database opened");

db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT 'New chat',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
    );
    `)

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL
    );`
);

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
        .all(userId) as Chat[];
}

export function getChat(userId: string, chatId: string): Chat | undefined {
    return db   
        .prepare("SELECT * FROM chats WHERE id = ? AND user_id = ?")
        .get(chatId, userId) as Chat  | undefined;
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
    .all(chatId) as Message[];
}

export function setTitle(chatId: string, title: string): void {
    db.prepare("UPDATE chats SET title = ? WHERE id = ?").run(title, chatId);
}

export function deleteChat(userId: string, chatId: string): boolean {
    const result = db 
        .prepare("DELETE FROM chats WHERE id = ? AND user_id = ?")
        .run(chatId, userId);
    return result.changes > 0;

}