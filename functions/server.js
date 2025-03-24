import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Using memory storage for serverless
const upload = multer({ storage: storage });

// Schema definitions
// ...existing schema code...

// Routes with /api prefix removed since Netlify adds it
app.get('/backgrounds', async (req, res) => {
  try {
    const backgrounds = await Background.find().sort({ createdAt: -1 });
    res.json(backgrounds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ...existing routes with /api prefix removed...

export const handler = serverless(app);
