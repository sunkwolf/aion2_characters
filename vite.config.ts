import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../部署/chunxia-legion/dist',  // 直接输出到部署目录
    emptyOutDir: true,  // 构建前清空输出目录
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        // 确保 Service Worker 文件不被 hash 重命名
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'sw.js') {
            return 'sw.js';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,
    proxy: {
      // 代理 AION2 API 请求,绕过 CORS 限制
      '/api/aion2': {
        target: 'https://tw.ncsoft.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/aion2/, '/aion2/api'),
        secure: false,
      },
      // 代理军团相册 API 请求到后端服务器
      '/api/gallery': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 代理成员配置 API 请求到后端服务器
      '/api/members': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 代理申请管理 API 请求到后端服务器
      '/api/applications': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 代理全局配置 API 请求到后端服务器
      '/api/config': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 代理角色信息 API 请求到后端服务器
      '/api/character': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 代理数据同步 API 请求到后端服务器
      '/api/sync': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 代理上传的图片请求
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
