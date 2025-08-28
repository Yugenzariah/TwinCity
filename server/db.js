import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI || "mongodb+srv://Keith:KWZdeLGqLbpkGujb@nmit.nzmvq.mongodb.net/";
mongoose.connect(uri)
  .then(()=>console.log("Mongo connected"))
  .catch((e)=>console.error("Mongo error:", e));