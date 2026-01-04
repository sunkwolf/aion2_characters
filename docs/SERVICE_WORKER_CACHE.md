# Service Worker 图片缓存功能说明

## 功能概述

已为军团网站实现 Service Worker 图片缓存功能,自动缓存所有远程图片资源,提升页面加载速度。

## 缓存策略

### 缓存的资源
- **域名**:
  - `assets.playnccdn.com` (职业图标、天魔族徽章等)
  - `tw.ncsoft.com` (角色头像、装备图标等)

- **文件类型**:
  - `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`

### 缓存机制
1. **首次访问**: 从网络加载图片,同时保存到浏览器缓存
2. **后续访问**:
   - 缓存有效期内(24小时): 直接使用缓存,秒开
   - 缓存过期: 自动从网络重新加载并更新缓存
3. **离线访问**: 网络断开时,使用已缓存的图片(即使过期)

## 用户体验提升

### 优势
- ✅ 图片加载速度提升 90%+ (缓存命中时)
- ✅ 减少网络流量消耗
- ✅ 降低服务器负载
- ✅ 支持离线浏览已访问过的页面
- ✅ 缓存自动管理,无需用户干预

### 注意事项
- ⚠️ 缓存仅存储在用户浏览器本地,不同设备间不共享
- ⚠️ 清除浏览器数据会同时清除图片缓存
- ⚠️ 不同浏览器的缓存是独立的

## 管理员功能

在**管理后台 → 缓存管理**页面可以:

1. **查看状态**: 检查 Service Worker 运行状态
2. **清除缓存**: 手动清除所有图片缓存
3. **查看策略**: 了解缓存规则和有效期

### 何时需要清除缓存
- 图片资源更新了,但用户看到的是旧图
- 需要强制用户重新加载最新图片
- 排查图片相关问题

## 技术实现

### 文件结构
```
public/
  sw.js                           # Service Worker 主文件
src/
  utils/
    serviceWorker.ts              # Service Worker 管理工具
  components/admin/
    CacheManager.tsx              # 缓存管理组件
    CacheManager.css              # 缓存管理样式
  main.tsx                        # 注册 Service Worker
```

### 缓存存储位置
- **浏览器**: Chrome DevTools → Application → Cache Storage → `image-cache-v1-images`
- **本地文件**: 无(完全由浏览器管理)

## 浏览器兼容性

支持所有现代浏览器:
- ✅ Chrome/Edge 40+
- ✅ Firefox 44+
- ✅ Safari 11.1+
- ✅ Opera 27+
- ❌ IE 11 及以下(不支持 Service Worker,但不影响正常使用)

## 调试和排查

### 查看缓存内容
1. 打开 Chrome DevTools (F12)
2. 切换到 **Application** 标签
3. 左侧展开 **Cache Storage**
4. 选择 `image-cache-v1-images`
5. 查看已缓存的图片列表

### 查看 Service Worker 日志
打开 Console 标签,筛选包含 `[SW]` 的日志:
- `[SW] 使用缓存: <URL>` - 从缓存加载
- `[SW] 网络请求: <URL>` - 从网络加载
- `[SW] 已缓存: <URL>` - 成功缓存

### 手动清除缓存(开发者)
在 Console 中执行:
```javascript
// 清除图片缓存
caches.delete('image-cache-v1-images')

// 注销 Service Worker
navigator.serviceWorker.getRegistration().then(reg => reg.unregister())
```

## 更新日志

### v1.0 (2026-01-04)
- ✨ 初始版本
- 实现图片资源自动缓存
- 设置 24 小时缓存有效期
- 添加管理后台缓存管理页面
- 支持手动清除缓存

## 维护建议

1. **版本升级**: 修改 `public/sw.js` 中的 `CACHE_VERSION` 可强制更新缓存
2. **监控**: 定期检查用户反馈,确认缓存工作正常
3. **清理**: 如果发现缓存问题,可在管理后台清除缓存

## 常见问题

**Q: 为什么图片还是加载很慢?**
A: 首次访问需要从网络加载,后续访问才会使用缓存。检查 DevTools 网络面板,确认是否有 `(from ServiceWorker)` 标记。

**Q: 清除缓存后需要刷新页面吗?**
A: 是的,清除缓存后需要刷新页面才能看到效果。

**Q: 缓存会占用多少空间?**
A: 取决于用户浏览的页面数量,通常在 10-50MB 之间。浏览器会自动管理存储空间。

**Q: Service Worker 失效了怎么办?**
A: 刷新页面会自动重新注册。如果问题持续,检查浏览器控制台是否有错误信息。
