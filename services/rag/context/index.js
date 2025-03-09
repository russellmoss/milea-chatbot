// services/rag/context/index.js
const logger = require('../../../utils/logger');
const { searchSimilarDocuments } = require('../../../utils/vectorStore');
const { cleanHtmlContent } = require('./utils/htmlCleaner');
const { validateResults, validateGroupedDocs, determineRetrievalCount } = require('./validator');
const { scoreDocuments } = require('./scorer');
const { groupDocuments } = require('./grouper');
const { selectDocuments } = require('./selector');

/**
 * Assemble context for a query based on its classification
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @returns {Promise<Object>} - Context with relevant documents
 */
async function assembleContext(query, queryInfo) {
  try {
    // Determine number of documents to retrieve based on query type
    const k = determineRetrievalCount(queryInfo);
    
    // Retrieve documents from vector store
    const semanticResults = await searchSimilarDocuments(query, k);
    logger.info(`Retrieved ${semanticResults.length} documents from vector store`);
    
    // ✅ IMPROVED: Add strict validation for wine documents
    // This ensures we only return actual wines from our knowledge base
    const validatedResults = validateResults(semanticResults, queryInfo, query);
    logger.info(`After validation: ${validatedResults.length} valid documents`);
    
    // Score and filter documents
    const scoredDocs = scoreDocuments(validatedResults, query, queryInfo);
    
    // Sort by score (highest first)
    scoredDocs.sort((a, b) => b.score - a.score);
    
    // Log top matches for debugging
    logger.info('Top document matches:');
    scoredDocs.slice(0, 3).forEach((item, i) => {
      logger.info(`  ${i+1}. Score: ${item.score}, Source: ${item.doc.metadata.source}`);
    });
    
    // Group documents by type (e.g., wine vintages)
    const groupedDocs = groupDocuments(scoredDocs, queryInfo);
    
    // ✅ IMPROVED: Verify wines exist in our knowledge base before offering choices
    const validatedGroupedDocs = validateGroupedDocs(groupedDocs, queryInfo);
    
    // Select final documents to use for context
    const finalDocuments = selectDocuments(validatedGroupedDocs, scoredDocs, queryInfo);
    
    // Clean HTML content in documents when constructing context
    const documents = finalDocuments.map(doc => ({
      ...doc,
      pageContent: cleanHtmlContent(doc.pageContent)
    }));
    
    return {
      query,
      queryInfo,
      documents,
      otherVintages: validatedGroupedDocs.otherVintages || [],
      allDocuments: scoredDocs.map(item => ({
        ...item.doc,
        pageContent: cleanHtmlContent(item.doc.pageContent)
      })),
      multipleWines: validatedGroupedDocs.uniqueWines && validatedGroupedDocs.uniqueWines.length > 1
    };
  } catch (error) {
    logger.error('Error assembling context:', error);
    return {
      query,
      queryInfo,
      documents: [],
      otherVintages: [],
      allDocuments: [],
      multipleWines: false
    };
  }
}

module.exports = {
  assembleContext,
  // Re-export functions that might be useful elsewhere
  cleanHtmlContent
};