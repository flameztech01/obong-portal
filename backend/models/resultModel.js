// models/resultModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const resultSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    offering: {
      type: Schema.Types.ObjectId,
      ref: "CourseOffering",
      default: null,
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
      index: true,
    },
    semester: {
      type: String,
      enum: ["first", "second"],
      required: true,
    },

    // Snapshots — survive even if Course/Offering is deleted
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    courseTitle: { type: String, default: null },
    units: { type: Number, required: true, min: 1 },

    score: { type: Number, default: null, min: 0, max: 100 },
    grade: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D", "E", "F"],
    },

    isCarryover: { type: Boolean, default: false, index: true },

    source: {
      type: String,
      enum: ["lecturer_upload", "self_upload", "admin"],
      required: true,
    },
    uploadId: {
      type: Schema.Types.ObjectId,
      ref: "ResultUpload",
      default: null,
    },

    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// One result per (student, session, semester, courseCode)
resultSchema.index(
  { student: 1, session: 1, semester: 1, courseCode: 1 },
  { unique: true }
);
resultSchema.index({ student: 1, isPublished: 1 });
resultSchema.index({ session: 1, semester: 1, courseCode: 1 });

resultSchema.pre("save", function () {
  if (this.isModified("courseCode") && this.courseCode) {
    this.courseCode = this.courseCode.toUpperCase().trim();
  }
});

export default model("Result", resultSchema);