// models/courseModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const courseSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Course code is required"],
      uppercase: true,
      trim: true,
      index: true,
      maxlength: 15,
    },
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxlength: 200,
    },
    units: {
      type: Number,
      required: [true, "Units are required"],
      min: [1, "Units must be >= 1"],
      max: [12, "Units must be <= 12"],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      enum: [100, 200, 300, 400, 500],
      index: true,
    },
    semester: {
      type: String,
      enum: ["first", "second", null],
      default: null, // null means it applies to both or is unspecified
    },
    // Tracks the academic session (e.g., "2024/2025")
    session: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Who added this course (used so student admins can delete their own)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// A course code must be unique within a department AND session
// (each set of students can have its own copy of the same course code)
courseSchema.index({ department: 1, code: 1, session: 1 }, { unique: true });

// Helps with querying courses by level and department
courseSchema.index({ department: 1, level: 1 });

// Helps with session-scoped listing
courseSchema.index({ department: 1, level: 1, session: 1 });

// Ensure the code is always uppercase before saving
courseSchema.pre("save", function () {
  if (this.isModified("code") && this.code) {
    this.code = this.code.toUpperCase().trim();
  }
});

export default model("Course", courseSchema);