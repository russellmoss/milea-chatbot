require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');

async function indexWineClub() {
  try {
    console.log('🍷 Starting wine club document indexing...');
    
    // Path to the wine club document - UPDATED with correct path
    const wineClubPath = path.join(__dirname, '..', 'knowledge', 'wine club', 'wine-club.md');
    
    if (!fs.existsSync(wineClubPath)) {
      console.error(`❌ Wine club document not found at: ${wineClubPath}`);
      return;
    }
    
    console.log(`📄 Found wine club document: ${wineClubPath}`);
    
    // Read the content
    const content = fs.readFileSync(wineClubPath, 'utf8');
    console.log(`📝 Read ${content.length} characters from document`);
    
    // Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Initialize or get ChromaDB collection
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: 'milea_vineyard_knowledge' }
    );
    
    // Create document chunks (using a larger chunk size for this document)
    const docs = [{
      pageContent: content,
      metadata: {
        source: 'wine-club.md',
        contentType: 'club'
      }
    }];
    
    // Add document to the vector store
    await vectorStore.addDocuments(docs);
    
    console.log('✅ Wine club document successfully indexed!');
  } catch (error) {
    console.error('❌ Error indexing wine club document:', error);
  }
}

indexWineClub()
  .then(() => {
    console.log('🏁 Indexing process complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error during indexing:', error);
    process.exit(1);
  });