// NUOVA VERSIONE DI js/popup.js

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('map-modal');
  const modalTitle = document.getElementById('map-modal-title');
  const modalCloseBtn = document.getElementById('map-modal-close');
  const mapIframe = document.getElementById('map-iframe');

  // La funzione ora accetta un nome personalizzato
  window.openMapModal = function(locationKey, customUrl = null, customName = null) {
    if (!modal || !modalTitle || !mapIframe) return;

    let locationName = "Mappa";
    let mapUrl = customUrl;

    // Se è una location predefinita
    if (!customUrl && window.locations && window.locations[locationKey]) {
      const locationData = window.locations[locationKey];
      locationName = locationData.name;
      mapUrl = locationData.url;
    }
    // Se è una location personalizzata
    else if (customUrl && customName) {
      locationName = customName; // Usa il nome passato come parametro!
    }
    // Fallback
    else if (customUrl) {
      locationName = "Luogo dell'evento";
    }

    if (mapUrl) {
      modalTitle.textContent = locationName;
      mapIframe.src = mapUrl;
      modal.classList.add('is-open');
    }
  }

  // Listener per chiudere il modal (invariati)
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => modal.classList.remove('is-open'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('is-open');
      }
    });
  }
});
