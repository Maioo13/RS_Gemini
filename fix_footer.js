const fs = require('fs');
const glob = require('glob');

const htmlFiles = glob.sync('*.html');
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Rimuovi il pipe aggiunto erroneamente
  content = content.replace(
    /<span class="text-\[#9b604b\] text-sm md:text-base font-normal leading-normal">\s*\|\s*<\/span>\s*/g,
    ''
  );

  fs.writeFileSync(file, content);
  console.log(`Updated footer in HTML: ${file}`);
});
