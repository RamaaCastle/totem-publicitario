import { app, BrowserWindow, ipcMain, screen, powerSaveBlocker } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, createWriteStream, unlink } from 'fs';
import * as https from 'https';
import * as http from 'http';

const isDev = process.env.NODE_ENV === 'development';
const profile = process.argv.find(a => a.startsWith('--profile='))?.split('=')[1] ?? 'default';
let CONFIG_PATH: string;
let CACHE_DIR: string;

interface DeviceConfig {
  deviceCode?: string;
  deviceToken?: string;
  apiUrl: string;
  wsUrl: string;
}

function loadConfig(): DeviceConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  return {
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    wsUrl: process.env.WS_URL || 'ws://localhost:3001',
  };
}

function saveConfig(config: DeviceConfig) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

let mainWindow: BrowserWindow | null = null;
let powerSaveId: number;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: !isDev,
    kiosk: !isDev,
    autoHideMenuBar: true,
    frame: false,
    alwaysOnTop: !isDev,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  powerSaveId = powerSaveBlocker.start('prevent-display-sleep');

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else if (isDev) {
    const vitePort = parseInt(process.env.VITE_PORT || '5173', 10);
    mainWindow.loadURL(`http://localhost:${vitePort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('will-navigate', (e: Electron.Event) => {
    if (!isDev) e.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle('config:load', () => loadConfig());

  ipcMain.handle('config:save', (_event, config: Partial<DeviceConfig>) => {
    const current = loadConfig();
    const updated = { ...current, ...config };
    saveConfig(updated);
    return updated;
  });

  ipcMain.handle('media:download', async (_event, { url, filename }: { url: string; filename: string }) => {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    const destPath = join(CACHE_DIR, filename);

    if (existsSync(destPath)) {
      return { cached: true, path: destPath };
    }

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = createWriteStream(destPath);
      protocol.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ cached: false, path: destPath });
        });
      }).on('error', (err: Error) => {
        unlink(destPath, () => {});
        reject(err);
      });
    });
  });

  ipcMain.handle('media:isCached', (_event, filename: string) => {
    return existsSync(join(CACHE_DIR, filename));
  });

  ipcMain.handle('media:localPath', (_event, filename: string) => {
    const p = join(CACHE_DIR, filename);
    return existsSync(p) ? `file://${p}` : null;
  });
}

// App lifecycle
const gotLock = profile === 'default' ? app.requestSingleInstanceLock() : true;
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    CONFIG_PATH = join(app.getPath('userData'), `device-config-${profile}.json`);
    CACHE_DIR = join(app.getPath('userData'), `media-cache-${profile}`);
    registerIpcHandlers();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (powerSaveId !== undefined) powerSaveBlocker.stop(powerSaveId);
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('child-process-gone', (_event, details) => {
    console.error('Child process gone:', details);
  });
}
