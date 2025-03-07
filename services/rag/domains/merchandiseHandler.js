// services/rag/domains/merchandiseHandler.js
// Merchandise query handling

const logger = require('../../../utils/logger');

/**
 * Handle merchandise related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing merchandise query: "${query}"`);
    
    // Check if we have merchandise-specific documents
    const hasMerchandiseDocs = context.documents.some(doc => 
      doc.metadata.source.toLowerCase().includes('merchandise') ||
      (doc.metadata.contentType === 'merchandise')
    );
    
    if (!hasMerchandiseDocs) {
      logger.warning('No merchandise-specific documents found for merchandise query');
    }
    
    // For now, defer to the standard response generator
    return {};
  } catch (error) {
    logger.error('Error in merchandise handler:', error);
    return {};
  }
}

module.exports = {
  handleQuery
};