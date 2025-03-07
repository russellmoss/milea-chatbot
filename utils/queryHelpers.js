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
  
  module.exports = {
    isWineClubQuery,
    isLikelyWineQuery
  };
  