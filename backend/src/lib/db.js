import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conntection = await mongoose.connect(process.env.DATABASE_LOCAL);
    console.log(`Conntected to MongoDB ${conn.connection.host}`);
  } catch (error) {
    console.log("Failed to connect to MongoDB", error);
    process.exit(1);
  }
};
