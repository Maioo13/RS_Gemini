const fs = require('fs');
const path = require('path');

// 1. UPDATE TRANSLATIONS
try {
  let data = JSON.parse(fs.readFileSync('data/translations.json', 'utf8'));

  if (data.it) {
    data.it.cookie_text = "Utilizziamo esclusivamente la memoria locale per preferenze tecniche (es. lingua). Non usiamo cookie di profilazione. Il sito si appoggia a servizi tecnici di terze parti (CDN Tailwind, Formspree, Google Maps) che potrebbero acquisire il tuo indirizzo IP per permettere l'erogazione di mappe e funzionalità di contatto necessarie.";
    data.it.privacy_sec5_li3 = "Hosting e Risorse Esterne: il sito è ospitato su GitHub Pages e i font tipografici sono ospitati localmente per garantire la massima tutela della privacy (nessun trasferimento IP a Google Fonts). Include Tailwind CSS tramite CDN pubblica e Google Maps per l'interazione con le mappe. Il caricamento di tali servizi comporta il trasferimento tecnico dell'indirizzo IP del visitatore ai loro server per l'erogazione del servizio.";
  }
  if (data.en) {
    data.en.cookie_text = "We only use local memory for technical preferences (e.g. language). We don't use profiling cookies. The site relies on third-party technical services (Tailwind CDN, Formspree, Google Maps) which might acquire your IP address to provide necessary maps and contact features.";
    data.en.privacy_sec5_li3 = "Hosting & External Assets: the website is hosted on GitHub Pages and typographic fonts are hosted locally to ensure maximum privacy protection (no IP transfer to Google Fonts). It includes Tailwind CSS via public CDN and Google Maps for map interactions. Loading these third-party services involves the technical transfer of the visitor's IP address to their servers to provide the service.";
  }

  fs.writeFileSync('data/translations.json', JSON.stringify(data, null, 2));
  console.log("Updated translations.json");
} catch (err) {
  console.error("Translations error:", err);
}

// 2. UPDATE HTML FILES
const files = fs.readdirSync('.').filter(file => file.endsWith('.html'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove Google Fonts
  content = content.replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com"[^>]*>\s*/g, '');
  content = content.replace(/<link[^>]*href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '');
  content = content.replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>\s*/g, '');

  // Add local fonts.css
  if (!content.includes('<link rel="stylesheet" href="/fonts.css" />')) {
    content = content.replace(/(<\/head>)/, '  <link rel="stylesheet" href="/fonts.css" />\n$1');
  }

  // Update hardcoded cookie text
  content = content.replace(/Utilizziamo esclusivamente la memoria locale.*?necessarie\./g, "Utilizziamo esclusivamente la memoria locale per preferenze tecniche (es. lingua). Non usiamo cookie di profilazione. Il sito si appoggia a servizi tecnici di terze parti (CDN Tailwind, Formspree, Google Maps) che potrebbero acquisire il tuo indirizzo IP per permettere l'erogazione di mappe e funzionalità di contatto necessarie.");

  fs.writeFileSync(file, content);
  console.log("Updated", file);
});
