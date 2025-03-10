// scripts/test-chroma-connection.js
require('dotenv').config();
const { ChromaClient } = require('chromadb');

async function testChromaConnection() {
  try {
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    console.log('🔌 Testing ChromaDB connection...');
    
    // Get list of collections
    const collections = await client.listCollections();
    console.log(`✅ Found ${collections.length} collections`);
    
    // Examine each collection more deeply
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      console.log(`\nCollection ${i+1}:`);
      console.log(`  Raw data:`, JSON.stringify(collection));
      
      // Try to get any IDs from the collection
      if (collection.id) {
        try {
          const detailedCollection = await client.getCollection({
            id: collection.id
          });
          console.log(`  Retrieved by ID: ${detailedCollection ? 'Success' : 'Failed'}`);
        } catch (e) {
          console.log(`  Error retrieving by ID: ${e.message}`);
        }
      }
      
      // Try other properties that might contain identification
      const possibleIdentifiers = ['name', 'uuid', 'collectionName', 'collection_name'];
      for (const key of possibleIdentifiers) {
        if (collection[key]) {
          console.log(`  Possible identifier found - ${key}: ${collection[key]}`);
          try {
            const params = {};
            params[key] = collection[key];
            const detailedCollection = await client.getCollection(params);
            console.log(`  Retrieved using ${key}: ${detailedCollection ? 'Success' : 'Failed'}`);
          } catch (e) {
            console.log(`  Error retrieving using ${key}: ${e.message}`);
          }
        }
      }
    }
    
    // Try to directly access our expected collection
    try {
      const wineCollection = await client.getCollection({
        name: 'wine_knowledge'
      });
      console.log('\nAttempting to access wine_knowledge collection:');
      console.log(`  Success: ${!!wineCollection}`);
      const count = await wineCollection.count();
      console.log(`  Document count: ${count}`);
    } catch (e) {
      console.log(`  Error accessing wine_knowledge: ${e.message}`);
    }
    
  } catch (error) {
    console.error(`❌ ChromaDB connection error: ${error.message}`);
  }
}

testChromaConnection();