// services/rag/domains/wineHandler.js
// Enhanced wine-specific query handling

const logger = require('../../../utils/logger');
const { generateResponse } = require('../responseGenerator');
const { extractWinesFromKnowledgeBase } = require('../utils/knowledgeUtils');

/**
 * Handle wine-related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.wine(`Processing wine query: "${query}"`);
    
    // ✅ IMPROVED: Get verified wines from knowledge base
    const knownWines = await extractWinesFromKnowledgeBase();
    logger.wine(`Loaded ${knownWines.length} verified wines from knowledge base`);
    
    // Check if we found multiple wines for a generic query
    if (context.multipleWines) {
      logger.wine(`Multiple wines found for generic query, generating clarification response`);
      return generateMultipleWinesResponse(query, queryInfo, context, knownWines);
    }
    
    // Special handling for specific wine subtypes
    switch (queryInfo.subtype) {
      case 'specific':
        return handleSpecificWineQuery(query, queryInfo, context, knownWines);
      case 'generic':
        return handleGenericWineQuery(query, queryInfo, context, knownWines);
      default:
        // For general wine queries, pass known wines to response generator
        return generateResponse(query, queryInfo, context, { knownWines });
    }
  } catch (error) {
    logger.error('Error in wine handler:', error);
    return {};
  }
}

/**
 * Handle specific wine queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @param {Array} knownWines - List of verified wines
 * @returns {Promise<Object>} - Response for specific wine
 */
async function handleSpecificWineQuery(query, queryInfo, context, knownWines) {
  // Extract wine information
  const primaryDoc = context.documents[0];
  
  if (!primaryDoc) {
    // ✅ IMPROVED: Suggest only known wines when the requested wine isn't found
    const suggestions = getSimilarWineSuggestions(queryInfo.specificWine, knownWines);
    
    return {
      response: `I'm sorry, but I couldn't find specific information about the ${queryInfo.specificWine} you asked about. ${suggestions}`,
      sources: []
    };
  }
  
  // Use the response generator with verified wine list
  return generateResponse(query, queryInfo, context, { knownWines });
}

/**
 * Handle generic wine queries (e.g., red wine, rosé)
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @param {Array} knownWines - List of verified wines
 * @returns {Promise<Object>} - Response for generic wine query
 */
async function handleGenericWineQuery(query, queryInfo, context, knownWines) {
  // Filter wines by the terms in the query
  const matchingWines = knownWines.filter(wine => {
    const wineName = wine.name.toLowerCase();
    return queryInfo.wineTerms.some(term => wineName.includes(term));
  });
  
  logger.wine(`Found ${matchingWines.length} known wines matching terms: ${queryInfo.wineTerms.join(', ')}`);
  
  // Pass the filtered list of known wines to the response generator
  return generateResponse(query, queryInfo, context, { 
    knownWines,
    matchingWines
  });
}

/**
 * Generate a response for multiple matching wines
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @param {Array} knownWines - List of verified wines
 * @returns {Promise<Object>} - Clarification response
 */
async function generateMultipleWinesResponse(query, queryInfo, context, knownWines) {
  // Filter only wines that match the query terms
  const matchingWines = knownWines.filter(wine => {
    const wineName = wine.name.toLowerCase();
    return queryInfo.wineTerms.some(term => wineName.includes(term));
  });
  
  // Use the response generator with multiple wines flag and verified wines
  return generateResponse(query, queryInfo, context, { 
    isMultipleWines: true, 
    knownWines: matchingWines.length > 0 ? matchingWines : knownWines
  });
}

/**
 * Get wine suggestions for when a specific wine isn't found
 * @param {string} requestedWine - The wine the user asked about
 * @param {Array} knownWines - List of verified wines
 * @returns {string} - Suggestion text
 */
function getSimilarWineSuggestions(requestedWine, knownWines) {
  if (!knownWines || knownWines.length === 0) {
    return "Would you like to know about our wine selection instead?";
  }
  
  // Extract key terms from the requested wine
  const terms = requestedWine.toLowerCase().split(/\s+/).filter(term => term.length > 3);
  
  // Score each known wine by similarity
  const scoredWines = knownWines.map(wine => {
    const name = wine.name.toLowerCase();
    let score = 0;
    
    // Score based on matching terms
    terms.forEach(term => {
      if (name.includes(term)) {
        score += 10;
      }
    });
    
    // Boost score for similar wine types
    if ((requestedWine.includes('cabernet') || requestedWine.includes('cab')) && 
        (name.includes('cabernet') || name.includes('cab'))) {
      score += 5;
    } else if (requestedWine.includes('chardonnay') && name.includes('chardonnay')) {
      score += 5;
    } else if ((requestedWine.includes('rosé') || requestedWine.includes('rose')) && 
              (name.includes('rosé') || name.includes('rose'))) {
      score += 5;
    }
    
    return { wine, score };
  });
  
  // Sort by score and get top matches
  const topMatches = scoredWines
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.wine);
  
  if (topMatches.length === 0) {
    return "Would you like to know about our wine selection instead?";
  }
  
  // Create suggestion text
  return `However, you might be interested in these wines from our collection:\n\n` +
    topMatches.map(wine => `- ${wine.vintage ? wine.vintage + ' ' : ''}${wine.name}`).join('\n');
}

module.exports = {
  handleQuery
};