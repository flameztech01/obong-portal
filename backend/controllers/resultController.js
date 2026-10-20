// controllers/resultController.js
import { v2 as cloudinary } from "cloudinary";
import Result from "../models/resultModel.js";
import ResultUpload from "../models/resultUploadModel.js";
import Course from "../models/courseModel.js";
import CourseOffering from "../models/courseOfferingModel.js";
import Enrollment from "../models/enrollmentModel.js";
import AcademicSession from "../models/academicSessionModel.js";
import User from "../models/userModel.js";
import Settings from "../models/settingsModel.js";
import CourseRep from "../models/courseRepModel.js";
import AuditLog from "../models/auditLogModel.js";

/* ============================================================
   CONSTANTS & HELPERS
   ============================================================ */

const GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
const PASSING_GRADES = ["A", "B", "C", "D", "E"];

const scoreToGrade = (score) => {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
};

const uploadFileToCloudinary = (file, folder, options = {}) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const isPdf = file.mimetype === "application/pdf";
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: isPdf ? "raw" : "auto", ...options },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      .end(file.buffer);
  });

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
    return null;
  }
};

// multer can give req.files as an array (upload.array) or an object (upload.fields)
const collectFiles = (req) => {
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }
  return req.file ? [req.file] : [];
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

const getSettingsDoc = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
};

const idOf = (v) => String(v?._id || v || "");
const SESSION_NAME_RE = /^(\d{4})\/(\d{4})$/;

const findOrCreateSession = async (name) => {
  const clean = String(name || "").trim();
  let sess = await AcademicSession.findOne({ name: clean });
  if (sess) return { sess };

  const m = clean.match(SESSION_NAME_RE);
  if (!m || Number(m[2]) !== Number(m[1]) + 1) {
    return { error: `Invalid session format "${clean}" (expected e.g. 2023/2024)` };
  }

  try {
    sess = await AcademicSession.create({
      name: clean,
      startDate: new Date(Date.UTC(Number(m[1]), 8, 1)),
      endDate: new Date(Date.UTC(Number(m[2]), 7, 31)),
      isCurrent: false,
    });
    return { sess };
  } catch (err) {
    const again = await AcademicSession.findOne({ name: clean });
    if (again) return { sess: again };
    return { error: `Could not create session "${clean}": ${err.message}` };
  }
};

/* ---------- permission helpers ---------- */

const userCanManageOffering = async (user, offering) => {
  if (user.role === "admin") return true;
  if (user.role === "lecturer" && String(offering.lecturer) === String(user.id)) return true;
  if (
    user.extraRoles?.includes("hod") &&
    (user.scope?.departments || []).map(String).includes(String(offering.department))
  ) return true;
  return false;
};

const userCanReviewUpload = async (user, upload) => {
  if (user.role === "admin") return true;
  if (idOf(upload.uploadedBy) === String(user.id)) return true;
  if (upload.offering) {
    const offering = await CourseOffering.findById(idOf(upload.offering));
    if (offering && (await userCanManageOffering(user, offering))) return true;
  }
  return false;
};

/* ---------- sanitizers ---------- */

const sanitizeResult = (r) => ({
  id: r._id,
  student: r.student,
  offering: r.offering || null,
  session: r.session,
  semester: r.semester,
  courseCode: r.courseCode,
  courseTitle: r.courseTitle || null,
  units: r.units,
  score: r.score ?? null,
  grade: r.grade,
  isCarryover: !!r.isCarryover,
  source: r.source,
  isPublished: r.isPublished,
  createdAt: r.createdAt,
});

const sanitizeUpload = (u) => ({
  id: u._id,
  type: u.type,
  source: u.source,
  uploadedBy: u.uploadedBy,
  offering: u.offering || null,
  session: u.session,
  semester: u.semester || null,
  fileUrls: u.fileUrls || [],
  parsingStatus: u.parsingStatus,
  parsingError: u.parsingError || null,
  rowCount: u.parsedRows?.length || 0,
  publishStatus: u.publishStatus,
  publishedAt: u.publishedAt || null,
  publishedBy: u.publishedBy || null,
  createdAt: u.createdAt,
});

/* ---------- GPA / CGPA math ---------- */

const gradePoint = (grade) => GRADE_POINTS[grade] ?? 0;

const computeSessionGpa = (results) => {
  const totals = results.reduce(
    (acc, r) => {
      acc.units += r.units;
      acc.points += r.units * gradePoint(r.grade);
      return acc;
    },
    { units: 0, points: 0 }
  );
  return {
    units: totals.units,
    points: totals.points,
    gpa: totals.units > 0 ? +(totals.points / totals.units).toFixed(2) : 0,
  };
};

const computeCgpa = (allResults) => {
  const bestByCourse = new Map();
  for (const r of allResults) {
    const existing = bestByCourse.get(r.courseCode);
    if (!existing || gradePoint(r.grade) > gradePoint(existing.grade)) {
      bestByCourse.set(r.courseCode, r);
    }
  }
  return computeSessionGpa([...bestByCourse.values()]);
};

const computeCarryovers = (allResults) => {
  const byCourse = new Map();
  for (const r of allResults) {
    if (!byCourse.has(r.courseCode)) byCourse.set(r.courseCode, []);
    byCourse.get(r.courseCode).push(r);
  }
  const carryovers = [];
  for (const [code, attempts] of byCourse.entries()) {
    const passed = attempts.some((a) => PASSING_GRADES.includes(a.grade));
    if (!passed) {
      const latest = attempts[attempts.length - 1];
      carryovers.push({
        courseCode: code,
        courseTitle: latest.courseTitle || null,
        units: latest.units,
        attempts: attempts.length,
        latestGrade: latest.grade,
        latestSession: latest.session,
      });
    }
  }
  return carryovers;
};

/* ============================================================
   HISTORICAL COURSES (SMART FILTERING)
   ============================================================ */

export const getHistoricalCourses = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can use this" });
    }

    const currentLevel = req.user.level;
    const validLevels = [100, 200, 300, 400, 500].filter((l) => l <= currentLevel);

    const allCourses = await Course.find({
      department: req.user.department,
      level: { $in: validLevels },
      isActive: true,
    }).lean();

    const myResults = await Result.find({ student: req.user.id, isPublished: true }).lean();

    // Identify carryovers (best grade is F)
    const bestGrades = new Map();
    myResults.forEach((r) => {
      const existing = bestGrades.get(r.courseCode);
      if (!existing || GRADE_POINTS[r.grade] > GRADE_POINTS[existing]) {
        bestGrades.set(r.courseCode, r.grade);
      }
    });

    const failedCourseCodes = new Set();
    bestGrades.forEach((grade, code) => {
      if (grade === "F") failedCourseCodes.add(code);
    });

    const grouped = { 100: {}, 200: {}, 300: {}, 400: {}, 500: {} };

    allCourses.forEach((c) => {
      const isCurrentLevel = c.level === currentLevel;
      const isCarryover = failedCourseCodes.has(c.code);
      const isBuildingHistory = !req.user.hasUploadedHistoricalResults;

      // Only show if it's their current level, a carryover, or they haven't uploaded history yet
      if (isCurrentLevel || isCarryover || isBuildingHistory) {
        const sessionName = c.session || "Unspecified Session";
        if (!grouped[c.level]) grouped[c.level] = {};
        if (!grouped[c.level][sessionName]) grouped[c.level][sessionName] = [];

        grouped[c.level][sessionName].push({
          courseCode: c.code,
          courseTitle: c.title,
          units: c.units,
          semester: c.semester || "first",
        });
      }
    });

    return res.json({
      isTransferStudent: req.user.isTransferStudent,
      transferCgpa: req.user.transferCgpa,
      transferCredits: req.user.transferCredits,
      courses: grouped,
    });
  } catch (err) {
    console.error("getHistoricalCourses error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   UPLOAD: CREATE
   ============================================================ */

export const createLecturerUpload = async (req, res) => {
  try {
    const { offeringId } = req.body;
    if (!offeringId) return res.status(400).json({ message: "offeringId is required" });

    const offering = await CourseOffering.findById(offeringId).populate("course", "code title units");
    if (!offering) return res.status(404).json({ message: "Offering not found" });
    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const files = collectFiles(req);
    if (!files.length) return res.status(400).json({ message: "No document provided" });

    const uploadedFiles = [];
    try {
      for (const file of files) {
        const uploaded = await uploadFileToCloudinary(file, "school_portal/result_uploads");
        uploadedFiles.push({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          mimeType: file.mimetype,
          originalName: file.originalname,
        });
      }
    } catch (err) {
      console.error("Cloudinary upload failed:", err.message);
      return res.status(500).json({ message: `Cloudinary Error: ${err.message || "upload failed"}` });
    }

    const resultUpload = await ResultUpload.create({
      type: "lecturer",
      source: "document",
      uploadedBy: req.user.id,
      offering: offering._id,
      session: offering.session,
      semester: offering.semester,
      fileUrls: uploadedFiles,
      parsingStatus: "pending",
      publishStatus: "draft",
    });

    await logAudit(req, "upload", "result_upload", resultUpload._id, { offering: offering._id });
    return res.status(201).json({ message: "Upload stored.", upload: sanitizeUpload(resultUpload) });
  } catch (err) {
    console.error("createLecturerUpload error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createSelfUpload = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can use this" });
    }

    const settings = await getSettingsDoc();
    if (!settings.allowStudentResultUpload) {
      return res.status(403).json({ message: "Self-upload is disabled." });
    }

    const files = collectFiles(req);
    const hasRows = Array.isArray(req.body.rows) && req.body.rows.length > 0;

    if (req.user.isTransferStudent && req.body.transferCgpa) {
      await User.findByIdAndUpdate(req.user.id, {
        transferCgpa: Number(req.body.transferCgpa),
        transferCredits: Number(req.body.transferCredits || 0),
      });
    }

    if (files.length === 0 && !hasRows) {
      return res.status(400).json({ message: "Provide document files or a `rows` array" });
    }

    // Document mode (one or many pages)
    if (files.length > 0) {
      const uploadedFiles = [];
      try {
        for (const file of files) {
          const uploaded = await uploadFileToCloudinary(file, "school_portal/self_uploads");
          uploadedFiles.push({
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            mimeType: file.mimetype,
            originalName: file.originalname,
          });
        }
      } catch (err) {
        console.error("Cloudinary upload failed:", err.message);
        return res.status(500).json({ message: `Cloudinary Error: ${err.message || "upload failed"}` });
      }

      const upload = await ResultUpload.create({
        type: "self",
        source: "document",
        uploadedBy: req.user.id,
        fileUrls: uploadedFiles,
        parsingStatus: "pending",
        publishStatus: "draft",
      });

      await logAudit(req, "self_upload", "result_upload", upload._id, {
        mode: "document",
        count: files.length,
      });
      return res.status(201).json({ message: "Upload stored.", upload: sanitizeUpload(upload) });
    }

    // Manual rows mode
    const rows = req.body.rows.map((r) => ({
      session: r.session,
      semester: r.semester,
      courseCode: String(r.courseCode || "").toUpperCase().trim(),
      courseTitle: r.courseTitle || null,
      units: Number(r.units),
      score: r.score != null ? Number(r.score) : null,
      grade: r.grade ? String(r.grade).toUpperCase().trim() : null,
      matched: true,
      warnings: [],
    }));

    const invalid = [];
    rows.forEach((r, i) => {
      if (!r.session) invalid.push(`Row ${i + 1}: missing session`);
      if (!["first", "second"].includes(r.semester)) invalid.push(`Row ${i + 1}: invalid semester`);
      if (!r.courseCode) invalid.push(`Row ${i + 1}: missing courseCode`);
      if (!r.units || r.units < 1) invalid.push(`Row ${i + 1}: invalid units`);
      if (!r.grade && r.score == null) invalid.push(`Row ${i + 1}: provide grade or score`);
    });
    if (invalid.length) {
      return res.status(400).json({ message: "Validation failed", errors: invalid });
    }

    rows.forEach((r) => {
      if (!r.grade) r.grade = scoreToGrade(r.score);
    });

    const upload = await ResultUpload.create({
      type: "self",
      source: "manual",
      uploadedBy: req.user.id,
      parsingStatus: "completed",
      parsedRows: rows,
      publishStatus: "draft",
    });

    await logAudit(req, "self_upload", "result_upload", upload._id, {
      mode: "manual",
      rows: rows.length,
    });

    return res.status(201).json({ message: "Rows stored.", upload: sanitizeUpload(upload) });
  } catch (err) {
    console.error("createSelfUpload error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

/* ============================================================
   UPLOAD: READ / EDIT / PUBLISH
   ============================================================ */

export const listUploads = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { offering, session, type, publishStatus } = req.query;
    const filter = {};

    if (req.user.role === "student") filter.uploadedBy = req.user.id;
    else if (req.query.mine === "true") filter.uploadedBy = req.user.id;

    if (offering) filter.offering = offering;
    if (session) filter.session = session;
    if (type) filter.type = type;
    if (publishStatus) filter.publishStatus = publishStatus;

    const [uploads, total] = await Promise.all([
      ResultUpload.find(filter)
        .populate("offering", "course level department")
        .populate("session", "name")
        .populate("uploadedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ResultUpload.countDocuments(filter),
    ]);

    return res.json({ uploads: uploads.map(sanitizeUpload), page, pages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error("listUploads error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUpload = async (req, res) => {
  try {
    const upload = await ResultUpload.findById(req.params.id)
      .populate("offering", "course level department")
      .populate("session", "name")
      .populate("uploadedBy", "name email")
      .populate("parsedRows.student", "name matricNumber level");

    if (!upload) return res.status(404).json({ message: "Upload not found" });
    if (!(await userCanReviewUpload(req.user, upload))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json({ upload: { ...sanitizeUpload(upload), parsedRows: upload.parsedRows || [] } });
  } catch (err) {
    console.error("getUpload error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const editUploadRows = async (req, res) => {
  try {
    const upload = await ResultUpload.findById(req.params.id);
    if (!upload) return res.status(404).json({ message: "Upload not found" });
    if (upload.publishStatus === "published") {
      return res.status(400).json({ message: "Cannot edit a published upload" });
    }
    if (!(await userCanReviewUpload(req.user, upload))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ message: "rows[] required" });

    upload.parsedRows = rows.map((r) => ({
      matricNumber: r.matricNumber ? String(r.matricNumber).toUpperCase().trim() : null,
      student: r.student || null,
      courseCode: r.courseCode ? String(r.courseCode).toUpperCase().trim() : null,
      courseTitle: r.courseTitle || null,
      units: r.units != null ? Number(r.units) : null,
      score: r.score !== undefined && r.score !== null && r.score !== "" ? Number(r.score) : null,
      grade: r.grade ? String(r.grade).toUpperCase().trim() : null,
      level: r.level ? Number(r.level) : null,
      session: r.session || null,
      semester: r.semester || null,
      matched: !!r.matched,
      warnings: Array.isArray(r.warnings) ? r.warnings : [],
    }));

    upload.parsedRows.forEach((r) => {
      if (!r.grade && r.score !== null) r.grade = scoreToGrade(r.score);
    });
    upload.parsingStatus = "completed";
    await upload.save();

    return res.json({ message: "Rows updated", upload: { ...sanitizeUpload(upload), parsedRows: upload.parsedRows } });
  } catch (err) {
    console.error("editUploadRows error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const publishUpload = async (req, res) => {
  try {
    const upload = await ResultUpload.findById(req.params.id).populate(
      "offering",
      "course level department session semester"
    );
    if (!upload) return res.status(404).json({ message: "Upload not found" });
    if (upload.publishStatus === "published") {
      return res.status(400).json({ message: "Already published" });
    }
    if (!(await userCanReviewUpload(req.user, upload))) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!upload.parsedRows?.length) {
      return res.status(400).json({ message: "No rows to publish" });
    }

    const offering = upload.offering
      ? await CourseOffering.findById(upload.offering._id).populate("course", "code title units")
      : null;

    const toCreate = [];
    const skipped = [];
    const sessionCache = new Map();

    for (let i = 0; i < upload.parsedRows.length; i++) {
      const row = upload.parsedRows[i];

      let student = null;
      if (row.student) {
        student = await User.findById(row.student);
      } else if (row.matricNumber) {
        student = await User.findOne({
          matricNumber: String(row.matricNumber).toUpperCase().trim(),
        });
      }
      if (!student && upload.type === "self") {
        student = await User.findById(idOf(upload.uploadedBy));
      }
      if (!student) {
        skipped.push({ row: i + 1, reason: `No student found for matric ${row.matricNumber || "N/A"}` });
        continue;
      }

      let sessionId = upload.session;
      let semester = upload.semester;
      let courseCode = row.courseCode;
      let courseTitle = row.courseTitle;
      let units = row.units;

      if (offering) {
        sessionId = offering.session;
        semester = offering.semester;
        courseCode = offering.course.code;
        courseTitle = offering.course.title;
        units = offering.course.units;
      } else {
        if (!row.session) {
          skipped.push({ row: i + 1, reason: "Missing session on row" });
          continue;
        }

        const sessionName = String(row.session).trim();
        if (!sessionCache.has(sessionName)) {
          sessionCache.set(sessionName, await findOrCreateSession(sessionName));
        }
        const { sess, error } = sessionCache.get(sessionName);
        if (!sess) {
          skipped.push({ row: i + 1, reason: error || `Session "${sessionName}" not found` });
          continue;
        }

        if (!["first", "second"].includes(row.semester)) {
          skipped.push({ row: i + 1, reason: `Invalid or missing semester "${row.semester ?? "null"}"` });
          continue;
        }

        if (!courseCode || !units) {
          skipped.push({ row: i + 1, reason: "Missing courseCode or units" });
          continue;
        }

        sessionId = sess._id;
        semester = row.semester;
      }

      let grade = row.grade;
      if (!grade && row.score !== null && row.score !== undefined) grade = scoreToGrade(row.score);
      if (!grade) {
        skipped.push({ row: i + 1, reason: "No grade or score" });
        continue;
      }

      toCreate.push({
        student: student._id,
        offering: offering?._id || null,
        session: sessionId,
        semester,
        courseCode,
        courseTitle,
        units,
        score: row.score ?? null,
        grade,
        isCarryover: grade === "F",
        source: upload.type === "self" ? "self_upload" : "lecturer_upload",
        uploadId: upload._id,
        isPublished: true,
      });
    }

    if (toCreate.length === 0) {
      console.error("publishUpload: all rows skipped:", JSON.stringify(skipped.slice(0, 5)));
      return res.status(400).json({
        message: `No valid rows to publish. ${skipped[0]?.reason || ""}`.trim(),
        skipped,
      });
    }

    const created = [];
    for (const row of toCreate) {
      const doc = await Result.findOneAndUpdate(
        { student: row.student, session: row.session, semester: row.semester, courseCode: row.courseCode },
        { $set: row },
        { upsert: true, new: true }
      );
      created.push(doc);
    }

    upload.publishStatus = "published";
    upload.publishedAt = new Date();
    upload.publishedBy = req.user.id;
    await upload.save();

    if (upload.type === "self") {
      await User.findByIdAndUpdate(idOf(upload.uploadedBy), { hasUploadedHistoricalResults: true });
    }

    await logAudit(req, "publish", "result_upload", upload._id, {
      published: created.length,
      skipped: skipped.length,
    });

    return res.json({ message: `Published ${created.length} result(s)`, published: created.length, skipped });
  } catch (err) {
    console.error("publishUpload error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteUpload = async (req, res) => {
  try {
    const upload = await ResultUpload.findById(req.params.id).select("+filePublicId");
    if (!upload) return res.status(404).json({ message: "Upload not found" });
    if (upload.publishStatus === "published") {
      return res.status(400).json({ message: "Cannot delete a published upload. Results are live." });
    }
    if (!(await userCanReviewUpload(req.user, upload))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    for (const f of upload.fileUrls || []) {
      await deleteFromCloudinary(f.publicId, f.mimeType === "application/pdf" ? "raw" : "image");
    }
    if (upload.filePublicId) await deleteFromCloudinary(upload.filePublicId);

    await ResultUpload.deleteOne({ _id: upload._id });
    await logAudit(req, "delete", "result_upload", upload._id);

    return res.json({ message: "Upload deleted" });
  } catch (err) {
    console.error("deleteUpload error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   RESULTS: READ & CACHE SYNC
   ============================================================ */

export const getMyResults = async (req, res) => {
  try {
    const { session, semester } = req.query;
    const filter = { student: req.user.id, isPublished: true };
    if (session) filter.session = session;
    if (semester) filter.semester = semester;

    const results = await Result.find(filter)
      .populate("session", "name")
      .populate("offering", "course level")
      .sort({ createdAt: -1 });
    return res.json({ results: results.map(sanitizeResult) });
  } catch (err) {
    console.error("getMyResults error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyGpa = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const results = await Result.find({ student: req.user.id, isPublished: true })
      .populate("session", "name")
      .lean();

    const sessionMap = new Map();
    for (const r of results) {
      const key = `${r.session?._id}_${r.semester}`;
      if (!sessionMap.has(key)) sessionMap.set(key, { session: r.session, semester: r.semester, results: [] });
      sessionMap.get(key).results.push(r);
    }

    const sessionBreakdown = [...sessionMap.values()]
      .map(({ session, semester, results }) => ({ session, semester, ...computeSessionGpa(results) }))
      .sort(
        (a, b) =>
          (a.session?.name || "").localeCompare(b.session?.name || "") ||
          a.semester.localeCompare(b.semester)
      );

    const localCumulative = computeCgpa(results);
    const carryovers = computeCarryovers(results);

    let finalCgpa = localCumulative.gpa;
    let finalUnits = localCumulative.units;
    let finalPoints = localCumulative.points;

    if (user.isTransferStudent && user.transferCgpa && user.transferCredits) {
      const transferPoints = user.transferCgpa * user.transferCredits;
      finalUnits = localCumulative.units + user.transferCredits;
      finalPoints = localCumulative.points + transferPoints;
      finalCgpa = finalUnits > 0 ? +(finalPoints / finalUnits).toFixed(2) : 0;
    }

    const currentCalculated = {
      sessionBreakdown: sessionBreakdown.map((s) => ({
        session: s.session?.name,
        semester: s.semester,
        gpa: s.gpa,
        units: s.units,
        points: s.points,
      })),
      cumulative: { units: finalUnits, points: finalPoints, gpa: finalCgpa },
    };

    // Sync the cached GPA on the user document if it drifted
    const cached = user.gpaCache;
    const needsUpdate =
      !cached ||
      JSON.stringify(cached.cumulative) !== JSON.stringify(currentCalculated.cumulative) ||
      JSON.stringify(cached.sessionBreakdown) !== JSON.stringify(currentCalculated.sessionBreakdown);

    if (needsUpdate) {
      user.gpaCache = {
        sessionBreakdown: currentCalculated.sessionBreakdown,
        cumulative: currentCalculated.cumulative,
        updatedAt: new Date(),
      };
      await user.save();
      console.log(`[GPA Sync] Recalculated and updated cache for ${user.matricNumber}`);
    }

    return res.json({
      sessionBreakdown,
      cumulative: { units: finalUnits, points: finalPoints, gpa: finalCgpa },
      transferData: user.isTransferStudent ? { cgpa: user.transferCgpa, credits: user.transferCredits } : null,
      carryovers,
      totalCourses: new Set(results.map((r) => r.courseCode)).size,
    });
  } catch (err) {
    console.error("getMyGpa error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStudentResults = async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isHod =
      req.user.extraRoles?.includes("hod") &&
      (req.user.scope?.departments || []).map(String).includes(String(student.department));

    if (!isAdmin && !isHod) {
      const lecturerHasStudent = await Result.exists({
        student: student._id,
        offering: { $in: await CourseOffering.find({ lecturer: req.user.id }).distinct("_id") },
      });
      if (!lecturerHasStudent) return res.status(403).json({ message: "Not allowed" });
    }

    const results = await Result.find({ student: student._id, isPublished: true })
      .populate("session", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      student: {
        id: student._id,
        name: student.name,
        matricNumber: student.matricNumber,
        department: student.department,
        level: student.level,
        isTransferStudent: student.isTransferStudent,
      },
      results: results.map(sanitizeResult),
      cumulative: computeCgpa(results),
      carryovers: computeCarryovers(results),
    });
  } catch (err) {
    console.error("getStudentResults error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOfferingResults = async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.offeringId).populate("course", "code title units");
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    const isRep = await CourseRep.exists({ user: req.user.id, offering: offering._id, isActive: true });
    if (!(await userCanManageOffering(req.user, offering)) && !isRep) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const results = await Result.find({ offering: offering._id, isPublished: true })
      .populate("student", "name matricNumber level")
      .sort({ createdAt: -1 });

    return res.json({
      offering: { id: offering._id, course: offering.course, level: offering.level },
      count: results.length,
      results: results.map((r) => ({ ...sanitizeResult(r), student: r.student })),
    });
  } catch (err) {
    console.error("getOfferingResults error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};