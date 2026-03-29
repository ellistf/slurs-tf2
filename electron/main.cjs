const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('node:path');
const services = require('./services.cjs');

const startUrl = process.env.ELECTRON_START_URL || '';
const isDev = process.env.ELECTRON_IS_DEV === '1';

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 720,
    title: 'Slurs.tf2',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '..', 'public', 'icon.ico')
  });

  window.once('ready-to-show', () => {
    window.show();

    if (isDev) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (startUrl && !url.startsWith(startUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  if (startUrl) {
    void window.loadURL(startUrl);
    return;
  }

  void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ipcMain.handle('slurs:get-runtime-info', () => services.getRuntimeInfo());
  ipcMain.handle('slurs:get-electron-settings', () => services.getElectronSettings());
  ipcMain.handle('slurs:save-electron-settings', (_event, payload) => services.saveElectronSettings(payload));
  ipcMain.handle('slurs:resolve-vanity', (_event, vanity) => services.resolveVanity(vanity));
  ipcMain.handle('slurs:get-profile', (_event, steamId) => services.getPlayerSummary(steamId));
  ipcMain.handle('slurs:get-logs', (_event, steamId, offset) => services.getLogs(steamId, offset));
  ipcMain.handle('slurs:get-log', (_event, logId) => services.getLog(logId));
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
