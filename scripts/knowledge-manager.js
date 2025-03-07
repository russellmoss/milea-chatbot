// scripts/knowledge-manager.js
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🧠 Milea Knowledge Management System 🧠');
  console.log('----------------------------------------');
  
  const action = await promptUser(
    'What would you like to do?\n' +
    '1. Add a new knowledge domain\n' +
    '2. Add files to an existing domain\n' +
    '3. Update existing knowledge files\n' +
    '4. Reindex the knowledge base\n' +
    '> '
  );
  
  switch(action) {
    case '1':
      await addNewDomain();
      break;
    case '2':
      await addFilesToDomain();
      break;
    case '3':
      await updateExistingFiles();
      break;
    case '4':
      await reindexKnowledgeBase();
      break;
    default:
      console.log('Invalid option. Exiting.');
  }
  
  rl.close();
}

async function promptUser(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function addNewDomain() {
  const domainName = await promptUser('Enter the new domain name (e.g., "special_events"): ');
  const domainDisplayName = domainName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  try {
    // 1. Create the domain directory
    const domainPath = path.join(__dirname, '..', 'knowledge', domainName);
    await fs.mkdir(domainPath, { recursive: true });
    console.log(`✅ Created domain directory: ${domainPath}`);
    
    // 2. Create an initial markdown file
    const initialFileName = await promptUser('Enter the initial file name (e.g., "overview.md"): ');
    const filePath = path.join(domainPath, initialFileName);
    
    const fileContent = `# ${domainDisplayName}\n\n## Overview\n\nThis document provides information about ${domainDisplayName.toLowerCase()} at Milea Estate Vineyard.\n\n## Details\n\n[Add content here]\n`;
    
    await fs.writeFile(filePath, fileContent);
    console.log(`✅ Created initial file: ${filePath}`);
    
    // 3. Create domain handler file
    await createDomainHandler(domainName);
    
    // 4. Update queryClassifier.js
    await updateQueryClassifier(domainName, domainDisplayName);
    
    // 5. Update RAG service
    await updateRagService(domainName);
    
    // 6. Update documentProcessor.js
    await updateDocumentProcessor(domainName);
    
    // 7. Create indexing script for the new domain
    await createIndexingScript(domainName, domainDisplayName);
    
    // 8. Run the indexing script
    console.log(`🔄 Indexing new domain: ${domainName}...`);
    execSync(`node scripts/index${toCamelCase(domainName)}.js`, { stdio: 'inherit' });
    
    console.log(`\n✅ Domain "${domainName}" has been successfully added and indexed!`);
    
  } catch (error) {
    console.error('❌ Error adding new domain:', error);
  }
}

async function addFilesToDomain() {
  try {
    // List existing domains
    const knowledgePath = path.join(__dirname, '..', 'knowledge');
    const domains = await fs.readdir(knowledgePath);
    
    console.log('Existing domains:');
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain}`);
    });
    
    const domainIndex = parseInt(await promptUser('Select domain (number): ')) - 1;
    if (domainIndex < 0 || domainIndex >= domains.length) {
      console.log('Invalid domain selection');
      return;
    }
    
    const selectedDomain = domains[domainIndex];
    const domainPath = path.join(knowledgePath, selectedDomain);
    
    // Get file details
    const fileName = await promptUser('Enter the new file name (e.g., "details.md"): ');
    const filePath = path.join(domainPath, fileName);
    
    const domainDisplayName = selectedDomain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Create file template
    const fileContent = `# ${path.basename(fileName, '.md').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n## Overview\n\nThis document provides additional information about ${domainDisplayName.toLowerCase()}.\n\n## Details\n\n[Add content here]\n`;
    
    await fs.writeFile(filePath, fileContent);
    console.log(`✅ Created new file: ${filePath}`);
    
    // Reindex the domain
    console.log(`🔄 Reindexing domain: ${selectedDomain}...`);
    execSync(`node scripts/index${toCamelCase(selectedDomain)}.js`, { stdio: 'inherit' });
    
    console.log(`\n✅ File "${fileName}" has been added to domain "${selectedDomain}" and indexed!`);
    
  } catch (error) {
    console.error('❌ Error adding file to domain:', error);
  }
}

async function updateExistingFiles() {
  try {
    // Find all markdown files in the knowledge base
    const knowledgePath = path.join(__dirname, '..', 'knowledge');
    const allMarkdownFiles = await findAllMarkdownFiles(knowledgePath);
    
    console.log('Existing files:');
    allMarkdownFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${path.relative(knowledgePath, file)}`);
    });
    
    const fileIndex = parseInt(await promptUser('Select file to update (number): ')) - 1;
    if (fileIndex < 0 || fileIndex >= allMarkdownFiles.length) {
      console.log('Invalid file selection');
      return;
    }
    
    const selectedFile = allMarkdownFiles[fileIndex];
    console.log(`\nOpening ${selectedFile} in your default editor. Save and close when done.`);
    
    // Open the file in the default editor
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      execSync(`notepad "${selectedFile}"`);
    } else {
      // For macOS/Linux, try to use EDITOR env var, fallback to vi
      const editor = process.env.EDITOR || 'vi';
      execSync(`${editor} "${selectedFile}"`, { stdio: 'inherit' });
    }
    
    console.log(`\n✅ File updated: ${selectedFile}`);
    
    // Determine which domain this file belongs to
    const relativePath = path.relative(knowledgePath, selectedFile);
    const domain = relativePath.split(path.sep)[0];
    
    // Reindex the domain
    console.log(`🔄 Reindexing domain: ${domain}...`);
    
    // Check if domain-specific indexing script exists
    const indexScript = `index${toCamelCase(domain)}.js`;
    const indexScriptPath = path.join(__dirname, indexScript);
    
    try {
      await fs.access(indexScriptPath);
      execSync(`node scripts/${indexScript}`, { stdio: 'inherit' });
    } catch (error) {
      // Fallback to full knowledge base reindexing
      console.log(`Domain-specific indexing script not found. Reindexing entire knowledge base...`);
      execSync(`node scripts/initializeKnowledgeBase.js`, { stdio: 'inherit' });
    }
    
    console.log(`\n✅ File "${selectedFile}" has been updated and reindexed!`);
    
  } catch (error) {
    console.error('❌ Error updating file:', error);
  }
}

async function reindexKnowledgeBase() {
  try {
    console.log('🔄 Reindexing entire knowledge base...');
    execSync('node scripts/initializeKnowledgeBase.js', { stdio: 'inherit' });
    console.log('\n✅ Knowledge base reindexed successfully!');
  } catch (error) {
    console.error('❌ Error reindexing knowledge base:', error);
  }
}

async function createDomainHandler(domainName) {
  const handlerPath = path.join(__dirname, '..', 'services', 'rag', 'domains', `${domainName}Handler.js`);
  
  const handlerContent = `// services/rag/domains/${domainName}Handler.js
const logger = require('../../../utils/logger');

/**
 * Handle ${domainName.replace(/_/g, ' ')} related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(\`Processing ${domainName.replace(/_/g, ' ')} query: "\${query}"\`);
    
    // Check if we have domain-specific documents
    const hasDomainDocs = context.documents.some(doc => 
      doc.metadata.source.toLowerCase().includes('${domainName}') ||
      doc.metadata.contentType === '${domainName}'
    );
    
    if (!hasDomainDocs) {
      logger.warning('No ${domainName.replace(/_/g, ' ')}-specific documents found for query');
    }
    
    // For now, defer to the standard response generator
    return {};
  } catch (error) {
    logger.error('Error in ${domainName} handler:', error);
    return {};
  }
}

module.exports = {
  handleQuery
};`;

  await fs.writeFile(handlerPath, handlerContent);
  console.log(`✅ Created domain handler: ${handlerPath}`);
}

async function updateQueryClassifier(domainName, domainDisplayName) {
  const queryClassifierPath = path.join(__dirname, '..', 'services', 'rag', 'queryClassifier.js');
  
  // Read the current file
  const content = await fs.readFile(queryClassifierPath, 'utf8');
  
  // Create function to check for domain queries
  const functionName = `is${toCamelCase(domainName)}Query`;
  const functionContent = `
/**
 * Check if a query is ${domainName.replace(/_/g, ' ')} related
 * @param {string} query - Lowercase user query
 * @returns {boolean} - Whether the query is about ${domainName.replace(/_/g, ' ')}
 */
function ${functionName}(query) {
  // Common terms related to ${domainName.replace(/_/g, ' ')}
  const ${domainName}Terms = [
    '${domainName.replace(/_/g, ' ')}', '${domainDisplayName.toLowerCase()}', 
    // Add more relevant terms here
  ];
  
  return ${domainName}Terms.some(term => query.includes(term));
}`;

  // Add the function to the file
  const updatedContent = content.replace(
    'module.exports = {',
    `${functionContent}\n\nmodule.exports = {`
  );
  
  // Add the function to the exports
  const finalContent = updatedContent.replace(
    'module.exports = {',
    `module.exports = {\n  ${functionName},`
  );
  
  // Update the classifyQuery function to check for the new domain
  const domainCheckCode = `
  // Check if this is a ${domainName.replace(/_/g, ' ')} related query
  if (${functionName}(queryLower)) {
    logger.info(\`${domainDisplayName} query detected: "\${query}"\`);
    return {
      type: '${domainName}',
      subtype: 'general',
      isSpecificWine: false,
      wineTerms: []
    };
  }`;
  
  // Insert the check after the wine club check
  const classifyQueryUpdated = finalContent.replace(
    `// Check if this is a visiting-related query`,
    `${domainCheckCode}\n\n  // Check if this is a visiting-related query`
  );
  
  await fs.writeFile(queryClassifierPath, classifyQueryUpdated);
  console.log(`✅ Updated query classifier: ${queryClassifierPath}`);
}

async function updateRagService(domainName) {
  const ragServicePath = path.join(__dirname, '..', 'services', 'rag', 'ragService.js');
  
  // Read the current file
  const content = await fs.readFile(ragServicePath, 'utf8');
  
  // Add import for the new handler
  const handlerImport = `const ${domainName}Handler = require('./domains/${domainName}Handler');`;
  const updatedImports = content.replace(
    `const generalHandler = require('./domains/generalHandler');`,
    `const generalHandler = require('./domains/generalHandler');\n${handlerImport}`
  );
  
  // Add case for the new handler in switch statement
  const caseStatement = `    case '${domainName}':\n      responseData = await ${domainName}Handler.handleQuery(query, queryInfo, context);\n      break;`;
  const updatedSwitch = updatedImports.replace(
    `    default:\n      responseData = await generalHandler.handleQuery(query, queryInfo, context);`,
    `    case '${domainName}':\n      responseData = await ${domainName}Handler.handleQuery(query, queryInfo, context);\n      break;\n    default:\n      responseData = await generalHandler.handleQuery(query, queryInfo, context);`
  );
  
  await fs.writeFile(ragServicePath, updatedSwitch);
  console.log(`✅ Updated RAG service: ${ragServicePath}`);
}

async function updateDocumentProcessor(domainName) {
  const documentProcessorPath = path.join(__dirname, '..', 'utils', 'documentProcessor.js');
  
  // Read the current file
  const content = await fs.readFile(documentProcessorPath, 'utf8');
  
  // Update folder to content type mapping
  const folderMappingUpdated = content.replace(
    `const folderToContentType = {`,
    `const folderToContentType = {\n    '${domainName}': '${domainName}',`
  );
  
  await fs.writeFile(documentProcessorPath, folderMappingUpdated);
  console.log(`✅ Updated document processor: ${documentProcessorPath}`);
}

async function createIndexingScript(domainName, domainDisplayName) {
  const scriptPath = path.join(__dirname, `index${toCamelCase(domainName)}.js`);
  
  const scriptContent = `// scripts/index${toCamelCase(domainName)}.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { processDocuments } = require('../utils/documentProcessor');

const COLLECTION_NAME = 'milea_vineyard_knowledge';

async function index${toCamelCase(domainName)}() {
  try {
    console.log('🔄 Starting ${domainDisplayName} content indexing...');
    
    // Path to the ${domainDisplayName} content folder
    const contentPath = path.join(__dirname, '..', 'knowledge', '${domainName}');
    
    console.log(\`📂 Checking for content in: \${contentPath}\`);
    
    // Verify the folder exists
    if (!fs.existsSync(contentPath)) {
      console.error(\`❌ ${domainDisplayName} folder not found: \${contentPath}\`);
      return false;
    }
    
    // Get all markdown files in the folder
    const markdownFiles = fs.readdirSync(contentPath)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(contentPath, file));
    
    if (markdownFiles.length === 0) {
      console.error(\`❌ No markdown files found in: \${contentPath}\`);
      return false;
    }
    
    console.log(\`📄 Found \${markdownFiles.length} markdown files in ${domainDisplayName} folder\`);
    markdownFiles.forEach(file => console.log(\`   - \${path.basename(file)}\`));
    
    // Process the documents
    console.log('🔄 Processing the documents...');
    const chunks = await processDocuments(markdownFiles);
    console.log(\`✂️ Created \${chunks.length} chunks from ${domainDisplayName} documents\`);
    
    // Generate embeddings
    console.log('🧮 Generating embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Initialize ChromaDB collection
    console.log('🔌 Connecting to ChromaDB...');
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      { collectionName: COLLECTION_NAME }
    );
    
    // Add documents to the vector store
    console.log('📥 Adding documents to vector store...');
    await vectorStore.addDocuments(chunks);
    
    console.log(\`✅ Successfully indexed \${markdownFiles.length} ${domainDisplayName} documents into vector store\`);
    return true;
  } catch (error) {
    console.error('❌ Error indexing ${domainDisplayName} content:', error);
    return false;
  }
}

// Run the script
index${toCamelCase(domainName)}()
  .then(success => {
    if (success) {
      console.log('🏁 ${domainDisplayName} content indexing complete');
    } else {
      console.error('❌ Failed to index ${domainDisplayName} content');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });`;

  await fs.writeFile(scriptPath, scriptContent);
  console.log(`✅ Created indexing script: ${scriptPath}`);
}

async function findAllMarkdownFiles(dir) {
  let results = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      const subDirFiles = await findAllMarkdownFiles(itemPath);
      results = [...results, ...subDirFiles];
    } else if (item.name.endsWith('.md')) {
      results.push(itemPath);
    }
  }
  
  return results;
}

function toCamelCase(str) {
  return str.replace(/([-_][a-z])/g, group => 
    group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
});