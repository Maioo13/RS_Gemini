document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('cookie-accept');
  const rejectBtn = document.getElementById('cookie-reject');

  if (!banner || !acceptBtn || !rejectBtn) {
    return;
  }

  const consentValue = localStorage.getItem('cookie_consent');

  if (!consentValue) {
    setTimeout(() => {
      banner.classList.remove('translate-y-full', 'translate-y-[200%]');
    }, 500);
  }

  const handleConsent = (consentChoice) => {
    localStorage.setItem('cookie_consent', consentChoice);
    banner.classList.add('translate-y-full');
  };

  acceptBtn.addEventListener('click', () => handleConsent('accepted'));
  rejectBtn.addEventListener('click', () => handleConsent('rejected'));
});
