// Service Worker 注册和管理工具

/**
 * 注册 Service Worker
 */
export function registerServiceWorker(): void {
  // 检查浏览器是否支持 Service Worker
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] 浏览器不支持 Service Worker');
    return;
  }

  // 等待页面加载完成后再注册
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service Worker 注册成功:', registration.scope);

      // 监听更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] 新版本可用,建议刷新页面');
            // 可选:提示用户刷新页面
          }
        });
      });
    } catch (error) {
      console.error('[SW] Service Worker 注册失败:', error);
    }
  });
}

/**
 * 注销 Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[SW] Service Worker 注销:', success ? '成功' : '失败');
      return success;
    }
    return false;
  } catch (error) {
    console.error('[SW] Service Worker 注销失败:', error);
    return false;
  }
}

/**
 * 清除图片缓存
 */
export async function clearImageCache(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] 浏览器不支持 Service Worker');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.active) {
      console.warn('[SW] Service Worker 未激活');
      return false;
    }

    const activeWorker = registration.active;

    // 发送清除缓存消息
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      activeWorker.postMessage(
        { type: 'CLEAR_IMAGE_CACHE' },
        [messageChannel.port2]
      );

      // 超时处理
      setTimeout(() => resolve(false), 5000);
    });
  } catch (error) {
    console.error('[SW] 清除缓存失败:', error);
    return false;
  }
}

/**
 * 检查 Service Worker 状态
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
    console.error('[SW] 检查状态失败:', error);
    return { supported, registered: false, active: false };
  }
}
