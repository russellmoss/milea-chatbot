// scripts/inspect-collection.js
require('dotenv').config();
const { ChromaClient } = require('chromadb');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');

async function inspectCollection() {
  try {
    console.log('🔍 Inspecting collection: wine_knowledge');
    
    // Connect to ChromaDB directly
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    // Get collection
    const collection = await client.getCollection({ name: 'wine_knowledge' });
    const count = await collection.count();
    console.log(`📊 Collection contains ${count} documents`);
    
    // Sample some documents
    console.log('🔄 Retrieving sample documents...');
    
    // Initialize embeddings and connect via LangChain for easier querying
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: 'wine_knowledge' }
    );
    
    // Test queries for different domains
    const testQueries = [
      { query: 'wine club', domain: 'Wine Club' },
      { query: 'reserve cabernet franc', domain: 'Wine' },
      { query: 'visiting hours', domain: 'Visiting' },
      { query: 'Milea Miles loyalty program', domain: 'Loyalty' }
    ];
    
    for (const test of testQueries) {
      console.log(`\n🔍 Testing query for ${test.domain} domain: "${test.query}"`);
      const results = await vectorStore.similaritySearch(test.query, 2);
      
      if (results.length > 0) {
        console.log(`  ✅ Found ${results.length} results:`);
        for (const doc of results) {
          // Extract just the first 100 characters of content
          const previewContent = doc.pageContent.substring(0, 100).replace(/\n/g, ' ') + '...';
          console.log(`  - Source: ${doc.metadata.source || 'unknown'}`);
          console.log(`    Content preview: ${previewContent}`);
          console.log(`    Metadata: ${JSON.stringify(doc.metadata)}`);
        }
      } else {
        console.log(`  ❌ No results found`);
      }
    }
    
    // Get document count by content type
    console.log('\n📊 Attempting to analyze document types...');
    
    // Since we can't easily query by metadata with the ChromaDB client directly,
    // we'll use some sample queries for different content types
    const contentTypeQueries = [
      'wine', 'visit', 'club', 'loyalty', 'merchandise', 'event'
    ];
    
    for (const typeQuery of contentTypeQueries) {
      const results = await vectorStore.similaritySearch(typeQuery, 10);
      
      // Count unique sources
      const uniqueSources = new Set();
      results.forEach(doc => {
        if (doc.metadata && doc.metadata.source) {
          uniqueSources.add(doc.metadata.source);
        }
      });
      
      console.log(`  Query "${typeQuery}" found ${uniqueSources.size} unique documents`);
    }
    
  } catch (error) {
    console.error(`❌ Error inspecting collection: ${error.message}`);
  }
}

inspectCollection().catch(console.error);