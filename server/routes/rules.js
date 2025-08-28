import { Router } from "express";
import fs from "fs";
import path from "path";
import Rule from "../models/Rule.js";

const r = Router();
const rulesPath = path.resolve("data/rules.json");

async function ensureRuleSeed() {
  const count = await Rule.countDocuments();
  if (count === 0) {
    const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
    await Rule.create(rules);
  }
}

r.get("/", async (req, res) => {
  await ensureRuleSeed();
  const { zone } = req.query;
  const rule = await Rule.findOne(zone ? { zone } : {});
  res.json(rule);
});

export default r;
