import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDb = async () => {
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
};
