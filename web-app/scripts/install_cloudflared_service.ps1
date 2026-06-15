# install_cloudflared_service.ps1
# Requires PowerShell run as Administrator

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Cloudflared Service Installer (Stable)     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if running as Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "LOI: Ban phai chay script nay voi quyen Administrator (Run as Administrator)." -ForegroundColor Red
    Write-Host "Vui long click chuot phai vao file va chon 'Run with PowerShell', hoac mo PowerShell quyen Admin roi chay." -ForegroundColor Yellow
    Pause
    exit
}

# 1. Stop and uninstall any existing conflicting service
Write-Host "`n[1/5] Kiem tra va go bo service cu neu co..." -ForegroundColor Yellow
$service = Get-Service -Name "Cloudflared" -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq "Running") {
        Stop-Service -Name "Cloudflared" -Force
    }
    # Forcibly kill cloudflared to avoid StopPending hang
    $processes = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($processes) {
        Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Dang go bo service cu..."
    cloudflared service uninstall
    Start-Sleep -Seconds 2
}

# 2. Check installation method: Token vs Config Folder
$token = Read-Host "`nNhap Cloudflare Tunnel TOKEN (Chuoi dai tu Zero Trust Dashboard).`nNeu bo trong, script se co gang dung thu muc .cloudflared cua ban.`nToken"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Khong co Token. Chuyen sang che do Local Config..." -ForegroundColor Cyan
    
    $adminConfigPath = "$env:USERPROFILE\.cloudflared"
    $systemConfigPath = "C:\Windows\System32\config\systemprofile\.cloudflared"

    if (-not (Test-Path "$adminConfigPath\config.yml")) {
        Write-Host "LOI: Khong tim thay config.yml tai $adminConfigPath" -ForegroundColor Red
        Write-Host "Hay cau hinh tunnel local hoac cung cap Token!" -ForegroundColor Yellow
        Pause
        exit
    }

    Write-Host "`n[2/5] Dang copy cau hinh cho Windows System Service..." -ForegroundColor Yellow
    if (-not (Test-Path $systemConfigPath)) {
        New-Item -ItemType Directory -Force -Path $systemConfigPath | Out-Null
    }
    Copy-Item "$adminConfigPath\*" $systemConfigPath -Recurse -Force
    Write-Host "Da copy config thanh cong sang SYSTEM profile." -ForegroundColor Green

    Write-Host "`n[3/5] Cai dat Cloudflared Service tu thu muc Local..." -ForegroundColor Yellow
    cloudflared service install
} else {
    Write-Host "`n[2/5] Cai dat Cloudflared Service voi Token..." -ForegroundColor Yellow
    cloudflared service install $token
}

# 3. Optimize Service Recovery
Write-Host "`n[4/5] Cau hinh Service tu dong phuc hoi neu co loi..." -ForegroundColor Yellow
# set recovery options: restart service on first, second, and subsequent failures with 10 seconds delay.
sc.exe failure Cloudflared reset= 86400 actions= restart/10000/restart/10000/restart/10000

# 4. Start Service
Write-Host "`n[5/5] Khoi dong Cloudflared Service..." -ForegroundColor Yellow
Start-Service -Name "Cloudflared"
Start-Sleep -Seconds 3

# 5. Verify
$newStatus = (Get-Service -Name "Cloudflared").Status
if ($newStatus -eq "Running") {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " OK: Cloudflared Service dang chay on dinh!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "`nBan co the kiem tra trang thai bang lenh: cloudflared tunnel info my-tunnel"
} else {
    Write-Host "CANH BAO: Service da duoc cai nhung chua chay thanh cong. Vui long kiem tra Event Viewer." -ForegroundColor Red
}

Pause
