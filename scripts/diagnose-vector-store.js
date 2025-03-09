// scripts/diagnose-vector-store.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { searchSimilarDocuments } = require('../utils/vectorStore');

async function diagnoseVectorStore() {
  console.log('🔍 Starting vector store diagnosis');
  
  // Step 1: Load documents directly from the filesystem
  const wineDir = path.join(__dirname, '../knowledge/wine');
  if (!fs.existsSync(wineDir)) {
    console.error('❌ Wine directory not found!');
    return;
  }
  
  const wineFiles = fs.readdirSync(wineDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(wineDir, file));
  
  console.log(`📚 Found ${wineFiles.length} wine documents in filesystem`);
  
  // Step 2: Test retrieving these documents from the vector store
  for (const [index, file] of wineFiles.entries()) {
    const filename = path.basename(file);
    console.log(`\n🔍 Testing document ${index + 1}/${wineFiles.length}: ${filename}`);
    
    // Read file content
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extract title as query
    const titleMatch = content.match(/^#\s+(.*?)\s*$/m);
    const title = titleMatch ? titleMatch[1] : filename;
    
    // Try to retrieve using the title as query
    console.log(`📝 Using title as query: "${title}"`);
    const results = await searchSimilarDocuments(title, 5);
    
    // Check if original document is found
    const found = results.some(doc => doc.metadata.source.includes(filename));
    
    if (found) {
      console.log(`✅ Document found in vector store results`);
    } else {
      console.log(`❌ Document NOT found in vector store results`);
      console.log(`📊 Results returned: ${results.length}`);
      if (results.length > 0) {
        console.log(`📋 Top result sources:`);
        results.forEach((doc, i) => {
          console.log(`   ${i+1}. ${doc.metadata.source}`);
        });
      }
    }
  }
  
  // Step 3: Test specific wine queries
  const testQueries = [
    "reserve cabernet franc",
    "farmhouse cabernet franc",
    "queen of the meadow rosé",
    "proceedo rosé"
  ];
  
  console.log('\n🧪 Testing specific wine queries');
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    const results = await searchSimilarDocuments(query, 5);
    console.log(`📊 Results returned: ${results.length}`);
    
    if (results.length > 0) {
      console.log(`📋 Top result sources:`);
      results.forEach((doc, i) => {
        console.log(`   ${i+1}. ${doc.metadata.source}`);
      });
    } else {
      console.log(`❌ No results found`);
    }
  }
}

diagnoseVectorStore().catch(err => {
  console.error('Diagnosis failed:', err);
});