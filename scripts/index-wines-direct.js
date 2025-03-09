// scripts/index-wines-direct.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');

const COLLECTION_NAME = 'wine_knowledge';
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

async function indexWinesDirect() {
  try {
    console.log('🍷 Starting direct wine indexing');
    
    // Find all wine files
    const wineDir = path.join(KNOWLEDGE_DIR, 'wine');
    
    if (!fs.existsSync(wineDir)) {
      console.error('❌ Wine directory not found!');
      return;
    }
    
    const wineFiles = fs.readdirSync(wineDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(wineDir, file));
    
    console.log(`📚 Found ${wineFiles.length} wine documents`);
    
    // Create embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Create a completely new store (not from existing)
    console.log(`🔄 Creating new vector store with collection: ${COLLECTION_NAME}`);
    const texts = [];
    const metadatas = [];
    
    for (const file of wineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const filename = path.basename(file);
      
      texts.push(content);
      metadatas.push({
        source: filename,
        contentType: 'wine',
        path: file
      });
      
      console.log(`   Added: ${filename}`);
    }
    
    // Create the vector store from scratch
    await Chroma.fromTexts(
      texts,
      metadatas,
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    console.log('✅ Wine documents indexed successfully');
    
    // Verify with a simple search
    console.log('🔍 Verifying with a test search...');
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    const results = await vectorStore.similaritySearch('reserve cabernet franc', 2);
    
    if (results.length > 0) {
      console.log(`✅ Search successful! Found ${results.length} documents:`);
      results.forEach((doc, i) => {
        console.log(`   ${i+1}. ${doc.metadata.source}`);
      });
    } else {
      console.log('❌ Search returned no results.');
    }
    
  } catch (error) {
    console.error(`❌ Error indexing wines: ${error.message}`);
    console.error(error.stack);
  }
}

indexWinesDirect().catch(console.error);