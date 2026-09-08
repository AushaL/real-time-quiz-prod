import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    require: false,
  },
});

export const Admin = mongoose.model("Admin", adminSchema);
