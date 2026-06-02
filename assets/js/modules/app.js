/**
 * BRASAS SMOKEHOUSE PWA - MONOLITHIC ARCHITECTURE
 * Optimized for Mexico's mid-range mobile market
 * Performance-first, battery-conscious design
 */

// === CONFIGURATION & CONSTANTS ===
const APP_CONFIG = {
  name: 'Brasas Smokehouse',
  version: '2.0.0',
  market: 'mx-mobile',
  debug: location.hostname === 'localhost',
  
  // Performance tuning for mid-range Android devices
  performance: {
    lazyLoadThreshold: 100,
    animationThreshold: 2000, // Skip animations on slow devices
    imageQuality: 0.8,
    debounceDelay: 300,
    cacheTimeout: 300000, // 5 minutes
    maxConcurrentRequests: 3
  },
  
  // Business configuration
  business: {
    phone: '+526311093226',
    whatsapp: 'VE4RQVV7SXPSN1',
    address: 'Prolongación Álvaro Obregón 4257, Villa Sonora, Nogales, Sonora',
    hours: { open: '06:30', close: '23:00' },
    currency: 'MXN',
    timezone: 'America/Hermosillo'
  },
  
  // Feature flags for progressive enhancement
  features: {
    animations: true,
    pushNotifications: true,
    backgroundSync: true,
    webShare: true,
    installPrompt: true
  }
};

// === GLOBAL STATE MANAGEMENT ===
class AppState {
  constructor() {
    this.state = {
      cart: { items: [], total: 0, count: 0 },
      ui: { menuOpen: false, cartOpen: false, loading: false },
      business: { isOpen: false, nextChange: null },
      user: { location: null, preferences: {} },
      network: { online: navigator.onLine, speed: 'unknown' }
    };
    
    this.listeners = new Map();
    this.storage = new LocalStorageManager();
    
    this.initializeState();
  }
  
  initializeState() {
    // Load persisted cart
    const savedCart = this.storage.get('cart');
    if (savedCart) {
      this.state.cart = { ...this.state.cart, ...savedCart };
    }
    
    // Load user preferences
    const preferences = this.storage.get('preferences') || {};
    this.state.user.preferences = preferences;
    
    // Detect network conditions
    this.detectNetworkSpeed();
  }
  
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => this.listeners.get(key)?.delete(callback);
  }
  
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = { ...oldValue, ...value };
    
    // Persist critical state
    if (key === 'cart') {
      this.storage.set('cart', this.state.cart);
    }
    
    // Notify listeners
    this.listeners.get(key)?.forEach(callback => callback(this.state[key], oldValue));
  }
  
  getState(key) {
    return key ? this.state[key] : this.state;
  }
  
  detectNetworkSpeed() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.state.network.speed = connection.effectiveType || 'unknown';
      
      // Adjust performance based on connection
      if (['slow-2g', '2g'].includes(connection.effectiveType)) {
        APP_CONFIG.features.animations = false;
        APP_CONFIG.performance.imageQuality = 0.6;
      }
    }
  }
}

// === STORAGE MANAGER ===
class LocalStorageManager {
  constructor() {
    this.prefix = 'brasas_';
    this.fallback = new Map(); // In-memory fallback
  }
  
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      this.fallback.set(key, value);
    }
  }
  
  get(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : this.fallback.get(key);
    } catch (e) {
      return this.fallback.get(key);
    }
  }
  
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {
      this.fallback.delete(key);
    }
  }
  
  clear() {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {
      this.fallback.clear();
    }
  }
}

// === PERFORMANCE UTILITIES ===
class PerformanceManager {
  constructor() {
    this.perfObserver = null;
    this.metrics = {};
    this.initializePerformanceMonitoring();
  }
  
  initializePerformanceMonitoring() {
    // Core Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      this.perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics[entry.name] = entry.value;
        }
      });
      
      try {
        this.perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (e) {
        console.warn('Performance Observer not supported');
      }
    }
  }
  
  debounce(func, delay = APP_CONFIG.performance.debounceDelay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  throttle(func, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  lazy(callback, threshold = APP_CONFIG.performance.lazyLoadThreshold) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: `${threshold}px` });
    
    return (element) => observer.observe(element);
  }
  
  prefetch(url) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
  
  preload(url, as = 'fetch') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  }
}

// === CART MANAGEMENT ===
class CartManager {
  constructor(state, toast) {
    this.state = state;
    this.toast = toast;
    this.processing = false;
  }
  
  addItem(product) {
    if (this.processing) return false;
    this.processing = true;
    
    try {
      const cart = this.state.getState('cart');
      const existingItem = cart.items.find(item => item.title === product.title);
      
      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.subtotal = existingItem.price * existingItem.quantity;
      } else {
        cart.items.push({
          id: Date.now(),
          title: product.title,
          price: product.price,
          description: product.description || '',
          quantity: 1,
          subtotal: product.price
        });
      }
      
      this.updateCartTotals(cart);
      this.state.setState('cart', cart);
      
      this.toast.show(`✅ ${product.title} agregado al carrito`, 'success');
      
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      return true;
    } catch (error) {
      console.error('Cart add error:', error);
      this.toast.show('Error al agregar producto', 'error');
      return false;
    } finally {
      this.processing = false;
    }
  }
  
  removeItem(productId) {
    const cart = this.state.getState('cart');
    const itemIndex = cart.items.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
      const removedItem = cart.items[itemIndex];
      cart.items.splice(itemIndex, 1);
      this.updateCartTotals(cart);
      this.state.setState('cart', cart);
      
      this.toast.show(`🗑️ ${removedItem.title} eliminado`, 'info');
    }
  }
  
  updateQuantity(productId, quantity) {
    if (quantity < 1) {
      this.removeItem(productId);
      return;
    }
    
    const cart = this.state.getState('cart');
    const item = cart.items.find(item => item.id === productId);
    
    if (item) {
      item.quantity = quantity;
      item.subtotal = item.price * quantity;
      this.updateCartTotals(cart);
      this.state.setState('cart', cart);
    }
  }
  
  clearCart() {
    this.state.setState('cart', { items: [], total: 0, count: 0 });
    this.toast.show('🧹 Carrito vaciado', 'info');
  }
  
  updateCartTotals(cart) {
    cart.count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
  
  getFormattedTotal() {
    const total = this.state.getState('cart').total;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(total);
  }
}

// === TOAST NOTIFICATIONS ===
class ToastManager {
  constructor() {
    this.container = this.createContainer();
    this.toasts = new Set();
  }
  
  createContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-20 right-4 z-50 space-y-3';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Notificaciones');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }
  
  show(message, type = 'info', duration = 3000) {
    const toast = this.createToast(message, type);
    this.container.appendChild(toast);
    this.toasts.add(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }
    
    return toast;
  }
  
  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast p-4 rounded-xl shadow-lg text-white text-sm max-w-sm ${this.getTypeClass(type)}`;
    
    const emoji = this.getTypeEmoji(type);
    toast.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">${emoji}</span>
        <span>${message}</span>
        <button class="ml-auto text-white/80 hover:text-white" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;
    
    return toast;
  }
  
  getTypeClass(type) {
    const classes = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };
    return classes[type] || classes.info;
  }
  
  getTypeEmoji(type) {
    const emojis = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return emojis[type] || emojis.info;
  }
  
  remove(toast) {
    if (this.toasts.has(toast)) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          this.container.removeChild(toast);
        }
        this.toasts.delete(toast);
      }, 300);
    }
  }
  
  clear() {
    this.toasts.forEach(toast => this.remove(toast));
  }
}

// === BUSINESS LOGIC ===
class BusinessManager {
  constructor(state, toast) {
    this.state = state;
    this.toast = toast;
    this.updateInterval = null;
    
    this.init();
  }
  
  init() {
    this.updateBusinessStatus();
    this.updateInterval = setInterval(() => {
      this.updateBusinessStatus();
    }, 60000); // Update every minute
  }
  
  updateBusinessStatus() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const openTime = 6 * 60 + 30; // 06:30
    const closeTime = 23 * 60; // 23:00
    
    const isOpen = currentTime >= openTime && currentTime < closeTime;
    const nextChange = this.getNextStatusChange(now, isOpen);
    
    this.state.setState('business', { isOpen, nextChange });
    this.updateStatusDisplay(isOpen, nextChange);
  }
  
  getNextStatusChange(now, isOpen) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (isOpen) {
      // Next change is closing time today
      const closeTime = new Date(now);
      closeTime.setHours(23, 0, 0, 0);
      return closeTime;
    } else {
      // Next change is opening time (today or tomorrow)
      const openTime = new Date(now.getHours() < 6 ? now : tomorrow);
      openTime.setHours(6, 30, 0, 0);
      return openTime;
    }
  }
  
  updateStatusDisplay(isOpen, nextChange) {
    const statusElements = document.querySelectorAll('#business-status');
    const statusIndicators = document.querySelectorAll('#status-indicator');
    const statusTexts = document.querySelectorAll('#status-text');
    
    const statusClass = isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const indicatorClass = isOpen ? 'bg-green-500' : 'bg-red-500';
    const statusText = isOpen ? 'Abierto ahora' : 'Cerrado';
    
    statusElements.forEach(el => {
      el.className = `mt-4 flex items-center space-x-3 px-4 py-3 rounded-xl ${statusClass}`;
    });
    
    statusIndicators.forEach(el => {
      el.className = `w-3 h-3 rounded-full ${indicatorClass}`;
    });
    
    statusTexts.forEach(el => {
      el.textContent = statusText;
    });
  }
  
  copyAddress() {
    const address = APP_CONFIG.business.address;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address).then(() => {
        this.toast.show('📋 Dirección copiada al portapapeles', 'success');
      }).catch(() => {
        this.fallbackCopy(address);
      });
    } else {
      this.fallbackCopy(address);
    }
  }
  
  fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.toast.show('📋 Dirección copiada', 'success');
    } catch (err) {
      this.toast.show('❌ No se pudo copiar la dirección', 'error');
    }
    
    document.body.removeChild(textArea);
  }
  
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// === UI MANAGER ===
class UIManager {
  constructor(state, performance) {
    this.state = state;
    this.perf = performance;
    this.elements = {};
    this.observers = [];
    
    this.init();
  }
  
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupIntersectionObservers();
    this.initializeAnimations();
  }
  
  cacheElements() {
    this.elements = {
      // Cart elements
      cartBtn: document.getElementById('cart-btn'),
      mobileCartBtn: document.getElementById('mobile-cart-btn'),
      cartOverlay: document.getElementById('cart-overlay'),
      cartDrawer: document.getElementById('cart-drawer'),
      cartItemsContainer: document.getElementById('cart-items-container'),
      emptyCartMessage: document.getElementById('empty-cart-message'),
      cartFooter: document.getElementById('cart-footer'),
      cartTotal: document.getElementById('cart-total'),
      cartCount: document.querySelectorAll('[id*="cart-item-count"], [id*="cart-header-count"]'),
      
      // Navigation elements
      mobileMenuToggle: document.querySelectorAll('.mobile-menu-toggle'),
      mobileMenu: document.getElementById('mobile-navigation'),
      
      // Product elements
      addToCartButtons: document.querySelectorAll('.add-to-cart-btn'),
      productCards: document.querySelectorAll('.product-card'),
      
      // Category navigation
      categoryButtons: document.querySelectorAll('.category-nav-btn'),
      menuCategories: document.querySelectorAll('.menu-category')
    };
  }
  
  setupEventListeners() {
    // Cart functionality
    this.elements.cartBtn?.addEventListener('click', () => this.toggleCart());
    this.elements.mobileCartBtn?.addEventListener('click', () => this.toggleCart());
    this.elements.cartOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.cartOverlay) this.closeCart();
    });
    
    // Close cart button
    const closeCartBtn = document.getElementById('close-cart-btn');
    closeCartBtn?.addEventListener('click', () => this.closeCart());
    
    // Continue shopping buttons
    const continueShoppingButtons = document.querySelectorAll('#continue-shopping-btn, #continue-shopping-footer-btn');
    continueShoppingButtons.forEach(btn => {
      btn.addEventListener('click', () => this.closeCart());
    });
    
    // Mobile menu toggle
    this.elements.mobileMenuToggle.forEach(toggle => {
      toggle.addEventListener('click', () => this.toggleMobileMenu());
    });
    
    // Add to cart buttons
    this.elements.addToCartButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleAddToCart(e));
    });
    
    // Category navigation
    this.elements.categoryButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleCategoryClick(e));
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', this.perf.debounce((e) => {
        this.handleSmoothScroll(e);
      }));
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCart();
        this.closeMobileMenu();
      }
    });
    
    // Touch gesture support for cart
    let startY = 0;
    this.elements.cartDrawer?.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });
    
    this.elements.cartDrawer?.addEventListener('touchmove', this.perf.throttle((e) => {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 100) { // Swipe down to close
        this.closeCart();
      }
    }, 100));
  }
  
  setupIntersectionObservers() {
    // Fade in animations
    const fadeInObserver = this.perf.lazy((element) => {
      element.classList.add('visible');
    });
    
    document.querySelectorAll('.fade-in').forEach(fadeInObserver);
    
    // Category navigation highlighting
    const categoryObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const categoryId = entry.target.id;
          this.highlightActiveCategory(categoryId);
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });
    
    this.elements.menuCategories.forEach(category => {
      categoryObserver.observe(category);
    });
    
    this.observers.push(categoryObserver);
  }
  
  initializeAnimations() {
    // Only enable animations on capable devices
    if (!APP_CONFIG.features.animations) {
      document.documentElement.style.setProperty('--animation-duration', '0ms');
      return;
    }
    
    // Stagger animations for better performance
    const animatedElements = document.querySelectorAll('.fade-in');
    animatedElements.forEach((element, index) => {
      element.style.animationDelay = `${index * 100}ms`;
    });
  }
  
  // Cart UI methods
  toggleCart() {
    const isOpen = this.state.getState('ui').cartOpen;
    isOpen ? this.closeCart() : this.openCart();
  }
  
  openCart() {
    this.state.setState('ui', { cartOpen: true });
    this.elements.cartOverlay?.classList.remove('hidden');
    this.elements.cartOverlay?.classList.add('show');
    this.elements.cartDrawer?.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    this.updateCartDisplay();
  }
  
  closeCart() {
    this.state.setState('ui', { cartOpen: false });
    this.elements.cartOverlay?.classList.remove('show');
    this.elements.cartDrawer?.classList.remove('show');
    
    setTimeout(() => {
      this.elements.cartOverlay?.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  }
  
  // Mobile menu methods
  toggleMobileMenu() {
    const isOpen = this.state.getState('ui').menuOpen;
    isOpen ? this.closeMobileMenu() : this.openMobileMenu();
    
    // Update aria-expanded
    this.elements.mobileMenuToggle.forEach(toggle => {
      toggle.setAttribute('aria-expanded', !isOpen);
    });
  }
  
  openMobileMenu() {
    this.state.setState('ui', { menuOpen: true });
    this.elements.mobileMenu?.classList.remove('mobile-menu');
    this.elements.mobileMenu?.classList.add('show');
    this.elements.mobileMenu?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  
  closeMobileMenu() {
    this.state.setState('ui', { menuOpen: false });
    this.elements.mobileMenu?.classList.add('mobile-menu');
    this.elements.mobileMenu?.classList.remove('show');
    this.elements.mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  
  // Product interaction methods
  handleAddToCart(event) {
    event.preventDefault();
    const button = event.target.closest('.add-to-cart-btn');
    const productCard = button.closest('.product-card');
    
    if (!productCard) {
      console.error('Product card not found');
      return;
    }
    
    const productData = this.extractProductData(productCard);
    if (!productData) {
      console.error('Invalid product data');
      return;
    }
    
    // Visual feedback
    this.setButtonState(button, 'loading');
    
    // Add to cart via global app instance
    const success = window.brasasApp.cart.addItem(productData);
    
    // Update button state
    this.setButtonState(button, success ? 'success' : 'error');
    
    // Reset button after delay
    setTimeout(() => {
      this.setButtonState(button, 'normal');
    }, 2000);
  }
  
  extractProductData(productCard) {
    const title = productCard.dataset.title;
    const description = productCard.dataset.description;
    const priceText = productCard.dataset.price;
    
    if (!title || !priceText) return null;
    
    const priceMatch = priceText.match(/\$([\d.,]+)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
    
    if (price <= 0) return null;
    
    return { title, price, description: description || '' };
  }
  
  setButtonState(button, state) {
    const states = {
      normal: { text: 'Agregar', disabled: false, classes: '' },
      loading: { text: 'Agregando...', disabled: true, classes: 'loading' },
      success: { text: '¡Agregado!', disabled: false, classes: 'added' },
      error: { text: 'Error', disabled: false, classes: 'error' }
    };
    
    const currentState = states[state] || states.normal;
    
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    
    button.textContent = currentState.text;
    button.disabled = currentState.disabled;
    
    // Update classes
    button.classList.remove('loading', 'added', 'error');
    if (currentState.classes) {
      button.classList.add(currentState.classes);
    }
  }
  
  // Category navigation
  handleCategoryClick(event) {
    event.preventDefault();
    const button = event.target;
    const categoryId = button.dataset.category;
    
    if (!categoryId) return;
    
    this.scrollToCategory(categoryId);
    this.highlightActiveCategory(categoryId);
  }
  
  scrollToCategory(categoryId) {
    const element = document.getElementById(categoryId);
    if (!element) return;
    
    const headerHeight = 80; // Account for sticky header
    const elementPosition = element.offsetTop - headerHeight;
    
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    });
  }
  
  highlightActiveCategory(categoryId) {
    this.elements.categoryButtons.forEach(button => {
      const isActive = button.dataset.category === categoryId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive);
    });
  }
  
  // Smooth scrolling
  handleSmoothScroll(event) {
    const href = event.target.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    
    event.preventDefault();
    const targetId = href.substring(1);
    const target = document.getElementById(targetId);
    
    if (target) {
      const headerHeight = 80;
      const targetPosition = target.offsetTop - headerHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      
      // Update URL without page jump
      history.pushState(null, null, href);
    }
  }
  
  // Cart display updates
  updateCartDisplay() {
    const cart = this.state.getState('cart');
    this.updateCartCount(cart.count);
    this.renderCartItems(cart.items);
    this.updateCartTotal(cart.total);
    this.toggleCartSections(cart.count > 0);
  }
  
  updateCartCount(count) {
    this.elements.cartCount.forEach(element => {
      if (element) {
        element.textContent = count;
        element.style.display = count > 0 ? 'block' : 'none';
      }
    });
  }
  
  renderCartItems(items) {
    if (!this.elements.cartItemsContainer) return;
    
    if (items.length === 0) {
      this.elements.cartItemsContainer.innerHTML = '';
      return;
    }
    
    this.elements.cartItemsContainer.innerHTML = items.map(item => this.renderCartItem(item)).join('');
    
    // Add event listeners to quantity controls
    this.elements.cartItemsContainer.querySelectorAll('.quantity-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleQuantityChange(e));
    });
    
    this.elements.cartItemsContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRemoveItem(e));
    });
  }
  
  renderCartItem(item) {
    const formattedPrice = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(item.price);
    
    const formattedSubtotal = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(item.subtotal);
    
    return `
      <div class="cart-item" data-item-id="${item.id}" role="listitem">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 mr-4">
            <h4 class="font-semibold text-gray-900 truncate">${item.title}</h4>
            <p class="text-sm text-gray-600">${formattedPrice} c/u</p>
            ${item.description ? `<p class="text-xs text-gray-500 mt-1">${item.description}</p>` : ''}
          </div>
          
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <button class="quantity-btn bg-gray-200 hover:bg-gray-300 text-gray-700" 
                      data-action="decrease" data-item-id="${item.id}"
                      aria-label="Disminuir cantidad de ${item.title}">
                −
              </button>
              <span class="w-8 text-center font-semibold">${item.quantity}</span>
              <button class="quantity-btn bg-gray-200 hover:bg-gray-300 text-gray-700" 
                      data-action="increase" data-item-id="${item.id}"
                      aria-label="Aumentar cantidad de ${item.title}">
                +
              </button>
            </div>
            
            <div class="text-right">
              <div class="font-semibold text-gray-900">${formattedSubtotal}</div>
              <button class="remove-item-btn text-red-500 hover:text-red-700 text-sm" 
                      data-item-id="${item.id}"
                      aria-label="Eliminar ${item.title} del carrito">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  handleQuantityChange(event) {
    const button = event.target;
    const itemId = parseInt(button.dataset.itemId);
    const action = button.dataset.action;
    
    const cart = this.state.getState('cart');
    const item = cart.items.find(item => item.id === itemId);
    
    if (!item) return;
    
    const newQuantity = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
    window.brasasApp.cart.updateQuantity(itemId, newQuantity);
  }
  
  handleRemoveItem(event) {
    const button = event.target;
    const itemId = parseInt(button.dataset.itemId);
    window.brasasApp.cart.removeItem(itemId);
  }
  
  updateCartTotal(total) {
    const formattedTotal = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(total);
    
    if (this.elements.cartTotal) {
      this.elements.cartTotal.textContent = formattedTotal;
    }
  }
  
  toggleCartSections(hasItems) {
    if (this.elements.emptyCartMessage) {
      this.elements.emptyCartMessage.style.display = hasItems ? 'none' : 'flex';
    }
    
    if (this.elements.cartItemsContainer) {
      this.elements.cartItemsContainer.style.display = hasItems ? 'block' : 'none';
    }
    
    if (this.elements.cartFooter) {
      this.elements.cartFooter.style.display = hasItems ? 'block' : 'none';
    }
  }
  
  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// === IMAGE OPTIMIZATION ===
class ImageOptimizer {
  constructor(performance) {
    this.perf = performance;
    this.loadedImages = new Set();
    this.init();
  }
  
  init() {
    this.setupLazyLoading();
    this.optimizeExistingImages();
  }
  
  setupLazyLoading() {
    const imageObserver = this.perf.lazy((img) => {
      this.loadImage(img);
    }, 200);
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(imageObserver);
  }
  
  loadImage(img) {
    if (this.loadedImages.has(img)) return;
    
    const src = img.dataset.src;
    if (!src) return;
    
    // Create optimized URL based on device capabilities
    const optimizedSrc = this.getOptimizedImageUrl(src);
    
    // Preload image
    const imageLoader = new Image();
    imageLoader.onload = () => {
      img.src = optimizedSrc;
      img.classList.add('loaded');
      this.loadedImages.add(img);
    };
    
    imageLoader.onerror = () => {
      // Fallback to original src
      img.src = src;
      img.classList.add('error');
    };
    
    imageLoader.src = optimizedSrc;
  }
  
  getOptimizedImageUrl(src) {
    // For Unsplash images, add optimization parameters
    if (src.includes('unsplash.com')) {
      const url = new URL(src);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const quality = APP_CONFIG.performance.imageQuality * 100;
      
      // Adjust size based on viewport and device
      const maxWidth = Math.min(800, window.innerWidth * devicePixelRatio);
      
      url.searchParams.set('w', maxWidth);
      url.searchParams.set('q', quality);
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('auto', 'format');
      
      return url.toString();
    }
    
    return src;
  }
  
  optimizeExistingImages() {
    document.querySelectorAll('img:not([data-src])').forEach(img => {
      if (img.complete && !this.loadedImages.has(img)) {
        img.classList.add('loaded');
        this.loadedImages.add(img);
      }
    });
  }
}

// === PWA MANAGER ===
class PWAManager {
  constructor(state, toast) {
    this.state = state;
    this.toast = toast;
    this.deferredPrompt = null;
    this.swRegistration = null;
    
    this.init();
  }
  
  init() {
    this.registerServiceWorker();
    this.handleInstallPrompt();
    this.setupPWAListeners();
  }
  
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }
    
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered');
      
      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
  
  handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Show install prompt after user interaction
      setTimeout(() => {
        if (!localStorage.getItem('brasas_install_dismissed')) {
          this.showInstallPrompt();
        }
      }, 30000); // Wait 30 seconds
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed');
      this.toast.show('🎉 ¡App instalada correctamente!', 'success');
      this.deferredPrompt = null;
    });
  }
  
  showInstallPrompt() {
    const installMessage = `
      <div class="text-center">
        <div class="text-lg font-bold mb-2">📱 Instalar Brasas Smokehouse</div>
        <div class="text-sm mb-4">
          ✅ Acceso rápido desde tu pantalla inicio<br>
          ✅ Funciona sin internet<br>
          ✅ Experiencia nativa optimizada
        </div>
        <div class="flex gap-2 justify-center">
          <button onclick="window.brasasApp.pwa.installPWA()" 
                  class="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm">
            Instalar
          </button>
          <button onclick="window.brasasApp.pwa.dismissInstall()" 
                  class="bg-transparent border border-white/50 text-white px-4 py-2 rounded-lg text-sm">
            Más tarde
          </button>
        </div>
      </div>
    `;
    
    this.toast.show(installMessage, 'info', 0); // Don't auto-dismiss
  }
  
  async installPWA() {
    if (!this.deferredPrompt) return;
    
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`PWA install: ${outcome}`);
      this.deferredPrompt = null;
      
      // Clear any existing install toasts
      this.toast.clear();
      
    } catch (error) {
      console.error('PWA installation failed:', error);
      this.toast.show('❌ Error al instalar la app', 'error');
    }
  }
  
  dismissInstall() {
    localStorage.setItem('brasas_install_dismissed', Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    this.toast.clear();
  }
  
  showUpdateNotification() {
    const updateMessage = `
      <div class="text-center">
        <div class="font-bold mb-2">🔄 Actualización disponible</div>
        <div class="text-sm mb-3">Nueva versión con mejoras de rendimiento</div>
        <button onclick="window.brasasApp.pwa.applyUpdate()" 
                class="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm">
          Actualizar ahora
        </button>
      </div>
    `;
    
    this.toast.show(updateMessage, 'info', 0);
  }
  
  applyUpdate() {
    if (!this.swRegistration?.waiting) return;
    
    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    this.toast.clear();
    this.toast.show('🔄 Aplicando actualización...', 'info');
    
    // Reload page after short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
  
  setupPWAListeners() {
    // Online/offline status
    window.addEventListener('online', () => {
      this.state.setState('network', { online: true });
      this.toast.show('🌐 Conexión restaurada', 'success');
    });
    
    window.addEventListener('offline', () => {
      this.state.setState('network', { online: false });
      this.toast.show('📱 Modo offline activado', 'info');
    });
    
    // Service Worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, message } = event.data || {};
      
      switch (type) {
        case 'SW_READY':
          console.log('✅ Service Worker ready');
          break;
        case 'UPDATE_AVAILABLE':
          this.showUpdateNotification();
          break;
      }
    });
  }
}

// === MAIN APPLICATION CLASS ===
class BrasasSmokehouseApp {
  constructor() {
    this.state = new AppState();
    this.performance = new PerformanceManager();
    this.toast = new ToastManager();
    this.cart = new CartManager(this.state, this.toast);
    this.business = new BusinessManager(this.state, this.toast);
    this.ui = new UIManager(this.state, this.performance);
    this.imageOptimizer = new ImageOptimizer(this.performance);
    this.pwa = new PWAManager(this.state, this.toast);
    
    this.initialized = false;
    this.initPromise = this.init();
  }
  
  async init() {
    try {
      console.log('🔥 Initializing Brasas Smokehouse PWA...');
      
      // Setup state subscriptions
      this.setupStateSubscriptions();
      
      // Setup global error handling
      this.setupErrorHandling();
      
      // Setup global event listeners
      this.setupGlobalListeners();
      
      // Preload critical resources
      this.preloadCriticalResources();
      
      // Initialize year in footer
      this.updateCurrentYear();
      
      this.initialized = true;
      console.log('✅ Brasas Smokehouse PWA initialized');
      
      // Performance monitoring
      this.measureInitializationTime();
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.toast.show('Error al inicializar la aplicación', 'error');
    }
  }
  
  setupStateSubscriptions() {
    // Subscribe to cart changes to update UI
    this.state.subscribe('cart', (cart) => {
      this.ui.updateCartDisplay();
    });
    
    // Subscribe to network changes
    this.state.subscribe('network', (network) => {
      document.body.classList.toggle('offline', !network.online);
    });
  }
  
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.toast.show('Ha ocurrido un error inesperado', 'error');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  }
  
  setupGlobalListeners() {
    // Handle visibility changes for performance
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause non-critical operations
        this.pauseNonCriticalOperations();
      } else {
        // Resume operations
        this.resumeOperations();
      }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Handle resize for responsive adjustments
    window.addEventListener('resize', this.performance.debounce(() => {
      this.handleResize();
    }));
    
    // Handle scroll for header effects
    window.addEventListener('scroll', this.performance.throttle(() => {
      this.handleScroll();
    }, 100));
  }
  
  preloadCriticalResources() {
    // Preload essential fonts
    this.performance.preload('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap', 'style');
    
    // Prefetch likely pages
    if (this.state.getState('network').online) {
      this.performance.prefetch('/checkout');
      this.performance.prefetch('/menu');
    }
  }
  
  handleResize() {
    // Close mobile menu on resize to desktop
    if (window.innerWidth >= 1024) {
      this.ui.closeMobileMenu();
    }
    
    // Recalculate viewport units for mobile browsers
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }
  
  handleScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    
    const scrolled = window.scrollY > 50;
    header.classList.toggle('header-scrolled', scrolled);
  }
  
  pauseNonCriticalOperations() {
    // Pause animations
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    
    // Pause business status updates
    this.business.destroy();
  }
  
  resumeOperations() {
    // Resume animations
    document.documentElement.style.setProperty('--animation-play-state', 'running');
    
    // Resume business status updates
    this.business.init();
  }
  
  updateCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }
  
  measureInitializationTime() {
    if ('performance' in window) {
      const loadTime = performance.now();
      console.log(`⚡ App initialized in ${loadTime.toFixed(0)}ms`);
      
      // Report to analytics if available
      if (window.gtag) {
        gtag('event', 'timing_complete', {
          name: 'app_initialization',
          value: Math.round(loadTime)
        });
      }
    }
  }
  
  // Public API methods
  async ready() {
    return this.initPromise;
  }
  
  getState(key) {
    return this.state.getState(key);
  }
  
  // Global utility methods for backward compatibility
  copyAddress() {
    this.business.copyAddress();
  }
  
  checkBusinessStatus() {
    this.business.updateBusinessStatus();
    this.toast.show('Estado del negocio actualizado', 'info');
  }
  
  cleanup() {
    this.ui.destroy();
    this.business.destroy();
    this.imageOptimizer = null;
    
    // Clear intervals and timeouts
    performance.clearMarks?.();
    performance.clearMeasures?.();
  }
  
  // Debug methods (development only)
  debug() {
    if (!APP_CONFIG.debug) return;
    
    return {
      state: this.state.getState(),
      performance: this.performance.metrics,
      config: APP_CONFIG,
      version: APP_CONFIG.version,
      features: APP_CONFIG.features
    };
  }
}

// === INITIALIZATION ===
let brasasApp;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

async function initializeApp() {
  try {
    brasasApp = new BrasasSmokehouseApp();
    
    // Make globally available
    window.brasasApp = brasasApp;
    
    // Backward compatibility globals
    window.copyAddress = () => brasasApp.copyAddress();
    window.checkBusinessStatus = () => brasasApp.checkBusinessStatus();
    window.updateBusinessStatus = () => brasasApp.checkBusinessStatus();
    
    // Wait for initialization
    await brasasApp.ready();
    
    // Initialize viewport height for mobile
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    
    // Add loaded class to body
    document.body.classList.add('app-loaded');
    
    // Development tools
    if (APP_CONFIG.debug) {
      window.BrasasDebug = {
        app: brasasApp,
        state: () => brasasApp.getState(),
        debug: () => brasasApp.debug(),
        version: APP_CONFIG.version
      };
      console.log('🔧 Debug tools available: window.BrasasDebug');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    
    // Fallback initialization
    document.body.innerHTML += `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  text-align: center; background: white; padding: 20px; border-radius: 10px; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999;">
        <h3 style="color: #ad2118; margin-bottom: 10px;">Error de inicialización</h3>
        <p style="margin-bottom: 15px;">Por favor, recarga la página</p>
        <button onclick="location.reload()" 
                style="background: #ad2118; color: white; border: none; padding: 10px 20px; 
                       border-radius: 5px; cursor: pointer; font-weight: bold;">
          Recargar
        </button>
      </div>
    `;
  }
}

// Performance optimization: Remove loading screens when app is ready
window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelectorAll('.loading-screen, .loading-overlay').forEach(el => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    });
  }, 500);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrasasSmokehouseApp, APP_CONFIG };
}

console.log('🔥 Brasas Smokehouse PWA Core loaded - Optimized for Mexico mobile market');