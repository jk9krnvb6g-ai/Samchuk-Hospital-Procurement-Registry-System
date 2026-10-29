@echo off
:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :gotAdmin
) else (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:gotAdmin
cd /d "%~dp0"
title Procurement System (DEV MODE)
cls

echo ========================================================
echo       THAI PROCUREMENT - DEVELOPMENT MODE
echo ========================================================
echo.
echo [NOTE] This script runs the system in DEVELOPMENT mode.
echo        - Frontend: http://localhost:5173/Procurement/ (Hot Reload)
echo        - Backend:  http://localhost:3002
echo.
echo        * If you want to use the IIS version (https://localhost:3001/Procurement),
echo          please run 'start-iis-server.bat' instead.
echo.

:: 1. Backend Setup
echo [1/3] Checking Backend...
set "BACKEND_DIR=server"
if exist "Backend\server" set "BACKEND_DIR=Backend\server"
if exist "Backend\package.json" set "BACKEND_DIR=Backend"

if not exist "%BACKEND_DIR%\node_modules" (
    echo    - Installing Backend dependencies in %BACKEND_DIR%...
    cd %BACKEND_DIR%
    call npm install
    cd "%~dp0"
) else (
    echo    - Backend ready (%BACKEND_DIR%).
)

:: 2. Frontend Setup
echo [2/3] Checking Frontend...
if not exist "node_modules" (
    echo    - Installing Frontend dependencies...
    call npm install
) else (
    echo    - Frontend ready.
)

:: 3. Launch Unified System
echo.
echo [3/3] Launching Dev Server...
echo.

:: Open browser automatically after 5 seconds to the correct URL
start /b "" cmd /c "timeout /t 5 >nul && start http://localhost:5173/Procurement/"

:: Execute concurrently
npx --yes concurrently "npm run dev" "npm start --prefix %BACKEND_DIR%" --names "FRONT,BACK" --prefix-colors "green,blue"
