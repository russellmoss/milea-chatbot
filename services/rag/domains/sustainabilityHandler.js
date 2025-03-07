// services/rag/domains/sustainabilityHandler.js
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
    
    // Check if we have domain-specific documents
    const hasDomainDocs = context.documents.some(doc => 
      doc.metadata.source.toLowerCase().includes('sustainability') ||
      doc.metadata.contentType === 'sustainability'
    );
    
    if (!hasDomainDocs) {
      logger.warning('No sustainability-specific documents found for query');
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