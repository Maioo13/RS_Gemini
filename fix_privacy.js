const fs = require('fs');

let content = fs.readFileSync('privacy.html', 'utf8');

const newLi1 = `<span data-translate="privacy_sec2_li1">Modulo Contatti (Nome, Email, Oggetto e Messaggio): utilizzati esclusivamente per rispondere alle tue richieste informative. Base giuridica: esecuzione di misure precontrattuali o riscontro alla richiesta dell'interessato (Art. 6.1.b GDPR). Il servizio si appoggia all'infrastruttura di Formspree Inc. (USA), la quale aderisce formalmente al Data Privacy Framework stipulato tra Unione Europea e Stati Uniti, garantendo così un livello di protezione dei dati adeguato e lecito (Art. 45 GDPR) durante il trasferimento transfrontaliero.</span>`;

content = content.replace(/<span data-translate="privacy_sec2_li1">.*?<\/span>/, newLi1);

const newLiIP = `              <li class="flex items-start gap-2.5">
                <span class="text-[#e63f11] font-bold mt-0.5">•</span>
                <span>Dati Tecnici di Sicurezza (Indirizzo IP): Per garantire la sicurezza dell'infrastruttura e prevenire frodi o attacchi informatici (es. brute-force nell'area amministrativa), il sistema elabora e conserva temporaneamente l'indirizzo IP dell'utente nella memoria volatile del server per il rate-limiting. La base giuridica è il legittimo interesse del Titolare (Art. 6, par. 1, lett. f GDPR). Tali dati vengono automaticamente cancellati entro 15 minuti e non sono mai incrociati con altre informazioni identificative.</span>
              </li>`;

content = content.replace(/<li class="flex items-start gap-2.5">\s*<span class="text-\[#e63f11\] font-bold mt-0.5">•<\/span>\s*<\/li>/, newLiIP);

fs.writeFileSync('privacy.html', content);

// Add translation strings if they exist, but actually it's fine just to replace the HTML structure, 
// wait, the site uses a translation system `translations.json`. Let me check if `privacy_sec2_li1` is in there.
