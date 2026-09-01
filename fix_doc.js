const fs = require('fs');

// 1. Update translations.json
let trans = JSON.parse(fs.readFileSync('data/translations.json', 'utf8'));

trans.it.privacy_sec5_li3 = "Hosting e Risorse Esterne necessarie: Il sito è ospitato sull'infrastruttura statica di GitHub Pages (Microsoft) e utilizza i widget di Google Maps. Tali servizi tecnici sono strettamente necessari all'erogazione della piattaforma. Entrambi i fornitori aderiscono al Data Privacy Framework stipulato tra UE e USA, garantendo la totale liceità (Art. 45 GDPR) del fisiologico trasferimento dell'indirizzo IP del visitatore al momento della connessione.";

trans.en.privacy_sec5_li3 = "Necessary Hosting and External Resources: The site is hosted on the static infrastructure of GitHub Pages (Microsoft) and uses Google Maps widgets. These technical services are strictly necessary for the platform's delivery. Both providers adhere to the EU-US Data Privacy Framework, guaranteeing the full lawfulness (Art. 45 GDPR) of the physiological transfer of the visitor's IP address upon connection.";

fs.writeFileSync('data/translations.json', JSON.stringify(trans, null, 2));

// 2. Update privacy.html
let html = fs.readFileSync('privacy.html', 'utf8');
const newHtml = `<span data-translate="privacy_sec5_li3">Hosting e Risorse Esterne necessarie: Il sito è ospitato sull'infrastruttura statica di GitHub Pages (Microsoft) e utilizza i widget di Google Maps. Tali servizi tecnici sono strettamente necessari all'erogazione della piattaforma. Entrambi i fornitori aderiscono al Data Privacy Framework stipulato tra UE e USA, garantendo la totale liceità (Art. 45 GDPR) del fisiologico trasferimento dell'indirizzo IP del visitatore al momento della connessione.</span>`;

html = html.replace(/<span data-translate="privacy_sec5_li3">[\s\S]*?<\/span>/, newHtml);
fs.writeFileSync('privacy.html', html);

console.log("Documentation updated successfully!");
