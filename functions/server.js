const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');

const app = express();

// CORS and JSON middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const Background = mongoose.model('Background', {
  backgroundType: String,
  backgroundValue: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', {
  sender: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
  seenBy: [String]
});

const Memory = mongoose.model('Memory', {
  title: String,
  description: String,
  date: Date,
  images: [String],
  sender: String,
  createdAt: { type: Date, default: Date.now }
});

// Basic routes without file handling
app.get('/.netlify/functions/server/api/backgrounds', async (req, res) => {
  try {
    const backgrounds = await Background.find().sort({ createdAt: -1 });
    res.json(backgrounds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/.netlify/functions/server/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/.netlify/functions/server/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

module.exports = app;
module.exports.handler = serverless(app);
