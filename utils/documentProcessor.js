const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

/**
 * Process documents in batches for better performance
 * @param {Array} filePaths - Array of file paths to process
 * @returns {Promise<Array>} - Array of document chunks
 */
async function processDocuments(filePaths) {
  console.log(`📂 Processing ${filePaths.length} markdown files...`);

  let allChunks = [];
  
  // Process documents in batches for better throughput
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} files)...`);
    
    const batchPromises = batch.map(async (filePath) => {
      console.log(`✨ Processing file: ${filePath}`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Detect content type based on folder and filename
        const contentType = detectContentType(filePath);
        console.log(`🏷️ Detected content type: ${contentType}`);

        // Get appropriate chunk parameters based on content type
        const { chunkSize, chunkOverlap } = getChunkParameters(contentType);

        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
          separators: ["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""]
        });

        const chunks = await textSplitter.createDocuments(
          [content],
          [{ 
            source: path.basename(filePath),
            contentType, // Add content type metadata
            createdAt: new Date().toISOString()
          }]
        );

        console.log(`🧩 Created ${chunks.length} chunks from ${filePath} with size ${chunkSize}/${chunkOverlap}`);
        return chunks;
      } catch (error) {
        console.error(`❌ Error processing file ${filePath}:`, error);
        return []; // Return empty array on error
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    allChunks = [...allChunks, ...batchResults.flat()];
    
    console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} complete`);
  }

  console.log(`🏁 Total chunks created: ${allChunks.length}`);
  return allChunks;
}

/**
 * Detect content type based on file path
 * @param {string} filePath - Path to the file
 * @returns {string} - Content type
 */
function detectContentType(filePath) {
  // Extract folder name from the path
  const folderName = path.dirname(filePath).split(path.sep).pop();
  
  // Recognized content types based on folder
  const folderToContentType = {
    'sustainability': 'sustainability',
    'wine_production': 'wine_production',
    'wine': 'wine',
    'visiting': 'visiting',
    'events': 'event',
    'event': 'event',
    'club': 'club',
    'about': 'about',
    'merchandise': 'merchandise',
    'wine club': 'club',
    'milea_miles': 'loyalty', 
    'loyalty': 'loyalty' // And this one as a fallback
  };
  
  // Return the content type based on folder, or fallback to analysis
  if (folderToContentType[folderName]) {
    return folderToContentType[folderName];
  }
  
  // Fallback: Check filename for content type hints
  const filename = path.basename(filePath).toLowerCase();

   if (filename.includes('milea-miles') || 
      filename.includes('miles') || 
      filename.includes('loyalty') || 
      filename.includes('rewards')) {
    return 'loyalty';
  }
  if (filename.includes('wine') || filename.includes('tasting')) {
    return 'wine';
  } else if (
    filename.includes('direction') || 
    filename.includes('hour') || 
    filename.includes('visit') || 
    filename.includes('reservation') ||
    filename.includes('accommodations')
  ) {
    return 'visiting';
  } else if (filename.includes('event') || filename.includes('special')) {
    return 'event';
  } else if (filename.includes('club') || filename.includes('membership')) {
    return 'club';
  }
  
  // Default content type
  return 'general';
}

/**
 * Get chunk parameters based on content type
 * @param {string} contentType - Type of content
 * @returns {Object} - Chunk size and overlap parameters
 */
function getChunkParameters(contentType) {
  switch (contentType) {
    case 'wine':
      return { chunkSize: 500, chunkOverlap: 50 };
    case 'visiting':
      return { chunkSize: 700, chunkOverlap: 70 }; // Larger chunks for visiting information
    case 'event':
      return { chunkSize: 500, chunkOverlap: 50 };
    case 'club':
      return { chunkSize: 700, chunkOverlap: 70 };
    default:
      return { chunkSize: 800, chunkOverlap: 80 };
  }
}

module.exports = { processDocuments };