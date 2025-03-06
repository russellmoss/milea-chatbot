# Google Search API Integration - Milea Estate Vineyard Chatbot

> [AI DEVELOPMENT GUIDE] This document provides comprehensive instructions for integrating Google Search API into the Milea Estate Vineyard chatbot to retrieve up-to-date website content.

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Domain-Restricted Search Implementation](#domain-restricted-search-implementation)
4. [Response Parsing Techniques](#response-parsing-techniques)
5. [Integration with RAG System](#integration-with-rag-system)
6. [Error Handling and Fallbacks](#error-handling-and-fallbacks)
7. [Rate Limiting and Optimization](#rate-limiting-and-optimization)
8. [Complete Implementation Example](#complete-implementation-example)

## Overview

The Google Search API integration allows the Milea Estate Vineyard chatbot to retrieve the latest information from the vineyard's website (mileaestatevineyard.com). This is particularly valuable for:

- Finding current events, wine releases, and news
- Accessing up-to-date tasting room hours and policies
- Retrieving information not included in the static knowledge base
- Providing links to specific pages for more information

In the RAG architecture, Google Search API serves as a complementary data source alongside the static knowledge base and Commerce7 product information.

## Setup Instructions

### 1. Create a Google Cloud Project

```
1. Go to the Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID for configuration
```

### 2. Enable the Custom Search API

```
1. Navigate to "APIs & Services" > "Library"
2. Search for "Custom Search API"
3. Click "Enable" to activate the API for your project
```

### 3. Create API Credentials

```
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your new API key
4. (Optional but recommended) Restrict the API key to only the Custom Search API
```

### 4. Set Up a Custom Search Engine

```
1. Go to the Programmable Search Engine Control Panel (https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. Enter a name (e.g., "Milea Estate Vineyard Search")
4. Under "Sites to search", enter "mileaestatevineyard.com"
5. Check "Search only included sites"
6. Click "Create"
7. On the next page, note your Search Engine ID (cx parameter)
```

### 5. Configure Environment Variables

Create or update your `.env` file to include:

```
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
GOOGLE_SEARCH_DOMAIN=mileaestatevineyard.com
```

### 6. Install Required Dependencies

```bash
npm install axios dotenv
```

## Domain-Restricted Search Implementation

### Basic Search Function

```javascript
const axios = require('axios');
require('dotenv').config();

/**
 * Perform a domain-restricted Google search
 * @param {string} query - User query to search for
 * @param {number} resultsCount - Number of results to retrieve (max 10)
 * @returns {Promise<Object>} - Search results
 */
async function searchMileaWebsite(query, resultsCount = 5) {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    // Clean and prepare the query
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    
    // Build URL with query parameters
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: apiKey,
      cx: searchEngineId,
      q: cleanQuery,
      num: Math.min(resultsCount, 10) // API maximum is 10 results per request
    };
    
    // Execute search request
    const response = await axios.get(url, { params });
    
    // Return the response data
    return response.data;
  } catch (error) {
    console.error('Error searching Milea website:', error.message);
    throw error;
  }
}
```

### Enhanced Domain-Restricted Search

```javascript
/**
 * Enhanced search with additional parameters for more precise results
 * @param {string} query - User query to search for
 * @param {Object} options - Additional search options
 * @returns {Promise<Object>} - Search results
 */
async function enhancedMileaSearch(query, options = {}) {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const domain = process.env.GOOGLE_SEARCH_DOMAIN;
    
    // Default options
    const defaultOptions = {
      resultsCount: 5,
      siteRestrict: true,
      exactTerms: null,
      dateRestrict: null, // Example: 'd[number]' for days, 'w[number]' for weeks, 'm[number]' for months, 'y[number]' for years
      fileType: null
    };
    
    // Merge default options with user options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Clean and prepare the query
    let cleanQuery = query.trim().replace(/\s+/g, ' ');
    
    // Add site restriction if enabled
    if (mergedOptions.siteRestrict) {
      cleanQuery = `${cleanQuery} site:${domain}`;
    }
    
    // Build URL with query parameters
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: apiKey,
      cx: searchEngineId,
      q: cleanQuery,
      num: Math.min(mergedOptions.resultsCount, 10)
    };
    
    // Add optional parameters if provided
    if (mergedOptions.exactTerms) {
      params.exactTerms = mergedOptions.exactTerms;
    }
    
    if (mergedOptions.dateRestrict) {
      params.dateRestrict = mergedOptions.dateRestrict;
    }
    
    if (mergedOptions.fileType) {
      params.fileType = mergedOptions.fileType;
    }
    
    // Execute search request
    const response = await axios.get(url, { params });
    
    // Return the response data
    return response.data;
  } catch (error) {
    console.error('Error in enhanced Milea search:', error.message);
    throw error;
  }
}
```

### Category-Specific Search Functions

```javascript
/**
 * Search specifically for event information
 * @param {string} query - User query about events
 * @returns {Promise<Object>} - Search results focused on events
 */
async function searchMileaEvents(query) {
  return enhancedMileaSearch(`${query} event`, {
    resultsCount: 3,
    exactTerms: 'event tasting',
    dateRestrict: 'm3' // Restrict to last 3 months
  });
}

/**
 * Search specifically for wine information
 * @param {string} query - User query about wines
 * @returns {Promise<Object>} - Search results focused on wines
 */
async function searchMileaWines(query) {
  return enhancedMileaSearch(`${query} wine`, {
    resultsCount: 5,
    exactTerms: 'wine'
  });
}

/**
 * Search specifically for visiting information
 * @param {string} query - User query about visiting
 * @returns {Promise<Object>} - Search results focused on visiting
 */
async function searchMileaVisiting(query) {
  return enhancedMileaSearch(`${query} visit tasting room hours`, {
    resultsCount: 3,
    exactTerms: 'visit'
  });
}
```

## Response Parsing Techniques

### Basic Results Extraction

```javascript
/**
 * Extract clean, usable results from Google Search API response
 * @param {Object} searchResponse - Full response from Google Search API
 * @returns {Array} - Cleaned, parsed search results
 */
function extractSearchResults(searchResponse) {
  // Check if we have valid results
  if (!searchResponse.items || searchResponse.items.length === 0) {
    return [];
  }
  
  // Map raw results to a cleaner format
  return searchResponse.items.map(item => {
    return {
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      pagemap: item.pagemap || {}
    };
  });
}
```

### Rich Data Extraction

```javascript
/**
 * Extract rich data from search results including images and metadata
 * @param {Object} searchResponse - Full response from Google Search API
 * @returns {Array} - Enhanced search results with rich data
 */
function extractRichSearchResults(searchResponse) {
  // Check if we have valid results
  if (!searchResponse.items || searchResponse.items.length === 0) {
    return [];
  }
  
  // Map raw results to an enhanced format with rich data
  return searchResponse.items.map(item => {
    // Extract image if available
    let image = null;
    if (item.pagemap && item.pagemap.cse_image && item.pagemap.cse_image.length > 0) {
      image = item.pagemap.cse_image[0].src;
    }
    
    // Extract publish date if available
    let publishDate = null;
    if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags.length > 0) {
      publishDate = item.pagemap.metatags[0]['article:published_time'] || null;
    }
    
    // Extract description from Open Graph tags if available
    let description = item.snippet || '';
    if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags.length > 0) {
      if (item.pagemap.metatags[0]['og:description']) {
        description = item.pagemap.metatags[0]['og:description'];
      }
    }
    
    return {
      title: item.title || '',
      link: item.link || '',
      snippet: description,
      image: image,
      publishDate: publishDate,
      displayLink: item.displayLink || '',
      pathSegments: extractPathSegments(item.link)
    };
  });
}

/**
 * Extract path segments from URL for categorization
 * @param {string} url - URL to process
 * @returns {Array} - Path segments
 */
function extractPathSegments(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.split('/').filter(segment => segment.length > 0);
  } catch (error) {
    return [];
  }
}
```

### Content Categorization

```javascript
/**
 * Categorize search results by content type
 * @param {Array} searchResults - Extracted search results
 * @returns {Object} - Categorized results
 */
function categorizeSearchResults(searchResults) {
  const categories = {
    events: [],
    wines: [],
    visiting: [],
    about: [],
    blog: [],
    other: []
  };
  
  searchResults.forEach(result => {
    // Extract the path for categorization
    const path = result.pathSegments || [];
    const url = result.link.toLowerCase();
    
    // Categorize based on URL patterns and content
    if (path.includes('events') || url.includes('event') || url.includes('calendar')) {
      categories.events.push(result);
    }
    else if (path.includes('wines') || path.includes('products') || url.includes('wine')) {
      categories.wines.push(result);
    }
    else if (path.includes('visit') || url.includes('tasting-room') || url.includes('hours')) {
      categories.visiting.push(result);
    }
    else if (path.includes('about') || path.includes('story') || path.includes('team')) {
      categories.about.push(result);
    }
    else if (path.includes('blog') || path.includes('news') || path.includes('post')) {
      categories.blog.push(result);
    }
    else {
      categories.other.push(result);
    }
  });
  
  return categories;
}
```

### Content Snippet Optimization

```javascript
/**
 * Optimize snippets for chat response
 * @param {Array} searchResults - Extracted search results
 * @returns {Array} - Results with optimized snippets
 */
function optimizeSnippets(searchResults) {
  return searchResults.map(result => {
    let snippet = result.snippet || '';
    
    // Remove HTML entities
    snippet = snippet.replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"');
    
    // Truncate to reasonable length for chat
    if (snippet.length > 200) {
      snippet = snippet.substring(0, 197) + '...';
    }
    
    // Ensure snippet ends with proper punctuation
    if (snippet.length > 0 && !snippet.endsWith('.') && !snippet.endsWith('!') && !snippet.endsWith('?') && !snippet.endsWith('...')) {
      snippet += '.';
    }
    
    return {
      ...result,
      snippet
    };
  });
}
```

## Integration with RAG System

### Combining with RAG Knowledge

```javascript
/**
 * Integrate Google Search results with RAG knowledge
 * @param {string} query - User query
 * @param {Array} ragResults - Results from RAG system
 * @returns {Promise<Object>} - Combined context
 */
async function enhanceRagWithWebContent(query, ragResults) {
  try {
    // Search website for related content
    const searchResponse = await searchMileaWebsite(query);
    const webResults = extractRichSearchResults(searchResponse);
    
    // Check if we need website results based on RAG coverage
    const needsWebContent = evaluateRagCoverage(query, ragResults);
    
    // If RAG provides good coverage, limit web results
    const filteredWebResults = needsWebContent 
      ? webResults 
      : webResults.slice(0, 1); // Just return top result if RAG is sufficient
    
    // Combine into a unified context object
    return {
      query,
      sources: {
        rag: {
          results: ragResults,
          count: ragResults.length
        },
        web: {
          results: filteredWebResults,
          count: filteredWebResults.length
        }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error enhancing RAG with web content:', error);
    
    // Return just RAG results if web search fails
    return {
      query,
      sources: {
        rag: {
          results: ragResults,
          count: ragResults.length
        },
        web: {
          results: [],
          count: 0,
          error: error.message
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Evaluate if RAG results provide sufficient coverage for the query
 * @param {string} query - User query
 * @param {Array} ragResults - Results from RAG system
 * @returns {boolean} - Whether web content is needed
 */
function evaluateRagCoverage(query, ragResults) {
  // No RAG results means we definitely need web content
  if (!ragResults || ragResults.length === 0) {
    return true;
  }
  
  // Extract keywords from the query
  const keywords = extractKeywords(query);
  
  // Count how many keywords are covered in RAG results
  let coveredKeywords = 0;
  const ragContent = ragResults.map(r => r.pageContent || '').join(' ').toLowerCase();
  
  keywords.forEach(keyword => {
    if (ragContent.includes(keyword.toLowerCase())) {
      coveredKeywords++;
    }
  });
  
  // If coverage is less than 70%, get web content
  return (coveredKeywords / Math.max(keywords.length, 1)) < 0.7;
}

/**
 * Extract keywords from query
 * @param {string} query - User query
 * @returns {Array} - Keywords
 */
function extractKeywords(query) {
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'have', 'has', 'had', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how'];
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word));
}
```

### Context Preparation for LLM

```javascript
/**
 * Prepare combined context for LLM prompt
 * @param {Object} combinedContext - Context from both RAG and web search
 * @returns {string} - Formatted context for prompt
 */
function prepareContextForLLM(combinedContext) {
  let contextText = '';
  
  // Add RAG knowledge
  if (combinedContext.sources.rag.results.length > 0) {
    contextText += '--- VINEYARD KNOWLEDGE ---\n';
    combinedContext.sources.rag.results.forEach((result, index) => {
      contextText += `[Document ${index + 1}] ${result.pageContent}\n\n`;
    });
  }
  
  // Add web content
  if (combinedContext.sources.web.results.length > 0) {
    contextText += '--- WEBSITE INFORMATION ---\n';
    combinedContext.sources.web.results.forEach((result, index) => {
      contextText += `[Web ${index + 1}] ${result.title}\n`;
      contextText += `${result.snippet}\n`;
      contextText += `Source: ${result.link}\n\n`;
    });
  }
  
  return contextText;
}
```

## Error Handling and Fallbacks

### Robust Error Handling

```javascript
/**
 * Execute search with robust error handling and fallbacks
 * @param {string} query - User query
 * @returns {Promise<Object>} - Search results or fallback
 */
async function robustSearch(query) {
  try {
    // Try primary search first
    const results = await searchMileaWebsite(query);
    return extractRichSearchResults(results);
  } catch (error) {
    console.error('Primary search failed:', error.message);
    
    // Try fallback with simplified query
    try {
      // Extract main keywords for simplified search
      const keywords = extractKeywords(query);
      const simplifiedQuery = keywords.slice(0, 2).join(' ');
      
      const fallbackResults = await searchMileaWebsite(simplifiedQuery);
      return extractRichSearchResults(fallbackResults);
    } catch (fallbackError) {
      console.error('Fallback search failed:', fallbackError.message);
      
      // Last resort: return no results but don't break the flow
      return [];
    }
  }
}
```

### Timeout Handling

```javascript
/**
 * Execute search with timeout protection
 * @param {string} query - User query
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} - Search results or empty array
 */
async function searchWithTimeout(query, timeoutMs = 3000) {
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Search timed out')), timeoutMs);
  });
  
  try {
    // Race the search against the timeout
    const results = await Promise.race([
      searchMileaWebsite(query),
      timeoutPromise
    ]);
    
    return extractRichSearchResults(results);
  } catch (error) {
    console.error('Search error or timeout:', error.message);
    return [];
  }
}
```

## Rate Limiting and Optimization

### Caching Layer

```javascript
const NodeCache = require('node-cache');

// Create a cache with 1-hour TTL
const searchCache = new NodeCache({ stdTTL: 3600 });

/**
 * Search with caching to reduce API calls
 * @param {string} query - User query
 * @returns {Promise<Object>} - Search results
 */
async function cachedSearch(query) {
  // Generate cache key from query
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  
  // Check if we have cached results
  const cachedResults = searchCache.get(cacheKey);
  if (cachedResults) {
    console.log(`Cache hit for query: ${query}`);
    return cachedResults;
  }
  
  // If not in cache, perform search
  try {
    const results = await searchMileaWebsite(query);
    const extractedResults = extractRichSearchResults(results);
    
    // Cache the results
    searchCache.set(cacheKey, extractedResults);
    
    return extractedResults;
  } catch (error) {
    console.error('Error in cached search:', error.message);
    throw error;
  }
}
```

### Rate Limiting

```javascript
/**
 * Rate limiting utility for Google Search API
 */
class SearchRateLimiter {
  constructor(options = {}) {
    this.maxRequestsPerDay = options.maxRequestsPerDay || 100;
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 10;
    this.minuteRequests = 0;
    this.dayRequests = 0;
    this.resetMinuteTime = Date.now() + 60000;
    this.resetDayTime = Date.now() + 86400000;
  }
  
  /**
   * Check if a request can be made
   * @returns {boolean} - Whether request is allowed
   */
  canMakeRequest() {
    const now = Date.now();
    
    // Reset counters if time has elapsed
    if (now > this.resetMinuteTime) {
      this.minuteRequests = 0;
      this.resetMinuteTime = now + 60000;
    }
    
    if (now > this.resetDayTime) {
      this.dayRequests = 0;
      this.resetDayTime = now + 86400000;
    }
    
    // Check if limits are exceeded
    return this.minuteRequests < this.maxRequestsPerMinute && 
           this.dayRequests < this.maxRequestsPerDay;
  }
  
  /**
   * Record a request being made
   */
  recordRequest() {
    this.minuteRequests++;
    this.dayRequests++;
  }
  
  /**
   * Make a rate-limited search request
   * @param {string} query - User query
   * @returns {Promise<Object>} - Search results
   */
  async search(query) {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded for Google Search API');
    }
    
    try {
      // Record the request before making it
      this.recordRequest();
      
      // Make the actual request
      return await searchMileaWebsite(query);
    } catch (error) {
      console.error('Error in rate-limited search:', error.message);
      throw error;
    }
  }
}

// Create a rate limiter instance
const rateLimiter = new SearchRateLimiter({
  maxRequestsPerDay: 100, // Adjust based on your API quota
  maxRequestsPerMinute: 10
});
```

## Complete Implementation Example

Here's a complete implementation that ties everything together:

```javascript
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

// Initialize cache with 1-hour TTL
const searchCache = new NodeCache({ stdTTL: 3600 });

// Rate limiter configuration
const rateLimiter = {
  maxRequestsPerDay: 100,
  maxRequestsPerMinute: 10,
  minuteRequests: 0,
  dayRequests: 0,
  resetMinuteTime: Date.now() + 60000,
  resetDayTime: Date.now() + 86400000,
  
  canMakeRequest() {
    const now = Date.now();
    if (now > this.resetMinuteTime) {
      this.minuteRequests = 0;
      this.resetMinuteTime = now + 60000;
    }
    
    if (now > this.resetDayTime) {
      this.dayRequests = 0;
      this.resetDayTime = now + 86400000;
    }
    
    return this.minuteRequests < this.maxRequestsPerMinute && 
           this.dayRequests < this.maxRequestsPerDay;
  },
  
  recordRequest() {
    this.minuteRequests++;
    this.dayRequests++;
  }
};

/**
 * Main function to search Milea Estate Vineyard website with caching and rate limiting
 * @param {string} query - User query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Processed search results
 */
async function searchMileaWebsite(query, options = {}) {
  // Generate cache key
  const cacheKey = `search:${query.toLowerCase().trim()}:${JSON.stringify(options)}`;
  
  // Check cache first
  const cachedResults = searchCache.get(cacheKey);
  if (cachedResults) {
    console.log(`Cache hit for query: ${query}`);
    return cachedResults;
  }
  
  // Check rate limits
  if (!rateLimiter.canMakeRequest()) {
    console.warn('Search rate limit exceeded, using fallback');
    return getSearchFallback(query);
  }
  
  try {
    // Record request for rate limiting
    rateLimiter.recordRequest();
    
    // Get API credentials
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    // Prepare search parameters
    const params = {
      key: apiKey,
      cx: searchEngineId,
      q: `${query} site:mileaestatevineyard.com`,
      num: options.num || 5
    };
    
    // Add optional parameters
    if (options.exactTerms) params.exactTerms = options.exactTerms;
    if (options.dateRestrict) params.dateRestrict = options.dateRestrict;
    
    // Execute search
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', { params });
    
    // Process results
    const results = processSearchResults(response.data);
    
    // Cache results
    searchCache.set(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Google Search API error:', error.message);
    return getSearchFallback(query);
  }
}

/**
 * Process search API response into usable format
 * @param {Object} searchResponse - Raw API response
 * @returns {Array} - Processed search results
 */
function processSearchResults(searchResponse) {
  // Check if we have results
  if (!searchResponse.items || searchResponse.items.length === 0) {
    return [];
  }
  
  // Process each result
  return searchResponse.items.map(item => {
    // Extract image if available
    let image = null;
    if (item.pagemap && item.pagemap.cse_image && item.pagemap.cse_image.length > 0) {
      image = item.pagemap.cse_image[0].src;
    }
    
    // Extract publish date if available
    let publishDate = null;
    if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags.length > 0) {
      publishDate = item.pagemap.metatags[0]['article:published_time'] || null;
    }
    
    // Get best description
    let description = item.snippet || '';
    if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags.length > 0) {
      if (item.pagemap.metatags[0]['og:description']) {
        description = item.pagemap.metatags[0]['og:description'];
      }
    }
    
    // Clean up snippet/description
    description = description
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
    
    // Truncate to reasonable length
    if (description.length > 200) {
      description = description.substring(0, 197) + '...';
    }
    
    // Categorize content
    const category = categorizeContent(item.link, item.title, description);
    
    return {
      title: item.title,
      link: item.link,
      snippet: description,
      image: image,
      publishDate: publishDate,
      category: category
    };
  });
}

/**
 * Categorize content based on URL and title
 * @param {string} url - Content URL
 * @param {string} title - Content title
 * @param {string} description - Content description
 * @returns {string} - Content category
 */
function categorizeContent(url, title, description) {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  if (lowerUrl.includes('/event') || lowerTitle.includes('event') || 
      lowerDesc.includes('event') || lowerTitle.includes('tasting') ||
      lowerDesc.includes('tasting event')) {
    return 'event';
  }
  
  if (lowerUrl.includes('/wine') || lowerUrl.includes('/products') ||
      lowerTitle.includes('wine') || lowerDesc.includes('wine')) {
    return 'wine';
  }
  
  if (lowerUrl.includes('/visit') || lowerTitle.includes('visit') ||
      lowerDesc.includes('hours') || lowerDesc.includes('tasting room')) {
    return 'visiting';
  }
  
  if (lowerUrl.includes('/about') || lowerTitle.includes('about')) {
    return 'about';
  }
  
  return 'general';
}

/**
 * Get fallback results when search fails
 * @param {string} query - Original query
 * @returns {Array} - Basic fallback results
 */
function getSearchFallback(query) {
  // Hard-coded fallback results for common categories
  const fallbacks = {
    wine: [{
      title: "Wines - Milea Estate Vineyard",
      link: "https://mileaestatevineyard.com/wines",
      snippet: "Explore our selection of premium wines from the Hudson Valley, including award-winning Chardonnay, Cabernet Franc, and Riesling.",
      image: null,
      publishDate: null,
      category: "wine"
    }],
    visit: [{
      title: "Visit Us - Milea Estate Vineyard",
      link: "https://mileaestatevineyard.com/visit",
      snippet: "Visit our tasting room and experience the beauty of our vineyard. Open Friday-Sunday, 12pm-5pm for tastings. Reservations recommended.",
      image: null,
      publishDate: null,
      category: "visiting"
    }],
    events: [{
      title: "Events - Milea Estate Vineyard",
      link: "https://mileaestatevineyard.com/events",
      snippet: "Join us for tastings, winemaker dinners, and special events throughout the year at our Hudson Valley vineyard.",
      image: null,
      publishDate: null,
      category: "event"
    }]
  };
  
  // Determine which fallback to use based on query
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('wine') || lowerQuery.includes('bottle') || lowerQuery.includes('varietals')) {
    return fallbacks.wine;
  }
  
  if (lowerQuery.includes('visit') || lowerQuery.includes('tasting') || lowerQuery.includes('hours')) {
    return fallbacks.visit;
  }
  
  if (lowerQuery.includes('event') || lowerQuery.includes('calendar')) {
    return fallbacks.events;
  }
  
  // If no specific fallback matches, return a general one
  return [{
    title: "Milea Estate Vineyard - Hudson Valley Winery",
    link: "https://mileaestatevineyard.com",
    snippet: "Milea Estate Vineyard is a premier Hudson Valley winery offering award-winning wines, vineyard tours, and tasting experiences.",
    image: null,
    publishDate: null,
    category: "general"
  }];
}

/**
 * Integration with RAG system
 * @param {string} query - User query
 * @param {Object} ragContext - Existing RAG context
 * @returns {Promise<Object>} - Enhanced context with web results
 */
async function enhanceContextWithWebSearch(query, ragContext) {
  try {
    // Determine if we need web search based on RAG coverage
    const needsWebResults = shouldSearchWeb(query, ragContext);
    
    if (!needsWebResults) {
      console.log('RAG context is sufficient, skipping web search');
      return {
        ...ragContext,
        webResults: [],
        sourcesUsed: ['rag']
      };
    }
    
    // Perform web search
    const webResults = await searchMileaWebsite(query);
    
    // Return enhanced context
    return {
      ...ragContext,
      webResults,
      sourcesUsed: webResults.length > 0 ? ['rag', 'web'] : ['rag']
    };
  } catch (error) {
    console.error('Error enhancing context with web search:', error.message);
    
    // Return original context on error
    return {
      ...ragContext,
      webResults: [],
      sourcesUsed: ['rag'],
      webSearchError: error.message
    };
  }
}

/**
 * Determine if web search should be performed based on RAG context
 * @param {string} query - User query
 * @param {Object} ragContext - Existing RAG context
 * @returns {boolean} - Whether web search is needed
 */
function shouldSearchWeb(query, ragContext) {
  // Always search for queries about events, news, or current information
  const timelyQuery = /event|news|hours|current|today|upcoming|recent|latest/i.test(query);
  if (timelyQuery) {
    return true;
  }
  
  // Check if RAG has sufficient content
  if (!ragContext.documents || ragContext.documents.length === 0) {
    return true;
  }
  
  // Skip web search for very specific wine questions well covered by RAG
  const isSpecificWineQuery = /tasting notes|flavor profile|wine characteristics|vintage/i.test(query);
  if (isSpecificWineQuery && ragContext.documents.length >= 2) {
    return false;
  }
  
  // Default to doing the search
  return true;
}

/**
 * Format web search results for inclusion in LLM prompt
 * @param {Array} webResults - Search results
 * @returns {string} - Formatted text for prompt
 */
function formatWebResultsForPrompt(webResults) {
  if (!webResults || webResults.length === 0) {
    return '';
  }
  
  let text = '\n\n--- WEBSITE INFORMATION ---\n\n';
  
  webResults.forEach((result, index) => {
    text += `[Website ${index + 1}] ${result.title}\n`;
    text += `${result.snippet}\n`;
    
    // Include link for reference, but instruct not to include in responses
    text += `URL: ${result.link}\n\n`;
  });
  
  return text;
}

// Export the functions
module.exports = {
  searchMileaWebsite,
  enhanceContextWithWebSearch,
  formatWebResultsForPrompt
};
```

### Express Route Integration

Here's how to integrate the Google Search with your Express server:

```javascript
const express = require('express');
const { searchMileaWebsite, enhanceContextWithWebSearch } = require('./googleSearchApi');

const router = express.Router();

// Route for direct website search
router.get('/api/website-search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const results = await searchMileaWebsite(query);
    
    res.json({
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Website search error:', error);
    res.status(500).json({ error: 'Error processing website search' });
  }
});

// Webhook to clear search cache when website content changes
router.post('/api/webhooks/website-updated', (req, res) => {
  try {
    // Clear the search cache
    searchCache.flushAll();
    console.log('Search cache cleared due to website update');
    
    res.status(200).json({ message: 'Search cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing search cache:', error);
    res.status(500).json({ error: 'Error clearing search cache' });
  }
});

module.exports = router;
```

## Usage Examples

### Basic Search

```javascript
const { searchMileaWebsite } = require('./googleSearchApi');

async function searchExample() {
  try {
    // Search for information about vineyard tours
    const results = await searchMileaWebsite('vineyard tour experience');
    
    console.log(`Found ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log(`Title: ${result.title}`);
      console.log(`Link: ${result.link}`);
      console.log(`Snippet: ${result.snippet}`);
      console.log(`Category: ${result.category}`);
    });
  } catch (error) {
    console.error('Error in search example:', error);
  }
}

searchExample();
```

### Integration with RAG and LLM

```javascript
const { enhanceContextWithWebSearch, formatWebResultsForPrompt } = require('./googleSearchApi');
const { retrieveFromRag } = require('./ragSystem');
const { generateResponse } = require('./llmService');

async function processQuery(query) {
  try {
    // Step 1: Get context from RAG system
    const ragContext = await retrieveFromRag(query);
    
    // Step 2: Enhance with website search if needed
    const enhancedContext = await enhanceContextWithWebSearch(query, ragContext);
    
    // Step 3: Format context for prompt
    let promptContext = '';
    
    // Add RAG documents
    if (enhancedContext.documents && enhancedContext.documents.length > 0) {
      promptContext += '--- KNOWLEDGE BASE ---\n\n';
      enhancedContext.documents.forEach((doc, index) => {
        promptContext += `[Document ${index + 1}] ${doc.content}\n\n`;
      });
    }
    
    // Add web results
    if (enhancedContext.webResults && enhancedContext.webResults.length > 0) {
      promptContext += formatWebResultsForPrompt(enhancedContext.webResults);
    }
    
    // Step 4: Generate response with LLM
    const prompt = `
      You are an AI assistant for Milea Estate Vineyard, a family-owned winery in the Hudson Valley of New York.
      Answer the question based on the context below. If the answer cannot be found in the context, acknowledge that you don't know.
      
      QUESTION: ${query}
      
      CONTEXT:
      ${promptContext}
      
      ANSWER:
    `;
    
    const response = await generateResponse(prompt);
    
    return {
      query,
      response,
      sources: enhancedContext.sourcesUsed,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing query:', error);
    return {
      query,
      response: "I'm sorry, but I encountered an error while processing your question. Please try again.",
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Conclusion

This Google Search API integration provides the Milea Estate Vineyard chatbot with access to up-to-date website content, complementing the static RAG knowledge base. By implementing domain-restricted searches, the chatbot can provide relevant, current information about wines, events, and visiting opportunities.

Key benefits of this implementation include:

1. **Current Information**: Access to the latest content from the Milea Estate website
2. **Complementary Knowledge**: Fills gaps in the static knowledge base
3. **Categorized Results**: Organizes information by type (events, wines, visiting, etc.)
4. **Optimized Integration**: Caching, rate limiting, and error handling for reliable performance
5. **Efficient Context Merging**: Combines web search with RAG results for comprehensive answers

To maintain optimal performance:

1. Monitor API usage to stay within your quota limits
2. Regularly evaluate the search result quality and adjust parameters as needed
3. Update fallback responses when major website content changes
4. Consider implementing a webhook from the website CMS to clear the cache when content is updated