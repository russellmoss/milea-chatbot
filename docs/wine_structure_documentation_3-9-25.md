# Milea Estate Vineyard Wine Catalog Structure Documentation

## Overview

The wine catalog is a critical component of the Milea Estate Vineyard chatbot system, containing detailed information about each wine offered by the vineyard. This document outlines the structure of the wine catalog, including file naming conventions, metadata structure, and the comprehensive list of wines with their official names and patterns.

## Wine Document Structure

### File Naming Convention

Wine documents follow a specific naming pattern:

```
wine_[VINTAGE]-[WINE-NAME-SLUG]-[UUID].md
```

Where:
- `[VINTAGE]`: Year of production (e.g., `2022`) or `NV` for non-vintage wines
- `[WINE-NAME-SLUG]`: Hyphenated, lowercase version of the wine name (e.g., `reserve-cabernet-franc`)
- `[UUID]`: Unique identifier (e.g., `cda583c3-4c58-4b9b-8619-0a609c814f20`)

Example: `wine_2022-reserve-cabernet-franc-cda583c3-4c58-4b9b-8619-0a609c814f20.md`

For non-vintage wines, the pattern is:

```
wine_NV-[WINE-NAME-SLUG]-[UUID].md
```

Example: `wine_NV-hudson-valley-vineyards-right-bank-brut-cuv-e-bbc443ed-a809-42a1-9b81-20f44a6e2e6b.md`

### Markdown Structure

Each wine document follows a consistent markdown structure:

```markdown
# [VINTAGE] [WINE NAME]

## Product Information
- **Type**: Wine
- **Price**: $[PRICE]
- **Status**: [ADMIN_STATUS] / [WEB_STATUS]
- **Created**: [DATE]
- **Updated**: [DATE]

## Description
[DETAILED DESCRIPTION - May contain HTML formatting]

## Quick Overview
[SHORT TEASER DESCRIPTION]

## Details
[ADDITIONAL DETAILS or "No additional details available."]
```

Example:

```markdown
# 2022 Reserve Cabernet Franc

## Product Information
- **Type**: Wine
- **Price**: $45.00
- **Status**: Available / Available
- **Created**: 6/28/2024
- **Updated**: 11/13/2024

## Description
<div>
<div>
<p><strong>WINE NOTES</strong></p>
<p>The 2022 Reserve Cabernet Franc, a distinguished blend from Milea Estate, exemplifies the pinnacle of dedication and craftsmanship...</p>
</div>
<div>
<p><strong>TASTING NOTES</strong></p>
<p>Opulent aromas of ripe plums, black currants, and blackberries that captivate the senses...</p>
</div>
</div>

## Quick Overview
A reflection of the finest Cabernet Franc in New York state and a testament to our winemaking team's commitment to excellence.

## Details
No additional details available.
```

### HTML Content Structure

The Description section often contains HTML formatting with specific semantic structure:

1. **Wine Notes**: General information about the wine, often prefaced with `<strong>WINE NOTES</strong>` or `<strong>Wine Notes</strong>`
2. **Tasting Notes**: Flavor profile and sensory descriptions, prefaced with `<strong>TASTING NOTES</strong>` or `<strong>Tasting Notes</strong>`
3. **Pairing Recommendation**: Food pairing suggestions, prefaced with `<strong>Pairing Recommendation:</strong>`
4. **Accolades**: Awards and ratings, often listed after tasting notes

## Metadata Structure

### Explicit Metadata

Wine documents contain explicit metadata in the "Product Information" section:

| Metadata Field | Description | Example |
|----------------|-------------|---------|
| **Type** | Product type (always "Wine") | `Wine` |
| **Price** | Retail price in USD | `$45.00` |
| **Status** | Admin status / Web status | `Available / Available` |
| **Created** | Creation date | `6/28/2024` |
| **Updated** | Last update date | `11/13/2024` |

### Inferred Metadata

Additional metadata is inferred from the document structure and content:

| Metadata Field | Source | Example |
|----------------|--------|---------|
| **vintage** | Extracted from title or filename | `2022` |
| **wineName** | Extracted from title without vintage | `Reserve Cabernet Franc` |
| **isAvailable** | Derived from Status field | `true` if "Available / Available" |
| **contentType** | Always `wine` for wine documents | `wine` |
| **winePattern** | Slug version of wine name | `reserve-cabernet-franc` |

## Wine Varieties and Collections

### Wine Collections

Milea Estate Vineyard organizes wines into distinct collections:

1. **Reserve**: Premium, estate-focused wines
   - Example: `Reserve Cabernet Franc`, `Reserve Chardonnay`

2. **Farmhouse**: Wines sourced from partner vineyards
   - Example: `Farmhouse Cabernet Franc`, `Farmhouse Chardonnay`

3. **Proceedo**: Approachable, versatile wines in white and rosé styles
   - Example: `Proceedo White`, `Proceedo Rosé`

4. **Hudson Heritage**: Celebrating Hudson Valley wine tradition
   - Example: `Hudson Heritage Chambourcin`

5. **Hudson Valley Vineyards**: Focused on sparkling wines
   - Example: `Hudson Valley Vineyards Right Bank Brut Cuvée`

### Grape Varieties

The catalog includes wines made from these grape varieties:

1. **Cabernet Franc**: Signature varietal, used in multiple wines
2. **Chardonnay**: Used in white wines
3. **Blaufränkisch**: Used in red wines
4. **Grüner Veltliner**: Used in white wines
5. **Chambourcin**: Used in Hudson Heritage wines
6. **Seyval Blanc**: Used in white wines

### Blend Types

Several wines feature specific blend types:

1. **BDX (Bordeaux) Blends**: Featuring Cabernet Franc, Merlot, etc.
   - Example: `Farmhouse BDX Red Blend`, `Vincenza Reserve BDX Blend`

2. **Rosé wines**: Made in different styles
   - Example: `Queen of the Meadow Rosé`, `Four Seasons Reserve Rosé`

## Comprehensive Wine List

Based on the wine markdown files and code analysis, here is the comprehensive list of wines in the Milea Estate catalog:

### Red Wines

| Official Name | Pattern | Vintage | Price | Status |
|--------------|---------|---------|-------|--------|
| Reserve Cabernet Franc | `reserve-cabernet-franc` | 2022 | $45.00 | Available |
| Farmhouse Cabernet Franc | `farmhouse-cabernet-franc` | 2022 | $32.00 | Available |
| Sang's Cabernet Franc | `sangs-cabernet-franc` | 2022 | $38.00 | Available |
| Farmhouse BDX Red Blend | `farmhouse-bdx-red-blend` | 2021 | $32.00 | Available |
| Vincenza Reserve BDX Blend | `vincenza-reserve-bdx-blend` | 2022 | $45.00 | Available |
| Hudson Heritage Chambourcin | `hudson-heritage-chambourcin` | 2021 | $32.00 | Available |

### White Wines

| Official Name | Pattern | Vintage | Price | Status |
|--------------|---------|---------|-------|--------|
| Farmhouse Chardonnay | `farmhouse-chardonnay` | 2023 | $30.00 | Available |
| Reserve Chardonnay | `reserve-chardonnay` | 2023 | $40.00 | Available |
| Proceedo White | `proceedo-white` | 2022 | $24.00 | Available |
| Farmhouse Grüner Veltliner | `farmhouse-gr-ner-veltliner` | 2024 | $35.00 | Available |
| Hudson Heritage Clinton Vineyard Seyval Blanc | `hudson-heritage-clinton-vineyard-seyval-blanc` | 2023 | $30.00 | Available |

### Rosé Wines

| Official Name | Pattern | Vintage | Price | Status |
|--------------|---------|---------|-------|--------|
| Queen of the Meadow Rosé | `queen-of-the-meadow-ros` | 2023 | $25.00 | Available |
| Proceedo Rosé | `proceedo-rose` | 2022 | $24.00 | Available |
| Four Seasons Reserve Rosé | `four-seasons-reserve-ros` | 2023 | $30.00 | Available |

### Sparkling Wines

| Official Name | Pattern | Vintage | Price | Status |
|--------------|---------|---------|-------|--------|
| Hudson Valley Vineyards Right Bank Brut Cuvée | `hudson-valley-vineyards-right-bank-brut-cuv-e` | NV | $45.00 | Available |
| Hudson Valley Vineyards Right Bank Blanc De Blanc | `hudson-valley-vineyards-right-bank-blanc-de-blanc` | NV | $55.00 | Available |

### Wine Collection Structure

Here's a breakdown of wines by collection:

#### Reserve Collection
- Reserve Cabernet Franc (2022)
- Reserve Chardonnay (2023)
- Four Seasons Reserve Rosé (2023)
- Vincenza Reserve BDX Blend (2022)

#### Farmhouse Collection
- Farmhouse Cabernet Franc (2022)
- Farmhouse Chardonnay (2023)
- Farmhouse BDX Red Blend (2021)
- Farmhouse Grüner Veltliner (2024)

#### Proceedo Collection
- Proceedo White (2022)
- Proceedo Rosé (2022)

#### Hudson Heritage Collection
- Hudson Heritage Chambourcin (2021)
- Hudson Heritage Clinton Vineyard Seyval Blanc (2023)

#### Hudson Valley Vineyards Collection
- Hudson Valley Vineyards Right Bank Brut Cuvée (NV)
- Hudson Valley Vineyards Right Bank Blanc De Blanc (NV)

#### Specialty Wines
- Queen of the Meadow Rosé (2023)
- Sang's Cabernet Franc (2022)
- Four Seasons (2021) - Not currently available

## Wine Pattern Matching Logic

The system uses sophisticated pattern matching to identify specific wines in user queries:

```javascript
function identifySpecificWinePattern(query) {
  const queryLower = query.toLowerCase();
  
  // Define wine pattern matching rules with variations and synonyms
  const winePatterns = [
    {
      name: 'reserve cabernet franc',
      pattern: 'reserve-cabernet-franc',
      matchers: [
        {terms: ['reserve', 'cab', 'franc'], proximity: 3},
        {terms: ['reserve', 'cabernet', 'franc'], proximity: 4},
        {regex: /\breserve\s+cab(ernet)?\s+franc\b/}
      ]
    },
    {
      name: 'farmhouse cabernet franc',
      pattern: 'farmhouse-cabernet-franc',
      matchers: [
        {terms: ['farmhouse', 'cab', 'franc'], proximity: 3},
        {terms: ['farmhouse', 'cabernet', 'franc'], proximity: 4},
        {regex: /\bfarmhouse\s+cab(ernet)?\s+franc\b/}
      ]
    },
    // Other wine patterns...
  ];

  // Check each wine pattern against the query
  // ...
}
```

### Wine Name Mappings for Conversation Tracking

The conversation tracker maintains simplified mappings for follow-up queries:

```javascript
this.WINE_NAME_MAPPINGS = {
  'reserve': {
    specificWine: 'reserve cabernet franc',
    winePattern: 'reserve-cabernet-franc',
    wineTerms: ['reserve', 'cabernet', 'franc']
  },
  'farmhouse': {
    specificWine: 'farmhouse cabernet franc',
    winePattern: 'farmhouse-cabernet-franc',
    wineTerms: ['farmhouse', 'cabernet', 'franc']
  },
  // Other mappings...
};
```

## Special Wine Handling Cases

### Proceedo Wines

The system has special handling for Proceedo wines, which come in two variants:

```javascript
async function handleProceedoWine(query, queryInfo, context, knownWines) {
  // Check if query specifies white or rosé variant
  const queryLower = query.toLowerCase();
  const isWhite = queryLower.includes('white');
  const isRose = queryLower.includes('rosé') || queryLower.includes('rose');
  
  // Filter documents to match the specific Proceedo variant
  // ...
}
```

### Rosé Wines

Special handling for rosé wines ensures all details are extracted:

```javascript
const roseInstructions = `
SPECIAL ROSÉ WINE INSTRUCTIONS:
This is a query about a ROSÉ wine. You MUST extract and include ALL details from the context:
1. The specific vintage year
2. Complete tasting notes - extract EVERY detail about how the wine tastes
3. Color descriptions (e.g., salmon pink, coral, light ruby)
4. Aroma profiles (e.g., strawberry, watermelon, citrus, floral notes)
5. Flavor characteristics (e.g., crisp, dry, fruity, refreshing)
6. Any special production methods mentioned
7. Food pairing suggestions if available
8. Price information in exact dollar amount

This is a specialty wine for Milea Estate Vineyard, so provide a complete description.
`;
```

### Cabernet Franc Wines

Special handling for the vineyard's signature Cabernet Franc wines:

```javascript
async function handleReserveCabernet(query, queryInfo, context, knownWines) {
  logger.wine(`Special handling for Reserve Cabernet Franc query`);
  
  // Filter for Reserve Cabernet Franc documents
  const reserveDocs = context.documents.filter(doc => 
    doc.metadata.source.toLowerCase().includes('reserve-cabernet-franc')
  );
  
  // ...
}
```

## Wine Variety Mapping

The system maintains a list of known wine varieties for pattern matching:

```javascript
const WINE_VARIETIES = [
  "chardonnay", 
  "cabernet", 
  "cabernet sauvignon", 
  "cabernet franc", 
  "pinot noir", 
  "blaufränkisch", 
  "blaufrankisch", 
  "merlot", 
  "riesling", 
  "syrah", 
  "sauvignon blanc",
  "grüner veltliner", 
  "gruner veltliner", 
  "rosé", 
  "rose",
  "red blend", 
  "white blend", 
  "proceedo"
];
```

## Wine Document Validation

The system validates wine documents to ensure they match the requested wine:

```javascript
function validateResults(results, queryInfo, query) {
  // For specific wine queries, be extra strict in validation
  if (queryInfo.type === 'wine' && queryInfo.isSpecificWine) {
    // If it's a confirmed wine from our list, check that documents match the pattern
    if (queryInfo.isConfirmedWine && queryInfo.winePattern) {
      logger.wine(`Strict validation for confirmed wine: ${queryInfo.specificWine} with pattern ${queryInfo.winePattern}`);
      
      const validResults = results.filter(doc => {
        const source = doc.metadata.source.toLowerCase();
        return source.includes(queryInfo.winePattern);
      });
      
      // If we found valid matches, return only those
      if (validResults.length > 0) {
        return validResults;
      }
    }
  }
  
  // Other validation logic...
}
```

## Hardcoded Known Wines List

The system maintains a hardcoded list of known wines for verification:

```javascript
async function extractWinesFromKnowledgeBase() {
  try {
    // Return hardcoded list of confirmed wines
    // This avoids filesystem issues during initial setup
    return [
      {
        name: "Reserve Cabernet Franc",
        vintage: "2022",
        price: "36.00",
        isAvailable: true
      },
      {
        name: "Farmhouse Cabernet Franc", 
        vintage: "2022",
        price: "32.00",
        isAvailable: true
      },
      {
        name: "Proceedo White",
        vintage: "2022",
        price: "24.00",
        isAvailable: true
      },
      {
        name: "Proceedo Rosé",
        vintage: "2022",
        price: "24.00", 
        isAvailable: true
      },
      {
        name: "Sang's Cabernet Franc",
        vintage: "2022",
        price: "38.00",
        isAvailable: true
      },
      {
        name: "Queen of the Meadow",
        vintage: "2021",
        price: "28.00",
        isAvailable: true
      },
      {
        name: "Hudson Heritage Chambourcin",
        vintage: "2021", 
        price: "32.00",
        isAvailable: true
      },
      {
        name: "Four Seasons",
        vintage: "2021",
        price: "26.00",
        isAvailable: false
      }
    ];
  } catch (error) {
    console.error('Error extracting wines from knowledge base:', error);
    return [];
  }
}
```

## Wine Document Processing

Wine documents are processed through several steps:

1. **Extraction**: Wine information is extracted from markdown files
2. **Validation**: Documents are validated to ensure they match query intent
3. **Scoring**: Documents are scored based on relevance to the query
4. **Grouping**: Documents are grouped by wine type and vintage
5. **Selection**: Final documents are selected for context assembly

```javascript
function groupWineDocuments(scoredDocs, queryInfo) {
  // For specific wine queries or if we only found one wine, group by vintage
  const wineGroups = {};
  
  for (const item of scoredDocs) {
    const source = item.doc.metadata.source.toLowerCase();
    // Extract base wine name (remove vintage year and ID)
    const baseNameMatch = source.match(/^wine_([a-z0-9-]+?)-\d{4}-/);
    
    if (baseNameMatch) {
      const baseName = baseNameMatch[1];
      if (!wineGroups[baseName]) {
        wineGroups[baseName] = [];
      }
      wineGroups[baseName].push(item);
    } else {
      // If we can't extract base name, just use the source
      const simplifiedSource = source.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, '');
      if (!wineGroups[simplifiedSource]) {
        wineGroups[simplifiedSource] = [];
      }
      wineGroups[simplifiedSource].push(item);
    }
  }
  
  // Find the wine group with the highest scored document
  // ...
}
```

## Common Wine Typo Corrections

The system handles common wine typos and misspellings:

```javascript
const typoCorrections = {
  "chardonay": "chardonnay", 
  "cabenet": "cabernet",
  "savignon": "sauvignon",
  "savingon": "sauvignon",
  "reisling": "riesling",
  "resling": "riesling",
  "blafrankisch": "blaufrankisch",
  "rose": "rosé",
  "gruner": "grüner veltliner",
  "gruener": "grüner veltliner"
  // Removed the proceedo/prosecco correction to avoid changing the wine name
};
```

## Wine Response Generation

Wine responses are generated with special instructions to ensure complete information:

```javascript
function getEnhancedWineInstructions() {
  return `
CRITICAL WINE DETAIL EXTRACTION:
1. You MUST extract and include ALL details from the wine document
2. Include ALL tasting notes, aromas, flavor profiles, and characteristics
3. Extract ALL information even if it's embedded in HTML tags
4. Pay special attention to descriptions of color, aroma, taste, and finish
5. NEVER state "no tasting notes available" if any form of description exists
6. ALWAYS include the specific price in dollars if available
7. ALWAYS state the vintage year at the beginning of your response
8. For suggestions, ONLY recommend actual wines from Milea Estate Vineyard
`;
}
```

## Wine Price Queries

The system handles price-specific queries about wines:

```javascript
// Check for price-specific queries
const isPriceQuery = searchLower.startsWith("how much is") || 
                    searchLower.includes("price of") || 
                    searchLower.includes("cost of") || 
                    searchLower.startsWith("what is the price of") ||
                    (searchLower.includes("how much does") && searchLower.includes("cost"));

// Extract wine name from price query if applicable
let wineName = searchTerm;
if (isPriceQuery) {
  if (searchLower.startsWith("how much is")) {
    wineName = searchTerm.substring("how much is".length).trim();
  } else if (searchLower.includes("price of")) {
    wineName = searchLower.split("price of")[1].trim();
  } else if (searchLower.includes("cost of")) {
    wineName = searchLower.split("cost of")[1].trim();
  } else if (searchLower.startsWith("what is the price of")) {
    wineName = searchTerm.substring("what is the price of".length).trim();
  } else if ((searchLower.includes("how much does")) && (searchLower.includes("cost"))) {
    wineName = searchLower.split("how much does")[1].split("cost")[0].trim();
  }
  
  // Remove leading 'the' if present
  if (wineName.toLowerCase().startsWith("the ")) {
    wineName = wineName.substring(4).trim();
  }
}
```

## Conclusion

The Milea Estate Vineyard wine catalog uses a structured approach to document wines, with consistent file naming conventions and markdown structure. The system provides specialized handling for different wine types and varieties, with particular attention to the vineyard's signature wines like Cabernet Franc, Proceedo, and rosé varieties. The comprehensive list of wines includes detailed information about each wine's properties, enabling accurate and informative responses to user queries about the vineyard's offerings.