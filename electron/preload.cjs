const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisDesktop', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openPrintPreview: () => ipcRenderer.invoke('open-print-preview'),
  printCurrentWindow: () => ipcRenderer.invoke('print-current-window'),
  closeCurrentWindow: () => ipcRenderer.invoke('close-current-window'),
  onUpdateStatus: callback => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  }
});
