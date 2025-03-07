# Milea Estate Vineyard Chatbot Architecture

## Directory Structure Overview

```
milea-chatbot/
├── config/                       # Configuration settings
│   ├── commerce7.js                # Commerce7 API credentials and config
│   └── openai.js                   # OpenAI configuration
│
├── docs/                         # Project documentation
│   ├── chatbot-overview.md         # General overview
│   ├── chatbot-implementation.md   # Development roadmap
│   ├── technical-architecture.md   # System architecture details
│   ├── session-management.md       # User session handling
│   ├── transaction-handling.md     # E-commerce integration
│   ├── google-search-api.md        # Website search integration
│   ├── frontend-setup-guide.md     # Frontend setup instructions
│   ├── chatbot-code-sprints.md     # Breakdown of coding tasks
│   └── rag-implementation.md       # RAG-specific development notes
│
├── knowledge/                    # Structured knowledge base
│   ├── wine/                      # Wine product data from Commerce7
│   ├── tasting/                   # Tasting experience information
│   ├── event/                     # Event information
│   ├── visiting/                  # Visitor information (hours, directions)
│   ├── merchandise/               # Non-wine product information
│   ├── wine club/                 # Wine club membership details
│   └── [additional domains]/      # Extensible for new knowledge domains
│
├── logs/                         # Scheduled task logs
│
├── middleware/                   # Express middleware
│   ├── auth.js                     # Authentication middleware
│   └── errorHandler.js             # Global error handling
│
├── routes/                       # Express API routes
│   ├── auth.js                     # Authentication routes
│   ├── chat.js                     # Basic chat endpoint
│   ├── commerce7.js                # Commerce7 product retrieval
│   ├── customers.js                # Customer-related endpoints
│   └── rag.js                      # RAG-enhanced chat endpoint
│
├── scripts/                      # Automated tasks
│   ├── initializeKnowledgeBase.js  # Load knowledge base
│   ├── scheduledTasks.js           # Automated Commerce7 syncing
│   ├── syncCommerce7Products.js    # Fetch & store latest products
│   ├── indexVisitingContent.js     # Index visiting information
│   ├── indexWineClub.js            # Index wine club information
│   └── testRAG.js                  # Test RAG response generation
│
├── services/                     # Business logic
│   ├── rag/                        # RAG service components
│   │   ├── index.js                  # Main export point
│   │   ├── ragService.js             # Core RAG functionality
│   │   ├── queryClassifier.js        # Query type detection
│   │   ├── contextAssembler.js       # Retrieve and format context
│   │   ├── responseGenerator.js      # Format response with LLM
│   │   ├── domains/                  # Domain-specific handlers
│   │   │   ├── wineHandler.js          # Wine query logic
│   │   │   ├── visitingHandler.js      # Visiting query logic
│   │   │   ├── clubHandler.js          # Wine club query logic
│   │   │   ├── merchandiseHandler.js   # Merchandise query logic
│   │   │   ├── sustainabilityHandler.js # Sustainability content
│   │   │   └── generalHandler.js       # General fallback handler
│   │   └── utils/                    # RAG utilities
│   │       └── knowledgeUtils.js       # Wine data extraction
│
├── utils/                        # Helper functions
│   ├── logger.js                   # Centralized logging
│   ├── queryHelpers.js             # Query detection functions
│   ├── commerce7Auth.js            # Commerce7 API authentication
│   ├── documentProcessor.js        # Document chunking
│   └── vectorStore.js              # ChromaDB integration
│
├── .env                          # Environment variables
├── .gitignore                    # Ignored files
├── package.json                  # Project metadata & dependencies
├── package-lock.json             # Locked dependencies
└── server.js                     # Main Express server
```

## Component Descriptions

### 1. Config

- **commerce7.js**: Manages Commerce7 API credentials and configuration. Creates a standard authentication config used across the application.
- **openai.js**: Sets up the OpenAI client with API keys and default parameters.

### 2. Knowledge Base

The knowledge base is structured into domain-specific folders. Each domain contains markdown files that are processed, chunked, and embedded for the RAG system:

- **wine/**: Wine product information synced from Commerce7
- **tasting/**: Information about tasting experiences
- **event/**: Event information and ticketing
- **visiting/**: Visitor information including hours, directions, reservations
- **merchandise/**: Non-wine product information
- **wine club/**: Details about wine club memberships
- **[additional domains]/**: The system is designed to be extensible with new domains

### 3. Middleware

- **auth.js**: Provides authentication and authorization logic
- **errorHandler.js**: Global error handling to standardize error responses

### 4. Routes

- **auth.js**: Handles user authentication (login/logout)
- **chat.js**: Basic chat endpoint without RAG enhancement (fallback)
- **commerce7.js**: Interfaces with Commerce7 API to retrieve product information
- **customers.js**: Handles customer-related requests
- **rag.js**: Main chat endpoint using RAG for enhanced responses

### 5. Scripts

- **initializeKnowledgeBase.js**: Processes documents and generates embeddings for the initial knowledge base
- **scheduledTasks.js**: Sets up cron jobs for regular data synchronization
- **syncCommerce7Products.js**: Fetches latest product data from Commerce7 and converts to markdown files
- **indexVisitingContent.js**: Specifically processes and indexes visiting information
- **indexWineClub.js**: Specifically processes and indexes wine club information
- **testRAG.js**: Tool for testing RAG pipeline with sample queries

### 6. Services

#### RAG Service

- **index.js**: Main export point for the RAG service
- **ragService.js**: Core RAG pipeline orchestration
- **queryClassifier.js**: Analyzes queries to determine their domain and intent
- **contextAssembler.js**: Retrieves and scores relevant documents for a query
- **responseGenerator.js**: Creates prompts and generates responses using the LLM

#### Domain Handlers

- **wineHandler.js**: Specialized handling for wine-related queries
- **visitingHandler.js**: Handles visiting-related queries (hours, directions, etc.)
- **clubHandler.js**: Processes wine club membership queries
- **merchandiseHandler.js**: Handles merchandise-related queries
- **sustainabilityHandler.js**: Manages sustainability content
- **generalHandler.js**: Fallback handler for general queries

### 7. Utils

- **logger.js**: Centralized logging system with different log levels
- **queryHelpers.js**: Helper functions for analyzing and classifying queries
- **commerce7Auth.js**: Commerce7 API authentication utilities
- **documentProcessor.js**: Processes markdown documents into appropriate chunks
- **vectorStore.js**: Interacts with ChromaDB to store and retrieve document embeddings

### 8. Server.js

Main application entry point that sets up Express server, initializes middleware, registers routes, and starts the server.
