@echo off
setlocal

title Forge of Thought Starter

echo [.] Starting Backend Server...
pushd backend
if errorlevel 1 ( echo ERROR: Failed to enter backend directory. Run from project root? & pause & exit /b 1 )

echo [.] Checking backend venv exists...
if not exist .venv\Scripts\activate.bat (
    echo ERROR: Virtual environment not found at backend\.venv\Scripts\activate.bat
    popd
    pause
    exit /b 1
)

echo [.] Launching backend (Uvicorn)...
start "ForgeBackend" cmd /k ".venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
popd

echo [.] Starting 3D Frontend Server...
pushd client-3d
if errorlevel 1 ( echo ERROR: Failed to enter client-3d directory. & pause & exit /b 1 )

echo [.] Launching 3D frontend (npm dev)...
start "Forge3DFrontend" cmd /k npm run dev
popd

echo [.] Servers launched in separate windows titled "ForgeBackend" and "Forge3DFrontend".
echo [.] Check those windows for errors.
echo [.] This window will close shortly.

timeout /t 5 > nul
endlocal