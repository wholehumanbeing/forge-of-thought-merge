@echo off
echo Stopping any processes that might be locking files...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

echo Cleaning Vite cache...
rmdir /s /q node_modules\.vite 2>nul

echo Cleaning node_modules cache...
npm cache clean --force

echo Done! Now try running: npm run dev 