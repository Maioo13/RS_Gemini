const fs = require('fs');
const glob = require('glob');
const path = require('path');

// 1. UPDATE ALL HTML FILES
const htmlFiles = glob.sync('*.html');
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace Tailwind CDN with local CSS
  content = content.replace(
    /<script src="https:\/\/cdn\.tailwindcss\.com\?plugins=forms,container-queries"><\/script>\s*/g,
    '<link rel="stylesheet" href="/css/styles.css" />\n  '
  );

  // Fallback if the link wasn't EXACTLY that
  content = content.replace(
    /<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>\s*/g,
    '<link rel="stylesheet" href="/css/styles.css" />\n  '
  );

  // Add the "Gestisci Preferenze Privacy" link to the footer if it doesn't exist
  if (!content.includes('id="revoke-cookie-consent"')) {
    const footerPrivacyRegex = /(<a[^>]*href="privacy\.html"[^>]*data-translate="privacy_policy"[^>]*>Informativa Privacy<\/a>)/;
    if (footerPrivacyRegex.test(content)) {
      content = content.replace(footerPrivacyRegex, `$1\n            <span class="text-[#9b604b] text-sm md:text-base font-normal leading-normal"> | </span>\n            <a href="#" id="revoke-cookie-consent" class="text-[#9b604b] text-sm md:text-base font-normal leading-normal hover:text-[#e63f11] transition-colors" data-translate="privacy_manage_cookies">Gestisci Preferenze Privacy</a>`);
    } else {
      // Fallback for some pages that might not have exactly this
      const fallbackRegex = /(<a[^>]*href="privacy\.html"[^>]*>Informativa Privacy<\/a>)/;
      content = content.replace(fallbackRegex, `$1\n            <span class="text-[#9b604b] text-sm md:text-base font-normal leading-normal"> | </span>\n            <a href="#" id="revoke-cookie-consent" class="text-[#9b604b] text-sm md:text-base font-normal leading-normal hover:text-[#e63f11] transition-colors" data-translate="privacy_manage_cookies">Gestisci Preferenze Privacy</a>`);
    }
  }

  // Update contact form transparency
  if (file === 'contatti.html') {
    content = content.replace(
      /Ho letto l'<a href="\/privacy\.html" target="_blank" class="text-\[#e63f11\] underline">Informativa sulla Privacy<\/a> e acconsento al trattamento dei miei dati per la gestione di questa richiesta\./,
      "Ho letto l'<a href=\"/privacy.html\" target=\"_blank\" class=\"text-[#e63f11] underline\">Informativa sulla Privacy</a> e acconsento al trattamento dei dati. Sono consapevole che questo modulo si appoggia al servizio esterno Formspree (USA) per il recapito sicuro dei messaggi."
    );
  }

  fs.writeFileSync(file, content);
  console.log(`Updated HTML: ${file}`);
});

// 2. UPDATE TRANSLATIONS
try {
  let transPath = 'data/translations.json';
  if (fs.existsSync(transPath)) {
    let trans = JSON.parse(fs.readFileSync(transPath, 'utf8'));
    
    if (trans.it) {
      trans.it.privacy_manage_cookies = "Gestisci Preferenze Privacy";
      trans.it.contact_privacy_consent = "Ho letto l'<a href=\"/privacy.html\" target=\"_blank\" class=\"text-[#e63f11] underline\">Informativa sulla Privacy</a> e acconsento al trattamento dei dati. Sono consapevole che questo modulo si appoggia al servizio esterno Formspree (USA) per il recapito sicuro dei messaggi.";
    }
    if (trans.en) {
      trans.en.privacy_manage_cookies = "Manage Privacy Preferences";
      trans.en.contact_privacy_consent = "I have read the <a href=\"/privacy.html\" target=\"_blank\" class=\"text-[#e63f11] underline\">Privacy Policy</a> and consent to the processing of data. I am aware that this form relies on the external service Formspree (USA) for secure message delivery.";
    }

    fs.writeFileSync(transPath, JSON.stringify(trans, null, 2));
    console.log('Updated translations.json');
  }
} catch (err) {
  console.error(err);
}

// 3. UPDATE COOKIE CONSENT JS
let cookieJsPath = 'js/cookie-consent.js';
if (fs.existsSync(cookieJsPath)) {
  let cookieJs = fs.readFileSync(cookieJsPath, 'utf8');
  if (!cookieJs.includes('revoke-cookie-consent')) {
    cookieJs += `\n
  const revokeBtn = document.getElementById('revoke-cookie-consent');
  if (revokeBtn) {
    revokeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem('cookie_consent');
      } catch (err) {}
      banner.classList.remove('translate-y-full');
    });
  }\n`;
    fs.writeFileSync(cookieJsPath, cookieJs);
    console.log('Updated js/cookie-consent.js');
  }
}

