// models/courseOfferingModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const courseOfferingSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
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
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    level: { type: Number, required: true, enum: [100, 200, 300, 400, 500], index: true },
    lecturer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One offering per (course, session, semester)
courseOfferingSchema.index(
  { course: 1, session: 1, semester: 1 },
  { unique: true }
);

export default model("CourseOffering", courseOfferingSchema);