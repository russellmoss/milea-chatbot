// scripts/index-wine-docs.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { Document } = require('langchain/document');
const { ChromaClient } = require('chromadb');

// This will be dynamically set based on what we find
let COLLECTION_NAME = null;
let COLLECTION_ID = null;
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

async function indexWineDocs() {
  console.log('🔧 Starting wine document indexing');
  
  try {
    // Step 1: Connect to ChromaDB and find existing collection
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    console.log('🔌 Connected to ChromaDB');
    
    // List all collections
    const collections = await client.listCollections();
    console.log(`📊 Found ${collections.length} collections`);
    
    if (collections.length === 0) {
      console.log('🔄 No collections found. Creating a new one.');
      const newCollection = await client.createCollection({
        name: 'default_collection', 
        metadata: { description: 'Default Collection' }
      });
      COLLECTION_NAME = 'default_collection';
      COLLECTION_ID = newCollection.id;
    } else {
      // Use the first collection
      COLLECTION_NAME = collections[0].name || 'unnamed';
      COLLECTION_ID = collections[0].id;
      console.log(`🔄 Using existing collection: ${COLLECTION_NAME} (${COLLECTION_ID})`);
    }
    
    // Step 2: Find all wine files
    console.log('📂 Finding wine markdown files...');
    const wineDir = path.join(KNOWLEDGE_DIR, 'wine');
    
    if (!fs.existsSync(wineDir)) {
      console.error('❌ Wine directory not found!');
      return;
    }
    
    const wineFiles = fs.readdirSync(wineDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(wineDir, file));
    
    console.log(`📚 Found ${wineFiles.length} wine documents`);
    
    // Step 3: Initialize embeddings and vector store
    console.log('🔄 Initializing OpenAI embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    console.log(`🔄 Connecting to collection: ${COLLECTION_NAME}`);
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Step 4: Create documents
    console.log('📝 Creating document objects...');
    const documents = [];
    
    for (const file of wineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const filename = path.basename(file);
      
      // Create document
      const doc = new Document({
        pageContent: content,
        metadata: {
          source: filename,
          contentType: 'wine',
          path: file,
          createdAt: new Date().toISOString()
        }
      });
      
      documents.push(doc);
      console.log(`   Added: ${filename}`);
    }
    
    // Step 5: Add to vector store
    console.log(`🔄 Adding ${documents.length} documents to vector store...`);
    await vectorStore.addDocuments(documents);
    
    console.log('✅ Documents added successfully');
    
    // Step 6: Test retrieval
    console.log('🔍 Testing document retrieval...');
    const results = await vectorStore.similaritySearch('reserve cabernet franc', 2);
    
    if (results.length > 0) {
      console.log(`✅ Retrieved ${results.length} documents:`);
      results.forEach((doc, i) => {
        console.log(`   ${i+1}. ${doc.metadata.source}`);
      });
    } else {
      console.log('❌ No documents retrieved. Something is wrong.');
    }
    
    console.log('✅ Indexing complete!');
  } catch (error) {
    console.error(`❌ Error indexing wine docs: ${error.message}`);
    console.error(error.stack);
  }
}

indexWineDocs().catch(console.error);