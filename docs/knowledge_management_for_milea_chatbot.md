# Knowledge Management Guide for Milea Chatbot

## Overview

This guide provides a step-by-step process for adding new knowledge categories to your chatbot's knowledge base and ensuring the system correctly prioritizes this information when responding to related queries.

## Knowledge Base Structure

The knowledge base should be organized into a clear folder structure:

```
knowledge/
  ├── wine/           # Wine-specific information
  ├── visiting/       # Hours, directions, accommodations
  ├── events/         # Events and special offerings
  ├── club/           # Wine club information
  ├── about/          # Vineyard history and information
  └── merchandise/    # Non-wine products
```

## Adding New Knowledge Categories

### Step 1: Create the Category Folder

1. Navigate to your project's `knowledge` directory
2. Create a new folder with a descriptive name (e.g., `faq`, `sustainability`, etc.)
3. Add relevant markdown files to this folder

### Step 2: Update Content Type Detection

Modify the `documentProcessor.js` file to recognize the new category:

```javascript
// Add this function to documentProcessor.js if it doesn't exist
function detectContentType(filePath) {
  // Extract folder name from the path
  const folderName = path.dirname(filePath).split(path.sep).pop();
  
  // Recognized content types based on folder
  const folderToContentType = {
    'wine': 'wine',
    'visiting': 'visiting',
    'events': 'event',
    'club': 'club',
    'about': 'about',
    'merchandise': 'merchandise'
    // Add your new category here
    // 'your_new_folder': 'your_new_content_type'
  };
  
  // Return the content type based on folder, or fallback to analysis
  if (folderToContentType[folderName]) {
    return folderToContentType[folderName];
  }
  
  // Fallback: Check filename for content type hints
  const filename = path.basename(filePath).toLowerCase();
  if (filename.includes('wine') || filename.includes('tasting')) {
    return 'wine';
  } else if (filename.includes('direction') || filename.includes('hour') || filename.includes('visit')) {
    return 'visiting';
  } else if (filename.includes('event') || filename.includes('special')) {
    return 'event';
  }
  
  // Default content type
  return 'general';
}
```

### Step 3: Update Document Processing

Ensure your document processing code adds content type metadata:

```javascript
// Modify the document processing to include content type
async function processDocuments(filePaths) {
  console.log(`📂 Processing ${filePaths.length} markdown files...`);
  let allChunks = [];

  for (const filePath of filePaths) {
    console.log(`✨ Processing file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Detect content type from the file path
    const contentType = detectContentType(filePath);
    console.log(`🏷️ Detected content type: ${contentType}`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 80,
      separators: ["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""]
    });

    const chunks = await textSplitter.createDocuments(
      [content],
      [{ 
        source: path.basename(filePath),
        contentType: contentType,  // Add content type metadata
        createdAt: new Date().toISOString()
      }]
    );

    console.log(`🧩 Created ${chunks.length} chunks from ${filePath}`);
    allChunks = [...allChunks, ...chunks];
  }

  console.log(`🏁 Total chunks created: ${allChunks.length}`);
  return allChunks;
}
```

### Step 4: Create a Query Classification Function

Add a function to classify user queries by the type of content they're seeking:

```javascript
// Add to queryHelpers.js
function classifyQueryType(query) {
  const queryLower = query.toLowerCase();
  
  // Wine-related queries
  if (isWineQuery(queryLower)) {
    return 'wine';
  }
  
  // Visiting-related queries
  if (isDirectionsQuery(queryLower)) {
    return 'visiting';
  }
  
  // Event-related queries
  if (queryLower.includes('event') || 
      queryLower.includes('special') || 
      queryLower.includes('calendar')) {
    return 'event';
  }
  
  // Club-related queries
  if (queryLower.includes('club') || 
      queryLower.includes('membership') || 
      queryLower.includes('subscribe')) {
    return 'club';
  }
  
  // Add new category detection here
  // if (matchesYourNewCategory(queryLower)) {
  //   return 'your_new_content_type';
  // }
  
  // Default content type
  return 'general';
}

// Helper function for new category
function matchesYourNewCategory(query) {
  // Add terms related to your new category
  const relevantTerms = ['term1', 'term2', 'term3'];
  return relevantTerms.some(term => query.includes(term));
}
```

### Step 5: Create a Script to Index the New Content

Create a script to manually index new content:

```javascript
// scripts/indexNewContent.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');
const logger = require('../utils/logger');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function indexNewContent(folderName) {
  try {
    // Path to the new content folder
    const contentPath = path.join(__dirname, '..', 'knowledge', folderName);
    
    logger.info(`Checking for content in: ${contentPath}`);
    
    // Verify the folder exists
    if (!fs.existsSync(contentPath)) {
      logger.error(`❌ Content folder not found: ${contentPath}`);
      return false;
    }
    
    // Get all markdown files in the folder
    const markdownFiles = fs.readdirSync(contentPath)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(contentPath, file));
    
    if (markdownFiles.length === 0) {
      logger.error(`❌ No markdown files found in: ${contentPath}`);
      return false;
    }
    
    logger.info(`Found ${markdownFiles.length} markdown files in ${folderName}`);
    
    // Process the documents
    logger.info('Processing the documents...');
    const chunks = await processDocuments(markdownFiles);
    logger.info(`Created ${chunks.length} chunks from documents`);
    
    // Generate embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Initialize ChromaDB collection
    logger.info('Connecting to ChromaDB...');
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Add document to the collection
    logger.info('Adding documents to vector store...');
    await vectorStore.addDocuments(chunks);
    
    logger.info(`✅ Successfully indexed ${folderName} content into vector store`);
    return true;
  } catch (error) {
    logger.error(`❌ Error indexing ${folderName} content:`, error);
    return false;
  }
}

// Parse folder name from command line
const folderName = process.argv[2];

if (!folderName) {
  console.error('Please provide a folder name to index. Example: node indexNewContent.js sustainability');
  process.exit(1);
}

// Run the script
indexNewContent(folderName)
  .then(success => {
    if (success) {
      console.log('🏁 Content indexing complete');
    } else {
      console.error('❌ Failed to index content');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
```

### Step 6: Create an All-In-One Knowledge Base Reindexing Script

```javascript
// scripts/reindexKnowledgeBase.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { ChromaClient } = require('chromadb');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');
const logger = require('../utils/logger');

const COLLECTION_NAME = 'milea_vineyard_knowledge';
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '..', 'knowledge');

async function reindexKnowledgeBase() {
  try {
    logger.info('Starting complete knowledge base reindexing...');
    
    // Initialize ChromaDB client
    const client = new ChromaClient({
      path: `http://${process.env.CHROMA_DB_HOST || 'localhost'}:${process.env.CHROMA_DB_PORT || 8000}`
    });
    
    // Reset the collection
    logger.info(`Recreating ChromaDB collection "${COLLECTION_NAME}"...`);
    try {
      await client.deleteCollection({ name: COLLECTION_NAME });
      logger.info(`Deleted existing collection "${COLLECTION_NAME}"`);
    } catch (error) {
      logger.info(`No existing collection "${COLLECTION_NAME}" found, creating new one`);
    }
    
    await client.createCollection({ 
      name: COLLECTION_NAME,
      metadata: {
        description: 'Milea Estate Vineyard Knowledge Base',
        reindexed: new Date().toISOString()
      }
    });
    logger.info(`Created new collection: "${COLLECTION_NAME}"`);
    
    // Find all markdown files in the knowledge base
    const files = glob.sync(path.join(KNOWLEDGE_BASE_DIR, '**/*.md'));
    logger.info(`Found ${files.length} total markdown files in knowledge base`);
    
    // Group files by category folder
    const categories = {};
    files.forEach(file => {
      const relativePath = path.relative(KNOWLEDGE_BASE_DIR, file);
      const category = relativePath.split(path.sep)[0] || 'general';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(file);
    });
    
    // Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Process and add documents by category
    for (const [category, categoryFiles] of Object.entries(categories)) {
      logger.info(`Processing category: ${category} (${categoryFiles.length} files)`);
      
      // Process documents
      const chunks = await processDocuments(categoryFiles);
      logger.info(`Created ${chunks.length} chunks for category ${category}`);
      
      // Add to vector store
      const vectorStore = await Chroma.fromExistingCollection(
        embeddings,
        { collectionName: COLLECTION_NAME }
      );
      
      await vectorStore.addDocuments(chunks);
      logger.info(`✅ Added ${chunks.length} chunks for category ${category}`);
    }
    
    logger.info('✅ Knowledge base reindexing completed successfully');
    return true;
  } catch (error) {
    logger.error('❌ Error reindexing knowledge base:', error);
    return false;
  }
}

// Run the script
reindexKnowledgeBase()
  .then(success => {
    if (success) {
      console.log('🏁 Knowledge base reindexing complete');
    } else {
      console.error('❌ Failed to reindex knowledge base');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
```

## Step-by-Step Workflow for Adding New Content Categories

### 1. Prepare Your Content

1. Create well-structured markdown files that cover the new content category
2. Use clear headings, bullet points, and formatting for better chunking

### 2. Create the Category Folder

```bash
mkdir knowledge/your_new_category
```

### 3. Add Content Files

```bash
cp your_content_files.md knowledge/your_new_category/
```

### 4. Update Query Classification

Add detection for your new category in `queryHelpers.js`:

```javascript
// Add to existing category checks
if (query.includes('term1') || query.includes('term2')) {
  return 'your_new_category';
}
```

### 5. Index the New Content

```bash
node scripts/indexNewContent.js your_new_category
```

### 6. Test the New Category

Create test queries related to the new content category and verify the chatbot responds with the correct information.

## Troubleshooting

### Content Not Found in Responses

1. Verify the content was properly indexed:
   ```bash
   node scripts/testSearch.js "relevant query for your content"
   ```

2. Check query classification:
   ```bash
   node scripts/testQueryClassification.js "relevant query for your content"
   ```

3. Rebuild the entire knowledge base:
   ```bash
   node scripts/reindexKnowledgeBase.js
   ```

### Chrome Vector DB Issues

1. Restart ChromaDB:
   ```bash
   docker restart chromadb
   ```

2. Check ChromaDB logs:
   ```bash
   docker logs chromadb
   ```

## Best Practices

1. **Use Consistent Naming**: Keep folder and file names consistent across your knowledge base
2. **Regular Reindexing**: Reindex your entire knowledge base periodically
3. **Content Testing**: Test new content with sample queries before deployment
4. **Metadata Enrichment**: Add as much metadata as possible to your documents
5. **Category Specificity**: Create specialized categories rather than generic ones

## Maintenance Checklist

- [ ] Monthly full knowledge base reindexing
- [ ] Review query logs to identify missed information
- [ ] Update content categories based on user questions
- [ ] Test content retrieval accuracy periodically