// models/settingsModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Singleton — the app should always keep exactly one document.
const settingsSchema = new Schema(
  {
    allowStudentResultUpload: { type: Boolean, default: false },
    onlyHodOrLecturerUploads: { type: Boolean, default: true },
    allowCourseRepMaterialUpload: { type: Boolean, default: true },
    allowStudentQuizGeneration: { type: Boolean, default: false },
    currentSession: {
      type: Schema.Types.ObjectId,
      ref: "AcademicSession",
      default: null,
    },
    currentSemester: {
      type: String,
      enum: ["first", "second", null],
      default: null,
    },
  },
  { timestamps: true }
);

export default model("Settings", settingsSchema);