const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // needed to access app path and preloads fully in some Electron environments
    },
    show: false,
    autoHideMenuBar: true, // Keep it clean and focused
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Mirror console messages from renderer to terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] ${message} (${path.basename(sourceId)}:${line})`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// JSON Database Helper in app userData folder
const getDbPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'sessions.json');
};

const readSessions = () => {
  const dbPath = getDbPath();
  try {
    if (!fs.existsSync(dbPath)) {
      return [];
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading sessions database:', err);
    return [];
  }
};

const writeSessions = (sessions) => {
  const dbPath = getDbPath();
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(sessions, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing sessions database:', err);
    return false;
  }
};

// IPC Handlers for Local Database
ipcMain.handle('get-sessions', async () => {
  return readSessions();
});

ipcMain.handle('save-session', async (event, session) => {
  const sessions = readSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index !== -1) {
    sessions[index] = session;
  } else {
    sessions.unshift(session); // Unshift so newest sessions display at the top of history list
  }
  return writeSessions(sessions);
});

ipcMain.handle('delete-session', async (event, sessionId) => {
  const sessions = readSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  return writeSessions(filtered);
});

ipcMain.handle('clear-all-sessions', async () => {
  return writeSessions([]);
});

// IPC Handler for Saving Review Files to Local Filesystem
ipcMain.handle('save-to-file', async (event, { defaultName, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Review Materials',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Save cancelled' };
  }

  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false, message: err.message };
  }
});

// IPC Handler for Reading PDF files
ipcMain.handle('read-pdf-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PDF Study Notes',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, message: 'No file selected' };
  }

  const filePath = filePaths[0];
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      success: true,
      text: data.text,
      fileName: path.basename(filePath, '.pdf')
    };
  } catch (err) {
    console.error('Failed to parse PDF:', err);
    return { success: false, message: err.message };
  }
});

// App Lifecycle Control
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
