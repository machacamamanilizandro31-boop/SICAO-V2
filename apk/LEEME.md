# SICAO para Android (APK) - sin barra de navegador

El HTML va guardado DENTRO de la app (Capacitor). No usa Chrome ni muestra
barra de direcciones, y funciona sin internet ni hosting.

## Opción A: con Android Studio (en tu PC)
Requisitos: Node.js LTS y Android Studio (incluye el JDK).

    npm install
    npx cap add android
    npx cap sync android
    npx cap open android

En Android Studio: menú Build -> Build Bundle(s) / APK(s) -> Build APK(s).
El archivo queda en android/app/build/outputs/apk/debug/app-debug.apk

## Opción B: sin instalar nada (GitHub Actions)
1. Crea un repositorio gratis en github.com y sube TODO el contenido de
   esta carpeta (incluida la carpeta oculta .github).
2. Pestaña Actions -> "Crear APK" -> Run workflow.
3. Al terminar, descarga el APK en "Artifacts" (SICAO-apk).

## Instalar en el celular
Pasa el .apk al teléfono y ábrelo (permite "instalar apps desconocidas").

## Ícono personalizado (opcional)
    npm install -D @capacitor/assets
    npx capacitor-assets generate --android
(usa resources/icon.png; mejor si lo reemplazas por uno de 1024x1024)

## Actualizar SICAO
Reemplaza www/index.html por la versión nueva y ejecuta:
    npx cap sync android
y vuelve a compilar.

## Nota
Los datos viven en el celular donde se instala la app. Los del navegador no
pasan solos: usa el respaldo/exportar de SICAO y restaura dentro de la app.
