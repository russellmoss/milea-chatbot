// scripts/clear-cache.js
require('dotenv').config();
const { clearQueryCache, getCacheStats } = require('../services/rag/ragService');

async function clearCache() {
  console.log('🧹 Clearing query cache...');
  
  // Get stats before
  const beforeStats = getCacheStats();
  console.log('📊 Before clearing:', beforeStats);
  
  // Clear cache
  clearQueryCache();
  
  // Get stats after
  const afterStats = getCacheStats();
  console.log('📊 After clearing:', afterStats);
  
  console.log('✅ Cache cleared successfully!');
}

clearCache();