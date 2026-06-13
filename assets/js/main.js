// assets/js/main.js

(function() {
  'use strict';

  // --- Mobile Menu & Copyright Year ---
  function initGeneralScripts() {
    const btn = document.getElementById('mobileToggle');
    const menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    function openMenu() {
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      btn.querySelector('svg').innerHTML = '<line x1="3" y1="6" x2="21" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="18" x2="21" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
    }

    function closeMenu() {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      btn.querySelector('svg').innerHTML = '<line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
    }

    btn.addEventListener('click', function() {
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });

    window.closeMobileMenu = closeMenu;

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu();
      }
    });

    const yr = document.getElementById('current-year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  // --- Dynamic Menu Loading ---
  function renderMenuItem(item) {
    const isRow = item.layout === 'row';
    const cardClass = isRow ? 'retro-menu-card retro-menu-card-row' : 'retro-menu-card';
    const headerClass = item.isRedHeader ? 'retro-card-header header-red' : 'retro-card-header';
    const headerStyle = isRow ? 'style="min-width:180px;"' : '';
    const bodyClass = isRow ? 'retro-card-body retro-card-body-row' : 'retro-card-body';
    
    let tagsHTML = '';
    if (item.tags && item.tags.length > 0) {
      tagsHTML = `
        <div class="retro-card-tags">
          ${item.tags.map(tag => `<span class="retro-tag">${tag}</span>`).join('')}
        </div>
      `;
    }

    let innerBodyHTML = '';
    if (item.drinks && item.drinks.length > 0) {
      innerBodyHTML = `
        <div class="retro-drinks-list">
          ${item.drinks.map(drink => `<div class="retro-drink-row"><span>${drink}</span></div>`).join('')}
        </div>
      `;
    } else {
      innerBodyHTML = `<p class="retro-card-desc">${item.description}</p>${tagsHTML}`;
    }

    let imageHTML = '';
    if (item.image) {
      imageHTML = `
        <div class="retro-card-image-wrap">
          <img src="${item.image}" alt="${item.name}" class="retro-card-image" loading="lazy" width="600" height="450">
        </div>
      `;
    }

    return `
      <article class="${cardClass}">
        ${imageHTML}
        <div class="${headerClass}" ${headerStyle}>
          <h3 class="retro-card-name">${item.name}</h3>
        </div>
        <div class="${bodyClass}">
          ${innerBodyHTML}
        </div>
      </article>
    `;
  }

  function updateRestaurantSchema(data) {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      let targetScript = null;
      let restaurantData = null;

      for (const script of scripts) {
        if (!script.id || script.id !== 'dynamic-menu-schema') {
          try {
            const parsed = JSON.parse(script.text);
            if (parsed["@type"] === "Restaurant") {
              targetScript = script;
              restaurantData = parsed;
              break;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      if (targetScript && restaurantData) {
        const menuObject = {
          "@type": "Menu",
          "name": "Menú de Muñoz Burger",
          "hasMenuSection": data.categories.map(category => ({
            "@type": "MenuSection",
            "name": category.name,
            "hasMenuItem": category.items.map(item => ({
              "@type": "MenuItem",
              "name": item.name,
              "description": item.description || (item.drinks ? item.drinks.join(", ") : "")
            }))
          }))
        };

        restaurantData.hasMenu = menuObject;
        targetScript.text = JSON.stringify(restaurantData, null, 2);
        console.log('✅ Google Restaurant schema updated with menu items');
      } else {
        injectStandaloneMenuSchema(data);
      }
    } catch (error) {
      console.error('Error updating restaurant schema:', error);
    }
  }

  function injectStandaloneMenuSchema(data) {
    try {
      const menuSchema = {
        "@context": "https://schema.org",
        "@type": "Menu",
        "name": "Menú de Muñoz Burger",
        "hasMenuSection": data.categories.map(category => ({
          "@type": "MenuSection",
          "name": category.name,
          "hasMenuItem": category.items.map(item => ({
            "@type": "MenuItem",
            "name": item.name,
            "description": item.description || (item.drinks ? item.drinks.join(", ") : "")
          }))
        }))
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'dynamic-menu-schema';
      script.text = JSON.stringify(menuSchema);
      document.head.appendChild(script);
      console.log('✅ Standalone Google Menu schema injected');
    } catch (error) {
      console.error('Error injecting standalone menu schema:', error);
    }
  }

  async function loadMenu() {
    try {
      const response = await fetch('/assets/data/menu.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      data.categories.forEach(category => {
        let containerId;
        if (category.id === 'combos') {
          containerId = 'menu-combos-container';
        } else if (category.id === 'burgers') {
          containerId = 'menu-burgers-container';
        } else if (category.id === 'papas-drinks') {
          containerId = 'menu-papas-drinks-container';
        }
        
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = category.items.map(renderMenuItem).join('');
        }
      });

      // Update structured data for SEO
      updateRestaurantSchema(data);

    } catch (error) {
      console.error('Error loading menu:', error);
    }
  }

  // --- FAQ Accordion ---
  function initFaqAccordion() {
    const items = document.querySelectorAll('.retro-faq-item');
    items.forEach(item => {
      const question = item.querySelector('.retro-faq-question');
      const answer = item.querySelector('.retro-faq-answer');
      if (!question || !answer) return;

      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close other items
        items.forEach(otherItem => {
          if (otherItem !== item && otherItem.classList.contains('active')) {
            otherItem.classList.remove('active');
            otherItem.querySelector('.retro-faq-question').setAttribute('aria-expanded', 'false');
            const otherAns = otherItem.querySelector('.retro-faq-answer');
            otherAns.style.maxHeight = null;
            otherAns.setAttribute('aria-hidden', 'true');
          }
        });

        // Toggle current item
        if (isActive) {
          item.classList.remove('active');
          question.setAttribute('aria-expanded', 'false');
          answer.style.maxHeight = null;
          answer.setAttribute('aria-hidden', 'true');
        } else {
          item.classList.add('active');
          question.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          answer.setAttribute('aria-hidden', 'false');
        }
      });
    });
  }

  // --- Entry Point ---
  document.addEventListener('DOMContentLoaded', () => {
    initGeneralScripts();
    loadMenu();
    initFaqAccordion();
  });
})();
