// models/academicSessionModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const academicSessionSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Session name is required"],
      unique: true,
      trim: true, // e.g. "2025/2026"
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default model("AcademicSession", academicSessionSchema);