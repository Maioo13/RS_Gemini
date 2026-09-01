const fs = require('fs');
const glob = require('glob');

const oldText = 'Utilizziamo cookie essenziali per garantire il corretto funzionamento del sito. Non utilizziamo cookie di tracciamento o di profilazione.';
const newText = "Utilizziamo esclusivamente la memoria locale per preferenze tecniche (es. lingua). Non usiamo cookie di profilazione. Il sito si appoggia a servizi tecnici di terze parti (CDN, Google Fonts, Formspree, Google Maps) che potrebbero acquisire il tuo indirizzo IP per permettere l'erogazione di mappe, font e funzionalità di contatto necessarie.";

glob('*.html', (err, files) => {
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldText)) {
      content = content.replace(oldText, newText);
      fs.writeFileSync(file, content);
      console.log('Patched ' + file);
    }
  });
});
