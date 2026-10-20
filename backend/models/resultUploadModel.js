// models/resultUploadModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const parsedRowSchema = new Schema(
  {
    matricNumber: { type: String, default: null },
    student: { type: Schema.Types.ObjectId, ref: "User", default: null },
    courseCode: { type: String, default: null },
    courseTitle: { type: String, default: null },
    units: { type: Number, default: null },
    score: { type: Number, default: null },
    grade: { type: String, default: null },
    session: { type: String, default: null }, // session NAME (for self-uploads)
    semester: {
      type: String,
      enum: ["first", "second", null],
      default: null,
    },
    matched: { type: Boolean, default: false },
    warnings: { type: [String], default: [] },
  },
  { _id: false }
);

const resultUploadSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["lecturer", "self"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["document", "manual"],
      required: true,
    },
    uploadedBy: {
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
      default: null,
    },
    semester: {
      type: String,
      enum: ["first", "second", null],
      default: null,
    },

    fileUrl: { type: String, default: null },
    filePublicId: { type: String, default: null, select: false },
    originalName: { type: String, default: null },
    mimeType: { type: String, default: null },

    parsingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "not_applicable"],
      default: "pending",
      index: true,
    },
    parsingError: { type: String, default: null },
    parsedRows: { type: [parsedRowSchema], default: [] },

    publishStatus: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

resultUploadSchema.index({ uploadedBy: 1, publishStatus: 1 });
resultUploadSchema.index({ offering: 1, publishStatus: 1 });

export default model("ResultUpload", resultUploadSchema);