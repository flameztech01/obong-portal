// routes/adminRoutes.js
import express from "express";
import {
  listUsers,
  getUser,
  createLecturer,
  updateUser,
  setUserStatus,
  deleteUser,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  appointCourseRep,
  revokeCourseRep,
  appointStudentAdmin,
  revokeStudentAdmin,
  appointHod,
  revokeHod,
  createTeam,
  listTeams,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
  getSettings,
  updateSettings,
  createSession,
  listSessions,
  setCurrentSession,
  promoteStudents,
  listAuditLogs,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Every route here requires a valid login
router.use(protect);

/* ============================================================
   PUBLIC TO ADMINS & STUDENT ADMINS
   ============================================================ */

// Student Admins need to read the departments list for their course dropdowns
router.get("/departments", listDepartments);

/* ============================================================
   FULL ADMIN ONLY ROUTES (requireAdmin)
   ============================================================ */

// --- Users ---
router.get("/users", requireAdmin, listUsers);
router.post("/users/lecturer", requireAdmin, createLecturer);
router.get("/users/:id", requireAdmin, getUser);
router.patch("/users/:id", requireAdmin, updateUser);
router.patch("/users/:id/status", requireAdmin, setUserStatus);
router.delete("/users/:id", requireAdmin, deleteUser);

// --- Departments (Write) ---
router.post("/departments", requireAdmin, createDepartment);
router.patch("/departments/:id", requireAdmin, updateDepartment);
router.delete("/departments/:id", requireAdmin, deleteDepartment);

// --- Appointments ---
router.post("/appointments/course-rep", requireAdmin, appointCourseRep);
router.delete("/appointments/course-rep/:id", requireAdmin, revokeCourseRep);
router.post("/appointments/student-admin", requireAdmin, appointStudentAdmin);
router.delete("/appointments/student-admin/:userId", requireAdmin, revokeStudentAdmin);
router.post("/appointments/hod", requireAdmin, appointHod);
router.delete("/appointments/hod/:userId", requireAdmin, revokeHod);

// --- Teams ---
router.get("/teams", requireAdmin, listTeams);
router.post("/teams", requireAdmin, createTeam);
router.post("/teams/:id/members", requireAdmin, addTeamMember);
router.delete("/teams/:id/members/:userId", requireAdmin, removeTeamMember);
router.delete("/teams/:id", requireAdmin, deleteTeam);

// --- Settings ---
router.get("/settings", requireAdmin, getSettings);
router.patch("/settings", requireAdmin, updateSettings);

// --- Sessions & Promotions ---
router.get("/sessions", requireAdmin, listSessions);
router.post("/sessions", requireAdmin, createSession);
router.patch("/sessions/:id/current", requireAdmin, setCurrentSession);
router.post("/promotions", requireAdmin, promoteStudents);

// --- Audit ---
router.get("/audit-logs", requireAdmin, listAuditLogs);

export default router;