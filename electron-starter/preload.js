const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] loaded');

contextBridge.exposeInMainWorld('riot', {
  getAllGameData: () => {
    console.log('[preload] invoking riot:getAllGameData');
    return ipcRenderer.invoke('riot:getAllGameData');
  }
});
