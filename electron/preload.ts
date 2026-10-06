import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktopCompanion', {
  ping: (): Promise<string> => ipcRenderer.invoke('desktop-companion:ping'),
})
