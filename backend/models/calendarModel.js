// models/calendarModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const calendarSchema = new Schema(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
      index: true,
    },

    fileUrl: { type: String, required: true },
    filePublicId: { type: String, required: true, select: false },
    originalName: { type: String, default: null },
    mimeType: { type: String, default: null },

    parsingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    parsingError: { type: String, default: null },

    parsedData: {
      closingDate: { type: Date, default: null },
      resumptionDate: { type: Date, default: null },
      examStartDate: { type: Date, default: null },
      examEndDate: { type: Date, default: null },
      semesterBreakStart: { type: Date, default: null },
      semesterBreakEnd: { type: Date, default: null },
      notes: { type: String, default: null },
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

calendarSchema.index({ session: 1, createdAt: -1 });

export default model("Calendar", calendarSchema);