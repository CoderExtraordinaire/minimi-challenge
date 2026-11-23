import { createChat, addMessage, saveFact, getUserMessagesInRange, getFactsInRange } from "./db.js";
import { resolveDateRange } from "./dates.js";

const chat = createChat("test2");
addMessage(chat.id, "user", "what is the best postgres hosting?");
saveFact("test2", chat.id, "neon launch price", "$19/month", null);

const range = resolveDateRange("what did I ask today")!;
console.log(getUserMessagesInRange("test2", range.from, range.to));
console.log(getUserMessagesInRange("test2", range.from, range.to, chat.id));
console.log(getFactsInRange("test2", range.from, range.to));