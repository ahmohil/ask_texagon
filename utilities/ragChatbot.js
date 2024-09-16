const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { supabaseClient } = require('./supabase.js');
const {generateEmbeddingsFromFile} = require('./generateEmbeddings.js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const supabase = supabaseClient;





// Function to create chunks that will overlap
function splitIntoChunks(text, chunkSize = 1000, overlapSize = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlapSize;
  }
  return chunks;
}

// Function to create embeddings
async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Function to save embeddings to Supabase
async function saveEmbedding(text, embedding, filePath) {
  const { data, error } = await supabaseClient
  .from('documents')
  .insert({
    content: text,
    embedding: embedding,  // Assuming embedding column is of type 'vector'
  });


  if (error) throw error;
  return data;
}



async function processFile(filePath) {
  let content;
  const fileExtension = path.extname(filePath).toLowerCase();

  if (fileExtension === '.docx') {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    content = result.value;
  } else {
    content = fs.readFileSync(filePath, 'utf8');
  }

  const chunks = splitIntoChunks(content);

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk);
    await saveEmbedding(chunk, embedding, filePath);
  }

  console.log(`Processed and saved embeddings for ${filePath}`);
}

module.exports = { processFile };

// Function to perform similarity search
async function similaritySearch(query, topK = 5) {
  const queryEmbedding = await createEmbedding(query);

  const { data, error } = await supabase
    .rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: topK
    });

  if (error) throw error;
  return data;
}

// Function to generate response using OpenAI
async function generateResponse(query, context) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful texagon representative. Texagon is a leader in AI soluitions. Given the following context related to users query, answer the question using that information only. If you are unsure and the answer is not explicitly written in the documentation, say 'Sorry, I don't know how to helep with that.'" },
      { role: "user", content: `Context: ${context}\n\nQuestion: ${query.trim()}` }
    ],
  });

  return response.choices[0].message.content;
}

// Main chatbot function
async function chatbot(query, filePath = null) {
  if (filePath) {
    await processFile(filePath);
    // await generateEmbeddingsFromFile(filePath);
    return 'File processed successfully';
  }

  const similarDocs = await similaritySearch(query);
  const context = similarDocs.map(doc => doc.content).join("\n\n");
  const response = await generateResponse(query, context);

  return response;
}

module.exports = { chatbot, createEmbedding };