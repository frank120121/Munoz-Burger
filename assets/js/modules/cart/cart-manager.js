// assets/js/modules/cart/cart-manager.js

import { CONFIG } from '../config.js';
import { validateCartItem } from '../utils.js';
import { CartStorage } from './cart-storage.js';

/**
 * CartManager - Handles cart business logic and state management
 */
export class CartManager {
    constructor(showToast, updateCartCountDisplay, updateCartDisplay) {
        this.cart = [];
        this.showToast = showToast;
        this.updateCartCountDisplay = updateCartCountDisplay;
        this.updateCartDisplay = updateCartDisplay;
    }

    /**
     * Initialize cart by loading from storage
     */
    init() {
        this.cart = CartStorage.loadCart(this.showToast);
        if (this.updateCartCountDisplay) {
            this.updateCartCountDisplay();
        }
    }

    /**
     * Get current cart
     * @returns {Array} - Current cart items
     */
    getCart() {
        return [...this.cart]; // Return copy to prevent direct mutation
    }

    /**
     * Get total number of items in cart
     * @returns {number} - Total item count
     */
    getTotalItems() {
        return this.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }

    /**
     * Get total price of cart
     * @returns {number} - Total price
     */
    getTotalPrice() {
        return this.cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    }

    /**
     * Adds an item to the cart or increments its quantity if it already exists
     * @param {Object} item - Item to add {title, price, description}
     * @returns {boolean} - Success status
     */
    addItem(item) {
        try {
            validateCartItem(item);
            
            const existingItemIndex = this.cart.findIndex(cartItem => cartItem.title === item.title);

            if (existingItemIndex > -1) {
                const currentQuantity = this.cart[existingItemIndex].quantity || 0;
                if (currentQuantity >= CONFIG.CART.MAX_QUANTITY) {
                    if (this.showToast) {
                        this.showToast(`Cantidad máxima alcanzada para ${item.title}`, 'warning');
                    }
                    return false;
                }
                this.cart[existingItemIndex].quantity = currentQuantity + 1;
            } else {
                this.cart.push({ ...item, quantity: 1 });
            }

            const saveSuccess = CartStorage.saveCart(this.cart, this.showToast);
            if (saveSuccess) {
                if (this.updateCartCountDisplay) {
                    this.updateCartCountDisplay();
                }
                if (this.showToast) {
                    this.showToast(`${item.title} añadido al carrito!`);
                }
                console.log("Current Cart:", this.cart);
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('Cart validation error:', error);
            if (this.showToast) {
                this.showToast(`Error: ${error.message}`, 'error');
            }
            return false;
        }
    }

    /**
     * Updates the quantity of a cart item
     * @param {number} index - Item index in cart
     * @param {number} change - Quantity change (+1 or -1)
     * @returns {boolean} - Success status
     */
    updateItemQuantity(index, change) {
        if (index < 0 || index >= this.cart.length) {
            console.error('Invalid cart item index:', index);
            return false;
        }

        const item = this.cart[index];
        const newQuantity = (item.quantity || 0) + change;
        
        if (newQuantity <= 0) {
            return this.removeItem(index);
        }

        if (newQuantity > CONFIG.CART.MAX_QUANTITY) {
            if (this.showToast) {
                this.showToast(`Cantidad máxima (${CONFIG.CART.MAX_QUANTITY}) alcanzada`, 'warning');
            }
            return false;
        }

        this.cart[index].quantity = newQuantity;
        
        const saveSuccess = CartStorage.saveCart(this.cart, this.showToast);
        if (saveSuccess) {
            if (this.updateCartCountDisplay) {
                this.updateCartCountDisplay();
            }
            if (this.updateCartDisplay) {
                this.updateCartDisplay();
            }
            if (this.showToast) {
                this.showToast(`Cantidad actualizada: ${item.title}`, 'info');
            }
            return true;
        }
        return false;
    }

    /**
     * Removes an item from the cart
     * @param {number} index - Item index in cart
     * @returns {boolean} - Success status
     */
    removeItem(index) {
        if (index < 0 || index >= this.cart.length) {
            console.error('Invalid cart item index for removal:', index);
            return false;
        }

        const itemTitle = this.cart[index].title;
        this.cart.splice(index, 1);
        
        const saveSuccess = CartStorage.saveCart(this.cart, this.showToast);
        if (saveSuccess) {
            if (this.updateCartCountDisplay) {
                this.updateCartCountDisplay();
            }
            if (this.updateCartDisplay) {
                this.updateCartDisplay();
            }
            if (this.showToast) {
                this.showToast(`${itemTitle} eliminado del carrito`, 'info');
            }
            return true;
        }
        return false;
    }

    /**
     * Clears all items from the cart
     * @returns {boolean} - Success status
     */
    clearCart() {
        this.cart = [];
        const saveSuccess = CartStorage.saveCart(this.cart, this.showToast);
        if (saveSuccess) {
            if (this.updateCartCountDisplay) {
                this.updateCartCountDisplay();
            }
            if (this.updateCartDisplay) {
                this.updateCartDisplay();
            }
            if (this.showToast) {
                this.showToast('Carrito vaciado', 'info');
            }
            return true;
        }
        return false;
    }

    /**
     * Find item index by title
     * @param {string} title - Item title
     * @returns {number} - Item index or -1 if not found
     */
    findItemIndex(title) {
        return this.cart.findIndex(item => item.title === title);
    }

    /**
     * Check if cart is empty
     * @returns {boolean} - True if cart is empty
     */
    isEmpty() {
        return this.cart.length === 0;
    }

    /**
     * Get cart summary for sharing (WhatsApp, etc.)
     * @returns {string} - Formatted cart summary
     */
    getCartSummary() {
        if (this.isEmpty()) {
            return 'Carrito vacío';
        }

        const items = this.cart.map(item => 
            `${item.quantity}x ${item.title} - $${(item.price * item.quantity).toFixed(0)}`
        ).join('\n');
        
        const total = this.getTotalPrice().toFixed(0);
        
        return `🛒 Mi pedido:\n\n${items}\n\n💰 Total: $${total}`;
    }
    // Add to your cart-manager.js

    // Enhanced order submission with offline support
    async submitOrder(orderData) {
        try {
            // Try online submission first
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                this.showToast('¡Pedido enviado exitosamente!', 'success');
                return true;
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            // Queue for offline if network fails
            return await this.submitOrderOffline(orderData);
        }
    }

    // New offline order method
    async submitOrderOffline(orderData) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'QUEUE_OFFLINE_ORDER',
                data: orderData
            });
            
            this.showToast('Pedido guardado. Se enviará cuando tengas conexión.', 'info', 5000);
            return true;
        }
        
        this.showToast('Error al procesar pedido', 'error');
        return false;
    }
}