# install_cloudflared_service.ps1
# Requires PowerShell run as Administrator

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Cloudflared Service Installer (Stable) " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if running as Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "LỖI: Bạn phải chạy script này với quyền Administrator (Run as Administrator)." -ForegroundColor Red
    Write-Host "Vui lòng click chuột phải vào file và chọn 'Run with PowerShell', hoặc mở PowerShell quyền Admin rồi chạy." -ForegroundColor Yellow
    Pause
    exit
}

# 1. Stop and uninstall any existing conflicting service
Write-Host "`n[1/5] Kiểm tra và gỡ bỏ service cũ nếu có khuyết điểm..." -ForegroundColor Yellow
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
    
    Write-Host "Đang gỡ bỏ service cũ..."
    cloudflared service uninstall
    Start-Sleep -Seconds 2
}

# 2. Check installation method: Token vs Config Folder
$token = Read-Host "`nNhập Cloudflare Tunnel TOKEN (Chuỗi dài từ Zero Trust Dashboard).`nNếu bỏ trống, script sẽ cố gắng dùng thư mục .cloudflared của bạn.`nToken"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Không có Token. Chuyển sang chế độ Local Config..." -ForegroundColor Cyan
    
    $adminConfigPath = "$env:USERPROFILE\.cloudflared"
    $systemConfigPath = "C:\Windows\System32\config\systemprofile\.cloudflared"

    if (-not (Test-Path "$adminConfigPath\config.yml")) {
        Write-Host "LỖI: Không tìm thấy config.yml tại $adminConfigPath" -ForegroundColor Red
        Write-Host "Hãy cấu hình tunnel local hoặc cung cấp Token!" -ForegroundColor Yellow
        Pause
        exit
    }

    Write-Host "`n[2/5] Đang copy cấu hình cho Windows System Service..." -ForegroundColor Yellow
    if (-not (Test-Path $systemConfigPath)) {
        New-Item -ItemType Directory -Force -Path $systemConfigPath | Out-Null
    }
    Copy-Item "$adminConfigPath\*" $systemConfigPath -Recurse -Force
    Write-Host "Đã copy config thành công sang SYSTEM profile." -ForegroundColor Green

    Write-Host "`n[3/5] Cài đặt Cloudflared Service từ thư mục Local..." -ForegroundColor Yellow
    cloudflared service install
} else {
    Write-Host "`n[2/5] Cài đặt Cloudflared Service với Token..." -ForegroundColor Yellow
    cloudflared service install $token
}

# 3. Optimize Service Recovery
Write-Host "`n[4/5] Cấu hình Service tự động phục hồi nếu có lỗi..." -ForegroundColor Yellow
# set recovery options: restart service on first, second, and subsequent failures with 10 seconds delay.
sc.exe failure Cloudflared reset= 86400 actions= restart/10000/restart/10000/restart/10000

# 4. Start Service
Write-Host "`n[5/5] Khởi động Cloudflared Service..." -ForegroundColor Yellow
Start-Service -Name "Cloudflared"
Start-Sleep -Seconds 3

# 5. Verify
$newStatus = (Get-Service -Name "Cloudflared").Status
if ($newStatus -eq "Running") {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " ✅ THÀNH CÔNG: Cloudflared Service đang chạy ổn định!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "`nBạn có thể kiểm tra trạng thái bằng lệnh: cloudflared tunnel info my-tunnel"
} else {
    Write-Host "⚠️ CẢNH BÁO: Service đã được cài nhưng chưa chạy thành công. Vui lòng kiểm tra Event Viewer." -ForegroundColor Red
}

Pause
