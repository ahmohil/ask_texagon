const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
});
const express = require('express');
const multer = require('multer');
const { chatbot } = require('./utilities/ragChatbot');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.static('public'));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add chatbot endpoint
app.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const response = await chatbot(query);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add file upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // if (!req.file) {
    //   return res.status(400).json({ error: 'No file uploaded' });
    // }
    const filePath = req.file.path;
    await chatbot(null, filePath);
    res.json({ message: 'File processed successfully' });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});