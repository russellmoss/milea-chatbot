// scripts/indexwineProduction.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function indexwineProduction() {
  try {
    console.log('🔄 Starting Wine Production content indexing...');
    
    // Path to the Wine Production content folder
    const contentPath = path.join(__dirname, '..', 'knowledge', 'wine_production');
    
    console.log(`📂 Checking for content in: ${contentPath}`);
    
    // Verify the folder exists
    if (!fs.existsSync(contentPath)) {
      console.error(`❌ Wine Production folder not found: ${contentPath}`);
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
    
    console.log(`📄 Found ${markdownFiles.length} markdown files in Wine Production folder`);
    markdownFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
    
    // Process the documents
    console.log('🔄 Processing the documents...');
    const chunks = await processDocuments(markdownFiles);
    console.log(`✂️ Created ${chunks.length} chunks from Wine Production documents`);
    
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
    
    console.log(`✅ Successfully indexed ${markdownFiles.length} Wine Production documents into vector store`);
    return true;
  } catch (error) {
    console.error('❌ Error indexing Wine Production content:', error);
    return false;
  }
}

// Run the script
indexwineProduction()
  .then(success => {
    if (success) {
      console.log('🏁 Wine Production content indexing complete');
    } else {
      console.error('❌ Failed to index Wine Production content');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });