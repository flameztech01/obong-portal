// config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 2. Configure Cloudinary ONCE globally
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

console.log("🔍 ENV CHECK:");
console.log("CLOUD_NAME:", process.env.CLOUD_NAME || "Missing ❌");
console.log("API_KEY:", process.env.API_KEY || "Missing ❌");
console.log("API_SECRET:", process.env.API_SECRET ? "Loaded ✅" : "Missing ❌");