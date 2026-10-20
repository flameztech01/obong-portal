// models/examWindowModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const examWindowSchema = new Schema(
  {
    offering: {
      type: Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: true,
      index: true,
    },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    level: { type: Number, required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: "AcademicSession", required: true },

    type: {
      type: String,
      enum: ["exam", "test", "quiz"],
      default: "exam",
    },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    location: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

examWindowSchema.index({ offering: 1, startTime: 1 });
examWindowSchema.index({ department: 1, level: 1, startTime: 1 });

export default model("ExamWindow", examWindowSchema);