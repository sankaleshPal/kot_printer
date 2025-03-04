const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  discoverPrinters: () => ipcRenderer.invoke('discover-printers'),
  registerPrinter: (printer) => ipcRenderer.invoke('register-printer', printer)
});