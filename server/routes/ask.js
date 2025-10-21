import express from "express";
import RuleText from "../models/RuleText.js";

const r = express.Router();

// Simple cosine-similarity helper
function cosineSim(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (magA * magB);
}

// Very rough “embedding” for question – text-based numeric hash
function fakeQuestionEmbedding(text, dim = 1536) {
  const vec = Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const idx = i % dim;
    vec[idx] += (text.charCodeAt(i) % 37) / 37;
  }
  return vec;
}

// POST /api/ask
r.post("/", async (req, res) => {
  const { question, zone, failedRules } = req.body;

  if (!question) return res.status(400).json({ error: "Missing question" });

  // Filter by zone (if provided)
  const query = zone ? { zone } : {};
  const allRules = await RuleText.find(query);
  if (!allRules.length) return res.status(404).json({ error: "No rules found" });

  // Filter by failed rule keywords if provided
  let filteredRules = allRules;
  if (failedRules?.length) {
    filteredRules = allRules.filter(rule => {
      const text = `${rule.section} ${rule.text}`.toLowerCase();
      return failedRules.some(fr =>
        text.includes(fr.toLowerCase())
      );
    });
  }

  if (!filteredRules.length) filteredRules = allRules; // fallback

  // Create fake embedding for similarity
  const qVec = fakeQuestionEmbedding(question);
  const scored = filteredRules.map(rule => ({
    ...rule.toObject(),
    score: cosineSim(qVec, rule.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
const top = scored.slice(0, 3).map(r => {
  let explanation = "";

  if (r.section.toLowerCase().includes("height"))
    explanation = `Your building height exceeds the permitted maximum. ${r.text}`;
  else if (r.section.toLowerCase().includes("setback"))
    explanation = `Your building is too close to the boundary. ${r.text}`;
  else if (r.section.toLowerCase().includes("coverage"))
    explanation = `Your site coverage is higher than allowed. ${r.text}`;
  else
    explanation = r.text;

  return {
    section: r.section,
    text: explanation,
    source: r.source,
    score: r.score.toFixed(3),
  };
});

  res.json({ answers: top });
});

export default r;