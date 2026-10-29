@echo off
set "BACKEND_DIR=%~dp0server"
if exist "%~dp0Backend\server" set "BACKEND_DIR=%~dp0Backend\server"
if exist "%~dp0Backend\package.json" set "BACKEND_DIR=%~dp0Backend"
cd /d "%BACKEND_DIR%"
title Seeding Database...
cls

echo ========================================================
echo       DATABASE SEEDING UTILITY
echo ========================================================
echo.
echo [INFO] This script will generate sample data for:
echo        - 100 Work Groups
echo        - 1,000 Departments
echo        - 3,000 Categories
echo        - 1,000 Users
echo        - 30,000 Procurement Records
echo.
echo [WARNING] All existing data in the database will be CLEARED!
echo.
pause

echo.
echo [1/2] Installing dependencies (if needed)...
if not exist "node_modules" (
    call npm install
)

echo.
echo [2/2] Running Seed Script...
echo.
call npm run seed

echo.
echo ========================================================
echo [DONE] Database seeding completed.
echo ========================================================
echo.
pause