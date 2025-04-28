const fs = require('fs');
const path = require('path');

// Process HTML files
const htmlFiles = ['popup', 'main', 'session-buddy', 'settings'];

console.log('Processing HTML files...');

htmlFiles.forEach(file => {
  const htmlPath = path.join(__dirname, '..', 'dist', `${file}.html`);
  
  if (fs.existsSync(htmlPath)) {
    try {
      let html = fs.readFileSync(htmlPath, 'utf8');
      
      // Replace script sources
      html = html.replace(
        /<script type="module" src="[^"]+\/([^"]+)\.ts"><\/script>/g,
        (match, name) => `<script type="module" src="assets/${name}.js"></script>`
      );
      
      fs.writeFileSync(htmlPath, html);
      console.log(`✅ Processed ${file}.html`);
    } catch (error) {
      console.error(`❌ Error processing ${file}.html:`, error.message);
    }
  } else {
    console.log(`⚠️ ${file}.html not found in dist directory`);
  }
});

console.log('HTML processing complete!'); 