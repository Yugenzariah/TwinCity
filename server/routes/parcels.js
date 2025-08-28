import { Router } from "express";
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";
import Parcel from "../models/Parcel.js";

const r = Router();
const dataPath = path.resolve("data/parcel.geojson");

// lazy seed on first request
async function ensureSeed() {
  const count = await Parcel.countDocuments();
  if (count === 0) {
    const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const feature = raw.features ? raw.features[0] : raw;
    const areaSqm = turf.area(feature);
    await Parcel.create({
      name: "Capstone Parcel",
      zone: "Residential Zone",
      geojson: feature,
      areaSqm
    });
  }
}

r.get("/", async (req, res) => {
  await ensureSeed();
  const parcel = await Parcel.findOne({});
  res.json(parcel);
});

export default r;
