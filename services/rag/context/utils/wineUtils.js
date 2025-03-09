// services/rag/context/utils/wineUtils.js

/**
 * Constants and utilities specifically for wine document processing
 */

// Known wine varieties at Milea Estate Vineyard
const WINE_VARIETIES = [
    "chardonnay", 
    "cabernet", 
    "cabernet sauvignon", 
    "cabernet franc", 
    "pinot noir", 
    "blaufränkisch", 
    "blaufrankisch", 
    "merlot", 
    "riesling", 
    "syrah", 
    "sauvignon blanc",
    "grüner veltliner", 
    "gruner veltliner", 
    "rosé", 
    "rose",
    "red blend", 
    "white blend", 
    "proceedo"
  ];
  
  // Confirmed specific wines produced by Milea Estate Vineyard
  const CONFIRMED_WINES = [
    {
      name: "Reserve Cabernet Franc",
      pattern: "reserve-cabernet-franc",
      synonyms: ["reserve cab franc", "reserve cab"]
    },
    {
      name: "Farmhouse Cabernet Franc",
      pattern: "farmhouse-cabernet-franc",
      synonyms: ["farmhouse cab franc", "farmhouse cab"]
    },
    {
      name: "Queen of the Meadow",
      pattern: "queen-of-the-meadow",
      synonyms: ["queen meadow"]
    },
    {
      name: "Proceedo White",
      pattern: "proceedo-white",
      synonyms: ["white proceedo"]
    },
    {
      name: "Proceedo Rosé",
      pattern: "proceedo-rose",
      synonyms: ["proceedo rose", "rose proceedo", "rosé proceedo"]
    },
    {
      name: "Sang's Cabernet Franc",
      pattern: "sangs-cabernet-franc",
      synonyms: ["sangs cab franc", "sang's cab"]
    },
    {
      name: "Hudson Heritage Chambourcin",
      pattern: "hudson-heritage-chambourcin",
      synonyms: ["hudson chambourcin", "chambourcin"]
    },
    {
      name: "Four Seasons",
      pattern: "four-seasons",
      synonyms: []
    }
  ];
  
  // Common wine-related terms for query recognition
  const WINE_TERMS = [
    "wine", "bottle", "vineyard", "vintage", "tasting",
    "sweet", "dry", "tannic", "full-bodied", "light-bodied",
    "aroma", "nose", "palate", "finish", "decant",
    "varietal", "terroir", "reserve", "estate", "barrel"
  ];
  
  /**
   * Extract vintage year from wine document source or content
   * @param {string} source - Document source filename
   * @param {string} content - Document content
   * @returns {string|number} - Extracted vintage (year as number or "NV" for non-vintage)
   */
  function extractVintage(source, content) {
    const vintageMatch = source.match(/^wine_(\d{4}|NV)-/) || content.match(/^# (\d{4}|NV) /);
    if (vintageMatch) {
      // If it's NV (non-vintage), return "NV", otherwise parse the year as integer
      return vintageMatch[1] === "NV" ? "NV" : parseInt(vintageMatch[1]);
    }
    return null;
  }
  
  /**
   * Extract wine name from document content or source
   * @param {string} source - Document source filename
   * @param {string} content - Document content
   * @returns {string} - Extracted wine name
   */
  function extractWineName(source, content) {
    // Try to extract from content heading
    const titleMatch = content.match(/^# (?:\d{4}|NV)?\s?(.+)/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    // Fallback to extraction from filename
    const nameMatch = source.match(/^wine_(?:\d{4}|NV)-(.+?)-[0-9a-f]{8}/);
    if (nameMatch) {
      return nameMatch[1].replace(/-/g, ' ').trim();
    }
    
    return "";
  }
  
  /**
   * Check if wine is available based on document content
   * @param {string} content - Document content
   * @returns {boolean} - Whether the wine is available
   */
  function isWineAvailable(content) {
    return content.includes("Status: Available / Available");
  }
  
  /**
   * Normalize a wine name for comparison (remove vintage, case, special chars)
   * @param {string} name - Wine name to normalize
   * @returns {string} - Normalized wine name
   */
  function normalizeWineName(name) {
    return name
      .toLowerCase()
      .replace(/\b(19|20)\d{2}\b/, '') // Remove vintage year
      .replace(/\s+glass$/, '')        // Remove "glass" suffix
      .replace(/[^\w\s-]/g, '')        // Remove special characters except spaces and hyphens
      .trim();
  }
  
  /**
   * Check if a query is about a specific wine
   * @param {string} query - User query
   * @param {Array} confirmedWines - List of confirmed wines to check against
   * @returns {Object|null} - Wine info if matched, null otherwise
   */
  function matchSpecificWine(query, confirmedWines = CONFIRMED_WINES) {
    const queryLower = query.toLowerCase();
    
    // Check each wine for a match
    for (const wine of confirmedWines) {
      // Check main name
      if (queryLower.includes(wine.name.toLowerCase())) {
        return wine;
      }
      
      // Check pattern
      if (queryLower.includes(wine.pattern.replace(/-/g, ' '))) {
        return wine;
      }
      
      // Check synonyms
      for (const synonym of wine.synonyms) {
        if (queryLower.includes(synonym)) {
          return wine;
        }
      }
    }
    
    return null;
  }
  
  module.exports = {
    WINE_VARIETIES,
    CONFIRMED_WINES,
    WINE_TERMS,
    extractVintage,
    extractWineName,
    isWineAvailable,
    normalizeWineName,
    matchSpecificWine
  };