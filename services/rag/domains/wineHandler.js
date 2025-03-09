// services/rag/domains/wineHandler.js
// Fixed implementation to properly extract all wine information

const logger = require('../../../utils/logger');
const { generateResponse } = require('../responseGenerator');
const { extractWinesFromKnowledgeBase } = require('../utils/knowledgeUtils');
const { getEnhancedWineInstructions } = require('./wineInstructions');

/**
 * Improved handler for wine-related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.wine(`Processing wine query: "${query}" with ${context.documents.length} documents`);
    
    // Log the documents to aid debugging
    if (context.documents.length > 0) {
      context.documents.forEach((doc, index) => {
        if (index < 3) { // Limit to first 3 for clarity
          logger.wine(`Document ${index+1}: Source=${doc.metadata.source}`);
          
          // Log more of the document content to see what's being extracted
          const contentPreview = doc.pageContent.substring(0, 200).replace(/\n/g, ' ');
          logger.wine(`  First 200 chars: ${contentPreview}...`);
          
          // Check for key sections
          if (doc.pageContent.includes("Tasting Notes")) {
            logger.wine(`  ✅ Document contains "Tasting Notes" section`);
          }
          if (doc.pageContent.includes("Wine Notes")) {
            logger.wine(`  ✅ Document contains "Wine Notes" section`);
          }
          if (doc.pageContent.includes("Price")) {
            logger.wine(`  ✅ Document contains price information`);
          }
        }
      });
    } else {
      logger.wine(`⚠️ No documents found for wine query!`);
    }
    
    // Get verified wines from knowledge base
    const knownWines = await extractWinesFromKnowledgeBase();
    logger.wine(`Loaded ${knownWines.length} verified wines from knowledge base`);
    
    // Special handling for Reserve Cabernet Franc
    if (queryInfo.isSpecificWine && queryInfo.specificWine.includes('reserve cabernet franc')) {
      return handleReserveCabernet(query, queryInfo, context, knownWines);
    }
    
    // Special handling for Farmhouse Cabernet Franc
    if (queryInfo.isSpecificWine && queryInfo.specificWine.includes('farmhouse cabernet franc')) {
      return handleFarmhouseCabernet(query, queryInfo, context, knownWines);
    }
    
    // Special case for Proceedo wines
    if (queryInfo.isSpecificWine && queryInfo.specificWine.includes('proceedo')) {
      return handleProceedoWine(query, queryInfo, context, knownWines);
    }
    
    // Special case for Rosé wines
    if (queryInfo.isSpecificWine && 
        (queryInfo.specificWine.includes('rosé') || queryInfo.specificWine.includes('rose'))) {
      return handleRoseWine(query, queryInfo, context, knownWines);
    }
    
    // For generic wine type queries (e.g., "cabernet franc wines")
    if (queryInfo.subtype === 'generic' && queryInfo.wineTerms.length > 0) {
      logger.wine(`Handling generic wine query with terms: ${queryInfo.wineTerms.join(', ')}`);
      return handleGenericWineTypeQuery(query, queryInfo, context, knownWines);
    }
    
    // Default to standard response generation with enhanced wine instructions
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
 * Handle Reserve Cabernet Franc queries with improved extraction
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
    
    // Apply super-detailed instructions for Reserve Cabernet Franc
    const reserveCabernetInstructions = `
RESERVE CABERNET FRANC EXTRACTION INSTRUCTIONS:
This document contains COMPLETE information about the Reserve Cabernet Franc, including:
1. The vintage year (2022)
2. The price ($45.00)
3. Detailed tasting notes with descriptive language about aromas and flavors
4. Production information

The tasting notes section contains descriptions like "opulent aromas of ripe plums, black currants, and blackberries."
DO NOT say "no tasting notes available" - the notes ARE in the document.

Look for text about "aromas", "notes", "palate", "flavors", etc. - these indicate wine descriptions.
Extract and include ALL wine characteristics mentioned in the document.

If you're not finding the notes, they might be inside HTML tags like:
<p><strong>TASTING NOTES</strong></p>
<p>Opulent aromas of ripe plums, black currants, and blackberries...</p>

Or in markdown sections like:
## Description
The 2022 Reserve Cabernet Franc...

SEARCH THE ENTIRE DOCUMENT CAREFULLY!
`;
    
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: reserveCabernetInstructions
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
 * Handle Farmhouse Cabernet Franc queries with improved extraction
 */
async function handleFarmhouseCabernet(query, queryInfo, context, knownWines) {
  logger.wine(`Special handling for Farmhouse Cabernet Franc query`);
  
  // Filter for Farmhouse Cabernet Franc documents
  const farmhouseDocs = context.documents.filter(doc => 
    doc.metadata.source.toLowerCase().includes('farmhouse-cabernet-franc')
  );
  
  if (farmhouseDocs.length > 0) {
    logger.wine(`Found ${farmhouseDocs.length} Farmhouse Cabernet Franc documents`);
    
    // Create modified context with Farmhouse Cabernet Franc documents
    const enhancedContext = {
      ...context,
      documents: farmhouseDocs
    };
    
    // Apply super-detailed instructions for Farmhouse Cabernet Franc
    const farmhouseCabernetInstructions = `
FARMHOUSE CABERNET FRANC EXTRACTION INSTRUCTIONS:
This document contains COMPLETE information about the Farmhouse Cabernet Franc, including:
1. The vintage year (2022)
2. The price ($32.00)
3. Detailed tasting notes with descriptive language about aromas and flavors
4. Production information and accolades (92 Points - Wine Enthusiast)

The tasting notes section contains descriptions like "entices with a bouquet of vibrant red cherries, accompanied by delicate notes of graphite and a subtle minerality."
DO NOT say "no tasting notes available" - the notes ARE in the document.

Look for text about "bouquet", "notes", "palate", "flavors", etc. - these indicate wine descriptions.
Extract and include ALL wine characteristics mentioned in the document.

If you're not finding the notes, they might be inside HTML tags like:
<p><strong>Tasting Notes</strong></p>
<p><span style="font-weight: 400;">The 2022 Farmhouse Cabernet Franc entices with a bouquet...</span></p>

Or in markdown sections like:
## Description
The 2022 Farmhouse Cabernet Franc...

SEARCH THE ENTIRE DOCUMENT CAREFULLY!
`;
    
    return generateResponse(query, queryInfo, enhancedContext, {
      knownWines,
      extractAllWineDetails: true,
      specialWineInstructions: farmhouseCabernetInstructions
    });
  }
  
  // If no documents found, fall back to original context
  logger.wine(`⚠️ No Farmhouse Cabernet Franc documents found, using original context`);
  return generateResponse(query, queryInfo, context, {
    knownWines,
    extractAllWineDetails: true,
    specialWineInstructions: getEnhancedWineInstructions()
  });
}

/**
 * Handle Proceedo wine queries with improved extraction
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
 * Handle Rosé wine queries with improved extraction
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
This document contains COMPLETE information about a Rosé wine, including:
1. The specific vintage year
2. The price
3. Detailed descriptions of its appearance, aroma, taste, and finish

The document DEFINITELY contains descriptions like:
- Color descriptions (e.g., "delicate pink hue")
- Aroma profiles (e.g., "notes of strawberries, cherries")
- Flavor characteristics (e.g., "refreshing linearity and lively acidity")

DO NOT say "no tasting notes available" - the notes ARE in the document.

Look for ANY descriptive language about the wine's characteristics.

If you're not finding the notes, they might be inside HTML tags like:
<p>Experience the pinnacle of Hudson Valley's rosé excellence...</p>

Or in markdown sections like:
## Description
Admire the delicate pink hue of this exceptional rosé...

SEARCH THE ENTIRE DOCUMENT CAREFULLY!
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
      response: `I see you're interested in our ${wineType} wines! 🍷 We have several options you might enjoy:\n\n${wineList}\n\nWhich specific wine would you like to know more about?`,
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