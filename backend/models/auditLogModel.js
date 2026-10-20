// models/auditLogModel.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const auditLogSchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorRole: { type: String, default: null },
    action: { type: String, required: true, index: true }, // create/update/delete/publish...
    resource: { type: String, required: true, index: true }, // user/department/result...
    resourceId: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Query common filters fast
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// TTL — auto-delete after 180 days (optional). Remove if you want to keep forever.
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 }
);

export default model("AuditLog", auditLogSchema);