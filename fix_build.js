const fs = require('fs');
const glob = require('glob');

// 1. Update package.json
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.build = "tailwindcss -i ./input.css -o ./css/style.css --minify";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

// 2. Clean HTML files
const htmlFiles = glob.sync('*.html');
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace absolute CSS paths with relative ones
  content = content.replace(/href="\/css\//g, 'href="css/');
  content = content.replace(/href="\/fonts\.css"/g, 'href="fonts.css"');
  
  // Remove the old styles.css link if present, to avoid confusion
  content = content.replace(/<link rel="stylesheet" href="css\/styles\.css" \/>\s*/g, '');
  
  fs.writeFileSync(file, content);
});

console.log("Fixes applied!");
