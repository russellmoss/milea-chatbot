const path = require('path');
const fs = require('fs');
const { processDocuments } = require('../utils/documentProcessor');
const { initializeChromaDB, storeDocuments } = require('../utils/vectorStore');

const KNOWLEDGE_PATH = path.join(__dirname, '../knowledge');

/**
 * Recursively get all markdown files from the knowledge directory.
 */
const getAllMarkdownFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(filePath)); // Recursively search subfolders
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  });

  return results;
};

async function initializeKnowledgeBase() {
  try {
    console.log('🚀 Starting knowledge base initialization...');
    
    // Find all markdown files recursively
    const markdownFiles = getAllMarkdownFiles(KNOWLEDGE_PATH);
    
    if (markdownFiles.length === 0) {
      console.warn('⚠️ No markdown files found in the knowledge base.');
    } else {
      console.log(`📑 Found ${markdownFiles.length} markdown files.`);
    }

    // ✅ Fix: Ensure `processDocuments` receives an array
    const documentChunks = await processDocuments(markdownFiles); // Pass the array properly

    // ✅ Ensure ChromaDB is reset before storing new docs
    await initializeChromaDB();
    
    // ✅ Store documents in vector database
    await storeDocuments(documentChunks);
    
    console.log('✅ Knowledge base initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing knowledge base:', error);
  }
}

initializeKnowledgeBase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
