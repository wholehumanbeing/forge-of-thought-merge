@echo off
echo ===== Stopping any Node.js or npm processes =====
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

echo ===== Cleaning Vite cache =====
set TEMP_VITE_CACHE=%TEMP%\vite-client-3d-cache
echo Removing cache from %TEMP_VITE_CACHE%
rmdir /s /q "%TEMP_VITE_CACHE%" 2>nul

echo ===== Cleaning node_modules cache =====
npm cache clean --force

echo ===== Removing .vite directory if it exists =====
rmdir /s /q .vite 2>nul
rmdir /s /q .vite_cache 2>nul

echo ===== Starting dev server with clean environment =====
echo If this fails, you may need to run the command manually from an administrator command prompt.
npm run dev

echo ===== If the server failed to start, try running this as Administrator ===== 