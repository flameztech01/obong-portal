// Middleware/roleMiddleware.js

/* ============================================================
   HELPERS
   ============================================================ */

const deny = (res, message = "Forbidden") =>
  res.status(403).json({ message });

const hasExtra = (user, role) =>
  Array.isArray(user?.extraRoles) && user.extraRoles.includes(role);

/* ============================================================
   BASE ROLE GATES  (used after `protect`)
   ============================================================ */

/**
 * Admin only. Runs after `protect`.
 * Usage: router.use(protect, requireAdmin);
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "admin") return deny(res, "Admin access required");
  next();
};

/**
 * Lecturer OR Admin. Use for actions both staff roles can perform.
 */
export const requireLecturer = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!["lecturer", "admin"].includes(req.user.role)) {
    return deny(res, "Lecturer access required");
  }
  next();
};

/**
 * Admin OR HOD (a lecturer with extraRole "hod").
 */
export const requireAdminOrHod = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const ok = req.user.role === "admin" || hasExtra(req.user, "hod");
  if (!ok) return deny(res, "Admin or HOD access required");
  next();
};

/**
 * Student only.
 */
export const requireStudent = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "student") return deny(res, "Student access required");
  next();
};

/**
 * Generic — pass any of "student" | "lecturer" | "admin".
 * Usage: router.post("/x", protect, requireRole("lecturer", "admin"), handler);
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!roles.includes(req.user.role)) return deny(res, "Insufficient role");
  next();
};

/**
 * Requires at least one of the given extraRoles.
 * Usage: requireExtraRole("hod") or requireExtraRole("student_admin", "team_member")
 */
export const requireExtraRole = (...extraRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  // Admin bypasses — admins can do anything
  if (req.user.role === "admin") return next();

  const userExtra = req.user.extraRoles || [];
  const ok = extraRoles.some((r) => userExtra.includes(r));
  if (!ok) return deny(res, `Requires role: ${extraRoles.join(" or ")}`);
  next();
};

/* ============================================================
   STATE GATES
   ============================================================ */

/**
 * Blocks unverified email. Use on any write action that should
 * require a verified account (results, uploads, etc).
 */
export const requireVerified = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      message: "Please verify your email before performing this action",
    });
  }
  next();
};

/* ============================================================
   SCOPED CHECKS  (department + level)
   ============================================================ */

/**
 * Admin OR (student_admin/team_member whose scope covers dept+level).
 * Reads `departmentId` and `level` from req.body.
 *
 * Use on catalog management routes (POST /api/academic/courses).
 */
export const requireCatalogScope = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role === "admin") return next();

  const hasScopedRole =
    hasExtra(req.user, "student_admin") || hasExtra(req.user, "team_member");
  if (!hasScopedRole) {
    return deny(res, "Only admin, student admin or team member can do this");
  }

  const departmentId = req.body.departmentId || req.body.department;
  const level = req.body.level;

  if (!departmentId || level == null) {
    return res.status(400).json({
      message: "department (or departmentId) and level are required in body",
    });
  }

  if (typeof req.user.canManageLevel === "function") {
    if (!req.user.canManageLevel(departmentId, level)) {
      return deny(
        res,
        "Your scope does not include this department/level"
      );
    }
  } else {
    // Fallback if method missing
    const levels = (req.user.scope?.levels || []).map(Number);
    const depts = (req.user.scope?.departments || []).map(String);
    if (!levels.includes(Number(level)) || !depts.includes(String(departmentId))) {
      return deny(res, "Your scope does not include this department/level");
    }
  }

  next();
};

/**
 * Admin OR HOD of the department referenced in `req.params.departmentId`
 * or `req.body.departmentId`.
 */
export const requireHodOfDepartment = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role === "admin") return next();
  if (!hasExtra(req.user, "hod")) return deny(res, "HOD access required");

  const departmentId =
    req.params.departmentId || req.body.departmentId || req.body.department;
  if (!departmentId) {
    return res.status(400).json({ message: "departmentId is required" });
  }

  const depts = (req.user.scope?.departments || []).map(String);
  if (!depts.includes(String(departmentId))) {
    return deny(res, "You are not HOD of this department");
  }
  next();
};

/* ============================================================
   RESOURCE-OWNERSHIP GATES
   ============================================================ */

/**
 * Allows the request only if the authenticated user IS the resource owner
 * (checked against a URL param) OR is an admin.
 *
 * Usage:
 *   router.get(
 *     "/users/:userId/results",
 *     protect,
 *     requireSelfOrAdmin("userId"),
 *     handler
 *   );
 */
export const requireSelfOrAdmin =
  (paramName = "userId") =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin") return next();

    const target = req.params[paramName];
    if (!target) {
      return res.status(400).json({ message: `${paramName} missing from params` });
    }

    if (String(req.user._id) !== String(target)) {
      return deny(res, "You can only access your own resources");
    }
    next();
  };

/**
 * Allows the request if the user has the given extraRole for the offering
 * referenced in `req.params.offeringId` (or req.body.offeringId). Also
 * lets admin and the offering's assigned lecturer through.
 *
 * NOTE: this reads `CourseRep` from DB, so it's async. For most controllers
 * we already resolve this in the handler (`userCanManageOffering`), so
 * use this only when you want a hard gate before hitting the controller.
 */
export const requireOfferingManager = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role === "admin") return next();

    const offeringId =
      req.params.offeringId || req.body.offeringId || req.query.offeringId;
    if (!offeringId) {
      return res.status(400).json({ message: "offeringId is required" });
    }

    // Lazy imports so this file stays free of hard cyc dependencies
    const { default: CourseOffering } = await import(
      "../models/courseOfferingModel.js"
    );
    const { default: CourseRep } = await import(
      "../models/courseRepModel.js"
    );

    const offering = await CourseOffering.findById(offeringId);
    if (!offering) return res.status(404).json({ message: "Offering not found" });

    // Assigned lecturer
    if (
      req.user.role === "lecturer" &&
      String(offering.lecturer) === String(req.user._id)
    ) {
      return next();
    }

    // HOD of that department
    if (
      hasExtra(req.user, "hod") &&
      (req.user.scope?.departments || [])
        .map(String)
        .includes(String(offering.department))
    ) {
      return next();
    }

    // Course rep for this offering
    if (hasExtra(req.user, "course_rep")) {
      const rep = await CourseRep.findOne({
        user: req.user._id,
        offering: offering._id,
        isActive: true,
      });
      if (rep) return next();
    }

    return deny(
      res,
      "Only admin, assigned lecturer, HOD or course rep can do this"
    );
  } catch (err) {
    console.error("requireOfferingManager error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};