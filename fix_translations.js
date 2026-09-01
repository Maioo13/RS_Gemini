const fs = require('fs');
let content = fs.readFileSync('data/translations.json', 'utf8');
const data = JSON.parse(content);

// IT
data.it.privacy_sec2_li1 = "Modulo Contatti (Nome, Email, Oggetto e Messaggio): utilizzati esclusivamente per rispondere alle tue richieste informative. Base giuridica: esecuzione di misure precontrattuali o riscontro alla richiesta dell'interessato (Art. 6.1.b GDPR). Il servizio si appoggia all'infrastruttura di Formspree Inc. (USA), la quale aderisce formalmente al Data Privacy Framework stipulato tra Unione Europea e Stati Uniti, garantendo così un livello di protezione dei dati adeguato e lecito (Art. 45 GDPR) durante il trasferimento transfrontaliero.";

data.it.privacy_sec2_li_ip = "Dati Tecnici di Sicurezza (Indirizzo IP): Per garantire la sicurezza dell'infrastruttura e prevenire frodi o attacchi informatici (es. brute-force nell'area amministrativa), il sistema elabora e conserva temporaneamente l'indirizzo IP dell'utente nella memoria volatile del server per il rate-limiting. La base giuridica è il legittimo interesse del Titolare (Art. 6.1.f GDPR). Tali dati vengono automaticamente cancellati entro 15 minuti e non sono mai incrociati con altre informazioni identificative.";

// EN
data.en.privacy_sec2_li1 = "Contact Form (Name, Email, Subject, and Message): used exclusively to respond to your inquiries. Legal basis: performance of pre-contractual measures (Art. 6.1.b GDPR). The service relies on the infrastructure of Formspree Inc. (USA), which formally adheres to the EU-US Data Privacy Framework, thus ensuring an adequate and lawful level of data protection (Art. 45 GDPR) during cross-border transfer.";

data.en.privacy_sec2_li_ip = "Technical Security Data (IP Address): To ensure infrastructure security and prevent fraud or cyber attacks (e.g., brute-force on the admin area), the system temporarily processes and stores the user's IP address in the server's volatile memory for rate-limiting purposes. The legal basis is the legitimate interest of the Data Controller (Art. 6.1.f GDPR). These data are automatically deleted within 15 minutes and are never cross-referenced with other identifying information.";

fs.writeFileSync('data/translations.json', JSON.stringify(data, null, 2));
