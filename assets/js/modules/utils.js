// assets/js/modules/utils.js

import { CONTACT_INFO } from './config.js';

/**
 * Utility Functions for Muñoz Burger website
 */

/**
 * Debounces a function call
 */
export const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

/**
 * Throttle function for performance-critical events
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Generic element selector with error handling
 */
export const getElement = (selector, required = false) => {
    const element = document.querySelector(selector);
    if (!element && required) {
        console.error(`Required element not found: ${selector}`);
    }
    return element;
};

/**
 * Generic elements selector
 */
export const getElements = (selector) => {
    return document.querySelectorAll(selector);
};

/**
 * Generic class toggle utility
 */
export const toggleClasses = (element, addClasses = [], removeClasses = []) => {
    if (!element) return;
    removeClasses.forEach(cls => element.classList.remove(cls));
    addClasses.forEach(cls => element.classList.add(cls));
};

/**
 * Generic attribute setter
 */
export const setAttributes = (element, attributes) => {
    if (!element) return;
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
};


/**
 * Escapes HTML characters to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Safely parses JSON with error handling
 */
export function safeJSONParse(jsonString, fallback = []) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('JSON parsing failed:', error);
        return fallback;
    }
}

/**
 * Safely stringifies object with error handling
 */
export function safeJSONStringify(obj) {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.error('JSON stringification failed:', error);
        return null;
    }
}

/**
 * Generic event listener attacher with cleanup
 */
export function attachEventListeners(selector, event, handler, options = {}) {
    const elements = getElements(selector);
    elements.forEach(element => {
        // Remove inline onclick if it exists
        element.removeAttribute('onclick');
        element.addEventListener(event, handler, options);
    });
    return elements.length;
}