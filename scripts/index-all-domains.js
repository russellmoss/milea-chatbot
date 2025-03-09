// scripts/index-all-domains.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { COLLECTION_NAME } = require('../utils/vectorStore');

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

async function indexAllDomains() {
  console.log('🔧 Starting indexing of all knowledge domains');
  
  try {
    // Find all markdown files across all domains
    console.log('📂 Finding all markdown files...');
    const allFiles = await findAllMarkdownFiles(KNOWLEDGE_DIR);
    console.log(`📚 Found ${allFiles.length} markdown files`);
    
    // Group files by domain for logging
    const domainStats = {};
    allFiles.forEach(file => {
      const relativePath = path.relative(KNOWLEDGE_DIR, file);
      const domain = relativePath.split(path.sep)[0];
      domainStats[domain] = (domainStats[domain] || 0) + 1;
    });
    
    console.log('📊 Files by domain:');
    Object.entries(domainStats).forEach(([domain, count]) => {
      console.log(`  - ${domain}: ${count} files`);
    });
    
    // Initialize embeddings and vector store
    console.log('🔄 Initializing OpenAI embeddings...');
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
    
    // Process files in batches
    const BATCH_SIZE = 10;
    console.log(`🔄 Processing ${allFiles.length} files in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      console.log(`⏳ Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allFiles.length/BATCH_SIZE)}`);
      
      const chunks = await processDocuments(batch);
      await vectorStore.addDocuments(chunks);
      
      console.log(`✅ Indexed batch ${Math.floor(i/BATCH_SIZE) + 1} (${chunks.length} chunks)`);
    }
    
    console.log('✅ All domains indexed successfully!');
    
    // Test retrieval for non-wine domains
    console.log('🔍 Testing retrieval from non-wine domains...');
    const testQueries = [
      'Barry Milea',
      'visiting hours',
      'wine club membership'
    ];
    
    for (const query of testQueries) {
      console.log(`📝 Testing query: "${query}"`);
      const results = await vectorStore.similaritySearch(query, 2);
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results:`);
        results.forEach((doc, i) => {
          console.log(`   ${i+1}. ${doc.metadata.source}`);
        });
      } else {
        console.log(`❌ No results found for "${query}"`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error indexing domains: ${error.message}`);
    console.error(error.stack);
  }
}

async function findAllMarkdownFiles(dir) {
  let results = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  
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
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Determine content type based on directory
      const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
      const domain = relativePath.split(path.sep)[0];
      
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
          contentType: domain,
          path: filePath,
          domain: domain,
          createdAt: new Date().toISOString()
        }]
      );
      
      chunks.push(...docChunks);
    } catch (error) {
      console.error(`   ❌ Error processing ${filePath}: ${error.message}`);
    }
  }
  
  return chunks;
}

indexAllDomains().catch(console.error);