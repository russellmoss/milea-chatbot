// services/rag/domains/generalHandler.js
// General fallback query handling

const logger = require('../../../utils/logger');

/**
 * Handle general/fallback queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing general query: "${query}"`);
    
    // Check if we have any documents
    if (!context.documents.length) {
      logger.warning('No relevant documents found for general query');
      return {
        response: "I'm sorry, but I couldn't find any specific information about that in my knowledge base. Would you like to know about our wines, visiting the vineyard, or our wine club instead?",
        sources: []
      };
    }
    
    // For now, defer to the standard response generator
    return {};
  } catch (error) {
    logger.error('Error in general handler:', error);
    return {};
  }
}

module.exports = {
  handleQuery
};