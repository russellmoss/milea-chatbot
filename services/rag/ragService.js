// services/rag/ragService.js
// Main entry point for RAG service - now simplified with modular components

const logger = require('../../utils/logger');
const { processRagPipeline } = require('./core');
const { queryCache } = require('./cacheManager');
const { conversationTracker } = require('./conversationTracking');

/**
 * Main entry point for RAG response generation
 * @param {string} query - User's query
 * @param {Array} previousMessages - Previous messages in the conversation
 * @returns {Promise<Object>} - Generated response with sources
 */
async function generateRAGResponse(query, previousMessages = []) {
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  logger.info(`🚀 [${requestId}] Starting RAG processing for query: "${query}"`);
  logger.info(`📜 [${requestId}] Previous messages count: ${previousMessages.length}`);
  conversationTracker.logStats();
  
  try {
    return await processRagPipeline(query, previousMessages, requestId);
  } catch (error) {
    logger.error(`❌ [${requestId}] RAG Response Generation Error: ${error.message}`);
    logger.error(`🔍 [${requestId}] Error stack: ${error.stack}`);
    
    return { 
      response: "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your question.",
      sources: []
    };
  }
}

/**
 * Clear the query cache and conversation state
 * @returns {void}
 */
function clearQueryCache() {
  logger.info(`🧹 Clearing query cache and conversation state`);
  queryCache.clear();
  conversationTracker.clear();
  logger.info(`✅ Query cache and conversation state cleared`);
}

/**
 * Get cache and conversation statistics
 * @returns {Object} - Cache and conversation statistics
 */
function getCacheStats() {
  const cacheStats = queryCache.getStats();
  const conversationStats = conversationTracker.getStats();
  
  const stats = {
    ...cacheStats,
    ...conversationStats
  };
  
  logger.info(`📊 Stats: ${JSON.stringify(stats)}`);
  return stats;
}

module.exports = {
  generateRAGResponse,
  clearQueryCache,
  getCacheStats
};