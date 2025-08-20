#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read the HAR file
const harFilePath = process.argv[2];
if (!harFilePath) {
  console.error('Please provide the path to the HAR file as an argument');
  process.exit(1);
}

try {
  // Read and parse the HAR file
  const harContent = JSON.parse(fs.readFileSync(harFilePath, 'utf8'));
  
  // Create output directory
  const outputDirName = path.basename(harFilePath, path.extname(harFilePath)) + '_extracted';
  const outputDir = path.join(path.dirname(harFilePath), outputDirName);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  // Extract and save entries
  if (harContent.log && Array.isArray(harContent.log.entries)) {
    console.log(`Found ${harContent.log.entries.length} entries in the HAR file.`);
    
    // Save the overall structure without entry details
    const harSummary = {
      log: {
        version: harContent.log.version,
        creator: harContent.log.creator,
        pages: harContent.log.pages,
        entries: harContent.log.entries.map((entry, index) => ({
          index: index,
          url: entry.request.url,
          method: entry.request.method,
          status: entry.response.status,
          startedDateTime: entry.startedDateTime
        }))
      }
    };
    
    fs.writeFileSync(
      path.join(outputDir, '00_summary.json'),
      JSON.stringify(harSummary, null, 2)
    );
    
    // Save individual entries
    harContent.log.entries.forEach((entry, index) => {
      // Create a sanitized filename from the URL
      let urlPart = entry.request.url
        .replace(/https?:\/\//, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50); // Limit length to avoid too long filenames
      
      const filename = `${index.toString().padStart(2, '0')}_${entry.request.method}_${urlPart}.json`;
      
      fs.writeFileSync(
        path.join(outputDir, filename),
        JSON.stringify(entry, null, 2)
      );
      
      // Extract request and response content if available
      if (entry.request.postData && entry.request.postData.text) {
        fs.writeFileSync(
          path.join(outputDir, `${index.toString().padStart(2, '0')}_request_body.txt`),
          entry.request.postData.text
        );
      }
      
      if (entry.response.content && entry.response.content.text) {
        fs.writeFileSync(
          path.join(outputDir, `${index.toString().padStart(2, '0')}_response_body.txt`),
          entry.response.content.text
        );
      }
    });
    
    console.log(`Successfully extracted ${harContent.log.entries.length} entries to ${outputDir}`);
  } else {
    console.error('No entries found in the HAR file or invalid HAR format.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error processing HAR file:', error);
  process.exit(1);
}