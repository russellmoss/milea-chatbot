// services/rag/conversationTracking.js
const logger = require('../../utils/logger');

/**
 * Conversation state tracking for multi-turn dialogues
 */
class ConversationTracker {
  constructor() {
    this.pendingClarification = new Map(); // Track which queries need clarification
    this.clarificationResponded = new Map(); // Track when clarifications have been answered
    this.conversationContext = new Map(); // Store context between related exchanges
    
    // Wine mappings for follow-up clarification
    this.WINE_NAME_MAPPINGS = {
      'reserve': {
        specificWine: 'reserve cabernet franc',
        winePattern: 'reserve-cabernet-franc',
        wineTerms: ['reserve', 'cabernet', 'franc']
      },
      'farmhouse': {
        specificWine: 'farmhouse cabernet franc',
        winePattern: 'farmhouse-cabernet-franc',
        wineTerms: ['farmhouse', 'cabernet', 'franc']
      },
      'farmhouse chardonnay': {
        specificWine: 'farmhouse chardonnay',
        winePattern: 'farmhouse-chardonnay',
        wineTerms: ['farmhouse', 'chardonnay']
      },
      'queen': {
        specificWine: 'queen of the meadow',
        winePattern: 'queen-of-the-meadow',
        wineTerms: ['queen', 'meadow']
      },
      'proceedo': {
        specificWine: 'proceedo',
        winePattern: 'proceedo',
        wineTerms: ['proceedo']
      },
      'sang': {
        specificWine: 'sang\'s cabernet franc',
        winePattern: 'sangs-cabernet-franc',
        wineTerms: ['sang', 'cabernet', 'franc']
      },
      'hudson': {
        specificWine: 'hudson heritage chambourcin',
        winePattern: 'hudson-heritage-chambourcin',
        wineTerms: ['hudson', 'heritage', 'chambourcin']
      },
      'four seasons': {
        specificWine: 'four seasons',
        winePattern: 'four-seasons',
        wineTerms: ['four', 'seasons']
      },
      'rose': {
        specificWine: 'proceedo rosé',
        winePattern: 'proceedo-rose',
        wineTerms: ['proceedo', 'rose', 'rosé']
      },
      'rosé': {
        specificWine: 'proceedo rosé',
        winePattern: 'proceedo-rose',
        wineTerms: ['proceedo', 'rose', 'rosé']
      },
      'white': {
        specificWine: 'proceedo white',
        winePattern: 'proceedo-white',
        wineTerms: ['proceedo', 'white']
      },
      'chardonnay': {
        specificWine: 'farmhouse chardonnay',
        winePattern: 'farmhouse-chardonnay',
        wineTerms: ['farmhouse', 'chardonnay']
      }
    };
  }
  
  /**
   * Check if a response needs clarification
   * @param {string} response - Generated response to check
   * @param {Object} context - Context with multipleWines flag
   * @returns {boolean} - Whether clarification is needed
   */
  needsClarification(response, context) {
    return response.includes("which specific wine") || 
      response.includes("several different") ||
      response.includes("would you like to know more about") ||
      response.includes("we have several") ||
      (context.multipleWines === true);
  }
  
  /**
   * Find wine in query based on previously defined mappings
   * @param {string} query - User query
   * @returns {Object|null} - Wine info if found
   */
  findWineInQuery(query) {
    const queryLower = query.toLowerCase().trim();
    
    // First check for year + wine pattern (e.g. "2022 reserve cabernet franc")
    const yearWinePattern = /\b(20\d{2})\s+(.*)\b/i;
    const yearWineMatch = queryLower.match(yearWinePattern);
    
    if (yearWineMatch) {
      const year = yearWineMatch[1];
      const wineName = yearWineMatch[2].toLowerCase();
      
      for (const [key, wineInfo] of Object.entries(this.WINE_NAME_MAPPINGS)) {
        if (wineName.includes(key)) {
          return {
            ...wineInfo,
            vintage: year,
            isYearSpecific: true
          };
        }
      }
    }
    
    // Then check for regular wine names
    for (const [key, wineInfo] of Object.entries(this.WINE_NAME_MAPPINGS)) {
      if (queryLower.includes(key)) {
        return wineInfo;
      }
    }
    
    return null;
  }
  
  /**
   * Check if query is a response to pending clarification
   * @param {string} normalizedQuery - Current normalized query
   * @param {string} previousQuery - Previous query
   * @returns {boolean} - Whether this is a clarification response
   */
  isResponseToPendingClarification(normalizedQuery, previousQuery) {
    if (previousQuery && this.pendingClarification.has(previousQuery)) {
      this.pendingClarification.delete(previousQuery);
      this.clarificationResponded.set(previousQuery, normalizedQuery);
      this.logStats();
      return true;
    }
    return false;
  }
  
  /**
   * Store conversation context
   * @param {string} normalizedQuery - Current normalized query 
   * @param {string} previousResponse - Previous response
   */
  storeContext(normalizedQuery, previousResponse) {
    if (!this.conversationContext.has(normalizedQuery)) {
      logger.info(`🧠 Storing conversation context for future reference`);
      this.conversationContext.set(normalizedQuery, {
        previousQuery: previousResponse,
        timestamp: Date.now()
      });
      this.logStats();
    }
  }
  
  /**
   * Mark query as needing clarification
   * @param {string} normalizedQuery - Query needing clarification
   */
  markAsPendingClarification(normalizedQuery) {
    logger.info(`🧠 Detected clarification request in response - will not cache`);
    this.pendingClarification.set(normalizedQuery, true);
    this.logStats();
  }
  
  /**
   * Log conversation statistics
   */
  logStats() {
    logger.info(`🔄 CONV STATE: Pending clarifications: ${this.pendingClarification.size}, Responded: ${this.clarificationResponded.size}, Contexts: ${this.conversationContext.size}`);
  }
  
  /**
   * Clear conversation state
   */
  clear() {
    this.pendingClarification.clear();
    this.clarificationResponded.clear();
    this.conversationContext.clear();
    logger.info('✅ Conversation state cleared');
  }
  
  /**
   * Get conversation state statistics
   * @returns {Object} - Conversation statistics
   */
  getStats() {
    return {
      pendingClarifications: this.pendingClarification.size,
      clarificationsResponded: this.clarificationResponded.size,
      conversationContexts: this.conversationContext.size
    };
  }
}

// Create and export a singleton instance
const conversationTracker = new ConversationTracker();

module.exports = {
  conversationTracker
};