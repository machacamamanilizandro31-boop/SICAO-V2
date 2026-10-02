const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const SICAO_MAESTRO_URL = 'https://raw.githubusercontent.com/machacamamanilizandro31-boop/SICAO-V2/main/index.html';

function descargarMaestro(url, destino, redirecciones = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'SICAO-Desktop' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirecciones < 5) {
        res.resume();
        return descargarMaestro(res.headers.location, destino, redirecciones + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      let datos = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { datos += chunk; });
      res.on('end', () => {
        if (datos.length < 1000000 || !/Sistema de Almac/i.test(datos)) return reject(new Error('index remoto no valido'));
        fs.writeFileSync(destino, datos, 'utf8');
        resolve(destino);
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// Una sola ventana de SICAO a la vez
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;

// Si ya existe un archivo con ese nombre, agrega (1), (2)...
function rutaLibre(carpeta, nombre) {
  const ext = path.extname(nombre);
  const base = path.basename(nombre, ext);
  let destino = path.join(carpeta, nombre);
  let n = 1;
  while (fs.existsSync(destino)) {
    destino = path.join(carpeta, `${base} (${n})${ext}`);
    n++;
  }
  return destino;
}

function nombreSeguro(nombre, porDefecto) {
  const limpio = path.basename(String(nombre || porDefecto)).replace(/[<>:"/\\|?*]/g, '_');
  return limpio || porDefecto;
}

// SICAO envia aqui los reportes Excel (como lo hace con SICAO.Desktop)
ipcMain.handle('guardar-archivo', async (_evento, nombre, base64) => {
  const destino = rutaLibre(app.getPath('downloads'), nombreSeguro(nombre, 'reporte.xlsx'));
  fs.writeFileSync(destino, Buffer.from(String(base64), 'base64'));
  shell.showItemInFolder(destino);   // abre la carpeta con el archivo seleccionado
  return true;
});

async function crearVentana() {
  Menu.setApplicationMenu(null);            // sin menu File/Edit/View...
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

  // En cada inicio intenta bajar el index maestro de SICAO-V2.
  // Si no hay Internet, usa la ultima copia descargada; si tampoco existe, usa la incluida en el instalador.
  const cacheDir = app.getPath('userData');
  const cacheIndex = path.join(cacheDir, 'sicao-index-remoto.html');
  const indexIncluido = path.join(__dirname, 'app', 'index.html');
  let indexACargar = cacheIndex;
  try {
    await descargarMaestro(SICAO_MAESTRO_URL, cacheIndex);
  } catch (e) {
    console.warn('No se pudo actualizar SICAO desde GitHub:', e.message);
    if (!fs.existsSync(cacheIndex)) indexACargar = indexIncluido;
  }
  await win.loadFile(indexACargar);

  // Hace que SICAO crea que esta en su version de escritorio: asi envia el
  // Excel ya armado en vez de copiarlo al portapapeles (solo sirve en el complemento).
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

  // Cualquier otra descarga (PDF, fotos, respaldos) va directo a Descargas
  win.webContents.session.on('will-download', (_e, item) => {
    const destino = rutaLibre(app.getPath('downloads'), nombreSeguro(item.getFilename(), 'archivo'));
    item.setSavePath(destino);
    item.once('done', (_ev, estado) => {
      if (estado === 'completed') shell.showItemInFolder(destino);
    });
  });

  // El titulo lo controla la app, no la pagina
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
