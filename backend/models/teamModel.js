// models/teamModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    description: { type: String, default: "" },
    permissions: {
      type: [String], // e.g. ["add_courses", "edit_courses"]
      default: [],
    },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

teamSchema.index({ members: 1 });

export default model("Team", teamSchema);