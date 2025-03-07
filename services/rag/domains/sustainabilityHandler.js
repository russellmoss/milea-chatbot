// services/rag/domains/sustainabilityHandler.js
// Sustainability content handling

const logger = require('../../../utils/logger');

/**
 * Handle sustainability related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing sustainability query: "${query}"`);
    
    // Check if we have sustainability-specific documents
    const hasSustainabilityDocs = context.documents.some(doc => 
      doc.metadata.source.toLowerCase().includes('sustain') ||
      (doc.metadata.contentType === 'sustainability')
    );
    
    if (!hasSustainabilityDocs) {
      logger.warning('No sustainability-specific documents found for sustainability query');
    }
    
    // For now, defer to the standard response generator
    return {};
  } catch (error) {
    logger.error('Error in sustainability handler:', error);
    return {};
  }
}

module.exports = {
  handleQuery
};