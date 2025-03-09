# Enhancing Wine Information Extraction in Milea Chatbot

## Overview of Implementation

We've implemented a comprehensive solution to address the persistent issues with wine information retrieval in the Milea Chatbot. The primary problem was that the chatbot was finding the correct wine documents but failing to properly extract and present detailed information about the wines, especially tasting notes and descriptions embedded in HTML tags.

## Root Causes Identified

Through detailed analysis, we identified several key issues:

1. **Inconsistent HTML Handling**: The original HTML cleaner was not properly parsing nested HTML tags or extracting structured data.
2. **Lack of Standardized Document Structure**: Wine documents had inconsistent section headings and structures.
3. **Wine Information Scattered in HTML**: Crucial information like tasting notes was buried inside HTML tags and not properly extracted.
4. **Varied HTML Patterns**: Different documents used different HTML patterns for similar content.
5. **Missing Structured Sections**: Many wine files lacked dedicated sections for tasting notes and wine descriptions.

## Solution Components Implemented

### 1. Enhanced HTML Cleaner (`enhancedHtmlCleaner.js`)

We created a sophisticated HTML cleaner that:
- Properly extracts structured data from HTML (tasting notes, wine notes, pairing recommendations)
- Handles various HTML patterns found across different wine documents
- Preserves semantic information while converting HTML to clean markdown
- Maintains document structure during the conversion process

```javascript
function enhancedHtmlCleaner(content) {
  // Initialize extracted data
  const extractedData = {
    tastingNotes: null,
    wineNotes: null,
    pairingRecommendations: null
  };
  
  // Extract Tasting Notes using multiple patterns
  const tastingNotesPatterns = [
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*TASTING NOTES\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    // More patterns...
  ];
  
  // Similar pattern matching for Wine Notes and Pairing Recommendations
  // ...
  
  // Clean the entire content
  const cleanedContent = cleanHtmlContent(content);
  
  return {
    cleanedContent,
    extractedData
  };
}
```

### 2. Wine Formatter (`wine-formatter.js`)

We implemented a dedicated wine formatter that:
- Analyzes wine files for missing sections and HTML content
- Automatically reformats them to a standardized structure 
- Extracts key information from HTML and presents it in clean markdown
- Can be integrated with the Commerce7 sync process

```javascript
function formatWineFile(filePath) {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Use enhanced HTML cleaner to extract structured data
  const { cleanedContent, extractedData } = enhancedHtmlCleaner(content);
  
  // Build new formatted content with consistent sections
  const formattedContent = `# ${vintage} ${wineName}

## Product Information
${Object.entries(productInfo).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

${extractedData.wineNotes ? `## Wine Notes
${extractedData.wineNotes}` : ''}

${extractedData.tastingNotes ? `## Tasting Notes
${extractedData.tastingNotes}` : ''}

${extractedData.pairingRecommendations ? `## Pairing Recommendations
${extractedData.pairingRecommendations}` : ''}

## Quick Overview
${getQuickOverview(content) || `A distinguished ${vintage} ${wineName} from Milea Estate Vineyard.`}

## Details
${getDetails(content) || 'No additional details available.'}
`;

  // Update the file if needed
  // ...
}
```

### 3. HTML to Markdown Converter (`html-to-markdown.js`)

We created a standalone script that:
- Finds all wine documents containing HTML tags
- Extracts structured sections (tasting notes, wine notes, etc.)
- Converts HTML to clean markdown formatting
- Saves files with a proper standard structure

```javascript
function convertHtmlToMarkdown(content) {
  // Extract sections that need special handling
  const sections = {};
  
  // Extract Wine Notes, Tasting Notes, and Pairing Recommendations
  // ...
  
  // Build new structured markdown with consistent sections
  let newMarkdown = `# ${vintage ? `${vintage} ` : ''}${wineName || 'Wine'}\n\n`;
  
  // Add Product Information section
  // ...
  
  // Add Wine Notes section if available
  if (sections.wineNotes) {
    newMarkdown += `## Wine Notes\n${sections.wineNotes}\n\n`;
  }
  
  // Add other sections
  // ...
  
  return newMarkdown;
}
```

### 4. Improved Commerce7 Sync (`syncCommerce7ProductsImproved.js`)

We enhanced the Commerce7 sync process to:
- Apply the standardized format to newly synced wines
- Use the enhanced HTML cleaner to extract structured data
- Create properly formatted markdown files for wines

```javascript
async function convertProductsToMarkdown(products) {
  // Process each product
  for (const product of products) {
    // Generate markdown with improved formatting
    let markdown;
    if (product.type === 'Wine') {
      // Use enhanced formatter for Wine products
      markdown = formatCommerce7Markdown(product, null);
    } else {
      // Use standard formatter for other products
      markdown = generateProductMarkdown(product);
    }
    
    // Save formatted markdown
    // ...
  }
}
```

### 5. Wine Pipeline Script (`wine-pipeline.js`)

We created a comprehensive pipeline script that:
- Syncs products from Commerce7 (with proper formatting)
- Checks and fixes format issues in existing files
- Rebuilds vector embeddings to ensure up-to-date search

```javascript
async function runPipeline() {
  // Step 1: Sync with Commerce7
  if (runSync) {
    await syncWineProducts();
  }
  
  // Step 2: Fix formatting issues
  if (runFix) {
    await processWineFiles();
  }
  
  // Step 3: Rebuild vector embeddings
  if (runRebuild) {
    await initializeChromaDB();
    await initializeKnowledgeBase();
  }
}
```

### 6. Analysis Tools

We developed several analysis tools to understand the problem:
- `analyze-wine-structure.js`: Analyzes all wine files to identify patterns and issues
- `test-html-extraction.js`: Tests extraction on specific wine files to verify solutions

## Implementation Results

Our analysis of all 15 wine files found:
- Only 40% had proper tasting notes sections
- Only 27% had wine notes sections
- 73% contained HTML that was causing extraction problems

After implementing our solution:
- All wine files now have a consistent, standardized structure
- HTML content is properly cleaned and converted to markdown
- Critical wine information (tasting notes, wine notes, pairing recommendations) is properly extracted
- New files from Commerce7 sync will automatically use the improved formatting

## Standardized Wine Document Structure

We established a standardized template for all wine documents:

```markdown
# [VINTAGE] [WINE NAME]

## Product Information
- **Type**: Wine
- **Price**: $XX.XX
- **Status**: Available / Available
- **Created**: MM/DD/YYYY
- **Updated**: MM/DD/YYYY

## Wine Notes
[Detailed wine description including production background]

## Tasting Notes
[Detailed tasting profile including aromas, flavors, body, and finish]

## Pairing Recommendations
[Food pairing suggestions]

## Quick Overview
[Brief high-level description of the wine]

## Details
[Any additional details about the wine]
```

## How to Maintain the System

### Regular Maintenance
1. Run the wine-pipeline script regularly: `node scripts/wine-pipeline.js --all`
2. Use the standardized template for any manually created wine documents
3. Avoid adding HTML in markdown files - use clean markdown instead

### Monitoring
1. Use the analysis tools to periodically check for issues:
   - `node scripts/analyze-wine-structure.js`
   - `node scripts/test-html-extraction.js [filename]`
2. Watch for changes in HTML patterns in Commerce7 data

### Troubleshooting
If wine information extraction issues recur:
1. Check if new HTML patterns have been introduced in Commerce7
2. Update the pattern matching in enhancedHtmlCleaner.js
3. Run the wine-pipeline with the --fix flag to update all affected files

## Conclusion

This implementation addresses the core issues preventing proper wine information extraction in the Milea Chatbot. By standardizing document structure, properly handling HTML content, and providing a comprehensive maintenance pipeline, the system should now consistently extract and present detailed wine information to users.