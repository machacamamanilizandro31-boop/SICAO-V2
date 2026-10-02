/* Puente de SICAO para la app Android.
   El WebView de Android no sabe descargar archivos "blob". Este script:
   1) Hace creer a SICAO que esta en su version de escritorio, para que envie
      el Excel armado (en vez de copiarlo al portapapeles).
   2) Intercepta cualquier descarga (PDF, fotos, respaldos) y la guarda.
   Luego abre el menu de Android para guardar el archivo o abrirlo con Excel,
   WhatsApp, Drive, etc. */
(function () {
  function plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || {};
  }
  function esNativa() {
    var C = window.Capacitor;
    return !!(C && C.isNativePlatform && C.isNativePlatform());
  }

  function guardarYCompartir(nombre, base64) {
    var P = plugins();
    if (!P.Filesystem || !P.Share) {
      alert('No se pudo guardar el archivo en este dispositivo.');
      return Promise.resolve(false);
    }
    var limpio = String(nombre || 'reporte.xlsx').replace(/[\\\/:*?"<>|]/g, '_');
    return P.Filesystem.writeFile({ path: limpio, data: base64, directory: 'CACHE' })
      .then(function (r) {
        return P.Share.share({
          title: limpio,
          text: limpio,
          files: [r.uri],
          dialogTitle: 'Guardar o abrir el archivo'
        });
      })
      .then(function () { return true; })
      .catch(function (e) {
        // Si el usuario cierra el menu de compartir no es un error real
        if (e && /cancel/i.test(String(e.message || e))) return true;
        console.error(e);
        alert('No se pudo guardar el archivo: ' + (e && e.message ? e.message : e));
        return false;
      });
  }

  function aBase64(url) {
    return fetch(url)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      });
  }

  if (!esNativa()) return;   // en navegador normal no hace nada

  // 1) Puente tipo "SICAO.Desktop" (reportes Excel)
  window.chrome = window.chrome || {};
  if (!window.chrome.webview) {
    window.chrome.webview = {
      postMessage: function (m) {
        guardarYCompartir(m && m.nombreArchivo, m && m.archivoBase64);
      }
    };
  }

  // 2) Descargas normales (<a download href="blob:...">)
  var clickOriginal = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    if (a.hasAttribute('download') && /^(blob:|data:)/.test(a.href) && plugins().Filesystem) {
      var nombre = a.getAttribute('download') || 'archivo';
      aBase64(a.href).then(function (b64) { return guardarYCompartir(nombre, b64); });
      return;
    }
    return clickOriginal.apply(a, arguments);
  };
})();
