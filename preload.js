const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes a small, safe API to the renderer process via Electron's
 * `contextBridge`. Each function marshals requests to the main process
 * using `ipcRenderer.invoke`.
 */
contextBridge.exposeInMainWorld('api', {
  // Session Database APIs
  /**
   * Retrieve all saved study sessions from the main process.
   * @returns {Promise<Array<Object>>} Promise that resolves to an array of session objects.
   */
  getSessions: () => ipcRenderer.invoke('get-sessions'),

  /**
   * Save a session object to the session database in the main process.
   * @param {Object} session - Session data to save.
   * @returns {Promise<Object>} Promise that resolves to the saved session or status.
   */
  saveSession: (session) => ipcRenderer.invoke('save-session', session),

  /**
   * Delete a session by its identifier.
   * @param {string|number} sessionId - Identifier of the session to delete.
   * @returns {Promise<boolean>} Promise that resolves to true if deletion succeeded.
   */
  deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),

  /**
   * Remove all sessions from the session database.
   * @returns {Promise<boolean>} Promise that resolves to true when all sessions are cleared.
   */
  clearAllSessions: () => ipcRenderer.invoke('clear-all-sessions'),
  
  // Save Review Materials to Local Filesystem
  /**
   * Open a native save dialog in the main process and write provided content
   * to the filesystem with a default filename suggestion.
   * @param {string} defaultName - Suggested filename for the save dialog.
   * @param {string|Buffer} content - File content to write.
   * @returns {Promise<string>} Promise that resolves to the saved file path.
   */
  saveToFile: (defaultName, content) => ipcRenderer.invoke('save-to-file', { defaultName, content }),
  
  // Save Auto JSON Notes
  /**
   * Automatically save structured JSON notes to the workspace.
   * @param {string} content - JSON string of parsed notes.
   * @returns {Promise<Object>} Promise resolving to success status and file path.
   */
  saveJsonNotes: (content) => ipcRenderer.invoke('save-json-notes', content)
});
