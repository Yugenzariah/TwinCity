import mongoose from "mongoose";
const ParcelSchema = new mongoose.Schema({
  name: String,
  zone: String,
  geojson: Object,
  areaSqm: Number
});
export default mongoose.model("Parcel", ParcelSchema);