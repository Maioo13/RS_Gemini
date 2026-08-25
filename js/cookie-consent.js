document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('cookie-accept');
  const rejectBtn = document.getElementById('cookie-reject');

  if (!banner) {
    return;
  }

  const consentValue = localStorage.getItem('cookie_consent');

  if (!consentValue) {
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
    banner.classList.add('translate-y-full');
  };

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => handleConsent('accepted'));
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => handleConsent('acknowledged'));
  }
});

