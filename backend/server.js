import "./config.js"; // 🚨 MUST BE FIRST! Loads env & configures Cloudinary

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import https from 'https'; // 👈 Added for fallback fetching

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import academicRoutes from "./routes/academicRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import postRoutes from "./routes/postRoutes.js"; 

import PostLink from "./models/postLinkModel.js";
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myapp';

// Ensure we have a clean frontend URL without trailing slashes
const FRONTEND_URL = (process.env.FRONTEND_URL || "https://obongportal.curriumx.online").replace(/\/$/, "");

// Middleware
const allowedOrigins = [
  'http://localhost:2000',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://obongportal.curriumx.online',
  'https://obong-portal-server.onrender.com'
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
// OG / LINK PREVIEW & SPA PROXY FOR /drop/:token
// ============================================================
const CRAWLER_RE = /(whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|embedly|quora link preview|showyoubot|outbrain|pinterest|vkShare|W3C_Validator|redditbot|applebot|googlebot|bingbot|yandex|duckduckbot|skypeuripreview)/i;

const escapeHtml = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Bulletproof fetch helper
async function fetchHtml(url) {
  if (typeof fetch === 'function') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.text();
  }
  
  // Fallback for older Node versions on Render
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

app.get("/drop/:token", async (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const isCrawler = CRAWLER_RE.test(ua);

  // ── 1. REAL HUMANS: Serve the React App ──
  if (!isCrawler) {
    try {
      const html = await fetchHtml(`${FRONTEND_URL}/`);
      return res.status(200).set("Content-Type", "text/html; charset=utf-8").send(html);
    } catch (err) {
      console.error("❌ Proxy error fetching frontend:", err.message);
      // Return HTML error instead of JSON so the browser doesn't show "Not Found"
      return res.status(502).send(`
        <html>
          <body style="background:#111;color:#fff;font-family:sans-serif;padding:2rem;text-align:center;">
            <h1>Proxy Error</h1>
            <p>Could not load the frontend app. Ensure FRONTEND_URL is correct and the frontend is online.</p>
            <p style="color:#f4a825;">Target: ${FRONTEND_URL}</p>
            <p style="color:#888;font-size:0.8rem;">Error: ${escapeHtml(err.message)}</p>
          </body>
        </html>
      `);
    }
  }

  // ── 2. CRAWLERS: Serve the OG Meta Tags ──
  try {
    const { token } = req.params;
    const link = await PostLink.findOne({ token, isActive: true }).populate("owner", "name");

    if (!link) {
      return res.status(404).send("Link not found or expired");
    }

    const url = `${FRONTEND_URL}/drop/${token}`;
    const ownerName = link.owner?.name?.split(" ")[0] || "me";
    
    const title = `Send ${ownerName} an anonymous message`;
    const desc = "Got a secret or a thought? Drop it here completely anonymously. Your identity is protected.";
    const img = `${FRONTEND_URL}/og-anonymous.png`;

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
    return res.status(500).send("Server Error generating preview");
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

// Error Middleware (Only hits if a route isn't matched at all)
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