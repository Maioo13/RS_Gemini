const fs = require('fs');

// 1. Update server.js
let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = serverJs.replace(
  /exp: Date\.now\(\) \+ 8 \* 3600 \* 1000, \/\/ 8 ore/g,
  'exp: Date.now() + 15 * 60 * 1000, // 15 minuti'
);
serverJs = serverJs.replace(
  /maxAge: 8 \* 3600 \* 1000,/g,
  'maxAge: 15 * 60 * 1000,'
);
fs.writeFileSync('server.js', serverJs);

// 2. Update privacy.html
let privacyHtml = fs.readFileSync('privacy.html', 'utf8');
const newAdminCookie = `              <li class="flex items-start gap-2.5">
                <span class="text-[#e63f11] font-bold mt-0.5">•</span>
                <span data-translate="privacy_sec5_li4">Cookie di Amministrazione: Oltre al LocalStorage utilizzato per l'interfaccia pubblica, si fa presente che l'infrastruttura backend (server Node.js) genera un cookie di sessione temporaneo ed esclusivamente tecnico (denominato <code>rs_admin_session</code>) avente una durata di 15 minuti, <strong>unicamente per il personale autorizzato</strong> che accede all'Area di Amministrazione riservata. Tale cookie non viene mai generato per o assegnato ai normali visitatori del sito.</span>
              </li>`;

// Insert after privacy_sec5_li3
const insertionPointRegex = /(<span data-translate="privacy_sec5_li3">.*?<\/span>\s*<\/li>)/;
privacyHtml = privacyHtml.replace(insertionPointRegex, `$1\n${newAdminCookie}`);
fs.writeFileSync('privacy.html', privacyHtml);

// 3. Update translations.json
let translationsStr = fs.readFileSync('data/translations.json', 'utf8');
let translations = JSON.parse(translationsStr);

translations.it.privacy_sec5_li4 = "Cookie di Amministrazione: Oltre al LocalStorage utilizzato per l'interfaccia pubblica, si fa presente che l'infrastruttura backend (server Node.js) genera un cookie di sessione temporaneo ed esclusivamente tecnico (denominato rs_admin_session) avente una durata di 15 minuti, unicamente per il personale autorizzato che accede all'Area di Amministrazione riservata. Tale cookie non viene mai generato per o assegnato ai normali visitatori del sito.";

translations.en.privacy_sec5_li4 = "Administration Cookie: In addition to the LocalStorage used for the public interface, please note that the backend infrastructure (Node.js server) generates a temporary and exclusively technical session cookie (named rs_admin_session) with a duration of 15 minutes, solely for authorized personnel accessing the reserved Administration Area. This cookie is never generated for or assigned to normal site visitors.";

fs.writeFileSync('data/translations.json', JSON.stringify(translations, null, 2));

console.log('Done!');
