// services/rag/core.js
const logger = require('../../utils/logger');
const { classifyQuery } = require('./queryClassifier');
const { assembleContext } = require('./contextAssembler');
const { generateResponse } = require('./responseGenerator');
const { conversationTracker } = require('./conversationTracking');
const { queryCache } = require('./cacheManager');

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

/**
 * Process wine follow-up query
 * @param {string} query - User query
 * @param {Object} wineInfo - Wine information
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} - Generated response
 */
async function processWineFollowUp(query, wineInfo, requestId) {
  const startTime = Date.now();
  
  // Create an override query info for this specific wine
  const overrideQueryInfo = {
    type: 'wine',
    subtype: 'specific',
    isSpecificWine: true,
    specificWine: wineInfo.isYearSpecific ? 
      `${wineInfo.vintage} ${wineInfo.specificWine}` : wineInfo.specificWine,
    winePattern: wineInfo.winePattern,
    wineTerms: wineInfo.isYearSpecific ? 
      [...wineInfo.wineTerms, wineInfo.vintage] : wineInfo.wineTerms,
    isConfirmedWine: true,
    isFollowUp: true, // Flag to indicate this is a follow-up question
    vintage: wineInfo.vintage || undefined
  };
  
  logger.info(`🧠 [${requestId}] Using override query info for wine follow-up`);
  
  // Process the query with the wine handler directly
  logger.info(`🔄 [${requestId}] Assembling context for wine follow-up`);
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

/**
 * Check if a response is a wine clarification request
 * @param {string} response - Previous bot response
 * @returns {boolean} - Whether this is a clarification request
 */
function isWineClarificationRequest(response) {
  const clarificationPatterns = [
    "which specific wine",
    "several different",
    "would you like to know more about", 
    "we have several", 
    "I can tell you about"
  ];
  
  return clarificationPatterns.some(pattern => response.includes(pattern));
}

/**
 * Process a query through the RAG pipeline
 * @param {string} query - User query
 * @param {Array} previousMessages - Previous conversation messages
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} - Generated response with sources
 */
async function processRagPipeline(query, previousMessages, requestId) {
  const startTime = Date.now();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Handle follow-up clarification based on conversation context
  if (previousMessages.length > 0) {
    const previousResponse = previousMessages[previousMessages.length - 1];
    logger.info(`🔍 [${requestId}] Last message begins with: "${previousResponse.substring(0, 50)}..."`);
    
    if (isWineClarificationRequest(previousResponse)) {
      logger.info(`🍷 [${requestId}] Detected previous wine clarification request`);
      
      // Check if current query matches a wine name pattern
      const wineInfo = conversationTracker.findWineInQuery(query);
      if (wineInfo) {
        return processWineFollowUp(query, wineInfo, requestId);
      }
    }
    
    // Store conversation context
    conversationTracker.storeContext(normalizedQuery, previousResponse);
  }
  
  // Get previous query for context-aware caching
  const previousQuery = previousMessages.length > 0 ? 
    previousMessages[previousMessages.length - 1].toLowerCase().trim() : '';
  
  // Check if response to pending clarification
  if (conversationTracker.isResponseToPendingClarification(normalizedQuery, previousQuery)) {
    logger.info(`⚠️ [${requestId}] Detected response to previous clarification request. Skipping cache.`);
    // Skip cache and proceed with fresh response
  } else {
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
  
  // Step 1: Classify the query
  logger.info(`🧠 [${requestId}] Classifying query`);
  const queryInfo = classifyQuery(query);
  logger.info(`🏷️ [${requestId}] Query classified as: ${queryInfo.type} (subtype: ${queryInfo.subtype || 'none'})`);

  // Step 2: Assemble context
  logger.info(`🔄 [${requestId}] Assembling context for query`);
  const context = await assembleContext(query, queryInfo);
  logger.info(`📚 [${requestId}] Retrieved ${context.documents?.length || 0} relevant documents in ${Date.now() - startTime}ms`);
  
  if (context.documents?.length > 0) {
    logger.info(`📄 [${requestId}] Top document source: ${context.documents[0].metadata?.source || 'unknown'}`);
  }
  
  if (context.multipleWines) {
    logger.info(`🍷 [${requestId}] Multiple wines detected in context`);
  }

  // Step 3: Handle query with appropriate domain handler
  const handler = DOMAIN_HANDLERS[queryInfo.type] || generalHandler;
  
  const handlerStartTime = Date.now();
  logger.info(`🔄 [${requestId}] Executing ${queryInfo.type} domain handler`);
  let responseData = await handler.handleQuery(query, queryInfo, context);
  logger.info(`⏱️ [${requestId}] ${queryInfo.type} handler completed in ${Date.now() - handlerStartTime}ms`);

  // Step 4: Generate final response if not already generated
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
  
  // Check if clarification is needed
  if (conversationTracker.needsClarification(result.response, context)) {
    conversationTracker.markAsPendingClarification(normalizedQuery);
  } else {
    // Cache the final response
    const contextualKey = previousQuery ? 
      `${previousQuery}|response:${normalizedQuery}` : normalizedQuery;
    logger.info(`💾 [${requestId}] Caching final response with key: "${contextualKey.substring(0, 50)}..."`);
    queryCache.set(contextualKey, result);
  }
  
  // Log total processing time
  logger.info(`✅ [${requestId}] Total processing time for query: ${Date.now() - startTime}ms`);
  logger.info(`📏 [${requestId}] Response length: ${result.response.length} characters`);
  
  return result;
}

module.exports = {
  processRagPipeline,
  DOMAIN_HANDLERS
};