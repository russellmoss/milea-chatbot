// scripts/reset-chroma-complete.js
require('dotenv').config();
const { ChromaClient } = require('chromadb');

async function resetChromaComplete() {
  try {
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    console.log('🔌 Connected to ChromaDB');
    
    // List all collections
    const collections = await client.listCollections();
    console.log(`📊 Found ${collections.length} collections`);
    
    // Delete each collection - we'll try with both name and ID
    for (const collection of collections) {
      try {
        if (collection.id) {
          console.log(`🗑️ Attempting to delete collection with ID: ${collection.id}`);
          await client.deleteCollection({ id: collection.id });
        } else {
          // If we have a name but no ID
          if (collection.name) {
            console.log(`🗑️ Attempting to delete collection with name: ${collection.name}`);
            await client.deleteCollection({ name: collection.name });
          } else {
            console.log('⚠️ Cannot delete collection with no name or ID');
          }
        }
      } catch (error) {
        console.error(`❌ Error deleting collection: ${error.message}`);
      }
    }
    
    console.log('🔄 Creating a fresh collection with proper name');
    await client.createCollection({
      name: 'wine_knowledge',
      metadata: { description: 'Wine Knowledge Base' }
    });
    
    console.log('✅ Reset complete - created new collection: wine_knowledge');
  } catch (error) {
    console.error(`❌ Error resetting ChromaDB: ${error.message}`);
  }
}

resetChromaComplete().catch(console.error);