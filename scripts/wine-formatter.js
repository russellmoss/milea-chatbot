// scripts/wine-formatter.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { enhancedHtmlCleaner } = require('../services/rag/context/utils/enhancedHtmlCleaner');

/**
 * Wine Markdown Formatter
 * 
 * This script:
 * 1. Analyzes wine files for missing sections and HTML content
 * 2. Automatically reformats them to a standardized structure
 * 3. Extracts key information from HTML and reformats as clean markdown
 * 4. Can be integrated into the Commerce7 sync process
 */

// Configuration
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const WINE_DIR = path.join(KNOWLEDGE_DIR, 'wine');
const BACKUP_DIR = path.join(__dirname, '../backups/wine');
const REPORT_PATH = path.join(__dirname, 'wine-format-report.json');
const FIX_FILES = process.argv.includes('--fix'); // Add --fix to actually update files
const ALL_FILES = process.argv.includes('--all'); // Add --all to process all files, not just problematic ones

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Find all wine files in the knowledge directory
 */
function findWineFiles() {
  if (!fs.existsSync(WINE_DIR)) {
    console.error(`❌ Wine directory not found: ${WINE_DIR}`);
    return [];
  }

  // Get all markdown files in the wine directory
  const wineFiles = glob.sync(`${WINE_DIR}/**/*.md`);
  return wineFiles;
}

/**
 * Check if a file should be formatted
 * @param {string} content - File content
 * @returns {boolean} - Whether the file should be formatted
 */
function shouldFormatFile(content) {
  if (ALL_FILES) return true;

  // Check for problematic patterns
  const hasMissingTastingNotes = !content.includes('Tasting Notes') && !content.includes('TASTING NOTES');
  const hasMissingWineNotes = !content.includes('Wine Notes') && !content.includes('WINE NOTES');
  const hasHtml = /<[^>]+>/.test(content);

  return hasMissingTastingNotes || hasMissingWineNotes || hasHtml;
}

/**
 * Format a single wine file
 * @param {string} filePath - Path to the wine file
 * @returns {Object} - Format report
 */
function formatWineFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`🔍 Analyzing: ${fileName}`);

  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip files that don't need formatting
    if (!shouldFormatFile(content)) {
      return {
        file: fileName,
        path: filePath,
        status: 'skipped',
        reason: 'No formatting needed'
      };
    }

    // Create a backup before modifying
    const backupPath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(backupPath, content);
    
    // Use enhanced HTML cleaner to extract structured data
    const { cleanedContent, extractedData } = enhancedHtmlCleaner(content);
    
    // Extract vintage and wine name from title
    const titleMatch = content.match(/^#\s+(?:(\d{4}|NV)\s+)?(.+?)$/m);
    const vintage = titleMatch?.[1] || 'Unknown';
    const wineName = titleMatch?.[2]?.trim() || path.basename(fileName, '.md');
    
    // Extract product information
    const productInfo = {};
    const productSection = content.match(/## Product Information([\s\S]*?)(?=\n##|$)/);
    if (productSection) {
      const infoLines = productSection[1].match(/- \*\*([^*]+)\*\*: ([^\n]+)/g) || [];
      infoLines.forEach(line => {
        const match = line.match(/- \*\*([^*]+)\*\*: (.*)/);
        if (match) {
          productInfo[match[1].trim()] = match[2].trim();
        }
      });
    }
    
    // Build new formatted content
    const formattedContent = `# ${vintage ? `${vintage} ` : ''}${wineName}

## Product Information
${Object.entries(productInfo).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

${extractedData.wineNotes ? `## Wine Notes
${extractedData.wineNotes}

` : ''}${extractedData.tastingNotes ? `## Tasting Notes
${extractedData.tastingNotes}

` : ''}${extractedData.pairingRecommendations ? `## Pairing Recommendations
${extractedData.pairingRecommendations}

` : ''}## Quick Overview
${getQuickOverview(content) || `A distinguished ${vintage} ${wineName} from Milea Estate Vineyard.`}

## Details
${getDetails(content) || 'No additional details available.'}
`;

    // If FIX_FILES flag is set, update the file
    if (FIX_FILES) {
      fs.writeFileSync(filePath, formattedContent);
      console.log(`✅ Updated: ${fileName}`);
    }

    return {
      file: fileName,
      path: filePath,
      status: FIX_FILES ? 'fixed' : 'needs_fixing',
      changes: {
        formatFixed: true,
        htmlRemoved: /<[^>]+>/.test(content),
        sectionsAdded: {
          wineNotes: !content.includes('## Wine Notes') && !!extractedData.wineNotes,
          tastingNotes: !content.includes('## Tasting Notes') && !!extractedData.tastingNotes,
          pairingRecommendations: !content.includes('## Pairing') && !!extractedData.pairingRecommendations
        }
      }
    };
  } catch (error) {
    console.error(`❌ Error formatting ${fileName}:`, error.message);
    return {
      file: fileName,
      path: filePath,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Extract Quick Overview section from content
 * @param {string} content - File content
 * @returns {string|null} - Quick Overview section or null
 */
function getQuickOverview(content) {
  const match = content.match(/## Quick Overview\s*([^\n].*?)(?=\s*\n##|$)/s);
  return match ? match[1].trim() : null;
}

/**
 * Extract Details section from content
 * @param {string} content - File content
 * @returns {string|null} - Details section or null
 */
function getDetails(content) {
  const match = content.match(/## Details\s*([\s\S]*?)(?=\s*\n##|$)/);
  return match ? match[1].trim() : null;
}

/**
 * Process all wine files
 */
async function processWineFiles() {
  const wineFiles = findWineFiles();
  console.log(`🍷 Found ${wineFiles.length} wine files`);

  const results = {
    total: wineFiles.length,
    skipped: 0,
    fixed: 0,
    needsFixing: 0,
    errors: 0,
    details: []
  };

  for (const file of wineFiles) {
    const result = formatWineFile(file);
    results.details.push(result);

    // Update summary stats
    switch (result.status) {
      case 'skipped':
        results.skipped++;
        break;
      case 'fixed':
        results.fixed++;
        break;
      case 'needs_fixing':
        results.needsFixing++;
        break;
      case 'error':
        results.errors++;
        break;
    }
  }

  // Write report to file
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n📊 FORMAT SUMMARY:');
  console.log('=========================================================');
  console.log(`Total wine files: ${results.total}`);
  console.log(`Files skipped (already well-formatted): ${results.skipped}`);
  console.log(`Files fixed: ${results.fixed}`);
  console.log(`Files needing fixes (run with --fix): ${results.needsFixing}`);
  console.log(`Files with errors: ${results.errors}`);
  
  if (FIX_FILES) {
    console.log('\n✅ Files have been updated. Backups stored in:', BACKUP_DIR);
  } else if (results.needsFixing > 0) {
    console.log('\n⚠️ Run again with --fix flag to apply formatting changes');
  }
}

/**
 * Format markdown content generated from Commerce7 to ensure it has the correct structure
 * This function can be integrated directly into the syncCommerce7Products.js script
 */
function formatCommerce7Markdown(product, markdown) {
  // Extract basic information
  const title = product.title || '';
  let priceText = 'Price unavailable';
  if (product.variants?.length > 0 && product.variants[0].price) {
    priceText = `$${(product.variants[0].price / 100).toFixed(2)}`;
  }
  
  // Extract vintage from title or product data
  let vintage = 'Unknown';
  let wineName = title;
  
  // Check if title includes a year at the beginning
  const vintageMatch = title.match(/^(\d{4}|NV)\s+(.+)$/);
  if (vintageMatch) {
    vintage = vintageMatch[1];
    wineName = vintageMatch[2];
  } else {
    // Try to extract from metadata
    if (product.metaData && product.metaData.vintage) {
      vintage = product.metaData.vintage;
    }
  }
  
  // Clean up any HTML in the content
  const htmlContent = product.content || '';
  const { cleanedContent, extractedData } = enhancedHtmlCleaner(htmlContent);
  
  // Build wine notes based on product description
  let wineNotes = cleanedContent;
  if (!extractedData.wineNotes && !extractedData.tastingNotes && htmlContent) {
    // If no dedicated sections were found, try to extract from the main content
    const generalDesc = htmlContent
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
    
    if (generalDesc) {
      wineNotes = generalDesc;
    }
  }
  
  // Build structured markdown
  return `# ${vintage} ${wineName}

## Product Information
- **Type**: ${product.type}
- **Price**: ${priceText}
- **Status**: ${product.adminStatus} / ${product.webStatus}
- **Created**: ${new Date(product.createdAt).toLocaleDateString()}
- **Updated**: ${new Date(product.updatedAt).toLocaleDateString()}

${extractedData.wineNotes ? `## Wine Notes
${extractedData.wineNotes}
` : wineNotes ? `## Wine Notes
${wineNotes}
` : ''}

${extractedData.tastingNotes ? `## Tasting Notes
${extractedData.tastingNotes}
` : ''}

${extractedData.pairingRecommendations ? `## Pairing Recommendations
${extractedData.pairingRecommendations}
` : ''}

## Quick Overview
${product.teaser || `A distinctive ${vintage} ${wineName} from Milea Estate Vineyard.`}

## Details
${product.metaData ? formatMetaData(product.metaData) : 'No additional details available.'}
`;
}

/**
 * Format product metadata into markdown (copied from syncCommerce7Products.js)
 */
function formatMetaData(metaData) {
  return Object.entries(metaData)
    .map(([key, value]) => `- **${key.replace(/_/g, ' ')}**: ${value}`)
    .join('\n');
}

// Export for use in syncCommerce7Products.js
module.exports = {
  formatCommerce7Markdown,
  formatWineFile,
  processWineFiles
};

// Run as standalone script
if (require.main === module) {
  console.log('🍷 Wine Markdown Formatter');
  console.log('=========================================================');
  
  if (FIX_FILES) {
    console.log('⚠️ Fix mode enabled - files will be updated');
  } else {
    console.log('ℹ️ Dry run mode - no files will be modified (use --fix to update files)');
  }
  
  if (ALL_FILES) {
    console.log('ℹ️ Processing all files, not just problematic ones');
  }
  
  processWineFiles();
}
