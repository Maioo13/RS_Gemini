const fs = require('fs');
const glob = require('glob');

// 1. UPDATE ALL HTML FILES (Remove from footer)
const htmlFiles = glob.sync('*.html');
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove the footer link
  content = content.replace(/<a href="#" id="revoke-cookie-consent"[^>]*>.*?<\/a>/g, '');

  // Add the button inside privacy.html
  if (file === 'privacy.html') {
    const sec5EndRegex = /(<span data-translate="privacy_sec5_li3">.*?<\/span>\s*<\/li>\s*<\/ul>)/;
    if (sec5EndRegex.test(content) && !content.includes('revoke-cookie-consent-btn')) {
      content = content.replace(sec5EndRegex, `$1\n            <div class="mt-6 mb-2 p-4 bg-[#f8f4f2] rounded-xl border border-[#f3eae7] flex flex-col items-start gap-3">\n              <p class="text-[#1c110d] text-sm md:text-base font-bold" data-translate="privacy_manage_cookies">Gestisci Preferenze Privacy</p>\n              <p class="text-[#9b604b] text-xs md:text-sm" id="cookie-status-msg"></p>\n              <button id="revoke-cookie-consent-btn" class="px-5 py-2 bg-[#e63f11] text-white rounded-full text-sm font-bold tracking-[0.015em] transition-opacity hover:opacity-90">Resetta Preferenze</button>\n            </div>`);
    }
  }

  fs.writeFileSync(file, content);
  console.log(`Updated HTML: ${file}`);
});

// 2. REWRITE COOKIE CONSENT JS
const cookieJsPath = 'js/cookie-consent.js';
const newCookieJs = `document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('cookie-accept');
  const rejectBtn = document.getElementById('cookie-reject');

  // Controllo solido del LocalStorage per ricordare la scelta ed evitare che il banner ricompaia
  const consentValue = localStorage.getItem('cookie_consent');
  
  if (banner && !consentValue) {
    // Mostra il banner SOLO se non c'è traccia del consenso
    setTimeout(() => {
      banner.classList.remove('translate-y-full');
    }, 400);
  }

  const handleConsent = (choice) => {
    try {
      localStorage.setItem('cookie_consent', choice || 'accepted');
    } catch (e) {
      console.warn('LocalStorage non disponibile', e);
    }
    if (banner) {
      banner.classList.add('translate-y-full');
    }
    updatePrivacyPageStatus();
  };

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => handleConsent('accepted'));
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => handleConsent('acknowledged'));
  }

  // --- Integrazione nella pagina Informativa Privacy ---
  const revokeBtn = document.getElementById('revoke-cookie-consent-btn');
  const statusMsg = document.getElementById('cookie-status-msg');
  
  function updatePrivacyPageStatus() {
    if (!statusMsg) return;
    const currentConsent = localStorage.getItem('cookie_consent');
    if (currentConsent) {
      statusMsg.textContent = "Hai già espresso le tue preferenze sui dati tecnici.";
      revokeBtn.style.display = "inline-block";
    } else {
      statusMsg.textContent = "Nessuna preferenza salvata al momento.";
      revokeBtn.style.display = "none";
    }
  }

  if (revokeBtn) {
    revokeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem('cookie_consent');
      } catch (err) {}
      
      updatePrivacyPageStatus();
      
      if (banner) {
        banner.classList.remove('translate-y-full');
      } else {
        alert("Preferenze resettate! Il banner riapparirà al prossimo caricamento.");
        window.location.reload();
      }
    });
    updatePrivacyPageStatus();
  }
});
`;
fs.writeFileSync(cookieJsPath, newCookieJs);
console.log('Updated js/cookie-consent.js');
