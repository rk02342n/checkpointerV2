import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({
    target: 'react',
    autoCodeSplitting: true,
  }), react(), tailwindcss(), nodePolyfills({ include: ['buffer'], globals: { Buffer: true, global: true, process: false } })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vite-plugin-node-polyfills/shims/buffer": path.resolve(__dirname, "./node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.js"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      }
    }
  }
})
