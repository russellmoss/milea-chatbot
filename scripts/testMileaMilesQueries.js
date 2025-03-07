// scripts/testMileaMilesQueries.js
require('dotenv').config();
const { generateRAGResponse } = require('../services/rag/ragService');

// Sample loyalty-related queries to test
const testQueries = [
  "What is Milea Miles?",
  "How do I earn points in the rewards program?",
  "What can I redeem my Milea Miles points for?",
  "How many points do I need for a free tasting?",
  "Tell me about the loyalty program",
  "What's the difference between basic and wine club member points?"
];

async function testMileaMilesQueries() {
  console.log('🧪 Testing RAG handling of Milea Miles queries...\n');
  
  for (const query of testQueries) {
    console.log(`📝 Testing query: "${query}"`);
    
    try {
      // Generate response
      console.log('🔄 Generating response...');
      const response = await generateRAGResponse(query);
      
      console.log('\n📊 Results:');
      console.log('Sources used:');
      response.sources.forEach(source => console.log(`  - ${source}`));
      
      console.log('\n📄 Sample of response:');
      // Print first 200 characters of response
      console.log(response.response.substring(0, 200) + '...');
      
      console.log('\n-------------------------------------------\n');
      
      // Delay between queries to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error processing query "${query}":`, error);
    }
  }
  
  console.log('✅ Milea Miles query testing complete!');
}

// Run the test
testMileaMilesQueries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failure:', err);
    process.exit(1);
  });