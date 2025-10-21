import mongoose from "mongoose";
const ScenarioSchema = new mongoose.Schema({
  parcelId: String,
  heightM: Number,
  footprintSqm: Number,
  minSetbackM: Number,
  buildingGeojson: Object,
  results: {
    heightOK: Boolean,
    coverageOK: Boolean,
    setbackOK: Boolean,
    allOK: Boolean,
    notes: [String]
  },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model("Scenario", ScenarioSchema);
