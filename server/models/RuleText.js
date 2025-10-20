import mongoose from "mongoose";

const RuleTextSchema = new mongoose.Schema({
  zone: String,
  section: String,
  text: String,
  source: String,
  embedding: { type: [Number], index: "vector" } // vector index for MongoDB Atlas
});

export default mongoose.model("RuleText", RuleTextSchema);