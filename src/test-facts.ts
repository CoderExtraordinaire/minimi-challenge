import { saveFact, getCurrentFact } from "./db.js";

console.log(saveFact("test", null, "neon launch price", "$19/month", "https://neon.tech/pricing"));
console.log(saveFact("test", null, "neon launch price", "$19/month", "https://neon.tech/pricing"));
console.log(saveFact("test", null, "neon launch price", "$25/month", "https://neon.tech/pricing"));
console.log(getCurrentFact("test", "neon launch price"));