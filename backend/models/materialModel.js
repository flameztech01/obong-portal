// models/materialModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const materialSchema = new Schema(
  {
    offering: {
      type: Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    level: { type: Number, required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["lecture_note", "slide", "past_question", "textbook", "other"],
      default: "lecture_note",
    },

    fileUrl: { type: String, required: true },
    filePublicId: { type: String, required: true, select: false },
    mimeType: { type: String, default: null },
    sizeBytes: { type: Number, default: null },
    originalName: { type: String, default: null },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

materialSchema.index({ offering: 1, createdAt: -1 });
materialSchema.index({ department: 1, level: 1 });

export default model("Material", materialSchema);