const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
});
const express = require('express');
const multer = require('multer');
const { chatbot, createEmbedding } = require('./utilities/ragChatbot');
const {get_docs_from_repo} = require('./utilities/loadRepo');
const { get_encoding, encoding_for_model } =  require("tiktoken");
const {supabaseClient} = require('./utilities/supabase');
const app = express();
const port = 3000;

const supabase = supabaseClient;

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

// Add new endpoint for loading GitHub repository
app.post('/load-repository', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    const docs = await get_docs_from_repo(repoUrl);
    
    // Splitting document if tokens are more than the context limit

    const enc = encoding_for_model("text-embedding-3-small")

    const splitDocument = (doc, maxTokens) => {
      const tokens = enc.encode(doc);
      const numParts = Math.ceil(tokens.length / maxTokens);
      const partSize = Math.ceil(tokens.length / numParts);
      const parts = [];
      for (let i = 0; i < numParts; i++) {
        const partTokens = tokens.slice(i * partSize, (i + 1) * partSize);
        parts.push(encoder.decode(partTokens));
      }
      return parts;
    };

    const processedDocs = [];
    for (const doc of docs) {
      const tokenLength = enc.encode(doc.pageContent).length;
      if (tokenLength > 8000) {
        const parts = splitDocument(doc.pageContent, 8000);
        for (const part of parts) {
          processedDocs.push({ ...doc, pageContent: part });
        }
      } else {
        processedDocs.push(doc);
      }
    }


    const embeddings = await Promise.all(processedDocs.map(doc => createEmbedding(doc.pageContent)));
    for (let i = 0; i < docs.length; i++) {
      processedDocs[i].embedding = embeddings[i];
    }

    const { data, error } = await supabase
      .from('documents')
      .insert(processedDocs.map(
        ({ pageContent, embedding, metadata }) => ({ content: pageContent, embedding, metadata })
      ));

      if (error) throw error;
      return res.status(200).json({ message: 'Documents loaded successfully' });
  } catch (error) {
    console.error('Error loading repository:', error);
    res.status(500).json({ error: 'Error loading repository' });
  }
});

// Function to check required environment variables
function checkRequiredEnvVars() {
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please set these variables in your .env file');
    process.exit(1);
  }
}

// Start the server
app.listen(port, () => {
  checkRequiredEnvVars();
  console.log(`Server listening on port ${port}`);
});