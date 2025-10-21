import mongoose from "mongoose";

const RuleTextSchema = new mongoose.Schema({
  zone: String,
  section: String,
  text: String,
  source: String,
  embedding: { type: [Number], index: "vector" }
});

export default mongoose.model("RuleText", RuleTextSchema);