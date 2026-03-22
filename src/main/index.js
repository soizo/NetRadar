import { app, shell, BrowserWindow, ipcMain, nativeImage, screen, Menu } from 'electron'
import { join } from 'path'
import { getConfig, saveConfig, getConfigPath, resetConfigWithBackup } from './configManager.js'
import {
  getIpIdentity,
  checkCensorshipConnectivity,
  getDnsInfo,
  getLocalNetworkInfo,
  getWifiInfo,
  getSystemNetworkContext
} from './networkDiagnostics.js'

const isDev = process.env.NODE_ENV === 'development'

const iconPath = isDev
  ? join(process.cwd(), 'resources/icon.png')
  : join(__dirname, '../../resources/icon.png')

const restoreBoundsByWindow = new WeakMap()

function getWindowState(win) {
  if (!win || win.isDestroyed()) {
    return { isMaximized: false, isFullScreen: false, isSystemMaximized: false }
  }

  const bounds = win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  const workArea = display.workArea
  const tolerance = 1

  const fillsWorkArea =
    Math.abs(bounds.x - workArea.x) <= tolerance &&
    Math.abs(bounds.y - workArea.y) <= tolerance &&
    Math.abs(bounds.width - workArea.width) <= tolerance &&
    Math.abs(bounds.height - workArea.height) <= tolerance

  return {
    isMaximized: fillsWorkArea || win.isMaximized(),
    isFullScreen: win.isFullScreen(),
    isSystemMaximized: win.isMaximized()
  }
}

function rememberRestoreBounds(win) {
  const state = getWindowState(win)

  if (!state.isMaximized) {
    restoreBoundsByWindow.set(win, win.getBounds())
  }
}

function maximizeToWorkArea(win) {
  if (!win || win.isDestroyed()) return

  rememberRestoreBounds(win)

  if (win.isMaximized()) {
    win.unmaximize()
  }

  const display = screen.getDisplayMatching(win.getBounds())
  win.setBounds(display.workArea)
  emitWindowState(win)
}

function restoreFromMaximized(win) {
  if (!win || win.isDestroyed()) return

  if (win.isMaximized()) {
    win.unmaximize()
  }

  const restoreBounds = restoreBoundsByWindow.get(win)

  if (restoreBounds) {
    win.setBounds(restoreBounds)
  }

  emitWindowState(win)
}

function emitWindowState(win) {
  if (!win || win.isDestroyed()) return

  win.webContents.send('window-state-changed', getWindowState(win))
}

function buildApplicationMenu() {
  if (process.platform !== 'darwin') return

  const config = getConfig()
  const appName = config?.app?.name || app.name
  const repoUrl = config?.meta?.repo || 'https://github.com/soizoktantas/NetRadar'

  const versionLabel = `${appName} ${config?.version || app.getVersion()}`
  const template = [
    {
      label: appName,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences…',
          accelerator: 'Cmd+,',
          click: () => {
            const win = BrowserWindow.getAllWindows()[0]
            if (win) win.webContents.send('menu-navigate', 'config')
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [{ role: 'close' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: versionLabel, enabled: false },
        {
          label: `${appName} Repository`,
          click: () => shell.openExternal(repoUrl)
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Set dock icon as early as possible on macOS
if (process.platform === 'darwin') {
  app.dock.setIcon(nativeImage.createFromPath(iconPath))
}

function createWindow() {
  const config = getConfig()
  const windowConfig = config?.window || {}

  const mainWindow = new BrowserWindow({
    title: config?.app?.name || 'NetRadar',
    width: windowConfig.width || 1200,
    height: windowConfig.height || 780,
    minWidth: windowConfig.min_width || 960,
    minHeight: windowConfig.min_height || 640,
    roundedCorners: windowConfig.rounded_corners ?? false,
    show: false,
    autoHideMenuBar: windowConfig.auto_hide_menu_bar ?? true,
    frame: false,
    icon: iconPath,
    backgroundColor: windowConfig.background_color || '#050505',
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
    }
    mainWindow.show()
    emitWindowState(mainWindow)
  })

  mainWindow.on('maximize', () => emitWindowState(mainWindow))
  mainWindow.on('unmaximize', () => emitWindowState(mainWindow))
  mainWindow.on('enter-full-screen', () => emitWindowState(mainWindow))
  mainWindow.on('leave-full-screen', () => emitWindowState(mainWindow))
  mainWindow.on('will-resize', () => rememberRestoreBounds(mainWindow))
  mainWindow.on('will-move', () => rememberRestoreBounds(mainWindow))
  mainWindow.on('move', () => emitWindowState(mainWindow))
  mainWindow.on('resize', () => emitWindowState(mainWindow))

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
  buildApplicationMenu()

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

  ipcMain.handle('reset-config', async () => {
    try {
      const config = await resetConfigWithBackup((path) => shell.trashItem(path))
      return { success: true, config }
    } catch (err) {
      console.error('reset-config error:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-config-path', () => {
    return getConfigPath()
  })

  ipcMain.handle('reveal-config-path', async () => {
    const configPath = getConfigPath()

    if (!configPath) {
      return { success: false }
    }

    shell.showItemInFolder(configPath)
    return { success: true }
  })

  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      cwd: process.cwd()
    }
  })

  ipcMain.handle('get-window-state', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return getWindowState(win)
  })

  ipcMain.handle('diag-ip-identity',    async ()        => getIpIdentity())
  ipcMain.handle('diag-censorship',     async (_, cc, targets)   => checkCensorshipConnectivity(cc, targets))
  ipcMain.handle('diag-dns',            async ()        => getDnsInfo())
  ipcMain.handle('diag-local-network',  async ()        => getLocalNetworkInfo())
  ipcMain.handle('diag-wifi',           async ()        => getWifiInfo())
  ipcMain.handle('diag-sys-context',    async ()        => getSystemNetworkContext())

  ipcMain.on('window-set-position', (e, x, y) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win && !win.isDestroyed()) win.setPosition(Math.round(x), Math.round(y))
  })

  ipcMain.on('window-minimize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.minimize()
  })

  ipcMain.on('window-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      const state = getWindowState(win)

      if (state.isMaximized) {
        restoreFromMaximized(win)
      } else {
        maximizeToWorkArea(win)
      }
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
