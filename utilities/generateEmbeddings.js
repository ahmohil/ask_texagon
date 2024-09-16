const { createClient } = require('@supabase/supabase-js');
const { OpenAI} = require('openai');
const  { supabaseClient } = require('./supabase.js');
const  fs = require('fs/promises');


async function generateEmbeddingsFromFile(filePath) {
  try {

    const document = await fs.readFile(filePath, 'utf-8');
    const openai = new OpenAI({apiKey : process.env.OPENAI_API_KEY});

    const input = document.replace(/\n/g, ' ');


    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });

    console.log(embeddingResponse)
    console.log(embeddingResponse.data)
    console.log(embeddingResponse.data[0].embedding)
    const embedding = embeddingResponse.data[0].embedding;

    const { data, error } = await supabaseClient
    .from('documents')
    .insert({
      content: document,
      embedding: embedding,  // Assuming embedding column is of type 'vector'
    });

    if (error) {
        console.error('Error saving data:', error);
        }



    console.log('Embeddings generated and saved successfully.');
  } catch (error) {
    console.error('Error generating embeddings:', error);
  }
}


module.exports = { generateEmbeddingsFromFile };

// generateEmbeddingsFromFile('../Discord_details.txt');