import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import RuleText from "./models/RuleText.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

dotenv.config();

const uri = process.env.MONGODB_URI;
console.log("MONGO_URI:", uri);
await mongoose.connect(uri);
console.log("Mongo connected");

// Load rule text file
const rules = JSON.parse(fs.readFileSync("./data/rules_text.json", "utf-8"));

// Fake embedding generator (instead of calling OpenAI)
function fakeEmbedding(dim = 1536) {
  return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

// Embed each rule and store in DB
for (const r of rules) {
  console.log(`(FAKE) Embedding: ${r.zone} - ${r.section}`);

  const vector = fakeEmbedding();

  await RuleText.create({
    zone: r.zone,
    section: r.section,
    text: r.text,
    source: r.source,
    embedding: vector,
  });
}

await mongoose.disconnect();
process.exit(0);