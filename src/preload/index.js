import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  revealConfigPath: () => ipcRenderer.invoke('reveal-config-path'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowSetPosition: (x, y) => ipcRenderer.send('window-set-position', x, y),
  onWindowStateChange: (callback) => {
    const listener = (_, state) => callback(state)
    ipcRenderer.on('window-state-changed', listener)

    return () => {
      ipcRenderer.removeListener('window-state-changed', listener)
    }
  },
  platform: process.platform,
  diagIpIdentity:   ()    => ipcRenderer.invoke('diag-ip-identity'),
  diagCensorship:   (cc, targets)  => ipcRenderer.invoke('diag-censorship', cc, targets),
  diagDns:          ()    => ipcRenderer.invoke('diag-dns'),
  diagLocalNetwork: ()    => ipcRenderer.invoke('diag-local-network'),
  diagWifi:         ()    => ipcRenderer.invoke('diag-wifi'),
  diagSysContext:   ()    => ipcRenderer.invoke('diag-sys-context'),
  onMenuNavigate:   (cb)  => ipcRenderer.on('menu-navigate', cb)
})
