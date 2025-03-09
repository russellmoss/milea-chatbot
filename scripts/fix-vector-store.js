// scripts/fix-vector-store.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ChromaClient } = require('chromadb');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const COLLECTION_NAME = 'milea_vineyard_knowledge';
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

async function fixVectorStore() {
  console.log('🔧 Starting vector store fix process');
  
  try {
    // Step 1: Check ChromaDB connection
    console.log('🔌 Testing ChromaDB connection...');
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    // Step 2: Reset the collection
    console.log('🔄 Resetting vector store collection...');
    try {
      await client.deleteCollection({ name: COLLECTION_NAME });
      console.log(`✅ Deleted existing collection: ${COLLECTION_NAME}`);
    } catch (error) {
      console.log(`ℹ️ No existing collection to delete`);
    }
    
    // Step 3: Create new collection
    await client.createCollection({ 
      name: COLLECTION_NAME,
      metadata: { description: 'Milea Estate Vineyard Knowledge Base' }
    });
    console.log(`✅ Created new collection: ${COLLECTION_NAME}`);
    
    // Step 4: Find all markdown files
    console.log('📂 Finding markdown files...');
    const files = await findAllMarkdownFiles(KNOWLEDGE_DIR);
    console.log(`📚 Found ${files.length} markdown files`);
    
    // Step 5: Process files in batches
    const BATCH_SIZE = 10;
    console.log(`🔄 Processing files in batches of ${BATCH_SIZE}...`);
    
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512,
      stripNewLines: true
    });
    
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      console.log(`⏳ Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(files.length/BATCH_SIZE)}`);
      
      const chunks = await processDocuments(batch);
      await vectorStore.addDocuments(chunks);
      
      console.log(`✅ Indexed batch ${Math.floor(i/BATCH_SIZE) + 1}`);
    }
    
    // Step 6: Verify
    console.log('🔍 Verifying embeddings...');
    const results = await vectorStore.similaritySearch('wine', 1);
    
    if (results.length > 0) {
      console.log(`✅ Embeddings verified! Found results for test query.`);
      console.log(`   Result: ${results[0].metadata.source}`);
    } else {
      console.log(`⚠️ No results found for test query. Something might still be wrong.`);
    }
    
    console.log('✅ Vector store fix completed successfully!');
  } catch (error) {
    console.error(`❌ Error fixing vector store: ${error.message}`);
    console.error(error.stack);
  }
}

async function findAllMarkdownFiles(dir) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subDirFiles = await findAllMarkdownFiles(fullPath);
      results = [...results, ...subDirFiles];
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  
  return results;
}

async function processDocuments(filePaths) {
  const chunks = [];
  
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Determine content type
      const contentType = detectContentType(filePath);
      
      // Create document splitter
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100
      });
      
      // Split document into chunks
      const docChunks = await textSplitter.createDocuments(
        [content],
        [{ 
          source: fileName,
          contentType,
          path: filePath,
          createdAt: new Date().toISOString()
        }]
      );
      
      chunks.push(...docChunks);
      console.log(`   Processed ${fileName} - created ${docChunks.length} chunks`);
    } catch (error) {
      console.error(`   ❌ Error processing ${filePath}: ${error.message}`);
    }
  }
  
  return chunks;
}

function detectContentType(filePath) {
  // Extract base folder name
  const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
  const baseFolderName = relativePath.split(path.sep)[0].toLowerCase();
  
  if (baseFolderName === 'wine' || filePath.includes('wine_')) {
    return 'wine';
  } else if (baseFolderName === 'visiting' || baseFolderName === 'accommodations') {
    return 'visiting';
  } else if (baseFolderName === 'club' || baseFolderName === 'wine-club') {
    return 'club';
  } else if (baseFolderName === 'event' || baseFolderName === 'events') {
    return 'event';
  } else if (baseFolderName === 'merchandise') {
    return 'merchandise';
  } else if (baseFolderName === 'milea_miles' || baseFolderName === 'loyalty') {
    return 'loyalty';
  } else if (baseFolderName === 'about') {
    return 'about';
  } else if (baseFolderName === 'wine_production') {
    return 'wine_production';
  } else if (baseFolderName === 'sustainability') {
    return 'sustainability';
  }
  
  return 'general';
}

// Run it
fixVectorStore().catch(console.error);