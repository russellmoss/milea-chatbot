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
    console.log(`✅ Successfully connected to ChromaDB!`);
    console.log(`📊 Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`  - ${collection.name} (${collection.id})`);
    });
    
    // Check for our target collection
    const targetCollection = collections.find(c => c.name === 'milea_vineyard_knowledge');
    if (targetCollection) {
      console.log(`✅ Found target collection: milea_vineyard_knowledge (${targetCollection.id})`);
      
      // Get collection details
      const collection = await client.getCollection({
        name: 'milea_vineyard_knowledge'
      });
      
      const count = await collection.count();
      console.log(`📚 Collection has ${count} documents`);
    } else {
      console.log(`❌ Target collection 'milea_vineyard_knowledge' not found`);
      
      // Create the collection
      console.log(`🔄 Creating collection...`);
      await client.createCollection({
        name: 'milea_vineyard_knowledge',
        metadata: { description: 'Milea Estate Vineyard Knowledge Base' }
      });
      console.log(`✅ Collection created`);
    }
  } catch (error) {
    console.error(`❌ ChromaDB connection error: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('  This suggests ChromaDB server is not running or not accessible.');
      console.error('  Please ensure ChromaDB server is started.');
    }
  }
}

testChromaConnection().catch(console.error);