// controllers/studyController.js
import { v2 as cloudinary } from "cloudinary";
import Material from "../models/materialModel.js";
import Quiz from "../models/quizModel.js";
import QuizAttempt from "../models/quizAttemptModel.js";
import CourseOffering from "../models/courseOfferingModel.js";
import Enrollment from "../models/enrollmentModel.js";
import CourseRep from "../models/courseRepModel.js";
import User from "../models/userModel.js";
import Settings from "../models/settingsModel.js";
import AuditLog from "../models/auditLogModel.js";

/* ============================================================
   HELPERS
   ============================================================ */

const uploadFileToCloudinary = (file, folder, options = {}) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "auto", ...options },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      .end(file.buffer);
  });

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
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

const getSettingsDoc = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
};

/* ---------- permission helpers ---------- */

const isEnrolledIn = async (userId, offeringId) => {
  return !!(await Enrollment.exists({ student: userId, offering: offeringId }));
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

// student OR course_rep of this offering OR lecturer/HOD/admin
const userCanViewOfferingContent = async (user, offering) => {
  if (await userCanManageOffering(user, offering)) return true;
  if (user.role === "student" && (await isEnrolledIn(user.id, offering._id))) {
    return true;
  }
  return false;
};

/* ---------- sanitizers ---------- */

const sanitizeMaterial = (m) => ({
  id: m._id,
  offering: m.offering,
  course: m.course || null,
  title: m.title,
  description: m.description || "",
  type: m.type,
  fileUrl: m.fileUrl,
  mimeType: m.mimeType || null,
  sizeBytes: m.sizeBytes || null,
  originalName: m.originalName || null,
  uploadedBy: m.uploadedBy,
  createdAt: m.createdAt,
});

const sanitizeQuestion = (q, { includeAnswers = false } = {}) => ({
  id: q._id,
  type: q.type,
  question: q.question,
  options: q.options || [],
  marks: q.marks,
  ...(includeAnswers
    ? { correctAnswer: q.correctAnswer ?? null, modelAnswer: q.modelAnswer ?? null }
    : {}),
});

const sanitizeQuiz = (q, { includeAnswers = false } = {}) => ({
  id: q._id,
  offering: q.offering,
  course: q.course || null,
  title: q.title,
  description: q.description || "",
  type: q.type,
  totalMarks: q.totalMarks,
  durationMinutes: q.durationMinutes ?? null,
  startTime: q.startTime || null,
  endTime: q.endTime || null,
  status: q.status,
  aiGenerated: !!q.aiGenerated,
  createdBy: q.createdBy,
  questions: (q.questions || []).map((qq) => sanitizeQuestion(qq, { includeAnswers })),
  createdAt: q.createdAt,
});

const sanitizeAttempt = (a, { includeAnswers = true } = {}) => ({
  id: a._id,
  quiz: a.quiz,
  student: a.student,
  status: a.status,
  startedAt: a.startedAt,
  submittedAt: a.submittedAt || null,
  gradedAt: a.gradedAt || null,
  gradedBy: a.gradedBy || null,
  score: a.score ?? null,
  totalMarks: a.totalMarks,
  percentage: a.totalMarks > 0 && a.score != null
    ? +((a.score / a.totalMarks) * 100).toFixed(2)
    : null,
  ...(includeAnswers
    ? {
        answers: a.answers.map((ans) => ({
          questionId: ans.questionId,
          answer: ans.answer ?? null,
          isCorrect: ans.isCorrect ?? null,
          awardedMarks: ans.awardedMarks ?? null,
          feedback: ans.feedback ?? null,
        })),
      }
    : {}),
});

/* ============================================================
   MATERIALS
   ============================================================ */

// @desc    Upload a study material
// @route   POST /api/study/materials
// @access  Lecturer / HOD / Admin / course_rep of that offering
export const uploadMaterial = async (req, res) => {
  try {
    const { offeringId, title, description, type } = req.body;

    if (!offeringId || !title) {
      return res.status(400).json({ message: "offeringId and title are required" });
    }

    const file = req.files?.document?.[0];
    if (!file) {
      return res.status(400).json({ message: "No document provided" });
    }

    const offering = await CourseOffering.findById(offeringId).populate(
      "course",
      "code title"
    );
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    // Only assigned lecturer / HOD / admin can upload.
    // Course rep can also upload if settings.allowCourseRepMaterialUpload is true.
    const settings = await getSettingsDoc();
    const isManager = await userCanManageOffering(req.user, offering);
    const isRep = req.user.extraRoles?.includes("course_rep")
      ? await CourseRep.exists({
          user: req.user.id,
          offering: offering._id,
          isActive: true,
        })
      : false;

    if (!isManager && !(isRep && settings.allowCourseRepMaterialUpload)) {
      return res.status(403).json({
        message:
          "Only the assigned lecturer, HOD, admin, or an approved course rep can upload materials",
      });
    }

    const uploaded = await uploadFileToCloudinary(file, "school_portal/materials");

    const validTypes = ["lecture_note", "slide", "past_question", "textbook", "other"];
    const materialType = validTypes.includes(type) ? type : "lecture_note";

    const material = await Material.create({
      offering: offering._id,
      course: offering.course._id,
      department: offering.department,
      level: offering.level,
      title: title.trim(),
      description: description?.trim() || "",
      type: materialType,
      fileUrl: uploaded.secure_url,
      filePublicId: uploaded.public_id,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      originalName: file.originalname,
      uploadedBy: req.user.id,
    });

    await logAudit(req, "upload", "material", material._id, {
      offering: offering._id,
    });

    return res.status(201).json({
      message: "Material uploaded",
      material: sanitizeMaterial(material),
    });
  } catch (err) {
    console.error("uploadMaterial error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List materials (student: only for enrolled offerings)
// @route   GET /api/study/materials
// @access  Auth
export const listMaterials = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { offering, level, type, search } = req.query;

    const filter = {};
    if (offering) filter.offering = offering;
    if (level) filter.level = Number(level);
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Students see only materials for offerings they're enrolled in
    if (req.user.role === "student") {
      const enrolledOfferingIds = await Enrollment.find({
        student: req.user.id,
      }).distinct("offering");
      filter.offering = { $in: enrolledOfferingIds };
    }

    const [materials, total] = await Promise.all([
      Material.find(filter)
        .populate("offering", "level semester")
        .populate("course", "code title units")
        .populate("uploadedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Material.countDocuments(filter),
    ]);

    return res.json({
      materials: materials.map(sanitizeMaterial),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("listMaterials error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get material detail
// @route   GET /api/study/materials/:id
// @access  Auth (enrolled student or staff)
export const getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate("course", "code title units")
      .populate("uploadedBy", "name");
    if (!material) return res.status(404).json({ message: "Material not found" });

    const offering = await CourseOffering.findById(material.offering);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await userCanViewOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json({ material: sanitizeMaterial(material) });
  } catch (err) {
    console.error("getMaterial error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a material
// @route   DELETE /api/study/materials/:id
// @access  Uploader / assigned lecturer / HOD / admin
export const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).select("+filePublicId");
    if (!material) return res.status(404).json({ message: "Material not found" });

    const offering = await CourseOffering.findById(material.offering);
    const isUploader = String(material.uploadedBy) === String(req.user.id);
    const isManager = offering && (await userCanManageOffering(req.user, offering));

    if (!isUploader && !isManager) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (material.filePublicId) await deleteFromCloudinary(material.filePublicId);
    await Material.deleteOne({ _id: material._id });

    await logAudit(req, "delete", "material", material._id);

    return res.json({ message: "Material deleted" });
  } catch (err) {
    console.error("deleteMaterial error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   QUIZZES
   ============================================================ */

// @desc    Create a quiz (usually draft; AI-generated also lands here as draft)
// @route   POST /api/study/quizzes
// @access  Lecturer / HOD / Admin / course_rep
export const createQuiz = async (req, res) => {
  try {
    const {
      offeringId,
      title,
      description,
      type,
      durationMinutes,
      startTime,
      endTime,
      questions,
      aiGenerated,
    } = req.body;

    if (!offeringId || !title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        message: "offeringId, title and questions[] are required",
      });
    }

    const offering = await CourseOffering.findById(offeringId).populate(
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

    // Course rep can create quizzes only if student quiz generation is allowed
    // by settings AND the quiz is clearly marked as course-rep-created.
    if (!isManager && !(isRep && settings.allowStudentQuizGeneration)) {
      return res.status(403).json({
        message: "Only the assigned lecturer, HOD, admin or an approved course rep can create quizzes",
      });
    }

    const validTypes = ["mcq", "theory", "subjective", "mixed"];
    const quizType = validTypes.includes(type) ? type : "mcq";

    // Validate + normalize questions
    const normalized = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.type) {
        return res.status(400).json({
          message: `Question ${i + 1}: question and type are required`,
        });
      }
      const qType = String(q.type).toLowerCase();
      if (!["mcq", "theory", "subjective"].includes(qType)) {
        return res.status(400).json({
          message: `Question ${i + 1}: type must be mcq, theory or subjective`,
        });
      }

      const item = {
        type: qType,
        question: String(q.question).trim(),
        marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
        options: [],
        correctAnswer: null,
        modelAnswer: null,
      };

      if (qType === "mcq") {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({
            message: `Question ${i + 1}: MCQ needs at least 2 options`,
          });
        }
        item.options = q.options.map((o) => String(o).trim());
        if (q.correctAnswer === undefined || q.correctAnswer === null) {
          return res.status(400).json({
            message: `Question ${i + 1}: MCQ needs correctAnswer (option index or text)`,
          });
        }
        const isIndex = Number.isInteger(q.correctAnswer);
        item.correctAnswer = isIndex
          ? item.options[q.correctAnswer] ?? null
          : String(q.correctAnswer).trim();
        if (!item.correctAnswer || !item.options.includes(item.correctAnswer)) {
          return res.status(400).json({
            message: `Question ${i + 1}: correctAnswer must match one of the options`,
          });
        }
      } else {
        // theory/subjective — model answer optional
        if (q.modelAnswer) item.modelAnswer = String(q.modelAnswer).trim();
      }

      normalized.push(item);
    }

    const totalMarks = normalized.reduce((s, q) => s + q.marks, 0);

    const quiz = await Quiz.create({
      offering: offering._id,
      course: offering.course._id,
      department: offering.department,
      level: offering.level,
      session: offering.session,
      title: title.trim(),
      description: description?.trim() || "",
      type: quizType,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      status: "draft",
      aiGenerated: !!aiGenerated,
      totalMarks,
      questions: normalized,
      createdBy: req.user.id,
    });

    await logAudit(req, "create", "quiz", quiz._id, {
      offering: offering._id,
      type: quizType,
      questions: normalized.length,
    });

    return res.status(201).json({
      message: "Quiz created as draft. Publish it when ready.",
      quiz: sanitizeQuiz(quiz, { includeAnswers: true }),
    });
  } catch (err) {
    console.error("createQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List quizzes
//        - Students: only published quizzes for offerings they're enrolled in
//        - Staff: filter by offering, status
// @route   GET /api/study/quizzes
// @access  Auth
export const listQuizzes = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { offering, status } = req.query;

    const filter = {};

    if (req.user.role === "student") {
      const enrolled = await Enrollment.find({ student: req.user.id }).distinct(
        "offering"
      );
      filter.offering = { $in: enrolled };
      filter.status = "published";
    } else {
      if (offering) filter.offering = offering;
      if (status) filter.status = status;
    }

    const [quizzes, total] = await Promise.all([
      Quiz.find(filter)
        .populate("offering", "level semester")
        .populate("course", "code title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Quiz.countDocuments(filter),
    ]);

    return res.json({
      // never leak answers in a list
      quizzes: quizzes.map((q) => sanitizeQuiz(q, { includeAnswers: false })),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("listQuizzes error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get quiz detail (answer visibility depends on role/status)
// @route   GET /api/study/quizzes/:id
// @access  Auth
export const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate("course", "code title")
      .populate("createdBy", "name");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const offering = await CourseOffering.findById(quiz.offering);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await userCanViewOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Students don't see answers unless they've already submitted
    let includeAnswers = false;
    if (req.user.role !== "student") {
      includeAnswers = true;
    } else {
      const attempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: req.user.id,
        status: { $in: ["submitted", "graded"] },
      });
      includeAnswers = !!attempt;
    }

    return res.json({ quiz: sanitizeQuiz(quiz, { includeAnswers }) });
  } catch (err) {
    console.error("getQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a draft quiz
// @route   PATCH /api/study/quizzes/:id
// @access  Creator / admin
export const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.status === "published") {
      return res.status(400).json({
        message: "Cannot edit a published quiz. Close it first, or create a new one.",
      });
    }

    const isCreator = String(quiz.createdBy) === String(req.user.id);
    if (!isCreator && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { title, description, durationMinutes, startTime, endTime, questions } = req.body;

    if (title !== undefined) quiz.title = String(title).trim();
    if (description !== undefined) quiz.description = String(description).trim();
    if (durationMinutes !== undefined) {
      quiz.durationMinutes = durationMinutes ? Number(durationMinutes) : null;
    }
    if (startTime !== undefined) quiz.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) quiz.endTime = endTime ? new Date(endTime) : null;

    if (Array.isArray(questions)) {
      // Simplest safe rule: replace questions wholesale while draft
      const normalized = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qType = String(q.type || "").toLowerCase();
        if (!q.question || !["mcq", "theory", "subjective"].includes(qType)) {
          return res.status(400).json({
            message: `Question ${i + 1}: invalid`,
          });
        }
        const item = {
          type: qType,
          question: String(q.question).trim(),
          marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
          options: [],
          correctAnswer: null,
          modelAnswer: null,
        };
        if (qType === "mcq") {
          if (!Array.isArray(q.options) || q.options.length < 2) {
            return res.status(400).json({
              message: `Question ${i + 1}: need 2+ options`,
            });
          }
          item.options = q.options.map((o) => String(o).trim());
          const isIndex = Number.isInteger(q.correctAnswer);
          item.correctAnswer = isIndex
            ? item.options[q.correctAnswer] ?? null
            : String(q.correctAnswer || "").trim();
          if (!item.options.includes(item.correctAnswer)) {
            return res.status(400).json({
              message: `Question ${i + 1}: correctAnswer invalid`,
            });
          }
        } else if (q.modelAnswer) {
          item.modelAnswer = String(q.modelAnswer).trim();
        }
        normalized.push(item);
      }
      quiz.questions = normalized;
      quiz.totalMarks = normalized.reduce((s, q) => s + q.marks, 0);
    }

    await quiz.save();
    await logAudit(req, "update", "quiz", quiz._id);

    return res.json({
      message: "Quiz updated",
      quiz: sanitizeQuiz(quiz, { includeAnswers: true }),
    });
  } catch (err) {
    console.error("updateQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Publish a quiz
// @route   POST /api/study/quizzes/:id/publish
// @access  Creator / admin
export const publishQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (quiz.status === "published") {
      return res.status(400).json({ message: "Already published" });
    }
    if (!quiz.questions?.length) {
      return res.status(400).json({ message: "Add questions before publishing" });
    }

    const isCreator = String(quiz.createdBy) === String(req.user.id);
    if (!isCreator && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    quiz.status = "published";
    await quiz.save();

    await logAudit(req, "publish", "quiz", quiz._id);

    return res.json({ message: "Quiz published", quiz: sanitizeQuiz(quiz) });
  } catch (err) {
    console.error("publishQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Close a quiz (no more attempts; still visible for results)
// @route   POST /api/study/quizzes/:id/close
// @access  Creator / admin
export const closeQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const isCreator = String(quiz.createdBy) === String(req.user.id);
    if (!isCreator && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    quiz.status = "closed";
    await quiz.save();

    await logAudit(req, "close", "quiz", quiz._id);

    return res.json({ message: "Quiz closed", quiz: sanitizeQuiz(quiz) });
  } catch (err) {
    console.error("closeQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a quiz (only drafts, or admin)
// @route   DELETE /api/study/quizzes/:id
// @access  Creator / admin
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const isCreator = String(quiz.createdBy) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (quiz.status !== "draft" && !isAdmin) {
      return res.status(400).json({
        message: "Only drafts can be deleted. Close it, or ask admin to hard-delete.",
      });
    }

    const attempts = await QuizAttempt.countDocuments({ quiz: quiz._id });
    if (attempts > 0 && !isAdmin) {
      return res.status(400).json({
        message: `Quiz has ${attempts} attempt(s). Admin required to delete.`,
      });
    }
    if (attempts > 0) {
      await QuizAttempt.deleteMany({ quiz: quiz._id });
    }

    await Quiz.deleteOne({ _id: quiz._id });
    await logAudit(req, "delete", "quiz", quiz._id);

    return res.json({ message: "Quiz deleted" });
  } catch (err) {
    console.error("deleteQuiz error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   QUIZ ATTEMPTS
   ============================================================ */

// @desc    Start (or resume) an attempt
// @route   POST /api/study/quizzes/:id/start
// @access  Student (enrolled, quiz published)
export const startAttempt = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can attempt quizzes" });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (quiz.status !== "published") {
      return res.status(400).json({ message: "Quiz is not open for attempts" });
    }

    const offering = await CourseOffering.findById(quiz.offering);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    if (!(await isEnrolledIn(req.user.id, offering._id))) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      return res.status(400).json({ message: "Quiz has not started yet" });
    }
    if (quiz.endTime && now > quiz.endTime) {
      return res.status(400).json({ message: "Quiz has ended" });
    }

    // Existing attempt?
    let attempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: req.user.id,
    });

    if (attempt) {
      if (attempt.status === "in_progress") {
        return res.json({
          message: "Resuming your attempt",
          attempt: sanitizeAttempt(attempt, { includeAnswers: false }),
          quiz: sanitizeQuiz(quiz, { includeAnswers: false }),
        });
      }
      return res.status(400).json({
        message: `You already ${attempt.status === "graded" ? "completed" : "submitted"} this quiz`,
        attempt: sanitizeAttempt(attempt),
      });
    }

    const deadline = quiz.durationMinutes
      ? new Date(now.getTime() + quiz.durationMinutes * 60 * 1000)
      : null;

    attempt = await QuizAttempt.create({
      quiz: quiz._id,
      offering: quiz.offering,
      student: req.user.id,
      status: "in_progress",
      startedAt: now,
      deadlineAt: deadline,
      totalMarks: quiz.totalMarks,
      answers: quiz.questions.map((q) => ({
        questionId: q._id,
        answer: null,
        isCorrect: null,
        awardedMarks: null,
        feedback: null,
      })),
    });

    return res.status(201).json({
      message: "Attempt started",
      attempt: sanitizeAttempt(attempt, { includeAnswers: false }),
      quiz: sanitizeQuiz(quiz, { includeAnswers: false }),
    });
  } catch (err) {
    console.error("startAttempt error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Submit attempt answers
// @route   POST /api/study/quizzes/:id/submit
// @access  Student
export const submitAttempt = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit" });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers[] required" });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const attempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: req.user.id,
      status: "in_progress",
    });
    if (!attempt) {
      return res.status(400).json({ message: "No in-progress attempt found" });
    }

    // Time check — allow grace but log if late
    if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
      // Still accept (never lose a student's submission over clock skew),
      // but mark it late in metadata.
      attempt.lateSubmission = true;
    }

    // Grade MCQs immediately; leave theory/subjective ungraded
    const qMap = new Map(quiz.questions.map((q) => [String(q._id), q]));
    let autoScore = 0;
    let hasPending = false;

    attempt.answers = attempt.answers.map((ans) => {
      const submitted = answers.find(
        (a) => String(a.questionId) === String(ans.questionId)
      );
      const q = qMap.get(String(ans.questionId));
      const out = { ...ans.toObject() };

      if (!q) return out;

      if (q.type === "mcq") {
        const answerText = submitted?.answer != null ? String(submitted.answer).trim() : null;
        out.answer = answerText;
        if (answerText && answerText === q.correctAnswer) {
          out.isCorrect = true;
          out.awardedMarks = q.marks;
          autoScore += q.marks;
        } else {
          out.isCorrect = false;
          out.awardedMarks = 0;
        }
      } else {
        // theory / subjective — pending manual grading
        out.answer = submitted?.answer != null ? String(submitted.answer).trim() : null;
        out.isCorrect = null;
        out.awardedMarks = null;
        if (out.answer) hasPending = true;
      }

      return out;
    });

    attempt.submittedAt = new Date();
    attempt.score = autoScore;

    if (hasPending) {
      attempt.status = "submitted";
    } else {
      attempt.status = "graded";
      attempt.gradedAt = new Date();
    }

    await attempt.save();

    return res.json({
      message: hasPending
        ? "Submitted. Some answers are pending grading."
        : "Submitted and auto-graded.",
      attempt: sanitizeAttempt(attempt),
    });
  } catch (err) {
    console.error("submitAttempt error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List attempts for a quiz (lecturer view)
// @route   GET /api/study/quizzes/:id/attempts
// @access  Assigned lecturer / HOD / admin / course_rep
export const listQuizAttempts = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const offering = await CourseOffering.findById(quiz.offering);
    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const attempts = await QuizAttempt.find({ quiz: quiz._id })
      .populate("student", "name matricNumber level")
      .sort({ submittedAt: -1 });

    return res.json({
      quiz: sanitizeQuiz(quiz, { includeAnswers: true }),
      count: attempts.length,
      attempts: attempts.map((a) => sanitizeAttempt(a)),
    });
  } catch (err) {
    console.error("listQuizAttempts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    My attempts (student view)
// @route   GET /api/study/attempts/me
// @access  Student
export const listMyAttempts = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const attempts = await QuizAttempt.find({ student: req.user.id })
      .populate({
        path: "quiz",
        select: "title totalMarks type status offering course",
        populate: { path: "course", select: "code title" },
      })
      .sort({ createdAt: -1 });

    return res.json({ attempts: attempts.map((a) => sanitizeAttempt(a)) });
  } catch (err) {
    console.error("listMyAttempts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a single attempt
// @route   GET /api/study/attempts/:id
// @access  Owner student OR assigned lecturer/HOD/admin
export const getAttempt = async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id)
      .populate("quiz", "title totalMarks type status offering questions")
      .populate("student", "name matricNumber level");

    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const quiz = attempt.quiz;
    const offering = await CourseOffering.findById(quiz.offering);

    const isOwner = String(attempt.student._id) === String(req.user.id);
    const isManager = offering && (await userCanManageOffering(req.user, offering));

    if (!isOwner && !isManager) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json({
      attempt: sanitizeAttempt(attempt),
      quiz: sanitizeQuiz(quiz, { includeAnswers: true }),
    });
  } catch (err) {
    console.error("getAttempt error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Grade / re-grade subjective + theory answers
// @route   PATCH /api/study/attempts/:id/grade
// @access  Assigned lecturer / HOD / admin
export const gradeAttempt = async (req, res) => {
  try {
    const { grades } = req.body; // [{ questionId, awardedMarks, feedback? }]
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ message: "grades[] required" });
    }

    const attempt = await QuizAttempt.findById(req.params.id).populate(
      "quiz",
      "questions totalMarks offering"
    );
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status === "in_progress") {
      return res.status(400).json({ message: "Student has not submitted yet" });
    }

    const offering = await CourseOffering.findById(attempt.quiz.offering);
    if (!(await userCanManageOffering(req.user, offering))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const qMap = new Map(
      attempt.quiz.questions.map((q) => [String(q._id), q])
    );

    const gradeMap = new Map(
      grades.map((g) => [String(g.questionId), g])
    );

    let totalAwarded = 0;
    let pending = false;

    attempt.answers = attempt.answers.map((ans) => {
      const q = qMap.get(String(ans.questionId));
      const out = { ...ans.toObject() };
      if (!q) return out;

      // MCQ graded already — keep as is
      if (q.type === "mcq") {
        totalAwarded += out.awardedMarks || 0;
        return out;
      }

      const given = gradeMap.get(String(ans.questionId));
      if (given) {
        const marks = Number(given.awardedMarks);
        if (Number.isNaN(marks) || marks < 0 || marks > q.marks) {
          throw new Error(
            `Invalid awardedMarks for question ${ans.questionId} (0–${q.marks})`
          );
        }
        out.awardedMarks = marks;
        out.feedback = given.feedback ? String(given.feedback).trim() : out.feedback;
        totalAwarded += marks;
      } else if (out.awardedMarks != null) {
        totalAwarded += out.awardedMarks;
      } else if (out.answer) {
        pending = true;
      }
      return out;
    });

    attempt.score = totalAwarded;
    attempt.gradedBy = req.user.id;
    attempt.gradedAt = new Date();
    attempt.status = pending ? "submitted" : "graded";

    await attempt.save();

    await logAudit(req, "grade", "quiz_attempt", attempt._id, {
      pending,
      score: attempt.score,
    });

    return res.json({
      message: pending ? "Partial grading saved" : "Attempt fully graded",
      attempt: sanitizeAttempt(attempt),
    });
  } catch (err) {
    console.error("gradeAttempt error:", err);
    if (err.message?.startsWith("Invalid awardedMarks")) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};