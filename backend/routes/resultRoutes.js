// routes/resultRoutes.js
import express from "express";
import {
  getHistoricalCourses,
  createLecturerUpload,
  createSelfUpload,
  listUploads,
  getUpload,
  editUploadRows,
  publishUpload,
  deleteUpload,
  getMyResults,
  getMyGpa,
  getStudentResults,
  getOfferingResults,
} from "../controllers/resultController.js";
import { protect } from "../Middleware/authMiddleware.js";

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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit per file
});

// Everything below requires login
router.use(protect);

/* ============================================================
   SPECIAL ROUTES
   ============================================================ */

// Must be above /uploads/:id to avoid route conflicts
router.get("/historical-courses", getHistoricalCourses);

/* ============================================================
   UPLOADS
   ============================================================ */

// Lecturer uploads a single document for a specific offering
router.post(
  "/uploads/lecturer",
  upload.fields([{ name: "document", maxCount: 1 }]),
  createLecturerUpload
);

// Student uploads one or multiple documents (max 5)
router.post(
  "/uploads/self",
  upload.array("documents", 5), // 👈 Changed to array for multiple files
  createSelfUpload
);

router.get   ("/uploads",              listUploads);
router.get   ("/uploads/:id",          getUpload);
router.patch ("/uploads/:id/rows",     editUploadRows);
router.post  ("/uploads/:id/publish",  publishUpload);
router.delete("/uploads/:id",          deleteUpload);

/* ============================================================
   RESULTS READS
   ============================================================ */

router.get("/me",                   getMyResults);
router.get("/me/gpa",               getMyGpa);
router.get("/student/:studentId",   getStudentResults);
router.get("/offering/:offeringId", getOfferingResults);

export default router;