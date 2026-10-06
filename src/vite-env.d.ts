/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface DesktopCompanionApi {
  ping: () => Promise<string>
  getCursorScreenPoint: () => Promise<{ x: number; y: number }>
  getWindowBounds: () => Promise<{
    x: number
    y: number
    width: number
    height: number
  }>
  setIgnoreMouseEvents: (ignore: boolean) => void
}

declare global {
  interface Window {
    desktopCompanion: DesktopCompanionApi
  }
}

export {}
