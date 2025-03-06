require('dotenv').config();
const axios = require('axios');

// Simple test to verify the RAG system is working correctly
async function testRAG() {
  try {
    console.log('🧪 Testing RAG response for "2022 Reserve Cabernet Franc"...');
    
    const response = await axios.post('http://localhost:8080/rag-chat', {
      message: '2022 Reserve Cabernet Franc'
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

testRAG();