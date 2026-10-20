// models/userModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const LEVELS = [100, 200, 300, 400, 500];
const ROLES = ["student", "lecturer", "admin"];
const EXTRA_ROLES = ["course_rep", "student_admin", "hod", "team_member"];

const userSchema = new Schema(
  {
    /* ============================================================
       IDENTITY
       ============================================================ */
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be at most 80 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    // Students only — used as OTP login identifier
    matricNumber: {
      type: String,
      uppercase: true,
      trim: true,
      required: function () {
        return this.role === "student";
      },
    },

    // Lecturers only — assigned by admin when creating lecturer account
    staffId: {
      type: String,
      uppercase: true,
      trim: true,
      required: function () {
        return this.role === "lecturer";
      },
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    profilePicturePublicId: {
      type: String,
      default: null,
      select: false, // only loaded when explicitly .select("+profilePicturePublicId")
    },

    /* ============================================================
       ACADEMIC
       ============================================================ */
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      index: true,
      required: function () {
        // Admin without student_admin designation doesn't need a department
        if (this.role === "admin" && !this.extraRoles?.includes("student_admin")) {
          return false;
        }
        return true;
      },
    },

    level: {
      type: Number,
      enum: {
        values: LEVELS,
        message: "Level must be 100, 200, 300, 400 or 500",
      },
      index: true,
      required: function () {
        return this.role === "student";
      },
    },

    /* ============================================================
       ROLES & SCOPE
       ============================================================ */
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: "Role must be student, lecturer or admin",
      },
      default: "student",
      index: true,
    },

    // Scoped designations that sit on top of the base role.
    // e.g. a student can be a course_rep; a lecturer can be an hod.
    extraRoles: {
      type: [String],
      enum: {
        values: EXTRA_ROLES,
        message: "Invalid extra role",
      },
      default: [],
    },

    // Scope for student_admin / course_rep / team_member:
    // which levels and departments they're allowed to manage.
    scope: {
      levels: { type: [Number], default: [] },
      departments: {
        type: [{ type: Schema.Types.ObjectId, ref: "Department" }],
        default: [],
      },
    },

    /* ============================================================
       AUTH STATE
       ============================================================ */
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // One active session per user.
    refreshTokenHash: {
      type: String,
      select: false,
    },

    /* ============================================================
       OTP (login + signup + forgot-password use the same fields)
       ============================================================ */
    otpHash: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpLastSentAt: {
      type: Date,
    },

    /* ============================================================
       STUDENT FLOW
       ============================================================ */
    hasUploadedHistoricalResults: {
      type: Boolean,
      default: false,
    },

    /* ============================================================
       TRANSFER STUDENT INFO
       ============================================================ */
    isTransferStudent: {
      type: Boolean,
      default: false,
    },
    
    // CGPA carried over from the previous institution
    transferCgpa: {
      type: Number,
      default: null,
      min: 0,
      max: 5, // Assuming 5.0 scale
    },
    
    // Total credit units carried over from the previous institution
    transferCredits: {
      type: Number,
      default: null,
      min: 0,
    },

    /* ============================================================
       AUDITING
       ============================================================ */
    lastLoginAt: {
      type: Date,
      default: null,
    },

    // Which admin created this account (for lecturer/admin accounts)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.otpHash;
        delete ret.otpExpiresAt;
        delete ret.otpAttempts;
        delete ret.otpLastSentAt;
        delete ret.refreshTokenHash;
        delete ret.profilePicturePublicId;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ============================================================
   INDEXES
   ============================================================ */

// email is unique via field-level unique: true

// matricNumber & staffId: unique only when they exist (partial index)
userSchema.index(
  { matricNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { matricNumber: { $type: "string" } },
  }
);

userSchema.index(
  { staffId: 1 },
  {
    unique: true,
    partialFilterExpression: { staffId: { $type: "string" } },
  }
);

// Common queries
userSchema.index({ department: 1, level: 1 }); 
userSchema.index({ role: 1, isActive: 1 });    

/* ============================================================
   VIRTUALS
   ============================================================ */
userSchema.virtual("isStudent").get(function () {
  return this.role === "student";
});

userSchema.virtual("isLecturer").get(function () {
  return this.role === "lecturer";
});

userSchema.virtual("isAdmin").get(function () {
  return this.role === "admin";
});

/* ============================================================
   METHODS
   ============================================================ */

/** true if base role matches OR if it's in extraRoles */
userSchema.methods.hasRole = function (role) {
  if (this.role === role) return true;
  return this.extraRoles?.includes(role) ?? false;
};

/** Used by middleware to check scoped permissions like student_admin */
userSchema.methods.canManageLevel = function (departmentId, level) {
  if (this.role === "admin") return true;
  const levels = this.scope?.levels || [];
  const depts = (this.scope?.departments || []).map(String);
  return levels.includes(Number(level)) && depts.includes(String(departmentId));
};

/* ============================================================
   HOOKS
   ============================================================ */
userSchema.pre("save", function () {
  if (this.isModified("email") && this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.isModified("matricNumber") && this.matricNumber) {
    this.matricNumber = this.matricNumber.toUpperCase().trim();
  }
  if (this.isModified("staffId") && this.staffId) {
    this.staffId = this.staffId.toUpperCase().trim();
  }
});

/* ============================================================
   STATICS
   ============================================================ */

/** Used by authController.findUserByIdentifier */
userSchema.statics.findByEmailOrMatric = function (identifier) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  return this.findOne({
    $or: [{ email: raw.toLowerCase() }, { matricNumber: raw.toUpperCase() }],
  });
};

const User = model("User", userSchema);
export default User;