# Milea Estate Vineyard Chatbot Developer Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Technologies](#core-technologies)
4. [RAG Implementation](#rag-implementation)
   - [Knowledge Base Structure](#knowledge-base-structure)
   - [Document Processing](#document-processing)
   - [Vector Storage](#vector-storage)
   - [Query Processing](#query-processing)
   - [Response Generation](#response-generation)
5. [Knowledge Management Tools](#knowledge-management-tools)
   - [Knowledge CLI](#knowledge-cli)
   - [Knowledge Base Watcher](#knowledge-base-watcher)
6. [Commerce7 Integration](#commerce7-integration)
7. [Domain-Based Architecture](#domain-based-architecture)
8. [Extending the Knowledge Base](#extending-the-knowledge-base)
9. [Deployment Guide](#deployment-guide)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Troubleshooting](#troubleshooting)

## Introduction

The Milea Estate Vineyard Chatbot is a sophisticated Node.js application that provides AI-powered assistance to customers regarding Milea's wines, visiting information, and services. The chatbot uses a Retrieval Augmented Generation (RAG) approach to ensure responses are grounded in accurate, up-to-date information about the vineyard and its offerings.

The system integrates with Commerce7 (Milea's e-commerce platform) to maintain current product information and provides specialized handling for different types of customer inquiries.

## System Architecture

The chatbot follows a modular architecture with clear separation of concerns:

1. **Frontend Interface**: Currently handling testing, planned for integration with the Milea website
2. **API Layer**: Express.js routes handling various request types
3. **RAG Engine**: Core knowledge retrieval and response generation
4. **Domain-Specific Handlers**: Specialized processing for different query types
5. **External Integrations**: Commerce7 API for product data

### Request Flow

1. User query arrives at `/rag-chat` endpoint
2. Query is classified by domain (wine, visiting, club, etc.)
3. Relevant context is retrieved from the vector database
4. Domain-specific handler processes the query and context
5. Response is generated using OpenAI with the retrieved context
6. Response is returned to the user

## Core Technologies

The system uses the following core technologies:

- **Node.js/Express**: Backend server framework
- **ChromaDB**: Vector database for storing embeddings
- **LangChain**: Framework for document processing and embeddings
- **OpenAI API**: For embeddings and response generation
- **Commerce7 API**: For product and inventory data
- **Cron**: For scheduled tasks like data synchronization
- **Chokidar**: For watching file system changes in the knowledge base

## RAG Implementation

The RAG (Retrieval Augmented Generation) system is the core of the chatbot's ability to provide accurate, contextual responses.

### Knowledge Base Structure

The knowledge base is organized into domain-specific directories, each containing markdown files with relevant information:

```
knowledge/
├── wine/             # Wine product information
├── visiting/         # Visiting information
├── event/            # Event information
├── wine club/        # Wine club details
├── merchandise/      # Non-wine merchandise
├── milea_miles/      # Loyalty program information
└── wine_production/  # Wine production process details
```

Each domain directory contains markdown files that follow a consistent structure for proper processing.

### Document Processing

Documents are processed in several steps:

1. **Loading**: Markdown files are loaded from the knowledge base
2. **Content Type Detection**: The system identifies the content type based on the folder or file name
3. **Chunking**: Documents are split into appropriately sized chunks based on content type
4. **Metadata Addition**: Each chunk is tagged with metadata (source, type, creation date)

This process is handled in `utils/documentProcessor.js` which implements content-aware chunking to ensure that semantically meaningful units are preserved.

### Vector Storage

The ChromaDB vector database stores document embeddings for efficient similarity search:

1. **Embedding Generation**: Document chunks are converted to vector embeddings using OpenAI's embedding model
2. **Storage**: Embeddings are stored in ChromaDB collections
3. **Retrieval**: Vector similarity search is used to find relevant documents for queries

The system uses an in-memory ChromaDB instance for development but can be configured to use a persistent server for production.

### Query Processing

Query processing involves several steps:

1. **Query Classification**: `services/rag/queryClassifier.js` analyzes the query to determine its domain and specific intent
2. **Context Assembly**: `services/rag/contextAssembler.js` retrieves relevant documents, scores them, and selects the best matches
3. **Domain Handling**: The appropriate domain handler (`services/rag/domains/`) processes the query with domain-specific logic

This classification enables specialized handling for different query types, improving response quality.

### Response Generation

Response generation uses the OpenAI API with carefully crafted prompts:

1. **Prompt Construction**: `services/rag/responseGenerator.js` creates prompts that include the query, retrieved context, and domain-specific instructions
2. **LLM Interaction**: The system calls the OpenAI API with the constructed prompt
3. **Response Formatting**: The response is formatted with additional metadata like sources

## Knowledge Management Tools

One of the key enhancements to the chatbot system is the addition of specialized tools for managing the knowledge base. These tools streamline the process of adding, updating, and reindexing content.

### Knowledge CLI

The Knowledge CLI is an interactive command-line tool that helps manage knowledge base content without requiring direct file manipulation or knowledge of the underlying file structure.

#### Features

- Create new knowledge domains
- Add files to existing domains
- Update existing knowledge files
- Reindex the entire knowledge base
- Automatically generate domain handlers and update system components

#### Usage

To use the Knowledge CLI, run:

```powershell
npm run knowledge
```

This will start an interactive session where you can select the operation you want to perform:

```
🧠 Milea Knowledge Management System 🧠
----------------------------------------
What would you like to do?
1. Add a new knowledge domain
2. Add files to an existing domain
3. Update existing knowledge files
4. Reindex the knowledge base
>
```

When adding a new domain, the CLI will:
1. Create the domain folder
2. Create initial content files
3. Create a domain handler in `services/rag/domains/`
4. Update the query classifier to recognize queries for this domain
5. Update the RAG service to route queries to the new handler
6. Create a domain-specific indexing script
7. Run the indexing script to add the domain to the vector database

When updating existing files, the CLI will:
1. Show a list of all files in the knowledge base
2. Open the selected file in your default editor
3. Automatically reindex the appropriate domain when you save changes

### Knowledge Base Watcher

The Knowledge Base Watcher is a file system watcher that monitors the knowledge base directories for changes and automatically reindexes affected content when files are added or modified.

#### Features

- Watches for file changes in real-time
- Automatically identifies the domain for changed files
- Runs domain-specific indexing when files change
- Falls back to full reindexing when needed

#### Usage

To start the knowledge base watcher during development, run:

```powershell
npm run watch-kb
```

This will start the watcher and display:

```
👀 Starting knowledge base file watcher...
📁 Watching directory: /path/to/knowledge
✅ File watcher started. Waiting for changes...
```

When you modify a file, the watcher will automatically detect the change:

```
📝 Detected change in file: wine/reserve-cabernet-franc.md
🔍 File belongs to domain: wine
🔄 Running domain-specific indexing: indexWine.js
...
✅ Successfully reindexed content for changed file: reserve-cabernet-franc.md
```

This makes it much easier to develop and test content changes, as you don't need to manually reindex the knowledge base after each modification.

## Commerce7 Integration

The system integrates with Commerce7 to maintain up-to-date product information:

1. **Authentication**: `utils/commerce7Auth.js` manages Commerce7 API authentication
2. **Product Synchronization**: `scripts/syncCommerce7Products.js` fetches product data and converts it to markdown files
3. **Scheduled Synchronization**: `scripts/scheduledTasks.js` sets up regular synchronization to keep data current

This integration ensures that the chatbot has the latest information about wine availability, pricing, and descriptions.

## Domain-Based Architecture

The system uses a domain-based architecture for handling different types of queries:

1. **Query Classification**: Each query is classified by domain (wine, visiting, club, etc.)
2. **Domain Handlers**: Each domain has a specialized handler in `services/rag/domains/` that knows how to process queries for that domain
3. **Extensible Design**: New domains can be added by creating new handlers and knowledge base directories

This approach allows for specialized processing logic for each domain while maintaining a consistent overall structure.

### Current Domain Handlers

- **wineHandler.js**: Handles wine-specific queries with special handling for specific wines, vintages, and wine types
- **visitingHandler.js**: Processes visiting-related queries including hours, directions, reservations, etc.
- **clubHandler.js**: Manages wine club membership queries
- **merchandiseHandler.js**: Handles non-wine product queries
- **loyaltyHandler.js**: Processes Milea Miles program queries
- **wine_productionHandler.js**: Handles questions about how wine is made
- **generalHandler.js**: Fallback handler for general queries that don't fit a specific domain

## Extending the Knowledge Base

The knowledge base is designed to be easily extensible with new domains. The Knowledge CLI now automates most of this process, but here's how it works behind the scenes:

### 1. Create a New Knowledge Directory

```bash
mkdir knowledge/new-domain
```

### 2. Add Markdown Content Files

Create well-structured markdown files in the new directory. Use consistent headings and formatting for better chunking.

### 3. Create a Domain Handler

Create a new handler in `services/rag/domains/newDomainHandler.js`:

```javascript
// services/rag/domains/newDomainHandler.js
const logger = require('../../../utils/logger');

async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing new domain query: "${query}"`);
    
    // Domain-specific logic here
    
    // Return response or defer to standard response generator
    return {};
  } catch (error) {
    logger.error('Error in new domain handler:', error);
    return {};
  }
}

module.exports = {
  handleQuery
};
```

### 4. Update the Query Classifier

Modify `services/rag/queryClassifier.js` to recognize queries for the new domain:

```javascript
function classifyQuery(query) {
  // Existing classification logic
  
  // Add detection for new domain
  if (query.includes('new domain term 1') || query.includes('new domain term 2')) {
    return {
      type: 'new-domain',
      subtype: 'general'
    };
  }
  
  // Fallback to general
  return {
    type: 'general',
    subtype: 'general'
  };
}
```

### 5. Register the Handler in RAG Service

Update `services/rag/ragService.js` to use the new handler:

```javascript
const newDomainHandler = require('./domains/newDomainHandler');

// In the switch statement inside generateRAGResponse:
switch (queryInfo.type) {
  // Existing cases
  case 'new-domain':
    responseData = await newDomainHandler.handleQuery(query, queryInfo, context);
    break;
  default:
    responseData = await generalHandler.handleQuery(query, queryInfo, context);
}
```

### 6. Create an Indexing Script

Create a domain-specific indexing script in `scripts/indexNewDomain.js` to process and index the new content.

## Deployment Guide

The Milea chatbot can be deployed to various environments. Here's a guide for production deployment:

### Option 1: Traditional Server Deployment

#### 1. Server Requirements

- Node.js 16+ installed
- At least 2GB RAM, recommended 4GB
- 20GB storage minimum

#### 2. Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/milea-chatbot.git
   cd milea-chatbot
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with production settings
   ```

4. Run ChromaDB:
   ```bash
   docker run -d -p 8000:8000 chromadb/chroma
   ```
   
   Or for persistence:
   ```bash
   docker run -d -p 8000:8000 -v $(pwd)/chroma_data:/chroma/chroma chromadb/chroma
   ```

5. Initialize the knowledge base:
   ```bash
   npm run init-kb
   ```

6. Start the server:
   ```bash
   # For production with PM2
   npm install -g pm2
   pm2 start server.js --name milea-chatbot
   
   # Or using Node directly
   node server.js
   ```

7. Set up a reverse proxy (Nginx, Apache) to expose the service.

### Option 2: Docker Deployment

For containerized deployment:

1. Create a Dockerfile:
   ```dockerfile
   FROM node:16
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install --production
   
   COPY . .
   
   EXPOSE 8080
   
   CMD ["node", "server.js"]
   ```

2. Create a docker-compose.yml:
   ```yaml
   version: '3'
   
   services:
     chatbot:
       build: .
       ports:
         - "8080:8080"
       env_file: .env
       depends_on:
         - chromadb
     
     chromadb:
       image: chromadb/chroma
       ports:
         - "8000:8000"
       volumes:
         - ./chroma_data:/chroma/chroma
   ```

3. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Deployment

#### AWS Deployment

1. Create an EC2 instance (t3.medium or larger recommended)
2. Follow the Traditional Server Deployment steps
3. Set up an AWS Application Load Balancer
4. Configure security groups for appropriate access

#### Google Cloud Deployment

1. Create a Google Cloud Run service
2. Deploy the Docker container to Cloud Run
3. Configure environment variables in the Cloud Run service
4. Set up a separate Compute Engine instance for ChromaDB (or use Pinecone)

### Option 4: Serverless Approach

For a more scalable deployment with less management:

1. Backend API
   - Deploy the Express application to a service like AWS Lambda or Google Cloud Functions
   - Use API Gateway to expose the endpoints

2. Vector Database
   - Use a managed vector database service like Pinecone instead of self-hosted ChromaDB
   - Update `utils/vectorStore.js` to use Pinecone instead of ChromaDB

3. Scheduled Tasks
   - Deploy the scheduled tasks as separate cloud functions
   - Trigger them via cloud scheduler services

## Monitoring and Maintenance

### Logging

The system uses a centralized logging system in `utils/logger.js` with different log levels:

- `info`: General information
- `success`: Successful operations
- `warning`: Potential issues
- `error`: Errors
- `auth`: Authentication-related events
- `search`: Search-related events
- `api`: API calls
- `db`: Database operations
- `wine`: Wine-specific operations

In production, consider integrating with a logging service like LogDNA, Loggly, or AWS CloudWatch.

### Scheduled Tasks

The system uses scheduled tasks for:

1. **Product Synchronization**: Updates product information from Commerce7
2. **Knowledge Base Reindexing**: Periodically rebuilds the vector database
3. **Database Maintenance**: Cleans up expired or unused entries

These tasks are configured in `scripts/scheduledTasks.js` using node-cron.

### Performance Monitoring

For production deployments, implement performance monitoring:

1. **Response Times**: Track how long queries take to process
2. **API Usage**: Monitor OpenAI API usage to manage costs
3. **Error Rates**: Track error frequencies by type
4. **User Satisfaction**: Add feedback mechanisms to gauge response quality

### Regular Maintenance Tasks

1. **Commerce7 Sync Check**: Verify that product synchronization is working correctly
2. **RAG Response Quality**: Regularly test with common queries to ensure high-quality responses
3. **Knowledge Base Updates**: Add new information as it becomes available using the Knowledge CLI

## Troubleshooting

### Common Issues

#### Vector Database Connection Issues

**Symptom**: Error connecting to ChromaDB

**Solutions**:
- Verify that ChromaDB is running (`docker ps`)
- Check the ChromaDB connection URL in `.env`
- Restart the ChromaDB container (`docker restart chromadb`)

#### Commerce7 Authentication Failures

**Symptom**: Error fetching products from Commerce7

**Solutions**:
- Verify Commerce7 API credentials in `.env`
- Check if API tokens have expired
- Check Commerce7 API status

#### OpenAI API Issues

**Symptom**: Error generating embeddings or responses

**Solutions**:
- Verify OpenAI API key in `.env`
- Check for rate limiting or quota issues
- Implement retries with exponential backoff

#### Knowledge Base Indexing Problems

**Symptom**: Missing documents in search results

**Solutions**:
- Check that documents are properly formatted
- Verify that indexing ran successfully
- Retry the indexing process using `npm run knowledge` and selecting option 4
- Use the knowledge watcher (`npm run watch-kb`) during development to ensure changes are indexed
- Check ChromaDB collection contents

### Support Resources

- LangChain Documentation: https://js.langchain.com/docs/
- ChromaDB Documentation: https://docs.trychroma.com/
- OpenAI API Documentation: https://platform.openai.com/docs
- Commerce7 API Documentation: https://developer.commerce7.com/docs

## Conclusion

This developer documentation provides a comprehensive overview of the Milea Estate Vineyard Chatbot's architecture, components, and operation. By following the modular, domain-based approach, the system can be easily extended with new knowledge domains and capabilities while maintaining a consistent structure.

The addition of the Knowledge CLI and Knowledge Base Watcher tools significantly streamlines the management of the knowledge base, making it easier for developers and content creators to add and update information without requiring deep technical understanding of the underlying RAG system.

For questions not covered in this documentation, please contact the original development team or refer to the implementation code which contains detailed comments.