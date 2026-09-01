document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('cookie-accept');
  

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
