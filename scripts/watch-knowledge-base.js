// scripts/watch-knowledge-base.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

const KNOWLEDGE_BASE_DIR = path.join(__dirname, '..', 'knowledge');

console.log('👀 Starting knowledge base file watcher...');
console.log(`📁 Watching directory: ${KNOWLEDGE_BASE_DIR}`);

// Create a watcher
const watcher = chokidar.watch(`${KNOWLEDGE_BASE_DIR}/**/*.md`, {
  persistent: true,
  ignoreInitial: true
});

// Function to determine the domain from a file path
function getDomainFromPath(filePath) {
  const relativePath = path.relative(KNOWLEDGE_BASE_DIR, filePath);
  return relativePath.split(path.sep)[0];
}

// Function to convert domain name to camel case
function toCamelCase(str) {
  return str.replace(/([-_][a-z])/g, group => 
    group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

// Handle add/change events
watcher.on('add', handleFileChange);
watcher.on('change', handleFileChange);

function handleFileChange(filePath) {
  console.log(`📝 Detected change in file: ${path.relative(KNOWLEDGE_BASE_DIR, filePath)}`);
  
  try {
    const domain = getDomainFromPath(filePath);
    console.log(`🔍 File belongs to domain: ${domain}`);
    
    // Check if domain-specific indexing script exists
    const scriptName = `index${toCamelCase(domain)}.js`;
    const scriptPath = path.join(__dirname, scriptName);
    
    if (fs.existsSync(scriptPath)) {
      console.log(`🔄 Running domain-specific indexing: ${scriptName}`);
      execSync(`node scripts/${scriptName}`, { stdio: 'inherit' });
    } else {
      console.log(`⚠️ No domain-specific indexing script found for ${domain}`);
      console.log(`🔄 Running full knowledge base indexing instead`);
      execSync('node scripts/initializeKnowledgeBase.js', { stdio: 'inherit' });
    }
    
    console.log(`✅ Successfully reindexed content for changed file: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error processing file change: ${error}`);
  }
}

// Log that we're ready
console.log('✅ File watcher started. Waiting for changes...');
console.log('💡 Press Ctrl+C to stop watching');