// routes/authRoutes.js
import express from "express";
import {
  signup, login, resendOtp, verifyOtp, logout, getMe,
  updateProfilePicture, deleteProfilePicture, deleteAccount
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/signup", signup);
router.post("/login", login);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout); // <-- Only one logout now
router.put("/profile-picture", protect, upload.fields([{ name: "profilePicture", maxCount: 1 }]), updateProfilePicture);
router.delete("/profile-picture", protect, deleteProfilePicture);
router.delete("/account", protect, deleteAccount);

export default router;