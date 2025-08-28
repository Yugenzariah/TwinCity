import { Router } from "express";
import Parcel from "../models/Parcel.js";
import Rule from "../models/Rule.js";
import Scenario from "../models/Scenario.js";

const r = Router();

r.post("/", async (req, res) => {
  const { heightM, footprintSqm, minSetbackM } = req.body;

  const parcel = await Parcel.findOne({});
  const rule = await Rule.findOne({ zone: parcel.zone });

  const heightOK = heightM <= rule.maxHeightM;
  const coveragePct = (footprintSqm / parcel.areaSqm) * 100;
  const coverageOK = coveragePct <= rule.maxSiteCoveragePct;
  const setbackOK = minSetbackM >= rule.minSetbackM;

  const allOK = heightOK && coverageOK && setbackOK;
  const notes = [];
  if (!heightOK) notes.push(`Height ${heightM}m > ${rule.maxHeightM}m`);
  if (!coverageOK) notes.push(`Coverage ${coveragePct.toFixed(1)}% > ${rule.maxSiteCoveragePct}%`);
  if (!setbackOK) notes.push(`Setback ${minSetbackM}m < ${rule.minSetbackM}m`);

  const doc = await Scenario.create({
    parcelId: String(parcel._id),
    heightM, footprintSqm, minSetbackM,
    results: { heightOK, coverageOK, setbackOK, allOK, notes }
  });

  res.json(doc);
});

export default r;
