// Sistema di cambio lingua ottimizzato per Run Society
class LanguageSwitcher {
  constructor() {
    this.translations = {};
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    this.currentLang = (urlLang === 'en' || urlLang === 'it') ? urlLang : (localStorage.getItem('preferred-language') || 'it');
    if (urlLang) {
      localStorage.setItem('preferred-language', this.currentLang);
    }
    this.init();
  }

  async init() {
    try {
      await this.loadTranslations();
      this.setupEventListeners();
      this.updateLanguageDisplay();
      this.translatePage();
    } catch (error) {
      console.error('Errore nell\'inizializzazione del cambio lingua:', error);
    }
  }

  async loadTranslations() {
    try {
      const response = await fetch('data/translations.json');
      if (!response.ok) throw new Error('Network response was not ok');
      this.translations = await response.json();
    } catch (error) {
      console.error('Errore nel caricamento delle traduzioni:', error);
    }
  }

  setupEventListeners() {
    const handleLinkClick = (link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const dataLang = link.getAttribute('data-lang');
        const href = link.getAttribute('href') || '';
        const lang = dataLang || (href.includes('lang=en') ? 'en' : 'it');
        this.switchLanguage(lang);
      });
    };

    document.querySelectorAll('#langMenu a, #langMenuMobile a').forEach(handleLinkClick);
  }

  switchLanguage(lang) {
    if (lang !== 'it' && lang !== 'en') lang = 'it';
    this.currentLang = lang;
    localStorage.setItem('preferred-language', lang);
    document.documentElement.lang = lang;
    this.updateLanguageDisplay();
    this.translatePage();
    this.closeLanguageMenus();

    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    if (typeof window.updateCalendar === 'function') {
      window.updateCalendar();
    }
    if (typeof window.renderEvents === 'function') {
      window.renderEvents();
    }
  }

  closeLanguageMenus() {
    const langMenu = document.getElementById('langMenu');
    const langMenuMobile = document.getElementById('langMenuMobile');

    if (langMenu) langMenu.classList.add('hidden');
    if (langMenuMobile) langMenuMobile.classList.add('hidden');
  }

  updateLanguageDisplay() {
    const uppercaseLang = this.currentLang.toUpperCase();
    const langButton = document.querySelector('#langMenuButton span');
    if (langButton) {
      langButton.textContent = uppercaseLang;
    }

    const langButtonMobile = document.querySelector('#langMenuButtonMobile span');
    if (langButtonMobile) {
      langButtonMobile.textContent = uppercaseLang;
    }
  }

  translatePage() {
    if (!this.translations[this.currentLang]) return;

    const translations = this.translations[this.currentLang];
    document.documentElement.lang = this.currentLang;

    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      if (translations[key]) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translations[key];
        } else {
          element.textContent = translations[key];
        }
      }
    });

    if (translations.site_title && document.title.includes('Run Society')) {
      const currentTitle = document.title;
      const parts = currentTitle.split('|');
      if (parts.length > 1) {
        document.title = parts[0].trim() + ' | ' + translations.site_title;
      } else {
        document.title = translations.site_title;
      }
    }
  }
}

// Inizializza il sistema quando la pagina è pronta
document.addEventListener('DOMContentLoaded', () => {
  window.languageSwitcher = new LanguageSwitcher();
});
