import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import stream from 'stream'; // Native Node module
import Photo from './models/Photo.js'; 

dotenv.config();

const app = express();

// ===========================================
// 🌍 NETWORK: Allow requests
// ===========================================
app.use(cors({
  origin: '*', // Allow your frontend to talk to this server
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

// Use Memory Storage (Keep files in RAM, don't save to disk)
const upload = multer({ storage: multer.memoryStorage() });

// Helper: Stream Upload to Cloudinary (Bypasses local disk)
const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    let streamifier = stream.Readable.from(buffer);
    let cld_upload_stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: "vibeshare",
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.pipe(cld_upload_stream);
  });
};

// ================= ROUTES =================

// Upload Route
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const file = req.files[0];
    console.log(`📤 Starting upload for: ${file.originalname}`);

    // DIRECT STREAM UPLOAD (No temp files needed!)
    const result = await streamUpload(file.buffer);
    
    console.log("✅ Cloudinary upload success:", result.secure_url);

    // Save to DB
    const { roomName, username } = req.body;
    const newPhoto = new Photo({
      imageUrl: result.secure_url,
      publicId: result.public_id,
      roomName: roomName || 'general',
      username: username || 'Anonymous'
    });
    
    await newPhoto.save(); 

    console.log("🎉 DB Save Success!");
    res.json(newPhoto);

  } catch (error) {
    console.error("❌ Upload Failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Photos Route
app.get('/api/photos/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const photos = await Photo.find({ roomName: roomName }).sort({ createdAt: -1 });
    res.status(200).json(photos);
  } catch (error) {
    console.error('❌ Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} 🚀`);
});