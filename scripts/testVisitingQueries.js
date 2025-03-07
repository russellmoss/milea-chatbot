// scripts/testVisitingQueries.js
require('dotenv').config();
const { generateRAGResponse } = require('../services/ragService');
const { classifyQueryType } = require('../utils/queryHelpers');

// Sample visiting-related queries to test
const testQueries = [
  "What are your visiting hours?",
  "How do I get to Milea Estate Vineyard?",
  "Do I need a reservation for wine tasting?",
  "Where should I stay when visiting your vineyard?",
  "What attractions are near Milea Estate?",
  "What tasting experiences do you offer?"
];

async function testVisitingQueries() {
  console.log('🧪 Testing RAG handling of visiting queries...\n');
  
  for (const query of testQueries) {
    console.log(`📝 Testing query: "${query}"`);
    
    // Classify query
    const queryType = classifyQueryType(query);
    console.log(`🏷️ Classified as: ${queryType}`);
    
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
  
  console.log('✅ Visiting query testing complete!');
}

// Run the test
testVisitingQueries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failure:', err);
    process.exit(1);
  });