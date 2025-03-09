// scripts/test-html-extraction.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { cleanHtmlContent } = require('../services/rag/context/utils/htmlCleaner');

/**
 * Test HTML content extraction on wine markdown files
 * 
 * Usage: node scripts/test-html-extraction.js [filename]
 * If no filename is provided, tests with Queen of the Meadow Rosé
 */

// Get filename from command line args or use default
const testFile = process.argv[2] || 'wine_2023-queen-of-the-meadow-ros---83a083bd-8269-46ae-b2ae-75597fcdb86b.md';

// Find the file path - check both directly and in the wine directory
let filePath;
if (fs.existsSync(testFile)) {
  filePath = testFile;
} else {
  // Try to find in wine directory
  const wineDir = path.join(__dirname, '../knowledge/wine');
  filePath = path.join(wineDir, testFile);
  
  if (!fs.existsSync(filePath)) {
    // Try a more general search
    const knowledgeDir = path.join(__dirname, '../knowledge');
    const findFile = (dir, filename) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findFile(fullPath, filename);
          if (found) return found;
        } else if (file.includes(filename) || file === filename) {
          return fullPath;
        }
      }
      return null;
    };
    
    const foundPath = findFile(knowledgeDir, testFile);
    if (foundPath) {
      filePath = foundPath;
    } else {
      console.error(`❌ Could not find file: ${testFile}`);
      process.exit(1);
    }
  }
}

console.log(`📄 Testing HTML extraction on: ${filePath}`);

// Read the file
try {
  // Log original content
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  console.log('\n🔍 ORIGINAL CONTENT:');
  console.log('========================================================');
  console.log(originalContent);
  console.log('========================================================\n');

  // Clean HTML and log result
  console.log('🧹 Running HTML cleaning...');
  const cleanedContent = cleanHtmlContent(originalContent);
  console.log('\n🔄 AFTER HTML CLEANING:');
  console.log('========================================================');
  console.log(cleanedContent);
  console.log('========================================================\n');

  // Check for specific sections
  console.log('🔎 Analyzing content structure:');
  const hasTastingNotes = originalContent.includes('TASTING NOTES') || 
                      originalContent.includes('Tasting Notes');
  console.log(`- Has tasting notes section: ${hasTastingNotes ? '✅ Yes' : '❌ No'}`);
  
  const hasWineNotes = originalContent.includes('WINE NOTES') || 
                    originalContent.includes('Wine Notes');
  console.log(`- Has wine notes section: ${hasWineNotes ? '✅ Yes' : '❌ No'}`);
  
  const hasPriceInfo = originalContent.includes('**Price**:');
  console.log(`- Has price information: ${hasPriceInfo ? '✅ Yes' : '❌ No'}`);
  
  // Check for HTML tags
  const hasHtmlTags = /<[^>]+>/.test(originalContent);
  console.log(`- Contains HTML tags: ${hasHtmlTags ? '✅ Yes' : '❌ No'}`);
  
  if (hasHtmlTags) {
    const htmlTags = originalContent.match(/<[^>]+>/g) || [];
    const uniqueTags = [...new Set(htmlTags)];
    console.log(`- Found ${uniqueTags.length} unique HTML tag patterns:`);
    uniqueTags.forEach(tag => console.log(`  ${tag}`));
  }

  // Try to extract tasting notes using different patterns
  console.log('\n🍷 Attempting to extract tasting notes:');
  
  // Pattern 1: Basic <strong>Tasting Notes</strong> followed by paragraph
  const pattern1 = /<p><strong>TASTING NOTES<\/strong><\/p>\s*<p>(.*?)<\/p>/is;
  const match1 = originalContent.match(pattern1);
  if (match1 && match1[1]) {
    console.log('✅ Pattern 1 extracted:');
    console.log(match1[1]);
  } else {
    console.log('❌ Pattern 1 failed');
  }
  
  // Pattern 2: Case insensitive tasting notes in strong tag
  const pattern2 = /<strong>(?:tasting notes|TASTING NOTES)<\/strong>.*?<p>(.*?)<\/p>/is;
  const match2 = originalContent.match(pattern2);
  if (match2 && match2[1]) {
    console.log('✅ Pattern 2 extracted:');
    console.log(match2[1]);
  } else {
    console.log('❌ Pattern 2 failed');
  }
  
  // Pattern 3: Looking for any content after tasting notes heading
  const pattern3 = /(?:tasting notes|TASTING NOTES).*?\n([\s\S]*?)(?:\n##|\n<\/div>|$)/i;
  const match3 = originalContent.match(pattern3);
  if (match3 && match3[1]) {
    console.log('✅ Pattern 3 extracted:');
    console.log(match3[1]);
  } else {
    console.log('❌ Pattern 3 failed');
  }

  // Check if content exists in p tags
  const pTagContent = originalContent.match(/<p>(.*?)<\/p>/gs);
  if (pTagContent && pTagContent.length > 0) {
    console.log(`\n📝 Found ${pTagContent.length} paragraph tags with content:`);
    pTagContent.slice(0, 3).forEach((match, i) => {
      console.log(`Paragraph ${i+1}: ${match.substring(0, 100)}${match.length > 100 ? '...' : ''}`);
    });
    if (pTagContent.length > 3) {
      console.log(`...and ${pTagContent.length - 3} more paragraphs`);
    }
  } else {
    console.log('❌ No content found in paragraph tags');
  }
  
  // Analysis summary
  console.log('\n📊 ANALYSIS SUMMARY:');
  if (hasTastingNotes && !match1 && !match2 && !match3) {
    console.log('⚠️ Document claims to have tasting notes but extraction failed with all patterns');
    console.log('Possible causes:');
    console.log('- Non-standard HTML structure');
    console.log('- Tasting notes not wrapped in expected tags');
    console.log('- Unexpected content format');
  } else if (!hasTastingNotes) {
    console.log('⚠️ Document does not appear to have a dedicated tasting notes section');
    console.log('Recommendation: Check if tasting notes are embedded in general description');
  } else if (match1 || match2 || match3) {
    console.log('✅ Successfully extracted tasting notes with at least one pattern');
  }

} catch (error) {
  console.error(`❌ Error processing file: ${error.message}`);
  console.error(error.stack);
}
