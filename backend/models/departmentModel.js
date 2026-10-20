// models/departmentModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 10,
    },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.pre("save", function () {
  if (this.isModified("code") && this.code) {
    this.code = this.code.toUpperCase().trim();
  }
});

export default model("Department", departmentSchema);