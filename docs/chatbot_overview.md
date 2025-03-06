# Milea Estate Vineyard Chatbot - App Overview

## Project Summary
A branded AI-powered chatbot for Milea Estate Vineyard that helps customers and visitors get information about the vineyard, its products, and wine-related questions. The chatbot will utilize RAG (Retrieval Augmented Generation) with Milea Estate-specific knowledge bases, website content accessed via Google Search API, product data from Commerce7 (POS/Ecommerce/Club solution), and general web information as a fallback. It will be accessible via a customized widget on the Milea Estate Vineyard website, with a focus on ease of implementation for a beginning developer using AI assistance.

## Core Features
- RAG-powered knowledge base using Milea Estate Vineyard markdown documents
- Google Search API integration (searching mileaestatevineyard.com for the latest info)
- Commerce7 integration (products, inventory, club information, customer data, reservations)
- General web search capability for non-Milea questions
- Branded chat widget interface for website integration
- Contextual, narrative-style responses with proactive but contextual sales recommendations
- Direct booking capabilities for tastings and events via Commerce7 Reservations API
- Real-time order status updates via Commerce7 Webhooks

## User Personas
### Winery Customer
- **Demographics**: Wine enthusiasts, 25-65, varying technical proficiency
- **Goals**: Learn about wines, vineyard history, plan visits, make purchases
- **Pain Points**: Can't find specific information, questions outside business hours, uncertainty about wine selection

### Winery Staff
- **Demographics**: Employees of Milea Estate, varying technical roles
- **Goals**: Provide better customer service, reduce time answering common questions
- **Pain Points**: Repetitive questions, limited time during busy periods, need to maintain consistent information

## Technical Requirements

### Frontend
- **Framework**: React (for easier widget development)
- **UI Library**: Tailwind CSS (for straightforward styling)
- **Responsive Design**: Mobile-first approach, embeddable on all device types
- **Branding**: Match Milea Estate visual identity (colors, typography, logo)

### Backend
- **API**: REST API connecting to OpenAI's GPT models
- **Server**: Node.js with Express
- **RAG Implementation**: In-memory embeddings initially (simpler and free), upgrade to Pinecone later if needed
- **Integrations**: 
  - Google Search API (restricted to mileaestatevineyard.com)
  - Commerce7 API connector with secure authentication
  - OpenAI API integration
- **Security**:
  - Environment variables (.env) for API keys and credentials
  - Rate limiting for API calls to avoid hitting Commerce7 limits
  - Secure handling of customer data following Commerce7 best practices

### Deployment
- **Hosting**: Firebase (easy and cost-effective) for initial development; option to move to Kinsta if deeper website integration is needed
- **Development Environment**: VSCode, GitHub for version control
- **Complexity Level**: Beginner-friendly with AI-assisted coding

## User Flow
1. User visits Milea Estate Vineyard website and notices chat widget
2. User clicks on widget which expands to show chat interface
3. User types a question about wines, vineyard, or products
4. System processes query through knowledge sources in priority order:
   a. RAG markdown documents specific to Milea
   b. Commerce7 APIs for product, club, reservation, and customer data
   c. Website content via Google Search API
   d. General web knowledge
5. Chatbot provides answers and, when appropriate, recommends purchases, memberships, or special offers
6. User can ask follow-up questions, start new topics, or complete transactions (bookings, orders) directly in chat

## Data Model
### Knowledge Base
- **Fields**:
  - `id`: Unique identifier
  - `content`: Markdown document content
  - `embedding`: Vector representation of content
  - `source`: Origin of information (internal doc, website, Commerce7)
  - `last_updated`: Timestamp
- **Relationships**:
  - Linked to Categories

### Categories
- **Fields**:
  - `id`: Unique identifier
  - `name`: Category name (e.g., "Wines", "Vineyard History", "Visiting")
- **Relationships**:
  - Has many Knowledge Base items

### Chat Sessions
- **Fields**:
  - `id`: Unique identifier
  - `user_id`: Anonymous user identifier
  - `start_time`: Session start timestamp
  - `end_time`: Session end timestamp
  - `commerce7_customer_id`: Commerce7 customer ID (if authenticated)
- **Relationships**:
  - Has many Chat Messages

### Chat Messages
- **Fields**:
  - `id`: Unique identifier
  - `session_id`: Related chat session
  - `content`: Message text
  - `role`: "user" or "assistant"
  - `timestamp`: Message time
  - `sources`: References to knowledge used (if assistant message)
  - `actions`: Any Commerce7 actions taken (reservations, orders, etc.)

## API Endpoints

### Chat
- `POST /api/chat`: Send user message, receive AI response
- `GET /api/chat/history`: Retrieve recent chat history

### Knowledge Management
- `POST /api/knowledge/update`: Trigger knowledge base update
- `GET /api/knowledge/status`: Check last update time and status

### Commerce7 Integration
- `GET /api/products`: Get product information from Commerce7
- `GET /api/club`: Get wine club information from Commerce7
- `GET /api/customer/history`: Fetch customer purchase history (if logged in)
- `GET /api/inventory/status`: Check stock levels for promotions
- `GET /api/promotions`: Retrieve active promotions from Commerce7 API
- `POST /api/reservations`: Book tasting or event appointments
- `POST /api/orders`: Place orders directly through chat
- `GET /api/loyalty`: Retrieve customer loyalty points and status
- `POST /api/club/enroll`: Process wine club membership enrollments
- `POST /api/webhooks/commerce7`: Endpoint for Commerce7 webhook notifications

## UI/UX Guidelines
- **Color Scheme**: Match Milea Estate branding (wine reds, vineyard greens, earthy tones)
- **Typography**: Use website fonts for consistency
- **Components**: 
  - Chat bubble design
  - Expandable/collapsible widget
  - Optional typing indicator
  - Simple user feedback buttons
  - Transaction confirmation dialogs
  - Reservation calendar/picker integration

## Non-Functional Requirements
- **Performance**: Response time under 3 seconds
- **Security**: No collection of PII, transparent data usage, secure API authentication
- **Accessibility**: WCAG 2.1 AA compliance
- **Analytics**: Track common questions, user satisfaction, chat duration, sales conversions
- **Caching**: Implement caching for frequent queries to optimize API usage

## Development Phases
### Phase 1 - Basic RAG Implementation
- Set up OpenAI integration
- Implement basic widget UI
- Create RAG system with in-memory embeddings and markdown documents
- Deploy minimal viable product

### Phase 2 - Core Commerce7 Integration
- Implement secure Commerce7 API authentication
- Add Google Search API functionality for mileaestatevineyard.com
- Integrate Commerce7 API for products and club info
- Add customer purchase history integration
- Implement inventory and promotion features
- Improve response quality and sources

### Phase 3 - Enhanced Commerce7 Features
- Add reservation booking capabilities
- Implement direct ordering functionality
- Set up webhook listeners for real-time updates
- Integrate loyalty program information
- Enable club membership enrollment

### Phase 4 - Refinement
- Add user feedback mechanisms
- Implement analytics
- Optimize performance
- Evaluate need for vector database upgrade (Pinecone, etc.)
- Add advanced features (personalized recommendations, etc.)

## Testing Strategy
- **Functional Testing**: Manual testing of chat responses
- **Integration Testing**: Verify connections to all data sources
- **User Testing**: Small group of winery staff and loyal customers
- **Security Testing**: Verify secure handling of Commerce7 API credentials
- **Performance Testing**: Ensure API rate limits are respected

## External Integrations
- **OpenAI API**: Core language model integration
- **Commerce7 API**: 
  - Product, club, customer, and promotion data
  - Reservation and order management
  - Loyalty program integration
  - Webhook implementation for real-time updates
- **Google Search API**: For website content retrieval (restricted to mileaestatevineyard.com)
- **Simple Storage**: File-based or in-memory storage for embeddings initially

## Constraints and Assumptions
- **Technical Constraints**: Beginning coder skillset, reliance on AI assistance
- **Budget Considerations**: OpenAI API costs, Google Search API costs, hosting costs
- **Timeline**: Phased approach to manage complexity
- **Assumptions**: 
  - Commerce7 API provides necessary access levels
  - Markdown documents contain quality information
  - Commerce7 webhook functionality can be leveraged

## Sales Strategy
- Identify user intent through conversation
- Recommend relevant products when user shows interest in wine types
- Promote wine club membership when appropriate
- Highlight limited stock items based on inventory data
- Personalize recommendations based on purchase history (if available)
- Seamlessly present special promotions and events
- Display loyalty points and available rewards
- Offer direct booking and purchasing options within the chat

## Success Metrics
- **Engagement**: Number of chat interactions per week
- **Resolution Rate**: Percentage of questions answered satisfactorily
- **Staff Time Saved**: Reduction in common email/phone inquiries
- **Conversion**: Influence on online sales after chatbot implementation
- **Promotion Effectiveness**: Click-through rates on chatbot-offered promotions
- **Reservations**: Number of tastings/events booked through the chatbot
- **Club Enrollments**: New wine club memberships initiated via chat

## Implementation Resources
- **Code Assistance**: ChatGPT and Claude for development help
- **RAG Resources**: OpenAI documentation, RAG implementation guides
- **Node.js Packages**: 
  - OpenAI Node SDK
  - Express for API development
  - Axios for API requests
  - Firebase SDK for hosting and functions
  - Simple-vector-db or similar for lightweight embedding storage
  - Dotenv for environment variable management
  - Express-rate-limit for API rate limiting

## Commerce7 Implementation Details
- **Authentication**: Implement OAuth 2.0 flow for secure Commerce7 API access
- **API Usage**: Follow Commerce7's best practices for efficient API usage
- **Webhooks**: Configure webhooks for real-time updates on:
  - Order status changes
  - Inventory updates
  - Reservation confirmations/changes
  - Price or promotion changes
- **Caching Strategy**: Cache Commerce7 responses for frequently accessed data
- **Error Handling**: Implement robust error handling for API failures

## Appendix
- **Learning Resources**: Links to beginner-friendly tutorials for each technology
- **API Documentation**: Commerce7 API reference, Google Search API documentation
- **RAG Explanation**: Simple explanation of how RAG works for future reference
- **Commerce7 Security Guide**: Best practices for handling Commerce7 API credentials