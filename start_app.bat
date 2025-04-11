@echo off
setlocal

title Forge of Thought Starter

echo [.] Starting Backend Server...
pushd backend
if errorlevel 1 ( echo ERROR: Failed to enter backend directory. Run from project root? & pause & exit /b 1 )

echo [.] Activating backend venv...
call .venv\Scripts\activate
if errorlevel 1 ( echo ERROR: Failed to activate backend\.venv\Scripts\activate. & popd & pause & exit /b 1 )

echo [.] Launching backend (Uvicorn)...
start "ForgeBackend" cmd /k python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
popd

echo [.] Starting Frontend Server...
pushd frontend
if errorlevel 1 ( echo ERROR: Failed to enter frontend directory. & pause & exit /b 1 )

echo [.] Launching frontend (npm dev)...
start "ForgeFrontend" cmd /k npm run dev
popd

echo [.] Servers launched in separate windows titled "ForgeBackend" and "ForgeFrontend".
echo [.] Check those windows for errors.
echo [.] This window will close shortly.

timeout /t 5 > nul
endlocal