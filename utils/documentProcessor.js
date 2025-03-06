const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

async function processDocuments(filePaths) {
  console.log(`📂 Processing ${filePaths.length} markdown files...`);

  let allChunks = [];

  for (const filePath of filePaths) {
    console.log(`✨ Processing file: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf-8');

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 80,
      separators: ["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""]
    });

    const chunks = await textSplitter.createDocuments(
      [content],
      [{ 
        source: path.basename(filePath),
        createdAt: new Date().toISOString()
      }]
    );

    console.log(`🧩 Created ${chunks.length} chunks from ${filePath}`);
    allChunks = [...allChunks, ...chunks];
  }

  console.log(`🏁 Total chunks created: ${allChunks.length}`);
  return allChunks;
}

module.exports = { processDocuments };
