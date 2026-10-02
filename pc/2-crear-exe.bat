@echo off
cd /d "%~dp0"
call npm install
call npm run build
echo.
echo Listo. Tu programa esta en la carpeta "dist" (archivo SICAO-Setup-1.0.0.exe (instalador))
pause
