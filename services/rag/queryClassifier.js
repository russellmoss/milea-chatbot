// services/rag/queryClassifier.js
// Enhanced query classifier with strict validation and sophisticated wine pattern detection

const logger = require('../../utils/logger');

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
    'nearby', 'things to do', 'when can i', 'how do i get', 'where is',
    'need a reservation', 'need reservation', 'reservations required', 'require reservation'
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
function isWineProductionQuery(query) {
  // Common terms related to wine production
  const wineProductionTerms = [
    'wine production', 'how is wine made', 'winemaking', 'make wine',
    'fermentation', 'grape harvest', 'bottling', 'vineyard process',
    'grow grapes', 'winery operations', 'vineyard management',
    'wine processing', 'how do you make', 'production process'
  ];
  
  return wineProductionTerms.some(term => query.includes(term));
}

/**
 * Check if a query is sustainability related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about sustainability
 */
function isSustainabilityQuery(query) {
  // Common terms related to sustainability
  const sustainabilityTerms = [
    'sustainability', 'sustainable', 'organic', 'eco-friendly',
    'environmentally friendly', 'green practices', 'carbon footprint',
    'pesticides', 'chemical', 'farming practices', 'regenerative',
    'natural farming', 'conservation', 'soil health', 'compost',
    'biodiversity', 'ecosystem'
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
    'what time', 'what days', 'open today', 'closed today',
    'are you open', 'schedule', 'open now', 'currently open'
  ];
  
  return hoursPatterns.some(pattern => query.includes(pattern));
}

/**
 * Identifies specific wine pattern from query text with fuzzy matching
 * @param {string} query - User query to analyze
 * @returns {Object|null} - Wine data object if matched, null otherwise
 */
function identifySpecificWinePattern(query) {
  const queryLower = query.toLowerCase();
  
  // Define wine pattern matching rules with variations and synonyms
  const winePatterns = [
    {
      name: 'reserve cabernet franc',
      pattern: 'reserve-cabernet-franc',
      matchers: [
        {terms: ['reserve', 'cab', 'franc'], proximity: 3},
        {terms: ['reserve', 'cabernet', 'franc'], proximity: 4},
        {regex: /\breserve\s+cab(ernet)?\s+franc\b/}
      ]
    },
    {
      name: 'farmhouse cabernet franc',
      pattern: 'farmhouse-cabernet-franc',
      matchers: [
        {terms: ['farmhouse', 'cab', 'franc'], proximity: 3},
        {terms: ['farmhouse', 'cabernet', 'franc'], proximity: 4},
        {regex: /\bfarmhouse\s+cab(ernet)?\s+franc\b/}
      ]
    },
    {
      name: 'queen of the meadow rosé',
    pattern: 'queen-of-the-meadow-ros',  // Update to match the actual filename format
    matchers: [
      {terms: ['queen', 'meadow', 'ros'], proximity: 4},
      {terms: ['queen', 'meadow', 'rose'], proximity: 4},
      {regex: /\bqueen\s+of\s+the\s+meadow\s+ros[eé]\b/i}
      ]
    },
    {
      name: 'queen of the meadow',
      pattern: 'queen-of-the-meadow',
      matchers: [
        {terms: ['queen', 'meadow'], proximity: 3},
        {regex: /\bqueen\s+of\s+the\s+meadow\b/i}
      ]
    },
    {
      name: 'four seasons',
      pattern: 'four-seasons',
      matchers: [
        {regex: /\bfour\s+seasons\b/}
      ]
    },
    {
      name: 'proceedo white',
      pattern: 'proceedo-white',
      matchers: [
        {terms: ['proceedo', 'white'], proximity: 2},
        {regex: /\bproceedo\s+white\b/}
      ]
    },
    {
      name: 'proceedo rosé',
      pattern: 'proceedo-rose',
      matchers: [
        {terms: ['proceedo', 'rose'], proximity: 2},
        {terms: ['proceedo', 'rosé'], proximity: 2},
        {regex: /\bproceedo\s+ros[eé]\b/}
      ]
    },
    {
      name: "sang's cabernet franc",
      pattern: 'sangs-cabernet-franc',
      matchers: [
        {terms: ['sang', 'cab', 'franc'], proximity: 3},
        {terms: ['sangs', 'cabernet', 'franc'], proximity: 4},
        {regex: /\bsang'?s\s+cab(ernet)?\s+franc\b/}
      ]
    },
    {
      name: 'hudson heritage chambourcin',
      pattern: 'hudson-heritage-chambourcin',
      matchers: [
        {terms: ['hudson', 'chambourcin'], proximity: 3},
        {terms: ['heritage', 'chambourcin'], proximity: 2},
        {regex: /\bhudson\s+heritage\s+chambourcin\b/}
      ]
    }
  ];

  // Check each wine pattern against the query
  for (const wine of winePatterns) {
    // Check regex matchers first (most precise)
    for (const matcher of wine.matchers) {
      if (matcher.regex && matcher.regex.test(queryLower)) {
        return {
          name: wine.name,
          pattern: wine.pattern
        };
      }
    }
    
    // Check term proximity matchers
    for (const matcher of wine.matchers) {
      if (matcher.terms && matcher.proximity) {
        // Count how many terms from the matcher appear in the query
        const matchedTerms = matcher.terms.filter(term => queryLower.includes(term));
        
        // If all terms match, check for proximity
        if (matchedTerms.length === matcher.terms.length) {
          // Simple proximity check: are all terms present within a short distance of each other?
          // For a more sophisticated approach, we could implement a sliding window
          const words = queryLower.split(/\s+/);
          const positions = matcher.terms.map(term => {
            return words.findIndex(word => word.includes(term));
          }).filter(pos => pos >= 0);
          
          if (positions.length === matcher.terms.length) {
            const min = Math.min(...positions);
            const max = Math.max(...positions);
            
            // Check if all terms are within the proximity window
            if (max - min < matcher.proximity) {
              return {
                name: wine.name,
                pattern: wine.pattern
              };
            }
          }
        }
      }
    }
  }
  
  // Special case for just "Proceedo" without white/rosé specification
  if (/\bproceedo\b/.test(queryLower) && 
      !queryLower.includes('white') && 
      !queryLower.includes('rosé') &&
      !queryLower.includes('rose')) {
    return {
      name: 'proceedo',
      pattern: 'proceedo',
      isGeneric: true
    };
  }
  
  return null;
}

/**
 * Classify a query into its domain and subtype with stricter validation
 * @param {string} query - User's query
 * @returns {Object} - Classification result with type and subtype
 */
function classifyQuery(query) {
  const queryLower = query.toLowerCase();
  
  // Direct matching for common wine query patterns before the general classification
  const specificWine = identifySpecificWinePattern(query);
  if (specificWine) {
    logger.wine(`Specific wine pattern detected: "${specificWine.name}" in query: "${query}"`);
    return {
      type: 'wine',
      subtype: 'specific',
      isSpecificWine: true,
      specificWine: specificWine.name,
      winePattern: specificWine.pattern,
      wineTerms: specificWine.name.split(' '),
      isConfirmedWine: true,
      isGenericProceedo: specificWine.isGeneric || false
    };
  }
  
  // Add special handling for rose/rosé in queryClassifier.js
  if (queryLower.match(/\bros[eé]\b/) || 
      queryLower.includes("rosé wine") || 
      queryLower.includes("rose wine")) {
    logger.wine(`Rosé wine specific query detected: "${query}"`);
    return {
      type: 'wine',
      subtype: 'specific',
      isSpecificWine: true,
      specificWine: 'proceedo rosé', // Default to a known rosé
      winePattern: 'proceedo-rose',
      wineTerms: ['proceedo', 'rosé', 'rose'],
      isConfirmedWine: true
    };
  }
  
  // Check for business hours queries
  if (isBusinessHoursQuery(queryLower)) {
    return {
      type: 'business-hours',
      subtype: 'general'
    };
  }
  
  // Check if this is a wine club related query
  if (isWineClubQuery(queryLower)) {
    logger.info(`Wine club query detected: "${query}"`);
    return {
      type: 'club',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }

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
  if (isWineProductionQuery(queryLower)) {
    logger.info(`Wine Production query detected: "${query}"`);
    return {
      type: 'wine_production',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }

  // Check if this is a sustainability related query
  if (isSustainabilityQuery(queryLower)) {
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
    {term: 'proceedo white', pattern: 'proceedo-white'},
    {term: 'proceedo rosé', pattern: 'proceedo-rose'},
    {term: 'proceedo rose', pattern: 'proceedo-rose'},
    {term: 'sang\'s cabernet franc', pattern: 'sangs-cabernet-franc'},
    {term: 'hudson heritage chambourcin', pattern: 'hudson-heritage-chambourcin'},
    {term: 'farmhouse chardonnay', pattern: 'farmhouse-chardonnay'},
    {term: 'reserve chardonnay', pattern: 'reserve-chardonnay'},
    {term: 'chardonnay', pattern: 'chardonnay'},
    {term: 'four seasons reserve rosé', pattern: 'four-seasons-reserve-ros'},
    {term: 'queen of the meadow rosé', pattern: 'queen-of-the-meadow-ros'}
  ];
  
  // Check for specific wines in query with exact matching
  for (const wine of confirmedWines) {
    if (queryLower.includes(wine.term)) {
      logger.wine(`Specific wine query detected (${wine.term}): "${query}"`);
      return {
        type: 'wine',
        subtype: 'specific',
        isSpecificWine: true,
        specificWine: wine.term,
        winePattern: wine.pattern,
        wineTerms: wine.term.split(' '),
        isConfirmedWine: true
      };
    }
  }
  
  // Handle just "Proceedo" separately
  if (queryLower.includes('proceedo') && 
      !queryLower.includes('white') && 
      !queryLower.includes('rosé') &&
      !queryLower.includes('rose')) {
    logger.wine(`Generic Proceedo query detected: "${query}"`);
    return {
      type: 'wine',
      subtype: 'specific',
      isSpecificWine: true,
      specificWine: 'proceedo',
      winePattern: 'proceedo',
      wineTerms: ['proceedo'],
      isConfirmedWine: true,
      isGenericProceedo: true
    };
  }
  
  // Define generic wine types for detecting general wine queries
  const genericWineTypes = [
    'rose', 'rosé', 'chardonnay', 'cabernet', 'franc', 'riesling', 
    'merlot', 'pinot', 'noir', 'sauvignon', 'blanc', 'red', 'white',
    'blaufränkisch', 'blaufrankisch', 'grüner', 'gruner', 'veltliner'
  ];
  
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
  
  // Check for price-specific queries about wines
  const pricePatterns = [
    /how much (is|does) .+ cost/i,
    /price of .+/i,
    /cost of .+/i,
    /how much .+/i
  ];
  
  if (pricePatterns.some(pattern => pattern.test(query)) && isLikelyWineQuery(queryLower)) {
    logger.wine(`Wine price query detected: "${query}"`);
    return {
      type: 'wine',
      subtype: 'price',
      isSpecificWine: false,
      wineTerms: []
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

module.exports = {
  classifyQuery,
  isWineClubQuery,
  isLikelyWineQuery,
  isVisitingQuery,
  classifyVisitingQueryType,
  isMerchandiseQuery,
  isLoyaltyProgramQuery,
  isWineProductionQuery,
  isSustainabilityQuery,
  isBusinessHoursQuery,
  identifySpecificWinePattern
};