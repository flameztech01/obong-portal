// routes/academicRoutes.js
import express from "express";
import {
  listCourses,
  getCourse,
  createCourse,
  bulkCreateCourses, // 👈 ADDED IMPORT
  updateCourse,
  deleteCourse,
  listOfferings,
  createOffering,
  updateOffering,
  deleteOffering,
  enrollSelf,
  unenrollSelf,
  listMyEnrollments,
  getOfferingRoster,
  createExamWindow,
  listExamWindows,
  updateExamWindow,
  deleteExamWindow,
  uploadCalendar,
  listCalendars,
  getCurrentCalendar,
  deleteCalendar,
} from "../controllers/academicController.js";
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for calendar docs
});

// Everything below requires login
router.use(protect);

/* ---------- courses (catalog) ---------- */
router.get   ("/courses",        listCourses);
router.get   ("/courses/:id",    getCourse);
router.post  ("/courses",        createCourse);
router.post  ("/courses/bulk",   bulkCreateCourses); // 👈 ADDED ROUTE
router.patch ("/courses/:id",    updateCourse);
router.delete("/courses/:id",    deleteCourse);

/* ---------- offerings ---------- */
router.get   ("/offerings",                     listOfferings);
router.post  ("/offerings",                     createOffering);
router.patch ("/offerings/:id",                 updateOffering);
router.delete("/offerings/:id",                 deleteOffering);
router.get   ("/offerings/:id/roster",          getOfferingRoster);

/* ---------- enrollments ---------- */
router.get   ("/enrollments/me",  listMyEnrollments);
router.post  ("/enrollments",     enrollSelf);
router.delete("/enrollments/:id", unenrollSelf);

/* ---------- exam windows ---------- */
router.get   ("/exam-windows",      listExamWindows);
router.post  ("/exam-windows",      createExamWindow);
router.patch ("/exam-windows/:id",  updateExamWindow);
router.delete("/exam-windows/:id",  deleteExamWindow);

/* ---------- calendars ---------- */
router.get   ("/calendars/current", getCurrentCalendar);
router.get   ("/calendars",         listCalendars);
router.post(
  "/calendars",
  upload.fields([{ name: "document", maxCount: 1 }]),
  uploadCalendar
);
router.delete("/calendars/:id",     deleteCalendar);

export default router;