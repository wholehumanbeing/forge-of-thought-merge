@echo off
echo ===== Starting Vite with alternative config (no dependency optimization) =====

echo ===== Stopping any Node.js processes =====
taskkill /f /im node.exe >nul 2>&1

echo ===== Cleaning temporary directories =====
set TEMP_VITE_CACHE=%TEMP%\vite-client-3d-cache
rmdir /s /q "%TEMP_VITE_CACHE%" 2>nul

echo ===== Starting Vite with alternative config =====
npx vite --config no-deps-vite.config.ts 