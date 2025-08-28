import mongoose from "mongoose";
const RuleSchema = new mongoose.Schema({
  zone: { type: String, required: true },
  maxHeightM: Number,
  minSetbackM: Number,
  maxSiteCoveragePct: Number,
  citations: [{ title: String, section: String, url: String }]
});
export default mongoose.model("Rule", RuleSchema);
