import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  platform: process.platform,
  diagIpIdentity:   ()    => ipcRenderer.invoke('diag-ip-identity'),
  diagIpReputation: (ip)  => ipcRenderer.invoke('diag-ip-reputation', ip),
  diagCensorship:   (cc)  => ipcRenderer.invoke('diag-censorship', cc),
  diagDns:          ()    => ipcRenderer.invoke('diag-dns'),
  diagLocalNetwork: ()    => ipcRenderer.invoke('diag-local-network'),
  diagWifi:         ()    => ipcRenderer.invoke('diag-wifi')
})
