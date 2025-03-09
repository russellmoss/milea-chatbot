// services/rag/domains/wineHandler.js enhancement

const logger = require('../../../utils/logger');
const { generateResponse } = require('../responseGenerator');
const { extractWinesFromKnowledgeBase } = require('../utils/knowledgeUtils');

/**
 * Enhanced handler for wine-related queries with better document inspection
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.wine(`Processing wine query: "${query}" with ${context.documents.length} documents`);
    
    // Enhanced logging for document inspection
    if (context.documents.length > 0) {
      context.documents.forEach((doc, index) => {
        if (index < 3) { // Limit to first 3 for clarity
          logger.wine(`Document ${index+1}: Source=${doc.metadata.source}`);
          logger.wine(`  First 100 chars: ${doc.pageContent.substring(0, 100).replace(/\n/g, ' ')}...`);
        }
      });
    } else {
      logger.wine(`⚠️ No documents found for wine query!`);
    }
    
    // Get verified wines from knowledge base
    const knownWines = await extractWinesFromKnowledgeBase();
    logger.wine(`Loaded ${knownWines.length} verified wines from knowledge base`);
    
    // Enhanced special handling for wine subtypes
    if (queryInfo.isSpecificWine) {
      // Special case for Proceedo wines
      if (queryInfo.specificWine.includes('proceedo')) {
        return handleProceedoWine(query, queryInfo, context, knownWines);
      }
      
      // Special case for Reserve Cabernet Franc
      if (queryInfo.specificWine.includes('reserve cabernet franc')) {
        return handleReserveCabernet(query, queryInfo, context, knownWines);
      }
      
      // Special case for Rosé wines
      if (queryInfo.specificWine.includes('rosé') || 
          queryInfo.specificWine.includes('rose')) {
        return handleRoseWine(query, queryInfo, context, knownWines);
      }
    }
    
    // For generic "type of wine" queries (e.g., "cabernet franc wines")
    if (queryInfo.subtype === 'generic' && queryInfo.wineTerms.length > 0) {
      logger.wine(`Handling generic wine query with terms: ${queryInfo.wineTerms.join(', ')}`);
      return handleGenericWineTypeQuery(query, queryInfo, context, knownWines);
    }
    
    // Default to standard response generation with all known wines
    return generateResponse(query, queryInfo, context, { 
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: getEnhancedWineInstructions()
    });
  } catch (error) {
    logger.error('Error in wine handler:', error);
    return {};
  }
}

/**
 * Enhanced instructions to ensure extraction of all wine details
 * @returns {string} - Enhanced wine instructions for LLM
 */
function getEnhancedWineInstructions() {
  return `
CRITICAL WINE DETAIL EXTRACTION:
1. You MUST extract and include ALL details from the wine document
2. Include ALL tasting notes, aromas, flavor profiles, and characteristics
3. Extract ALL information even if it's embedded in HTML tags
4. Pay special attention to descriptions of color, aroma, taste, and finish
5. NEVER state "no tasting notes available" if any form of description exists
6. ALWAYS include the specific price in dollars if available
7. ALWAYS state the vintage year at the beginning of your response
8. For suggestions, ONLY recommend actual wines from Milea Estate Vineyard
`;
}

/**
 * Handle Proceedo wine queries
 */
async function handleProceedoWine(query, queryInfo, context, knownWines) {
  logger.wine(`Special handling for Proceedo wine query`);
  
  // Check if query specifies white or rosé variant
  const queryLower = query.toLowerCase();
  const isWhite = queryLower.includes('white');
  const isRose = queryLower.includes('rosé') || queryLower.includes('rose');
  
  // Filter documents to match the specific Proceedo variant
  let filteredDocs = context.documents;
  
  if (isWhite) {
    logger.wine(`Looking for Proceedo White documents`);
    filteredDocs = context.documents.filter(doc => 
      doc.metadata.source.toLowerCase().includes('proceedo') &&
      doc.metadata.source.toLowerCase().includes('white')
    );
  } else if (isRose) {
    logger.wine(`Looking for Proceedo Rosé documents`);
    filteredDocs = context.documents.filter(doc => 
      doc.metadata.source.toLowerCase().includes('proceedo') &&
      (doc.metadata.source.toLowerCase().includes('rose') || 
       doc.metadata.source.toLowerCase().includes('rosé'))
    );
  } else {
    logger.wine(`Looking for any Proceedo documents`);
    filteredDocs = context.documents.filter(doc => 
      doc.metadata.source.toLowerCase().includes('proceedo')
    );
  }
  
  // If we found specific documents, use those
  if (filteredDocs.length > 0) {
    logger.wine(`Found ${filteredDocs.length} Proceedo documents`);
    
    // Create modified context with filtered documents
    const enhancedContext = {
      ...context,
      documents: filteredDocs
    };
    
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: getEnhancedWineInstructions()
    });
  }
  
  // If no documents found, fall back to original context
  logger.wine(`⚠️ No specific Proceedo documents found, using original context`);
  return generateResponse(query, queryInfo, context, {
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle Reserve Cabernet Franc queries 
 */
async function handleReserveCabernet(query, queryInfo, context, knownWines) {
  logger.wine(`Special handling for Reserve Cabernet Franc query`);
  
  // Filter for Reserve Cabernet Franc documents
  const reserveDocs = context.documents.filter(doc => 
    doc.metadata.source.toLowerCase().includes('reserve-cabernet-franc')
  );
  
  if (reserveDocs.length > 0) {
    logger.wine(`Found ${reserveDocs.length} Reserve Cabernet Franc documents`);
    
    // Create modified context with Reserve Cabernet Franc documents
    const enhancedContext = {
      ...context,
      documents: reserveDocs
    };
    
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: getEnhancedWineInstructions()
    });
  }
  
  // If no documents found, fall back to original context
  logger.wine(`⚠️ No Reserve Cabernet Franc documents found, using original context`);
  return generateResponse(query, queryInfo, context, {
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle Rosé wine queries
 */
async function handleRoseWine(query, queryInfo, context, knownWines) {
  logger.wine(`Special handling for Rosé wine query`);
  
  // Filter for Rosé documents
  const roseDocs = context.documents.filter(doc => {
    const source = doc.metadata.source.toLowerCase();
    return source.includes('rose') || 
           source.includes('rosé') || 
           source.includes('queen-of-the-meadow');
  });
  
  if (roseDocs.length > 0) {
    logger.wine(`Found ${roseDocs.length} Rosé documents`);
    
    // Create modified context with Rosé documents
    const enhancedContext = {
      ...context,
      documents: roseDocs
    };
    
    // Special instructions for rosé wines
    const roseInstructions = `
SPECIAL ROSÉ WINE INSTRUCTIONS:
This is a query about a ROSÉ wine. You MUST extract and include ALL details from the context:
1. The specific vintage year
2. Complete tasting notes - extract EVERY detail about how the wine tastes
3. Color descriptions (e.g., salmon pink, coral, light ruby)
4. Aroma profiles (e.g., strawberry, watermelon, citrus, floral notes)
5. Flavor characteristics (e.g., crisp, dry, fruity, refreshing)
6. Any special production methods mentioned
7. Food pairing suggestions if available
8. Price information in exact dollar amount

This is a specialty wine for Milea Estate Vineyard, so provide a complete description.
`;
    
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: roseInstructions
    });
  }
  
  // If no documents found, fall back to original context
  logger.wine(`⚠️ No Rosé documents found, using original context`);
  return generateResponse(query, queryInfo, context, {
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle generic wine type queries (e.g., "cabernet franc wines")
 */
async function handleGenericWineTypeQuery(query, queryInfo, context, knownWines) {
  logger.wine(`Handling generic wine type query for: ${queryInfo.wineTerms.join(', ')}`);
  
  // Filter wines by the terms in the query
  const matchingWines = knownWines.filter(wine => {
    const wineName = wine.name.toLowerCase();
    return queryInfo.wineTerms.some(term => wineName.includes(term.toLowerCase()));
  });
  
  logger.wine(`Found ${matchingWines.length} matching wines from knowledge base`);
  
  // If we have multiple matching wines, create a clarification response
  if (matchingWines.length > 1) {
    logger.wine(`Multiple matching wines found, generating clarification response`);
    
    const wineType = queryInfo.wineTerms[0] || "wine";
    const wineList = matchingWines.map(wine => 
      `- ${wine.vintage ? wine.vintage + ' ' : ''}${wine.name}`
    ).join('\n');
    
    return {
      response: `I see you're interested in our ${wineType} wines! We have several options you might enjoy:\n\n${wineList}\n\nWhich specific wine would you like to know more about?`,
      sources: []
    };
  }
  
  // If we have exactly one matching wine, provide details for that wine
  if (matchingWines.length === 1) {
    logger.wine(`Exactly one matching wine found: ${matchingWines[0].name}`);
    
    // Filter documents for this specific wine
    const wineDocs = context.documents.filter(doc => {
      const source = doc.metadata.source.toLowerCase();
      const wineName = matchingWines[0].name.toLowerCase();
      return source.includes(wineName) || source.includes(wineName.replace(/\s+/g, '-'));
    });
    
    if (wineDocs.length > 0) {
      logger.wine(`Found ${wineDocs.length} documents for ${matchingWines[0].name}`);
      
      const enhancedContext = {
        ...context,
        documents: wineDocs
      };
      
      return generateResponse(query, queryInfo, enhancedContext, {
        knownWines,
        extractAllWineDetails: true,
        specialWineInstructions: getEnhancedWineInstructions()
      });
    }
  }
  
  // No specific matches found, use default response with available context
  logger.wine(`Using default response for generic wine query`);
  return generateResponse(query, queryInfo, context, {
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

module.exports = {
  handleQuery
};