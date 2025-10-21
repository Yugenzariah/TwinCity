import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import "./db.js";
import parcels from "./routes/parcels.js";
import rules from "./routes/rules.js";
import scenarios from "./routes/scenarios.js";
import path from "path";
import { fileURLToPath } from "url";
import ask from "./routes/ask.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/ask", ask);

app.get("/health", (_,res)=>res.json({ok:true}));

// Serve client for convenience
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "../client")));

app.use("/api/parcels", parcels);
app.use("/api/rules", rules);
app.use("/api/scenarios", scenarios);

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>console.log(`API on :${PORT}`));