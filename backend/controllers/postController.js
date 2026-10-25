// controllers/postController.js
/**
 * Required models (create these separately):
 *
 * ── models/postLinkModel.js ────────────────────────────────────
 *   owner:        { type: ObjectId, ref: "User", required: true, unique: true }
 *   token:        { type: String, required: true, unique: true, index: true }
 *   isActive:     { type: Boolean, default: true }
 *   regeneratedAt:{ type: Date, default: null }
 *   timestamps:   true
 *
 * ── models/postModel.js ────────────────────────────────────────
 *   owner:     { type: ObjectId, ref: "User", required: true, index: true }
 *   link:      { type: ObjectId, ref: "PostLink", required: true, index: true }
 *   content:   { type: String, default: "", maxlength: 1000 }
 *   images:    [{ url: String, publicId: String }]
 *   sender:    { type: ObjectId, ref: "User", default: null } // null = guest
 *   senderIp:  { type: String, default: null }
 *   isDeleted: { type: Boolean, default: false, index: true }
 *   deletedAt: { type: Date, default: null }
 *   deletedBy: { type: ObjectId, ref: "User", default: null }
 *   timestamps: true
 */

import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import PostLink from "../models/postLinkModel.js";
import Post from "../models/postModel.js";
import User from "../models/userModel.js";

/* ---------- cloudinary helpers (same pattern as authController) ---------- */
const uploadBufferToCloudinary = (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image", ...options },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
    return null;
  }
};

/* ---------- constants ---------- */
const MAX_IMAGES_PER_POST = 2;
const MAX_CONTENT_LENGTH = 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image

/* ---------- helpers ---------- */
const generateLinkToken = () => crypto.randomBytes(9).toString("base64url");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
};

const buildPublicLink = (token) => {
  const base =
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:2000";
  return `${base.replace(/\/+$/, "")}/drop/${token}`;
};

const getOrCreateLinkForUser = async (userId) => {
  let link = await PostLink.findOne({ owner: userId });
  if (!link) {
    link = await PostLink.create({
      owner: userId,
      token: generateLinkToken(),
      isActive: true,
    });
  }
  return link;
};

/* ---------- serializers ---------- */
// What the link OWNER sees — anonymous, no sender identity
const serializePostForOwner = (post) => ({
  id: post._id,
  content: post.content || "",
  images: (post.images || []).map((img) => ({ url: img.url })),
  senderType: post.sender ? "user" : "guest",
  isDeleted: post.isDeleted,
  createdAt: post.createdAt,
});

// What ADMIN sees — full identity + IP
const serializePostForAdmin = (post) => ({
  id: post._id,
  content: post.content || "",
  images: (post.images || []).map((img) => ({ url: img.url })),
  owner: post.owner
    ? {
        id: post.owner._id,
        name: post.owner.name,
        email: post.owner.email,
        matricNumber: post.owner.matricNumber || null,
      }
    : null,
  sender: post.sender
    ? {
        id: post.sender._id,
        name: post.sender.name,
        email: post.sender.email,
        matricNumber: post.sender.matricNumber || null,
      }
    : null,
  senderIp: post.senderIp || null,
  isDeleted: post.isDeleted,
  deletedAt: post.deletedAt || null,
  createdAt: post.createdAt,
});

/* ============================================================
   LINK MANAGEMENT (authenticated user)
   ============================================================ */

export const getMyLink = async (req, res) => {
  try {
    const link = await getOrCreateLinkForUser(req.user.id);
    const postCount = await Post.countDocuments({
      owner: req.user.id,
      isDeleted: false,
    });

    return res.json({
      token: link.token,
      url: buildPublicLink(link.token),
      isActive: link.isActive,
      postCount,
      regeneratedAt: link.regeneratedAt || null,
      createdAt: link.createdAt,
    });
  } catch (err) {
    console.error("getMyLink error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const regenerateMyLink = async (req, res) => {
  try {
    let link = await PostLink.findOne({ owner: req.user.id });
    if (!link) {
      link = new PostLink({
        owner: req.user.id,
        token: generateLinkToken(),
        isActive: true,
      });
    } else {
      // Replacing the token instantly kills the old link
      link.token = generateLinkToken();
      link.regeneratedAt = new Date();
      link.isActive = true;
    }
    await link.save();

    return res.json({
      message:
        "Link regenerated. The old link can no longer receive new posts.",
      token: link.token,
      url: buildPublicLink(link.token),
    });
  } catch (err) {
    console.error("regenerateMyLink error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   PUBLIC: link info + submit post
   ============================================================ */

// GET /api/posts/link/:token  — tells the public drop page who they're posting to
export const getPublicLinkInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const link = await PostLink.findOne({ token }).populate(
      "owner",
      "name profilePicture"
    );

    if (!link)
      return res
        .status(404)
        .json({ message: "This link is invalid or no longer exists" });
    if (!link.isActive)
      return res.status(410).json({ message: "This link has been disabled" });

    return res.json({
      owner: {
        name: link.owner?.name || "User",
        profilePicture: link.owner?.profilePicture || null,
      },
      acceptsImages: true,
      maxImages: MAX_IMAGES_PER_POST,
    });
  } catch (err) {
    console.error("getPublicLinkInfo error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/posts/link/:token  — public submission endpoint
// IMPORTANT: this route must use an "optionalAuth" middleware so that
// `req.user` is set when the submitter is logged in, and undefined otherwise.
// Multer: upload.array("images", 2)
export const submitPost = async (req, res) => {
  const uploaded = [];
  try {
    const { token } = req.params;
    const { content } = req.body;
    const files = req.files || [];

    const link = await PostLink.findOne({ token });
    if (!link)
      return res
        .status(404)
        .json({ message: "This link is invalid or no longer exists" });
    if (!link.isActive)
      return res.status(410).json({ message: "This link has been disabled" });

    /* ---- validate payload ---- */
    const trimmed = String(content || "").trim();

    if (!trimmed && files.length === 0) {
      return res
        .status(400)
        .json({ message: "Write something or attach at least one image" });
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        message: `Message cannot exceed ${MAX_CONTENT_LENGTH} characters`,
      });
    }
    if (files.length > MAX_IMAGES_PER_POST) {
      return res.status(400).json({
        message: `You can attach at most ${MAX_IMAGES_PER_POST} images`,
      });
    }
    for (const f of files) {
      if (!f.mimetype || !f.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ message: "Only image files are allowed" });
      }
      if (f.size > MAX_IMAGE_BYTES) {
        return res
          .status(400)
          .json({ message: "Each image must be 5MB or smaller" });
      }
    }

    /* ---- upload images ---- */
    try {
      for (const f of files) {
        const result = await uploadBufferToCloudinary(
          f.buffer,
          "school_portal/post_images"
        );
        uploaded.push({ url: result.secure_url, publicId: result.public_id });
      }
    } catch (uploadErr) {
      // rollback any partial uploads
      for (const u of uploaded) await deleteFromCloudinary(u.publicId);
      throw uploadErr;
    }

    /* ---- create the post ---- */
    const senderId = req.user?.id || null;
    const senderIp = getClientIp(req);

    const post = await Post.create({
      owner: link.owner,
      link: link._id,
      content: trimmed,
      images: uploaded,
      sender: senderId,
      senderIp,
      isDeleted: false,
    });

    return res.status(201).json({
      message: "Your message was sent 💌",
      postId: post._id,
    });
  } catch (err) {
    console.error("submitPost error:", err);
    // If something exploded after uploads succeeded, clean up to avoid orphans
    for (const u of uploaded) await deleteFromCloudinary(u.publicId);
    return res.status(500).json({ message: "Failed to send your message" });
  }
};

/* ============================================================
   LINK OWNER — read & soft-delete own posts
   ============================================================ */

export const getMyPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const status = String(req.query.status || "active").toLowerCase();

    const filter = { owner: req.user.id };
    if (status === "active") filter.isDeleted = false;
    else if (status === "deleted") filter.isDeleted = true;
    // status === "all" → no isDeleted filter

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    return res.json({
      posts: posts.map(serializePostForOwner),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getMyPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteMyPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (String(post.owner) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ message: "You can only delete posts sent to your link" });
    }
    if (post.isDeleted) {
      return res.json({ message: "Post is already deleted" });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user.id;
    await post.save();

    return res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("deleteMyPost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ADMIN — everything
   ============================================================ */

// GET /api/admin/posts
//   ?status=active|deleted|all   (default: active)
//   ?ownerId=<userId>
//   ?search=<text or ip>
//   ?page & limit
export const adminGetAllPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const status = String(req.query.status || "active").toLowerCase();
    const { ownerId, search } = req.query;

    const filter = {};
    if (status === "active") filter.isDeleted = false;
    else if (status === "deleted") filter.isDeleted = true;

    if (ownerId) filter.owner = ownerId;

    if (search) {
      const rx = { $regex: String(search), $options: "i" };
      filter.$or = [{ content: rx }, { senderIp: rx }];
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("owner", "name email matricNumber")
        .populate("sender", "name email matricNumber")
        .lean(),
      Post.countDocuments(filter),
    ]);

    return res.json({
      posts: posts.map(serializePostForAdmin),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("adminGetAllPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/post-links
//   ?search=<name/email/matric>
//   ?onlyWithLinks=true
//   ?page & limit
export const adminGetUsersWithPostStats = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const onlyWithLinks = String(req.query.onlyWithLinks) === "true";
    const { search } = req.query;

    const userFilter = {};
    if (search) {
      const rx = { $regex: String(search), $options: "i" };
      userFilter.$or = [
        { name: rx },
        { email: rx },
        { matricNumber: rx },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(userFilter)
        .select(
          "name email matricNumber role profilePicture isActive createdAt"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(userFilter),
    ]);

    const userIds = users.map((u) => u._id);

    const links = await PostLink.find({ owner: { $in: userIds } }).lean();
    const linkByOwner = {};
    const linkIds = [];
    for (const l of links) {
      linkByOwner[String(l.owner)] = l;
      linkIds.push(l._id);
    }

    const counts =
      linkIds.length === 0
        ? []
        : await Post.aggregate([
            { $match: { link: { $in: linkIds }, isDeleted: false } },
            { $group: { _id: "$link", count: { $sum: 1 } } },
          ]);
    const countByLink = {};
    for (const c of counts) countByLink[String(c._id)] = c.count;

    let result = users.map((u) => {
      const link = linkByOwner[String(u._id)];
      return {
        user: {
          id: u._id,
          name: u.name,
          email: u.email,
          matricNumber: u.matricNumber || null,
          role: u.role,
          profilePicture: u.profilePicture || null,
          isActive: u.isActive,
          createdAt: u.createdAt,
        },
        hasLink: !!link,
        linkToken: link?.token || null,
        linkActive: link?.isActive || false,
        postCount: link ? countByLink[String(link._id)] || 0 : 0,
      };
    });

    if (onlyWithLinks) result = result.filter((r) => r.hasLink);

    return res.json({
      users: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("adminGetUsersWithPostStats error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminDeletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.isDeleted) {
      return res.json({ message: "Post is already deleted" });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user.id;
    await post.save();

    return res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("adminDeletePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};