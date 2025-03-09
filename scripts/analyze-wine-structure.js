// scripts/analyze-wine-structure.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { enhancedHtmlCleaner } = require('../services/rag/context/utils/enhancedHtmlCleaner');
const { cleanHtmlContent } = require('../services/rag/context/utils/htmlCleaner');

/**
 * Analyze all wine markdown files to understand structure patterns
 * 
 * This script identifies:
 * - Common HTML patterns
 * - Section structures
 * - Tasting notes patterns
 * - File format inconsistencies
 */

// Locate the knowledge directory
const findKnowledgeDir = () => {
  const possibleDirs = [
    path.join(__dirname, '../knowledge'),
    path.join(__dirname, 'knowledge')
  ];
  
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  
  console.error('❌ Could not find knowledge directory');
  process.exit(1);
};

const KNOWLEDGE_DIR = findKnowledgeDir();
console.log(`📂 Knowledge directory: ${KNOWLEDGE_DIR}`);

// Find all wine files
const findWineFiles = () => {
  let wineFiles = [];
  
  // Try wine directory first
  const wineDir = path.join(KNOWLEDGE_DIR, 'wine');
  if (fs.existsSync(wineDir)) {
    const files = glob.sync(`${wineDir}/**/*.md`);
    wineFiles = [...wineFiles, ...files];
  }
  
  // Also search for files with wine_ prefix in any directory
  const allWineFiles = glob.sync(`${KNOWLEDGE_DIR}/**/wine_*.md`);
  
  // Combine results, removing duplicates
  const uniqueFiles = [...new Set([...wineFiles, ...allWineFiles])];
  return uniqueFiles;
};

const wineFiles = findWineFiles();
console.log(`🍷 Found ${wineFiles.length} wine files`);

// Analyze structure patterns
const results = {
  totalFiles: wineFiles.length,
  withTastingNotes: 0,
  withWineNotes: 0,
  withPriceInfo: 0,
  withHTML: 0,
  withPairingRecommendations: 0,
  vintageYears: new Set(),
  wineNames: new Set(),
  htmlPatterns: new Set(),
  fileStructure: {}
};

// Also track the most verbose files for potential template creation
const verbosityScore = [];

console.log('🔍 Analyzing wine files...');
wineFiles.forEach((file, index) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const filename = path.basename(file);
    console.log(`[${index + 1}/${wineFiles.length}] Analyzing: ${filename}`);
    
    // Track file sections
    const sections = {};
    
    // Extract sections by headers
    const sectionMatches = content.match(/##\s+([^\n]+)/g) || [];
    sectionMatches.forEach(section => {
      const sectionName = section.replace(/^##\s+/, '').trim();
      sections[sectionName] = (sections[sectionName] || 0) + 1;
      
      // Update global section stats
      results.fileStructure[sectionName] = (results.fileStructure[sectionName] || 0) + 1;
    });
    
    // Use enhanced HTML cleaner to extract structured data
    const { extractedData } = enhancedHtmlCleaner(content);
    
    // Basic stats
    if (extractedData.tastingNotes) {
      results.withTastingNotes++;
    }
    
    if (extractedData.wineNotes) {
      results.withWineNotes++;
    }
    
    if (extractedData.priceInfo) {
      results.withPriceInfo++;
    }
    
    if (extractedData.pairingRecommendations) {
      results.withPairingRecommendations++;
    }
    
    if (extractedData.hasHtmlTags) {
      results.withHTML++;
      
      // Extract HTML patterns
      const htmlTags = content.match(/<[^>]+>/g) || [];
      htmlTags.forEach(tag => results.htmlPatterns.add(tag));
    }
    
    // Extract vintage and wine name
    const titleMatch = content.match(/^#\s+(?:(\d{4}|NV)\s+)?(.+?)$/m);
    if (titleMatch) {
      const vintage = titleMatch[1];
      const wineName = titleMatch[2]?.trim();
      
      if (vintage) {
        results.vintageYears.add(vintage);
      }
      
      if (wineName) {
        results.wineNames.add(wineName);
      }
    }
    
    // Calculate verbosity score (richness of content)
    const verbosity = {
      file: filename,
      fullPath: file,
      contentLength: content.length,
      sections: Object.keys(sections).length,
      hasTastingNotes: !!extractedData.tastingNotes,
      hasWineNotes: !!extractedData.wineNotes,
      hasPairingRecommendations: !!extractedData.pairingRecommendations,
      hasPriceInfo: !!extractedData.priceInfo,
      htmlTagCount: (content.match(/<[^>]+>/g) || []).length,
      score: 0 // Will be calculated below
    };
    
    // Calculate overall richness score
    verbosity.score = verbosity.contentLength / 100
                      + (verbosity.sections * 10)
                      + (verbosity.hasTastingNotes ? 50 : 0)
                      + (verbosity.hasWineNotes ? 50 : 0)
                      + (verbosity.hasPairingRecommendations ? 30 : 0)
                      + (verbosity.hasPriceInfo ? 20 : 0);
                      
    verbosityScore.push(verbosity);
    
  } catch (error) {
    console.error(`❌ Error analyzing ${file}: ${error.message}`);
  }
});

// Sort verbosity scores to find the most content-rich files
verbosityScore.sort((a, b) => b.score - a.score);

// Print results
console.log('\n📊 ANALYSIS RESULTS:');
console.log('=========================================================');
console.log(`Total wine files analyzed: ${results.totalFiles}`);
console.log(`Files with tasting notes: ${results.withTastingNotes} (${Math.round(results.withTastingNotes/results.totalFiles*100)}%)`);
console.log(`Files with wine notes: ${results.withWineNotes} (${Math.round(results.withWineNotes/results.totalFiles*100)}%)`);
console.log(`Files with pairing recommendations: ${results.withPairingRecommendations} (${Math.round(results.withPairingRecommendations/results.totalFiles*100)}%)`);
console.log(`Files with price info: ${results.withPriceInfo} (${Math.round(results.withPriceInfo/results.totalFiles*100)}%)`);
console.log(`Files with HTML: ${results.withHTML} (${Math.round(results.withHTML/results.totalFiles*100)}%)`);

console.log('\n🍷 Wine Varieties:');
console.log('=========================================================');
console.log(`Found ${results.wineNames.size} unique wine names`);
console.log(`Vintages found: ${Array.from(results.vintageYears).sort().join(', ')}`);

console.log('\n📑 Document Structure:');
console.log('=========================================================');
const sortedSections = Object.entries(results.fileStructure).sort((a, b) => b[1] - a[1]);
console.log('Section usage across all files:');
sortedSections.forEach(([section, count]) => {
  console.log(`- "${section}": ${count} files (${Math.round(count/results.totalFiles*100)}%)`);
});

if (results.withHTML > 0) {
  console.log('\n🔖 HTML Patterns:');
  console.log('=========================================================');
  console.log(`Found ${results.htmlPatterns.size} unique HTML tag patterns`);
  console.log('Most common HTML tags:');
  const commonTags = Array.from(results.htmlPatterns)
    .map(tag => ({tag, count: 0}));
  
  // Count occurrences of each tag pattern across all files
  wineFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      commonTags.forEach(item => {
        const regex = new RegExp(item.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = content.match(regex) || [];
        item.count += matches.length;
      });
    } catch (error) {
      // Skip failed files
    }
  });
  
  // Display top tags
  commonTags.sort((a, b) => b.count - a.count);
  commonTags.slice(0, 10).forEach(({tag, count}) => {
    console.log(`- ${tag}: ${count} occurrences`);
  });
}

console.log('\n📝 Most Content-Rich Files:');
console.log('=========================================================');
verbosityScore.slice(0, 5).forEach((item, index) => {
  console.log(`${index + 1}. ${item.file} (Score: ${Math.round(item.score)})`);
  console.log(`   - Content length: ${item.contentLength} chars`);
  console.log(`   - Sections: ${item.sections}`);
  console.log(`   - Has tasting notes: ${item.hasTastingNotes ? '✅' : '❌'}`);
  console.log(`   - Has wine notes: ${item.hasWineNotes ? '✅' : '❌'}`);
  console.log(`   - Has pairing recommendations: ${item.hasPairingRecommendations ? '✅' : '❌'}`);
});

// Create a template from the best file
if (verbosityScore.length > 0) {
  const bestFile = verbosityScore[0];
  console.log('\n📄 Generating template from most detailed file:');
  console.log('=========================================================');
  console.log(`Using ${bestFile.file} as template basis`);
  
  try {
    const content = fs.readFileSync(bestFile.fullPath, 'utf-8');
    
    // Clean HTML from content
    const cleanedContent = cleanHtmlContent(content);
    
    // Extract structured data
    const { extractedData } = enhancedHtmlCleaner(content);
    
    // Create template
    const templateContent = `# [VINTAGE] [WINE NAME]

## Product Information
- **Type**: Wine
- **Price**: $XX.XX
- **Status**: Available / Available
- **Created**: MM/DD/YYYY
- **Updated**: MM/DD/YYYY

${extractedData.wineNotes ? `## Wine Notes
[Detailed wine description including production background]
` : ''}

${extractedData.tastingNotes ? `## Tasting Notes
[Detailed tasting profile including aromas, flavors, body, and finish]
` : ''}

${extractedData.pairingRecommendations ? `## Pairing Recommendations
[Food pairing suggestions]
` : ''}

## Quick Overview
[Brief high-level description of the wine]

## Details
[Any additional details about the wine]
`;

    // Save template to file
    const templateFile = path.join(__dirname, 'wine-document-template.md');
    fs.writeFileSync(templateFile, templateContent);
    console.log(`✅ Template saved to: ${templateFile}`);
    
    // Print template
    console.log('\nRECOMMENDED WINE DOCUMENT TEMPLATE:');
    console.log('=========================================================');
    console.log(templateContent);
    
  } catch (error) {
    console.error(`❌ Error creating template: ${error.message}`);
  }
}

// Output recommendations
console.log('\n🔧 RECOMMENDATIONS:');
console.log('=========================================================');

if (results.withTastingNotes < results.totalFiles * 0.7) {
  console.log('⚠️ Many wine files are missing tasting notes sections.');
  console.log('   Consider adding standardized tasting notes to all wine files.');
}

if (results.withPriceInfo < results.totalFiles * 0.9) {
  console.log('⚠️ Some wine files are missing price information.');
  console.log('   Price should be consistently included in the Product Information section.');
}

if (results.withHTML > results.totalFiles * 0.5) {
  console.log('⚠️ Many wine files contain HTML, which may be causing extraction issues.');
  console.log('   Consider standardizing to plain markdown format for better extraction.');
}

// Check if there are inconsistent section names
const sectionVariances = {};
sortedSections.forEach(([section]) => {
  const normalized = section.toLowerCase().replace(/[^a-z0-9]+/g, '');
  sectionVariances[normalized] = sectionVariances[normalized] || [];
  if (!sectionVariances[normalized].includes(section)) {
    sectionVariances[normalized].push(section);
  }
});

const inconsistentSections = Object.values(sectionVariances).filter(variants => variants.length > 1);
if (inconsistentSections.length > 0) {
  console.log('⚠️ Found inconsistent section naming across files:');
  inconsistentSections.forEach(variants => {
    console.log(`   - Variants: ${variants.join(', ')}`);
  });
  console.log('   Consider standardizing section names across all wine files.');
}

// Summary recommendation
console.log('\n📋 SUMMARY RECOMMENDATION:');
if (verbosityScore.length > 0) {
  console.log(`1. Use the template created from ${verbosityScore[0].file} as a standard format`);
  console.log('2. Convert all HTML content to plain markdown');
  console.log('3. Ensure all wine files have consistent sections and information');
  console.log('4. Update the HTML cleaner to better handle the current HTML patterns');
}

console.log('\nDone! ✨');