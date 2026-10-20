// routes/aiRoutes.js
import express from "express";
import {
  parseCalendar,
  parseResult,
  parseCourseDocument, // 👈 ADDED IMPORT
  summarizeMaterial,
  chatWithMaterial,
  generateQuiz,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

import multer from "multer";

const router = express.Router();

// Multer memory storage for course allocation PDFs
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Everything below requires login
router.use(protect);

/* ---------- AI endpoints ---------- */
router.post("/parse/calendar", parseCalendar);
router.post("/parse/result", parseResult);

// 👇 ADDED ROUTE FOR COURSE ALLOCATION PDFs
router.post(
  "/parse/courses",
  upload.fields([{ name: "document", maxCount: 1 }]),
  parseCourseDocument
);

router.post("/summarize", summarizeMaterial);
router.post("/chat", chatWithMaterial);
router.post("/generate-quiz", generateQuiz);

export default router;