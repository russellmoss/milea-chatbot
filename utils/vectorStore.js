const { ChromaClient } = require('chromadb');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const path = require('path');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function initializeChromaDB() {
  console.log('🔄 Initializing ChromaDB...');
  
  const client = new ChromaClient({
    path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
  });

  const collectionName = COLLECTION_NAME; // Use the constant defined above

  try {
    // Attempt to delete the existing collection if it exists
    console.log(`🗑️ Deleting existing ChromaDB collection "${collectionName}"...`);
    await client.deleteCollection({ name: collectionName });
    console.log(`✅ Successfully deleted collection "${collectionName}"`);
  } catch (error) {
    // If the collection doesn't exist, this will throw an error, which we can ignore
    console.log(`ℹ️ No existing collection "${collectionName}" found, proceeding...`);
  }

  try {
    // Create a new collection
    console.log(`✅ Creating new ChromaDB collection "${collectionName}"...`);
    const collection = await client.createCollection({ 
      name: collectionName,
      metadata: {
        description: 'Milea Estate Vineyard Knowledge Base'
      }
    });
    console.log(`✅ Successfully initialized collection: "${collectionName}"`);
    return collection;
  } catch (error) {
    console.error('❌ ChromaDB Initialization Error:', error);
    throw error;
  }
}

async function storeDocuments(chunks) {
  console.log(`🔄 Storing ${chunks.length} document chunks in ChromaDB...`);
  
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    await vectorStore.addDocuments(chunks);
    
    console.log(`✅ Successfully stored ${chunks.length} chunks in ChromaDB`);
    return true;
  } catch (error) {
    console.error('❌ Error storing documents in ChromaDB:', error);
    throw error;
  }
}

async function searchSimilarDocuments(query, k = 5) {
  console.log(`🔍 Searching for documents similar to: "${query}"`);
  
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    const results = await vectorStore.similaritySearch(query, k);
    
    console.log(`✅ Found ${results.length} similar documents`);
    return results;
  } catch (error) {
    console.error('❌ Error searching similar documents:', error);
    return [];
  }
}

module.exports = { 
  initializeChromaDB, 
  storeDocuments, 
  searchSimilarDocuments 
};