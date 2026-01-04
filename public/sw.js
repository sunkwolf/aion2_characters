// Service Worker - 图片资源缓存
// 缓存版本号 - 修改此版本号会清除旧缓存
const CACHE_VERSION = 'image-cache-v1';
const CACHE_NAME = `${CACHE_VERSION}-images`;

// 缓存时长：1天 (毫秒)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// 需要缓存的远程图片域名
const IMAGE_DOMAINS = [
  'assets.playnccdn.com',
  'tw.ncsoft.com'
];

// 需要缓存的图片扩展名
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

/**
 * 判断请求是否为图片资源
 */
function isImageRequest(url) {
  try {
    const urlObj = new URL(url);

    // 检查域名
    const isDomainMatch = IMAGE_DOMAINS.some(domain => urlObj.hostname.includes(domain));
    if (!isDomainMatch) return false;

    // 检查扩展名
    const pathname = urlObj.pathname.toLowerCase();
    const isImageExt = IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext));

    return isImageExt;
  } catch (e) {
    return false;
  }
}

/**
 * 检查缓存是否过期
 */
function isCacheExpired(cachedResponse) {
  if (!cachedResponse) return true;

  const cachedTime = cachedResponse.headers.get('sw-cached-time');
  if (!cachedTime) return true;

  const now = Date.now();
  const cacheAge = now - parseInt(cachedTime, 10);

  return cacheAge > CACHE_DURATION;
}

/**
 * 创建带缓存时间戳的响应
 */
async function createCachedResponse(response) {
  const clonedResponse = response.clone();
  const blob = await clonedResponse.blob();

  const headers = new Headers(clonedResponse.headers);
  headers.set('sw-cached-time', Date.now().toString());

  return new Response(blob, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: headers
  });
}

// 安装事件 - Service Worker 安装时触发
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker 安装中...');
  // 强制跳过等待,立即激活
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker 激活中...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除旧版本的缓存
          if (cacheName.startsWith('image-cache-') && cacheName !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 立即控制所有页面
      return self.clients.claim();
    })
  );
});

// 拦截请求 - 实现图片缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理图片请求
  if (!isImageRequest(request.url)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. 先从缓存中查找
      const cachedResponse = await cache.match(request);

      // 2. 检查缓存是否有效
      if (cachedResponse && !isCacheExpired(cachedResponse)) {
        console.log('[SW] 使用缓存:', request.url);
        return cachedResponse;
      }

      // 3. 缓存过期或不存在,从网络获取
      try {
        console.log('[SW] 网络请求:', request.url);
        const networkResponse = await fetch(request);

        // 只缓存成功的响应
        if (networkResponse.ok) {
          const responseToCache = await createCachedResponse(networkResponse);
          cache.put(request, responseToCache);
          console.log('[SW] 已缓存:', request.url);
        }

        return networkResponse;
      } catch (error) {
        console.error('[SW] 网络请求失败:', request.url, error);

        // 网络失败时,如果有缓存(即使过期)也返回
        if (cachedResponse) {
          console.log('[SW] 网络失败,使用过期缓存:', request.url);
          return cachedResponse;
        }

        // 完全失败,返回错误
        throw error;
      }
    })
  );
});

// 消息事件 - 支持手动清除缓存
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] 图片缓存已清除');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
