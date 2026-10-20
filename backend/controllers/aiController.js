// controllers/aiController.js
import { v2 as cloudinary } from "cloudinary";
import Calendar from "../models/calendarModel.js";
import ResultUpload from "../models/resultUploadModel.js";
import Material from "../models/materialModel.js";
import Quiz from "../models/quizModel.js";
import User from "../models/userModel.js";
import CourseOffering from "../models/courseOfferingModel.js";
import Enrollment from "../models/enrollmentModel.js";
import CourseRep from "../models/courseRepModel.js";
import Settings from "../models/settingsModel.js";
import AuditLog from "../models/auditLogModel.js";
import {
  parseCalendarDocument,
  parseResultDocument,
  parseCourseAllocationDocument,
  summarizeContent,
  chatAboutContent,
  generateQuizQuestions,
} from "../services/groqService.js";

/* ============================================================
   HELPERS
   ============================================================ */

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

const userCanManageOffering = async (user, offering) => {
  if (user.role === "admin") return true;
  if (user.role === "lecturer" && String(offering.lecturer) === String(user.id)) {
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

const userCanViewOfferingContent = async (user, offering) => {
  if (await userCanManageOffering(user, offering)) return true;
  if (
    user.role === "student" &&
    (await Enrollment.exists({ student: user.id, offering: offering._id }))
  ) {
    return true;
  }
  return false;
};

const sanitizeError = (err) => {
  const msg = String(err?.message || "AI service failed");
  if (/api key/i.test(msg)) return "AI service authentication failed";
  if (/rate limit|429/i.test(msg)) return "AI rate limit hit. Try again shortly.";
  if (/timeout/i.test(msg)) return "AI service timed out";
  return msg.length > 200 ? "AI service failed. Try again." : msg;
};

const uploadBufferToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const isPdf = file.mimetype === "application/pdf";
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: isPdf ? "raw" : "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      .end(file.buffer);
  });

/* ============================================================
   1. PARSE CALENDAR
   ============================================================ */

// @desc    AI-parse an uploaded school calendar
// @route   POST /api/ai/parse/calendar
// @access  Admin
export const parseCalendar = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can parse calendars" });
    }

    const { calendarId } = req.body;
    if (!calendarId) {
      return res.status(400).json({ message: "calendarId is required" });
    }

    const calendar = await Calendar.findById(calendarId).select("+filePublicId");
    if (!calendar) return res.status(404).json({ message: "Calendar not found" });

    calendar.parsingStatus = "processing";
    calendar.parsingError = null;
    await calendar.save();

    try {
      const parsed = await parseCalendarDocument({
        fileUrl: calendar.fileUrl,
        mimeType: calendar.mimeType,
      });

      calendar.parsedData = parsed;
      calendar.parsingStatus = "completed";
      await calendar.save();

      await logAudit(req, "ai_parse", "calendar", calendar._id, {
        datesFound: Object.entries(parsed).filter(
          ([k, v]) => k !== "notes" && v
        ).length,
      });

      return res.json({
        message: "Calendar parsed. Admin can now confirm promotions.",
        calendar,
      });
    } catch (aiErr) {
      console.error("parseCalendar AI error:", aiErr);
      calendar.parsingStatus = "failed";
      calendar.parsingError = sanitizeError(aiErr);
      await calendar.save();
      return res.status(500).json({
        message: "AI failed to parse calendar",
        error: calendar.parsingError,
      });
    }
  } catch (err) {
    console.error("parseCalendar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   2. PARSE RESULT
   ============================================================ */

// @desc    AI-parse a result upload (one or many pages) and match matric numbers
// @route   POST /api/ai/parse/result
// @access  Uploader / Admin / assigned lecturer / HOD
export const parseResult = async (req, res) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ message: "uploadId is required" });
    }

    const upload = await ResultUpload.findById(uploadId)
      .populate("offering", "course level department semester")
      .populate("uploadedBy", "isTransferStudent");

    if (!upload) return res.status(404).json({ message: "Upload not found" });

    // New multi-file format, with fallback to the legacy single file
    const files =
      Array.isArray(upload.fileUrls) && upload.fileUrls.length
        ? upload.fileUrls
            .filter((f) => f?.url)
            .map((f) => ({ url: f.url, mimeType: f.mimeType }))
        : upload.fileUrl
        ? [{ url: upload.fileUrl, mimeType: upload.mimeType }]
        : [];

    if (!files.length) {
      return res
        .status(400)
        .json({ message: "Upload has no document to parse (manual rows?)" });
    }

    // Permission check
    const isUploader = String(upload.uploadedBy?._id) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    let isManager = false;
    if (upload.offering) {
      const offering = await CourseOffering.findById(upload.offering._id);
      isManager = offering && (await userCanManageOffering(req.user, offering));
    }
    if (!isUploader && !isAdmin && !isManager) {
      return res.status(403).json({ message: "Not allowed" });
    }

    upload.parsingStatus = "processing";
    upload.parsingError = null;
    await upload.save();

    try {
      let courseCode = null;
      let courseTitle = null;
      let units = null;
      if (upload.offering) {
        const offering = await CourseOffering.findById(upload.offering._id).populate(
          "course",
          "code title units"
        );
        if (offering?.course) {
          courseCode = offering.course.code;
          courseTitle = offering.course.title;
          units = offering.course.units;
        }
      }

      const { rows, warnings } = await parseResultDocument({
        files,
        mode: upload.type,
        courseCode,
        courseTitle,
        units,
      });

      const matricNumbers = [
        ...new Set(rows.map((r) => r.matricNumber).filter(Boolean)),
      ];
      const students = matricNumbers.length
        ? await User.find({
            matricNumber: { $in: matricNumbers },
            role: "student",
          }).select("_id matricNumber name")
        : [];
      const studentMap = new Map(students.map((s) => [s.matricNumber, s]));

      const matchedRows = rows.map((r) => {
        const student = r.matricNumber ? studentMap.get(r.matricNumber) : null;
        const rowWarnings = [...(r.warnings || [])];

        // Self-uploads: the row belongs to the uploader, no matric match needed
        if (upload.type === "self") {
          return {
            ...r,
            student: upload.uploadedBy._id,
            matched: true,
            warnings: rowWarnings,
          };
        }

        if (!student) rowWarnings.push("No student found with this matric number");
        if (r.grade === null && r.score === null) {
          rowWarnings.push("Neither score nor grade present");
        }
        if (r.units === null || Number(r.units) < 1) {
          rowWarnings.push("Missing/invalid units");
        }
        if (!r.courseCode) rowWarnings.push("Missing courseCode");

        return {
          ...r,
          student: student?._id || null,
          matched: !!student && rowWarnings.length === 0,
          warnings: rowWarnings,
        };
      });

      upload.parsedRows = matchedRows;
      upload.parsingStatus = "completed";
      if (warnings.length) {
        upload.parsingError = `AI notes: ${warnings.join("; ")}`;
      }
      await upload.save();

      const matchedCount = matchedRows.filter((r) => r.matched).length;
      const needsReview = matchedRows.filter((r) => !r.matched).length;

      await logAudit(req, "ai_parse", "result_upload", upload._id, {
        rows: matchedRows.length,
        matched: matchedCount,
        needsReview,
        files: files.length,
      });

      return res.json({
        message: "Result parsed. Review rows, fix issues, then publish.",
        upload: {
          id: upload._id,
          parsingStatus: upload.parsingStatus,
          rowCount: matchedRows.length,
          matchedCount,
          needsReviewCount: needsReview,
          rows: matchedRows,
        },
        aiWarnings: warnings,
      });
    } catch (aiErr) {
      console.error("parseResult AI error:", aiErr);
      upload.parsingStatus = "failed";
      upload.parsingError = sanitizeError(aiErr);
      await upload.save();
      return res.status(500).json({
        message: "AI failed to parse document",
        error: upload.parsingError,
      });
    }
  } catch (err) {
    console.error("parseResult error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   2B. PARSE COURSE ALLOCATION DOCUMENT
   ============================================================ */

// @desc    AI-parse a course allocation PDF/image into a course list
// @route   POST /api/ai/parse/courses
// @access  Admin / HOD
export const parseCourseDocument = async (req, res) => {
  let uploaded = null;
  let resourceType = "image";

  try {
    const isAdmin = req.user.role === "admin";
    const isHod = req.user.extraRoles?.includes("hod");
    if (!isAdmin && !isHod) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const file =
      req.files?.document?.[0] ||
      (Array.isArray(req.files) ? req.files[0] : null) ||
      req.file;
    if (!file) return res.status(400).json({ message: "No document provided" });

    const { session, semester } = req.body;
    if (!session || !semester) {
      return res.status(400).json({ message: "session and semester are required" });
    }

    resourceType = file.mimetype === "application/pdf" ? "raw" : "image";

    try {
      uploaded = await uploadBufferToCloudinary(file, "school_portal/course_allocations");
    } catch (cloudErr) {
      console.error("parseCourseDocument cloudinary error:", cloudErr);
      return res
        .status(500)
        .json({ message: `Cloudinary Error: ${cloudErr.message || "upload failed"}` });
    }

    try {
      const courses = await parseCourseAllocationDocument({
        fileUrl: uploaded.secure_url,
        mimeType: file.mimetype,
        session,
        semester,
      });

      await logAudit(req, "ai_parse", "course_allocation", null, {
        courses: courses.length,
      });

      return res.json({
        message: "Course document parsed. Review before saving.",
        courses,
      });
    } catch (aiErr) {
      console.error("parseCourseDocument AI error:", aiErr);
      return res.status(500).json({
        message: "AI failed to parse course document",
        error: sanitizeError(aiErr),
      });
    }
  } catch (err) {
    console.error("parseCourseDocument error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    // The file is only needed for parsing
    if (uploaded?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploaded.public_id, {
          resource_type: resourceType,
        });
      } catch (e) {
        console.error("Cloudinary cleanup failed:", e.message);
      }
    }
  }
};

/* ============================================================
   3. SUMMARIZE MATERIAL
   ============================================================ */

// @desc    AI-summarize a study material
// @route   POST /api/ai/summarize
// @access  Anyone who can view the material
export const summarizeMaterial = async (req, res) => {
  try {
    const { materialId } = req.body;
    if (!materialId) {
      return res.status(400).json({ message: "materialId is required" });
    }

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: "Material not found" });

    const offering = await CourseOffering.findById(material.offering);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await userCanViewOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    try {
      const summary = await summarizeContent({
        fileUrl: material.fileUrl,
        mimeType: material.mimeType,
        title: material.title,
      });

      await logAudit(req, "ai_summarize", "material", material._id, {
        keyPoints: summary?.keyPoints?.length || 0,
      });

      return res.json({
        message: "Summary generated",
        material: { id: material._id, title: material.title },
        summary,
      });
    } catch (aiErr) {
      console.error("summarizeMaterial AI error:", aiErr);
      return res.status(500).json({ message: sanitizeError(aiErr) });
    }
  } catch (err) {
    console.error("summarizeMaterial error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   4. STUDY CHAT
   ============================================================ */

// @desc    Chat with AI about a study material
// @route   POST /api/ai/chat
// @access  Anyone who can view the material
export const chatWithMaterial = async (req, res) => {
  try {
    const { materialId, message, history } = req.body;
    if (!materialId || !message) {
      return res
        .status(400)
        .json({ message: "materialId and message are required" });
    }
    if (String(message).length > 4000) {
      return res.status(400).json({ message: "Message too long (max 4000 chars)" });
    }

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: "Material not found" });

    const offering = await CourseOffering.findById(material.offering);
    if (!(await userCanViewOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    try {
      const reply = await chatAboutContent({
        fileUrl: material.fileUrl,
        mimeType: material.mimeType,
        materialTitle: material.title,
        history,
        userMessage: message,
      });

      return res.json({
        message: "OK",
        reply,
        material: { id: material._id, title: material.title },
      });
    } catch (aiErr) {
      console.error("chatWithMaterial AI error:", aiErr);
      return res.status(500).json({ message: sanitizeError(aiErr) });
    }
  } catch (err) {
    console.error("chatWithMaterial error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   5. GENERATE QUIZ
   ============================================================ */

// @desc    Generate a draft quiz from a material (AI)
// @route   POST /api/ai/generate-quiz
// @access  Lecturer / HOD / Admin / approved course rep
export const generateQuiz = async (req, res) => {
  try {
    const {
      materialId,
      count = 5,
      types = ["mcq"],
      marksPerQuestion = 1,
      title,
    } = req.body;

    if (!materialId) {
      return res.status(400).json({ message: "materialId is required" });
    }
    if (!Number.isInteger(count) || count < 1 || count > 30) {
      return res.status(400).json({ message: "count must be 1–30" });
    }
    const validTypes = ["mcq", "theory", "subjective"];
    if (!Array.isArray(types) || types.length === 0 || !types.every((t) => validTypes.includes(t))) {
      return res.status(400).json({ message: "types[] must be subset of mcq, theory, subjective" });
    }

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: "Material not found" });

    const offering = await CourseOffering.findById(material.offering).populate(
      "course",
      "code title"
    );
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    const settings = await getSettingsDoc();
    const isManager = await userCanManageOffering(req.user, offering);
    const isRep = req.user.extraRoles?.includes("course_rep")
      ? await CourseRep.exists({
          user: req.user.id,
          offering: offering._id,
          isActive: true,
        })
      : false;

    if (!isManager && !(isRep && settings.allowStudentQuizGeneration)) {
      return res.status(403).json({
        message:
          "Only the assigned lecturer, HOD, admin or an approved course rep can generate quizzes",
      });
    }

    try {
      const rawQuestions = await generateQuizQuestions({
        fileUrl: material.fileUrl,
        mimeType: material.mimeType,
        materialTitle: material.title,
        count,
        types,
        marksPerQuestion: Number(marksPerQuestion) || 1,
      });

      const normalized = [];
      for (let i = 0; i < rawQuestions.length; i++) {
        const q = rawQuestions[i];
        const qType = String(q.type || "").toLowerCase();
        if (!["mcq", "theory", "subjective"].includes(qType)) continue;
        if (!q.question || !String(q.question).trim()) continue;

        const marks = Number(q.marks) > 0 ? Number(q.marks) : Number(marksPerQuestion) || 1;
        const item = {
          type: qType,
          question: String(q.question).trim(),
          marks,
          options: [],
          correctAnswer: null,
          modelAnswer: null,
        };

        if (qType === "mcq") {
          if (!Array.isArray(q.options) || q.options.length < 2) continue;
          item.options = q.options.map((o) => String(o).trim());
          const ca = q.correctAnswer ? String(q.correctAnswer).trim() : null;
          if (!ca || !item.options.includes(ca)) continue;
          item.correctAnswer = ca;
        } else if (q.modelAnswer) {
          item.modelAnswer = String(q.modelAnswer).trim();
        }

        normalized.push(item);
        if (normalized.length >= count) break;
      }

      if (normalized.length === 0) {
        return res.status(500).json({
          message: "AI returned no valid questions. Try a different material or fewer questions.",
        });
      }

      const totalMarks = normalized.reduce((s, q) => s + q.marks, 0);

      const quiz = await Quiz.create({
        offering: offering._id,
        course: offering.course._id,
        department: offering.department,
        level: offering.level,
        session: offering.session,
        title: title?.trim() || `${material.title} — AI Quiz`,
        description: `AI-generated from "${material.title}"`,
        type: types.length === 1 ? types[0] : "mixed",
        durationMinutes: null,
        startTime: null,
        endTime: null,
        status: "draft",
        aiGenerated: true,
        totalMarks,
        questions: normalized,
        createdBy: req.user.id,
      });

      await logAudit(req, "ai_generate_quiz", "quiz", quiz._id, {
        material: material._id,
        questions: normalized.length,
      });

      return res.status(201).json({
        message:
          "AI quiz created as draft. Review and edit before publishing via /api/study/quizzes/:id/publish.",
        quiz: {
          id: quiz._id,
          title: quiz.title,
          type: quiz.type,
          totalMarks: quiz.totalMarks,
          status: quiz.status,
          aiGenerated: true,
          questionCount: normalized.length,
          questions: normalized,
        },
      });
    } catch (aiErr) {
      console.error("generateQuiz AI error:", aiErr);
      return res.status(500).json({ message: sanitizeError(aiErr) });
    }
  } catch (err) {
    console.error("generateQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};