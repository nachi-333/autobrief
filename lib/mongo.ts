
// lib/mongo.ts
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoConn: Promise<typeof mongoose> | undefined;
}

export async function connectMongo() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  if (!global._mongoConn) {
    global._mongoConn = mongoose.connect(process.env.MONGODB_URI, {
      dbName: "meeting-ai",
    });
  }
  return global._mongoConn;
}
