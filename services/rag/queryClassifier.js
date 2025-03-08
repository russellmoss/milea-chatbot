// services/rag/queryClassifier.js
// Enhanced query classifier with strict validation

const logger = require('../../utils/logger');

// In services/rag/queryClassifier.js, add this function:

/**
 * Check if a query is loyalty program related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about the loyalty program
 */
function isLoyaltyProgramQuery(query) {
    // Common terms related to loyalty program
    const loyaltyTerms = [
      'milea miles', 'miles', 'loyalty', 'rewards', 'points', 'reward', 
      'redeem', 'earn points', 'point system', 'rewards program'
    ];
    
    return loyaltyTerms.some(term => query.includes(term));
  }
  
  // Then update the classifyQuery function to include loyalty detection:
  function classifyQuery(query) {
    const queryLower = query.toLowerCase();
    
  }
  

/**
 * Classify a query into its domain and subtype with stricter validation
 * @param {string} query - User's query
 * @returns {Object} - Classification result with type and subtype
 */
function classifyQuery(query) {
  const queryLower = query.toLowerCase();
  
  // Check if this is a wine club related query
  if (isWineClubQuery(queryLower)) {
    logger.wine(`Wine club query detected: "${query}"`);
    return {
      type: 'club',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }

  // Add this right after the wine club check:
    // Check if this is a loyalty program related query
    if (isLoyaltyProgramQuery(queryLower)) {
        logger.info(`Loyalty program query detected: "${query}"`);
        return {
          type: 'loyalty',
          subtype: 'general',
          isSpecificWine: false,
          wineTerms: []
        };
      }
  
  
  // Check if this is a wine production related query
  if (iswineProductionQuery(queryLower)) {
    logger.info(`Wine Production query detected: "${query}"`);
    return {
      type: 'wine_production',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }

  
  // Check if this is a sustainability related query
  if (issustainabilityQuery(queryLower)) {
    logger.info(`Sustainability query detected: "${query}"`);
    return {
      type: 'sustainability',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }

  // Check if this is a visiting-related query
  if (isVisitingQuery(queryLower)) {
    const visitingSubtype = classifyVisitingQueryType(queryLower);
    logger.info(`Visiting query detected (${visitingSubtype}): "${query}"`);
    return {
      type: 'visiting',
      subtype: visitingSubtype,
      isSpecificWine: false,
      wineTerms: []
    };
  }

  // ✅ IMPROVED: Define confirmed wines from our knowledge base
  // Exact names and patterns - only actual wines we produce
  const confirmedWines = [
    {term: 'reserve cabernet franc', pattern: 'reserve-cabernet-franc'},
    {term: 'farmhouse cabernet franc', pattern: 'farmhouse-cabernet-franc'},
    {term: 'farmhouse cab franc', pattern: 'farmhouse-cabernet-franc'},
    {term: 'queen of the meadow', pattern: 'queen-of-the-meadow'},
    {term: 'four seasons', pattern: 'four-seasons'},
    {term: 'proceedo', pattern: 'proceedo'},
    {term: 'sang\'s cabernet franc', pattern: 'sangs-cabernet-franc'},
    {term: 'hudson heritage chambourcin', pattern: 'hudson-heritage-chambourcin'}
    // Add ALL your actual wines here
  ];
  
  // Check for specific wines in query
  for (const wine of confirmedWines) {
    if (queryLower.includes(wine.term)) {
      logger.wine(`Specific wine query detected (${wine.term}): "${query}"`);
      return {
        type: 'wine',
        subtype: 'specific',
        isSpecificWine: true,
        specificWine: wine.term,
        winePattern: wine.pattern,
        wineTerms: [wine.term],
        // ✅ ADDED: Flag to indicate this is a confirmed wine
        isConfirmedWine: true
      };
    }
  }
  
  // Define generic wine types for detecting general wine queries
  const genericWineTypes = ['rose', 'rosé', 'chardonnay', 'cabernet', 'franc', 'riesling', 
                           'merlot', 'pinot', 'noir', 'sauvignon', 'blanc', 'red', 'white'];
  
  // Extract matching wine terms
  const matchingWineTerms = genericWineTypes.filter(term => queryLower.includes(term));
  
  // Determine if this is a generic wine query
  if (matchingWineTerms.length > 0) {
    logger.wine(`Generic wine query detected with terms [${matchingWineTerms.join(', ')}]: "${query}"`);
    return {
      type: 'wine',
      subtype: 'generic',
      isSpecificWine: false,
      wineTerms: matchingWineTerms
    };
  }
  
  // More generic check for wine-related queries
  if (isLikelyWineQuery(queryLower)) {
    logger.wine(`Likely wine query detected: "${query}"`);
    return {
      type: 'wine',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }

  // Check for merchandise-related queries
  if (isMerchandiseQuery(queryLower)) {
    logger.info(`Merchandise query detected: "${query}"`);
    return {
      type: 'merchandise',
      subtype: 'general'
    };
  }
  
  // Default to general query
  logger.info(`General query detected: "${query}"`);
  return {
    type: 'general',
    subtype: 'general'
  };
}

/**
 * Check if a query is wine club related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is club related
 */
function isWineClubQuery(query) {
  return (
    (query.includes("club") || query.includes("membership")) &&
    (query.includes("wine") || query.includes("join") || query.includes("milea"))
  );
}

/**
 * Check if a query is likely wine related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is likely about wine
 */
function isLikelyWineQuery(query) {
  // Common wine terms
  const wineTerms = [
    'rose', 'rosé', 'red', 'white', 'wine', 'bottle', 'vineyard', 'vintage',
    'chardonnay', 'riesling', 'cabernet', 'franc', 'merlot', 'pinot noir',
    'sauvignon', 'syrah', 'blend', 'proceedo', 'chambourcin', 'muscat',
    'tasting', 'sweet', 'dry', 'tannic', 'full-bodied', 'light-bodied'
  ];
  
  // Check if any of these terms are in the query
  return wineTerms.some(term => query.includes(term));
}

/**
 * Check if a query is visiting-related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about visiting
 */
function isVisitingQuery(query) {
  // Common terms related to visiting
  const visitingTerms = [
    'visit', 'visiting', 'hours', 'open', 'directions', 'location', 'address',
    'reservation', 'book', 'tasting', 'tour', 'appointment', 'tastings',
    'accommodations', 'hotels', 'stay', 'where to stay', 'attractions',
    'nearby', 'things to do', 'when can i', 'how do i get', 'where is'
  ];
  
  return visitingTerms.some(term => query.includes(term));
}

/**
 * Classify visiting query subtypes
 * @param {string} query - Lowercase user query
 * @returns {string} - Visiting query subtype
 */
function classifyVisitingQueryType(query) {
  if (query.includes('hour') || query.includes('open') || query.includes('when')) {
    return 'visiting-hours';
  } else if (query.includes('direction') || query.includes('address') || 
            query.includes('location') || query.includes('where')) {
    return 'visiting-directions';
  } else if (query.includes('reservation') || query.includes('book') || 
            query.includes('appointment')) {
    return 'visiting-reservations';
  } else if (query.includes('hotel') || query.includes('stay') || 
            query.includes('accommodations')) {
    return 'visiting-accommodations';
  } else if (query.includes('attractions') || query.includes('things to do') || 
            query.includes('nearby')) {
    return 'visiting-attractions';
  } else if (query.includes('experience') || query.includes('tasting')) {
    return 'visiting-experiences';
  } else {
    return 'visiting-general';
  }
}

/**
 * Check if a query is merchandise-related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about merchandise
 */
function isMerchandiseQuery(query) {
  // Common terms related to merchandise
  const merchandiseTerms = [
    'merchandise', 'shirt', 'clothing', 'glass', 'glasses', 'souvenir',
    'gift', 'shop', 'store', 'purchase', 'buy', 'merch', 'apparel'
  ];
  
  return merchandiseTerms.some(term => query.includes(term));
}


/**
 * Check if a query is wine production related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about wine production
 */
function iswineProductionQuery(query) {
  // Common terms related to wine production
  const wine_productionTerms = [
    'wine production', 'wine production', 
    // Add more relevant terms here
  ];
  
  return wine_productionTerms.some(term => query.includes(term));
}


/**
 * Check if a query is sustainability related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about sustainability
 */
function issustainabilityQuery(query) {
  // Common terms related to sustainability
  const sustainabilityTerms = [
    'sustainability', 'sustainability', 
    // Add more relevant terms here
  ];
  
  return sustainabilityTerms.some(term => query.includes(term));
}


/**
 * Check if a query is about business hours or open status
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about business hours
 */
function isBusinessHoursQuery(query) {
  // Look for patterns specifically about business hours or open status
  const hoursPatterns = [
    'hour', 'open', 'closed', 'close', 'opening time', 'closing time',
    'when are you open', 'when do you open', 'when do you close',
    'what time', 'what days', 'open today', 'closed today'
  ];
  
  return hoursPatterns.some(pattern => query.includes(pattern));
}

// Update your classifyQuery function to check for business hours queries first
function classifyQuery(query) {
  const queryLower = query.toLowerCase();
  
  // Check for business hours queries first
  if (isBusinessHoursQuery(queryLower)) {
    return {
      type: 'business-hours',
      subtype: 'general'
    };
  }
  
  // Rest of your existing classification logic...
}

module.exports = {
  issustainabilityQuery,
  isBusinessHoursQuery,
  iswineProductionQuery,
  classifyQuery,
  isWineClubQuery,
  isLikelyWineQuery,
  isVisitingQuery,
  classifyVisitingQueryType,
  isMerchandiseQuery,
  isWineClubQuery,
  isLoyaltyProgramQuery,
  isLikelyWineQuery,
};