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

      if (isExpanded) {
        button.setAttribute('aria-expanded', 'false');
        panel.classList.remove('is-open');
        panel.style.maxHeight = null;
        if (card) {
          card.classList.remove('is-open', 'border-[#e63f11]/30', 'bg-[#fffcfb]', 'shadow-sm');
          card.classList.add('border-[#f3eae7]', 'bg-white');
        }
        if (icon) {
          icon.classList.remove('rotate-180', 'bg-[#e63f11]', 'text-white');
          icon.classList.add('bg-[#f8f4f2]', 'text-[#9b604b]');
        }
      } else {
        button.setAttribute('aria-expanded', 'true');
        panel.classList.add('is-open');
        panel.style.maxHeight = (panel.scrollHeight + 32) + 'px';
        if (card) {
          card.classList.add('is-open', 'border-[#e63f11]/30', 'bg-[#fffcfb]', 'shadow-sm');
          card.classList.remove('border-[#f3eae7]', 'bg-white');
        }
        if (icon) {
          icon.classList.add('rotate-180', 'bg-[#e63f11]', 'text-white');
          icon.classList.remove('bg-[#f8f4f2]', 'text-[#9b604b]');
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

  // Re-adjust max-height on window resize if any panel is open
  window.addEventListener('resize', () => {
    faqButtons.forEach(button => {
      if (button.getAttribute('aria-expanded') === 'true') {
        const targetId = button.getAttribute('aria-controls');
        const panel = document.getElementById(targetId);
        if (panel) {
          panel.style.maxHeight = (panel.scrollHeight + 32) + 'px';
        }
      }
    });
  });

  // Re-adjust max-height when language changes
  window.addEventListener('languageChanged', () => {
    faqButtons.forEach(button => {
      if (button.getAttribute('aria-expanded') === 'true') {
        const targetId = button.getAttribute('aria-controls');
        const panel = document.getElementById(targetId);
        if (panel) {
          setTimeout(() => {
            panel.style.maxHeight = (panel.scrollHeight + 32) + 'px';
          }, 50);
        }
      }
    });
  });
});
