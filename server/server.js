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
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ===========================================
// 👥 IN-MEMORY USER PRESENCE TRACKING
// ===========================================
// Structure: { roomName: { username: { joinedAt, lastSeen } } }
const activeUsers = {};

// Cleanup inactive users every 30 seconds
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 45000; // 45 seconds

  for (const roomName in activeUsers) {
    for (const username in activeUsers[roomName]) {
      const user = activeUsers[roomName][username];
      if (now - user.lastSeen > TIMEOUT) {
        delete activeUsers[roomName][username];
        console.log(`🔴 Removed inactive user: ${username} from ${roomName}`);
      }
    }
    // Remove empty rooms
    if (Object.keys(activeUsers[roomName]).length === 0) {
      delete activeUsers[roomName];
    }
  }
}, 30000);

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

// ================= USER PRESENCE ROUTES =================

// Join Room - Add user to active users
app.post('/api/users/join', (req, res) => {
  try {
    const { roomName, username } = req.body;

    if (!roomName || !username) {
      return res.status(400).json({ error: 'roomName and username required' });
    }

    // Initialize room if it doesn't exist
    if (!activeUsers[roomName]) {
      activeUsers[roomName] = {};
    }

    // Add or update user
    activeUsers[roomName][username] = {
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    console.log(`🟢 ${username} joined room: ${roomName}`);
    console.log(`📊 Active users in ${roomName}:`, Object.keys(activeUsers[roomName]));

    res.status(200).json({ 
      message: 'Joined room', 
      activeUsers: activeUsers[roomName] 
    });
  } catch (error) {
    console.error('❌ Error joining room:', error);
    res.status(500).json({ error: error.message });
  }
});

// Heartbeat - Keep user alive and update lastSeen
app.post('/api/users/heartbeat', (req, res) => {
  try {
    const { roomName, username } = req.body;

    if (!roomName || !username) {
      return res.status(400).json({ error: 'roomName and username required' });
    }

    // Initialize room if it doesn't exist
    if (!activeUsers[roomName]) {
      activeUsers[roomName] = {};
    }

    // Update or add user
    activeUsers[roomName][username] = {
      joinedAt: activeUsers[roomName][username]?.joinedAt || Date.now(),
      lastSeen: Date.now(),
    };

    res.status(200).json({ 
      activeUsers: activeUsers[roomName] 
    });
  } catch (error) {
    console.error('❌ Error in heartbeat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Active Users in Room
app.get('/api/users/:roomName', (req, res) => {
  try {
    const { roomName } = req.params;

    const users = activeUsers[roomName] 
      ? Object.keys(activeUsers[roomName]).map((username) => ({
          username,
          joinedAt: activeUsers[roomName][username].joinedAt,
          lastSeen: activeUsers[roomName][username].lastSeen,
        }))
      : [];

    res.status(200).json({ 
      roomName,
      activeUserCount: users.length,
      users 
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Leave Room - Remove user from active users
app.delete('/api/users/leave', (req, res) => {
  try {
    const { roomName, username } = req.body;

    if (!roomName || !username) {
      return res.status(400).json({ error: 'roomName and username required' });
    }

    if (activeUsers[roomName] && activeUsers[roomName][username]) {
      delete activeUsers[roomName][username];
      console.log(`🔴 ${username} left room: ${roomName}`);
    }

    // Clean up empty rooms
    if (activeUsers[roomName] && Object.keys(activeUsers[roomName]).length === 0) {
      delete activeUsers[roomName];
    }

    res.status(200).json({ message: 'Left room' });
  } catch (error) {
    console.error('❌ Error leaving room:', error);
    res.status(500).json({ error: error.message });
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