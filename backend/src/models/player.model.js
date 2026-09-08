import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: false,
      default: "",
    },
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

export const Player = mongoose.model("Player", playerSchema);
