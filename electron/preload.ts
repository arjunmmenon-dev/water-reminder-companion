import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktopCompanion', {
  ping: (): Promise<string> => ipcRenderer.invoke('desktop-companion:ping'),
  getCursorScreenPoint: (): Promise<{ x: number; y: number }> =>
    ipcRenderer.invoke('desktop-companion:cursor-point'),
  getWindowBounds: (): Promise<{ x: number; y: number; width: number; height: number }> =>
    ipcRenderer.invoke('desktop-companion:window-bounds'),
  setIgnoreMouseEvents: (ignore: boolean): void => {
    ipcRenderer.send('desktop-companion:set-ignore-mouse-events', ignore)
  },
})
