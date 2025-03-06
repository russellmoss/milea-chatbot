# Technical Architecture Overview - Milea Estate Vineyard Chatbot

> [AI DEVELOPMENT GUIDE] This document serves as the canonical reference for the Milea Estate Vineyard Chatbot architecture. Use this document to guide all implementation decisions and code generation. When requesting AI assistance, reference specific sections by name.

## System Architecture
> [IMPLEMENTATION PRIORITY] Phase 1 focuses on the RAG Engine and basic UI. Reference this section when implementing core components.

The Milea Estate Vineyard Chatbot is designed with a modular architecture that leverages Retrieval Augmented Generation (RAG) to provide accurate, context-aware responses about the vineyard, its products, and wine-related information. The system consists of interconnected components working together to deliver a seamless user experience.

### Core Components

1. **Frontend Chat Widget**
   - React-based embeddable widget
   - Tailwind CSS styling with Milea Estate branding
   - Responsive design optimized for all devices
   - User interaction handling and display logic

2. **Backend API Server**
   - Node.js with Express framework
   - RESTful API endpoints for chat and data integrations
   - Authentication and security middleware
   - Rate limiting and request validation

3. **RAG Knowledge Engine**
   - Vector embeddings of Milea-specific content
   - In-memory vector database (Phase 1)
   - Retrieval logic for finding relevant context
   - Content ranking and selection algorithms

4. **Integration Layer**
   - Commerce7 API connector
   - Google Search API connector (scoped to mileaestatevineyard.com)
   - OpenAI API integration
   - Webhook handlers for real-time updates

5. **Response Generation System**
   - Context assembly and prompt construction
   - LLM interaction via OpenAI API
   - Response formatting and enrichment
   - Recommendation engine for products and services

6. **Operational Components**
   - Logging and monitoring systems
   - Analytics collection and reporting
   - Knowledge base management tools
   - Cache management

## Data Flow Architecture

### Primary User Interaction Flow

```
User → Chat Widget → Backend API → RAG Engine → LLM → User
```

1. User submits a question through the chat widget
2. Frontend sends request to Backend API
3. Backend processes request and queries the RAG Knowledge Engine
4. RAG Engine retrieves relevant context from multiple sources
5. Context and query are sent to the LLM via OpenAI API
6. Generated response is processed, formatted, and returned to user

### Knowledge Retrieval Hierarchy

```
Query → RAG Markdown Docs → Commerce7 API → Website Content → General Knowledge
```

The system follows a prioritized approach to information retrieval:
1. First checks Milea-specific RAG markdown documents
2. Then queries Commerce7 for product, reservation, and customer data
3. Searches mileaestatevineyard.com via Google Search API
4. Falls back to general knowledge from the LLM as needed

## Component Interaction Diagram

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│                 │     │                                     │
│  Frontend       │     │  Backend                            │
│  Chat Widget    │     │  ┌─────────────┐   ┌─────────────┐  │
│  ┌───────────┐  │     │  │             │   │             │  │
│  │ React UI  │  │     │  │ Express API │   │ RAG Engine  │  │
│  │           │◄─┼─────┼──┤             │◄──┤             │  │
│  │ Components│  │     │  │ Endpoints   │   │ Knowledge   │  │
│  │           │──┼─────┼──►             │───►             │  │
│  └───────────┘  │     │  └──────┬──────┘   └──────┬──────┘  │
│                 │     │         │                 │         │
└─────────────────┘     │         ▼                 ▼         │
                        │  ┌─────────────┐   ┌─────────────┐  │
                        │  │ Integration │   │ Response    │  │
                        │  │ Layer       │   │ Generation  │  │
                        │  │             │   │             │  │
                        │  └──────┬──────┘   └──────┬──────┘  │
                        │         │                 │         │
                        └─────────┼─────────────────┼─────────┘
                                  │                 │
                                  ▼                 ▼
     ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
     │               │    │               │    │               │
     │  Commerce7    │    │  Google       │    │  OpenAI       │
     │  API          │    │  Search API   │    │  API          │
     │               │    │               │    │               │
     └───────────────┘    └───────────────┘    └───────────────┘
```

## Detailed Component Specifications
> [CODE GENERATION GUIDE] Use these specifications when requesting code implementations for specific components. Reference the exact component name for more tailored assistance.

### 1. Frontend Chat Widget

#### Technology Stack
- React.js for component architecture
- Tailwind CSS for styling
- JavaScript/TypeScript for logic

#### Key Features
- Expandable/collapsible chat interface
- Message history display
- Message input with send button
- Typing indicators
- Rich message formatting (text, links, images)
- Interactive elements (buttons, selectors for reservations)
- Brand-consistent styling

#### Data Flow
- Sends user messages to backend API
- Receives and displays assistant responses
- Manages local session state
- Handles user authentication when needed
- Implements responsive design for all devices

### 2. Backend API Server

#### Technology Stack
- Node.js runtime
- Express.js framework
- RESTful API architecture

#### Key Endpoints
- `/api/chat` - Process chat messages
- `/api/knowledge/*` - Knowledge base management
- `/api/commerce7/*` - Commerce7 data endpoints
- `/api/webhooks/*` - Webhook receivers

#### Middleware
- Authentication validation
- Request rate limiting
- Error handling
- CORS configuration
- Request/response logging

#### Security Features
- Environment variable configuration
- API key protection
- Input validation and sanitization
- Session management

### 3. RAG Knowledge Engine

#### Components
- Vector database (in-memory initially, Pinecone in later phases)
- Embedding generation service
- Retrieval algorithms
- Relevance ranking system

#### Knowledge Sources
- Markdown documents about Milea Estate
- Commerce7 product and service data
- Website content via Google Search API
- Historical conversation context

#### Processes
- Convert textual data to vector embeddings
- Store and index embeddings efficiently
- Retrieve semantically similar content based on user queries
- Return ranked, relevant content chunks with source attribution

### 4. Integration Layer

#### Commerce7 Integration
> [API INTEGRATION FOCUS] When implementing Commerce7 features, follow these patterns exactly for authentication, data access, webhooks, and transactions.
- OAuth 2.0 authentication
- Product catalog access
- Inventory status retrieval
- Customer data integration
- Reservation management
- Order processing
- Webhook event handling

#### Google Search API Integration
- Domain-restricted search (mileaestatevineyard.com)
- Result parsing and extraction
- Content relevance filtering
- Snippet generation for context

#### OpenAI API Integration
- Model selection and configuration
- Prompt engineering and formatting
- Response streaming
- Error handling and fallbacks

### 5. Response Generation System

#### Components
- Context assembly engine
- Prompt construction templates
- LLM interaction service
- Response post-processing

#### Features
- Dynamic context selection
- Sales opportunity identification
- Product recommendation logic
- Reservation suggestion system
- Answer formatting with attribution

#### Optimizations
- Caching of common responses
- Context window management
- Token usage optimization
- Response quality monitoring

## Data Models
> [SCHEMA REFERENCE] When implementing database or state management code, reference these data models. They define the core structures that flow through the application.

### Knowledge Base Item
```
{
  "id": "unique-identifier",
  "content": "Markdown content about a specific topic",
  "embedding": [vector representation],
  "source": "internal_doc | website | commerce7",
  "category": "wines | vineyard | visiting | events",
  "last_updated": "2023-10-15T14:30:00Z"
}
```

### Chat Message
```
{
  "id": "msg-12345",
  "session_id": "session-6789",
  "user_id": "anonymous-or-customer-id",
  "content": "Message text",
  "role": "user | assistant",
  "timestamp": "2023-10-15T14:32:00Z",
  "sources": ["knowledge-item-ids-used"],
  "actions": ["commerce7-actions-taken"]
}
```

### Commerce7 Product Reference
```
{
  "id": "product-id-from-commerce7",
  "name": "Wine Name",
  "description": "Product description",
  "price": 29.99,
  "inventory": 150,
  "category": "red | white | rosé | sparkling",
  "vintage": "2019",
  "image_url": "https://...",
  "purchase_url": "https://..."
}
```

## Deployment Architecture

### Development Environment
- VS Code IDE
- GitHub repository
- Local Node.js development server
- Environment variable management with dotenv

### Production Environment
- Firebase Hosting (frontend static assets)
- Firebase Functions (serverless backend)
- Scheduled Functions for knowledge base updates
- Webhook endpoints for Commerce7 integration

### Scaling Considerations
- Serverless architecture for automatic scaling
- Rate limiting to respect API quotas
- Caching to reduce API calls
- Potential migration to Kinsta for deeper website integration

## Security Architecture

### Authentication
- API key management for external services
- Commerce7 OAuth 2.0 implementation
- Optional user authentication for personalized experiences

### Data Protection
- No storage of sensitive PII
- Encryption for API keys in environment variables
- Secure handling of Commerce7 credentials

### API Security
- Rate limiting to prevent abuse
- Input validation on all endpoints
- CORS configuration for widget security

## Integration Strategies

### Commerce7 Integration

The chatbot integrates deeply with Commerce7 through their API:

1. **Authentication Flow**
   - Implement OAuth 2.0 authentication
   - Securely store access and refresh tokens
   - Handle token rotation and expiration

2. **Data Access Pattern**
   - Query product catalog with caching
   - Check inventory levels in real-time
   - Access customer information when authenticated
   - Manage reservations and appointments

3. **Webhook Implementation**
   - Subscribe to relevant Commerce7 events
   - Process incoming webhooks for:
     - Inventory changes
     - Order status updates
     - Reservation confirmations
     - Price or promotion changes

4. **Transaction Flow**
   - Initiate reservations or purchases
   - Manage shopping cart via API
   - Process checkout through Commerce7
   - Confirm transactions and provide status updates

### Google Search API Implementation

1. **Search Configuration**
   - Restricted to mileaestatevineyard.com domain
   - Optimized query formulation
   - Result filtering and ranking

2. **Content Processing**
   - Extract relevant snippets
   - Convert to embeddings for RAG
   - Attribute sources in responses

## Phase-Specific Architecture
> [DEVELOPMENT ROADMAP] Use this section to track implementation progress and maintain focus on the appropriate features for each phase.

### Phase 1: Basic RAG Implementation
- In-memory vector storage
- Limited knowledge base
- Basic chat functionality
- Simple widget UI

```
IMPLEMENTATION CHECKLIST:
[ ] Set up Node.js Express backend
[ ] Implement basic RAG with in-memory storage
[ ] Create embeddings for core Milea documents
[ ] Develop simple React chat widget
[ ] Connect widget to backend API
[ ] Deploy initial version to Firebase
```

### Phase 2: Core Commerce7 Integration
- Product catalog integration
- Basic customer recognition
- Expanded knowledge base
- Google Search API integration

```
IMPLEMENTATION CHECKLIST:
[ ] Set up Commerce7 API authentication
[ ] Implement product catalog retrieval
[ ] Add customer data integration
[ ] Configure Google Search API for website search
[ ] Enhance context retrieval pipeline
[ ] Update response generation to include product data
```

### Phase 3: Enhanced Commerce7 Features
- Reservation booking capabilities
- Direct ordering functionality
- Webhook event processing
- Wine club enrollment

```
IMPLEMENTATION CHECKLIST:
[ ] Implement reservation booking flow
[ ] Add direct ordering functionality
[ ] Set up webhook listeners for Commerce7 events
[ ] Create wine club enrollment process
[ ] Enhance UI for transaction flows
[ ] Implement session management
```

### Phase 4: Refinement and Optimization
- Analytics implementation
- Performance optimization
- Potential migration to Pinecone
- Advanced personalization

```
IMPLEMENTATION CHECKLIST:
[ ] Add analytics tracking
[ ] Implement response caching
[ ] Evaluate and optimize performance
[ ] Consider migration to Pinecone or similar vector DB
[ ] Add customer personalization features
[ ] Implement A/B testing for recommendations
```

## Monitoring and Analytics

### Performance Metrics
- Response time tracking
- API call volume monitoring
- Error rate reporting
- User satisfaction measurement

### Business Analytics
- Conversation topics analysis
- Conversion tracking (chat to sale)
- Reservation completion rate
- Wine club enrollment attribution

### Technical Monitoring
- API rate limit tracking
- Cache hit/miss ratios
- Token usage optimization
- Knowledge base coverage analysis

## Implementation Code Snippets

> [CODE EXAMPLES] These snippets demonstrate key implementation patterns for reference during development.

### 1. RAG Query Processing

```javascript
// Example of how to process a user query through the RAG system
async function processRagQuery(userQuery, sessionId) {
  try {
    // 1. Convert query to embedding
    const queryEmbedding = await generateEmbedding(userQuery);
    
    // 2. Retrieve relevant context from knowledge sources (in priority order)
    const relevantDocs = await retrieveRelevantDocuments(queryEmbedding);
    const commerce7Data = await getRelevantCommerce7Data(userQuery);
    const websiteContent = await searchWebsite(userQuery);
    
    // 3. Combine context sources with appropriate weighting
    const context = combineContextSources([
      { source: 'rag_docs', data: relevantDocs, weight: 3 },
      { source: 'commerce7', data: commerce7Data, weight: 2 },
      { source: 'website', data: websiteContent, weight: 1 }
    ]);
    
    // 4. Create prompt with context
    const prompt = createRagPrompt(userQuery, context, sessionId);
    
    // 5. Send to LLM and get response
    const response = await queryLLM(prompt);
    
    // 6. Post-process response (add source attribution, etc.)
    return postProcessResponse(response, context);
  } catch (error) {
    console.error('Error in RAG query processing:', error);
    return createErrorResponse(error);
  }
}
```

### 2. Commerce7 Authentication

```javascript
// Example of Commerce7 OAuth 2.0 implementation
async function getCommerce7AccessToken() {
  // Check if we have a valid cached token
  if (tokenCache.isValid()) {
    return tokenCache.getToken();
  }
  
  try {
    // Request new token
    const response = await axios.post('https://api.commerce7.com/v1/token', {
      client_id: process.env.COMMERCE7_CLIENT_ID,
      client_secret: process.env.COMMERCE7_CLIENT_SECRET,
      grant_type: 'client_credentials'
    });
    
    // Cache the token with expiration
    const { access_token, expires_in } = response.data;
    tokenCache.setToken(access_token, expires_in);
    
    return access_token;
  } catch (error) {
    console.error('Error obtaining Commerce7 access token:', error);
    throw new Error('Failed to authenticate with Commerce7');
  }
}
```

### 3. Frontend Chat Widget Component

```jsx
// React component for chat widget
import React, { useState, useEffect, useRef } from 'react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages when new messages appear
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Send message to backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputText,
          sessionId: localStorage.getItem('chatSessionId') || 'new'
        })
      });
      
      const data = await response.json();
      
      // Store session ID if new
      if (data.sessionId) {
        localStorage.setItem('chatSessionId', data.sessionId);
      }
      
      // Add assistant response to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message,
        sources: data.sources || []
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="milea-chat-widget">
      {/* Widget button */}
      <button 
        className="widget-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Close' : 'Chat with Milea'}
      </button>
      
      {/* Chat container */}
      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <img src="/milea-logo.png" alt="Milea Estate Vineyard" />
            <h3>Milea Estate Vineyard</h3>
          </div>
          
          <div className="messages-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="message-sources">
                    Sources: {msg.sources.join(', ')}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="loading-indicator">
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="input-container">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about our wines, events, or visiting..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
```

## AI Assistance Tips

> [AI DEVELOPMENT GUIDE] Use these prompts when working with ChatGPT or Claude for more effective assistance.

### General Development Prompts

1. **Component Implementation**
   ```
   Based on the Milea Estate Vineyard Chatbot architecture, help me implement the [COMPONENT_NAME] component. 
   The component should follow these specifications: [PASTE RELEVANT SPECS].
   Please provide the complete code with comments explaining key functionality.
   ```

2. **Debugging Assistance**
   ```
   I'm encountering an issue with my Milea chatbot [COMPONENT]. Here's the error message:
   [ERROR]
   
   Here's my current implementation:
   [CODE]
   
   Based on the architecture overview, what's the likely cause and how should I fix it?
   ```

3. **Integration Help**
   ```
   I need to integrate the Commerce7 [API_NAME] with my Milea chatbot. According to the architecture document, 
   this integration should [DESCRIBE PURPOSE]. Please provide the implementation code and explain how it fits 
   into the existing architecture.
   ```

### RAG-Specific Prompts

1. **Knowledge Base Setup**
   ```
   Based on the Milea chatbot architecture, help me create the code to process markdown documents into embeddings 
   for the RAG system. The documents contain information about [TOPIC], and I need to ensure the embeddings 
   are stored according to the data model in the architecture overview.
   ```

2. **Retrieval Logic**
   ```
   Following the Milea chatbot architecture, I need code for the retrieval component that finds relevant 
   documents based on user queries. It should prioritize sources according to the Knowledge Retrieval Hierarchy 
   specified in the architecture document.
   ```

3. **Context Assembly**
   ```
   Based on the Milea chatbot's Data Flow Architecture, I need help implementing the function that combines 
   multiple knowledge sources (RAG docs, Commerce7 data, website content) into a unified context for the LLM. 
   The architecture specifies these priority weights: [WEIGHTS].
   ```

### Commerce7-Specific Prompts

1. **API Authentication**
   ```
   Following the Milea chatbot architecture, I need to implement the Commerce7 authentication flow. The auth 
   should follow the OAuth 2.0 implementation specified in the Integration Strategies section.
   ```

2. **Product Catalog Integration**
   ```
   Based on the Milea chatbot architecture, I need to implement the function to retrieve and format product 
   catalog data from Commerce7. This should follow the Data Access Pattern specified in the Commerce7 
   Integration section and conform to the Commerce7 Product Reference data model.
   ```

3. **Webhook Handler**
   ```
   According to the Milea chatbot architecture, I need to implement a webhook handler for [EVENT_TYPE] events 
   from Commerce7. The architecture specifies that this should update [SPECIFY DATA] when triggered.
   ```

## Conclusion

The Milea Estate Vineyard Chatbot architecture is designed to be both robust and implementable by a beginning developer with AI assistance. The modular approach allows for phased development, starting with core RAG functionality and progressively adding Commerce7 integrations and advanced features.

The system prioritizes:
- Accurate and helpful responses using RAG
- Seamless Commerce7 integration
- Brand-consistent user experience
- Scalable architecture that starts simple
- Security and reliability

This technical foundation provides a clear roadmap for development while maintaining flexibility to adapt to changing requirements and technical capabilities.

Remember to reference specific sections of this document when requesting assistance from AI tools to get the most relevant and architecture-aligned help.
