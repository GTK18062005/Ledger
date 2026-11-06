@echo off
title LedgerLine React Frontend
echo ========================================================
echo Starting LedgerLine Frontend on Port 5173...
echo ========================================================

cd /d "%~dp0frontend"
call npm run dev
pause
