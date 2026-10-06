import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        settings: path.resolve(__dirname, 'settings.html'),
      },
    },
  },
})
