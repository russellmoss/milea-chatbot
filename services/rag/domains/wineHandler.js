// services/rag/domains/wineHandler.js
// Enhanced wine-specific query handling with improved content extraction and debugging

const logger = require('../../../utils/logger');
const { generateResponse } = require('../responseGenerator');
const { extractWinesFromKnowledgeBase } = require('../utils/knowledgeUtils');

/**
 * Handle wine-related queries with improved content extraction
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.wine(`Processing wine query: "${query}" with ${context.documents.length} documents`);
    
    // Log document sources
    if (context.documents.length > 0) {
      logger.wine(`Wine document sources: ${context.documents.map(doc => doc.metadata.source).join(', ')}`);
    } else {
      logger.wine(`⚠️ No documents found for wine query!`);
    }
    
    // If specific wine, log the details
    if (queryInfo.isSpecificWine) {
      logger.wine(`Looking for specific wine: ${queryInfo.specificWine}, pattern: ${queryInfo.winePattern}`);
    }
    
    // Get verified wines from knowledge base
    const knownWines = await extractWinesFromKnowledgeBase();
    logger.wine(`Loaded ${knownWines.length} verified wines from knowledge base`);
    
    // Enhanced special handling for rosé wines
    const queryLower = query.toLowerCase();
    const isRoseWine = queryLower.includes('rose') || 
                      queryLower.includes('rosé') || 
                      queryLower.includes('queen of the meadow');
    
    if (isRoseWine) {
      logger.wine(`🌹 Rosé wine query detected: "${query}"`);
      return handleRoseWineQuery(query, queryInfo, context, knownWines);
    }
    
    // Check if this is a specific wine with a specified vintage year
    const hasVintageYear = queryInfo.isFollowUp && queryInfo.vintage;
    if (hasVintageYear) {
      logger.wine(`🍷 Wine query with specific vintage (${queryInfo.vintage}) detected: "${query}"`);
      // Add vintage-specific handling
      return handleVintageSpecificQuery(query, queryInfo, context, knownWines);
    }
    
    // Check if we found multiple wines for a generic query
    if (context.multipleWines) {
      logger.wine(`Multiple wines found for generic query, generating clarification response`);
      return generateMultipleWinesResponse(query, queryInfo, context, knownWines);
    }
    
    // Special handling for specific wine subtypes
    switch (queryInfo.subtype) {
      case 'specific':
        logger.wine(`Handling specific wine query: ${queryInfo.specificWine || 'unknown wine'}`);
        return handleSpecificWineQuery(query, queryInfo, context, knownWines);
      case 'generic':
        logger.wine(`Handling generic wine query with terms: ${queryInfo.wineTerms?.join(', ') || 'no terms'}`);
        return handleGenericWineQuery(query, queryInfo, context, knownWines);
      default:
        logger.wine(`Handling default wine query type: ${queryInfo.subtype}`);
        // For general wine queries, pass known wines to response generator with enhanced instructions
        return generateResponse(query, queryInfo, context, { 
          knownWines,
          extractAllWineDetails: true,
          specialWineInstructions: getEnhancedWineInstructions()
        });
    }
  } catch (error) {
    logger.error('Error in wine handler:', error);
    return {};
  }
}

/**
 * Generate enhanced wine instructions to ensure extraction of all details
 * @returns {string} - Enhanced wine instructions
 */
function getEnhancedWineInstructions() {
  return `
CRITICAL WINE DETAIL EXTRACTION:
1. You MUST extract and include ALL details from the wine document
2. Include ALL tasting notes, aromas, flavor profiles, characteristics
3. Extract ALL information even if it's embedded in HTML tags
4. Pay special attention to any descriptions of:
   - Color (e.g., ruby red, pale gold, salmon pink)
   - Aroma (e.g., fruity, floral, spicy, herbal)
   - Taste/Palate (e.g., body, acidity, tannins, specific flavor notes)
   - Finish (e.g., long, short, smooth, crisp)
5. NEVER state "no tasting notes available" if any form of description exists in the context
6. When mentioning price, ALWAYS include the specific dollar amount if available
7. ALWAYS state the vintage year at the beginning of your response
`;
}

/**
 * Handle specific rosé wine queries with enhanced extraction
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @param {Array} knownWines - List of verified wines
 * @returns {Promise<Object>} - Response for rosé wine query
 */
async function handleRoseWineQuery(query, queryInfo, context, knownWines) {
  logger.wine(`Processing rosé wine query with enhanced extraction`);
  
  // First, find the rosé wine document by scanning the sources
  const roseDoc = context.documents.find(doc => {
    const source = doc.metadata?.source?.toLowerCase() || '';
    return source.includes('rose') || 
           source.includes('rosé') || 
           source.includes('queen-of-the-meadow');
  });
  
  if (roseDoc) {
    logger.wine(`✅ Found rosé wine document: ${roseDoc.metadata.source}`);
    
    // Create enhanced context with rosé document prioritized
    const enhancedContext = {
      ...context,
      documents: [
        roseDoc,
        ...context.documents.filter(doc => doc !== roseDoc)
      ]
    };
    
    logger.wine(`Enhanced context with ${enhancedContext.documents.length} documents, primary: ${enhancedContext.documents[0].metadata.source}`);
    
    // Special instructions for rosé wines
    const roseInstructions = `
SPECIAL ROSÉ WINE INSTRUCTIONS:
This is a query about a ROSÉ wine. You MUST extract and include ALL of these details from the context:
1. The specific vintage year (e.g., 2022, 2023)
2. Complete tasting notes - extract EVERY detail about how the wine tastes
3. Color descriptions (e.g., salmon pink, coral, light ruby)
4. Aroma profiles (e.g., strawberry, watermelon, citrus, floral notes)
5. Flavor characteristics (e.g., crisp, dry, fruity, refreshing)
6. Any special production methods mentioned
7. Food pairing suggestions if available
8. Price information in exact dollar amount

NEVER state that tasting notes aren't available unless you've checked every part of the document. This is a specialty wine for Milea Estate Vineyard, so a complete description is essential.

If you see any HTML tags in the content, extract the information from within them. Wine descriptions are sometimes embedded in HTML.
`;
    
    // Generate response with special rosé instructions
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: roseInstructions
    });
  }
  
  logger.wine(`⚠️ No specific rosé document found, using standard processing`);
  
  // If no specific rosé document found, use standard processing
  return generateResponse(query, queryInfo, context, { 
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle queries for specific wines with a vintage year
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @param {Array} knownWines - List of verified wines
 * @returns {Promise<Object>} - Response for vintage-specific query
 */
async function handleVintageSpecificQuery(query, queryInfo, context, knownWines) {
  const year = queryInfo.vintage;
  const wineName = queryInfo.specificWine.replace(year, '').trim();
  
  logger.wine(`Looking for ${year} ${wineName} in context documents`);
  
  // Find document matching the specific vintage and wine
  const vintageDoc = context.documents.find(doc => {
    const source = doc.metadata?.source?.toLowerCase() || '';
    logger.wine(`Checking source: ${source} for year ${year} and pattern ${queryInfo.winePattern}`);
    return source.includes(year) && 
          queryInfo.winePattern && 
          source.includes(queryInfo.winePattern);
  });
  
  if (vintageDoc) {
    logger.wine(`✅ Found document for ${year} ${wineName}: ${vintageDoc.metadata.source}`);
    
    // Prioritize the vintage-specific document
    const enhancedContext = {
      ...context,
      documents: [
        vintageDoc,
        ...context.documents.filter(doc => doc !== vintageDoc)
      ]
    };
    
    logger.wine(`Enhanced context with ${enhancedContext.documents.length} documents, primary: ${enhancedContext.documents[0].metadata.source}`);
    
    // Special instructions for vintage-specific wine
    const vintageInstructions = `
SPECIFIC VINTAGE WINE INSTRUCTIONS:
This is a query about the ${year} ${wineName}. You MUST include ALL these details from the context:
1. The ${year} vintage specifically - do not mix information from other vintages
2. Complete tasting notes - extract EVERY detail about how this specific vintage tastes
3. Color, aroma, flavor, and finish characteristics 
4. Any production details specific to this vintage
5. Price information in exact dollar amount
6. Any awards or ratings for this specific vintage

NEVER state that tasting notes aren't available unless you've checked every part of the document.
`;
    
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: vintageInstructions
    });
  }
  
  logger.wine(`⚠️ No specific vintage document found for ${year} ${wineName}, using standard processing`);
  
  // If no specific vintage document found, use standard processing
  return generateResponse(query, queryInfo, context, { 
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle specific wine queries with improved extraction
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
    logger.wine(`⚠️ No primary document found for specific wine query: ${queryInfo.specificWine}`);
    
    // Suggest only known wines when the requested wine isn't found
    const suggestions = getSimilarWineSuggestions(queryInfo.specificWine, knownWines);
    
    return {
      response: `I'm sorry, but I couldn't find specific information about the ${queryInfo.specificWine} you asked about. ${suggestions}`,
      sources: []
    };
  }
  
  // Check if the primary document is indeed about the requested wine
  const sourceLower = primaryDoc.metadata?.source?.toLowerCase() || '';
  const contentLower = primaryDoc.pageContent?.toLowerCase() || '';
  
  logger.wine(`Checking primary document source: ${sourceLower}`);
  logger.wine(`Target wine pattern: ${queryInfo.winePattern}`);
  
  const isRelevantDocument = 
    queryInfo.winePattern && sourceLower.includes(queryInfo.winePattern) ||
    queryInfo.specificWine && contentLower.includes(queryInfo.specificWine.toLowerCase());
  
  if (isRelevantDocument) {
    logger.wine(`✅ Primary document matches requested wine: ${primaryDoc.metadata.source}`);
    // Use the response generator with verified wine list and enhanced instructions
    return generateResponse(query, queryInfo, context, { 
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: getEnhancedWineInstructions()
    });
  } else {
    logger.wine(`⚠️ Primary document may not match requested wine: ${primaryDoc.metadata.source}`);
    // Search through all documents to find a better match
    const betterMatch = context.documents.find(doc => {
      const source = doc.metadata?.source?.toLowerCase() || '';
      return queryInfo.winePattern && source.includes(queryInfo.winePattern);
    });
    
    if (betterMatch) {
      logger.wine(`✅ Found better matching document: ${betterMatch.metadata.source}`);
      // Create new context with the better match as primary
      const enhancedContext = {
        ...context,
        documents: [
          betterMatch,
          ...context.documents.filter(doc => doc !== betterMatch)
        ]
      };
      
      logger.wine(`Enhanced context with ${enhancedContext.documents.length} documents, primary: ${enhancedContext.documents[0].metadata.source}`);
      
      return generateResponse(query, queryInfo, enhancedContext, { 
        knownWines,
        extractAllWineDetails: true,
        specialWineInstructions: getEnhancedWineInstructions()
      });
    }
    
    logger.wine(`⚠️ No better matching document found, proceeding with primary document`);
  }
  
  // Use standard response with enhanced wine instructions
  return generateResponse(query, queryInfo, context, { 
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle generic wine queries with improved extraction
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
  
  if (matchingWines.length > 0) {
    logger.wine(`Matching wines: ${matchingWines.map(w => w.name).join(', ')}`);
  }
  
  // Pass the filtered list of known wines to the response generator
  return generateResponse(query, queryInfo, context, { 
    knownWines,
    matchingWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
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
  
  logger.wine(`Generating multiple wines response with ${matchingWines.length} matching wines`);
  
  if (matchingWines.length > 0) {
    logger.wine(`Multiple matching wines: ${matchingWines.map(w => w.name).join(', ')}`);
  } else {
    logger.wine(`⚠️ No matching wines found for terms: ${queryInfo.wineTerms.join(', ')}`);
  }
  
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
    logger.wine(`⚠️ No known wines available for suggestions`);
    return "Would you like to know about our wine selection instead?";
  }
  
  // Extract key terms from the requested wine
  const terms = requestedWine.toLowerCase().split(/\s+/).filter(term => term.length > 3);
  logger.wine(`Extracted terms from requested wine: ${terms.join(', ')}`);
  
  // Score each known wine by similarity
  const scoredWines = knownWines.map(wine => {
    const name = wine.name.toLowerCase();
    let score = 0;
    
    // Score based on matching terms
    terms.forEach(term => {
      if (name.includes(term)) {
        score += 10;
        logger.wine(`Term match: "${term}" found in "${name}" (+10 points)`);
      }
    });
    
    // Boost score for similar wine types
    if ((requestedWine.includes('cabernet') || requestedWine.includes('cab')) && 
        (name.includes('cabernet') || name.includes('cab'))) {
      score += 5;
      logger.wine(`Cabernet type match for ${name} (+5 points)`);
    } else if (requestedWine.includes('chardonnay') && name.includes('chardonnay')) {
      score += 5;
      logger.wine(`Chardonnay type match for ${name} (+5 points)`);
    } else if ((requestedWine.includes('rosé') || requestedWine.includes('rose')) && 
              (name.includes('rosé') || name.includes('rose'))) {
      score += 5;
      logger.wine(`Rosé type match for ${name} (+5 points)`);
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
    logger.wine(`⚠️ No similar wines found for "${requestedWine}"`);
    return "Would you like to know about our wine selection instead?";
  }
  
  logger.wine(`Found ${topMatches.length} similar wines for "${requestedWine}": ${topMatches.map(w => w.name).join(', ')}`);
  
  // Create suggestion text
  return `However, you might be interested in these wines from our collection:\n\n` +
    topMatches.map(wine => `- ${wine.vintage ? wine.vintage + ' ' : ''}${wine.name}`).join('\n');
}

module.exports = {
  handleQuery
};