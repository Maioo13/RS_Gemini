const fs = require('fs');

const glob = require('glob');

async function run() {
  const files = await glob.glob('*.html');
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/Utilizziamo esclusivamente la memoria locale.*necessarie\./g, "Utilizziamo esclusivamente la memoria locale per preferenze tecniche (es. lingua). Non usiamo cookie di profilazione. Il sito si appoggia a servizi tecnici di terze parti (CDN, Google Fonts, Formspree, Google Maps) che potrebbero acquisire il tuo indirizzo IP per permettere l'erogazione di mappe, font e funzionalità di contatto necessarie.");
    fs.writeFileSync(file, content);
  });
}
run();
