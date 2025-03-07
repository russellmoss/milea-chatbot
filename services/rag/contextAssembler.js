// services/rag/contextAssembler.js
// Enhanced context assembly with strict validation

const logger = require('../../utils/logger');
const { searchSimilarDocuments } = require('../../utils/vectorStore');

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
    const validatedResults = validateResults(semanticResults, queryInfo);
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
    
    return {
      query,
      queryInfo,
      documents: finalDocuments,
      otherVintages: validatedGroupedDocs.otherVintages || [],
      allDocuments: scoredDocs.map(item => item.doc),
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

/**
 * ✅ NEW FUNCTION: Validate retrieved results to ensure they match our knowledge base
 * @param {Array} results - Raw results from vector store
 * @param {Object} queryInfo - Query classification information 
 * @returns {Array} - Validated results that exist in our knowledge base
 */
function validateResults(results, queryInfo) {
  // For specific wine queries, be extra strict in validation
  if (queryInfo.type === 'wine' && queryInfo.isSpecificWine) {
    // If it's a confirmed wine from our list, check that documents match the pattern
    if (queryInfo.isConfirmedWine && queryInfo.winePattern) {
      const validResults = results.filter(doc => {
        const source = doc.metadata.source.toLowerCase();
        return source.includes(queryInfo.winePattern);
      });
      
      // If we found valid matches, return only those
      if (validResults.length > 0) {
        logger.wine(`Found ${validResults.length} documents matching confirmed wine: ${queryInfo.specificWine}`);
        return validResults;
      }
    }
  }
  
  // For wine queries looking for category (cab franc, rosé, etc)
  if (queryInfo.type === 'wine' && queryInfo.subtype === 'generic' && queryInfo.wineTerms.length > 0) {
    // Only return documents that actually contain the wine term in their source or content
    return results.filter(doc => {
      const source = doc.metadata.source.toLowerCase();
      const content = doc.pageContent.toLowerCase();
      
      // Check if any wine term is contained in source or content
      return queryInfo.wineTerms.some(term => 
        source.includes(term) || content.includes(term)
      );
    });
  }
  
  // For other query types, return all results
  return results;
}

/**
 * ✅ NEW FUNCTION: Validate grouped docs to ensure we're only offering real wines
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

/**
 * Determine how many documents to retrieve based on query type
 * @param {Object} queryInfo - Query classification information
 * @returns {number} - Number of documents to retrieve
 */
function determineRetrievalCount(queryInfo) {
  switch (queryInfo.type) {
    case 'wine':
      return queryInfo.subtype === 'specific' ? 8 : 12; // More for generic wine queries
    case 'club':
      return 5;
    case 'visiting':
      return 10; // More for visiting to ensure comprehensive coverage
    case 'merchandise':
      return 8;
    default:
      return 8;
  }
}

/**
 * Score documents based on relevance to query
 * @param {Array} documents - Documents retrieved from vector store
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @returns {Array} - Documents with relevance scores
 */
function scoreDocuments(documents, query, queryInfo) {
  // Process query for keyword matching
  const queryTerms = query.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .split(/\s+/) // Split by whitespace
    .filter(term => term.length > 3); // Only keep terms longer than 3 chars
  
  logger.info(`Extracted keywords: ${queryTerms.join(', ')}`);
  
  return documents.map(doc => {
    const source = doc.metadata.source.toLowerCase();
    const content = doc.pageContent.toLowerCase();
    const contentType = doc.metadata.contentType || 'unknown';
    
    // Calculate base score from keyword matches
    let score = calculateKeywordScore(source, content, queryTerms);
    
    // Apply domain-specific scoring boosts
    score = applyDomainScoring(score, doc, queryInfo, source, content);
    
    // Extract metadata from document
    const metadata = extractDocumentMetadata(doc, source, content);
    
    return {
      doc,
      score,
      ...metadata
    };
  }).filter(item => item.score > 0); // Only keep items with a positive score
}

/**
 * Calculate keyword match score
 * @param {string} source - Document source filename
 * @param {string} content - Document content
 * @param {Array} queryTerms - Extracted query keywords
 * @returns {number} - Keyword match score
 */
function calculateKeywordScore(source, content, queryTerms) {
  let keywordScore = 0;
  
  for (const term of queryTerms) {
    // Check filename match (gives higher score)
    if (source.includes(term)) {
      keywordScore += 10;
    }
    
    // Check content match
    if (content.includes(term)) {
      keywordScore += 5;
    }
  }
  
  return keywordScore;
}

/**
 * Apply domain-specific scoring boosts
 * @param {number} score - Base score
 * @param {Object} doc - Document object
 * @param {Object} queryInfo - Query classification
 * @param {string} source - Document source
 * @param {string} content - Document content
 * @returns {number} - Modified score with domain-specific boosts
 */
function applyDomainScoring(score, doc, queryInfo, source, content) {
  let newScore = score;
  
  // Wine club scoring boosts
  if (queryInfo.type === 'club' && source.includes('wine-club')) {
    newScore += 200; // Massive boost for club documents in club queries
  }
  
  // Wine scoring boosts
  if (queryInfo.type === 'wine') {
    // Boost wine products
    if (source.startsWith('wine_')) {
      newScore += 35;
      
      // Special case for rosé queries
      if ((queryInfo.wineTerms && (queryInfo.wineTerms.includes('rose') || queryInfo.wineTerms.includes('rosé'))) && 
          (source.includes('rose') || source.includes('rosé'))) {
        newScore += 50;
      }
      
      // Boost for specific wine queries
      if (queryInfo.isSpecificWine && queryInfo.winePattern && source.includes(queryInfo.winePattern)) {
        newScore += 60;
      }
    }
    
    // General wine boost
    if (queryInfo.subtype === 'general' && source.startsWith('wine_')) {
      newScore += 15;
    }
  }
  
  // Visiting scoring boosts
  if (queryInfo.type === 'visiting') {
    // Base boost for visiting content
    if (doc.metadata.contentType === 'visiting' || 
        source.includes('visiting') || 
        source.includes('directions') || 
        source.includes('hours')) {
      newScore += 100;
    }
    
    // Subtype-specific boosts
    if (queryInfo.subtype === 'visiting-hours' && source.includes('hours')) {
      newScore += 50;
    } else if (queryInfo.subtype === 'visiting-directions' && source.includes('directions')) {
      newScore += 50;
    } else if (queryInfo.subtype === 'visiting-reservations' && source.includes('reservation')) {
      newScore += 50;
    } else if (queryInfo.subtype === 'visiting-accommodations' && source.includes('accommodations')) {
      newScore += 50;
    } else if (queryInfo.subtype === 'visiting-attractions' && source.includes('attractions')) {
      newScore += 50;
    } else if (queryInfo.subtype === 'visiting-experiences' && source.includes('tasting_experiences')) {
      newScore += 50;
    }
  }
  
  // Merchandise scoring boosts
  if (queryInfo.type === 'merchandise' && 
      (source.includes('merchandise') || content.includes('merchandise'))) {
    newScore += 100;
  }
  
  return newScore;
}

/**
 * Extract metadata from document
 * @param {Object} doc - Document object
 * @param {string} source - Document source
 * @param {string} content - Document content
 * @returns {Object} - Extracted metadata
 */
function extractDocumentMetadata(doc, source, content) {
  // Extract wine metadata if applicable
  let vintage = 0;
  let wineName = "";
  let isAvailable = false;
  
  // Extract vintage year from filename or content
  const vintageMatch = source.match(/^wine_(\d{4}|NV)-/) || content.match(/^# (\d{4}|NV) /);
  if (vintageMatch) {
    // If it's NV (non-vintage), store as string "NV", otherwise parse the year as integer
    vintage = vintageMatch[1] === "NV" ? "NV" : parseInt(vintageMatch[1]);
  }
  
  // Extract wine name from title in content
  const titleMatch = content.match(/^# (?:\d{4}|NV)?\s?(.+)/);
  if (titleMatch) {
    wineName = titleMatch[1].trim();
  } else {
    // Fallback - try to extract name from filename
    const nameMatch = source.match(/^wine_(?:\d{4}|NV)-(.+?)-[0-9a-f]{8}/);
    if (nameMatch) {
      wineName = nameMatch[1].replace(/-/g, ' ').trim();
    }
  }
  
  // Check availability - both admin and web status must be "Available"
  isAvailable = content.includes("Status: Available / Available");
  
  return {
    vintage,
    wineName,
    isAvailable,
    contentType: doc.metadata.contentType || 'unknown'
  };
}

/**
 * Group documents by type (e.g., wine vintages)
 * @param {Array} scoredDocs - Documents with scores and metadata
 * @param {Object} queryInfo - Query classification
 * @returns {Object} - Grouped documents
 */
function groupDocuments(scoredDocs, queryInfo) {
  // For wine queries, group by vintages
  if (queryInfo.type === 'wine') {
    return groupWineDocuments(scoredDocs, queryInfo);
  }
  
  // For other query types, return standard grouping
  return {
    primaryDoc: scoredDocs.length > 0 ? scoredDocs[0].doc : null,
    otherDocs: scoredDocs.slice(1).map(item => item.doc),
    otherVintages: []
  };
}

/**
 * Group wine documents by wine type and vintage
 * @param {Array} scoredDocs - Scored wine documents
 * @param {Object} queryInfo - Query classification
 * @returns {Object} - Grouped wine documents
 */
function groupWineDocuments(scoredDocs, queryInfo) {
  // For generic wine queries, check for multiple matching wines
  if (queryInfo.subtype === 'generic' && scoredDocs.length > 1) {
    // Extract unique wine names (excluding vintages)
    const uniqueWines = [];
    const seenWineNames = new Set();
    
    for (const item of scoredDocs) {
      // Skip items without proper names
      if (!item.wineName) continue;
      
      // Normalize wine name for comparison and de-duplication
      // Only use the basic wine name - strip vintage year and "glass" suffix
      const normalizedName = item.wineName
        .toLowerCase()
        .replace(/\b(19|20)\d{2}\b/, '') // Remove vintage year
        .replace(/\s+glass$/, '')        // Remove "glass" suffix
        .trim();
      
      // Create a cleaner display name without duplicate information
      const displayName = item.wineName
        .replace(/farmhouse\s+cab(ernet)?\s+franc\s+glass/i, 'Farmhouse Cabernet Franc (Glass)')
        .replace(/\s+glass$/i, ' (Glass)');
      
      // Skip duplicates - using normalized name for comparison
      if (seenWineNames.has(normalizedName)) continue;
      
      // Add to unique wines list
      uniqueWines.push({
        name: displayName,    // Cleaner display name for the user
        vintage: item.vintage,
        isAvailable: item.isAvailable,
        doc: item.doc
      });
      
      seenWineNames.add(normalizedName);
    }
    
    // If we have multiple unique wines, return them
    if (uniqueWines.length > 1) {
      logger.wine(`Found ${uniqueWines.length} unique wine names for generic wine query`);
      return {
        uniqueWines,
        multipleWines: true
      };
    }
  }
  
  // For specific wine queries or if we only found one wine, group by vintage
  const wineGroups = {};
  
  for (const item of scoredDocs) {
    const source = item.doc.metadata.source.toLowerCase();
    // Extract base wine name (remove vintage year and ID)
    const baseNameMatch = source.match(/wine_([a-z0-9-]+?)-\d{4}-/);
    
    if (baseNameMatch) {
      const baseName = baseNameMatch[1];
      if (!wineGroups[baseName]) {
        wineGroups[baseName] = [];
      }
      wineGroups[baseName].push(item);
    } else {
      // If we can't extract base name, just use the source
      const simplifiedSource = source.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, '');
      if (!wineGroups[simplifiedSource]) {
        wineGroups[simplifiedSource] = [];
      }
      wineGroups[simplifiedSource].push(item);
    }
  }
  
  // Find the wine group with the highest scored document
  let primaryDoc = null;
  let otherVintages = [];
  
  if (Object.keys(wineGroups).length > 0 && scoredDocs.length > 0) {
    const topItemSource = scoredDocs[0].doc.metadata.source.toLowerCase();
    let bestGroup = null;
    
    for (const [groupName, items] of Object.entries(wineGroups)) {
      if (topItemSource.includes(groupName)) {
        bestGroup = groupName;
        break;
      }
    }
    
    if (bestGroup && wineGroups[bestGroup].length > 0) {
      // Sort items by: 1) availability, 2) vintage year
      wineGroups[bestGroup].sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1; // Available wines first
        }
        return b.vintage - a.vintage; // Then by newest vintage
      });
      
      // Primary document is newest available or just newest if none available
      primaryDoc = wineGroups[bestGroup][0].doc;
      
      // Other vintages (exclude the primary one)
      otherVintages = wineGroups[bestGroup]
        .slice(1)
        .map(item => ({
          source: item.doc.metadata.source,
          vintage: item.vintage,
          isAvailable: item.isAvailable
        }));
      
      logger.wine(`Selected primary vintage: ${wineGroups[bestGroup][0].vintage} (Available: ${wineGroups[bestGroup][0].isAvailable})`);
      logger.wine(`Other vintages found: ${otherVintages.length}`);
    }
  }
  
  return {
    primaryDoc,
    otherVintages,
    wineGroups
  };
}

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
  assembleContext,
  validateResults,
  validateGroupedDocs
};