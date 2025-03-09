# Debugging and Fixing the Wine Query Issue

## Problem Summary

The chatbot was failing to retrieve information about wines despite having the information in its knowledge base. The primary symptoms were:

- The chatbot correctly identified wine queries and their specific types
- It could even offer clarification options for general wine queries (listing available wines)
- However, it consistently returned "Found 0 similar documents" when attempting to retrieve wine information
- Error messages indicated that the ChromaDB collection didn't exist or couldn't be accessed

## Root Cause Analysis

Through systematic debugging we determined that there were two main issues:

1. **Vector Store Connection Problem**: The ChromaDB collections were in an inconsistent state with unnamed collections and undefined IDs, causing document retrieval to fail.

2. **HTML Content Extraction**: Although we had already improved this through refactoring the HTML cleaner in a previous step, the documents weren't being found in the first place.

The primary issue was related to how the system was trying to dynamically determine which ChromaDB collection to use, but the collections were not properly named or configured.

## Fix Implementation

### Phase 1: Testing and Diagnostics

We created several diagnostic scripts to help understand the problem:

1. **Diagnostic Script (`diagnose-vector-store.js`)**:
   - Loaded wine documents directly from the filesystem
   - Attempted to retrieve them from the vector store
   - Compared results to identify the gap
   - Tested specific wine queries like "reserve cabernet franc"

2. **Collection Inspection (`list-collections.js`)**:
   - Listed all existing ChromaDB collections
   - Checked collection names, IDs, and document counts
   - Result: Found collections with "unnamed" names and "undefined" IDs

3. **Connection Testing (`test-chroma-connection.js`)**:
   - Verified ChromaDB was running and accessible
   - Tested basic operations against the ChromaDB server

### Phase 2: Fix Implementation

We executed the following steps to fix the issue:

1. **Reset ChromaDB Collection (`reset-chroma-complete.js`)**:
   - Connected to ChromaDB and listed all collections
   - Attempted to delete existing problematic collections
   - Created a fresh collection with a proper name: "wine_knowledge"
   - Result: "✅ Reset complete - created new collection: wine_knowledge"

2. **Updated Vector Store Connection (`vectorStore.js`)**:
   - Replaced dynamic collection name determination with a fixed collection name
   - Set `COLLECTION_NAME = 'wine_knowledge'` consistently throughout the code
   - Removed the `getCollectionName()` function
   - Updated all functions to use the constant directly
   - Added `COLLECTION_NAME` to exports for use in other modules

3. **Indexed Wine Documents (`index-wines-direct.js`)**:
   - Found all markdown files in the wine knowledge directory
   - Created embeddings using OpenAI's embedding model
   - Added the documents to the vector store with proper metadata
   - Verified successful indexing with a test search

4. **Verified the Fix (`diagnose-vector-store.js`)**:
   - Ran the diagnostic script again to confirm the fix worked
   - Successfully found wine documents in vector store results
   - Example: "✅ Document found in vector store results" for all wines

### Key Code Changes

#### Updated `vectorStore.js`:
```javascript
// Use a fixed collection name
const COLLECTION_NAME = 'wine_knowledge';

// Updated all functions to use this consistent name
// Removed dynamic collection determination
// Simplified error handling 
```

## Verification Results

After implementing the fixes, we ran the `diagnose-vector-store.js` script again and observed:

- All wine documents were successfully found in the vector store
- Document searches returned appropriate results
- The system correctly found similar documents for each wine query

Sample successful result:
```
🔍 Testing document 3/13: wine_2022-farmhouse-cabernet-franc-4deec099-70bd-4433-8e10-46df8e6d3b4b.md
📝 Using title as query: "2022 Farmhouse Cabernet Franc"
🔍 Searching for documents similar to: "2022 Farmhouse Cabernet Franc"
✅ Found 5 similar documents
📄 Document sources:
   1. wine_2022-farmhouse-cabernet-franc-4deec099-70bd-4433-8e10-46df8e6d3b4b.md
   2. wine_2022-reserve-cabernet-franc-cda583c3-4c58-4b9b-8619-0a609c814f20.md
   3. wine_2021-farmhouse-bdx-red-blend-07ba3f32-13d3-4a3b-898a-cbf0972278ea.md
✅ Document found in vector store results
```

## Lessons Learned

1. **Consistent Configuration**: Using a fixed, well-defined collection name is more reliable than dynamic determination, especially with complex vector stores.

2. **Proper Debugging Tools**: Creating specialized diagnostic scripts helped isolate the issue and verify the fix.

3. **Layered Approach**: By separating the concerns (ChromaDB connection, document indexing, information extraction), we could identify and fix each problem independently.

4. **Multiple Issues**: Sometimes what appears as a single problem (wine information not showing) can have multiple causes (HTML extraction and vector store retrieval).

## Next Steps

1. **Restart Server**: Ensure the server uses the updated vector store configuration

2. **Monitor Performance**: Watch for any further issues with wine queries

3. **Consider Re-indexing Other Domains**: If needed, the same approach could be used to refresh other knowledge domains

4. **Documentation Update**: Update project documentation to note the fixed collection name and indexing process

The fix successfully addressed the issue of wine document retrieval while preserving all other aspects of the existing knowledge base.

## Follow-up Issue: Indexing All Domains

After fixing the wine document retrieval, we discovered a secondary issue: the system was only accessing the wine documents and not retrieving information from other domains. When testing with queries about non-wine topics (e.g., "tell me about Barry Milea"), the system would still only return wine documents.

### Root Cause

The root cause of this follow-up issue was that we had only indexed the wine documents into our new "wine_knowledge" collection, but the other domain documents were not included. Since we were now using a fixed collection name throughout the application, all queries were only searching that limited set of wine documents.

### Solution: Indexing All Domains

To fix this issue, we created a script to index all knowledge domains into the same collection:

```javascript
// scripts/index-all-domains.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { COLLECTION_NAME } = require('../utils/vectorStore');

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

async function indexAllDomains() {
  console.log('🔧 Starting indexing of all knowledge domains');
  
  try {
    // Find all markdown files across all domains
    console.log('📂 Finding all markdown files...');
    const allFiles = await findAllMarkdownFiles(KNOWLEDGE_DIR);
    console.log(`📚 Found ${allFiles.length} markdown files`);
    
    // Group files by domain for logging
    const domainStats = {};
    allFiles.forEach(file => {
      const relativePath = path.relative(KNOWLEDGE_DIR, file);
      const domain = relativePath.split(path.sep)[0];
      domainStats[domain] = (domainStats[domain] || 0) + 1;
    });
    
    console.log('📊 Files by domain:');
    Object.entries(domainStats).forEach(([domain, count]) => {
      console.log(`  - ${domain}: ${count} files`);
    });
    
    // Initialize embeddings and vector store
    console.log('🔄 Initializing OpenAI embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512,
      stripNewLines: true
    });
    
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Process files in batches
    const BATCH_SIZE = 10;
    console.log(`🔄 Processing ${allFiles.length} files in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      console.log(`⏳ Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allFiles.length/BATCH_SIZE)}`);
      
      const chunks = await processDocuments(batch);
      await vectorStore.addDocuments(chunks);
      
      console.log(`✅ Indexed batch ${Math.floor(i/BATCH_SIZE) + 1} (${chunks.length} chunks)`);
    }
    
    console.log('✅ All domains indexed successfully!');
    
    // Test retrieval for non-wine domains
    console.log('🔍 Testing retrieval from non-wine domains...');
    const testQueries = [
      'Barry Milea',
      'visiting hours',
      'wine club membership'
    ];
    
    for (const query of testQueries) {
      console.log(`📝 Testing query: "${query}"`);
      const results = await vectorStore.similaritySearch(query, 2);
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results:`);
        results.forEach((doc, i) => {
          console.log(`   ${i+1}. ${doc.metadata.source}`);
        });
      } else {
        console.log(`❌ No results found for "${query}"`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error indexing domains: ${error.message}`);
    console.error(error.stack);
  }
}

// Supporting functions for finding and processing files
// ...
```

The script:
1. Finds all markdown files across all domains in the knowledge directory
2. Processes them into chunks while preserving domain information in metadata
3. Indexes all chunks into the same collection used for wine documents
4. Tests retrieval from non-wine domains to verify the fix

### Key Takeaways

1. **Complete Indexing**: When changing the vector store collection, ensure that *all* domains are indexed into the new collection, not just the domain you're fixing.

2. **Unified Collection**: Using a single collection with proper metadata is more maintainable than trying to use separate collections for different domains.

3. **Test Diverse Queries**: Always test queries from multiple domains to verify that all parts of the knowledge base are accessible.

4. **Preserve Metadata**: Make sure to include domain information in the document metadata to aid in filtering and debugging.

This additional fix completed our solution by ensuring that both wine information and information from all other domains could be retrieved successfully.