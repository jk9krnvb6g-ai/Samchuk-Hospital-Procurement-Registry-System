@echo off
cd /d "%~dp0"

:: 1. AUTO-REQUEST ADMIN PRIVILEGES (Fix Permission Denied)
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :gotAdmin
) else (
    echo [PERMISSION DENIED] You are in C:\inetpub. Administrator rights are required.
    echo Requesting permissions...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:gotAdmin
title Build Procurement System (IIS Admin Mode)
cls

echo ========================================================
echo       SAFE BUILD FOR IIS (ADMIN MODE)
echo ========================================================
echo.
echo [NOTE] 1. Requesting Admin Rights... (Done)
echo.

:: 2. STOP IIS (Fix EPERM/File Locked Error)
echo [1/4] Stopping IIS to release file locks...
iisreset /stop

:: 3. Install Dependencies
echo.
echo [2/4] Installing dependencies...
call npm install --no-audit

:: 4. Build Project
echo.
echo [3/4] Building project for production...
call npm run build

:: 5. START IIS
echo.
echo [4/4] Restarting IIS...
iisreset /start

echo.
echo ========================================================
echo [SUCCESS] Build complete!
echo ========================================================
echo.
echo Your production files are in: %~dp0dist
echo.
echo [IMPORTANT]
echo Ensure IIS Physical Path points to: %~dp0dist
echo.
pause