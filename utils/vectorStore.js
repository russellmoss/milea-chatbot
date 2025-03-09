// utils/vectorStore.js
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { ChromaClient } = require('chromadb');

// Use a fixed collection name
const COLLECTION_NAME = 'wine_knowledge';

/**
 * Initialize the ChromaDB collection
 */
async function initializeChromaDB() {
  console.log('🔄 Initializing ChromaDB...');
  
  const client = new ChromaClient({
    path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
  });

  try {
    // Check if collection exists instead of trying to delete it
    const collections = await client.listCollections();
    const exists = collections.some(c => c.name === COLLECTION_NAME);
    
    if (exists) {
      console.log(`✅ Collection "${COLLECTION_NAME}" already exists, using it`);
    } else {
      // Create a new collection
      console.log(`✅ Creating new ChromaDB collection "${COLLECTION_NAME}"...`);
      await client.createCollection({ 
        name: COLLECTION_NAME,
        metadata: {
          description: 'Wine Knowledge Base'
        }
      });
      console.log(`✅ Successfully initialized collection: "${COLLECTION_NAME}"`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ ChromaDB Initialization Error:', error);
    throw error;
  }
}

/**
 * Store documents in the vector database
 * @param {Array} chunks - Document chunks to store
 * @returns {Promise<boolean>} - Success status
 */
async function storeDocuments(chunks) {
  console.log(`🔄 Storing ${chunks.length} document chunks in ChromaDB...`);
  
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512, // Process more inputs in parallel
      stripNewLines: true // Can improve performance with text
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

/**
 * Search for similar documents in the vector database
 * @param {string} query - Query to search for
 * @param {number} k - Number of results to return
 * @param {Object} filter - Filter to apply
 * @returns {Promise<Array>} - Similar documents
 */
async function searchSimilarDocuments(query, k = 5, filter = null) {
  console.log(`🔍 Searching for documents similar to: "${query}"`);
  
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512, // Process more inputs in parallel
      stripNewLines: true // Can improve performance with text
    });
    
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    let searchOptions = {};
    
    // Only apply filter if it has valid conditions
    if (filter && Object.keys(filter).length > 0) {
      // For LangChain's Chroma implementation, filters need to be in this format:
      // { metadata: { key: value } }
      searchOptions.filter = { metadata: filter };
      console.log(`🔍 Using filter:`, searchOptions.filter);
    }
    
    // Use the filter in the similarity search if provided
    const results = filter && Object.keys(filter).length > 0 
      ? await vectorStore.similaritySearch(query, k, searchOptions.filter)
      : await vectorStore.similaritySearch(query, k);
    
    console.log(`✅ Found ${results.length} similar documents`);
    
    // Log sources of found documents for debugging
    if (results.length > 0) {
      console.log('📄 Document sources:');
      results.slice(0, 3).forEach((doc, i) => {
        console.log(`   ${i+1}. ${doc.metadata.source || 'Unknown source'}`);
      });
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error searching similar documents:', error);
    console.error('Error details:', error.message);
    
    // Return empty array rather than throwing to avoid crashing the application
    return [];
  }
}

module.exports = { 
  initializeChromaDB, 
  storeDocuments, 
  searchSimilarDocuments,
  COLLECTION_NAME
};