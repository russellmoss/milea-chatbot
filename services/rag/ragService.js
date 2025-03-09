// services/rag/ragService.js
// Core RAG service with shared functionality, performance optimizations, and conversation state tracking
// Enhanced with extensive debugging

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
    logger.info(`🔍 CACHE: Attempting to store key "${key.substring(0, 30)}..."`);
    
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
      
      logger.info(`🔍 CACHE: Cache full, removing oldest key "${oldestKey.substring(0, 30)}..."`);
      delete this.cache[oldestKey];
    }
    
    // Add new entry
    this.cache[key] = {
      value: value,
      timestamp: Date.now()
    };
    logger.info(`🔍 CACHE: Successfully stored key, current cache size: ${Object.keys(this.cache).length}`);
  },
  
  get: function(key) {
    logger.info(`🔍 CACHE: Attempting to retrieve key "${key.substring(0, 30)}..."`);
    
    const entry = this.cache[key];
    if (!entry) {
      logger.info(`🔍 CACHE: Key not found in cache`);
      return undefined;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      logger.info(`🔍 CACHE: Key found but expired (TTL: ${this.ttl}ms, Age: ${Date.now() - entry.timestamp}ms)`);
      delete this.cache[key];
      return undefined;
    }
    
    // Update access time
    entry.timestamp = Date.now();
    logger.info(`🔍 CACHE: Key found and valid, updating timestamp`);
    return entry.value;
  },
  
  has: function(key) {
    logger.info(`🔍 CACHE: Checking if key exists "${key.substring(0, 30)}..."`);
    
    const entry = this.cache[key];
    if (!entry) {
      logger.info(`🔍 CACHE: Key does not exist`);
      return false;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      logger.info(`🔍 CACHE: Key exists but expired (TTL: ${this.ttl}ms, Age: ${Date.now() - entry.timestamp}ms)`);
      delete this.cache[key];
      return false;
    }
    
    logger.info(`🔍 CACHE: Key exists and is valid`);
    return true;
  },
  
  clear: function() {
    logger.info(`🔍 CACHE: Clearing entire cache of ${Object.keys(this.cache).length} entries`);
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

/**
 * Helper to log conversation state statistics
 */
function logConversationStats() {
  logger.info(`🔄 CONV STATE: Pending clarifications: ${conversationState.pendingClarification.size}, Responded: ${conversationState.clarificationResponded.size}, Contexts: ${conversationState.conversationContext.size}`);
}

/**
 * Main entry point for RAG response generation
 * @param {string} query - User's query
 * @param {Array} previousMessages - Previous messages in the conversation
 * @returns {Promise<Object>} - Generated response with sources
 */
async function generateRAGResponse(query, previousMessages = []) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  logger.info(`🚀 [${requestId}] Starting RAG processing for query: "${query}"`);
  logger.info(`📜 [${requestId}] Previous messages count: ${previousMessages.length}`);
  logConversationStats();
  
  try {
    // First check if this is an answer to a previous clarification
    const normalizedQuery = query.toLowerCase().trim();
    
    // Handle follow-up clarification based on conversation context
    if (previousMessages.length > 0) {
      const previousResponse = previousMessages[previousMessages.length - 1];
      logger.info(`🔍 [${requestId}] Last message begins with: "${previousResponse.substring(0, 50)}..."`);
      
      // Check if previous message was a clarification request about wines
      const clarificationPatterns = [
        "which specific wine",
        "several different",
        "would you like to know more about", 
        "we have several", 
        "I can tell you about"
      ];
      
      const isClarification = clarificationPatterns.some(pattern => 
        previousResponse.includes(pattern)
      );
      
      if (isClarification) {
        logger.info(`🍷 [${requestId}] Detected previous wine clarification request`);
        
        // Check if current query matches a wine name pattern
        const queryLower = query.toLowerCase().trim();
        
        // Check for specific year + wine name pattern
        const yearWinePattern = /\b(20\d{2})\s+(.*)\b/i;
        const yearWineMatch = queryLower.match(yearWinePattern);
        
        if (yearWineMatch) {
          const year = yearWineMatch[1];
          const wineName = yearWineMatch[2].toLowerCase();
          
          logger.info(`🍷 [${requestId}] Detected year-wine pattern: Year ${year}, Wine "${wineName}"`);
          
          // Check if this is a complete wine name with year
          for (const [key, wineInfo] of Object.entries(WINE_NAME_MAPPINGS)) {
            if (wineName.includes(key)) {
              logger.wine(`🍷 [${requestId}] Follow-up matches complete wine with year: ${year} ${wineInfo.specificWine}`);
              
              // Create an override query info for this specific wine with vintage
              const overrideQueryInfo = {
                type: 'wine',
                subtype: 'specific',
                isSpecificWine: true,
                specificWine: `${year} ${wineInfo.specificWine}`,
                winePattern: wineInfo.winePattern,
                wineTerms: [...wineInfo.wineTerms, year],
                isConfirmedWine: true,
                isFollowUp: true,
                vintage: year
              };
              
              logger.info(`🧠 [${requestId}] Using override query info for wine with year`);
              
              // Skip the normal follow-up detection and directly process this as a specific wine query
              logger.info(`🔄 [${requestId}] Assembling context for specific wine with year`);
              const context = await assembleContext(query, overrideQueryInfo);
              logger.info(`🔄 [${requestId}] Context assembled with ${context.documents?.length || 0} documents`);
              
              logger.info(`🔄 [${requestId}] Calling wine handler with override query info`);
              const responseData = await wineHandler.handleQuery(query, overrideQueryInfo, context);
              
              // Generate the final response
              if (!responseData.response) {
                logger.info(`🔄 [${requestId}] Wine handler returned no direct response, generating response`);
                const finalResponse = await generateResponse(query, overrideQueryInfo, context, responseData);
                
                logger.info(`✅ [${requestId}] Total processing time for wine+year follow-up: ${Date.now() - startTime}ms`);
                return {
                  response: finalResponse.response,
                  sources: finalResponse.sources || context.documents.map(doc => doc.metadata.source)
                };
              }
              
              logger.info(`✅ [${requestId}] Total processing time for wine+year follow-up: ${Date.now() - startTime}ms`);
              return responseData;
            }
          }
        }
        
        // Log the follow-up detection
        logger.info(`🧠 [${requestId}] Detected potential wine follow-up: "${queryLower}"`);
        
        // Check for wine matches in the query
        for (const [key, wineInfo] of Object.entries(WINE_NAME_MAPPINGS)) {
          if (queryLower.includes(key)) {
            logger.wine(`🍷 [${requestId}] Follow-up matches wine: ${wineInfo.specificWine}`);
            
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
            logger.info(`🔄 [${requestId}] Assembling context for specific wine follow-up`);
            const context = await assembleContext(query, overrideQueryInfo);
            logger.info(`🔄 [${requestId}] Context assembled with ${context.documents?.length || 0} documents`);
            
            logger.info(`🔄 [${requestId}] Calling wine handler with follow-up query info`);
            const responseData = await wineHandler.handleQuery(query, overrideQueryInfo, context);
            
            // If handler didn't generate a complete response, use the response generator
            if (!responseData.response) {
              logger.info(`🔄 [${requestId}] Wine handler returned no direct response, generating response`);
              const finalResponse = await generateResponse(query, overrideQueryInfo, context, responseData);
              
              logger.info(`✅ [${requestId}] Total processing time for wine follow-up: ${Date.now() - startTime}ms`);
              return {
                response: finalResponse.response,
                sources: finalResponse.sources || context.documents.map(doc => doc.metadata.source)
              };
            }
            
            logger.info(`✅ [${requestId}] Total processing time for wine follow-up: ${Date.now() - startTime}ms`);
            return responseData;
          }
        }
      }
      
      // Store conversation context for potential future use
      if (!conversationState.conversationContext.has(normalizedQuery)) {
        logger.info(`🧠 [${requestId}] Storing conversation context for future reference`);
        conversationState.conversationContext.set(normalizedQuery, {
          previousQuery: previousMessages[previousMessages.length - 1],
          timestamp: Date.now()
        });
        logConversationStats();
      }
    }
    
    // Get the previous message if available for context-aware caching
    const previousQuery = previousMessages.length > 0 ? 
      previousMessages[previousMessages.length - 1].toLowerCase().trim() : '';
    
    // Check if the previous message was a clarification request
    if (previousQuery && conversationState.pendingClarification.has(previousQuery)) {
      // This is likely a response to a clarification question, so don't use the cache
      logger.info(`⚠️ [${requestId}] Detected response to previous clarification request. Skipping cache.`);
      conversationState.pendingClarification.delete(previousQuery);
      conversationState.clarificationResponded.set(previousQuery, normalizedQuery);
      logConversationStats();
      
      // Proceed with generating a fresh response
    } else {
      // Only use cache for non-clarification responses
      // Create a context-aware cache key that includes relevant previous message
      const contextualKey = previousQuery ? 
        `${previousQuery}|response:${normalizedQuery}` : normalizedQuery;
      
      // Check cache with the contextual key
      if (queryCache.has(contextualKey)) {
        logger.info(`🎯 [${requestId}] Cache hit for query with context: "${query}"`);
        const cachedResult = queryCache.get(contextualKey);
        logger.info(`⚡ [${requestId}] Response served from cache in ${Date.now() - startTime}ms`);
        return cachedResult;
      } else {
        logger.info(`❓ [${requestId}] Cache miss for key: "${contextualKey.substring(0, 50)}..."`);
      }
    }
    
    logger.search(`🔍 [${requestId}] Processing new query: "${query}"`);
    
    // Step 1: Classify the query to determine the domain
    logger.info(`🧠 [${requestId}] Classifying query`);
    const queryInfo = classifyQuery(query);
    logger.info(`🏷️ [${requestId}] Query classified as: ${queryInfo.type} (subtype: ${queryInfo.subtype || 'none'})`);

    // Step 2: Start context assembly immediately after classification (parallelized)
    logger.info(`🔄 [${requestId}] Assembling context for query`);
    const contextPromise = assembleContext(query, queryInfo);
    
    // Wait for context to be ready
    const context = await contextPromise;
    logger.info(`📚 [${requestId}] Retrieved ${context.documents?.length || 0} relevant documents in ${Date.now() - startTime}ms`);
    if (context.documents?.length > 0) {
      logger.info(`📄 [${requestId}] Top document source: ${context.documents[0].metadata?.source || 'unknown'}`);
    }
    if (context.multipleWines) {
      logger.info(`🍷 [${requestId}] Multiple wines detected in context`);
    }

    // Step 3: Handle the query with the appropriate domain handler
    let responseData;
    const handler = DOMAIN_HANDLERS[queryInfo.type] || generalHandler;
    
    // Measure handler execution time
    const handlerStartTime = Date.now();
    logger.info(`🔄 [${requestId}] Executing ${queryInfo.type} domain handler`);
    responseData = await handler.handleQuery(query, queryInfo, context);
    logger.info(`⏱️ [${requestId}] ${queryInfo.type} handler completed in ${Date.now() - handlerStartTime}ms`);

    // Step 4: Generate the final response if not already generated by domain handler
    if (!responseData.response) {
      logger.info(`🔄 [${requestId}] No response from handler, generating with responseGenerator`);
      const generatorStartTime = Date.now();
      responseData = await generateResponse(query, queryInfo, context, responseData);
      logger.info(`⏱️ [${requestId}] Response generation completed in ${Date.now() - generatorStartTime}ms`);
    } else {
      logger.info(`📝 [${requestId}] Using response directly from domain handler`);
    }

    const result = {
      response: responseData.response,
      sources: responseData.sources || context.documents.map(doc => doc.metadata.source)
    };
    
    // Check if this is a response that requires clarification
    const isClarificationQuestion = 
      result.response.includes("which specific wine") || 
      result.response.includes("several different") ||
      result.response.includes("would you like to know more about") ||
      result.response.includes("we have several") ||
      (context.multipleWines === true);
    
    if (isClarificationQuestion) {
      // Mark this query as needing clarification (don't cache it)
      logger.info(`🧠 [${requestId}] Detected clarification request in response - will not cache`);
      conversationState.pendingClarification.set(normalizedQuery, true);
      logConversationStats();
    } else {
      // This is a final answer, so cache it
      const contextualKey = previousQuery ? 
        `${previousQuery}|response:${normalizedQuery}` : normalizedQuery;
      logger.info(`💾 [${requestId}] Caching final response with key: "${contextualKey.substring(0, 50)}..."`);
      queryCache.set(contextualKey, result);
    }
    
    // Log total processing time
    logger.info(`✅ [${requestId}] Total processing time for query: ${Date.now() - startTime}ms`);
    logger.info(`📏 [${requestId}] Response length: ${result.response.length} characters`);
    
    return result;
  } catch (error) {
    logger.error(`❌ [${requestId}] RAG Response Generation Error: ${error.message}`);
    logger.error(`🔍 [${requestId}] Error stack: ${error.stack}`);
    
    // Log error with timing information
    logger.error(`⏱️ [${requestId}] Error occurred after ${Date.now() - startTime}ms of processing`);
    
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
  logger.info(`🧹 Clearing query cache and conversation state`);
  queryCache.clear();
  conversationState.pendingClarification.clear();
  conversationState.clarificationResponded.clear();
  conversationState.conversationContext.clear();
  logger.info(`✅ Query cache and conversation state cleared`);
}

/**
 * Get cache and conversation statistics
 * @returns {Object} - Cache and conversation statistics
 */
function getCacheStats() {
  const stats = {
    size: queryCache.size,
    itemCount: queryCache.size,
    maxSize: queryCache.maxSize,
    pendingClarifications: conversationState.pendingClarification.size,
    clarificationsResponded: conversationState.clarificationResponded.size,
    conversationContexts: conversationState.conversationContext.size
  };
  
  logger.info(`📊 Cache stats: ${JSON.stringify(stats)}`);
  return stats;
}

module.exports = {
  generateRAGResponse,
  clearQueryCache,
  getCacheStats
};