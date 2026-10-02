const { contextBridge, ipcRenderer } = require('electron');

// Puente seguro: la pagina le pide al programa que guarde un archivo
contextBridge.exposeInMainWorld('sicaoBridge', {
  guardar: (nombre, base64) => ipcRenderer.invoke('guardar-archivo', nombre, base64)
});
