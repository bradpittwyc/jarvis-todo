const { app, BrowserWindow, Menu, dialog, shell, Notification, ipcMain } = require('electron');
const path = require('node:path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let printPreviewWindow;
let updateReady = false;

log.initialize();
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 760,
    minHeight: 620,
    backgroundColor: '#191919',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function openPrintPreview() {
  if (printPreviewWindow && !printPreviewWindow.isDestroyed()) {
    printPreviewWindow.focus();
    return;
  }

  printPreviewWindow = new BrowserWindow({
    width: 980,
    height: 820,
    minWidth: 720,
    minHeight: 620,
    title: '打印预览 - Jarvis Todo',
    backgroundColor: '#505050',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  printPreviewWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query: { printPreview: '1' } });
  printPreviewWindow.on('closed', () => { printPreviewWindow = null; });
}

function configureUpdater() {
  autoUpdater.on('checking-for-update', () => sendUpdateState('checking'));
  autoUpdater.on('update-available', info => sendUpdateState('available', info.version));
  autoUpdater.on('update-not-available', () => sendUpdateState('current', app.getVersion()));
  autoUpdater.on('download-progress', progress => sendUpdateState('downloading', Math.round(progress.percent)));
  autoUpdater.on('error', error => {
    log.error('Update error', error);
    sendUpdateState('error', error.message);
  });
  autoUpdater.on('update-downloaded', info => {
    updateReady = true;
    sendUpdateState('downloaded', info.version);
    if (Notification.isSupported()) {
      new Notification({ title: 'Jarvis Todo 更新已就绪', body: `版本 ${info.version} 已下载，重启应用即可安装。` }).show();
    }
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `Jarvis Todo ${info.version} 已下载完成。`,
      detail: '现在重启并安装更新吗？',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });
}

function sendUpdateState(status, value = null) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', { status, value });
}

function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox(mainWindow, { type: 'info', title: '检查更新', message: '开发模式不会检查更新。', detail: `当前版本：${app.getVersion()}` });
    return;
  }
  autoUpdater.checkForUpdates().catch(error => {
    log.error(error);
    if (manual) dialog.showErrorBox('检查更新失败', error.message);
  });
}

function buildMenu() {
  const template = [
    { label: '文件', submenu: [
      { label: '打印列表', accelerator: 'CmdOrCtrl+P', click: openPrintPreview },
      { type: 'separator' },
      { role: 'quit', label: '退出' }
    ]},
    { label: '查看', submenu: [
      { role: 'reload', label: '刷新' },
      { role: 'togglefullscreen', label: '全屏' },
      { type: 'separator' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { role: 'resetZoom', label: '实际大小' }
    ]},
    { label: '帮助', submenu: [
      { label: '检查更新', click: () => updateReady ? autoUpdater.quitAndInstall(false, true) : checkForUpdates(true) },
      { label: `关于 Jarvis Todo ${app.getVersion()}`, click: () => dialog.showMessageBox(mainWindow, { title: '关于 Jarvis Todo', message: `Jarvis Todo ${app.getVersion()}`, detail: '简洁、专注的桌面待办事项管理器。' }) }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    configureUpdater();
    createWindow();
    buildMenu();
    setTimeout(() => checkForUpdates(false), 3000);
  });
}

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('check-for-updates', () => checkForUpdates(true));
ipcMain.handle('open-print-preview', openPrintPreview);
ipcMain.handle('print-current-window', event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.webContents.print({ printBackground: true });
});
ipcMain.handle('close-current-window', event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win !== mainWindow) win.close();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
