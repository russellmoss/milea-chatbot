// scripts/indexMileaMiles.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function indexMileaMiles() {
  try {
    console.log('💎 Starting Milea Miles content indexing...');
    
    // Path to the Milea Miles document
    const mileaMilesPath = path.join(__dirname, '..', 'knowledge', 'milea_miles');
    
    console.log(`📂 Checking for content in: ${mileaMilesPath}`);
    
    // Verify the folder exists
    if (!fs.existsSync(mileaMilesPath)) {
      console.error(`❌ Milea Miles folder not found: ${mileaMilesPath}`);
      return false;
    }
    
    // Get all markdown files in the Milea Miles folder
    const markdownFiles = fs.readdirSync(mileaMilesPath)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(mileaMilesPath, file));
    
    if (markdownFiles.length === 0) {
      console.error(`❌ No markdown files found in: ${mileaMilesPath}`);
      return false;
    }
    
    console.log(`📄 Found ${markdownFiles.length} markdown files in Milea Miles folder`);
    markdownFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
    
    // Process the documents
    console.log('🔄 Processing the documents...');
    const chunks = await processDocuments(markdownFiles);
    console.log(`✂️ Created ${chunks.length} chunks from Milea Miles documents`);
    
    // Generate embeddings
    console.log('🧮 Generating embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512, // Process more inputs in parallel
      stripNewLines: true // Can improve performance with text
    });
    
    // Initialize Chroma collection
    console.log('🔌 Connecting to ChromaDB...');
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Add documents to the vector store
    console.log('📥 Adding documents to vector store...');
    await vectorStore.addDocuments(chunks);
    
    console.log(`✅ Successfully indexed ${markdownFiles.length} Milea Miles documents into vector store`);
    return true;
  } catch (error) {
    console.error('❌ Error indexing Milea Miles content:', error);
    return false;
  }
}

// Run the script
indexMileaMiles()
  .then(success => {
    if (success) {
      console.log('🏁 Milea Miles content indexing complete');
    } else {
      console.error('❌ Failed to index Milea Miles content');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });