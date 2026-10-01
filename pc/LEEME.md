# SICAO para PC (Windows) - sin barra de navegador

Esto abre SICAO en su propia ventana (Electron), sin barra de direcciones,
sin pestañas y sin menús. El sistema va guardado dentro del programa.

## Requisito (una sola vez)
Instalar Node.js LTS desde https://nodejs.org

## Pasos
1. Descomprime esta carpeta.
2. Doble clic en `1-probar.bat` -> se abre SICAO como app (para verificar).
3. Doble clic en `2-crear-exe.bat` -> crea `dist\SICAO 1.0.0.exe`.
   Ese .exe es portable: lo copias a cualquier PC y funciona sin instalar.

## Notas
- Los datos se guardan en la PC donde se usa (localStorage del programa).
  Los datos que tengas en el navegador NO pasan solos: usa la opción de
  respaldo/exportar de SICAO en el navegador y luego restaura en la app.
- Para actualizar SICAO: reemplaza `app\index.html` por la versión nueva
  y vuelve a ejecutar `2-crear-exe.bat`.
