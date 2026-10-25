// models/postLinkModel.js
import mongoose from "mongoose";

const postLinkSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one link per user
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    regeneratedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const PostLink = mongoose.model("PostLink", postLinkSchema);

export default PostLink;