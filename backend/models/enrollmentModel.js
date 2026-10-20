// models/enrollmentModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const enrollmentSchema = new Schema(
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
      required: true,
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "dropped", "completed"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// One enrollment per (student, offering)
enrollmentSchema.index({ student: 1, offering: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, session: 1, status: 1 });

export default model("Enrollment", enrollmentSchema);