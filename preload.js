const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Session Database APIs
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  saveSession: (session) => ipcRenderer.invoke('save-session', session),
  deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),
  clearAllSessions: () => ipcRenderer.invoke('clear-all-sessions'),
  
  // Save Review Materials to Local Filesystem
  saveToFile: (defaultName, content) => ipcRenderer.invoke('save-to-file', { defaultName, content }),
  
  // Read PDF File
  readPdfFile: () => ipcRenderer.invoke('read-pdf-file')
});
