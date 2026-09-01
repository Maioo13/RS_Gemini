const fs = require('fs');
let data = JSON.parse(fs.readFileSync('data/translations.json', 'utf8'));

data['it']['cookie_text'] = "Utilizziamo esclusivamente la memoria locale per preferenze tecniche (es. lingua). Non usiamo cookie di profilazione. Il sito si appoggia a servizi tecnici di terze parti (CDN, Google Fonts, Formspree, Google Maps) che potrebbero acquisire il tuo indirizzo IP per permettere l'erogazione di mappe, font e funzionalità di contatto necessarie.";
data['en']['cookie_text'] = "We only use local memory for technical preferences (e.g. language). We don't use profiling cookies. The site relies on third-party technical services (CDN, Google Fonts, Formspree, Google Maps) which might acquire your IP address to provide necessary maps, fonts, and contact features.";

fs.writeFileSync('data/translations.json', JSON.stringify(data, null, 2));
