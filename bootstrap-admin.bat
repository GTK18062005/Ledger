@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   BalanceVault Production First-Admin Bootstrap CLI
echo ========================================================
echo.
echo This utility bootstraps the initial system administrator account.
echo In production environments where DataSeeder is disabled, this
echo ensures secure setup without default credential backdoors.
echo.

set /p ADMIN_EMAIL="Enter Admin Email [default: admin@balancevault.io]: "
if "!ADMIN_EMAIL!"=="" set "ADMIN_EMAIL=admin@balancevault.io"

set /p ADMIN_PASSWORD="Enter Admin Password (min 10 chars): "
if "!ADMIN_PASSWORD!"=="" (
    echo [ERROR] Password cannot be empty.
    exit /b 1
)

set /p BOOTSTRAP_SECRET="Enter Bootstrap Secret (if ADMIN_BOOTSTRAP_SECRET is set, press Enter if none): "

echo.
echo Attempting to bootstrap administrator: !ADMIN_EMAIL! ...

powershell -Command ^
  "$body = @{ email = '!ADMIN_EMAIL!'; password = '!ADMIN_PASSWORD!'; bootstrapSecret = '!BOOTSTRAP_SECRET!' } | ConvertTo-Json; " ^
  "try { " ^
  "  $res = Invoke-RestMethod -Uri 'http://localhost:8080/api/admin/bootstrap' -Method Post -ContentType 'application/json' -Body $body; " ^
  "  Write-Host '[SUCCESS] Administrator successfully bootstrapped!' -ForegroundColor Green; " ^
  "  Write-Host ('User ID: ' + $res.userId); " ^
  "  Write-Host ('Role:    ' + $res.role); " ^
  "  Write-Host ('Token:   ' + $res.token.Substring(0, 25) + '...'); " ^
  "} catch { " ^
  "  Write-Host ('[FAILED] ' + $_.Exception.Message) -ForegroundColor Red; " ^
  "  if ($_.Exception.Response) { " ^
  "    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); " ^
  "    Write-Host $reader.ReadToEnd() -ForegroundColor Yellow; " ^
  "  } " ^
  "}"

echo.
pause

