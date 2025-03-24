import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Update CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Update file paths for Vercel
const uploadDir = process.env.NODE_ENV === 'production' 
  ? '/tmp'
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gowthamnachu545:gowtham123@esgyy.baheh.mongodb.net/loveapp';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Background Schema
const backgroundSchema = new mongoose.Schema({
  backgroundType: String, // 'preset' or 'custom'
  backgroundValue: String, // image path or preset name
  createdAt: { type: Date, default: Date.now }
});

const Background = mongoose.model('Background', backgroundSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
  seenBy: [String]
});

const Message = mongoose.model('Message', messageSchema);

// Add Memory Schema
const memorySchema = new mongoose.Schema({
  title: String,
  description: String,
  date: Date,
  images: [String], // Changed from single image to array
  sender: String,
  createdAt: { type: Date, default: Date.now }
});

const Memory = mongoose.model('Memory', memorySchema);

// Routes
app.get('/api/backgrounds', async (req, res) => {
  try {
    const backgrounds = await Background.find().sort({ createdAt: -1 });
    res.json(backgrounds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/background', async (req, res) => {
  try {
    const background = await Background.findOne().sort({ createdAt: -1 });
    res.json(background || { backgroundType: 'preset', backgroundValue: 'background1.jpg' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/background', upload.single('backgroundImage'), async (req, res) => {
  try {
    const { backgroundType, backgroundValue } = req.body;
    const background = new Background({
      backgroundType,
      backgroundValue: req.file ? req.file.filename : backgroundValue
    });
    await background.save();
    res.json(background);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/background/:backgroundId', async (req, res) => {
  try {
    const background = await Background.findById(req.params.backgroundId);
    if (!background) {
      return res.status(404).json({ error: 'Background not found' });
    }

    if (background.backgroundType === 'custom') {
      const imagePath = path.join(__dirname, '../uploads', background.backgroundValue);
      try {
        if (fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
          console.log('Image file deleted:', imagePath);
        }
      } catch (err) {
        console.error('Error deleting image file:', err);
      }
    }

    await Background.findByIdAndDelete(req.params.backgroundId);
    console.log('Background deleted from database:', req.params.backgroundId);
    res.json({ message: 'Background deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Message Routes
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { sender, content } = req.body;
    const message = new Message({ sender, content });
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages/seen/:messageId', async (req, res) => {
  try {
    const { username } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (!message.seenBy.includes(username)) {
      message.seenBy.push(username);
      await message.save();
    }
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Memory Routes
app.get('/api/memories', async (req, res) => {
  try {
    const memories = await Memory.find().sort({ date: -1 });
    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memories', upload.array('images'), async (req, res) => {
  try {
    const { title, description, date, sender } = req.body;
    const images = req.files.map(file => file.filename);
    
    const memory = new Memory({
      title,
      description,
      date,
      sender,
      images
    });
    await memory.save();
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/memories/:memoryId', async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.memoryId);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Delete all associated image files
    for (const image of memory.images) {
      const imagePath = path.join(__dirname, '../uploads', image);
      try {
        if (fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
        }
      } catch (err) {
        console.error('Error deleting memory image file:', err);
      }
    }

    await Memory.findByIdAndDelete(req.params.memoryId);
    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

export default app;