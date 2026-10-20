// models/quizAttemptModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const attemptAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    answer: { type: String, default: null },
    isCorrect: { type: Boolean, default: null },
    awardedMarks: { type: Number, default: null },
    feedback: { type: String, default: null },
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    offering: {
      type: Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["in_progress", "submitted", "graded"],
      default: "in_progress",
      index: true,
    },

    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lateSubmission: { type: Boolean, default: false },

    score: { type: Number, default: null },
    totalMarks: { type: Number, required: true },

    answers: { type: [attemptAnswerSchema], default: [] },
  },
  { timestamps: true }
);

// One attempt per (quiz, student) — enforced at DB level
quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

// Common queries: student's attempt history, pending grading
quizAttemptSchema.index({ student: 1, status: 1 });
quizAttemptSchema.index({ quiz: 1, status: 1 });

export default model("QuizAttempt", quizAttemptSchema);