// scripts/list-collections.js
require('dotenv').config();
const { ChromaClient } = require('chromadb');

async function listCollections() {
  try {
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    console.log('🔌 Connected to ChromaDB');
    
    // List all collections
    const collections = await client.listCollections();
    console.log(`📊 Found ${collections.length} collections:`);
    
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      console.log(`\nCollection ${i+1}:`);
      
      // Check if collection is a string (collection name) or an object
      const collectionName = typeof collection === 'string' ? collection : collection.name;
      console.log(`  Name: ${collectionName || 'unnamed'}`);
      
      try {
        // Try to get collection by name
        const coll = await client.getCollection({ name: collectionName });
        const count = await coll.count();
        console.log(`  Documents: ${count}`);
      } catch (error) {
        console.log(`  Error getting count: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error listing collections: ${error.message}`);
  }
}

listCollections().catch(console.error);