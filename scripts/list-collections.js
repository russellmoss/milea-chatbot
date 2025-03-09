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
    
    for (const collection of collections) {
      console.log(`  - Name: ${collection.name || 'unnamed'}`);
      console.log(`    ID: ${collection.id}`);
      try {
        const coll = await client.getCollection({ id: collection.id });
        const count = await coll.count();
        console.log(`    Documents: ${count}`);
      } catch (error) {
        console.log(`    Error getting count: ${error.message}`);
      }
      console.log(`    Metadata: ${JSON.stringify(collection.metadata || {})}`);
      console.log('');
    }
  } catch (error) {
    console.error(`❌ Error listing collections: ${error.message}`);
  }
}

listCollections().catch(console.error);