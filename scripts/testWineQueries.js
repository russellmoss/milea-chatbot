// scripts/testWineQueries.js
require('dotenv').config();
const { generateRAGResponse } = require('../services/rag/ragService');
const { classifyQuery } = require('../services/rag/queryClassifier');
const logger = require('../utils/logger');

// Test cases focusing on problematic wine queries
const testQueries = [
  "Tell me about the Reserve Cabernet Franc",
  "What is the Farmhouse Cabernet Franc like?",
  "Do you have a Proceedo Rosé?",
  "Tell me about the Proceedo white wine",
  "What does your Queen of the Meadow taste like?",
  "I'm interested in your Cabernet Franc wines",
  "Tell me about your rosé wines"
];

async function testWineQueries() {
  console.log('🧪 Testing RAG handling of wine queries...\n');
  
  for (const query of testQueries) {
    console.log(`📝 Testing query: "${query}"`);
    
    // First test classification
    const queryInfo = classifyQuery(query);
    console.log(`🏷️ Classified as: ${JSON.stringify(queryInfo, null, 2)}`);
    
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
  
  console.log('✅ Wine query testing complete!');
}

// Run the test
testWineQueries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failure:', err);
    process.exit(1);
  });