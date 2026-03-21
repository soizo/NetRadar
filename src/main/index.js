import { app, shell, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { getConfig, saveConfig, getConfigPath } from './configManager.js'

const isDev = process.env.NODE_ENV === 'development'

const iconPath = isDev
  ? join(process.cwd(), 'resources/icon.png')
  : join(__dirname, '../../resources/icon.png')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon: iconPath,
    backgroundColor: '#050505',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (process.platform === 'darwin') {
      mainWindow.setWindowButtonVisibility(false)
      app.dock.setIcon(nativeImage.createFromPath(iconPath))
    }
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  ipcMain.handle('get-config', async () => {
    try {
      return await getConfig()
    } catch (err) {
      console.error('get-config error:', err)
      return null
    }
  })

  ipcMain.handle('save-config', async (_, config) => {
    try {
      await saveConfig(config)
      return { success: true }
    } catch (err) {
      console.error('save-config error:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-config-path', () => {
    return getConfigPath()
  })

  ipcMain.on('window-minimize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.minimize()
  })

  ipcMain.on('window-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize()
    }
  })

  ipcMain.on('window-close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.close()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
