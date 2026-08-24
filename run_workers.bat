@echo off
title TVT3 Daemon Manager
cd /d "%~dp0"

echo ==================================================
echo 🚀 Starting TVT3 Backend Daemon Manager
echo ==================================================

:: Check if virtualenv exists in root directory
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    goto :START
)

:: Check if virtualenv exists in backend directory
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=backend\.venv\Scripts\python.exe"
    goto :START
)

:: Fallback to system python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [WARNING] Local virtual environment (.venv) not found. Using system Python...
    set "PYTHON_EXE=python"
    goto :START
)

echo [ERROR] Python not found on system! Please install Python and set up a virtual environment (.venv).
pause
exit /b 1

:START
echo [INFO] Using Python executable: %PYTHON_EXE%
%PYTHON_EXE% backend\run_workers.py
echo.
echo [WARNING] Daemon manager stopped or crashed. Restarting in 10 seconds...
timeout /t 10
goto :START
