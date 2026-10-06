import vue from '@vitejs/plugin-vue'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import electron from 'vite-plugin-electron/simple'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const appIconSource = path.join(projectRoot, 'src/assets/icons/app-icon.png')

function copyAppIconPlugin(): Plugin {
  return {
    name: 'copy-app-icon-for-electron',
    writeBundle() {
      const destDir = path.join(projectRoot, 'dist-electron/assets/icons')
      mkdirSync(destDir, { recursive: true })
      copyFileSync(appIconSource, path.join(destDir, 'app-icon.png'))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          plugins: [copyAppIconPlugin()],
        },
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
        main: path.resolve(projectRoot, 'index.html'),
        settings: path.resolve(projectRoot, 'settings.html'),
      },
    },
  },
})
