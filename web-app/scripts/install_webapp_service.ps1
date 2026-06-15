$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " VH_WebApp Service Installer (using WinSW)   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check if running as Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "LOI: Ban phai chay script nay voi quyen Administrator (Run as Administrator)." -ForegroundColor Red
    Write-Host "Vui long click chuot phai vao file va chon 'Run with PowerShell', hoac mo PowerShell quyen Admin roi chay." -ForegroundColor Yellow
    Pause
    exit
}

# Paths
$scriptPath = $PSScriptRoot
$webAppDir = Resolve-Path "$scriptPath\.." | Select-Object -ExpandProperty Path
$projectDir = Resolve-Path "$webAppDir\.." | Select-Object -ExpandProperty Path
$pythonExe = "$webAppDir\venv\Scripts\python.exe"

$serviceName = "VH_WebApp"
$exeName = "VH_WebApp_Service.exe"
$xmlName = "VH_WebApp_Service.xml"
$exePath = "$scriptPath\$exeName"
$xmlPath = "$scriptPath\$xmlName"

if (-not (Test-Path $pythonExe)) {
    Write-Host "LOI: Khong tim thay file python.exe tai $pythonExe" -ForegroundColor Red
    Pause
    exit
}

# 2. Download WinSW if not exists
if (-not (Test-Path $exePath)) {
    Write-Host "`n[1/4] Dang tai cong cu WinSW..." -ForegroundColor Yellow
    $url = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $exePath
    Write-Host "Da tai xong!" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Cong cu WinSW da co san, bo qua buoc tai." -ForegroundColor Green
}

# 3. Create XML Configuration dynamically
Write-Host "`n[2/4] Dang tao file cau hinh Service..." -ForegroundColor Yellow
$xmlContent = @"
<service>
  <id>$serviceName</id>
  <name>Van Hanh Khai Thac Web App</name>
  <description>Ung dung quan ly Van Hanh Khai Thac (Flask) chay ngam tren port 5005</description>
  <executable>$pythonExe</executable>
  <arguments>app.py</arguments>
  <log mode="roll"></log>
  <workingdirectory>$webAppDir</workingdirectory>
  <env name="PLAYWRIGHT_BROWSERS_PATH" value="$webAppDir\ms-playwright" />
  <onfailure action="restart" delay="10 sec"/>
</service>
"@
Set-Content -Path $xmlPath -Value $xmlContent -Encoding UTF8

# 4. Uninstall old service if exists
Write-Host "`n[3/4] Kiem tra service cu..." -ForegroundColor Yellow
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq "Running") {
        Write-Host "Dang dung service cu..."
        Stop-Service -Name $serviceName -Force
    }
    Write-Host "Dang go cai dat service cu..."
    & $exePath uninstall
    Start-Sleep -Seconds 2
}

# 5. Install and Start
Write-Host "`n[4/4] Dang cai dat va khoi dong Service moi..." -ForegroundColor Yellow
& $exePath install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cai dat that bai!" -ForegroundColor Red
    Pause
    exit
}

& $exePath start
Start-Sleep -Seconds 3

# 6. Verify
$newStatus = (Get-Service -Name $serviceName -ErrorAction SilentlyContinue).Status
if ($newStatus -eq "Running") {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " OK: VH_WebApp Service dang chay ngam!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "`nBan co the truy cap web tai: http://localhost:5005"
} else {
    Write-Host "CANH BAO: Service cai duoc nhung chua chay. Xem log tai $scriptPath" -ForegroundColor Red
}

Pause
