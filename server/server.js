import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import Photo from './models/Photo.js'; // Ensure this matches your file path

dotenv.config();

// Verify Cloudinary Config at startup
console.log('Cloud Config Check:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Loaded' : '❌ Missing');

const app = express();

// ===========================================
// 🌍 NETWORK FIX: Allow any device to connect
// ===========================================
app.use(cors({
  origin: '*', // Allows your phone (or any device) to talk to the server
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create local uploads folder if it doesn't exist
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created ./uploads directory');
}

// ES module __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Multer uses memory storage
const upload = multer({ storage: multer.memoryStorage() });

// ================= ROUTES =================

// Upload Route
app.post('/api/upload', upload.any(), async (req, res) => {
  let tempFilePath = null;
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files' });
    }

    const file = req.files[0];

    // 1. Convert buffer to a temporary file
    tempFilePath = path.join(__dirname, 'temp_' + Date.now() + '_' + file.originalname);
    fs.writeFileSync(tempFilePath, file.buffer);
    console.log("✅ File written to temp path:", tempFilePath);

    // 2. Upload to Cloudinary
    const result = await cloudinary.v2.uploader.upload(tempFilePath, {
      folder: "vibeshare",
      resource_type: "auto"
    });
    console.log("✅ Cloudinary upload success");

    // 3. Save to DB
    const { roomName, username } = req.body;
    const newPhoto = new Photo({
      imageUrl: result.secure_url,
      publicId: result.public_id,
      roomName: roomName,
      username: username
    });
    await newPhoto.save(); 

    // 4. Cleanup
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log("🧹 Cleaned up temp file");
      }
    } catch (cleanupErr) {
      console.warn("Cleanup failed:", cleanupErr.message);
    }

    console.log("🎉 Upload Success!");
    res.json(newPhoto);

  } catch (error) {
    console.error("❌ Upload Failed:", error);
    // Cleanup on error
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {}
    res.status(500).json({ error: error.message });
  }
});

// Get Photos Route
app.get('/api/photos/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    console.log('📸 Fetching photos for room:', roomName);
    const photos = await Photo.find({ roomName: roomName }).sort({ createdAt: -1 });
    console.log(`✅ Found ${photos.length} photos`);
    res.status(200).json(photos);
  } catch (error) {
    console.error('❌ Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos', details: error.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} 🚀`);
});