//assets/js/main.js

import { CONFIG } from './modules/config.js';
import { getElement, getElements } from './modules/utils.js';

// Import managers
import { ToastManager, toast } from './modules/ui/toast.js';
import { HeaderManager, headerManager } from './modules/ui/header.js';
import { NavigationManager, navigationManager } from './modules/ui/navigation.js';
import { AnimationManager, animationManager } from './modules/ui/animations.js';
import { BusinessStatus, businessStatus } from './modules/business/status.js';
import { ContactManager, contactManager } from './modules/business/contact.js';
import { ImageLoader, imageLoader } from './modules/product/image-loading.js';

class MunozBurgerApp {
    constructor() {
        this.managers = {};
        this.isInitialized = false;
        this.initializationQueue = [];
        this.criticalInitComplete = false;
        this.contentVisibilityEnsured = false;
    }

    async init() {
        try {
            console.log('🔥 Starting Muñoz Burger PWA...');

            this.ensureContentVisibility();
            
            await this.initCritical();
            
            requestAnimationFrame(() => this.initImportant());
            
            this.scheduleEnhancements();
            
        } catch (error) {
            console.error('❌ App initialization error:', error);
            this.ensureContentVisibility();
            this.initFallbackMode();
        }
    }

    ensureContentVisibility() {
        if (this.contentVisibilityEnsured) return;
        
        console.log('🔧 Ensuring content visibility...');
        
        document.documentElement.classList.remove('no-js');
        
        const criticalSections = getElements('#menu, #location, #contacto, section');
        criticalSections.forEach(el => {
            el.style.display = '';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.classList.remove('hidden', 'invisible');
        });
        
        const cards = getElements('.product-card, .category-preview-card');
        cards.forEach(el => {
            el.style.display = '';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.classList.remove('hidden', 'invisible');
        });
        
        const images = getElements('img');
        images.forEach(el => {

            if (el.offsetParent === null) {
   
                if (el.dataset.src && !el.src) {
                    el.src = el.dataset.src;
                }
                return; 
            }

            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.display = '';
            if (el.dataset.src && !el.src) {
                el.src = el.dataset.src;
            }
        });
                
        const grids = getElements('#categories-grid, .grid');
        grids.forEach(el => {
            el.style.display = 'grid';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
        });
        
        this.contentVisibilityEnsured = true;
        console.log(`✅ Content visibility ensured for ${criticalSections.length} sections, ${cards.length} cards, ${images.length} images`);
    }

    async initCritical() {
        this.managers.toast = toast;
        
        this.managers.header = headerManager;
        this.managers.header.showToast = this.showToast.bind(this);
        this.managers.header.init();
        
        this.criticalInitComplete = true;
        console.log('✅ Critical features initialized');
    }

    initImportant() {
        if (!this.criticalInitComplete) return;

        try {
            this.managers.navigation = navigationManager;
            this.managers.navigation.showToast = this.showToast.bind(this);
            this.managers.navigation.init();
            
            this.managers.businessStatus = businessStatus;
            this.managers.businessStatus.showToast = this.showToast.bind(this);
            this.managers.businessStatus.init();
            
            this.managers.contactManager = contactManager;
            this.managers.contactManager.showToast = this.showToast.bind(this);
            this.managers.contactManager.init();
            
            console.log('✅ Important features initialized');
            
        } catch (error) {
            console.error('❌ Important features error:', error);
        }
    }

    scheduleEnhancements() {
        const initEnhancements = () => {
            try {
                this.managers.animationManager = animationManager;
                this.managers.animationManager.showToast = this.showToast.bind(this);
                this.managers.animationManager.init();
                
                this.managers.imageLoader = imageLoader;
                this.managers.imageLoader.showToast = this.showToast.bind(this);
                this.managers.imageLoader.init();
                
                this.isInitialized = true;
                console.log('✅ All features initialized');
                
                this.performFinalCheck();
                
            } catch (error) {
                console.error('❌ Enhancement features error:', error);
                this.performFinalCheck();
            }
        };

        if ('requestIdleCallback' in window) {
            requestIdleCallback(initEnhancements, { timeout: 3000 });
        } else {
            setTimeout(initEnhancements, 1000);
        }
    }

    performFinalCheck() {
        setTimeout(() => {
            const hiddenElements = this.findHiddenElements();
            if (hiddenElements.length > 0) {
                console.warn(`⚠️ Found ${hiddenElements.length} hidden elements - making visible`);
                this.ensureContentVisibility();
                
                if (this.managers.animationManager?.forceShowAll) {
                    this.managers.animationManager.forceShowAll();
                }
                if (this.managers.imageLoader?.forceLoadAll) {
                    this.managers.imageLoader.forceLoadAll();
                }
            } else {
                console.log('✅ All content confirmed visible');
            }
        }, 2000);
    }

    findHiddenElements() {
        const criticalSelectors = [
            '#menu', '#location', '#contacto',
            '.product-card', '.category-preview-card',
            '#categories-grid'
        ];
        
        const hiddenElements = [];
        
        criticalSelectors.forEach(selector => {
            const elements = getElements(selector);
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || 
                    style.visibility === 'hidden' || 
                    style.opacity === '0') {
                    hiddenElements.push(el);
                }
            });
        });
        
        return hiddenElements;
    }

    initFallbackMode() {
        console.warn('🚨 Initializing fallback mode');
        
        this.ensureContentVisibility();
        
        setTimeout(() => {
            this.showToast('Algunas funciones avanzadas están limitadas', 'info', 4000);
        }, 2000);
    }

    showToast(message, type = 'success', duration = 3000) {
        if (this.managers.toast) {
            return this.managers.toast.show(message, type, duration);
        } else {
            console.log(`Toast: ${message} (${type})`);
            return null;
        }
    }

    emergencyVisibilityFix() {
        console.log('🚨 Running emergency visibility fix...');
        
        this.ensureContentVisibility();
        
        Object.values(this.managers).forEach(manager => {
            if (manager?.forceShowAll) {
                manager.forceShowAll();
            }
            if (manager?.forceLoadAll) {
                manager.forceLoadAll();
            }
        });
        
        console.log('✅ Emergency fix completed');
    }

    getStats() {
        const stats = {
            initialized: this.isInitialized,
            critical: this.criticalInitComplete,
            contentVisible: this.contentVisibilityEnsured,
            managers: Object.keys(this.managers),
            hiddenElements: this.findHiddenElements().length
        };
        
        Object.entries(this.managers).forEach(([name, manager]) => {
            if (manager?.getStats) {
                stats[`${name}Stats`] = manager.getStats();
            }
        });
        
        return stats;
    }

    destroy() {
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });
        this.managers = {};
        this.isInitialized = false;
        this.contentVisibilityEnsured = false;
    }
}

// Service Worker Integration
class ServiceWorkerIntegration {
    constructor(app) {
        this.app = app;
        this.isIntegrated = false;
        this.retryCount = 0;
        this.maxRetries = 10;
        this.init();
    }

    init() {
        this.waitForReadiness();
    }

    waitForReadiness() {
        const checkReadiness = () => {
            const appReady = this.app && this.app.criticalInitComplete && this.app.managers.toast;
            const swReady = window.swManager;
            
            if (appReady && swReady) {
                this.integrateServiceWorker();
            } else if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(checkReadiness, 200);
            } else {
                console.warn('⚠️ SW Integration timeout - app or SW not ready');
            }
        };
        
        checkReadiness();
    }

    integrateServiceWorker() {
        if (this.isIntegrated) return;

        try {
            // Replace SW toast system with app's toast system
            window.swManager.showToast = (message, type, duration) => {
                return this.app.showToast(message, type, duration);
            };

            // Replace SW install prompt with proper DOM creation
            window.swManager.showInstallPrompt = () => {
                this.showProperInstallPrompt();
            };

            // Replace SW update notification with proper DOM creation
            window.swManager.showUpdateNotification = () => {
                this.showProperUpdateNotification();
            };

            this.isIntegrated = true;
            console.log('✅ Service Worker integrated with main app toast system');

        } catch (error) {
            console.error('❌ SW Integration failed:', error);
        }
    }

    showProperInstallPrompt() {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed && Date.now() < parseInt(dismissed)) {
            return;
        }

        this.createInstallToast();
    }

    showProperUpdateNotification() {
        this.createUpdateToast();
    }

    createInstallToast() {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = 'toast info show';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        toast.style.cssText = `
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 12px;
            box-shadow: 0 12px 40px rgba(0,123,255,0.3);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(12px);
            max-width: 420px;
            position: relative;
            pointer-events: auto;
            font-family: inherit;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; margin-bottom: 16px;';

        const flag = document.createElement('span');
        flag.textContent = '🇲🇽';
        flag.style.cssText = 'font-size: 28px; margin-right: 12px;';

        const titleContainer = document.createElement('div');
        
        const title = document.createElement('strong');
        title.textContent = 'Instalar Muñoz Burger';
        title.style.cssText = 'font-size: 18px; display: block;';
        
        const subtitle = document.createElement('span');
        subtitle.textContent = 'Aplicación Web Progresiva';
        subtitle.style.cssText = 'font-size: 14px; opacity: 0.9;';

        titleContainer.appendChild(title);
        titleContainer.appendChild(subtitle);
        header.appendChild(flag);
        header.appendChild(titleContainer);

        // Create benefits
        const benefits = document.createElement('div');
        benefits.style.cssText = 'margin-bottom: 20px; line-height: 1.5;';

        const benefit1 = document.createElement('div');
        benefit1.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';
        const icon1 = document.createElement('span');
        icon1.textContent = '✅';
        icon1.style.marginRight = '8px';
        const text1 = document.createElement('span');
        text1.textContent = 'Funciona completamente sin internet';
        text1.style.fontSize = '14px';
        benefit1.appendChild(icon1);
        benefit1.appendChild(text1);

        const benefit2 = document.createElement('div');
        benefit2.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';
        const icon2 = document.createElement('span');
        icon2.textContent = '✅';
        icon2.style.marginRight = '8px';
        const text2 = document.createElement('span');
        text2.textContent = 'Ahorra datos móviles en Sonora';
        text2.style.fontSize = '14px';
        benefit2.appendChild(icon2);
        benefit2.appendChild(text2);

        const benefit3 = document.createElement('div');
        benefit3.style.cssText = 'display: flex; align-items: center;';
        const icon3 = document.createElement('span');
        icon3.textContent = '✅';
        icon3.style.marginRight = '8px';
        const text3 = document.createElement('span');
        text3.textContent = 'Acceso rápido desde tu pantalla';
        text3.style.fontSize = '14px';
        benefit3.appendChild(icon3);
        benefit3.appendChild(text3);

        benefits.appendChild(benefit1);
        benefits.appendChild(benefit2);
        benefits.appendChild(benefit3);

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

        // Install button
        const installBtn = document.createElement('button');
        installBtn.textContent = '📱 Instalar Ahora';
        installBtn.style.cssText = `
            background: white; 
            color: #ad2118; 
            border: none; 
            padding: 14px 24px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-weight: bold; 
            font-size: 15px;
            transition: transform 0.2s;
            flex: 1;
            min-width: 140px;
        `;
        installBtn.onmouseover = () => installBtn.style.transform = 'scale(1.02)';
        installBtn.onmouseout = () => installBtn.style.transform = 'scale(1)';
        installBtn.onclick = () => {
            window.swManager.installPWA();
            toast.remove();
        };

        // Dismiss button
        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Más Tarde';
        dismissBtn.style.cssText = `
            background: rgba(255,255,255,0.1); 
            color: white; 
            border: 1px solid rgba(255,255,255,0.3); 
            padding: 14px 24px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-size: 15px;
            transition: background-color 0.2s;
            flex: 1;
            min-width: 120px;
        `;
        dismissBtn.onmouseover = () => dismissBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
        dismissBtn.onmouseout = () => dismissBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        dismissBtn.onclick = () => {
            window.swManager.dismissInstall();
            toast.remove();
        };

        buttonContainer.appendChild(installBtn);
        buttonContainer.appendChild(dismissBtn);

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 12px;
            right: 16px;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s;
            border-radius: 50%;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
        closeBtn.onclick = () => toast.remove();

        // Assemble everything
        toast.appendChild(closeBtn);
        toast.appendChild(header);
        toast.appendChild(benefits);
        toast.appendChild(buttonContainer);
        
        toastContainer.appendChild(toast);

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 30000);

        return toast;
    }

    createUpdateToast() {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = 'toast info show';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        toast.style.cssText = `
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 8px 32px rgba(40,167,69,0.3);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            max-width: 400px;
            position: relative;
            pointer-events: auto;
            font-family: inherit;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; margin-bottom: 16px;';

        const icon = document.createElement('span');
        icon.textContent = '🔄';
        icon.style.cssText = 'font-size: 24px; margin-right: 12px;';

        const titleContainer = document.createElement('div');
        
        const title = document.createElement('strong');
        title.textContent = 'Nueva versión disponible';
        title.style.cssText = 'font-size: 16px;';
        
        const subtitle = document.createElement('div');
        subtitle.textContent = 'Mejoras para México y nuevas funciones';
        subtitle.style.cssText = 'font-size: 13px; opacity: 0.9;';

        titleContainer.appendChild(title);
        titleContainer.appendChild(subtitle);
        header.appendChild(icon);
        header.appendChild(titleContainer);

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px;';

        // Update button
        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Actualizar Ahora';
        updateBtn.style.cssText = `
            background: white; 
            color: #28a745; 
            border: none; 
            padding: 12px 20px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: bold; 
            font-size: 14px;
            transition: transform 0.2s;
            flex: 1;
        `;
        updateBtn.onmouseover = () => updateBtn.style.transform = 'scale(1.02)';
        updateBtn.onmouseout = () => updateBtn.style.transform = 'scale(1)';
        updateBtn.onclick = () => {
            window.swManager.applyUpdate();
            toast.remove();
        };

        // Later button
        const laterBtn = document.createElement('button');
        laterBtn.textContent = 'Más Tarde';
        laterBtn.style.cssText = `
            background: rgba(255,255,255,0.1); 
            color: white; 
            border: 1px solid rgba(255,255,255,0.3); 
            padding: 12px 20px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 14px;
            transition: background-color 0.2s;
        `;
        laterBtn.onmouseover = () => laterBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
        laterBtn.onmouseout = () => laterBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        laterBtn.onclick = () => toast.remove();

        buttonContainer.appendChild(updateBtn);
        buttonContainer.appendChild(laterBtn);

        // Assemble everything
        toast.appendChild(header);
        toast.appendChild(buttonContainer);
        
        toastContainer.appendChild(toast);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 10000);

        return toast;
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            max-width: 440px;
            margin: 0 auto;
        `;
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Notificaciones');
        
        document.body.appendChild(container);
        return container;
    }

    getIntegrationStatus() {
        return {
            isIntegrated: this.isIntegrated,
            retryCount: this.retryCount,
            appReady: !!(this.app && this.app.criticalInitComplete),
            swReady: !!window.swManager
        };
    }
}

// Create app instance
const app = new MunozBurgerApp();
window.app = app; // Make app globally available for SW integration

// Initialize Service Worker Integration
document.addEventListener('DOMContentLoaded', () => {
    const initSWIntegration = () => {
        if (window.app && app.criticalInitComplete) {
            new ServiceWorkerIntegration(app);
            console.log('✅ Service Worker integration initialized');
        } else {
            setTimeout(initSWIntegration, 200);
        }
    };
    
    setTimeout(initSWIntegration, 100);
});

// Initialize app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Global error handling with content visibility protection
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error?.message || event.message);
    app.ensureContentVisibility();
});

// Memory optimization
window.addEventListener('beforeunload', () => {
    app.destroy();
});

// Performance monitoring (development only)
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                console.log(`⚡ Page load: ${loadTime.toFixed(0)}ms`);
            }
        }, 100);
    });
}

// Expose essential functions globally (for backward compatibility)
window.copyAddress = () => app.managers.contactManager?.copyAddress?.();
window.checkBusinessStatus = () => app.managers.businessStatus?.checkBusinessStatus?.();
window.updateBusinessStatus = () => app.managers.businessStatus?.updateBusinessStatus?.();

// Emergency functions for debugging
window.emergencyVisibilityFix = () => app.emergencyVisibilityFix();
window.forceShowAllContent = () => app.ensureContentVisibility();

// Debug tools (development only)
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    window.MunozBurgerDebug = {
        app,
        managers: () => app.managers,
        reinit: () => app.init(),
        stats: () => app.getStats(),
        forceShow: () => app.emergencyVisibilityFix(),
        checkHidden: () => app.findHiddenElements()
    };
    console.log('🔧 Debug tools: window.MunozBurgerDebug');
} else {
    // Production debug tools (limited)
    window.MunozBurgerDebug = {
        app,
        stats: () => app.getStats(),
        forceShow: () => app.emergencyVisibilityFix()
    };
}