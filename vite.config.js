import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '我的自制游戏盒',
        short_name: 'GameBox',
        description: '离线小游戏合集',
        theme_color: '#000000',
        display: 'standalone', // 关键：全屏显示
        background_color: '#000000',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/731/731941.png', // 找一个临时图标
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      // 2. 配置别名：将 @ 指向 src 目录的绝对路径
      '@': path.resolve(__dirname, './src'),
    },
  },
})
