// models/courseRepModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const courseRepSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    offering: {
      type: Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// A user can only hold one active rep slot per offering
courseRepSchema.index({ user: 1, offering: 1 }, { unique: true });

export default model("CourseRep", courseRepSchema);