// Sistema di cambio lingua per Run Society
class LanguageSwitcher {
  constructor() {
    this.translations = {};
    this.currentLang = localStorage.getItem('preferred-language') || 'it';
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
      this.translations = await response.json();
    } catch (error) {
      console.error('Errore nel caricamento delle traduzioni:', error);
    }
  }

  setupEventListeners() {
    // Gestisce i click sui link del menu lingua desktop
    const langMenuLinks = document.querySelectorAll('#langMenu a');
    langMenuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const lang = href.includes('lang=en') ? 'en' : 'it';
        this.switchLanguage(lang);
      });
    });

    // Gestisce i click sui link del menu lingua mobile
    const langMenuMobileLinks = document.querySelectorAll('#langMenuMobile a');
    langMenuMobileLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const lang = href.includes('lang=en') ? 'en' : 'it';
        this.switchLanguage(lang);
      });
    });
  }

  switchLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('preferred-language', lang);
    this.updateLanguageDisplay();
    this.translatePage();

    // Chiude i menu dopo la selezione
    this.closeLanguageMenus();
  }

  closeLanguageMenus() {
    const langMenu = document.getElementById('langMenu');
    const langMenuMobile = document.getElementById('langMenuMobile');

    if (langMenu) langMenu.classList.add('hidden');
    if (langMenuMobile) langMenuMobile.classList.add('hidden');
  }

  updateLanguageDisplay() {
    // Aggiorna il testo del bottone lingua desktop
    const langButton = document.querySelector('#langMenuButton span');
    if (langButton) {
      langButton.textContent = this.currentLang.toUpperCase();
    }

    // Aggiorna il testo del bottone lingua mobile
    const langButtonMobile = document.querySelector('#langMenuButtonMobile span');
    if (langButtonMobile) {
      langButtonMobile.textContent = this.currentLang.toUpperCase();
    }
  }

  translatePage() {
    if (!this.translations[this.currentLang]) return;

    const translations = this.translations[this.currentLang];

    // Traduce tutti gli elementi con attributo data-translate
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

    // Aggiorna il title della pagina se presente
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
  new LanguageSwitcher();
});
