const userId = localStorage.getItem("userId") || crypto.randomUUID(); //reads
localStorage.setItem("userId", userId);          //save in ls

let currentChatId = null;  

//only one fetch
async function api(path, options = {}) {
    const res = await fetch(path, {
        ...options,
        headers: { "x-user-id": userId, "Content-Type": "application/json" },
    });
    if(res.status === 204) return null;
    return res.json();                           // server reply n js obj
}

// make one div per chat 
async function loadChats() {
    const chats = await api("/api/chats");
    const list = document.getElementById("chat-list");
    list.innerHTML = "";
    for (const chat of chats) {
        const div = document.createElement("div");
        div.textContent = chat.title;
        div.addEventListener("click", () => openChat(chat.id));
        list.appendChild(div);
    }
}

//caht button
document.getElementById("new-chat").addEventListener("click", async () => {
    const chat = await api("/api/chats", { method: "POST" });
    await openChat(chat.id);
    await loadChats();
});

     //starts empty new chat
//msg show
async function openChat(id) {
    currentChatId = id;
    const messages = await api(`/api/chats/${id}/messages`);
    const box = document.getElementById("messages");
    box.innerHTML = "";
    for (const m of messages) {
        const div = document.createElement("div");
        div.textContent = `${m.role}: ${m.content}`;
        box.appendChild(div);
    }
}

// send
document.getElementById("send").addEventListener("click", async () => {
    const input = document.getElementById("input");
    const text = input.value.trim();
    if(!text || !currentChatId) return;
    input.value = "";
    await api(`/api/chats/${currentChatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
    })
    await openChat(currentChatId);
    await loadChats();
})

document.getElementById("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("send").click();
});

loadChats ();