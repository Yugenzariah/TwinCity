import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(()=>console.log("Mongo connected"))
  .catch((e)=>console.error("Mongo error:", e));