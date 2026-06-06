$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " VH_WebApp Service Installer (using WinSW) " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check if running as Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "LỖI: Bạn phải chạy script này với quyền Administrator (Run as Administrator)." -ForegroundColor Red
    Write-Host "Vui lòng click chuột phải vào file và chọn 'Run with PowerShell', hoặc mở PowerShell quyền Admin rồi chạy." -ForegroundColor Yellow
    Pause
    exit
}

# Paths
$scriptPath = $PSScriptRoot
$webAppDir = Resolve-Path "$scriptPath\.." | Select-Object -ExpandProperty Path
$projectDir = Resolve-Path "$webAppDir\.." | Select-Object -ExpandProperty Path
$pythonExe = "$projectDir\.venv_win\Scripts\python.exe"

$serviceName = "VH_WebApp"
$exeName = "VH_WebApp_Service.exe"
$xmlName = "VH_WebApp_Service.xml"
$exePath = "$scriptPath\$exeName"
$xmlPath = "$scriptPath\$xmlName"

if (-not (Test-Path $pythonExe)) {
    Write-Host "LỖI: Không tìm thấy file python.exe tại $pythonExe" -ForegroundColor Red
    Pause
    exit
}

# 2. Download WinSW if not exists
if (-not (Test-Path $exePath)) {
    Write-Host "`n[1/4] Đang tải công cụ WinSW..." -ForegroundColor Yellow
    $url = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $exePath
    Write-Host "Đã tải xong!" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Công cụ WinSW đã có sẵn, bỏ qua bước tải." -ForegroundColor Green
}

# 3. Create XML Configuration dynamically
Write-Host "`n[2/4] Đang tạo file cấu hình Service..." -ForegroundColor Yellow
$xmlContent = @"
<service>
  <id>$serviceName</id>
  <name>Vận Hành Khai Thác Web App</name>
  <description>Ứng dụng quản lý Vận Hành Khai Thác (Flask) chay ngam tren port 5005</description>
  <executable>$pythonExe</executable>
  <arguments>app.py</arguments>
  <log mode="roll"></log>
  <workingdirectory>$webAppDir</workingdirectory>
  <onfailure action="restart" delay="10 sec"/>
</service>
"@
Set-Content -Path $xmlPath -Value $xmlContent -Encoding UTF8

# 4. Uninstall old service if exists
Write-Host "`n[3/4] Kiểm tra service cũ..." -ForegroundColor Yellow
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq "Running") {
        Write-Host "Đang dừng service cũ..."
        Stop-Service -Name $serviceName -Force
    }
    Write-Host "Đang gỡ cài đặt service cũ..."
    & $exePath uninstall
    Start-Sleep -Seconds 2
}

# 5. Install and Start
Write-Host "`n[4/4] Đang cài đặt và khởi động Service mới..." -ForegroundColor Yellow
& $exePath install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cài đặt thất bại!" -ForegroundColor Red
    Pause
    exit
}

& $exePath start
Start-Sleep -Seconds 3

# 6. Verify
$newStatus = (Get-Service -Name $serviceName -ErrorAction SilentlyContinue).Status
if ($newStatus -eq "Running") {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " ✅ THÀNH CÔNG: VH_WebApp Service đang chạy ngầm!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "`nBạn có thể truy cập web tại: http://localhost:5005"
} else {
    Write-Host "⚠️ CẢNH BÁO: Service cài được nhưng chưa chạy. Xem log tại $scriptPath" -ForegroundColor Red
}

Pause
