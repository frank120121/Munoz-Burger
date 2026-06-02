// assets/js/modules/cart/cart-ui.js

import { CONFIG } from '../config.js';
import { 
    getElement, 
    toggleClasses, 
    setAttributes, 
    updateElementDisplay, 
    escapeHtml, 
    debounce 
} from '../utils.js';

/**
 * CartUI - Handles cart user interface and interactions
 */
export class CartUI {
    constructor(cartManager, showToast) {
        this.cartManager = cartManager;
        this.showToast = showToast;
        this.isOpen = false;
    }

    /**
     * Initialize cart UI event listeners
     */
    init() {
        this.initEventListeners();
        this.updateCartCountDisplay();
    }

    /**
     * Updates the displayed number of items in the cart icon
     */
    updateCartCountDisplay() {
        const totalItems = this.cartManager.getTotalItems();
        
        // Update both desktop and mobile counters
        updateElementDisplay(CONFIG.SELECTORS.CART.DESKTOP_COUNT, totalItems);
        updateElementDisplay(CONFIG.SELECTORS.CART.MOBILE_COUNT, totalItems);

        // Update screen reader announcement
        this.announceCartUpdate(totalItems);
    }

    /**
     * Announces cart updates to screen readers
     */
    announceCartUpdate(totalItems) {
        if (this.showToast && this.showToast.announceCartUpdate) {
            this.showToast.announceCartUpdate(totalItems);
        } else {
            // Fallback if using basic showToast function
            const announcement = getElement(CONFIG.SELECTORS.CART.SR_ANNOUNCEMENT);
            if (announcement) {
                announcement.textContent = `Carrito actualizado: ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;
            }
        }
    }

    /**
     * Generic cart popup animation handler
     */
    animateCartPopup(show = true) {
        const overlay = getElement(CONFIG.SELECTORS.CART.OVERLAY);
        const drawer = getElement(CONFIG.SELECTORS.CART.DRAWER);
        
        if (!overlay || !drawer) return;

        if (show) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            this.isOpen = true;
            
            const firstFocusableElement = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                drawer.classList.add('show');
                
                setTimeout(() => {
                    if (firstFocusableElement) {
                        firstFocusableElement.focus();
                    }
                }, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
            });
        } else {
            overlay.classList.remove('show');
            drawer.classList.remove('show');
            this.isOpen = false;
            
            setTimeout(() => {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
        }
    }

    /**
     * Opens the cart popup with smooth animation
     */
    openCartPopup() {
        this.animateCartPopup(true);
        this.updateCartDisplay();
    }

    /**
     * Closes the cart popup with smooth animation
     */
    closeCartPopup() {
        this.animateCartPopup(false);
    }

    /**
     * Creates HTML for a single cart item
     */
    createCartItemHTML(item, index) {
        const itemTotal = (item.price * item.quantity).toFixed(0);
        
        return `
            <div class="cart-item" data-index="${index}" role="listitem">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-900 truncate">${escapeHtml(item.title)}</h4>
                        <p class="text-sm text-gray-500 truncate">${escapeHtml(item.description || '')}</p>
                        <p class="text-lg font-bold text-primary mt-1">$${item.price} × ${item.quantity} = $${itemTotal}</p>
                    </div>
                    
                    <div class="flex items-center space-x-3 ml-4">
                        <div class="flex items-center space-x-2" role="group" aria-label="Controles de cantidad para ${escapeHtml(item.title)}">
                            <button class="quantity-btn bg-gray-200 hover:bg-gray-300 text-gray-700" 
                                    data-action="decrease" data-index="${index}"
                                    aria-label="Disminuir cantidad"
                                    ${item.quantity <= 1 ? 'disabled' : ''}>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                </svg>
                            </button>
                            
                            <span class="font-semibold text-gray-900 min-w-[2rem] text-center" aria-label="Cantidad: ${item.quantity}">${item.quantity}</span>
                            
                            <button class="quantity-btn bg-primary hover:bg-primary-dark text-white" 
                                    data-action="increase" data-index="${index}"
                                    aria-label="Aumentar cantidad"
                                    ${item.quantity >= CONFIG.CART.MAX_QUANTITY ? 'disabled' : ''}>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        
                        <button class="remove-item-btn text-gray-400 hover:text-red-600" 
                                data-action="remove" data-index="${index}"
                                aria-label="Eliminar ${escapeHtml(item.title)} del carrito">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Updates the cart display in the popup
     */
    updateCartDisplay() {
        const elements = {
            emptyMessage: getElement(CONFIG.SELECTORS.CART.EMPTY_MESSAGE),
            itemsContainer: getElement(CONFIG.SELECTORS.CART.ITEMS_CONTAINER),
            cartFooter: getElement(CONFIG.SELECTORS.CART.FOOTER),
            cartHeaderCount: getElement(CONFIG.SELECTORS.CART.HEADER_COUNT),
            showMoreContainer: getElement('#show-more-container'),
            cartTotal: getElement(CONFIG.SELECTORS.CART.TOTAL)
        };

        // Check if required elements exist
        const requiredElements = ['emptyMessage', 'itemsContainer', 'cartFooter', 'cartHeaderCount', 'cartTotal'];
        const missingElements = requiredElements.filter(key => !elements[key]);
        
        if (missingElements.length > 0) {
            console.error('Required cart elements not found:', missingElements);
            return;
        }

        try {
            const cart = this.cartManager.getCart();
            const totalItems = this.cartManager.getTotalItems();
            const totalPrice = this.cartManager.getTotalPrice();

            elements.cartHeaderCount.textContent = totalItems;

            if (cart.length === 0) {
                toggleClasses(elements.emptyMessage, [], ['hidden']);
                toggleClasses(elements.itemsContainer, ['hidden'], []);
                toggleClasses(elements.cartFooter, ['hidden'], []);
                if (elements.showMoreContainer) {
                    toggleClasses(elements.showMoreContainer, ['hidden'], []);
                }
            } else {
                toggleClasses(elements.emptyMessage, ['hidden'], []);
                toggleClasses(elements.itemsContainer, [], ['hidden']);
                toggleClasses(elements.cartFooter, [], ['hidden']);

                setAttributes(elements.itemsContainer, {
                    'role': 'list',
                    'aria-label': `Artículos del carrito, ${cart.length} elementos`
                });

                // Show ALL items
                elements.itemsContainer.innerHTML = cart.map((item, index) => this.createCartItemHTML(item, index)).join('');

                // Always hide the "show more" container since we're showing all items
                if (elements.showMoreContainer) {
                    toggleClasses(elements.showMoreContainer, ['hidden'], []);
                }

                elements.cartTotal.textContent = `$${totalPrice.toFixed(0)}`;
                setAttributes(elements.cartTotal, {
                    'aria-label': `Total del carrito: ${totalPrice.toFixed(0)} pesos`
                });
            }
        } catch (error) {
            console.error('Error updating cart display:', error);
            if (this.showToast) {
                this.showToast('Error al actualizar el carrito', 'error');
            }
        }
    }

    /**
     * Generic cart button event handler
     */
    handleCartButtonAction(button) {
        const action = button.dataset.action;
        const index = parseInt(button.dataset.index, 10);

        if (isNaN(index)) {
            console.error('Invalid item index:', button.dataset.index);
            return;
        }

        button.disabled = true;
        button.classList.add('loading');

        try {
            switch (action) {
                case 'increase':
                    this.cartManager.updateItemQuantity(index, 1);
                    break;
                case 'decrease':
                    this.cartManager.updateItemQuantity(index, -1);
                    break;
                case 'remove':
                    this.handleRemoveItem(index);
                    break;
                default:
                    console.warn('Unknown cart action:', action);
            }
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.classList.remove('loading');
            }, 200);
        }
    }

    /**
     * Handle item removal with animation
     */
    handleRemoveItem(index) {
        const itemElement = getElement(`.cart-item[data-index="${index}"]`);
        
        const performRemoval = () => {
            this.cartManager.removeItem(index);
            this.updateCartDisplay();
        };

        if (itemElement) {
            itemElement.classList.add('cart-item-removing');
            setTimeout(performRemoval, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
        } else {
            performRemoval();
        }
    }

    /**
     * Initialize cart popup event listeners
     */
    initEventListeners() {
        try {
            // Cart icon click handlers
            const cartButtons = [
                { selector: CONFIG.SELECTORS.CART.BTN, handler: () => this.openCartPopup() },
                { selector: CONFIG.SELECTORS.CART.MOBILE_BTN, handler: () => this.openCartPopup() },
                { selector: CONFIG.SELECTORS.CART.CLOSE_BTN, handler: () => this.closeCartPopup() },
                { selector: '#continue-shopping-btn', handler: () => this.closeCartPopup() },
                { selector: '#continue-shopping-footer-btn', handler: () => this.closeCartPopup() }
            ];

            cartButtons.forEach(({ selector, handler }) => {
                const element = getElement(selector);
                if (element) {
                    element.addEventListener('click', (e) => {
                        e.preventDefault();
                        handler();
                    });
                }
            });

            // Close on overlay click
            const overlay = getElement(CONFIG.SELECTORS.CART.OVERLAY);
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        this.closeCartPopup();
                    }
                });
            }

            // Cart item interactions using event delegation
            const cartItemsContainer = getElement(CONFIG.SELECTORS.CART.ITEMS_CONTAINER);
            if (cartItemsContainer) {
                cartItemsContainer.addEventListener('click', (e) => {
                    const button = e.target.closest('button[data-action]');
                    if (button) {
                        this.handleCartButtonAction(button);
                    }
                });
            }

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeCartPopup();
                }
            });

            // Update display on window resize
            window.addEventListener('resize', debounce(() => {
                if (this.isOpen) {
                    this.updateCartDisplay();
                }
            }, 250));

        } catch (error) {
            console.error('Error initializing cart UI event listeners:', error);
            if (this.showToast) {
                this.showToast('Error al inicializar el carrito', 'error');
            }
        }
    }
}