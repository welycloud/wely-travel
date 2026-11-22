@echo off
REM WELY Travel: abre el centro de mando con datos reales (scraping + Google Flights). Necesita Node.js 18+.
cd /d "%~dp0"
if not exist node_modules (echo Instalando por unica vez... & call npm install)
if not exist dist (call npm run build)
node server\servidor.mjs
pause
