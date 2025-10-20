import { Router } from "express";
import Parcel from "../models/Parcel.js";
import Rule from "../models/Rule.js";
import Scenario from "../models/Scenario.js";
import * as turf from "@turf/turf";

const r = Router();

r.post("/", async (req, res) => {
  const { heightM, footprintSqm, minSetbackM } = req.body;

  // --- Load parcel + rules ---
  const parcel = await Parcel.findOne({});
  const rule = await Rule.findOne({ zone: parcel.zone });
  if (!parcel || !rule) return res.status(404).json({ error: "Parcel or rule missing" });

  const parcelGeo = parcel.geojson;

  // --- 1. Geometry prep ---
  const areaParcel = turf.area(parcelGeo); // m²

  // shrink parcel inward by setback
  const inner = turf.buffer(parcelGeo, -minSetbackM, { units: "meters" });
  const innerGeom = inner.type === "FeatureCollection" ? inner.features[0] : inner;

  // centroid of inner area
  const centroid = turf.centroid(innerGeom);

  // create a simple square footprint in meters
  const side = Math.sqrt(footprintSqm);
  const half = side / 2;

  const topLeft = turf.destination(centroid, Math.sqrt(2) * half / 2, 315, { units: "meters" });
  const topRight = turf.destination(centroid, Math.sqrt(2) * half / 2, 45, { units: "meters" });
  const bottomRight = turf.destination(centroid, Math.sqrt(2) * half / 2, 135, { units: "meters" });
  const bottomLeft = turf.destination(centroid, Math.sqrt(2) * half / 2, 225, { units: "meters" });

  const building = turf.polygon([[
    topLeft.geometry.coordinates,
    topRight.geometry.coordinates,
    bottomRight.geometry.coordinates,
    bottomLeft.geometry.coordinates,
    topLeft.geometry.coordinates
  ]]);

  // --- 2. Geometry-based checks ---

  // Check if building is fully within the parcel (setback)
  const setbackOK = turf.booleanWithin(building, innerGeom);

  // Compute site coverage %
  const buildingArea = turf.area(building);
  const coveragePct = (buildingArea / areaParcel) * 100;
  const coverageOK = coveragePct <= rule.maxSiteCoveragePct;

  // Check height
  const heightOK = heightM <= rule.maxHeightM;

  const allOK = heightOK && coverageOK && setbackOK;
  const notes = [];
  if (!heightOK) notes.push(`Height ${heightM}m > ${rule.maxHeightM}m`);
  if (!coverageOK) notes.push(`Coverage ${coveragePct.toFixed(1)}% > ${rule.maxSiteCoveragePct}%`);
  if (!setbackOK) notes.push(`Building not fully within parcel setback zone`);

  // --- 3. Save scenario ---
  const doc = await Scenario.create({
    parcelId: String(parcel._id),
    heightM,
    footprintSqm,
    minSetbackM,
    buildingGeojson: building,
    results: { heightOK, coverageOK, setbackOK, allOK, notes }
  });

  res.json(doc);
});

export default r;
