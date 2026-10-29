
@echo off
title Procurement Backend (For IIS)
cd /d "%~dp0"
cls

echo ========================================================
echo       PROCUREMENT BACKEND SERVER (For IIS)
echo ========================================================
echo.
echo [INFO] This script runs ONLY the Backend API.
echo        Use this when accessing the web via IIS.
echo.
echo        - IIS Web:  http://localhost/Procurement/
echo        - API Port: 3002
echo.

set "BACKEND_DIR=server"
if exist "Backend\server" set "BACKEND_DIR=Backend\server"
if exist "Backend\package.json" set "BACKEND_DIR=Backend"

if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] Installing Backend dependencies in %BACKEND_DIR%...
    cd %BACKEND_DIR%
    call npm install
    cd "%~dp0"
)

echo [INFO] Starting Server from %BACKEND_DIR%...
cd %BACKEND_DIR%

:: ใช้ cmd /k เพื่อไม่ให้หน้าต่างปิดเองถ้ามี Error
cmd /k "npm start"
