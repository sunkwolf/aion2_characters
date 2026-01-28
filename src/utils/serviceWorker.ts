// Service Worker registration and management utility

/**
 * Register Service Worker
 */
export function registerServiceWorker(): void {
  // Check if browser supports Service Worker
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Browser does not support Service Worker');
    return;
  }

  // Wait for page load before registering
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service Worker registered successfully:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available, recommend refreshing page');
            // Optional: prompt user to refresh page
          }
        });
      });
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
    }
  });
}

/**
 * Unregister Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[SW] Service Worker unregister:', success ? 'success' : 'failed');
      return success;
    }
    return false;
  } catch (error) {
    console.error('[SW] Service Worker unregister failed:', error);
    return false;
  }
}

/**
 * Clear image cache
 */
export async function clearImageCache(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Browser does not support Service Worker');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.active) {
      console.warn('[SW] Service Worker not active');
      return false;
    }

    const activeWorker = registration.active;

    // Send clear cache message
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      activeWorker.postMessage(
        { type: 'CLEAR_IMAGE_CACHE' },
        [messageChannel.port2]
      );

      // Timeout handling
      setTimeout(() => resolve(false), 5000);
    });
  } catch (error) {
    console.error('[SW] Clear cache failed:', error);
    return false;
  }
}

/**
 * Check Service Worker status
 */
export async function checkServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  active: boolean;
}> {
  const supported = 'serviceWorker' in navigator;

  if (!supported) {
    return { supported: false, registered: false, active: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const registered = !!registration;
    const active = !!(registration && registration.active);

    return { supported, registered, active };
  } catch (error) {
    console.error('[SW] Check status failed:', error);
    return { supported, registered: false, active: false };
  }
}
