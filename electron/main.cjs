const { app, BrowserWindow, Menu, dialog, shell, Notification, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const http = require('node:http');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let updateReady = false;
let printServer;
let printServerPort;
let printState = '{}';
let printPreviewWindow;

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

function ensurePrintServer() {
  if (printServerPort) return Promise.resolve(printServerPort);
  const distRoot = path.join(__dirname, '..', 'dist');
  printServer = http.createServer((request, response) => {
    const requestPath = new URL(request.url, 'http://127.0.0.1').pathname;
    if (requestPath === '/__print-state') { response.writeHead(200, {'Content-Type':'application/json'}); response.end(printState); return; }
    const relativePath = requestPath === '/' ? 'index.html' : decodeURIComponent(requestPath.slice(1));
    const filePath = path.resolve(distRoot, relativePath);
    if (!filePath.startsWith(path.resolve(distRoot) + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(filePath, (error, data) => { if (error) { response.writeHead(404).end(); return; } const ext=path.extname(filePath); const type=ext==='.css'?'text/css':ext==='.js'?'text/javascript':'text/html'; const isPrintRender=new URL(request.url,'http://127.0.0.1').searchParams.has('printRender'); if(relativePath==='index.html'&&isPrintRender) data=Buffer.from(data.toString().replace('<script src="app.js">',`<script>localStorage.setItem('todo-state',${JSON.stringify(printState)})</script><script src="app.js">`)); response.writeHead(200, {'Content-Type':`${type}; charset=utf-8`}); response.end(data); });
  });
  return new Promise(resolve => printServer.listen(0, '127.0.0.1', () => { printServerPort=printServer.address().port; resolve(printServerPort); }));
}

async function openPrintPreview() {
  printState = await mainWindow.webContents.executeJavaScript("localStorage.getItem('todo-state') || '{}'");
  const port = await ensurePrintServer();
  const sourceWindow = new BrowserWindow({show:false, webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  try {
    await sourceWindow.loadURL(`http://127.0.0.1:${port}/?printRender=1`);
    await sourceWindow.webContents.executeJavaScript('document.fonts.ready');
    const pdf = await sourceWindow.webContents.printToPDF({printBackground:true,pageSize:'A4',preferCSSPageSize:true});
    const pdfPath = path.join(app.getPath('temp'), 'jarvis-todo-print-preview.pdf');
    fs.writeFileSync(pdfPath, pdf);
    if (printPreviewWindow && !printPreviewWindow.isDestroyed()) printPreviewWindow.close();
    printPreviewWindow = new BrowserWindow({width:1050,height:850,minWidth:720,minHeight:600,title:'打印预览 - Jarvis Todo',backgroundColor:'#eef0f2',autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,plugins:true}});
    printPreviewWindow.on('closed',()=>{printPreviewWindow=null;});
    await printPreviewWindow.loadURL(pathToFileURL(pdfPath).toString());
  } finally { if (!sourceWindow.isDestroyed()) sourceWindow.destroy(); }
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
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
