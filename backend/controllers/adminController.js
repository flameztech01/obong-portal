// controllers/adminController.js
import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";
import Course from "../models/courseModel.js";
import CourseOffering from "../models/courseOfferingModel.js";
import CourseRep from "../models/courseRepModel.js";
import Team from "../models/teamModel.js";
import Settings from "../models/settingsModel.js";
import AcademicSession from "../models/academicSessionModel.js";
import AuditLog from "../models/auditLogModel.js";
import Enrollment from "../models/enrollmentModel.js";
import Result from "../models/resultModel.js";

/* ============================================================
   HELPERS
   ============================================================ */

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  matricNumber: user.matricNumber || null,
  staffId: user.staffId || null,
  department: user.department || null,
  level: user.level ?? null,
  role: user.role,
  extraRoles: user.extraRoles || [],
  scope: user.scope || { levels: [], departments: [] },
  phone: user.phone || null,
  profilePicture: user.profilePicture || null,
  isEmailVerified: user.isEmailVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const getSettingsDoc = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
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

const paginate = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

/* ============================================================
   USER MANAGEMENT
   ============================================================ */

// @desc    List users (filter by role, dept, level, active)
// @route   GET /api/admin/users
// @access  Admin
export const listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { role, department, level, isActive, search, extraRole } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (level) filter.level = Number(level);
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (extraRole) filter.extraRoles = extraRole;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { matricNumber: { $regex: search, $options: "i" } },
        { staffId: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("department", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.json({
      users: users.map(sanitizeUser),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get one user
// @route   GET /api/admin/users/:id
// @access  Admin
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "department",
      "name code"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a lecturer account (admin-only path)
// @route   POST /api/admin/users/lecturer
// @access  Admin
export const createLecturer = async (req, res) => {
  try {
    const { name, email, staffId, department, phone } = req.body;

    if (!name || !email || !staffId || !department) {
      return res.status(400).json({
        message: "name, email, staffId and department are required",
      });
    }

    const dept = await Department.findById(department);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const emailLower = email.toLowerCase().trim();
    const staffUpper = staffId.toUpperCase().trim();

    const existing = await User.findOne({
      $or: [{ email: emailLower }, { staffId: staffUpper }],
    });
    if (existing) {
      return res.status(409).json({
        message: "A user with that email or staff ID already exists",
      });
    }

    const lecturer = await User.create({
      name: name.trim(),
      email: emailLower,
      staffId: staffUpper,
      department,
      phone: phone?.trim() || null,
      role: "lecturer",
      isEmailVerified: false,
      isActive: true,
      createdBy: req.user.id,
    });

    await logAudit(req, "create", "user", lecturer._id, {
      role: "lecturer",
      email: lecturer.email,
    });

    return res.status(201).json({
      message: "Lecturer account created. They log in via OTP using their email.",
      user: sanitizeUser(lecturer),
    });
  } catch (err) {
    console.error("createLecturer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update basic user fields (name, phone, department, level)
// @route   PATCH /api/admin/users/:id
// @access  Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, phone, department, level } = req.body;

    if (name !== undefined) user.name = String(name).trim();
    if (phone !== undefined) user.phone = phone ? String(phone).trim() : null;
    if (department !== undefined) {
      const dept = await Department.findById(department);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      user.department = department;
    }
    if (level !== undefined) {
      if (![100, 200, 300, 400, 500].includes(Number(level))) {
        return res.status(400).json({ message: "Invalid level" });
      }
      user.level = Number(level);
    }

    await user.save();

    await logAudit(req, "update", "user", user._id, {
      fields: Object.keys(req.body),
    });

    return res.json({ message: "User updated", user: sanitizeUser(user) });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Activate / deactivate a user
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
export const setUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    if (String(req.params.id) === String(req.user.id) && !isActive) {
      return res.status(400).json({ message: "You cannot deactivate yourself" });
    }

    const update = { isActive };
    if (!isActive) update.$unset = { refreshTokenHash: 1 };

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    await logAudit(req, isActive ? "activate" : "deactivate", "user", user._id);

    return res.json({
      message: `User ${isActive ? "activated" : "deactivated"}`,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("setUserStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Hard delete a user (only if they have no results/enrollments)
// @route   DELETE /api/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const [resultCount, enrollmentCount] = await Promise.all([
      Result.countDocuments({ student: user._id }),
      Enrollment.countDocuments({ student: user._id }),
    ]);

    if (resultCount > 0 || enrollmentCount > 0) {
      return res.status(400).json({
        message:
          "User has results or enrollments. Deactivate instead, or remove those records first.",
      });
    }

    await User.deleteOne({ _id: user._id });
    await logAudit(req, "delete", "user", user._id, {
      email: user.email,
      role: user.role,
    });

    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   DEPARTMENTS
   ============================================================ */

// @desc    List departments
// @route   GET /api/admin/departments
// @access  Admin
export const listDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    return res.json({ departments });
  } catch (err) {
    console.error("listDepartments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create department
// @route   POST /api/admin/departments
// @access  Admin
export const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "name and code are required" });
    }

    const existing = await Department.findOne({
      $or: [{ name: name.trim() }, { code: code.toUpperCase().trim() }],
    });
    if (existing) {
      return res.status(409).json({ message: "Department already exists" });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
    });

    await logAudit(req, "create", "department", dept._id, { code: dept.code });

    return res.status(201).json({ message: "Department created", department: dept });
  } catch (err) {
    console.error("createDepartment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update department
// @route   PATCH /api/admin/departments/:id
// @access  Admin
export const updateDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    if (name !== undefined) dept.name = name.trim();
    if (code !== undefined) dept.code = code.toUpperCase().trim();

    await dept.save();
    await logAudit(req, "update", "department", dept._id);

    return res.json({ message: "Department updated", department: dept });
  } catch (err) {
    console.error("updateDepartment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete department (only if no users attached)
// @route   DELETE /api/admin/departments/:id
// @access  Admin
export const deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const userCount = await User.countDocuments({ department: dept._id });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Cannot delete — ${userCount} user(s) still belong to this department`,
      });
    }

    await Department.deleteOne({ _id: dept._id });
    await logAudit(req, "delete", "department", dept._id, { code: dept.code });

    return res.json({ message: "Department deleted" });
  } catch (err) {
    console.error("deleteDepartment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ROLE APPOINTMENTS
   ============================================================ */

// @desc    Appoint a student as course rep for a course offering
// @route   POST /api/admin/appointments/course-rep
// @access  Admin
export const appointCourseRep = async (req, res) => {
  try {
    const { userId, courseOfferingId } = req.body;
    if (!userId || !courseOfferingId) {
      return res.status(400).json({
        message: "userId and courseOfferingId are required",
      });
    }

    const [user, offering] = await Promise.all([
      User.findById(userId),
      CourseOffering.findById(courseOfferingId),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!offering)
      return res.status(404).json({ message: "Course offering not found" });

    if (user.role !== "student") {
      return res.status(400).json({ message: "Only students can be course reps" });
    }
    if (
      String(user.department) !== String(offering.department) ||
      user.level !== offering.level
    ) {
      return res.status(400).json({
        message: "Student is not in the offering's department/level",
      });
    }

    const existing = await CourseRep.findOne({
      user: userId,
      offering: courseOfferingId,
      isActive: true,
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Already a course rep for this offering" });
    }

    const rep = await CourseRep.create({
      user: userId,
      offering: courseOfferingId,
      assignedBy: req.user.id,
    });

    if (!user.extraRoles.includes("course_rep")) {
      user.extraRoles.push("course_rep");
      await user.save();
    }

    await logAudit(req, "appoint", "course_rep", rep._id, {
      userId,
      offering: courseOfferingId,
    });

    return res
      .status(201)
      .json({ message: "Course rep appointed", courseRep: rep });
  } catch (err) {
    console.error("appointCourseRep error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Revoke a course rep
// @route   DELETE /api/admin/appointments/course-rep/:id
// @access  Admin
export const revokeCourseRep = async (req, res) => {
  try {
    const rep = await CourseRep.findById(req.params.id);
    if (!rep) return res.status(404).json({ message: "Appointment not found" });

    const userId = rep.user;
    await CourseRep.deleteOne({ _id: rep._id });

    const others = await CourseRep.countDocuments({ user: userId });
    if (others === 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { extraRoles: "course_rep" },
      });
    }

    await logAudit(req, "revoke", "course_rep", rep._id, { userId });

    return res.json({ message: "Course rep revoked" });
  } catch (err) {
    console.error("revokeCourseRep error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Appoint a student admin for department + level(s)
// @route   POST /api/admin/appointments/student-admin
// @access  Admin
export const appointStudentAdmin = async (req, res) => {
  try {
    const { userId, departmentId, levels } = req.body;

    if (!userId || !departmentId || !Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({
        message: "userId, departmentId and levels[] are required",
      });
    }
    if (!levels.every((l) => [100, 200, 300, 400, 500].includes(Number(l)))) {
      return res.status(400).json({ message: "Invalid level in levels[]" });
    }

    const [user, dept] = await Promise.all([
      User.findById(userId),
      Department.findById(departmentId),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!dept) return res.status(404).json({ message: "Department not found" });

    if (!user.extraRoles.includes("student_admin")) {
      user.extraRoles.push("student_admin");
    }

    const existingLevels = new Set(user.scope?.levels || []);
    levels.forEach((l) => existingLevels.add(Number(l)));
    user.scope.levels = Array.from(existingLevels);

    const existingDepts = new Set((user.scope?.departments || []).map(String));
    existingDepts.add(String(departmentId));
    user.scope.departments = Array.from(existingDepts);

    await user.save();

    await logAudit(req, "appoint", "student_admin", user._id, {
      departmentId,
      levels,
    });

    return res.json({
      message: "Student admin appointed",
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("appointStudentAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove a student admin role entirely
// @route   DELETE /api/admin/appointments/student-admin/:userId
// @access  Admin
export const revokeStudentAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.extraRoles = user.extraRoles.filter((r) => r !== "student_admin");
    user.scope.levels = [];
    user.scope.departments = [];
    await user.save();

    await logAudit(req, "revoke", "student_admin", user._id);

    return res.json({
      message: "Student admin revoked",
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("revokeStudentAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Appoint an HOD for a department
// @route   POST /api/admin/appointments/hod
// @access  Admin
export const appointHod = async (req, res) => {
  try {
    const { userId, departmentId } = req.body;
    if (!userId || !departmentId) {
      return res
        .status(400)
        .json({ message: "userId and departmentId are required" });
    }

    const [user, dept] = await Promise.all([
      User.findById(userId),
      Department.findById(departmentId),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!dept) return res.status(404).json({ message: "Department not found" });

    if (user.role !== "lecturer") {
      return res
        .status(400)
        .json({ message: "Only lecturers can be appointed as HOD" });
    }

    // Only one active HOD per department
    const existingHod = await User.findOne({
      extraRoles: "hod",
      "scope.departments": departmentId,
      _id: { $ne: user._id },
    });
    if (existingHod) {
      return res.status(409).json({
        message: `Department already has an HOD (${existingHod.name}). Revoke first.`,
      });
    }

    if (!user.extraRoles.includes("hod")) {
      user.extraRoles.push("hod");
    }
    const existingDepts = new Set((user.scope?.departments || []).map(String));
    existingDepts.add(String(departmentId));
    user.scope.departments = Array.from(existingDepts);

    await user.save();

    await logAudit(req, "appoint", "hod", user._id, { departmentId });

    return res.json({ message: "HOD appointed", user: sanitizeUser(user) });
  } catch (err) {
    console.error("appointHod error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Revoke HOD
// @route   DELETE /api/admin/appointments/hod/:userId
// @access  Admin
export const revokeHod = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.extraRoles = user.extraRoles.filter((r) => r !== "hod");
    await user.save();

    await logAudit(req, "revoke", "hod", user._id);

    return res.json({ message: "HOD revoked", user: sanitizeUser(user) });
  } catch (err) {
    console.error("revokeHod error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   TEAMS  (admin-appointed course helpers)
   ============================================================ */

// @desc    Create a team
// @route   POST /api/admin/teams
// @access  Admin
export const createTeam = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ message: "Team name is required" });

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || "",
      permissions: Array.isArray(permissions) ? permissions : [],
      createdBy: req.user.id,
    });

    await logAudit(req, "create", "team", team._id, { name: team.name });

    return res.status(201).json({ message: "Team created", team });
  } catch (err) {
    console.error("createTeam error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List teams
// @route   GET /api/admin/teams
// @access  Admin
export const listTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("members", "name email role")
      .sort({ createdAt: -1 });
    return res.json({ teams });
  } catch (err) {
    console.error("listTeams error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add member to team (also sets extraRole on user)
// @route   POST /api/admin/teams/:id/members
// @access  Admin
export const addTeamMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const [team, user] = await Promise.all([
      Team.findById(req.params.id),
      User.findById(userId),
    ]);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!team.members.map(String).includes(String(userId))) {
      team.members.push(userId);
      await team.save();
    }

    if (!user.extraRoles.includes("team_member")) {
      user.extraRoles.push("team_member");
      await user.save();
    }

    await logAudit(req, "add_member", "team", team._id, { userId });

    return res.json({ message: "Member added", team });
  } catch (err) {
    console.error("addTeamMember error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove member from team
// @route   DELETE /api/admin/teams/:id/members/:userId
// @access  Admin
export const removeTeamMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.members = team.members.filter((m) => String(m) !== String(userId));
    await team.save();

    // Remove team_member flag if no other team
    const remaining = await Team.countDocuments({ members: userId });
    if (remaining === 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { extraRoles: "team_member" },
      });
    }

    await logAudit(req, "remove_member", "team", team._id, { userId });

    return res.json({ message: "Member removed", team });
  } catch (err) {
    console.error("removeTeamMember error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a team
// @route   DELETE /api/admin/teams/:id
// @access  Admin
export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const memberIds = team.members;
    await Team.deleteOne({ _id: team._id });

    // Remove flags for members not in another team
    for (const mId of memberIds) {
      const inOther = await Team.countDocuments({ members: mId });
      if (inOther === 0) {
        await User.findByIdAndUpdate(mId, {
          $pull: { extraRoles: "team_member" },
        });
      }
    }

    await logAudit(req, "delete", "team", team._id, { name: team.name });

    return res.json({ message: "Team deleted" });
  } catch (err) {
    console.error("deleteTeam error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   SETTINGS
   ============================================================ */

// @desc    Get current platform settings
// @route   GET /api/admin/settings
// @access  Admin
export const getSettings = async (_req, res) => {
  try {
    const settings = await getSettingsDoc();
    return res.json({ settings });
  } catch (err) {
    console.error("getSettings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update platform settings
// @route   PATCH /api/admin/settings
// @access  Admin
export const updateSettings = async (req, res) => {
  try {
    const allowed = [
      "allowStudentResultUpload",
      "onlyHodOrLecturerUploads",
      "allowCourseRepMaterialUpload",
      "allowStudentQuizGeneration",
      "currentSession",
      "currentSemester",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    let settings = await getSettingsDoc();
    Object.assign(settings, updates);
    await settings.save();

    await logAudit(req, "update", "settings", settings._id, {
      changed: Object.keys(updates),
    });

    return res.json({ message: "Settings updated", settings });
  } catch (err) {
    console.error("updateSettings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ACADEMIC SESSIONS & PROMOTION
   ============================================================ */

// @desc    Create an academic session
// @route   POST /api/admin/sessions
// @access  Admin
export const createSession = async (req, res) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;
    if (!name || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "name, startDate and endDate are required" });
    }

    if (isCurrent) {
      await AcademicSession.updateMany({}, { isCurrent: false });
    }

    const session = await AcademicSession.create({
      name: name.trim(), // e.g. "2025/2026"
      startDate,
      endDate,
      isCurrent: !!isCurrent,
    });

    await logAudit(req, "create", "session", session._id, { name: session.name });

    return res.status(201).json({ message: "Session created", session });
  } catch (err) {
    console.error("createSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    List all sessions
// @route   GET /api/admin/sessions
// @access  Admin
export const listSessions = async (_req, res) => {
  try {
    const sessions = await AcademicSession.find().sort({ startDate: -1 });
    return res.json({ sessions });
  } catch (err) {
    console.error("listSessions error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Set current session
// @route   PATCH /api/admin/sessions/:id/current
// @access  Admin
export const setCurrentSession = async (req, res) => {
  try {
    const session = await AcademicSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    await AcademicSession.updateMany({}, { isCurrent: false });
    session.isCurrent = true;
    await session.save();

    await logAudit(req, "set_current", "session", session._id);

    return res.json({ message: "Current session set", session });
  } catch (err) {
    console.error("setCurrentSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Promote students to next level (whole dept or specific levels)
// @route   POST /api/admin/promotions
// @access  Admin
export const promoteStudents = async (req, res) => {
  try {
    const { departmentId, fromLevel, toLevel } = req.body;

    if (!fromLevel || !toLevel) {
      return res
        .status(400)
        .json({ message: "fromLevel and toLevel are required" });
    }

    const validLevels = [100, 200, 300, 400];
    if (!validLevels.includes(Number(fromLevel)) || ![200, 300, 400, 500].includes(Number(toLevel))) {
      return res.status(400).json({ message: "Invalid level transition" });
    }

    const filter = { role: "student", level: Number(fromLevel) };
    if (departmentId) filter.department = departmentId;

    const result = await User.updateMany(filter, { $set: { level: Number(toLevel) } });

    await logAudit(req, "promote", "user", null, {
      departmentId: departmentId || "all",
      fromLevel,
      toLevel,
      count: result.modifiedCount,
    });

    return res.json({
      message: `Promoted ${result.modifiedCount} student(s)`,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error("promoteStudents error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   AUDIT LOGS
   ============================================================ */

// @desc    View audit logs
// @route   GET /api/admin/audit-logs
// @access  Admin
export const listAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { actor, action, resource } = req.query;

    const filter = {};
    if (actor) filter.actor = actor;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      logs,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("listAuditLogs error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};