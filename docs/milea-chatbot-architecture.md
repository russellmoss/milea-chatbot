# Milea Estate Vineyard Chatbot Architecture

## Directory Structure

```
milea-chatbot/
├── config/                          # Configuration settings
│   ├── commerce7.js                   # Commerce7 API configuration
│   └── openai.js                      # OpenAI configuration
│
├── docs/                            # Project documentation
│   ├── chat_gpt_advice.md             # ChatGPT implementation advice
│   ├── chatbot_dev_progress_3-4-25.md # Development progress notes
│   ├── chatbot_overview.md            # General overview
│   ├── chatbot_project_structure.md   # Project structure documentation
│   ├── chatbot-code-sprint-breakdowns.md # Development sprint plans
│   ├── chatbot-implementation-plan.md # Implementation roadmap
│   ├── Commerce7_authentication.md    # Commerce7 auth documentation
│   ├── frontend-setup-guide.md        # Frontend setup instructions
│   ├── google-search-api-integration.md # Google search integration
│   ├── knowledge_examples.md          # Examples for knowledge base
│   ├── knowledge_management_for_milea_chatbot.md # Knowledge management
│   ├── milea_estate_chatbot_development_phases.md # Development phases
│   ├── milea-chatbot-architecture.md  # System architecture details
│   ├── milea-chatbot-developer-documentation.md # Developer docs
│   ├── milea-chatbot-scaling-and-deployment-guide.md # Scaling guide
│   ├── rag-implementation-guide.md    # RAG implementation docs
│   ├── session-management-guide.md    # User session handling
│   ├── technical-architecture-overview.md # Tech architecture
│   └── transaction-handling-guide.md  # E-commerce transaction docs
│
├── knowledge/                       # Structured knowledge base
│   ├── about/                         # About the vineyard information
│   ├── accommodations/                # Nearby lodging information
│   ├── contact/                       # Contact information
│   ├── event/                         # Event information
│   ├── heritage/                      # Vineyard heritage information
│   ├── merchandise/                   # Non-wine product information
│   ├── milea_miles/                   # Milea Miles loyalty program
│   ├── policies/                      # Company policies
│   ├── sustainability/                # Sustainability practices
│   ├── tasting/                       # Tasting experiences
│   ├── vineyard_and_production/       # Wine production info
│   ├── visiting/                      # Visitor information
│   ├── weddings/                      # Wedding event information
│   └── wine_club/                     # Wine club membership info
│
├── logs/                           # Application logs
│
├── middleware/                     # Express middleware
│   └── errorHandler.js               # Global error handling
│
├── routes/                         # Express API routes
│   ├── auth.js                       # Authentication routes
│   ├── businessInfo.js               # Business info endpoints
│   ├── chat.js                       # Basic chat endpoint
│   ├── commerce7.js                  # Commerce7 product retrieval
│   ├── customers.js                  # Customer-related endpoints
│   ├── rag.js                        # RAG-enhanced chat endpoint
│   └── subscribe.js                  # Mailing list subscription
│
├── scripts/                        # Automated tasks & utilities
│   ├── indexMileaMiles.js            # Index Milea Miles content
│   ├── indexsustainability.js        # Index sustainability content
│   ├── indexVistingContent.js        # Index visiting information
│   ├── indexWineClub.js              # Index wine club information
│   ├── indexwineProduction.js        # Index wine production info
│   ├── initializeKnowledgeBase.js    # Initialize knowledge base
│   ├── knowledge-manager.js          # Knowledge base management
│   ├── scheduledTasks.js             # Scheduled tasks for data sync
│   ├── syncCommerce7Products.js      # Commerce7 product sync
│   ├── testMileaMilesQueries.js      # Test loyalty queries
│   ├── testRAG.js                    # Test RAG system
│   ├── testVisitingQueries.js        # Test visiting queries
│   └── watch-knowledge-base.js       # Watch knowledge base changes
│
├── services/                       # Core business logic
│   ├── rag/                          # RAG implementation
│   │   ├── context/                    # Context processing
│   │   │   ├── utils/                    # Context utilities
│   │   │   │   ├── htmlCleaner.js          # HTML cleaning utility
│   │   │   │   └── wineUtils.js            # Wine-specific utilities
│   │   │   ├── grouper.js                # Group related documents
│   │   │   ├── index.js                  # Context main module
│   │   │   ├── scorer.js                 # Document scoring
│   │   │   ├── selector.js               # Document selection
│   │   │   └── validator.js              # Document validation
│   │   ├── domains/                    # Domain-specific handlers
│   │   │   ├── businessHoursHandler.js   # Business hours queries
│   │   │   ├── clubHandler.js            # Wine club queries
│   │   │   ├── generalHandler.js         # General queries fallback
│   │   │   ├── loyaltyHandler.js         # Loyalty program queries
│   │   │   ├── merchandiseHandler.js     # Merchandise queries
│   │   │   ├── sustainabilityHandler.js  # Sustainability queries
│   │   │   ├── visitingHandler.js        # Visiting queries
│   │   │   ├── wine_productionHandler.js # Wine production queries
│   │   │   └── wineHandler.js            # Wine product queries
│   │   ├── utils/                      # RAG utilities
│   │   │   └── knowledgeUtils.js         # Knowledge extraction
│   │   ├── cacheManager.js             # Response caching
│   │   ├── contextAssembler.js         # Context assembly
│   │   ├── conversationTracking.js     # Track conversation state
│   │   ├── core.js                     # Core RAG functionality
│   │   ├── index.js                    # Main RAG export
│   │   ├── queryClassifier.js          # Query classification
│   │   ├── ragService.js               # Main RAG service
│   │   └── responseGenerator.js        # Response generation
│   ├── businessHoursService.js       # Business hours service
│   ├── googleMyBusinessService.js.bak # Google My Business integration
│   └── loyaltyService.js             # Loyalty program service
│
├── utils/                          # Helper utilities
│   ├── commerce7Auth.js              # Commerce7 authentication
│   ├── documentProcessor.js          # Document processing
│   ├── logger.js                     # Logging utility
│   ├── queryHelpers.js               # Query processing helpers
│   └── vectorStore.js                # Vector database interface
│
├── .env                            # Environment variables
├── .gitignore                      # Git ignore file
├── package.json                    # Project dependencies
├── package-lock.json               # Locked dependencies
└── server.js                       # Main Express server
```

## Component Descriptions

### Core Components

#### 1. Server.js
The main entry point for the Express application that initializes middleware, registers routes, and starts the server.

#### 2. Services Layer
The business logic layer containing the RAG (Retrieval-Augmented Generation) implementation:

- **RAG Service**: Core chatbot intelligence that uses OpenAI's models to generate contextually informed responses
  - **Context Processing**: Handles document selection, scoring, and validation
  - **Domain Handlers**: Specialized handlers for different query types (wine, visiting, loyalty, etc.)
  - **Query Classification**: Analyzes user queries to determine intent and category
  - **Response Generation**: Creates formatted responses with appropriate information

- **Business Services**:
  - **Business Hours**: Provides business hours information
  - **Loyalty Service**: Manages Milea Miles loyalty program functionality

#### 3. Routes Layer
API endpoints that handle incoming HTTP requests:

- **auth.js**: User authentication endpoints
- **businessInfo.js**: Business information endpoints
- **chat.js**: Simple chat endpoints without RAG
- **commerce7.js**: Product data from Commerce7
- **customers.js**: Customer account endpoints
- **rag.js**: RAG-enhanced chat endpoint
- **subscribe.js**: Mailing list subscription

#### 4. Knowledge Base
Structured content organized by domain for the RAG system:

- **Wine Information**: Products, tasting notes, details
- **Visit Information**: Hours, directions, accommodations
- **Events & Experiences**: Tastings, events, weddings
- **Business Information**: About, contact, policies
- **Programs**: Wine club, Milea Miles loyalty

#### 5. Scripts
Automation and maintenance tools:

- **Knowledge Base Management**: Initialization, indexing, monitoring
- **Data Synchronization**: Commerce7 product syncing
- **Testing**: Domain-specific query testing

#### 6. Utilities
Helper functions and shared code:

- **commerce7Auth.js**: Commerce7 API authentication
- **documentProcessor.js**: Knowledge document processing
- **logger.js**: Application logging
- **vectorStore.js**: Vector database interface

### Technical Architecture

This application follows a typical Express.js architecture with specialized components for the RAG system:

1. **Client Request Flow**:
   - Request reaches Express server
   - Route handler processes request
   - For chat requests, RAG service is invoked
   - Response is generated and returned

2. **RAG Processing Pipeline**:
   - Query is classified by domain/intent
   - Relevant context documents are retrieved
   - Domain-specific handlers process the query
   - LLM generates response using the context
   - Response is formatted and returned

3. **Knowledge Management**:
   - Documents are processed and chunked
   - Embeddings are generated and stored
   - Vector similarity search finds relevant content
   - Content is validated and scored

4. **Integration Points**:
   - Commerce7: Product and customer data
   - OpenAI: LLM for response generation