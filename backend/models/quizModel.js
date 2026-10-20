// models/quizModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const questionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "theory", "subjective"],
      required: true,
    },
    question: { type: String, required: true, trim: true },
    options: { type: [String], default: [] }, // MCQ only
    correctAnswer: { type: String, default: null }, // MCQ only
    modelAnswer: { type: String, default: null }, // theory/subjective
    marks: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    offering: {
      type: Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: true,
      index: true,
    },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    level: { type: Number, required: true },
    session: { type: Schema.Types.ObjectId, ref: "AcademicSession", required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["mcq", "theory", "subjective", "mixed"],
      default: "mcq",
    },

    durationMinutes: { type: Number, default: null },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },
    aiGenerated: { type: Boolean, default: false },

    totalMarks: { type: Number, required: true, default: 0 },
    questions: { type: [questionSchema], default: [] },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

quizSchema.index({ offering: 1, status: 1 });

export default model("Quiz", quizSchema);