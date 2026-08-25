/**
 * FAQ Accordion Component for Run Society
 * Fully accessible (WAI-ARIA compliant), responsive, and animated.
 */
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  const faqButtons = Array.from(document.querySelectorAll('.faq-trigger'));

  faqButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const targetId = button.getAttribute('aria-controls');
      const panel = document.getElementById(targetId);
      const icon = button.querySelector('.faq-chevron');
      const card = button.closest('.faq-item');

      if (!panel) return;

      // Optional: If you want accordion mode (only 1 open at a time), uncomment:
      /*
      faqButtons.forEach(otherBtn => {
        if (otherBtn !== button && otherBtn.getAttribute('aria-expanded') === 'true') {
          const otherPanel = document.getElementById(otherBtn.getAttribute('aria-controls'));
          const otherIcon = otherBtn.querySelector('.faq-chevron');
          const otherCard = otherBtn.closest('.faq-item');
          otherBtn.setAttribute('aria-expanded', 'false');
          if (otherPanel) {
            otherPanel.classList.remove('grid-rows-[1fr]');
            otherPanel.classList.add('grid-rows-[0fr]');
          }
          if (otherIcon) otherIcon.classList.remove('rotate-180', 'bg-[#e63f11]', 'text-white');
          if (otherCard) otherCard.classList.remove('border-[#e63f11]/30', 'bg-[#fffcfb]');
        }
      });
      */

      if (isExpanded) {
        button.setAttribute('aria-expanded', 'false');
        panel.classList.remove('grid-rows-[1fr]');
        panel.classList.add('grid-rows-[0fr]');
        if (icon) {
          icon.classList.remove('rotate-180', 'bg-[#e63f11]', 'text-white');
          icon.classList.add('bg-[#f8f4f2]', 'text-[#9b604b]');
        }
        if (card) {
          card.classList.remove('border-[#e63f11]/30', 'bg-[#fffcfb]', 'shadow-sm');
          card.classList.add('border-[#f3eae7]', 'bg-white');
        }
      } else {
        button.setAttribute('aria-expanded', 'true');
        panel.classList.remove('grid-rows-[0fr]');
        panel.classList.add('grid-rows-[1fr]');
        if (icon) {
          icon.classList.add('rotate-180', 'bg-[#e63f11]', 'text-white');
          icon.classList.remove('bg-[#f8f4f2]', 'text-[#9b604b]');
        }
        if (card) {
          card.classList.add('border-[#e63f11]/30', 'bg-[#fffcfb]', 'shadow-sm');
          card.classList.remove('border-[#f3eae7]', 'bg-white');
        }
      }
    });

    // Keyboard navigation between accordion headers (WAI-ARIA pattern)
    button.addEventListener('keydown', (e) => {
      let targetIndex = null;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        targetIndex = (index + 1) % faqButtons.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        targetIndex = (index - 1 + faqButtons.length) % faqButtons.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        targetIndex = faqButtons.length - 1;
      }

      if (targetIndex !== null) {
        faqButtons[targetIndex].focus();
      }
    });
  });
});
