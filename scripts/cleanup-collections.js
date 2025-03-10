// scripts/cleanup-collections.js
require('dotenv').config();
const { ChromaClient } = require('chromadb');

async function cleanupCollections() {
  try {
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    console.log('🔌 Connected to ChromaDB');
    
    // List all collections
    const collections = await client.listCollections();
    console.log(`Found ${collections.length} collections`);
    
    // Keep wine_knowledge, delete others
    for (const collection of collections) {
      const collectionName = typeof collection === 'string' ? collection : collection.name;
      
      if (collectionName !== 'wine_knowledge') {
        console.log(`Deleting collection: ${collectionName}`);
        try {
          await client.deleteCollection({ name: collectionName });
          console.log(`  ✅ Deleted successfully`);
        } catch (error) {
          console.error(`  ❌ Error deleting: ${error.message}`);
        }
      } else {
        console.log(`Keeping collection: ${collectionName}`);
      }
    }
    
    console.log('Cleanup complete');
  } catch (error) {
    console.error(`Error cleaning up collections: ${error.message}`);
  }
}

cleanupCollections().catch(console.error);