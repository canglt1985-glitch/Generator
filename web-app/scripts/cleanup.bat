@echo off
:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Dang chay voi quyen Administrator.
) else (
    echo [LOI] Ban phai chay file nay bang cach click chuot phai va chon 'Run as administrator'!
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cleanup.ps1"
echo.
echo Hoan tat. Nhan phim bat ky de thoat...
pause >nul
