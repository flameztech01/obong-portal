// routes/postRoutes.js
import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { protect } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/roleMiddleware.js";
import User from "../models/userModel.js";
import {
  getMyLink,
  regenerateMyLink,
  getPublicLinkInfo,
  submitPost,
  getMyPosts,
  deleteMyPost,
  adminGetAllPosts,
  adminGetUsersWithPostStats,
  adminDeletePost,
} from "../controllers/postController.js";

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
});

/* ============================================================
   INLINE: set req.user IF a valid token exists, else continue
   (never rejects — guests are allowed through)
   ============================================================ */
const optionalAuth = async (req, _res, next) => {
  try {
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id).select(
      "_id role isActive"
    );

    if (user && user.isActive) {
      req.user = { id: user._id, role: user.role };
    }
  } catch {
    /* invalid/expired token → treat as guest */
  }
  return next();
};

/* ============================================================
   PUBLIC
   ============================================================ */
router.get("/link/:token", getPublicLinkInfo);

router.post(
  "/link/:token",
  optionalAuth,
  upload.array("images", 2),
  submitPost
);

/* ============================================================
   LINK OWNER
   ============================================================ */
router.get("/my-link", protect, getMyLink);
router.post("/my-link/regenerate", protect, regenerateMyLink);

router.get("/my-posts", protect, getMyPosts);
router.delete("/my-posts/:postId", protect, deleteMyPost);

/* ============================================================
   ADMIN
   ============================================================ */
router.get("/admin/posts", protect, requireAdmin, adminGetAllPosts);
router.get(
  "/admin/post-links",
  protect,
  requireAdmin,
  adminGetUsersWithPostStats
);
router.delete(
  "/admin/posts/:postId",
  protect,
  requireAdmin,
  adminDeletePost
);

export default router;