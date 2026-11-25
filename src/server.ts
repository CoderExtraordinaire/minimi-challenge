

import express, { type Request, type Response } from "express";
import { listChats, createChat, getChat, getMessages, addMessage, setTitle, deleteChat } from "./db.js"
import { reply } from "./agent.js"

const app = express();
app.use(express.static("public"));

app.use(express.json());

app.get("/api/health", (req, res) => res.json({
     ok: true
}));

function getUserId(req: Request, res: Response): string | null {
     const id = req.header("x-user-id");
     if(!id) {
          res.status(400).json({ error: "Missing x-user-id header" })
          return null;
     }
     return id;
}

app.get("/api/chats", (req, res) => {
     const userId = getUserId(req, res);
     if (!userId) return;
     res.json(listChats(userId))
})

app.post("/api/chats", (req, res) => {
     const userId = getUserId(req, res);
     if(!userId) return;
     res.status(201).json(createChat(userId));
})

app.get("/api/chats/:id/messages", (req, res) => {
     const userId = getUserId(req, res);
     if(!userId) return;

     const chat = getChat(userId, req.params.id);
     if(!chat) {
          res.status(404).json({ error: "Chat not found" })
          return;
     }

     res.json(getMessages(chat.id));
})

app.post("/api/chats/:id/messages", async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const chat = getChat(userId, req.params.id);
  if (!chat) return res.status(404).json({ error: "Chat not found" });

  const content = req.body?.content;
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "content is required" });
  }

  addMessage(chat.id, "user", content.trim());
  if (chat.title === "New chat") setTitle(chat.id, content.trim().slice(0, 40));

  let answer: string;
  try{
     answer = await reply(getMessages(chat.id), userId, chat.id);
  }
  catch(e) {
     console.error(e);
     return res.status(500).json({ error: "The agent failed to answer or busy right now. Please Try again in a few seconds."})
  }
  addMessage(chat.id, "assistant", answer);
  res.status(201).json(getMessages(chat.id));
});

app.delete("/api/chats/:id", (req, res) => {
     const userId = getUserId(req, res);
     if(!userId) return;
     const deleted = deleteChat(userId, req.params.id);
     if(!deleted)  return res.status(404).json({ error: "Chat not found" });
     res.sendStatus(204).end();
});



const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Running at http://localhost:${port}`));
