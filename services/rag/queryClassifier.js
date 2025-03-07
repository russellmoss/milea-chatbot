// services/rag/queryClassifier.js
// Enhanced query classifier with strict validation

const logger = require('../../utils/logger');

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

module.exports = {
  classifyQuery,
  isWineClubQuery,
  isLikelyWineQuery,
  isVisitingQuery,
  classifyVisitingQueryType,
  isMerchandiseQuery
};