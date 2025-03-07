// utils/queryHelpers.js

// Function to detect wine club queries
function isWineClubQuery(query) {
    const query_lower = query.toLowerCase();
    return (
      (query_lower.includes("club") || query_lower.includes("membership")) &&
      (query_lower.includes("wine") || query_lower.includes("join") || query_lower.includes("milea"))
    );
  }
  
  // Function to prioritize wine products when common wine terms are mentioned
  function isLikelyWineQuery(query) {
    const query_lower = query.toLowerCase();
    
    // Common wine terms
    const wineTerms = [
      'rose', 'rosé', 'red', 'white', 'wine', 'bottle', 'vineyard', 'vintage',
      'chardonnay', 'riesling', 'cabernet', 'franc', 'merlot', 'pinot noir',
      'sauvignon', 'syrah', 'blend', 'proceedo', 'chambourcin', 'muscat',
      'tasting', 'sweet', 'dry', 'tannic', 'full-bodied', 'light-bodied'
    ];
    
    // Check if any of these terms are in the query
    return wineTerms.some(term => query_lower.includes(term));
  }
  
  // Function to detect visiting-related queries
  function isVisitingQuery(query) {
    const query_lower = query.toLowerCase();
    
    // Common terms related to visiting
    const visitingTerms = [
      'visit', 'visiting', 'hours', 'open', 'directions', 'location', 'address',
      'reservation', 'book', 'tasting', 'tour', 'appointment', 'tastings',
      'accommodations', 'hotels', 'stay', 'where to stay', 'attractions',
      'nearby', 'things to do'
    ];
    
    return visitingTerms.some(term => query_lower.includes(term));
  }
  
  // Function to classify query type for better routing
  function classifyQueryType(query) {
    const query_lower = query.toLowerCase();
    
    // Check for visiting-related queries first
    if (isVisitingQuery(query_lower)) {
      // Subclassify visiting queries
      if (query_lower.includes('hour') || query_lower.includes('open') || query_lower.includes('when')) {
        return 'visiting-hours';
      } else if (query_lower.includes('direction') || query_lower.includes('address') || 
                query_lower.includes('location') || query_lower.includes('where')) {
        return 'visiting-directions';
      } else if (query_lower.includes('reservation') || query_lower.includes('book') || 
                query_lower.includes('appointment')) {
        return 'visiting-reservations';
      } else if (query_lower.includes('hotel') || query_lower.includes('stay') || 
                query_lower.includes('accommodations')) {
        return 'visiting-accommodations';
      } else if (query_lower.includes('attractions') || query_lower.includes('things to do') || 
                query_lower.includes('nearby')) {
        return 'visiting-attractions';
      } else {
        return 'visiting-general';
      }
    }
    
    // Check for wine club queries
    if (isWineClubQuery(query_lower)) {
      return 'club';
    }
    
    // Check for wine queries
    if (isLikelyWineQuery(query_lower)) {
      return 'wine';
    }
    
    // Default category
    return 'general';
  }
  
  module.exports = {
    isWineClubQuery,
    isLikelyWineQuery,
    isVisitingQuery,
    classifyQueryType
  };