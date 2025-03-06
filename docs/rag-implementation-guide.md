# RAG Implementation Guide - Milea Estate Vineyard Chatbot

> [AI DEVELOPMENT GUIDE] This document provides detailed RAG implementation guidance specifically for the Milea Estate Vineyard chatbot. Use this as a reference when implementing or troubleshooting the knowledge retrieval system.

## Table of Contents
- [Understanding RAG in the Winery Context](#understanding-rag-in-the-winery-context)
- [Document Preparation and Chunking](#document-preparation-and-chunking)
- [Embedding Creation and Storage](#embedding-creation-and-storage)
- [Vector Retrieval System](#vector-retrieval-system)
- [Multi-Source Knowledge Integration](#multi-source-knowledge-integration)
- [Response Generation with Context](#response-generation-with-context)
- [Complete Implementation Example](#complete-implementation-example)
- [Performance Optimization](#performance-optimization)
- [Testing and Evaluation](#testing-and-evaluation)

## Understanding RAG in the Winery Context

Retrieval Augmented Generation (RAG) is particularly valuable for the Milea Estate Vineyard chatbot because:

1. **Domain-Specific Knowledge**: Wine terminology, vineyard history, and product details are specialized knowledge that general LLMs may not have accurate information about.

2. **Up-to-Date Information**: Wine inventory, pricing, events, and seasonal offerings change frequently.

3. **Brand Voice Consistency**: RAG allows responses to maintain Milea Estate's specific tone and messaging.

For this implementation, our RAG system prioritizes information sources in this order:

1. Milea-specific markdown documents (most authoritative)
2. Commerce7 product and inventory data (for current offerings)
3. Website content via Google Search API (for latest events, news)
4. LLM's general knowledge (as fallback only)

### How RAG Works in this Application

```
User Query → Text Processing → Embedding Generation → Vector Search → 
Knowledge Retrieval → Context Assembly → LLM Prompt Construction → 
Response Generation → Post-processing → User Response
```

## Document Preparation and Chunking

Effective chunking is critical for RAG performance. For the winery chatbot, we'll implement a specialized chunking strategy.

### Document Types and Chunking Strategy

| Content Type | Chunk Size | Overlap | Rationale |
|--------------|------------|---------|-----------|
| Wine Descriptions | 150-200 tokens | 20 tokens | Preserve complete product descriptions |
| Vineyard History | 300-400 tokens | 50 tokens | Maintain narrative flow |
| Visiting Info | 200-250 tokens | 30 tokens | Keep logistical details together |
| Event Details | 150-200 tokens | 20 tokens | Preserve event specifics |

### Chunking Implementation

```javascript
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs');
const path = require('path');

/**
 * Chunks a document based on its content type
 * @param {string} content - The document content to chunk
 * @param {string} contentType - Type of content (wine, history, visiting, event)
 * @returns {Array} Array of document chunks with metadata
 */
async function chunkDocument(content, contentType, filename) {
  // Configure chunking parameters based on content type
  let chunkSize, chunkOverlap;
  
  switch(contentType) {
    case 'wine':
      chunkSize = 200;
      chunkOverlap = 20;
      break;
    case 'history':
      chunkSize = 400;
      chunkOverlap = 50;
      break;
    case 'visiting':
      chunkSize = 250;
      chunkOverlap = 30;
      break;
    case 'event':
      chunkSize = 200;
      chunkOverlap = 20;
      break;
    default:
      chunkSize = 300;
      chunkOverlap = 30;
  }
  
  // Create text splitter with appropriate parameters
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""],
  });
  
  // Split text into chunks
  const chunks = await textSplitter.createDocuments(
    [content],
    [{ 
      source: filename, 
      contentType,
      createdAt: new Date().toISOString()
    }]
  );
  
  return chunks;
}

/**
 * Process all markdown files in a directory
 * @param {string} dirPath - Path to directory containing markdown files
 * @returns {Array} Processed document chunks
 */
async function processDirectory(dirPath) {
  const allChunks = [];
  const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Determine content type from filename or frontmatter
    // (simplified example - you might use frontmatter parsing in production)
    let contentType = 'default';
    if (file.includes('wine')) contentType = 'wine';
    else if (file.includes('history')) contentType = 'history';
    else if (file.includes('visit')) contentType = 'visiting';
    else if (file.includes('event')) contentType = 'event';
    
    const chunks = await chunkDocument(content, contentType, file);
    allChunks.push(...chunks);
  }
  
  return allChunks;
}

// Example usage
async function main() {
  const knowledgeDir = './knowledge';
  const documentChunks = await processDirectory(knowledgeDir);
  console.log(`Processed ${documentChunks.length} chunks from markdown documents`);
  return documentChunks;
}
```

### Best Practices for Chunking

1. **Preserve Semantic Units**: Ensure wine descriptions stay together rather than being split mid-description.

2. **Maintain Content Relationships**: For historical information, keep related events in the same chunk when possible.

3. **Include Metadata**: Tag chunks with source, content type, and creation date to aid in retrieval and filtering.

4. **Handle Special Content**: Use custom chunking for structured data like wine tasting notes or event calendars.

## Embedding Creation and Storage

For the Milea Estate Vineyard chatbot, we'll use OpenAI's text-embedding model for generating embeddings, with a simple in-memory storage solution initially (Phase 1), with the option to migrate to Pinecone later.

### Embedding Generation

```javascript
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Generate embeddings for document chunks
 * @param {Array} documentChunks - Array of processed document chunks
 * @returns {Array} Document chunks with embeddings
 */
async function generateEmbeddings(documentChunks) {
  try {
    // Initialize OpenAI embeddings with your API key
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-ada-002', // Use the appropriate embedding model
    });
    
    console.log(`Generating embeddings for ${documentChunks.length} chunks...`);
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 25;
    const embeddedChunks = [];
    
    for (let i = 0; i < documentChunks.length; i += batchSize) {
      const batch = documentChunks.slice(i, i + batchSize);
      
      // Extract just the text content for embedding generation
      const texts = batch.map(chunk => chunk.pageContent);
      
      // Generate embeddings for the batch
      const embeddingResults = await embeddings.embedDocuments(texts);
      
      // Add embeddings to the chunk objects
      for (let j = 0; j < batch.length; j++) {
        embeddedChunks.push({
          ...batch[j],
          embedding: embeddingResults[j],
        });
      }
      
      console.log(`Processed batch ${i/batchSize + 1}/${Math.ceil(documentChunks.length/batchSize)}`);
      
      // Add a small delay to avoid rate limits
      if (i + batchSize < documentChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return embeddedChunks;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}
```

### In-Memory Vector Storage (Phase 1)

```javascript
/**
 * Simple in-memory vector store for Phase 1
 */
class InMemoryVectorStore {
  constructor() {
    this.documents = [];
  }
  
  /**
   * Add documents with embeddings to the store
   * @param {Array} documents - Array of documents with embeddings
   */
  addDocuments(documents) {
    this.documents.push(...documents);
    console.log(`Added ${documents.length} documents to vector store`);
    console.log(`Total documents in store: ${this.documents.length}`);
  }
  
  /**
   * Search for similar documents using cosine similarity
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {number} k - Number of results to return
   * @param {Object} filters - Optional metadata filters
   * @returns {Array} Top k similar documents
   */
  async similaritySearch(queryEmbedding, k = 5, filters = {}) {
    // Filter documents based on metadata if filters provided
    let filteredDocs = this.documents;
    if (Object.keys(filters).length > 0) {
      filteredDocs = this.documents.filter(doc => {
        return Object.entries(filters).every(([key, value]) => {
          return doc.metadata[key] === value;
        });
      });
    }
    
    // Calculate cosine similarity for each document
    const similarities = filteredDocs.map(doc => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return { ...doc, similarity };

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = uuidv4() } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Create or retrieve session
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        id: sessionId,
        history: [],
        createdAt: new Date().toISOString()
      };
    }
    
    // Process user query
    const queryInfo = await processQuery(message);
    
    // Assemble context from multiple sources
    const context = await assembleContext(
      queryInfo.cleanedQuery,
      queryInfo.embedding,
      vectorStore,
      commerce7Client
    );
    
    // Generate response using LLM
    const responseData = await generateResponse(queryInfo.cleanedQuery, context);
    
    // Update session history
    sessions[sessionId].history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    sessions[sessionId].history.push({
      role: 'assistant',
      content: responseData.response,
      sources: responseData.sources,
      timestamp: new Date().toISOString()
    });
    
    // Send response
    res.json({
      sessionId,
      message: responseData.response,
      sources: responseData.sources
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'An error occurred processing your request',
      message: 'I apologize, but I encountered an issue while processing your request. Please try again.'
    });
  }
});

// Initialize knowledge base
async function initializeKnowledgeBase() {
  try {
    console.log('Initializing knowledge base...');
    
    // Check if saved vector store exists
    const vectorStorePath = path.join(__dirname, 'data', 'vector-store.json');
    
    if (fs.existsSync(vectorStorePath)) {
      // Load existing vector store
      await vectorStore.load(vectorStorePath);
      console.log('Loaded existing vector store');
    } else {
      console.log('Building new vector store...');
      
      // Process markdown documents
      const knowledgeDir = path.join(__dirname, 'knowledge');
      const documentChunks = await processDirectory(knowledgeDir);
      
      // Generate embeddings
      const embeddedChunks = await generateEmbeddings(documentChunks);
      
      // Add to vector store
      vectorStore.addDocuments(embeddedChunks);
      
      // Save vector store
      if (!fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
      }
      
      await vectorStore.save(vectorStorePath);
      console.log('Vector store built and saved');
    }
    
    console.log('Knowledge base initialization complete');
  } catch (error) {
    console.error('Error initializing knowledge base:', error);
    throw error;
  }
}

// Start server
const PORT = process.env.PORT || 3000;

initializeKnowledgeBase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize knowledge base:', error);
  process.exit(1);
});
    });
    
    // Sort by similarity (descending) and return top k
    const topResults = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
    
    return topResults;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vecA - First vector
   * @param {Array} vecB - Second vector
   * @returns {number} Cosine similarity (-1 to 1)
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  /**
   * Save the vector store to a file
   * @param {string} filePath - Path to save the vector store
   */
  async save(filePath) {
    try {
      fs.writeFileSync(
        filePath, 
        JSON.stringify(this.documents), 
        'utf8'
      );
      console.log(`Vector store saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving vector store:', error);
    }
  }
  
  /**
   * Load the vector store from a file
   * @param {string} filePath - Path to load the vector store from
   */
  async load(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      this.documents = JSON.parse(data);
      console.log(`Loaded ${this.documents.length} documents from ${filePath}`);
    } catch (error) {
      console.error('Error loading vector store:', error);
      // Initialize with empty array if file doesn't exist
      this.documents = [];
    }
  }
}
```

### External Vector Database Setup (Phase 4)

In Phase 4, you may migrate to Pinecone for better scaling. Here's how you would implement it:

```javascript
const { PineconeClient } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('langchain/vectorstores/pinecone');

/**
 * Initialize and populate a Pinecone vector database
 * @param {Array} documentChunks - Array of document chunks with embeddings
 * @returns {Object} Configured PineconeStore instance
 */
async function setupPineconeVectorStore(documentChunks) {
  try {
    // Initialize Pinecone client
    const client = new PineconeClient();
    await client.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });
    
    // Get or create index
    const indexName = 'milea-vineyard-knowledge';
    const indexList = await client.listIndexes();
    
    if (!indexList.includes(indexName)) {
      // Create index if it doesn't exist
      await client.createIndex({
        createRequest: {
          name: indexName,
          dimension: 1536, // Dimension of text-embedding-ada-002
          metric: 'cosine',
        },
      });
      console.log(`Created new Pinecone index: ${indexName}`);
      
      // Wait for index initialization
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    const index = client.Index(indexName);
    
    // Create embeddings instance
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // Create vector store
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex: index }
    );
    
    // Add documents if provided
    if (documentChunks && documentChunks.length > 0) {
      await vectorStore.addDocuments(documentChunks);
      console.log(`Added ${documentChunks.length} documents to Pinecone`);
    }
    
    return vectorStore;
  } catch (error) {
    console.error('Error setting up Pinecone vector store:', error);
    throw error;
  }
}
```

## Vector Retrieval System

The retrieval system is responsible for finding the most relevant context for user queries.

### Query Processing and Embedding

```javascript
/**
 * Process user query and generate embedding
 * @param {string} query - User's question
 * @returns {Object} Query information including embedding
 */
async function processQuery(query) {
  try {
    // Clean and normalize the query
    const cleanedQuery = query.trim().replace(/\s+/g, ' ');
    
    // Generate embedding for the query
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    const queryEmbedding = await embeddings.embedQuery(cleanedQuery);
    
    return {
      originalQuery: query,
      cleanedQuery,
      embedding: queryEmbedding,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
}
```

### Context Retrieval with Filtering

```javascript
/**
 * Retrieve relevant context for a user query
 * @param {Object} queryInfo - Processed query information
 * @param {Object} vectorStore - Vector storage instance
 * @param {Object} filters - Optional metadata filters
 * @returns {Array} Relevant context documents
 */
async function retrieveContext(queryInfo, vectorStore, filters = {}) {
  try {
    // First pass: Retrieve based on semantic similarity
    const results = await vectorStore.similaritySearch(
      queryInfo.embedding,
      8, // Get more results than needed for post-filtering
      filters
    );
    
    // Additional hybrid filtering logic
    // For example, prioritize results with specific keywords
    const keywordBoost = 0.1;
    const keywords = extractKeywords(queryInfo.cleanedQuery);
    
    const scoredResults = results.map(result => {
      let finalScore = result.similarity;
      
      // Boost score for each keyword match
      keywords.forEach(keyword => {
        if (result.pageContent.toLowerCase().includes(keyword.toLowerCase())) {
          finalScore += keywordBoost;
        }
      });
      
      // Boost score for recent content
      if (result.metadata.contentType === 'event' || result.metadata.contentType === 'wine') {
        const createdDate = new Date(result.metadata.createdAt);
        const now = new Date();
        const ageInDays = (now - createdDate) / (1000 * 60 * 60 * 24);
        
        if (ageInDays < 30) {
          finalScore += 0.05;
        }
      }
      
      return { ...result, finalScore };
    });
    
    // Return top results based on final score
    return scoredResults
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5);
  } catch (error) {
    console.error('Error retrieving context:', error);
    throw error;
  }
}

/**
 * Extract potential keywords from a query
 * @param {string} query - User query
 * @returns {Array} List of keywords
 */
function extractKeywords(query) {
  // This is a simplified version - in production, use a proper NLP library
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'have', 'has', 'had', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how'];
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word));
}
```

## Multi-Source Knowledge Integration

A key feature of the Milea chatbot is integrating multiple knowledge sources.

### Commerce7 Product Information Retrieval

```javascript
/**
 * Retrieve relevant product information from Commerce7
 * @param {string} query - User query
 * @param {Object} commerce7Client - Commerce7 API client
 * @returns {Array} Relevant product information
 */
async function getRelevantProductInfo(query, commerce7Client) {
  try {
    // Extract potential wine types, varietals or keywords from query
    const wineKeywords = extractWineKeywords(query);
    
    if (wineKeywords.length === 0) {
      return []; // No relevant wine keywords found
    }
    
    // Get all products from Commerce7 (with caching)
    const products = await commerce7Client.getProducts();
    
    // Score products based on relevance to keywords
    const scoredProducts = products.map(product => {
      let score = 0;
      
      wineKeywords.forEach(keyword => {
        // Check name
        if (product.name.toLowerCase().includes(keyword.toLowerCase())) {
          score += 3;
        }
        
        // Check varietal
        if (product.varietal && product.varietal.toLowerCase().includes(keyword.toLowerCase())) {
          score += 2;
        }
        
        // Check description
        if (product.description && product.description.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1;
        }
      });
      
      return { product, score };
    });
    
    // Filter to relevant products and return top results
    return scoredProducts
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => ({
        type: 'product',
        name: item.product.name,
        description: item.product.description,
        price: item.product.price,
        url: item.product.url,
        inventory: item.product.inventory
      }));
  } catch (error) {
    console.error('Error retrieving product information:', error);
    return []; // Return empty array on error to continue with other sources
  }
}

/**
 * Extract wine-related keywords from a query
 * @param {string} query - User query
 * @returns {Array} Wine-related keywords
 */
function extractWineKeywords(query) {
  const wineTypes = ['red', 'white', 'rosé', 'rose', 'sparkling', 'dessert'];
  const grapeVarietals = ['chardonnay', 'cabernet', 'merlot', 'pinot noir', 'sauvignon blanc', 'riesling', 'zinfandel', 'syrah', 'malbec'];
  const wineTerms = ['wine', 'bottle', 'vintage', 'vineyard', 'tasting', 'notes', 'flavor', 'aroma'];
  
  const keywords = [];
  const lowerQuery = query.toLowerCase();
  
  // Check for wine types
  wineTypes.forEach(type => {
    if (lowerQuery.includes(type)) {
      keywords.push(type);
    }
  });
  
  // Check for grape varietals
  grapeVarietals.forEach(varietal => {
    if (lowerQuery.includes(varietal)) {
      keywords.push(varietal);
    }
  });
  
  // Check for general wine terms
  wineTerms.forEach(term => {
    if (lowerQuery.includes(term)) {
      keywords.push(term);
    }
  });
  
  return keywords;
}
```

### Website Content via Google Search API

```javascript
/**
 * Retrieve relevant website content via Google Search API
 * @param {string} query - User query
 * @returns {Array} Relevant website content
 */
async function getWebsiteContent(query) {
  try {
    const googleSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    // Build URL with site restriction to mileaestatevineyard.com
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&siteSearch=mileaestatevineyard.com`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }
    
    // Process and return the search results
    return data.items.slice(0, 3).map(item => ({
      type: 'website',
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      pagemap: item.pagemap
    }));
  } catch (error) {
    console.error('Error retrieving website content:', error);
    return []; // Return empty array on error to continue with other sources
  }
}
```

### Context Assembly from Multiple Sources

```javascript
/**
 * Assemble context from multiple knowledge sources
 * @param {string} query - User query
 * @param {Object} queryEmbedding - Query embedding
 * @param {Object} vectorStore - Vector storage
 * @param {Object} commerce7Client - Commerce7 API client
 * @returns {Object} Assembled context
 */
async function assembleContext(query, queryEmbedding, vectorStore, commerce7Client) {
  try {
    // Parallel retrieval from multiple sources
    const [ragResults, productResults, websiteResults] = await Promise.all([
      // Get context from vector store
      retrieveContext({
        cleanedQuery: query,
        embedding: queryEmbedding
      }, vectorStore),
      
      // Get relevant product information
      getRelevantProductInfo(query, commerce7Client),
      
      // Get website content
      getWebsiteContent(query)
    ]);
    
    // Combine and prioritize results
    const combinedContext = {
      query,
      ragKnowledge: ragResults,
      productInfo: productResults,
      websiteContent: websiteResults,
      retrievalTimestamp: new Date().toISOString()
    };
    
    return combinedContext;
  } catch (error) {
    console.error('Error assembling context:', error);
    // Return partial context if available
    return {
      query,
      ragKnowledge: [],
      productInfo: [],
      websiteContent: [],
      error: error.message,
      retrievalTimestamp: new Date().toISOString()
    };
  }
}
```

## Response Generation with Context

Once we have the relevant context, we need to generate a helpful response using the LLM.

### Prompt Construction

```javascript
/**
 * Construct prompt for the LLM with retrieved context
 * @param {string} query - User query
 * @param {Object} context - Assembled context
 * @returns {string} Formatted prompt
 */
function constructPrompt(query, context) {
  // Format RAG knowledge
  let ragKnowledgeText = '';
  if (context.ragKnowledge && context.ragKnowledge.length > 0) {
    ragKnowledgeText = context.ragKnowledge
      .map((doc, index) => `[Document ${index + 1}] ${doc.pageContent}`)
      .join('\n\n');
  }
  
  // Format product information
  let productInfoText = '';
  if (context.productInfo && context.productInfo.length > 0) {
    productInfoText = context.productInfo
      .map(product => {
        return `Product: ${product.name}
Price: $${product.price}
${product.description}
Available: ${product.inventory > 0 ? 'Yes' : 'No'}`;
      })
      .join('\n\n');
  }
  
  // Format website content
  let websiteContentText = '';
  if (context.websiteContent && context.websiteContent.length > 0) {
    websiteContentText = context.websiteContent
      .map(item => `Title: ${item.title}\nContent: ${item.snippet}`)
      .join('\n\n');
  }
  
  // Construct the full prompt
  return `You are an AI assistant for Milea Estate Vineyard, a family-owned and operated vineyard and winery in the Hudson Valley of New York. You help customers learn about wines, plan their visits, and make purchases. Answer the question based on the context provided below. If the answer cannot be determined from the context, acknowledge that you don't know rather than making up information. When appropriate, recommend relevant wines based on the information provided about available products.

USER QUESTION: ${query}

CONTEXT INFORMATION:
${ragKnowledgeText ? '--- VINEYARD KNOWLEDGE ---\n' + ragKnowledgeText + '\n\n' : ''}
${productInfoText ? '--- WINE PRODUCTS ---\n' + productInfoText + '\n\n' : ''}
${websiteContentText ? '--- WEBSITE INFORMATION ---\n' + websiteContentText + '\n\n' : ''}

Please provide a helpful, accurate response in a warm, conversational tone that matches Milea Estate Vineyard's brand voice. When discussing wines, emphasize their unique qualities and the vineyard's sustainable practices.`;
}
```

### LLM Integration

```javascript
const { OpenAI } = require('langchain/llms/openai');

/**
 * Generate response using LLM with context
 * @param {string} query - User query
 * @param {Object} context - Assembled context
 * @returns {Object} Generated response with metadata
 */
async function generateResponse(query, context) {
  try {
    // Construct the prompt
    const prompt = constructPrompt(query, context);
    
    // Initialize the LLM
    const model = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4', // Or your preferred model
      temperature: 0.7,
      maxTokens: 1000
    });
    
    // Generate response
    const response = await model.call(prompt);
    
    // Format sources for attribution
    const sources = [];
    
    // Add RAG sources
    if (context.ragKnowledge) {
      context.ragKnowledge.forEach(doc => {
        if (doc.metadata && doc.metadata.source) {
          sources.push({
            type: 'document',
            source: doc.metadata.source
          });
        }
      });
    }
    
    // Add product sources
    if (context.productInfo) {
      context.productInfo.forEach(product => {
        sources.push({
          type: 'product',
          name: product.name,
          url: product.url
        });
      });
    }
    
    // Add website sources
    if (context.websiteContent) {
      context.websiteContent.forEach(item => {
        sources.push({
          type: 'website',
          title: item.title,
          url: item.link
        });
      });
    }
    
    // Return formatted response with sources
    return {
      query,
      response,
      sources: [...new Map(sources.map(item => [item.source || item.url, item])).values()], // Deduplicate
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Return fallback response
    return {
      query,
      response: "I apologize, but I'm having trouble generating a response right now. Please try asking again, or contact Milea Estate Vineyard directly for immediate assistance.",
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Complete Implementation Example

Below is a complete example implementation that ties together all the components:

```javascript
const express = require('express');
const dotenv = require('dotenv');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize in-memory vector store
const vectorStore = new InMemoryVectorStore();

// Initialize sessions storage
const sessions = {};

// Commerce7 API client (simplified for example)
const commerce7Client = {
  getProducts: async () => {
    // Implementation would normally fetch from Commerce7 API
    return [
      {
        name: "Estate Chardonnay 2021",
        varietal: "Chardonnay",
        price: 28.99,
        description: "A crisp, vibrant Chardonnay with notes of green apple, pear, and a hint of oak.",
        inventory: 56,
        url: "https://mileaestatevineyard.com/products/estate-chardonnay"
      },
      {
        name: "Proprietor's Reserve Cabernet Franc 2019",
        varietal: "Cabernet Franc",
        price: 36.99,
        description: "An elegant Cabernet Franc with balanced tannins and notes of dark cherry, blackberry, and a subtle herbaceous finish.",
        inventory: 24,
        url: "https://mileaestatevineyard.com/products/reserve-cabernet-franc"
      }
    ];
  },
  
  getWineClub: async () => {
    // Implementation would fetch wine club details from Commerce7
    return {
      name: "Milea Estate Wine Club",
      tiers: [
        {
          name: "Estate Selection",
          price: 75,
          frequency: "Quarterly",
          benefits: ["10% off all purchases", "Complimentary tastings for 2", "First access to limited releases"]
        },
        {
          name: "Reserve Collection",
          price: 110,
          frequency: "Quarterly",
          benefits: ["15% off all purchases", "Complimentary tastings for 4", "First access to limited releases", "Exclusive events"]
        }
      ]
    };
  },
  
  getReservationAvailability: async (date) => {
    // Implementation would check availability in Commerce7
    return {
      date,
      slots: [
        { time: "11:00 AM", available: true, experienceType: "Classic Tasting" },
        { time: "1:00 PM", available: true, experienceType: "Classic Tasting" },
        { time: "3:00 PM", available: false, experienceType: "Classic Tasting" },
        { time: "12:00 PM", available: true, experienceType: "Reserve Tasting" }
      ]
    };
  }
};