//sw.js

const CACHE_VERSION = 'munoz-burger-v1.2.0';
const CRITICAL_CACHE = `critical-${CACHE_VERSION}`;
const MENU_CACHE = `menu-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const OFFLINE_PAGE = '/offline.html';

const CACHE_LIMITS = {
  critical: 30,  
  menu: 50,       
  images: 100     
};

// Critical assets - Only essentials
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/js/main.js',
  '/assets/js/modules/config.js',
  '/assets/js/modules/utils.js',
  '/assets/js/modules/ui/toast.js',
  OFFLINE_PAGE
];

// Menu functionality assets
const MENU_ASSETS = [
  '/assets/js/modules/business/status.js',
  '/assets/js/modules/business/contact.js',
  '/assets/js/modules/ui/header.js',
  '/assets/js/modules/ui/navigation.js',
  '/assets/js/modules/ui/animations.js',
  '/assets/js/modules/product/image-loading.js'
];

// Static assets
const STATIC_ASSETS = [
  '/assets/images/logo/munoz-icon-192-192.png',
  '/assets/images/logo/favicon-512-512.png',
  '/assets/images/favicon/favicon-512-512.png',
  '/assets/images/favicon/favicon.ico'
];

// Network timeout
const NETWORK_TIMEOUT = 6000; // 6 seconds for 2G/3G
let dataUsage = 0;
const DATA_LIMIT = 2 * 1024 * 1024; // 2MB session limit

/**
 * Install Event - Cache critical assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache critical assets first
        await cacheAssets(CRITICAL_CACHE, CRITICAL_ASSETS);
        
        // Cache menu assets (non-blocking)
        cacheAssets(MENU_CACHE, MENU_ASSETS).catch(err => 
          console.warn('[SW] Menu assets cache failed:', err)
        );
        
        // Cache static assets (non-blocking)
        cacheAssets(CRITICAL_CACHE, STATIC_ASSETS).catch(err =>
          console.warn('[SW] Static assets cache failed:', err)
        );
        
        console.log('[SW] Installation complete');
        self.skipWaiting();
        
      } catch (error) {
        console.error('[SW] Installation failed:', error);
        // Continue anyway with partial cache
      }
    })()
  );
});

/**
 * Simplified asset caching
 */
async function cacheAssets(cacheName, assets) {
  const cache = await caches.open(cacheName);
  
  // Try to cache each asset individually to avoid total failure
  const results = await Promise.allSettled(
    assets.map(asset => cache.add(asset))
  );
  
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[SW] ${failed}/${assets.length} assets failed to cache`);
  }
}

/**
 * Activate Event - Clean old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean old caches
        const cacheNames = await caches.keys();
        const validCaches = [CRITICAL_CACHE, MENU_CACHE, IMAGE_CACHE];
        
        await Promise.all(
          cacheNames
            .filter(name => !validCaches.includes(name))
            .map(name => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
        
        await self.clients.claim();
        console.log('[SW] Activation complete');
        
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SW_READY' });
        });
        
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event - Simplified routing
 */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Track data usage for Mexican market consciousness
  trackDataUsage(event.request);
  
  event.respondWith(handleRequest(event.request, url));
});

/**
 * Simplified request handling
 */
async function handleRequest(request, url) {
  try {
    // Check data usage limits
    const isDataSaveMode = dataUsage > (DATA_LIMIT * 0.8);
    
    // Strategy 1: Critical resources - Cache First
    if (isCriticalResource(url) || isDataSaveMode) {
      return await cacheFirst(request, CRITICAL_CACHE);
    }
    
    // Strategy 2: Images - Cache First with fallback
    if (isImageRequest(url)) {
      return await imageStrategy(request);
    }
    
    // Strategy 3: HTML pages - Network First
    if (isPageRequest(request)) {
      return await networkFirst(request, MENU_CACHE);
    }
    
    // Default: Stale While Revalidate
    return await staleWhileRevalidate(request, MENU_CACHE);
    
  } catch (error) {
    return await handleError(request);
  }
}

/**
 * Cache First strategy
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      await cacheWithLimit(cache, request, response.clone());
    }
    return response;
  } catch (error) {
    // Return stale cache if available
    return cached || Promise.reject(error);
  }
}

/**
 * Network First strategy
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      await cacheWithLimit(cache, request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || Promise.reject(error);
  }
}

/**
 * Stale While Revalidate strategy
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Start network request (don't await)
  const networkPromise = fetchWithTimeout(request)
    .then(response => {
      if (response.ok) {
        cacheWithLimit(cache, request, response.clone());
      }
      return response;
    })
    .catch(() => null); // Ignore network errors
  
  // Return cached immediately if available
  if (cached) {
    return cached;
  }
  
  // No cache, wait for network
  return await networkPromise;
}

/**
 * Image strategy with data consciousness
 */
async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  // Skip image loading if data limit reached
  if (dataUsage > (DATA_LIMIT * 0.9)) {
    return createImageFallback();
  }
  
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      await cacheWithLimit(cache, request, response.clone());
    }
    return response;
  } catch (error) {
    return createImageFallback();
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Cache with size limits
 */
async function cacheWithLimit(cache, request, response) {
  await cache.put(request, response);
  
  // Simplified cache limit check without complex cache name detection
  const keys = await cache.keys();
  const limit = CACHE_LIMITS.menu; // Use menu limit as default for simplicity
  
  if (keys.length > limit) {
    const oldKeys = keys.slice(0, keys.length - limit);
    await Promise.all(oldKeys.map(key => cache.delete(key)));
  }
}

/**
 * Error handling
 */
async function handleError(request) {
  // For HTML pages, return offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache = await caches.open(CRITICAL_CACHE);
    const offlinePage = await cache.match(OFFLINE_PAGE);
    
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback offline response
    return new Response(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sin conexión - Muñoz Burger</title>
        <style>
          body { font-family: system-ui; text-align: center; padding: 20px; background: #f5f5f5; margin: 0; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px 20px; border-radius: 15px; }
          .logo { width: 80px; height: 80px; background: linear-gradient(135deg, #ad2118, #d97706); 
                  border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; 
                  justify-content: center; color: white; font-size: 36px; font-weight: bold; }
          h1 { color: #333; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 20px; line-height: 1.5; }
          button { background: linear-gradient(135deg, #ad2118, #d97706); color: white; border: none; 
                   padding: 15px 30px; border-radius: 10px; font-size: 16px; cursor: pointer; 
                   font-weight: bold; width: 100%; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
          .features h3 { margin-top: 0; color: #ad2118; }
          .features ul { margin: 0; padding-left: 20px; }
          .features li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">B</div>
          <h1>Sin conexión</h1>
          <p>Muñoz Burger funciona sin internet.</p>
          <div class="features">
            <h3>Disponible offline:</h3>
            <ul>
              <li>✅ Ver menú completo</li>
              <li>✅ Carrito de compras</li>
              <li>✅ Información del restaurante</li>
            </ul>
          </div>
          <button onclick="location.reload()">Intentar conectar</button>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // For other resources
  return new Response('Recurso no disponible', { 
    status: 503, 
    statusText: 'Service Unavailable' 
  });
}

/**
 * Create image fallback
 */
function createImageFallback() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <rect width="300" height="200" fill="#f3f4f6"/>
    <text x="150" y="100" text-anchor="middle" fill="#999" font-size="14">
      Imagen no disponible
    </text>
  </svg>`;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

/**
 * Data usage tracking
 */
function trackDataUsage(request) {
  const url = request.url;
  if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) {
    dataUsage += 30000; // ~30KB estimate
  } else if (url.includes('.js')) {
    dataUsage += 8000; // ~8KB estimate
  } else if (url.includes('.css')) {
    dataUsage += 4000; // ~4KB estimate
  } else {
    dataUsage += 1000; // ~1KB estimate
  }
}

/**
 * Request type detection
 */
function isCriticalResource(url) {
  return (
    url.pathname.includes('/assets/css/') ||
    url.pathname.includes('/assets/js/modules/config') ||
    url.pathname.includes('/assets/js/modules/utils') ||
    url.pathname.includes('/assets/js/modules/cart/') ||
    url.pathname.includes('/assets/images/logo/') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.pathname === '/manifest.json'
  );
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url.pathname);
}

function isPageRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

/**
 * Message handling - Simplified
 */
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    case 'GET_DATA_USAGE':
      event.ports[0]?.postMessage({ 
        dataUsage,
        limit: DATA_LIMIT,
        percentage: (dataUsage / DATA_LIMIT) * 100
      });
      break;
      
    case 'RESET_DATA_USAGE':
      dataUsage = 0;
      break;
  }
});

/**
 * Background sync for offline orders
 */
self.addEventListener('sync', event => {
  if (event.tag === 'order-sync') {
    event.waitUntil(processOfflineOrders());
  }
});

/**
 * Simple offline order processing
 */
async function processOfflineOrders() {
  try {
    // Get offline orders from localStorage (simpler than IndexedDB)
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'PROCESS_OFFLINE_ORDERS',
        message: 'Processing offline orders'
      });
    });
    
  } catch (error) {
    console.error('[SW] Offline order processing failed:', error);
  }
}

/**
 * Push notifications - Simplified
 */
self.addEventListener('push', event => {
  const title = 'Muñoz Burger';
  const options = {
    body: 'Tu pedido está listo!',
    icon: '/assets/images/logo/munoz-icon-192-192.png',
    badge: '/assets/images/favicon/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

/**
 * Periodic cleanup
 */
setInterval(() => {
  // Reset data usage periodically
  if (dataUsage > DATA_LIMIT) {
    dataUsage = Math.floor(dataUsage * 0.5);
    console.log('[SW] Data usage reset');
  }
}, 300000); // Every 5 minutes

console.log('[SW] Lightweight Service Worker loaded for Mexican mobile market');
console.log(`[SW] Cache limits: Critical(${CACHE_LIMITS.critical}), Menu(${CACHE_LIMITS.menu}), Images(${CACHE_LIMITS.images})`);
console.log(`[SW] Data limit: ${(DATA_LIMIT/1024/1024).toFixed(1)}MB per session`);