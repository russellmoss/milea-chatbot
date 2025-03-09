// services/rag/context/validator.js
const logger = require('../../../utils/logger');

/**
 * Determine how many documents to retrieve based on query type
 * @param {Object} queryInfo - Query classification information
 * @returns {number} - Number of documents to retrieve
 */
function determineRetrievalCount(queryInfo) {
  // Reduce the number of documents retrieved
  switch (queryInfo.type) {
    case 'wine':
      return queryInfo.subtype === 'specific' ? 5 : 8; // Reduced from 8/12
    case 'club':
      return 3; // Reduced from 5
    case 'visiting':
      return 5; // Reduced from 10
    case 'merchandise':
      return 4; // Reduced from 8
    default:
      return 5; // Reduced from 8
  }
}

/**
 * Validate retrieved results to ensure they match our knowledge base
 * @param {Array} results - Raw results from vector store
 * @param {Object} queryInfo - Query classification information
 * @param {string} query - Original user query for fuzzy matching
 * @returns {Array} - Validated results that exist in our knowledge base
 */
function validateResults(results, queryInfo, query) {
  // At the start of the function
  logger.info(`Starting validation with ${results.length} initial documents for query type: ${queryInfo.type}`);
  
  // For wine queries, add detailed logging
  if (queryInfo.type === 'wine') {
    // Log all document sources before filtering
    logger.wine(`Pre-validation document sources: ${results.map(doc => doc.metadata.source).join(', ')}`);
    
    // If specific wine query, log pattern info
    if (queryInfo.isSpecificWine && queryInfo.winePattern) {
      logger.wine(`Looking for pattern '${queryInfo.winePattern}' in documents`);
    }
    
    // If user has typed any variation of "reserve cab franc"
    if (query.toLowerCase().match(/reserve\s+(cab|cabernet)\s+franc/)) {
      logger.wine(`Reserve Cab Franc pattern match: ${query}`);
      
      // Prioritize documents matching reserve cabernet franc
      const reserveCabFrancDocs = results.filter(doc => 
        doc.metadata.source.toLowerCase().includes('reserve-cabernet-franc')
      );
      
      if (reserveCabFrancDocs.length > 0) {
        logger.wine(`Found ${reserveCabFrancDocs.length} Reserve Cabernet Franc docs with sources: ${reserveCabFrancDocs.map(doc => doc.metadata.source).join(', ')}`);
        return reserveCabFrancDocs;
      } else {
        logger.wine(`⚠️ No Reserve Cabernet Franc docs found! Original sources: ${results.map(doc => doc.metadata.source).join(', ')}`);
      }
    }
    
    // Add other common variations for Farmhouse Cabernet Franc
    if (query.toLowerCase().match(/farmhouse\s+(cab|cabernet)\s+franc/) || 
        query.toLowerCase().includes("farm house") && query.toLowerCase().includes("franc")) {
      logger.wine(`Farmhouse Cab Franc pattern match: ${query}`);
      
      const farmhouseDocs = results.filter(doc => 
        doc.metadata.source.toLowerCase().includes('farmhouse-cabernet-franc')
      );
      
      if (farmhouseDocs.length > 0) {
        logger.wine(`Found ${farmhouseDocs.length} Farmhouse Cabernet Franc docs with sources: ${farmhouseDocs.map(doc => doc.metadata.source).join(', ')}`);
        return farmhouseDocs;
      } else {
        logger.wine(`⚠️ No Farmhouse Cabernet Franc docs found! Original sources: ${results.map(doc => doc.metadata.source).join(', ')}`);
      }
    }
    
    // Handle variations of "Proceedo"
    if (query.toLowerCase().match(/proce+do|proceedo|proseco|prosecco/)) {
      logger.wine(`Proceedo pattern match: ${query}`);
      
      const proceedoDocs = results.filter(doc => 
        doc.metadata.source.toLowerCase().includes('proceedo')
      );
      
      if (proceedoDocs.length > 0) {
        logger.wine(`Found ${proceedoDocs.length} Proceedo wine docs with sources: ${proceedoDocs.map(doc => doc.metadata.source).join(', ')}`);
        return proceedoDocs;
      } else {
        logger.wine(`⚠️ No Proceedo wine docs found! Original sources: ${results.map(doc => doc.metadata.source).join(', ')}`);
      }
    }
  }
  
  // For specific wine queries, be extra strict in validation
  if (queryInfo.type === 'wine' && queryInfo.isSpecificWine) {
    // If it's a confirmed wine from our list, check that documents match the pattern
    if (queryInfo.isConfirmedWine && queryInfo.winePattern) {
      logger.wine(`Strict validation for confirmed wine: ${queryInfo.specificWine} with pattern ${queryInfo.winePattern}`);
      
      const validResults = results.filter(doc => {
        const source = doc.metadata.source.toLowerCase();
        return source.includes(queryInfo.winePattern);
      });
      
      // If we found valid matches, return only those
      if (validResults.length > 0) {
        logger.wine(`Found ${validResults.length} documents matching confirmed wine: ${queryInfo.specificWine}`);
        logger.wine(`Matching sources: ${validResults.map(doc => doc.metadata.source).join(', ')}`);
        return validResults;
      } else {
        logger.wine(`⚠️ No documents found matching pattern: ${queryInfo.winePattern}`);
      }
    }
  }
  
  // For wine queries looking for category (cab franc, rosé, etc)
  if (queryInfo.type === 'wine' && queryInfo.subtype === 'generic' && queryInfo.wineTerms.length > 0) {
    logger.wine(`Generic wine query with terms: ${queryInfo.wineTerms.join(', ')}`);
    
    // Only return documents that actually contain the wine term in their source or content
    const filteredResults = results.filter(doc => {
      const source = doc.metadata.source.toLowerCase();
      const content = doc.pageContent.toLowerCase();
      
      // Check if any wine term is contained in source or content
      return queryInfo.wineTerms.some(term => 
        source.includes(term) || content.includes(term)
      );
    });
    
    logger.wine(`Found ${filteredResults.length} documents matching generic wine terms`);
    if (filteredResults.length > 0) {
      logger.wine(`Matching sources: ${filteredResults.map(doc => doc.metadata.source).join(', ')}`);
    } else {
      logger.wine(`⚠️ No documents found matching generic wine terms: ${queryInfo.wineTerms.join(', ')}`);
    }
    
    return filteredResults;
  }
  
  // At the end of the function
  const validatedCount = queryInfo.type === 'wine' ? results.length : results.length;
  logger.info(`Validation complete: ${validatedCount} valid documents retained`);
  
  // For other query types, return all results
  return results;
}

/**
 * Validate grouped docs to ensure we're only offering real wines
 * @param {Object} groupedDocs - Grouped documents by wine type
 * @param {Object} queryInfo - Query classification information
 * @returns {Object} - Validated grouped documents
 */
function validateGroupedDocs(groupedDocs, queryInfo) {
  // If we have unique wines to offer as choices
  if (groupedDocs.uniqueWines && groupedDocs.uniqueWines.length > 0) {
    // ✅ STRICT VALIDATION: Only return wines that have complete documents
    // This prevents offering wines that are mentioned but not in our knowledge base
    const validatedWines = groupedDocs.uniqueWines.filter(wine => {
      // Ensure the wine has a document and content
      return wine.doc && 
             wine.doc.pageContent && 
             wine.doc.pageContent.length > 100 &&  // Has substantial content
             wine.doc.metadata && 
             wine.doc.metadata.source;
    });
    
    if (validatedWines.length > 0) {
      logger.wine(`After validation: ${validatedWines.length} valid unique wines`);
      return {
        ...groupedDocs,
        uniqueWines: validatedWines,
        multipleWines: validatedWines.length > 1
      };
    }
  }
  
  return groupedDocs;
}

module.exports = {
  determineRetrievalCount,
  validateResults,
  validateGroupedDocs
};