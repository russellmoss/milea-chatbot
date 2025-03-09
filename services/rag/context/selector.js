// services/rag/context/selector.js
const logger = require('../../../utils/logger');

/**
 * Select final documents to use for context
 * @param {Object} groupedDocs - Grouped documents
 * @param {Array} scoredDocs - All scored documents
 * @param {Object} queryInfo - Query classification
 * @returns {Array} - Final selected documents
 */
function selectDocuments(groupedDocs, scoredDocs, queryInfo) {
  // If we have multiple wines for a generic wine query, return all the unique wine docs
  if (groupedDocs.uniqueWines && groupedDocs.uniqueWines.length > 1) {
    return groupedDocs.uniqueWines.map(wine => wine.doc);
  }
  
  // Start with primary doc if available
  const docsToUse = groupedDocs.primaryDoc ? [groupedDocs.primaryDoc] : [];
  
  // If we have a primary doc, add other top scoring docs that aren't other vintages of the same wine
  if (groupedDocs.primaryDoc) {
    const primarySource = groupedDocs.primaryDoc.metadata.source;
    const otherVintageSources = new Set((groupedDocs.otherVintages || []).map(v => v.source));
    
    for (const item of scoredDocs) {
      const doc = item.doc;
      if (doc.metadata.source !== primarySource && !otherVintageSources.has(doc.metadata.source)) {
        docsToUse.push(doc);
        if (docsToUse.length >= 3) break; // Limit to 3 docs total
      }
    }
  } else if (scoredDocs.length > 0) {
    // If no primary doc from grouping, use top scored docs
    docsToUse.push(...scoredDocs.slice(0, 3).map(item => item.doc));
  }
  
  return docsToUse;
}

module.exports = {
  selectDocuments
};