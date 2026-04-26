import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mitti_ki_baat";

export async function connectDatabase() {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
}
