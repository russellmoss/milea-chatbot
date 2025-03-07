# Milea Chatbot Scaling and Deployment Guide

## Table of Contents
- [Modular Knowledge Base Architecture](#modular-knowledge-base-architecture)
  - [Domain Structure](#domain-structure)
  - [Adding New Domains](#adding-new-domains)
  - [Domain Relationship Handling](#domain-relationship-handling)
  - [Scaling Considerations](#scaling-considerations)
- [Production Deployment](#production-deployment)
  - [Infrastructure Requirements](#infrastructure-requirements)
  - [Deployment Options](#deployment-options)
  - [Recommended Production Setup](#recommended-production-setup)
- [Monitoring and Operations](#monitoring-and-operations)
  - [Logging Strategy](#logging-strategy)
  - [Performance Metrics](#performance-metrics)
  - [Alert Configuration](#alert-configuration)
- [Backup and Disaster Recovery](#backup-and-disaster-recovery)

## Modular Knowledge Base Architecture

The Milea Chatbot uses a modular, domain-based architecture that makes it easy to scale the knowledge base while maintaining performance and relevance.

### Domain Structure

The knowledge base is organized into domain-specific directories:

```
knowledge/
├── wine/               # Wine product information
│   ├── wine_red/         # Red wines sub-domain
│   ├── wine_white/       # White wines sub-domain
│   └── wine_rose/        # Rosé wines sub-domain
├── visiting/           # Visiting information
│   ├── hours.md          # Operating hours
│   ├── directions.md     # Getting to the vineyard
│   ├── tastings.md       # Tasting options
│   └── reservations.md   # Reservation information
├── wine club/          # Wine club details
│   ├── membership.md     # Membership tiers
│   ├── benefits.md       # Member benefits
│   └── faq.md            # Frequently asked questions
├── events/             # Event information
├── merchandise/        # Non-wine products
└── about/              # About the vineyard
```

Each domain and sub-domain contains markdown files with relevant information. This structure allows for:

1. **Isolated Content Management**: Each domain can be updated independently without affecting others
2. **Targeted Retrieval**: The system can prioritize documents from the relevant domain
3. **Domain-Specific Processing**: Each domain can have custom logic for handling queries
4. **Easy Scaling**: New domains can be added without reworking existing ones

### Adding New Domains

To add a new knowledge domain to the system:

#### 1. Create Knowledge Base Directory and Files

```bash
# Create domain directory
mkdir -p knowledge/new-domain

# Add markdown files
touch knowledge/new-domain/overview.md
touch knowledge/new-domain/details.md
# etc.
```

Populate the markdown files with well-structured content, using consistent headings and formatting.

#### 2. Create Domain Handler

```javascript
// services/rag/domains/newDomainHandler.js
const logger = require('../../../utils/logger');

/**
 * Handle new domain related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing new domain query: "${query}"`);
    
    // Check for relevant documents
    const hasDomainDocs = context.documents.some(doc => 
      doc.metadata.contentType === 'new-domain'
    );
    
    if (!hasDomainDocs) {
      logger.warning('No new-domain documents found for query');
    }
    
    // Domain-specific processing logic here
    
    // For now, defer to standard response generator
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

#### 3. Update Query Classifier

Add detection for the new domain in `services/rag/queryClassifier.js`:

```javascript
/**
 * Check if a query is related to the new domain
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about the new domain
 */
function isNewDomainQuery(query) {
  // Define keywords specific to this domain
  const newDomainTerms = [
    'keyword1', 'keyword2', 'keyword3', 
    'specific phrase 1', 'specific phrase 2'
  ];
  
  return newDomainTerms.some(term => query.includes(term));
}

// Add to the classifyQuery function
function classifyQuery(query) {
  const queryLower = query.toLowerCase();
  
  // Check existing domains
  // ...
  
  // Check for new domain
  if (isNewDomainQuery(queryLower)) {
    return {
      type: 'new-domain',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }
  
  // Default to general
  // ...
}
```

#### 4. Integrate Handler in RAG Service

Update `services/rag/ragService.js`:

```javascript
// Import the new handler
const newDomainHandler = require('./domains/newDomainHandler');

// Update the switch statement in generateRAGResponse
switch (queryInfo.type) {
  case 'wine':
    responseData = await wineHandler.handleQuery(query, queryInfo, context);
    break;
  // Other existing cases...
  case 'new-domain':
    responseData = await newDomainHandler.handleQuery(query, queryInfo, context);
    break;
  default:
    responseData = await generalHandler.handleQuery(query, queryInfo, context);
}
```

#### 5. Register in the Domains Export

Update `services/rag/index.js`:

```javascript
// Add import
const newDomainHandler = require('./domains/newDomainHandler');

module.exports = {
  // Existing exports...
  
  // Update handlers object
  handlers: {
    wine: wineHandler,
    visiting: visitingHandler,
    club: clubHandler,
    merchandise: merchandiseHandler,
    'new-domain': newDomainHandler,
    general: generalHandler
  }
};
```

#### 6. Document Processing Configuration

Update `utils/documentProcessor.js` to detect the new content type:

```javascript
function detectContentType(filePath) {
  // Extract folder name from the path
  const folderName = path.dirname(filePath).split(path.sep).pop();
  
  // Update folder mapping
  const folderToContentType = {
    'wine': 'wine',
    'visiting': 'visiting',
    'events': 'event',
    'event': 'event',
    'club': 'club',
    'about': 'about',
    'merchandise': 'merchandise',
    'wine club': 'club',
    'new-domain': 'new-domain'  // Add the new mapping
  };
  
  // Rest of function...
}
```

#### 7. Create Indexing Script

Create a script to index the new domain:

```javascript
// scripts/indexNewDomain.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function indexNewDomain() {
  try {
    console.log('🚀 Starting new domain content indexing...');
    
    // Path to the new domain content
    const domainPath = path.join(__dirname, '..', 'knowledge', 'new-domain');
    
    // Find and process markdown files
    const files = fs.readdirSync(domainPath)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(domainPath, file));
      
    // Process documents
    const chunks = await processDocuments(files);
    
    // Generate embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    // Store in vector database
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Add documents to the collection
    await vectorStore.addDocuments(chunks);
    
    console.log(`✅ Successfully indexed ${files.length} new domain documents`);
    return true;
  } catch (error) {
    console.error('❌ Error indexing new domain content:', error);
    return false;
  }
}

// Run the script
indexNewDomain()
  .then(success => {
    if (success) {
      console.log('🏁 New domain indexing complete');
    } else {
      console.error('❌ Failed to index new domain');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
```

#### 8. Test New Domain Handling

Create a testing script to verify that the new domain is working correctly:

```javascript
// scripts/testNewDomain.js
require('dotenv').config();
const { generateRAGResponse } = require('../services/rag/ragService');

// Sample queries for the new domain
const testQueries = [
  "Tell me about the new domain",
  "What information do you have about new domain feature 1?",
  "How does the new domain relate to wine?"
];

async function testNewDomain() {
  console.log('🧪 Testing RAG handling of new domain queries...\n');
  
  for (const query of testQueries) {
    console.log(`📝 Testing query: "${query}"`);
    
    try {
      // Generate response with RAG
      const response = await generateRAGResponse(query);
      
      console.log('\n📄 Generated response:');
      console.log(response.response.substring(0, 200) + '...');
      
      console.log('\n📚 Sources used:');
      console.log(response.sources);
      
      console.log('\n-------------------------------------------\n');
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error processing query "${query}":`, error);
    }
  }
  
  console.log('✅ New domain testing complete!');
}

// Run the test
testNewDomain()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failure:', err);
    process.exit(1);
  });
```

### Domain Relationship Handling

When queries span multiple domains, the system needs strategies to handle these cross-domain relationships:

#### Cross-Domain Relationships

The system can recognize relationships between domains:

- **Wine → Wine Club**: Wine products relate to club membership benefits
- **Events → Visiting**: Event information connects to visiting logistics
- **Merchandise → Wine**: Merchandise can complement wine products

#### Implementing Cross-Domain Awareness

1. **Relationship Definition**

Add relationship mappings in the query processor:

```javascript
// services/rag/utils/domainRelationships.js
const domainRelationships = {
  'wine': ['club', 'merchandise', 'visiting'],
  'club': ['wine', 'events'],
  'visiting': ['events', 'wine'],
  'events': ['visiting', 'club'],
  'merchandise': ['wine'],
  'new-domain': ['wine', 'club'] // Define relationships for new domain
};

/**
 * Get related domains for a given domain
 * @param {string} domain - Primary domain
 * @returns {Array} - Related domains in priority order
 */
function getRelatedDomains(domain) {
  return domainRelationships[domain] || [];
}

module.exports = { getRelatedDomains };
```

2. **Enhanced Context Assembly**

Modify the context assembler to include documents from related domains:

```javascript
// In contextAssembler.js, update the assembleContext function:
const { getRelatedDomains } = require('./utils/domainRelationships');

async function assembleContext(query, queryInfo) {
  // Get primary domain documents
  const primaryDocs = await searchSimilarDocuments(query, determineRetrievalCount(queryInfo));
  
  // Get related domain documents
  const relatedDomains = getRelatedDomains(queryInfo.type);
  let relatedDocs = [];
  
  if (relatedDomains.length > 0) {
    // Get a smaller number of documents from related domains
    for (const relatedDomain of relatedDomains) {
      const docsFromRelatedDomain = await searchSimilarDocuments(
        query, 
        Math.floor(determineRetrievalCount(queryInfo) / 2),
        { contentType: relatedDomain }
      );
      
      relatedDocs = [...relatedDocs, ...docsFromRelatedDomain];
    }
  }
  
  // Combine and process all documents
  const allDocs = [...primaryDocs, ...relatedDocs];
  // Score and filter as before...
}
```

3. **Response Formatting with Cross-Domain Information**

Update the response generator to include cross-domain information when relevant:

```javascript
// In responseGenerator.js, modify the prompt construction:
function constructPrompt(query, queryInfo, contextText, additionalData) {
  // Basic prompt construction...
  
  // Add cross-domain awareness
  if (additionalData.relatedDomains && additionalData.relatedDomains.length > 0) {
    promptTemplate += `
Also consider information from these related areas:
${additionalData.relatedDomains.join(', ')}

When appropriate, include relevant information from these related areas in your response.
`;
  }
  
  // Rest of prompt construction...
}
```

### Scaling Considerations

As the knowledge base grows, several scaling considerations become important:

#### Document Volume Scaling

When your knowledge base grows to thousands of documents:

1. **Chunking Optimization**: Adjust chunk sizes based on domain to balance detail and retrieval performance
2. **Embedding Batching**: Process embeddings in batches to manage API usage and memory
3. **Document Prioritization**: Implement time-based decay for older documents when relevance ranking

#### Vector Database Scaling

For production use with a large knowledge base:

1. **Dedicated ChromaDB Instance**: Move from in-memory to a dedicated ChromaDB server
2. **Pinecone Migration**: For very large knowledge bases, consider migrating to Pinecone
3. **Indexing Optimization**: Use metadata filters to improve search performance

#### API Usage Optimization

Manage OpenAI API costs by:

1. **Caching**: Implement response caching for common queries
2. **Model Selection**: Use smaller models for embedding and classification
3. **Request Batching**: Batch embedding requests to reduce API calls
4. **Context Window Management**: Optimize context window usage to reduce token consumption

#### Example: Pinecone Migration

For larger deployments, consider migrating to Pinecone:

```javascript
// utils/pineconeStore.js
const { PineconeClient } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('langchain/vectorstores/pinecone');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');

async function initializePinecone() {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT
  });
  
  const indexName = process.env.PINECONE_INDEX || 'milea-vineyard';
  const index = client.Index(indexName);
  
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY
  });
  
  return { client, index, embeddings };
}

async function searchPinecone(query, k = 5, filters = {}) {
  const { index, embeddings } = await initializePinecone();
  
  const queryEmbedding = await embeddings.embedQuery(query);
  
  // Prepare filter if present
  const pineconeFilters = {};
  
  if (Object.keys(filters).length > 0) {
    pineconeFilters.metadata = filters;
  }
  
  const results = await index.query({
    vector: queryEmbedding,
    topK: k,
    includeMetadata: true,
    filter: pineconeFilters
  });
  
  return results.matches.map(match => ({
    pageContent: match.metadata.pageContent,
    metadata: {
      source: match.metadata.source,
      contentType: match.metadata.contentType,
      createdAt: match.metadata.createdAt
    },
    score: match.score
  }));
}

module.exports = {
  initializePinecone,
  searchPinecone
};
```

## Production Deployment

Deploying the Milea Chatbot to production requires careful planning around infrastructure, scaling, and monitoring.

### Infrastructure Requirements

For a production deployment, consider these requirements:

#### Compute Resources

- **API Server**: 
  - Minimum: 2 vCPUs, 4GB RAM
  - Recommended: 4 vCPUs, 8GB RAM
  - Storage: At least 20GB SSD

- **Vector Database**:
  - Minimum: 2 vCPUs, 4GB RAM
  - Recommended: 4 vCPUs, 8GB RAM (more for larger knowledge bases)
  - Storage: At least 50GB SSD

#### Networking

- Secured API endpoints with HTTPS
- Rate limiting to prevent abuse
- Internal networking between components
- Firewall rules to restrict access

#### External Dependencies

- OpenAI API access
- Commerce7 API access
- Monitoring services
- DNS configuration for custom domain

### Deployment Options

#### Option 1: AWS Deployment

**Architecture**:
- EC2 instances or ECS containers for the API
- Managed ChromaDB on EC2 or ECS
- Load balancer for traffic distribution
- CloudWatch for monitoring and logs
- Lambda for scheduled tasks

**Deployment Steps**:

1. **Set up VPC and networking**:
   ```bash
   # Create VPC, subnets, and security groups
   aws ec2 create-vpc --cidr-block 10.0.0.0/16
   aws ec2 create-subnet --vpc-id vpc-id --cidr-block 10.0.1.0/24
   aws ec2 create-security-group --group-name MileaChatbotSG --description "Milea Chatbot security group"
   ```

2. **Launch EC2 instances**:
   ```bash
   # Launch API server instance
   aws ec2 run-instances --image-id ami-id --instance-type t3.medium --key-name ssh-key --security-group-ids sg-id
   
   # Launch ChromaDB instance
   aws ec2 run-instances --image-id ami-id --instance-type t3.medium --key-name ssh-key --security-group-ids sg-id
   ```

3. **Set up load balancer**:
   ```bash
   # Create target group
   aws elbv2 create-target-group --name milea-api-targets --protocol HTTP --port 8080 --vpc-id vpc-id
   
   # Create load balancer
   aws elbv2 create-load-balancer --name milea-lb --subnets subnet-id-1 subnet-id-2 --security-groups sg-id
   ```

4. **Configure DNS**:
   ```bash
   # Create DNS record
   aws route53 change-resource-record-sets --hosted-zone-id zone-id --change-batch file://dns-config.json
   ```

5. **Deploy application**:
   ```bash
   # Set up CodeDeploy application
   aws deploy create-application --application-name MileaChatbot
   
   # Create deployment
   aws deploy create-deployment --application-name MileaChatbot --deployment-config-name CodeDeployDefault.OneAtATime --deployment-group-name MileaDeployGroup
   ```

#### Option 2: Kubernetes Deployment

**Architecture**:
- Kubernetes cluster (EKS, GKE, or AKS)
- API pods with auto-scaling
- ChromaDB StatefulSet
- Ingress for traffic management
- Horizontal Pod Autoscaler for scaling

**Kubernetes Manifests**:

1. **API Deployment & Service**:
   ```yaml
   # milea-api-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: milea-api
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: milea-api
     template:
       metadata:
         labels:
           app: milea-api
       spec:
         containers:
         - name: milea-api
           image: your-registry/milea-chatbot:latest
           ports:
           - containerPort: 8080
           env:
           - name: OPENAI_API_KEY
             valueFrom:
               secretKeyRef:
                 name: milea-secrets
                 key: openai-key
           - name: CHROMA_DB_HOST
             value: milea-chromadb
           resources:
             requests:
               memory: "2Gi"
               cpu: "1"
             limits:
               memory: "4Gi"
               cpu: "2"
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: milea-api-service
   spec:
     selector:
       app: milea-api
     ports:
     - port: 80
       targetPort: 8080
     type: ClusterIP
   ```

2. **ChromaDB StatefulSet**:
   ```yaml
   # chromadb-statefulset.yaml
   apiVersion: apps/v1
   kind: StatefulSet
   metadata:
     name: milea-chromadb
   spec:
     serviceName: "milea-chromadb"
     replicas: 1
     selector:
       matchLabels:
         app: chromadb
     template:
       metadata:
         labels:
           app: chromadb
       spec:
         containers:
         - name: chromadb
           image: chromadb/chroma:latest
           ports:
           - containerPort: 8000
           volumeMounts:
           - name: chroma-data
             mountPath: /chroma/chroma
           resources:
             requests:
               memory: "2Gi"
               cpu: "1"
             limits:
               memory: "4Gi"
               cpu: "2"
     volumeClaimTemplates:
     - metadata:
         name: chroma-data
       spec:
         accessModes: [ "ReadWriteOnce" ]
         resources:
           requests:
             storage: 20Gi
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: milea-chromadb
   spec:
     selector:
       app: chromadb
     ports:
     - port: 8000
       targetPort: 8000
     type: ClusterIP
   ```

3. **Ingress Controller**:
   ```yaml
   # milea-ingress.yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: milea-ingress
     annotations:
       kubernetes.io/ingress.class: nginx
       cert-manager.io/cluster-issuer: letsencrypt-prod
   spec:
     tls:
     - hosts:
       - chatbot.mileaestatevineyard.com
       secretName: milea-tls
     rules:
     - host: chatbot.mileaestatevineyard.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: milea-api-service
               port:
                 number: 80
   ```

4. **Secrets Management**:
   ```yaml
   # milea-secrets.yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: milea-secrets
   type: Opaque
   data:
     openai-key: <base64-encoded-key>
     commerce7-app-id: <base64-encoded-id>
     commerce7-secret-key: <base64-encoded-key>
     commerce7-tenant-id: <base64-encoded-id>
   ```

5. **Cronjob for Scheduled Tasks**:
   ```yaml
   # milea-cronjob.yaml
   apiVersion: batch/v1
   kind: CronJob
   metadata:
     name: milea-product-sync
   spec:
     schedule: "0 2 * * *"
     jobTemplate:
       spec:
         template:
           spec:
             containers:
             - name: product-sync
               image: your-registry/milea-chatbot:latest
               command: ["node", "scripts/syncCommerce7Products.js"]
               env:
               - name: OPENAI_API_KEY
                 valueFrom:
                   secretKeyRef:
                     name: milea-secrets
                     key: openai-key
               # Other environment variables...
             restartPolicy: OnFailure
   ```

### Recommended Production Setup

For the Milea Estate Vineyard Chatbot, we recommend:

#### Infrastructure Choice

**Managed Kubernetes on AWS (EKS)**:
- Scalable and reliable infrastructure
- Automates deployment and management
- Integrated with AWS services
- Supports stateful applications like ChromaDB

#### Vector Database

**Dedicated Pinecone Instance**:
- Built for production vector search
- Managed service with high availability
- Optimized for performance at scale
- Metadata filtering for efficient retrieval

#### CI/CD Pipeline

**GitHub Actions to AWS EKS**:
- Automated testing on pull requests
- Container building on main branch
- Deployment to staging environment
- Manual promotion to production
- Rollback capability

#### Example CI/CD Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Milea Chatbot

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test

  build_and_push:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    - name: Build and push Docker image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: milea-chatbot
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

  deploy:
    needs: build_and_push
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    - name: Update kube config
      run: aws eks update-kubeconfig --name milea-cluster --region us-east-1
    - name: Deploy to EKS
      run: |
        kubectl set image deployment/milea-api milea-api=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        kubectl rollout status deployment/milea-api
```

## Monitoring and Operations

### Logging Strategy

Implement comprehensive logging:

1. **Application Logs**:
   - Use structured JSON logging
   - Include correlation IDs for tracing requests
   - Log all API interactions and errors
   - Store logs in CloudWatch or similar service

2. **Query Logs**:
   - Log all user queries
   - Track query classifications
   - Record response times
   - Store context retrieval information

3. **Vector Store Logs**:
   - Log embedding generation
   - Track document indexing
   - Monitor similarity search performance

### Performance Metrics

Set up key performance indicators:

1. **Response Time Metrics**:
   - Overall query-to-response time
   - Context retrieval time
   - LLM processing time
   - Network latency

2. **Quality Metrics**:
   - User satisfaction ratings
   - Context relevance scores
   - Source attribution accuracy
   - Query classification accuracy

3. **API Usage Metrics**:
   - OpenAI API calls by type
   - Token usage by query
   - Cost per query
   - Rate limit proximity

### Alert Configuration

Set up alerts for critical issues:

1. **System Health Alerts**:
   - CPU/Memory usage above 80%
   - API error rate above 5%
   - Response time above 5 seconds
   - Service unavailability

2. **Business Impact Alerts**:
   - High user dissatisfaction ratings
   - Unusually high traffic
   - Commerce7 synchronization failures
   - API cost threshold exceeded

## Backup and Disaster Recovery

### Data Backup

Implement regular backups:

1. **Vector Database Backup**:
   - Daily snapshot of ChromaDB/Pinecone data
   - Store backups in S3 or similar
   - Retain backups for 30 days
   - Test restoration quarterly

2. **Knowledge Base Backup**:
   - Version control for markdown files
   - Automated backup of any dynamically generated content
   - Documentation on regenerating embeddings

### Disaster Recovery

Plan for potential failures:

1. **Single Component Failure**:
   - Redundant deployments in multiple availability zones
   - Automatic failover for API servers
   - Health checks with automated restart

2. **Complete Outage Recovery**:
   - Documented restoration procedures
   - Regular disaster recovery drills
   - Backup API keys and credentials in secure storage
   - Runbooks for different failure scenarios

3. **Recovery Time Objectives**:
   - API service: < 5 minutes
   - Vector database: < 30 minutes
   - Full knowledge base rebuild: < 4 hours
```