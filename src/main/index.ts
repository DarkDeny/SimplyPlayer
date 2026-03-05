import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './ipc-handlers';
import { dbg } from './debug-log';

if (started) {
  app.quit();
}

process.on('uncaughtException', (err) => dbg(`UNCAUGHT: ${err.stack || err}`));
process.on('unhandledRejection', (r) => dbg(`UNHANDLED: ${r}`));

dbg('Main process starting');

const createWindow = () => {
  dbg('createWindow');
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow direct file:// access for local audio playback.
      // Security is maintained via contextIsolation + no nodeIntegration.
      webSecurity: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    dbg('ready-to-show');
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Capture ALL renderer console messages for debug.log
  mainWindow.webContents.on('console-message', (_e, level, message) => {
    const prefix = level >= 2 ? 'RENDERER-ERR' : 'RENDERER';
    dbg(`${prefix}: ${message}`);
  });
};

app.on('ready', () => {
  dbg('app ready');
  registerIpcHandlers();
  dbg('IPC handlers registered');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
