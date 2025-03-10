# Milea Chatbot Developer Documentation

## Executive Summary

The Milea Chatbot is a sophisticated customer-facing AI solution designed to provide detailed information about Milea Estate Vineyard's wines, visiting information, wine club, and events. The system uses a Retrieval-Augmented Generation (RAG) architecture to deliver accurate, contextually relevant answers by retrieving information from a structured knowledge base before generating responses.

Recent developments have significantly improved the system's ability to extract and present wine information, particularly from HTML-rich content. The system now successfully reformats wine documents, maintains a clean knowledge base, and provides properly structured responses for various query types.

## System Overview

┌─────────────────────┐      ┌─────────────────────────────────────────────────────────┐
│                     │      │                     Backend Server                       │
│    Chat Interface   │◄────►│                                                         │
│                     │      │  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   │
└─────────────────────┘      │  │ Express.js  │   │ Auth & User │   │  Business    │   │
                             │  │   Routes    │◄──►│   Service   │   │    Info      │   │
                             │  └──────┬──────┘   └─────────────┘   └──────────────┘   │
┌─────────────────────┐      │         │                                               │
│                     │      │  ┌──────▼──────┐                                        │
│    Commerce7 API    │◄────►│  │   RAG API   │                                        │
│                     │      │  └──────┬──────┘                                        │
└─────────────────────┘      │         │                                               │
                             └─────────┼─────────────────────────────────────────────┬─┘
                                       │                                             │
                             ┌─────────▼─────────────────────────────────────────────▼─┐
                             │                                                          │
                             │                    RAG System                            │
                             │                                                          │
                             │  ┌──────────────┐   ┌──────────────┐  ┌───────────────┐ │
                             │  │    Query     │   │   Context    │  │               │ │
                             │  │ Classifier   │──►│  Assembly    │──►│  Domain      │ │
                             │  │              │   │              │  │  Handlers     │ │
                             │  └──────────────┘   └──────────────┘  └───────┬───────┘ │
                             │                                               │         │
                             │  ┌──────────────┐                     ┌───────▼───────┐ │
                             │  │ Conversation │                     │  Response     │ │
                             │  │   Tracking   │◄────────────────────│  Generator    │ │
                             │  └──────────────┘                     └───────────────┘ │
                             │                                                          │
                             └─────────────────────────────┬────────────────────────────┘
                                                           │
                             ┌─────────────────────────────▼────────────────────────────┐
                             │                                                          │
                             │                  Knowledge System                        │
                             │                                                          │
                             │  ┌──────────────┐   ┌──────────────┐  ┌───────────────┐ │
                             │  │              │   │              │  │               │ │
                             │  │  Vector DB   │◄──►│  Knowledge   │◄─┤ Commerce7    │ │
                             │  │  (ChromaDB)  │   │    Base      │  │ Sync Process  │ │
                             │  │              │   │              │  │               │ │
                             │  └──────────────┘   └──────────────┘  └───────────────┘ │
                             │                                                          │
                             └──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                             Scheduled Tasks                                         │
│                                                                                     │
│  ┌───────────────────┐    ┌────────────────────┐    ┌────────────────────────────┐ │
│  │  Daily Product    │    │  Knowledge Base    │    │  Wine Document             │ │
│  │  Synchronization  │───►│  Initialization    │───►│  Formatting Pipeline       │ │
│  └───────────────────┘    └────────────────────┘    └────────────────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

The Milea Chatbot consists of these core components:

1. **Frontend Interface** - Customer-facing chat interface
2. **Backend API Server** - Express.js server handling requests
3. **RAG System** - Core query processing and response generation
4. **Commerce7 Integration** - Sync process for product information
5. **Knowledge Base** - Structured documents stored as markdown files
6. **Vector Database** - ChromaDB storing embeddings for semantic search

## Current State Assessment

The system is currently functioning well with significant improvements in wine information retrieval. Key achievements include:

- **Enhanced Wine Information Extraction**: Solved HTML parsing issues to extract complete wine descriptions, tasting notes, and pairing information
- **Standardized Document Structure**: Implemented consistent formatting across wine documents
- **Improved Query Classification**: Advanced pattern matching for different wine types
- **Optimized Content Retrieval**: Better document selection based on domain-specific scoring
- **Commerce7 Integration**: Regular syncing of product information with proper formatting
- **Conversational Context Handling**: Support for multi-turn conversations about wines
- **Domain-Specific Response Generation**: Specialized handling for different query types

## Directory Structure

```
milea-chatbot/
├── backups/                    # Backup files for wine documents
├── config/                     # Configuration files for APIs
│   ├── commerce7.js            # Commerce7 API configuration
│   └── openai.js               # OpenAI configuration
├── knowledge/                  # Knowledge base documents
│   ├── wine/                   # Wine product information
│   ├── wine-club/              # Wine club information
│   ├── visiting/               # Visiting information
│   └── [other domains]/        # Other knowledge domains
├── logs/                       # Application logs
├── middleware/                 # Express middleware
│   ├── errorHandler.js         # Error handling middleware
│   └── extractCustomerId.js    # Auth token extraction
├── routes/                     # API routes
│   ├── auth.js                 # Authentication routes
│   ├── businessInfo.js         # Business information routes
│   ├── chat.js                 # Direct chat routes
│   ├── commerce7.js            # Commerce7 API routes
│   ├── customers.js            # Customer information routes
│   ├── rag.js                  # RAG system routes
│   └── subscribe.js            # Email subscription routes
├── scripts/                    # Utility scripts
│   ├── html-to-markdown.js     # HTML conversion utilities
│   ├── initializeKnowledgeBase.js # Knowledge base setup
│   ├── scheduledTasks.js       # Scheduled background tasks
│   ├── syncCommerce7Products.js # Commerce7 product sync
│   ├── wine-formatter.js       # Wine document formatting
│   └── wine-pipeline.js        # Complete wine processing pipeline
├── services/                   # Core business logic
│   ├── businessHoursService.js # Hours information service
│   ├── loyaltyService.js       # Loyalty points service
│   └── rag/                    # RAG system components
│       ├── context/            # Context assembly components
│       ├── domains/            # Domain-specific handlers
│       ├── cacheManager.js     # Query response caching
│       ├── conversationTracking.js # Multi-turn conversation handling
│       ├── core.js             # Pipeline orchestration
│       ├── queryClassifier.js  # Query intent detection
│       ├── ragService.js       # Main entry point
│       └── responseGenerator.js # Response generation
├── utils/                      # Utility functions
│   ├── commerce7Auth.js        # Commerce7 authentication
│   ├── documentProcessor.js    # Document processing utilities
│   ├── htmlCleaner.js          # HTML cleaning utilities
│   ├── logger.js               # Logging utility
│   ├── queryHelpers.js         # Query processing helpers
│   └── vectorStore.js          # Vector database interface
└── server.js                   # Main application entry point
```

## The RAG System Explained (In Plain Language)

### What is RAG?

RAG stands for Retrieval-Augmented Generation. Think of it like a librarian helping you answer questions:

1. The librarian **listens** to your question
2. The librarian **searches** for relevant information in books
3. The librarian **reads** those books to find the exact information
4. The librarian **crafts** an answer based on what they found

RAG does the same thing with AI: it retrieves relevant content first, then uses that content to generate an accurate answer.

### How the Milea Chatbot RAG System Works

When a customer asks a question, here's what happens:

#### Step 1: Query Classification
The system figures out what the person is asking about:
- Is it about a specific wine like "Reserve Cabernet Franc"?
- Is it about visiting hours?
- Is it about the wine club?

This classification helps the system know where to look for information.

#### Step 2: Content Retrieval
Based on the query type, the system:
- Converts the question into a mathematical representation (embedding)
- Searches the vector database for similar content
- Pulls the most relevant documents from the knowledge base

For wine queries, it has special logic to find exactly the right wine document.

#### Step 3: Context Assembly
The system:
- Validates that the retrieved documents actually match the query
- Scores documents based on relevance
- Groups related documents (like different vintages of the same wine)
- Selects the final set of documents to use for answering

#### Step 4: Response Generation
The system:
- Combines the retrieved documents into context
- Constructs a specific prompt based on the query type
- Sends this to the AI model (GPT-4)
- Gets back a natural language response

#### Step 5: Conversation Management
The system:
- Tracks the conversation to handle follow-up questions
- Caches responses for similar questions
- Handles clarification requests (like "which wine did you mean?")

### RAG System Components in Detail

#### Query Classification (`queryClassifier.js`)
This component analyzes the user's question to determine its intent. For wine queries, it has sophisticated pattern matching to identify specific wines. For example, it can recognize that "tell me about your Reserve Cab" refers to the "Reserve Cabernet Franc."

```javascript
// Example pattern matching
function identifySpecificWinePattern(query) {
  // Check for patterns like "reserve cab franc"
  const queryLower = query.toLowerCase();
  
  // Define wine pattern matching rules with variations and synonyms
  const winePatterns = [
    {
      name: 'reserve cabernet franc',
      pattern: 'reserve-cabernet-franc',
      matchers: [
        {terms: ['reserve', 'cab', 'franc'], proximity: 3},
        {regex: /\breserve\s+cab(ernet)?\s+franc\b/}
      ]
    },
    // More patterns...
  ];

  // Check each pattern against the query
  for (const wine of winePatterns) {
    // Various matching approaches...
  }
}
```

#### Context Assembly (`context/index.js`)
This component retrieves and processes documents relevant to the query. It includes:

- **Validator**: Ensures documents actually match the query
- **Scorer**: Ranks documents by relevance
- **Grouper**: Groups related documents (like different vintages)
- **Selector**: Picks the final set of documents to use

For wine queries, it has special logic to handle wine-specific documents:

```javascript
// Example of wine document validation
if (queryInfo.type === 'wine' && queryInfo.isSpecificWine) {
  if (queryInfo.isConfirmedWine && queryInfo.winePattern) {
    const validResults = results.filter(doc => {
      const source = doc.metadata.source.toLowerCase();
      return source.includes(queryInfo.winePattern);
    });
    
    if (validResults.length > 0) {
      return validResults;
    }
  }
}
```

#### Domain Handlers (`domains/`)
These components provide specialized processing for different query types. The `wineHandler.js` has specific logic for different wines:

```javascript
// Example of specialized wine handling
if (queryInfo.isSpecificWine && queryInfo.specificWine.includes('reserve cabernet franc')) {
  return handleReserveCabernet(query, queryInfo, context, knownWines);
}

if (queryInfo.isSpecificWine && queryInfo.specificWine.includes('proceedo')) {
  return handleProceedoWine(query, queryInfo, context, knownWines);
}
```

#### Response Generation (`responseGenerator.js`)
This component creates the final response using the GPT model. It constructs a prompt based on the query type and retrieved documents:

```javascript
// Example of wine-specific prompt instructions
const wineInstructions = `
For wine-related queries, include:
- COMPLETE description and tasting notes
- Price information (always include the price)
- Vintage information (the year)
- ALL special characteristics mentioned
- ALL flavor profiles and aromas described
`;
```

## Wine Information Improvement Process

A key challenge we faced was extracting complete wine information from HTML-rich content. The solution involved several components:

### 1. Enhanced HTML Cleaner
We developed an advanced HTML cleaner that properly extracts structured data from wine descriptions:

```javascript
function enhancedHtmlCleaner(content) {
  // Extract tasting notes using multiple patterns
  const tastingNotesPatterns = [
    /<p><strong>TASTING NOTES<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>/i,
    // More patterns...
  ];
  
  for (const pattern of tastingNotesPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      extractedData.tastingNotes = cleanHtmlContent(match[1]);
      break;
    }
  }
  
  // Similar extraction for wine notes and pairing recommendations
}
```

### 2. Standardized Document Format
We established a consistent template for all wine documents:

```markdown
# [VINTAGE] [WINE NAME]

## Product Information
- **Type**: Wine
- **Price**: $XX.XX
- **Status**: Available / Available
- **Created**: MM/DD/YYYY
- **Updated**: MM/DD/YYYY

## Wine Notes
[Detailed wine description including production background]

## Tasting Notes
[Detailed tasting profile including aromas, flavors, body, and finish]

## Pairing Recommendations
[Food pairing suggestions]

## Quick Overview
[Brief high-level description of the wine]

## Details
[Any additional details about the wine]
```

### 3. Wine Document Formatter
We created a formatter that converts wine documents to this standard format:

```javascript
function formatWineFile(filePath) {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Use enhanced HTML cleaner to extract structured data
  const { cleanedContent, extractedData } = enhancedHtmlCleaner(content);
  
  // Build new formatted content with consistent sections
  const formattedContent = `# ${vintage} ${wineName}
## Product Information
...
${extractedData.wineNotes ? `## Wine Notes
${extractedData.wineNotes}` : ''}
...`;
}
```

### 4. Commerce7 Integration Improvements
We enhanced the Commerce7 sync process to apply proper formatting to new products:

```javascript
function formatCommerce7Markdown(product, markdown) {
  // Extract basic information
  const title = product.title || '';
  let priceText = 'Price unavailable';
  if (product.variants?.length > 0 && product.variants[0].price) {
    priceText = `$${(product.variants[0].price / 100).toFixed(2)}`;
  }
  
  // Clean up HTML in content
  const { cleanedContent, extractedData } = enhancedHtmlCleaner(product.content || '');
  
  // Build structured markdown
  return `# ${vintage} ${wineName}
...`;
}
```

### 5. Complete Wine Pipeline
We created a comprehensive pipeline script to handle the entire process:

```javascript
async function runPipeline() {
  // Step 1: Sync with Commerce7
  if (runSync) {
    await syncWineProducts();
  }
  
  // Step 2: Fix formatting issues
  if (runFix) {
    await processWineFiles();
  }
  
  // Step 3: Rebuild vector embeddings
  if (runRebuild) {
    await initializeChromaDB();
    await initializeKnowledgeBase();
  }
}
```

## Issues Faced and Solutions

### 1. HTML Content Extraction
**Issue**: Wine descriptions contained rich HTML that wasn't being properly extracted, causing incomplete information in responses.

**Solution**: 
- Created enhanced HTML cleaner with multiple pattern matching approaches
- Added section-specific extractors for tasting notes, wine notes, and pairing recommendations
- Implemented standardized document format to ensure consistency

### 2. Inconsistent Document Structure
**Issue**: Wine documents had varying structures, making it difficult to reliably extract information.

**Solution**:
- Created a standardized template for all wine documents
- Developed a formatter to convert existing and new documents to this format
- Added validation to ensure critical sections are present

### 3. Wine Pattern Matching
**Issue**: The system struggled to identify specific wines from user queries.

**Solution**:
- Implemented sophisticated pattern matching with multiple approaches:
  - Term proximity checking
  - Regular expression patterns
  - Synonym matching
- Added special handling for commonly confused wines (like different Cabernet Francs)

### 4. Multiple Wine Disambiguation
**Issue**: When users asked about general categories (like "rosé wines"), the system struggled to offer clear choices.

**Solution**:
- Enhanced the grouper to identify multiple matching wines
- Added special prompt construction for multiple wine scenarios
- Implemented conversation tracking to handle follow-up selection

### 5. Commerce7 Product Syncing
**Issue**: Products from Commerce7 weren't being properly filtered and formatted.

**Solution**:
- Added availability filtering to only include "Available / Available" wines
- Enhanced the markdown generation process with proper HTML cleaning
- Integrated with the wine formatter to ensure consistent document structure

## Conversational Funneling Implementation

To optimize the conversational funneling as requested, we should implement the following enhancements:

### 1. Wedding and Event Queries
For event-related queries, the response should include a call-to-action:

```javascript
// In responseGenerator.js, add to domain-specific instructions
if (queryInfo.type === 'event') {
  promptTemplate += `
IMPORTANT:
Always end your response with a call-to-action:
"Contact our Event Coordinator today to discuss your [event type]!"

Include these buttons:
[Call Now](tel:+18456778446) | [Email](mailto:events@mileaestatevineyard.com)
`;
}
```

### 2. Wine Product Queries
For wine-related queries, include a purchase prompt:

```javascript
// In responseGenerator.js, add to wine-specific instructions
if (queryInfo.type === 'wine') {
  promptTemplate += `
IMPORTANT:
Always end your response with a purchase prompt:
"Get a few bottles today for shipping or pick-up!"

Include this link:
[Shop Now](https://mileaestatevineyard.com/acquire/)
`;
}
```

### 3. Wine Club Queries
For wine club queries, add a membership prompt:

```javascript
// In clubHandler.js
if (queryInfo.type === 'club') {
  responseData.conversionPrompt = {
    text: "Join the wine club today for free!",
    link: "https://mileaestatevineyard.com/wine-club/"
  };
}
```

## Troubleshooting Guide

When the RAG system isn't returning the right results, here's where to look:

### 1. Query Classification Issues
**Symptoms**: Wrong domain being detected, specific wines not recognized

**Check**:
- Look at logs for `queryClassifier.js` output
- Run the query through `scripts/testWineQueries.js`
- Check if the pattern matching in `identifySpecificWinePattern()` includes variations of your term

**Fix**:
- Add new patterns or synonyms to `queryClassifier.js`
- Update the `WINE_NAME_MAPPINGS` in `conversationTracking.js`

### 2. Document Retrieval Issues
**Symptoms**: System can't find documents that should exist

**Check**:
- Run `scripts/diagnose-vector-store.js` to test document retrieval
- Check if the document exists in the knowledge base
- Verify the document follows the standardized format

**Fix**:
- Run `scripts/wine-pipeline.js --rebuild` to rebuild vector embeddings
- Format the document properly with `scripts/wine-formatter.js --fix`

### 3. Wine Information Extraction Issues
**Symptoms**: Responses lack tasting notes or other details that exist in the document

**Check**:
- Use `scripts/test-html-extraction.js [filename]` to debug HTML extraction
- Check if the document has proper section headings
- Look for non-standard HTML patterns

**Fix**:
- Update the document format with `scripts/wine-formatter.js`
- Add new extraction patterns to `enhancedHtmlCleaner.js`

### 4. Commerce7 Sync Issues
**Symptoms**: New or updated products not appearing correctly

**Check**:
- Look at logs from `syncCommerce7Products.js`
- Check the Commerce7 API response format
- Verify product availability status

**Fix**:
- Run `scripts/wine-pipeline.js --sync --fix` to resync and fix formatting
- Update the product filtering in `shouldIncludeProduct()`

## Development Recommendations

### 1. Commerce7 Update Logic
Implement improved update detection and handling:

```javascript
// Add to syncCommerce7Products.js
async function updateExistingProducts(products) {
  // Get list of existing files
  const existingFiles = fs.readdirSync(folderPath);
  
  // Track which products were updated
  for (const product of products) {
    const existingFile = existingFiles.find(file => file.includes(product.id));
    if (existingFile) {
      // Compare updatedAt timestamp
      const existingContent = fs.readFileSync(path.join(folderPath, existingFile), 'utf8');
      const updatedAtMatch = existingContent.match(/- \*\*Updated\*\*: ([^\n]+)/);
      const existingDate = updatedAtMatch ? new Date(updatedAtMatch[1]) : null;
      const newDate = new Date(product.updatedAt);
      
      if (!existingDate || newDate > existingDate) {
        // Update the file
        const markdown = formatCommerce7Markdown(product);
        fs.writeFileSync(path.join(folderPath, existingFile), markdown);
        console.log(`📝 Updated: ${existingFile}`);
      }
    }
  }
}
```

### 2. Deletion Handling
Add logic to identify and handle products that have been removed:

```javascript
// Add to syncCommerce7Products.js
async function handleDeletedProducts(currentProducts) {
  // Get all product IDs from Commerce7
  const c7ProductIds = currentProducts.map(p => p.id);
  
  // Get list of existing files
  const existingFiles = fs.readdirSync(folderPath);
  
  // Find files that don't match any current product
  for (const file of existingFiles) {
    // Extract product ID from filename
    const idMatch = file.match(/-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.md$/);
    if (idMatch) {
      const fileId = idMatch[1];
      if (!c7ProductIds.includes(fileId)) {
        // Move to archive folder instead of deleting
        const archivePath = path.join(__dirname, '../backups/archived');
        if (!fs.existsSync(archivePath)) {
          fs.mkdirSync(archivePath, { recursive: true });
        }
        fs.renameSync(path.join(folderPath, file), path.join(archivePath, file));
        console.log(`📁 Archived: ${file} (product no longer exists)`);
      }
    }
  }
}
```

### 3. Implement Logging Dashboard
Create a simple logging dashboard to monitor system health:

```javascript
// Add routes/admin.js
router.get("/logs", async (req, res) => {
  const logFiles = fs.readdirSync(path.join(__dirname, '../logs'));
  const recentLogs = logFiles.sort().reverse().slice(0, 5);
  
  const logs = {};
  for (const file of recentLogs) {
    const content = fs.readFileSync(path.join(__dirname, '../logs', file), 'utf8');
    logs[file] = content.split('\n').slice(-100); // Last 100 lines
  }
  
  res.json({ logs });
});

router.get("/stats", async (req, res) => {
  // Gather system statistics
  const stats = {
    wines: fs.readdirSync(path.join(__dirname, '../knowledge/wine')).length,
    queryCache: require('../services/rag/cacheManager').getCacheStats(),
    vectorStore: {
      // Add vector store stats
    }
  };
  
  res.json({ stats });
});
```

## Conclusion

The Milea Chatbot has evolved into a sophisticated system with significant improvements in wine information extraction and presentation. The RAG architecture provides accurate, contextually relevant answers across multiple domains, with special emphasis on wine knowledge.

The system is now ready for further enhancement in conversational funneling to optimize customer conversion. With the wine document formatting pipeline in place, the system can reliably process new information from Commerce7 and maintain a clean, structured knowledge base.

By following the troubleshooting guide when issues arise, you can quickly identify and resolve problems in specific components of the RAG pipeline. The development recommendations will help you implement the remaining features needed for a complete, production-ready system.