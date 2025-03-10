// scripts/test-wine-club.js
require('dotenv').config();
const axios = require('axios');

async function testRagWineClub() {
  try {
    console.log('🧪 Testing RAG response for wine club query...');
    
    const response = await axios.post('http://localhost:8080/rag-chat', {
      message: 'Tell me about the wine club membership options'
    });
    
    console.log('📝 Response from RAG system:');
    console.log('-----------------------------');
    console.log(response.data.response);
    console.log('-----------------------------');
    console.log('📚 Sources:', response.data.sources);
  } catch (error) {
    console.error('❌ Error testing RAG:', error.message);
  }
}

testRagWineClub();