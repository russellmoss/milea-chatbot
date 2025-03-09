// scripts/html-to-markdown.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * HTML to Markdown Converter for Wine Documents
 * 
 * This standalone script:
 * 1. Finds files containing HTML tags
 * 2. Extracts structured sections (tasting notes, wine notes, etc.)
 * 3. Converts HTML to clean markdown formatting
 * 4. Saves files with proper structure
 * 
 * For cases where the enhanced cleaner might not work,
 * this provides a more direct approach to fix problems.
 */

// Configuration
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const WINE_DIR = path.join(KNOWLEDGE_DIR, 'wine');
const BACKUP_DIR = path.join(__dirname, '../backups/html_conversion');
const FIX_FILES = process.argv.includes('--fix');
const VERBOSE = process.argv.includes('--verbose');
const FORCE_ALL = process.argv.includes('--all');

// Create backup directory if needed
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * HTML Tag Handler - convert HTML tags to markdown
 * @param {string} content - Content with HTML
 * @returns {string} - Clean markdown
 */
function convertHtmlToMarkdown(content) {
  let markdown = content;
  
  // Handle common HTML entities
  markdown = markdown
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&uuml;/g, "ü")
    .replace(/&ouml;/g, "ö")
    .replace(/&auml;/g, "ä")
    .replace(/&iuml;/g, "ï")
    .replace(/&ccedil;/g, "ç")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&uacute;/g, "ú")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&aacute;/g, "á")
    .replace(/&lsquo;/g, "'")
    .replace(/&bull;/g, "•")
    .replace(/&reg;/g, "®")
    .replace(/&copy;/g, "©")
    .replace(/&trade;/g, "™")
    .replace(/&deg;/g, "°")
    .replace(/&raquo;/g, "»")
    .replace(/&laquo;/g, "«");
  
  // Step 1: Extract sections that need special handling
  const sections = {};
  
  // Extract Wine Notes section
  const wineNotesMatch = markdown.match(/<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*(?:WINE NOTES|Wine Notes)\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i);
  if (wineNotesMatch) {
    sections.wineNotes = cleanHtmlFragment(wineNotesMatch[1].trim());
  }
  
  // Extract Tasting Notes section
  const tastingNotesMatch = markdown.match(/<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*(?:TASTING NOTES|Tasting Notes)\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i);
  if (tastingNotesMatch) {
    sections.tastingNotes = cleanHtmlFragment(tastingNotesMatch[1].trim());
  }
  
  // Extract Pairing Recommendation section
  const pairingMatch = markdown.match(/<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*(?:PAIRING RECOMMENDATIONS?|Pairing Recommendations?)[:]?\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i);
  if (pairingMatch) {
    sections.pairingRecommendations = cleanHtmlFragment(pairingMatch[1].trim());
  }
  
  // Extract Vintage and Title
  let vintage = null;
  let wineName = null;
  const titleMatch = markdown.match(/^#\s+(?:(\d{4}|NV)\s+)?(.+?)$/m);
  if (titleMatch) {
    vintage = titleMatch[1] || null;
    wineName = titleMatch[2]?.trim() || null;
  }
  
  // Extract Product Information
  const productInfo = {};
  const productSection = markdown.match(/## Product Information([\s\S]*?)(?=\n##|$)/);
  if (productSection) {
    const infoLines = productSection[1].match(/- \*\*([^*]+)\*\*: ([^\n]+)/g) || [];
    infoLines.forEach(line => {
      const match = line.match(/- \*\*([^*]+)\*\*: (.*)/);
      if (match) {
        productInfo[match[1].trim()] = match[2].trim();
      }
    });
  }
  
  // Extract Quick Overview
  let quickOverview = '';
  const quickOverviewMatch = markdown.match(/## Quick Overview\s*([^\n].*?)(?=\s*\n##|$)/s);
  if (quickOverviewMatch) {
    quickOverview = quickOverviewMatch[1].trim();
  }
  
  // Extract Details section
  let details = 'No additional details available.';
  const detailsMatch = markdown.match(/## Details\s*([\s\S]*?)(?=\s*\n##|$)/);
  if (detailsMatch && detailsMatch[1].trim()) {
    details = detailsMatch[1].trim();
  }
  
  // Step 2: Extract any general content if specific sections weren't found
  if (!sections.wineNotes && !sections.tastingNotes) {
    const descriptionMatch = markdown.match(/## Description\s*([\s\S]*?)(?=\s*\n##|$)/);
    if (descriptionMatch) {
      const descriptionText = cleanHtmlFragment(descriptionMatch[1]);
      if (descriptionText.trim()) {
        sections.wineNotes = descriptionText;
      }
    }
  }
  
  // Step 3: Build new structured markdown
  let newMarkdown = `# ${vintage ? `${vintage} ` : ''}${wineName || 'Wine'}\n\n`;
  
  // Add Product Information section
  newMarkdown += `## Product Information\n`;
  Object.entries(productInfo).forEach(([key, value]) => {
    newMarkdown += `- **${key}**: ${value}\n`;
  });
  newMarkdown += `\n`;
  
  // Add Wine Notes section if available
  if (sections.wineNotes) {
    newMarkdown += `## Wine Notes\n${sections.wineNotes}\n\n`;
  }
  
  // Add Tasting Notes section if available
  if (sections.tastingNotes) {
    newMarkdown += `## Tasting Notes\n${sections.tastingNotes}\n\n`;
  }
  
  // Add Pairing Recommendations section if available
  if (sections.pairingRecommendations) {
    newMarkdown += `## Pairing Recommendations\n${sections.pairingRecommendations}\n\n`;
  }
  
  // Add Quick Overview section
  newMarkdown += `## Quick Overview\n${quickOverview || `A distinguished ${vintage || ''} ${wineName || 'wine'} from Milea Estate Vineyard.`}\n\n`;
  
  // Add Details section
  newMarkdown += `## Details\n${details}\n`;
  
  return newMarkdown;
}

/**
 * Clean HTML fragment (individual section)
 * @param {string} fragment - HTML fragment
 * @returns {string} - Clean markdown
 */
function cleanHtmlFragment(fragment) {
  if (!fragment) return '';
  
  let cleaned = fragment;
  
  // Remove wrapper tags if present
  cleaned = cleaned
    .replace(/^<(?:p|div)[^>]*>([\s\S]*)<\/(?:p|div)>$/, '$1')
    .replace(/^<span[^>]*>([\s\S]*)<\/span>$/, '$1');
  
  // Convert HTML formatting to markdown
  cleaned = cleaned
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/g, '__$1__')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<p[^>]*>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '\n\n')
    .replace(/<ul[^>]*>/g, '')
    .replace(/<\/ul>/g, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n');
  
  // Fix multiple consecutive newlines
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleaned;
}

/**
 * Check if a file contains HTML
 * @param {string} content - File content
 * @returns {boolean} - Whether file contains HTML
 */
function containsHtml(content) {
  return /<[a-z][^>]*>/i.test(content);
}

/**
 * Process a single wine file
 * @param {string} filePath - Path to wine file
 * @returns {Object} - Processing result
 */
function processWineFile(filePath) {
  const fileName = path.basename(filePath);
  const result = {
    file: fileName,
    path: filePath,
    status: 'skipped',
    containsHtml: false,
    error: null
  };
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if file contains HTML or if we're forcing all files
    const hasHtml = containsHtml(content);
    result.containsHtml = hasHtml;
    
    if (!hasHtml && !FORCE_ALL) {
      return result;
    }
    
    // Create backup of original file
    const backupPath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(backupPath, content);
    
    // Convert HTML to markdown
    const markdown = convertHtmlToMarkdown(content);
    
    if (VERBOSE) {
      console.log(`\n----- ORIGINAL -----\n`);
      console.log(content.substring(0, 500) + '...');
      console.log(`\n----- CONVERTED -----\n`);
      console.log(markdown.substring(0, 500) + '...\n');
    }
    
    // Update file if --fix flag is provided
    if (FIX_FILES) {
      fs.writeFileSync(filePath, markdown);
      result.status = 'fixed';
    } else {
      result.status = 'needs_fixing';
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
    result.status = 'error';
    result.error = error.message;
    return result;
  }
}

/**
 * Process all wine files
 */
async function processAllWineFiles() {
  // Find all wine files
  const wineFiles = glob.sync(`${WINE_DIR}/**/*.md`);
  
  // Skip test if no files found
  if (!wineFiles.length) {
    console.error(`❌ No wine files found in ${WINE_DIR}`);
    return;
  }
  
  console.log(`🍷 Found ${wineFiles.length} wine files`);
  console.log(`🔎 Scanning for HTML content...`);
  
  // Process stats
  const stats = {
    total: wineFiles.length,
    withHtml: 0,
    fixed: 0,
    needsFix: 0,
    skipped: 0,
    errors: 0
  };
  
  // Process each file
  for (const file of wineFiles) {
    const result = processWineFile(file);
    
    // Update stats
    if (result.containsHtml) stats.withHtml++;
    
    switch (result.status) {
      case 'fixed':
        console.log(`✅ Fixed: ${path.basename(file)}`);
        stats.fixed++;
        break;
      case 'needs_fixing':
        console.log(`⚠️ Needs fixing: ${path.basename(file)}`);
        stats.needsFix++;
        break;
      case 'skipped':
        if (VERBOSE) console.log(`📝 Skipped: ${path.basename(file)}`);
        stats.skipped++;
        break;
      case 'error':
        console.error(`❌ Error: ${path.basename(file)} - ${result.error}`);
        stats.errors++;
        break;
    }
  }
  
  // Print summary
  console.log(`\n📊 PROCESSING SUMMARY:`);
  console.log(`Total wine files: ${stats.total}`);
  console.log(`Files with HTML: ${stats.withHtml}`);
  console.log(`Files fixed: ${stats.fixed}`);
  console.log(`Files needing fixes: ${stats.needsFix}`);
  console.log(`Files skipped: ${stats.skipped}`);
  console.log(`Files with errors: ${stats.errors}`);
  
  if (!FIX_FILES && stats.needsFix > 0) {
    console.log(`\n⚠️ Run with --fix flag to apply changes`);
  }
  
  if (FIX_FILES) {
    console.log(`\n💾 Backups saved to: ${BACKUP_DIR}`);
  }
}

// If script is run directly
if (require.main === module) {
  console.log(`🍷 HTML to Markdown Converter for Wine Documents`);
  console.log(`=========================================================`);
  
  if (FIX_FILES) {
    console.log(`⚠️ Fix mode enabled - files will be updated`);
  } else {
    console.log(`ℹ️ Dry run mode - no files will be modified (use --fix to update)`);
  }
  
  if (FORCE_ALL) {
    console.log(`ℹ️ Processing all files, even those without HTML (--all)`);
  }
  
  processAllWineFiles();
}

module.exports = {
  convertHtmlToMarkdown,
  processWineFile,
  processAllWineFiles
};