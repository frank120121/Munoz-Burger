// assets/js/sw-registration.js 

const SW_CONFIG = {
    SW_URL: '/sw.js',
    UPDATE_CHECK_INTERVAL: 300000, // Check every 5 minutes
    DATA_LIMIT_MB: 2,              // 2MB limit 
    WARN_AT_PERCENTAGE: 70,        // Warn at 70% usage
    DEBUG: window.location.hostname === 'localhost'
};

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isOnline = navigator.onLine;
        this.dataUsage = 0;
        this.updateCheckInterval = null;
        this.deferredPrompt = null; 
        this.init();
    }

    async init() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers not supported');
            return;
        }

        try {
            await this.registerServiceWorker();
            this.setupEventListeners();
            this.startPeriodicTasks();
            this.handleInstallPrompt();
            
            console.log('✅ SW Manager initialized');
            
        } catch (error) {
            console.error('❌ SW Manager initialization failed:', error);
        }
    }

    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register(SW_CONFIG.SW_URL, {
                scope: '/'
            });

            console.log('✅ Service Worker registered');

            if (this.registration.installing) {
                this.trackInstalling(this.registration.installing);
            } else if (this.registration.waiting) {
                this.showUpdateNotification();
            } 
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Service worker messages
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event);
        });

        // Online/offline handling
        window.addEventListener('online', () => {
            console.log('📡 Back online');
            this.isOnline = true;
            this.showToast('🌐 Conexión restaurada', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('📡 Gone offline');
            this.isOnline = false;
            this.showToast('📱 Modo offline activado', 'info');
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });

        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                const { effectiveType, downlink } = navigator.connection;
                console.log(`📡 Connection: ${effectiveType}, ${downlink}Mbps`);
                
                if (effectiveType === '2g' || downlink < 1) {
                    this.notifyServiceWorker('SLOW_CONNECTION', { effectiveType, downlink });
                }
            });
        }
    }

    handleServiceWorkerMessage(event) {
        const { type, message } = event.data || {};

        switch (type) {
            case 'SW_READY':
                console.log('✅ Service Worker ready');
                break;
            case 'UPDATE_AVAILABLE':
                this.showUpdateNotification();
                break;
            default:
                if (SW_CONFIG.DEBUG) {
                    console.log('📨 SW Message:', type, message);
                }
        }
    }

    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
            
            if (this.registration.waiting) {
                this.showUpdateNotification();
            }
        } catch (error) {
            console.warn('❌ Update check failed:', error);
        }
    }

    showUpdateNotification() {
        const updateMessage = `
            🔄 Nueva versión disponible con mejoras para México. 
            <button onclick="swManager.applyUpdate()" style="
                background: #fff; 
                color: #ad2118; 
                border: none; 
                padding: 8px 12px; 
                border-radius: 5px; 
                margin-left: 10px; 
                cursor: pointer; 
                font-weight: bold;
            ">Actualizar</button>
        `;
        
        this.showToast(updateMessage, 'info', 10000);
    }

    applyUpdate() {
        if (!this.registration?.waiting) {
            console.warn('❌ No update waiting');
            return;
        }

        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        this.showToast('🔄 Aplicando actualización...', 'info');
    }

    trackInstalling(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    this.showUpdateNotification();
                } else {
                    console.log('🎉 Service Worker installed');
                    this.showToast('✅ App lista para uso offline', 'success');
                }
            }
        });
    }

    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e; 
            
            setTimeout(() => {
                this.showInstallPrompt();
            }, 5000);
        });

        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA installed');
            this.showToast('🎉 App instalada correctamente', 'success');
            this.deferredPrompt = null;
        });
    }

    showInstallPrompt() {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed && Date.now() < parseInt(dismissed)) {
            return;
        }

        // Create toast container
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            background: #007bff;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
            font-family: inherit;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            word-wrap: break-word;
            max-width: 400px;
            margin: 0 auto;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px;';
        
        const flag = document.createElement('span');
        flag.textContent = '🇲🇽';
        flag.style.cssText = 'font-size: 20px; margin-right: 8px;';
        
        const title = document.createElement('strong');
        title.textContent = 'Instalar Muñoz Burger';
        
        header.appendChild(flag);
        header.appendChild(title);

        // Create benefits
        const benefits = document.createElement('div');
        benefits.style.cssText = 'font-size: 14px; margin-bottom: 15px; line-height: 1.4;';
        benefits.innerHTML = '✅ Funciona sin internet<br>✅ Ahorra datos móviles';

        // Create button container
        const buttonContainer = document.createElement('div');
        
        // Install button
        const installBtn = document.createElement('button');
        installBtn.textContent = '📱 Instalar';
        installBtn.style.cssText = `
            background: #fff; 
            color: #ad2118; 
            border: none; 
            padding: 10px 15px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: bold;
            margin-right: 10px;
        `;
        installBtn.onclick = () => {
            this.installPWA();
            toast.remove();
        };

        // Dismiss button
        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Más tarde';
        dismissBtn.style.cssText = `
            background: transparent; 
            color: #fff; 
            border: 1px solid rgba(255,255,255,0.5); 
            padding: 10px 15px; 
            border-radius: 8px; 
            cursor: pointer;
        `;
        dismissBtn.onclick = () => {
            this.dismissInstall();
            toast.remove();
        };

        // Close button (X)
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => {
            toast.remove();
        };

        // Assemble everything
        buttonContainer.appendChild(installBtn);
        buttonContainer.appendChild(dismissBtn);
        
        toast.appendChild(closeBtn);
        toast.appendChild(header);
        toast.appendChild(benefits);
        toast.appendChild(buttonContainer);
        
        document.body.appendChild(toast);

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 30000);
    }

    async installPWA() {
        if (!this.deferredPrompt) {
            console.log('No install prompt available');
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`PWA install: ${outcome}`);
            this.deferredPrompt = null;
            
        } catch (error) {
            console.error('PWA installation failed:', error);
        }
    }

    dismissInstall() {
        // Don't show again for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
        this.deferredPrompt = null;
    }

    notifyServiceWorker(type, data = {}) {
        if (!navigator.serviceWorker.controller) return;

        navigator.serviceWorker.controller.postMessage({
            type,
            data: {
                ...data,
                market: 'nogales-sonora',
                timestamp: new Date().toISOString()
            }
        });
    }

    startPeriodicTasks() {
        this.updateCheckInterval = setInterval(() => {
            if (!document.hidden && this.isOnline) {
                this.checkForUpdates();
            }
        }, SW_CONFIG.UPDATE_CHECK_INTERVAL);
    }

    showToast(message, type = 'info', duration = 3000) {
        if (typeof showToast === 'function') {
            return showToast(message, type, duration);
        }
        
        // Fallback toast with proper HTML support
        const toast = document.createElement('div');
        toast.innerHTML = message; 
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#007bff'};
            color: ${type === 'warning' ? '#212529' : 'white'};
            padding: 15px;
            border-radius: 10px;
            z-index: 10000;
            font-family: inherit;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            word-wrap: break-word;
            max-width: 400px;
        `;
        
        document.body.appendChild(toast);
        
        const buttons = toast.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.remove();
                }
            });
        });
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
        
        return toast;
    }

    getStatus() {
        return {
            supported: 'serviceWorker' in navigator,
            registered: !!this.registration,
            active: !!this.registration?.active,
            isOnline: this.isOnline,
            dataUsage: this.dataUsage,
            hasDeferredPrompt: !!this.deferredPrompt
        };
    }

    destroy() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
    }
}

// Initialize Service Worker Manager
let swManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        swManager = new ServiceWorkerManager();
        
        window.swManager = swManager;
        
        if (SW_CONFIG.DEBUG) {
            console.log('🔧 SW Manager available at window.swManager');
        }
    } catch (error) {
        console.error('❌ Failed to initialize SW Manager:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (swManager) {
        swManager.destroy();
    }
});

// Export for other modules
if (typeof window !== 'undefined') {
    window.swManager = swManager;
}