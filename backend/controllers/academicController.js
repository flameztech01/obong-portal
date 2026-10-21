// controllers/academicController.js
import { v2 as cloudinary } from "cloudinary";
import Course from "../models/courseModel.js";
import CourseOffering from "../models/courseOfferingModel.js";
import Enrollment from "../models/enrollmentModel.js";
import ExamWindow from "../models/examWindowModel.js";
import Calendar from "../models/calendarModel.js";
import AcademicSession from "../models/academicSessionModel.js";
import Department from "../models/departmentModel.js";
import CourseRep from "../models/courseRepModel.js";
import Result from "../models/resultModel.js";
import User from "../models/userModel.js";
import AuditLog from "../models/auditLogModel.js";

/* ============================================================
   HELPERS
   ============================================================ */

const uploadFileToCloudinary = (file, folder, options = {}) => {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "auto",
      ...options,
    };
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(file.buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
    return null;
  }
};

const paginate = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const logAudit = async (req, action, resource, resourceId, meta = {}) => {
  try {
    await AuditLog.create({
      actor: req.user.id,
      actorRole: req.user.role,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      meta,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  } catch (err) {
    console.error("audit log failed:", err.message);
  }
};

const getCurrentSession = () => AcademicSession.findOne({ isCurrent: true });

/* ---------- session-per-level helpers ---------- */

const SESSION_NAME_RE = /^(\d{4})\/(\d{4})$/;

const getCurrentSessionName = async () => {
  const current = await getCurrentSession();
  const name = current?.name ? String(current.name).trim() : "";
  return SESSION_NAME_RE.test(name) ? name : null;
};

// e.g. current "2026/2027", currentLevel 300, targetLevel 200 -> "2025/2026"
const sessionNameForLevel = (currentSessionName, currentLevel, targetLevel) => {
  const m = String(currentSessionName || "").match(SESSION_NAME_RE);
  if (!m) return null;
  const levelsBack = (Number(currentLevel) - Number(targetLevel)) / 100;
  if (!Number.isInteger(levelsBack) || levelsBack < 0) return null;
  const startYear = Number(m[1]) - levelsBack;
  return `${startYear}/${startYear + 1}`;
};

/* ---------- permission helpers ---------- */

const userCanManageCatalog = (user, departmentId, level) => {
  if (user.role === "admin") return true;
  if (!user.extraRoles?.some((r) => ["student_admin", "team_member"].includes(r))) {
    return false;
  }
  const levels = (user.scope?.levels || []).map(Number);
  const depts = (user.scope?.departments || []).map(String);
  return levels.includes(Number(level)) && depts.includes(String(departmentId));
};

const userCanManageOffering = async (user, offering) => {
  if (user.role === "admin") return true;

  if (
    user.role === "lecturer" &&
    String(offering.lecturer) === String(user.id)
  ) {
    return true;
  }

  if (
    user.extraRoles?.includes("hod") &&
    (user.scope?.departments || []).map(String).includes(String(offering.department))
  ) {
    return true;
  }

  if (user.extraRoles?.includes("course_rep")) {
    const rep = await CourseRep.findOne({
      user: user.id,
      offering: offering._id,
      isActive: true,
    });
    if (rep) return true;
  }

  return false;
};

/* ---------- sanitizers ---------- */

const sanitizeCourse = (c) => ({
  id: c._id,
  code: c.code,
  title: c.title,
  units: c.units,
  department: c.department,
  level: c.level,
  semester: c.semester || null,
  session: c.session || null,
  description: c.description || "",
  createdAt: c.createdAt,
});

const sanitizeOffering = (o) => ({
  id: o._id,
  course: o.course,
  session: o.session,
  semester: o.semester,
  department: o.department,
  level: o.level,
  lecturer: o.lecturer || null,
  createdAt: o.createdAt,
});

const sanitizeEnrollment = (e) => ({
  id: e._id,
  student: e.student,
  offering: e.offering,
  session: e.session,
  status: e.status,
  createdAt: e.createdAt,
});

const sanitizeExamWindow = (w) => ({
  id: w._id,
  offering: w.offering,
  course: w.course,
  department: w.department,
  level: w.level,
  session: w.session,
  type: w.type,
  startTime: w.startTime,
  endTime: w.endTime,
  location: w.location || null,
  isActive: w.isActive,
  createdBy: w.createdBy,
  createdAt: w.createdAt,
});

const sanitizeCalendar = (c) => ({
  id: c._id,
  session: c.session,
  fileUrl: c.fileUrl,
  originalName: c.originalName,
  mimeType: c.mimeType,
  parsingStatus: c.parsingStatus,
  parsedData: c.parsedData || null,
  uploadedBy: c.uploadedBy,
  createdAt: c.createdAt,
});

/* ============================================================
   COURSES (catalog)
   ============================================================ */

// @desc    List courses (filter by dept, level, search)
//          Non-admins only see courses from their own set's session per level
//          (courses with no session are always shown)
// @route   GET /api/academic/courses
// @access  Auth
export const listCourses = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { department, level, session, semester, search } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (level) filter.level = Number(level);
    if (session) filter.session = session;
    if (semester) filter.semester = semester;

    const and = [];

    if (search) {
      and.push({
        $or: [
          { code: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
        ],
      });
    }

    const currentSessionName = await getCurrentSessionName();
    const userLevel = Number(req.user?.level);

    // Session scoping for non-admins (students / student admins)
    if (
      req.user.role !== "admin" &&
      currentSessionName &&
      [100, 200, 300, 400, 500].includes(userLevel)
    ) {
      const levelClauses = [];
      for (const lvl of [100, 200, 300, 400, 500]) {
        if (lvl <= userLevel) {
          const expected = sessionNameForLevel(currentSessionName, userLevel, lvl);
          levelClauses.push({
            level: lvl,
            session: { $in: [expected, null, ""] },
          });
        } else {
          levelClauses.push({ level: lvl });
        }
      }
      and.push({ $or: levelClauses });
    }

    if (and.length) filter.$and = and;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("department", "name code")
        .sort({ session: -1, code: 1 })
        .skip(skip)
        .limit(limit),
      Course.countDocuments(filter),
    ]);

    return res.json({
      courses: courses.map(sanitizeCourse),
      currentSession: currentSessionName,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("listCourses error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a course
// @route   GET /api/academic/courses/:id
// @access  Auth
export const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "department",
      "name code"
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    return res.json({ course: sanitizeCourse(course) });
  } catch (err) {
    console.error("getCourse error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a course (admin OR scoped student_admin/team_member)
// @route   POST /api/academic/courses
// @access  Auth (scope-checked)
export const createCourse = async (req, res) => {
  try {
    const { code, title, units, department, level, semester, session, description } = req.body;

    if (!code || !title || !units || !department || !level) {
      return res.status(400).json({
        message: "code, title, units, department and level are required",
      });
    }
    if (![100, 200, 300, 400, 500].includes(Number(level))) {
      return res.status(400).json({ message: "Invalid level" });
    }
    if (!userCanManageCatalog(req.user, department, level)) {
      return res.status(403).json({
        message: "You don't have scope to add courses for this department/level",
      });
    }

    const dept = await Department.findById(department);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const codeUpper = code.toUpperCase().trim();
    const existing = await Course.findOne({ code: codeUpper, department });
    if (existing) {
      return res.status(409).json({
        message: `Course ${codeUpper} already exists for this department`,
      });
    }

    const course = await Course.create({
      code: codeUpper,
      title: title.trim(),
      units: Number(units),
      department,
      level: Number(level),
      semester: semester || null,
      session: session || null,
      description: description?.trim() || "",
    });

    await logAudit(req, "create", "course", course._id, { code: course.code });

    return res.status(201).json({ message: "Course created", course: sanitizeCourse(course) });
  } catch (err) {
    console.error("createCourse error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Bulk create courses from AI parse
// @route   POST /api/academic/courses/bulk
// @access  Auth (scope-checked)
export const bulkCreateCourses = async (req, res) => {
  try {
    const { courses, departmentId } = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ message: "No courses provided" });
    }

    const targetDept = departmentId || req.user.department;
    if (!targetDept) {
      return res.status(400).json({ message: "Department ID is required" });
    }

    const added = [];
    const skipped = [];

    for (const c of courses) {
      if (!userCanManageCatalog(req.user, targetDept, c.level)) {
        skipped.push(`${c.code} (${c.level}L): No permission`);
        continue;
      }

      const codeUpper = c.code.toUpperCase().trim();
      const exists = await Course.findOne({ code: codeUpper, department: targetDept });
      if (exists) {
        skipped.push(`${c.code}: Already exists`);
        continue;
      }

      const newCourse = await Course.create({
        code: codeUpper,
        title: c.title.trim(),
        units: Number(c.units),
        level: Number(c.level),
        department: targetDept,
        semester: c.semester || null,
        session: c.session || null,
      });
      added.push(newCourse.code);
    }

    await logAudit(req, "bulk_create", "course", null, {
      department: targetDept,
      addedCount: added.length,
      skippedCount: skipped.length,
    });

    return res.json({ 
      message: "Bulk upload complete", 
      added, 
      skipped 
    });
  } catch (err) {
    console.error("bulkCreateCourses error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a course
// @route   PATCH /api/academic/courses/:id
// @access  Auth (scope-checked)
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (!userCanManageCatalog(req.user, course.department, course.level)) {
      return res.status(403).json({ message: "Not allowed to edit this course" });
    }

    const { title, units, semester, session, description } = req.body;
    if (title !== undefined) course.title = title.trim();
    if (units !== undefined) {
      if (Number(units) < 1) return res.status(400).json({ message: "units must be >= 1" });
      course.units = Number(units);
    }
    if (semester !== undefined) course.semester = semester;
    if (session !== undefined) course.session = session;
    if (description !== undefined) course.description = description?.trim() || "";

    await course.save();
    await logAudit(req, "update", "course", course._id);

    return res.json({ message: "Course updated", course: sanitizeCourse(course) });
  } catch (err) {
    console.error("updateCourse error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a course (only if no offerings exist)
// @route   DELETE /api/academic/courses/:id
// @access  Auth (admin only)
export const deleteCourse = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete courses" });
    }
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const offeringCount = await CourseOffering.countDocuments({ course: course._id });
    if (offeringCount > 0) {
      return res.status(400).json({
        message: `Course has ${offeringCount} offering(s). Delete those first.`,
      });
    }

    await Course.deleteOne({ _id: course._id });
    await logAudit(req, "delete", "course", course._id, { code: course.code });

    return res.json({ message: "Course deleted" });
  } catch (err) {
    console.error("deleteCourse error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   COURSE OFFERINGS (a course in a specific session/semester)
   ============================================================ */

// @desc    List offerings (filter by dept, level, session, lecturer)
// @route   GET /api/academic/offerings
// @access  Auth
export const listOfferings = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { department, level, session, lecturer, semester } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (level) filter.level = Number(level);
    if (session) filter.session = session;
    if (semester) filter.semester = semester;
    if (lecturer) filter.lecturer = lecturer;

    const [offerings, total] = await Promise.all([
      CourseOffering.find(filter)
        .populate("course", "code title units")
        .populate("department", "name code")
        .populate("session", "name")
        .populate("lecturer", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CourseOffering.countDocuments(filter),
    ]);

    return res.json({
      offerings: offerings.map(sanitizeOffering),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("listOfferings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create an offering
// @route   POST /api/academic/offerings
// @access  Auth (scope-checked)
export const createOffering = async (req, res) => {
  try {
    const { courseId, sessionId, semester, lecturer } = req.body;

    if (!courseId || !sessionId || !semester) {
      return res.status(400).json({
        message: "courseId, sessionId and semester are required",
      });
    }
    if (!["first", "second"].includes(semester)) {
      return res.status(400).json({ message: "semester must be 'first' or 'second'" });
    }

    const [course, session] = await Promise.all([
      Course.findById(courseId),
      AcademicSession.findById(sessionId),
    ]);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (!userCanManageCatalog(req.user, course.department, course.level)) {
      return res.status(403).json({
        message: "You don't have scope to create offerings for this course",
      });
    }

    const existing = await CourseOffering.findOne({
      course: course._id,
      session: session._id,
      semester,
    });
    if (existing) {
      return res.status(409).json({ message: "This offering already exists" });
    }

    if (lecturer) {
      const lec = await User.findById(lecturer);
      if (!lec || lec.role !== "lecturer") {
        return res.status(400).json({ message: "Invalid lecturer" });
      }
    }

    const offering = await CourseOffering.create({
      course: course._id,
      session: session._id,
      semester,
      department: course.department,
      level: course.level,
      lecturer: lecturer || null,
      createdBy: req.user.id,
    });

    await logAudit(req, "create", "offering", offering._id, {
      course: course.code,
      semester,
    });

    return res.status(201).json({
      message: "Offering created",
      offering: sanitizeOffering(offering),
    });
  } catch (err) {
    console.error("createOffering error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update an offering (assign/change lecturer, semester)
// @route   PATCH /api/academic/offerings/:id
// @access  Auth (admin or HOD of dept)
export const updateOffering = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    const isAdmin = req.user.role === "admin";
    const isHod =
      req.user.extraRoles?.includes("hod") &&
      (req.user.scope?.departments || []).map(String).includes(String(offering.department));
    if (!isAdmin && !isHod) {
      return res.status(403).json({ message: "Only admin or the department's HOD can do this" });
    }

    const { lecturer, semester } = req.body;

    if (lecturer !== undefined) {
      if (lecturer === null) {
        offering.lecturer = null;
      } else {
        const lec = await User.findById(lecturer);
        if (!lec || lec.role !== "lecturer") {
          return res.status(400).json({ message: "Invalid lecturer" });
        }
        offering.lecturer = lecturer;
      }
    }
    if (semester !== undefined) {
      if (!["first", "second"].includes(semester)) {
        return res.status(400).json({ message: "Invalid semester" });
      }
      offering.semester = semester;
    }

    await offering.save();
    await logAudit(req, "update", "offering", offering._id);

    return res.json({ message: "Offering updated", offering: sanitizeOffering(offering) });
  } catch (err) {
    console.error("updateOffering error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete an offering (only if no enrollments/results)
// @route   DELETE /api/academic/offerings/:id
// @access  Admin
export const deleteOffering = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete offerings" });
    }
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    const [enrollCount, resultCount] = await Promise.all([
      Enrollment.countDocuments({ offering: offering._id }),
      Result.countDocuments({ offering: offering._id }),
    ]);
    if (enrollCount > 0 || resultCount > 0) {
      return res.status(400).json({
        message: `Offering has ${enrollCount} enrollment(s) and ${resultCount} result(s). Cannot delete.`,
      });
    }

    await CourseOffering.deleteOne({ _id: offering._id });
    await logAudit(req, "delete", "offering", offering._id);

    return res.json({ message: "Offering deleted" });
  } catch (err) {
    console.error("deleteOffering error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ENROLLMENT
   ============================================================ */

// @desc    Enroll self in an offering
// @route   POST /api/academic/enrollments
// @access  Student
export const enrollSelf = async (req, res) => {
  try {
    const { offeringId } = req.body;
    if (!offeringId) {
      return res.status(400).json({ message: "offeringId is required" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can enroll" });
    }

    const offering = await CourseOffering.findById(offeringId);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (
      String(offering.department) !== String(req.user.department) ||
      Number(offering.level) !== Number(req.user.level)
    ) {
      return res.status(400).json({
        message: "This offering is not for your department/level",
      });
    }

    const existing = await Enrollment.findOne({
      student: req.user.id,
      offering: offering._id,
    });
    if (existing) {
      return res.status(409).json({ message: "Already enrolled" });
    }

    const enrollment = await Enrollment.create({
      student: req.user.id,
      offering: offering._id,
      session: offering.session,
      status: "active",
    });

    return res.status(201).json({
      message: "Enrolled",
      enrollment: sanitizeEnrollment(enrollment),
    });
  } catch (err) {
    console.error("enrollSelf error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Unenroll from an offering (only if no results yet)
// @route   DELETE /api/academic/enrollments/:id
// @access  Student
export const unenrollSelf = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
    if (String(enrollment.student) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your enrollment" });
    }

    const hasResult = await Result.exists({ enrollment: enrollment._id });
    if (hasResult) {
      return res.status(400).json({
        message: "Cannot unenroll — results already exist for this offering",
      });
    }

    await Enrollment.deleteOne({ _id: enrollment._id });
    return res.json({ message: "Unenrolled" });
  } catch (err) {
    console.error("unenrollSelf error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List my enrollments
// @route   GET /api/academic/enrollments/me
// @access  Student
export const listMyEnrollments = async (req, res) => {
  try {
    const session = await getCurrentSession();
    const filter = { student: req.user.id };
    if (session) filter.session = session._id;
    if (req.query.sessionId) filter.session = req.query.sessionId;

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: "offering",
        populate: [
          { path: "course", select: "code title units" },
          { path: "lecturer", select: "name email" },
        ],
      })
      .sort({ createdAt: -1 });

    return res.json({ enrollments: enrollments.map(sanitizeEnrollment) });
  } catch (err) {
    console.error("listMyEnrollments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get roster for an offering
// @route   GET /api/academic/offerings/:id/roster
// @access  Admin / lecturer / HOD / course_rep of this offering
export const getOfferingRoster = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id).populate(
      "course",
      "code title"
    );
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const enrollments = await Enrollment.find({ offering: offering._id })
      .populate("student", "name matricNumber level email profilePicture")
      .sort({ createdAt: 1 });

    return res.json({
      offering: sanitizeOffering(offering),
      roster: enrollments.map((e) => ({
        enrollmentId: e._id,
        student: e.student,
        enrolledAt: e.createdAt,
      })),
      count: enrollments.length,
    });
  } catch (err) {
    console.error("getOfferingRoster error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   EXAM WINDOWS
   ============================================================ */

// @desc    Create an exam window for an offering
// @route   POST /api/academic/exam-windows
// @access  Admin / lecturer / HOD / course_rep of this offering
export const createExamWindow = async (req, res) => {
  try {
    const { offeringId, startTime, endTime, type, location } = req.body;

    if (!offeringId || !startTime || !endTime) {
      return res.status(400).json({
        message: "offeringId, startTime and endTime are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    if (start >= end) {
      return res.status(400).json({ message: "startTime must be before endTime" });
    }
    if (start < new Date()) {
      return res.status(400).json({ message: "startTime cannot be in the past" });
    }

    const offering = await CourseOffering.findById(offeringId).populate(
      "course",
      "code title"
    );
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({
        message: "Only admin, assigned lecturer, HOD or course rep can create exam windows",
      });
    }

    const validTypes = ["exam", "test", "quiz"];
    const examType = validTypes.includes(type) ? type : "exam";

    const window = await ExamWindow.create({
      offering: offering._id,
      course: offering.course._id,
      department: offering.department,
      level: offering.level,
      session: offering.session,
      type: examType,
      startTime: start,
      endTime: end,
      location: location?.trim() || null,
      isActive: true,
      createdBy: req.user.id,
    });

    await logAudit(req, "create", "exam_window", window._id, {
      offering: offering._id,
      type: examType,
    });

    return res.status(201).json({
      message: "Exam window created",
      examWindow: sanitizeExamWindow(window),
    });
  } catch (err) {
    console.error("createExamWindow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List exam windows
//        - Students: only windows for offerings they're enrolled in
//        - Staff: filterable by offering / dept / level
// @route   GET /api/academic/exam-windows
// @access  Auth
export const listExamWindows = async (req, res) => {
  try {
    const { offering, department, level, session, activeOnly } = req.query;
    const filter = {};

    if (req.user.role === "student") {
      const myEnrollments = await Enrollment.find({ student: req.user.id }).distinct(
        "offering"
      );
      filter.offering = { $in: myEnrollments };
    } else {
      if (offering) filter.offering = offering;
      if (department) filter.department = department;
      if (level) filter.level = Number(level);
    }
    if (session) filter.session = session;
    if (activeOnly === "true") filter.isActive = true;

    const windows = await ExamWindow.find(filter)
      .populate({ path: "offering", populate: { path: "course", select: "code title" } })
      .populate("session", "name")
      .sort({ startTime: 1 });

    return res.json({ examWindows: windows.map(sanitizeExamWindow) });
  } catch (err) {
    console.error("listExamWindows error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update an exam window
// @route   PATCH /api/academic/exam-windows/:id
// @access  Auth (same rule as create)
export const updateExamWindow = async (req, res) => {
  try {
    const window = await ExamWindow.findById(req.params.id);
    if (!window) return res.status(404).json({ message: "Exam window not found" });

    const offering = await CourseOffering.findById(window.offering);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { startTime, endTime, type, location, isActive } = req.body;

    if (startTime) window.startTime = new Date(startTime);
    if (endTime) window.endTime = new Date(endTime);
    if (window.startTime >= window.endTime) {
      return res.status(400).json({ message: "startTime must be before endTime" });
    }
    if (type && ["exam", "test", "quiz"].includes(type)) window.type = type;
    if (location !== undefined) window.location = location?.trim() || null;
    if (typeof isActive === "boolean") window.isActive = isActive;

    await window.save();
    await logAudit(req, "update", "exam_window", window._id);

    return res.json({ message: "Updated", examWindow: sanitizeExamWindow(window) });
  } catch (err) {
    console.error("updateExamWindow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete an exam window
// @route   DELETE /api/academic/exam-windows/:id
// @access  Auth (same rule as create)
export const deleteExamWindow = async (req, res) => {
  try {
    const window = await ExamWindow.findById(req.params.id);
    if (!window) return res.status(404).json({ message: "Exam window not found" });

    const offering = await CourseOffering.findById(window.offering);
    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await ExamWindow.deleteOne({ _id: window._id });
    await logAudit(req, "delete", "exam_window", window._id);

    return res.json({ message: "Exam window deleted" });
  } catch (err) {
    console.error("deleteExamWindow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   SCHOOL CALENDAR (upload + store; AI parsing handled by aiController)
   ============================================================ */

// @desc    Upload a school calendar document
// @route   POST /api/academic/calendars
// @access  Admin
export const uploadCalendar = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can upload calendars" });
    }

    const file = req.files?.document?.[0];
    if (!file) {
      return res.status(400).json({ message: "No calendar document provided" });
    }

    const { sessionId } = req.body;
    const session = sessionId
      ? await AcademicSession.findById(sessionId)
      : await getCurrentSession();
    if (!session) {
      return res.status(400).json({
        message: "No current session set. Create a session or pass sessionId.",
      });
    }

    const upload = await uploadFileToCloudinary(file, "school_portal/calendars");

    const calendar = await Calendar.create({
      session: session._id,
      fileUrl: upload.secure_url,
      filePublicId: upload.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      parsingStatus: "pending",
      uploadedBy: req.user.id,
    });

    await logAudit(req, "upload", "calendar", calendar._id, {
      session: session._id,
    });

    return res.status(201).json({
      message:
        "Calendar uploaded. Call POST /api/ai/parse/calendar with calendarId to extract dates.",
      calendar: sanitizeCalendar(calendar),
    });
  } catch (err) {
    console.error("uploadCalendar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List uploaded calendars
// @route   GET /api/academic/calendars
// @access  Auth
export const listCalendars = async (req, res) => {
  try {
    const filter = {};
    if (req.query.sessionId) filter.session = req.query.sessionId;

    const calendars = await Calendar.find(filter)
      .populate("session", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return res.json({ calendars: calendars.map(sanitizeCalendar) });
  } catch (err) {
    console.error("listCalendars error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get the current (most recent) calendar for the current session
// @route   GET /api/academic/calendars/current
// @access  Auth
export const getCurrentCalendar = async (_req, res) => {
  try {
    const session = await getCurrentSession();
    const filter = session ? { session: session._id } : {};

    const calendar = await Calendar.findOne(filter)
      .populate("session", "name")
      .sort({ createdAt: -1 });

    if (!calendar) return res.status(404).json({ message: "No calendar uploaded yet" });
    return res.json({ calendar: sanitizeCalendar(calendar) });
  } catch (err) {
    console.error("getCurrentCalendar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a calendar
// @route   DELETE /api/academic/calendars/:id
// @access  Admin
export const deleteCalendar = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete calendars" });
    }
    const calendar = await Calendar.findById(req.params.id);
    if (!calendar) return res.status(404).json({ message: "Calendar not found" });

    if (calendar.filePublicId) {
      await deleteFromCloudinary(calendar.filePublicId);
    }
    await Calendar.deleteOne({ _id: calendar._id });
    await logAudit(req, "delete", "calendar", calendar._id);

    return res.json({ message: "Calendar deleted" });
  } catch (err) {
    console.error("deleteCalendar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};