// services/rag/ragService.js
// Core RAG service with shared functionality, performance optimizations, and conversation state tracking

const logger = require('../../utils/logger');
const { classifyQuery } = require('./queryClassifier');
const { assembleContext } = require('./contextAssembler');
const { generateResponse } = require('./responseGenerator');

// Simple in-memory cache implementation
const queryCache = {
  cache: {},
  maxSize: 100,
  ttl: 1000 * 60 * 15, // 15 minutes in milliseconds
  
  set: function(key, value) {
    // Remove oldest entry if we're at capacity
    const keys = Object.keys(this.cache);
    if (keys.length >= this.maxSize) {
      let oldestKey = keys[0];
      let oldestTime = this.cache[oldestKey].timestamp;
      
      for (const k of keys) {
        if (this.cache[k].timestamp < oldestTime) {
          oldestKey = k;
          oldestTime = this.cache[k].timestamp;
        }
      }
      
      delete this.cache[oldestKey];
    }
    
    // Add new entry
    this.cache[key] = {
      value: value,
      timestamp: Date.now()
    };
  },
  
  get: function(key) {
    const entry = this.cache[key];
    if (!entry) return undefined;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      delete this.cache[key];
      return undefined;
    }
    
    // Update access time
    entry.timestamp = Date.now();
    return entry.value;
  },
  
  has: function(key) {
    const entry = this.cache[key];
    if (!entry) return false;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      delete this.cache[key];
      return false;
    }
    
    return true;
  },
  
  clear: function() {
    this.cache = {};
  },
  
  // Add simple stats functionality
  get size() {
    return Object.keys(this.cache).length;
  }
};

// Add conversation state tracking
const conversationState = {
  pendingClarification: new Map(), // Track which queries need clarification
  clarificationResponded: new Map(), // Track when clarifications have been answered
  conversationContext: new Map() // Store context between related exchanges
};

// Domain handlers
const wineHandler = require('./domains/wineHandler');
const visitingHandler = require('./domains/visitingHandler');
const clubHandler = require('./domains/clubHandler');
const merchandiseHandler = require('./domains/merchandiseHandler');
const generalHandler = require('./domains/generalHandler');
const sustainabilityHandler = require('./domains/sustainabilityHandler');
const wine_productionHandler = require('./domains/wine_productionHandler');
const loyaltyHandler = require('./domains/loyaltyHandler');
const businessHoursHandler = require('./domains/businessHoursHandler');

// Map domain types to their handlers for cleaner code
const DOMAIN_HANDLERS = {
  'business-hours': businessHoursHandler,
  'wine': wineHandler,
  'visiting': visitingHandler,
  'club': clubHandler,
  'merchandise': merchandiseHandler,
  'sustainability': sustainabilityHandler,
  'wine_production': wine_productionHandler,
  'loyalty': loyaltyHandler,
  'general': generalHandler
};

// Wine mappings for follow-up clarification
const WINE_NAME_MAPPINGS = {
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
  }
};

/**
 * Main entry point for RAG response generation
 * @param {string} query - User's query
 * @param {Array} previousMessages - Previous messages in the conversation
 * @returns {Promise<Object>} - Generated response with sources
 */
async function generateRAGResponse(query, previousMessages = []) {
  const startTime = Date.now();
  
  try {
    // First check if this is an answer to a previous clarification
    const normalizedQuery = query.toLowerCase().trim();
    
    // Handle follow-up clarification based on conversation context
    if (previousMessages.length > 0) {
      const previousResponse = previousMessages[previousMessages.length - 1];
      
      // Check if previous message was a clarification request about wines
      if (previousResponse.includes("which specific wine") || 
          previousResponse.includes("several different") ||
          previousResponse.includes("would you like to know more about") ||
          previousResponse.includes("we have several") ||
          previousResponse.includes("I can tell you about")) {
        
        // Check if current query matches a wine name pattern
        const queryLower = query.toLowerCase().trim();
        
        // Log the follow-up detection
        logger.info(`🧠 Detected potential wine follow-up: "${queryLower}"`);
        
        // Check for wine matches in the query
        for (const [key, wineInfo] of Object.entries(WINE_NAME_MAPPINGS)) {
          if (queryLower.includes(key)) {
            logger.wine(`🍷 Follow-up matches wine: ${wineInfo.specificWine}`);
            
            // Create an override query info for this specific follow-up
            const overrideQueryInfo = {
              type: 'wine',
              subtype: 'specific',
              isSpecificWine: true,
              specificWine: wineInfo.specificWine,
              winePattern: wineInfo.winePattern,
              wineTerms: wineInfo.wineTerms,
              isConfirmedWine: true,
              isFollowUp: true // Flag to indicate this is a follow-up question
            };
            
            // Process the query with the wine handler directly
            const context = await assembleContext(query, overrideQueryInfo);
            const responseData = await wineHandler.handleQuery(query, overrideQueryInfo, context);
            
            // If handler didn't generate a complete response, use the response generator
            if (!responseData.response) {
              const finalResponse = await generateResponse(query, overrideQueryInfo, context, responseData);
              
              logger.info(`Total processing time for wine follow-up: ${Date.now() - startTime}ms`);
              return {
                response: finalResponse.response,
                sources: finalResponse.sources || context.documents.map(doc => doc.metadata.source)
              };
            }
            
            logger.info(`Total processing time for wine follow-up: ${Date.now() - startTime}ms`);
            return responseData;
          }
        }
      }
      
      // Store conversation context for potential future use
      if (!conversationState.conversationContext.has(normalizedQuery)) {
        conversationState.conversationContext.set(normalizedQuery, {
          previousQuery: previousMessages[previousMessages.length - 1],
          timestamp: Date.now()
        });
      }
    }
    
    // Get the previous message if available for context-aware caching
    const previousQuery = previousMessages.length > 0 ? 
      previousMessages[previousMessages.length - 1].toLowerCase().trim() : '';
    
    // Check if the previous message was a clarification request
    if (previousQuery && conversationState.pendingClarification.has(previousQuery)) {
      // This is likely a response to a clarification question, so don't use the cache
      logger.info(`⚠️ Detected response to previous clarification request. Skipping cache.`);
      conversationState.pendingClarification.delete(previousQuery);
      conversationState.clarificationResponded.set(previousQuery, normalizedQuery);
      
      // Proceed with generating a fresh response
    } else {
      // Only use cache for non-clarification responses
      // Create a context-aware cache key that includes relevant previous message
      const contextualKey = previousQuery ? 
        `${previousQuery}|response:${normalizedQuery}` : normalizedQuery;
      
      // Check cache with the contextual key
      if (queryCache.has(contextualKey)) {
        logger.info(`Cache hit for query with context: "${query}"`);
        const cachedResult = queryCache.get(contextualKey);
        logger.info(`Response served from cache in ${Date.now() - startTime}ms`);
        return cachedResult;
      }
    }
    
    logger.search(`Processing new query: "${query}"`);
    
    // Step 1: Classify the query to determine the domain
    const queryInfo = classifyQuery(query);
    logger.info(`Query classified as: ${queryInfo.type} (subtype: ${queryInfo.subtype || 'none'})`);

    // Step 2: Start context assembly immediately after classification (parallelized)
    const contextPromise = assembleContext(query, queryInfo);
    
    // Perform any other independent operations here while context is being assembled
    // For example, if we need to fetch external data that doesn't depend on context

    // Wait for context to be ready
    const context = await contextPromise;
    logger.info(`Retrieved ${context.documents.length} relevant documents in ${Date.now() - startTime}ms`);

    // Step 3: Handle the query with the appropriate domain handler
    let responseData;
    const handler = DOMAIN_HANDLERS[queryInfo.type] || generalHandler;
    
    // Measure handler execution time
    const handlerStartTime = Date.now();
    responseData = await handler.handleQuery(query, queryInfo, context);
    logger.info(`${queryInfo.type} handler completed in ${Date.now() - handlerStartTime}ms`);

    // Step 4: Generate the final response if not already generated by domain handler
    if (!responseData.response) {
      const generatorStartTime = Date.now();
      responseData = await generateResponse(query, queryInfo, context, responseData);
      logger.info(`Response generation completed in ${Date.now() - generatorStartTime}ms`);
    }

    const result = {
      response: responseData.response,
      sources: responseData.sources || context.documents.map(doc => doc.metadata.source)
    };
    
    // Before storing in cache, check if this is a clarification question
    const isClarificationQuestion = 
      responseData.response.includes("which specific wine") || 
      responseData.response.includes("several different") ||
      responseData.response.includes("would you like to know more about") ||
      responseData.response.includes("we have several") ||
      (context.multipleWines === true);
    
    if (isClarificationQuestion) {
      // Mark this query as needing clarification (don't cache it)
      conversationState.pendingClarification.set(normalizedQuery, true);
      logger.info(`🧠 Detected clarification request - will not cache`);
    } else {
      // This is a final answer, so cache it
      const contextualKey = previousQuery ? 
        `${previousQuery}|response:${normalizedQuery}` : normalizedQuery;
      queryCache.set(contextualKey, result);
    }
    
    // Log total processing time
    logger.info(`Total processing time for query: ${Date.now() - startTime}ms`);
    
    return result;
  } catch (error) {
    logger.error('RAG Response Generation Error:', error);
    
    // Log error with timing information
    logger.error(`Error occurred after ${Date.now() - startTime}ms of processing`);
    
    return { 
      response: "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your question.",
      sources: []
    };
  }
}

/**
 * Clear the query cache and conversation state
 * @returns {void}
 */
function clearQueryCache() {
  queryCache.clear();
  conversationState.pendingClarification.clear();
  conversationState.clarificationResponded.clear();
  conversationState.conversationContext.clear();
  logger.info('Query cache and conversation state cleared');
}

/**
 * Get cache and conversation statistics
 * @returns {Object} - Cache and conversation statistics
 */
function getCacheStats() {
  return {
    size: queryCache.size,
    itemCount: queryCache.size,
    maxSize: queryCache.maxSize,
    pendingClarifications: conversationState.pendingClarification.size,
    clarificationsResponded: conversationState.clarificationResponded.size,
    conversationContexts: conversationState.conversationContext.size
  };
}

module.exports = {
  generateRAGResponse,
  clearQueryCache,
  getCacheStats
};