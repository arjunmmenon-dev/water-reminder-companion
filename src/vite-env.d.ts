/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface DesktopCompanionApi {
  ping: () => Promise<string>
}

declare global {
  interface Window {
    desktopCompanion: DesktopCompanionApi
  }
}

export {}
