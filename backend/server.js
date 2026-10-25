import "./config.js"; // 🚨 MUST BE FIRST! Loads env & configures Cloudinary

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import academicRoutes from "./routes/academicRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import postRoutes from "./routes/postRoutes.js"; 

import PostLink from "./models/postLinkModel.js"; // 👈 Needed for OG tags
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myapp';

// Middleware
const allowedOrigins = [
  'http://localhost:2000',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://obongportal.curriumx.online',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`❌ CORS blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Xavix Obong API is running 🚀");
});

// ============================================================
// OG / LINK PREVIEW FOR /drop/:token
// ============================================================
const CRAWLER_RE = /(whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|embedly|quora link preview|showyoubot|outbrain|pinterest|vkShare|W3C_Validator|redditbot|applebot|googlebot|bingbot|yandex|duckduckbot|skypeuripreview)/i;

const escapeHtml = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

app.get("/drop/:token", async (req, res, next) => {
  const ua = req.headers["user-agent"] || "";
  const isCrawler = CRAWLER_RE.test(ua);

  // If it's a real human, let it pass through (React app will handle it)
  if (!isCrawler) return next();

  try {
    const { token } = req.params;
    const link = await PostLink.findOne({ token, isActive: true }).populate("owner", "name");

    if (!link) {
      return res.status(404).send("Link not found or expired");
    }

    // 👇 CHANGED to FRONTEND_URL
    const frontend = process.env.FRONTEND_URL || "https://obongportal.curriumx.online";
    const url = `${frontend}/drop/${token}`;
    
    // Custom Write-up & Image
    const ownerName = link.owner?.name?.split(" ")[0] || "me";
    const title = `Send ${ownerName} an anonymous message`;
    const desc = "Got a secret or a thought? Drop it here completely anonymously. Your identity is protected.";
    const img = `${frontend}/og-anonymous.png`; // Make sure this image exists in your frontend public folder

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OU SOCIAL" />
  
  <meta property="og:image" content="${escapeHtml(img)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(img)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(img)}" />
</head>
<body>
  <p>${escapeHtml(title)}</p>
</body>
</html>`;

    return res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .set("Cache-Control", "public, max-age=60, s-maxage=300")
      .send(html);
      
  } catch (err) {
    console.error("OG render failed:", err.message);
    return next();
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/posts", postRoutes); 

// Error Middleware
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB and start the server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });