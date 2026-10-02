const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const SICAO_MAESTRO = 'https://raw.githubusercontent.com/machacamamanilizandro31-boop/SICAO-V2/main/index.html';

if (!app.requestSingleInstanceLock()) app.quit();

let win;

function rutaLibre(carpeta, nombre) {
  const ext = path.extname(nombre);
  const base = path.basename(nombre, ext);
  let destino = path.join(carpeta, nombre);
  let n = 1;
  while (fs.existsSync(destino)) destino = path.join(carpeta, `${base} (${n++})${ext}`);
  return destino;
}

function nombreSeguro(nombre, porDefecto) {
  const limpio = path.basename(String(nombre || porDefecto)).replace(/[<>:"/\\|?*]/g, '_');
  return limpio || porDefecto;
}

function descargarMaestro(destino) {
  return new Promise((resolve, reject) => {
    const req = https.get(SICAO_MAESTRO + '?t=' + Date.now(), {
      headers: { 'User-Agent': 'SICAO-V2-PC', 'Cache-Control': 'no-cache' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        https.get(res.headers.location, r2 => guardarRespuesta(r2, destino, resolve, reject))
          .on('error', reject);
        return;
      }
      guardarRespuesta(res, destino, resolve, reject);
    });
    req.setTimeout(15000, () => req.destroy(new Error('Tiempo de espera agotado')));
    req.on('error', reject);
  });
}

function guardarRespuesta(res, destino, resolve, reject) {
  if (res.statusCode !== 200) {
    res.resume();
    reject(new Error('HTTP ' + res.statusCode));
    return;
  }
  let datos = '';
  res.setEncoding('utf8');
  res.on('data', c => datos += c);
  res.on('end', () => {
    if (datos.length < 1000000 || !datos.includes('Sistema de Almac')) {
      reject(new Error('El index maestro recibido no es valido'));
      return;
    }
    fs.writeFileSync(destino, datos, 'utf8');
    resolve(destino);
  });
  res.on('error', reject);
}

ipcMain.handle('guardar-archivo', async (_evento, nombre, base64) => {
  const destino = rutaLibre(app.getPath('downloads'), nombreSeguro(nombre, 'reporte.xlsx'));
  fs.writeFileSync(destino, Buffer.from(String(base64), 'base64'));
  shell.showItemInFolder(destino);
  return true;
});

async function crearVentana() {
  Menu.setApplicationMenu(null);
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
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.maximize();

  const cacheDir = app.getPath('userData');
  const cacheMaestro = path.join(cacheDir, 'sicao-v2-maestro.html');
  const respaldoInstalado = path.join(__dirname, 'app', 'index.html');

  try {
    await descargarMaestro(cacheMaestro);
    await win.loadFile(cacheMaestro);
  } catch (e) {
    console.error('No se pudo actualizar SICAO-V2:', e.message);
    if (fs.existsSync(cacheMaestro)) await win.loadFile(cacheMaestro);
    else await win.loadFile(respaldoInstalado);
  }

  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      window.chrome = window.chrome || {};
      if (!window.chrome.webview) {
        window.chrome.webview = {
          postMessage: function (m) {
            try {
              window.sicaoBridge.guardar(m.nombreArchivo || 'reporte.xlsx', m.archivoBase64);
            } catch (e) { console.error(e); }
          }
        };
      }
    `).catch(() => {});
  });

  win.webContents.session.on('will-download', (_e, item) => {
    const destino = rutaLibre(app.getPath('downloads'), nombreSeguro(item.getFilename(), 'archivo'));
    item.setSavePath(destino);
    item.once('done', (_ev, estado) => {
      if (estado === 'completed') shell.showItemInFolder(destino);
    });
  });

  win.on('page-title-updated', e => e.preventDefault());

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
