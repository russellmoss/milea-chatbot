// scripts/indexsustainability.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function indexsustainability() {
  try {
    console.log('🔄 Starting Sustainability content indexing...');
    
    // Path to the Sustainability content folder
    const contentPath = path.join(__dirname, '..', 'knowledge', 'sustainability');
    
    console.log(`📂 Checking for content in: ${contentPath}`);
    
    // Verify the folder exists
    if (!fs.existsSync(contentPath)) {
      console.error(`❌ Sustainability folder not found: ${contentPath}`);
      return false;
    }
    
    // Get all markdown files in the folder
    const markdownFiles = fs.readdirSync(contentPath)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(contentPath, file));
    
    if (markdownFiles.length === 0) {
      console.error(`❌ No markdown files found in: ${contentPath}`);
      return false;
    }
    
    console.log(`📄 Found ${markdownFiles.length} markdown files in Sustainability folder`);
    markdownFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
    
    // Process the documents
    console.log('🔄 Processing the documents...');
    const chunks = await processDocuments(markdownFiles);
    console.log(`✂️ Created ${chunks.length} chunks from Sustainability documents`);
    
    // Generate embeddings
    console.log('🧮 Generating embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Initialize ChromaDB collection
    console.log('🔌 Connecting to ChromaDB...');
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Add documents to the vector store
    console.log('📥 Adding documents to vector store...');
    await vectorStore.addDocuments(chunks);
    
    console.log(`✅ Successfully indexed ${markdownFiles.length} Sustainability documents into vector store`);
    return true;
  } catch (error) {
    console.error('❌ Error indexing Sustainability content:', error);
    return false;
  }
}

// Run the script
indexsustainability()
  .then(success => {
    if (success) {
      console.log('🏁 Sustainability content indexing complete');
    } else {
      console.error('❌ Failed to index Sustainability content');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });