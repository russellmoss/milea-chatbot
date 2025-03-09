// scripts/wine-pipeline.js
require('dotenv').config();
const { processWineFiles } = require('./wine-formatter');
const { syncWineProducts } = require('./syncCommerce7ProductsImproved');
const { initializeChromaDB } = require('../utils/vectorStore');

/**
 * Complete Wine Document Pipeline
 * 
 * This script:
 * 1. Syncs products from Commerce7 (with proper formatting)
 * 2. Checks and fixes format issues in existing files
 * 3. Rebuilds vector embeddings to ensure up-to-date search
 * 
 * Run with: node scripts/wine-pipeline.js [--sync] [--fix] [--rebuild]
 * Options:
 *   --sync    : Run Commerce7 sync
 *   --fix     : Fix formatting issues in existing files
 *   --rebuild : Rebuild vector embeddings
 *   --all     : Run all steps (sync, fix, rebuild)
 */

// Process command line arguments
const runSync = process.argv.includes('--sync') || process.argv.includes('--all');
const runFix = process.argv.includes('--fix') || process.argv.includes('--all');
const runRebuild = process.argv.includes('--rebuild') || process.argv.includes('--all');
const fixAll = process.argv.includes('--fix-all'); // Fix all files, not just problematic ones

// If no specific arguments, show help
if (process.argv.length <= 2) {
  console.log(`
📋 Wine Document Pipeline

Usage: node scripts/wine-pipeline.js [--sync] [--fix] [--rebuild] [--all] [--fix-all]

Options:
  --sync    : Run Commerce7 sync to download the latest products
  --fix     : Fix formatting issues in existing files
  --rebuild : Rebuild vector embeddings for search
  --all     : Run all steps (sync, fix, rebuild)
  --fix-all : Fix all files, not just problematic ones (use with --fix)

Examples:
  node scripts/wine-pipeline.js --all        # Run complete pipeline
  node scripts/wine-pipeline.js --sync --fix # Sync and fix formatting
  node scripts/wine-pipeline.js --fix        # Only fix formatting issues
  `);
  process.exit(0);
}

// Run the pipeline steps
async function runPipeline() {
  console.log('🍷 Wine Document Pipeline');
  console.log('=========================================================');
  
  try {
    // Step 1: Sync with Commerce7
    if (runSync) {
      console.log('\n📡 STEP 1: Syncing with Commerce7');
      console.log('=========================================================');
      await syncWineProducts();
    }
    
    // Step 2: Fix formatting issues
    if (runFix) {
      console.log('\n🧹 STEP 2: Fixing formatting issues');
      console.log('=========================================================');
      
      // Set environment variables based on command line args
      process.env.FIX_FILES = 'true';
      process.env.ALL_FILES = fixAll ? 'true' : 'false';
      
      await processWineFiles();
    }
    
    // Step 3: Rebuild vector embeddings
    if (runRebuild) {
      console.log('\n🔄 STEP 3: Rebuilding vector embeddings');
      console.log('=========================================================');
      
      try {
        // Reset ChromaDB collection
        await initializeChromaDB();
        console.log('✅ Vector database reset successfully');
        
        // Run the knowledge base initialization script
        const { initializeKnowledgeBase } = require('./initializeKnowledgeBase');
        await initializeKnowledgeBase();
        console.log('✅ Knowledge base reindexed successfully');
      } catch (error) {
        console.error('❌ Error rebuilding vector embeddings:', error);
      }
    }
    
    console.log('\n✅ Pipeline completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in wine pipeline:', error);
    process.exit(1);
  }
}

// Run the pipeline
runPipeline().then(() => {
  console.log('Done! ✨');
  process.exit(0);
}).catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
