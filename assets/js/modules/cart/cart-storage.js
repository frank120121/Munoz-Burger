// assets/js/modules/cart/cart-storage.js

import { CONFIG } from '../config.js';
import { validateCartItem, safeJSONParse, safeJSONStringify } from '../utils.js';

/**
 * CartStorage - Handles cart persistence to/from localStorage
 */
export class CartStorage {
    /**
     * Loads the cart state from localStorage with enhanced error handling
     * @param {Function} showToast - Toast notification function
     * @returns {Array} - Validated cart items
     */
    static loadCart(showToast) {
        try {
            const storedCart = localStorage.getItem(CONFIG.CART.STORAGE_KEY);
            if (!storedCart) {
                return [];
            }

            const parsedCart = safeJSONParse(storedCart, []);
            
            // Validate each cart item
            const validatedCart = parsedCart.filter(item => {
                try {
                    validateCartItem(item);
                    return true;
                } catch (error) {
                    console.warn('Invalid cart item removed:', item, error.message);
                    return false;
                }
            });

            // If we had to remove invalid items, save the cleaned cart and notify user
            if (validatedCart.length !== parsedCart.length) {
                this.saveCart(validatedCart, showToast);
                if (showToast) {
                    showToast('Se limpiaron algunos artículos inválidos del carrito', 'info');
                }
            }

            return validatedCart;
            
        } catch (error) {
            console.error("Error loading cart from localStorage:", error);
            
            // Clear corrupted data
            try {
                localStorage.removeItem(CONFIG.CART.STORAGE_KEY);
            } catch (clearError) {
                console.error("Failed to clear corrupted cart data:", clearError);
            }
            
            if (showToast) {
                showToast('Error al cargar el carrito. Se ha reiniciado.', 'error');
            }
            
            return [];
        }
    }

    /**
     * Saves the current cart state to localStorage with enhanced error handling
     * @param {Array} cart - Cart items to save
     * @param {Function} showToast - Toast notification function
     * @returns {boolean} - Success status
     */
    static saveCart(cart, showToast) {
        try {
            const cartData = safeJSONStringify(cart);
            if (!cartData) {
                throw new Error('Failed to serialize cart data');
            }

            localStorage.setItem(CONFIG.CART.STORAGE_KEY, cartData);
            return true;
            
        } catch (error) {
            console.error('Failed to save cart:', error);
            
            if (error.name === 'QuotaExceededError') {
                if (showToast) {
                    showToast('Almacenamiento lleno. No se pudo guardar el carrito.', 'error');
                }
                
                // Fallback: try to save just the first 5 items
                try {
                    localStorage.removeItem(CONFIG.CART.STORAGE_KEY);
                    const fallbackData = safeJSONStringify(cart.slice(0, 5));
                    if (fallbackData) {
                        localStorage.setItem(CONFIG.CART.STORAGE_KEY, fallbackData);
                    }
                } catch (fallbackError) {
                    console.error('Fallback save also failed:', fallbackError);
                }
            } else {
                if (showToast) {
                    showToast('No se pudo guardar el carrito', 'error');
                }
            }
            
            return false;
        }
    }

    /**
     * Clears the cart from localStorage
     * @returns {boolean} - Success status
     */
    static clearCart() {
        try {
            localStorage.removeItem(CONFIG.CART.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear cart:', error);
            return false;
        }
    }

    /**
     * Gets cart data without parsing (for backup purposes)
     * @returns {string|null} - Raw cart data
     */
    static getRawCartData() {
        try {
            return localStorage.getItem(CONFIG.CART.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to get raw cart data:', error);
            return null;
        }
    }
}