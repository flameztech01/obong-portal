// models/postModel.js
import mongoose from "mongoose";

const postImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    // The user who owns the link this post was sent through
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The specific PostLink (token generation) the post belongs to.
    // Kept separate from `owner` so we can still trace which
    // link-instance received it even after regenerations.
    link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostLink",
      required: true,
      index: true,
    },

    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    images: {
      type: [postImageSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 2,
        message: "A post can contain at most 2 images",
      },
    },

    // Logged-in sender (null for guests)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Captured for both logged-in and guest senders (abuse handling)
    senderIp: {
      type: String,
      default: null,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookup for "my posts" and admin feeds
postSchema.index({ owner: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ link: 1, isDeleted: 1 });

const Post = mongoose.model("Post", postSchema);

export default Post;