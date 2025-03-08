// scripts/indexVisitingContent.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function indexVisitingContent() {
  try {
    console.log('🏨 Starting visiting content indexing...');
    
    // Path to the visiting content folder
    const visitingPath = path.join(__dirname, '..', 'knowledge', 'visiting');
    
    console.log(`📂 Checking for content in: ${visitingPath}`);
    
    // Verify the folder exists
    if (!fs.existsSync(visitingPath)) {
      console.error(`❌ Visiting folder not found: ${visitingPath}`);
      return false;
    }
    
    // Get all markdown files in the visiting folder
    const markdownFiles = fs.readdirSync(visitingPath)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(visitingPath, file));
    
    if (markdownFiles.length === 0) {
      console.error(`❌ No markdown files found in: ${visitingPath}`);
      return false;
    }
    
    console.log(`📄 Found ${markdownFiles.length} markdown files in visiting folder:`);
    markdownFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
    
    // Process the documents with the enhanced documentProcessor
    console.log('🔄 Processing the documents...');
    const chunks = await processDocuments(markdownFiles);
    console.log(`✂️ Created ${chunks.length} chunks from visiting documents`);
    
    // Generate embeddings
    console.log('🧮 Generating embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512, // Process more inputs in parallel
      stripNewLines: true // Can improve performance with text
    });
    
    // Initialize ChromaDB collection
    console.log('🔌 Connecting to ChromaDB...');
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Add documents to the collection
    console.log('📥 Adding documents to vector store...');
    await vectorStore.addDocuments(chunks);
    
    console.log(`✅ Successfully indexed ${markdownFiles.length} visiting documents into vector store`);
    return true;
  } catch (error) {
    console.error(`❌ Error indexing visiting content:`, error);
    return false;
  }
}

// Run the script
indexVisitingContent()
  .then(success => {
    if (success) {
      console.log('🏁 Visiting content indexing complete');
    } else {
      console.error('❌ Failed to index visiting content');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });