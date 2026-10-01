const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Una sola ventana de SICAO a la vez
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;

function crearVentana() {
  Menu.setApplicationMenu(null);            // sin menú File/Edit/View...
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SICAO',
    backgroundColor: '#1B2533',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.maximize();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // El título lo controla la app, no la página
  win.on('page-title-updated', (e) => e.preventDefault());

  // Enlaces externos (http/https) se abren en el navegador del sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(crearVentana);

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => app.quit());
