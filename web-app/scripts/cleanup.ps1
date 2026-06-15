Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   KHACH PHUC TIEN TRINH TRUNG LAP (CLEANUP)  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Stop service
Write-Host "`n[1/3] Dang dung service VH_WebApp..." -ForegroundColor Yellow
$service = Get-Service -Name "VH_WebApp" -ErrorAction SilentlyContinue
if ($service) {
    Stop-Service -Name "VH_WebApp" -Force -ErrorAction SilentlyContinue
    Write-Host "Da gui lenh dung service." -ForegroundColor Green
} else {
    Write-Host "Service VH_WebApp khong ton tai." -ForegroundColor Red
}

# 2. Terminate matching python processes
Write-Host "`n[2/3] Dang tim kiem va tat cac tien trinh Python lien quan den Web App..." -ForegroundColor Yellow
$pyProcesses = Get-Process python -ErrorAction SilentlyContinue
$killedCount = 0

foreach ($p in $pyProcesses) {
    # Co gang lay Path, neu khong lay duoc do quyen thi truy van qua CIM
    $path = ""
    try {
        $path = $p.Path
    } catch {}
    
    if (-not $path) {
        try {
            $path = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)").ExecutablePath
        } catch {}
    }
    
    # Kiem tra neu duong dan chua thu muc du an hoac venv
    if ($path -and ($path -like "*van-hanh-may-phat-dien*" -or $path -like "*venv*")) {
        Write-Host "Phat hien va dang tat Process ID: $($p.Id) - Path: $path" -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
}

# Truong hop dac biet: cac process chay duoi quyen Admin ma khong lay duoc Path
# Ta se so sanh voi cac PID truoc do de quet them
$remainingPy = Get-Process python -ErrorAction SilentlyContinue
foreach ($p in $remainingPy) {
    # Neu day la cac PID mồ côi (10716, 18164, 20004, 23272, 24412, 25732)
    # va khong phai cua IDE (8068, 16828)
    if ($p.Id -in 10716, 18164, 20004, 23272, 24412, 25732) {
        Write-Host "Dang dung PID thuoc danh sach mo coi: $($p.Id)" -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
}

Write-Host "Da tat tong cong $killedCount tien trinh Python du thua." -ForegroundColor Green

# 3. Restart service
Write-Host "`n[3/3] Dang khoi dong lai service VH_WebApp..." -ForegroundColor Yellow
if ($service) {
    Start-Service -Name "VH_WebApp" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $status = (Get-Service -Name "VH_WebApp").Status
    Write-Host "Trang thai service hien tai: $status" -ForegroundColor Green
}

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "   DA DON DEP SACH SE HE THONG!             " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
