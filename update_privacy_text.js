const fs = require('fs');
let data = JSON.parse(fs.readFileSync('data/translations.json', 'utf8'));

data['it']['privacy_sec5_li3'] = "Hosting e Risorse Esterne: il sito è ospitato staticamente su GitHub Pages e include font Google Fonts, Tailwind CSS tramite CDN pubbliche e Google Maps per l'interazione con le mappe. Il caricamento di tali servizi terzi comporta necessariamente il trasferimento tecnico dell'indirizzo IP del visitatore ai loro server in modo automatico per l'erogazione del servizio.";
data['en']['privacy_sec5_li3'] = "Hosting & External Assets: the website is statically hosted on GitHub Pages and loads Google Fonts, Tailwind CSS via public CDNs, and Google Maps for map interactions. Loading these third-party services necessarily involves the technical transfer of the visitor's IP address to their servers automatically to provide the service.";

fs.writeFileSync('data/translations.json', JSON.stringify(data, null, 2));
