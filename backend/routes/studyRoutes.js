// routes/studyRoutes.js
import express from "express";
import {
  uploadMaterial,
  listMaterials,
  getMaterial,
  deleteMaterial,
  createQuiz,
  listQuizzes,
  getQuiz,
  updateQuiz,
  publishQuiz,
  closeQuiz,
  deleteQuiz,
  startAttempt,
  submitAttempt,
  listQuizAttempts,
  listMyAttempts,
  getAttempt,
  gradeAttempt,
} from "../controllers/studyController.js";
import { protect } from "../middleware/authMiddleware.js";

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
});

// Everything below requires login
router.use(protect);

/* ---------- materials ---------- */
router.post(
  "/materials",
  upload.fields([{ name: "document", maxCount: 10 }]),
  uploadMaterial
);
router.get   ("/materials",      listMaterials);
router.get   ("/materials/:id",  getMaterial);
router.delete("/materials/:id",  deleteMaterial);

/* ---------- quizzes ---------- */
router.post  ("/quizzes",                createQuiz);
router.get   ("/quizzes",                listQuizzes);
router.get   ("/quizzes/:id",            getQuiz);
router.patch ("/quizzes/:id",            updateQuiz);
router.post  ("/quizzes/:id/publish",    publishQuiz);
router.post  ("/quizzes/:id/close",      closeQuiz);
router.delete("/quizzes/:id",            deleteQuiz);

/* ---------- attempts ---------- */
router.get   ("/attempts/me",            listMyAttempts);
router.get   ("/attempts/:id",           getAttempt);
router.patch ("/attempts/:id/grade",     gradeAttempt);
router.get   ("/quizzes/:id/attempts",   listQuizAttempts);
router.post  ("/quizzes/:id/start",      startAttempt);
router.post  ("/quizzes/:id/submit",     submitAttempt);

export default router;