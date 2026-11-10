@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  BalanceVault - Full Stack Deployment Script
echo ==============================================================================

:: Check Docker availability
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH. Please install Docker Desktop.
    exit /b 1
)

echo [1/3] Building backend and frontend containers...
docker compose build

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker build failed.
    exit /b %ERRORLEVEL%
)

echo [2/3] Starting BalanceVault cluster (PostgreSQL, Redis, Backend, Frontend)...
docker compose up -d

echo [3/3] Waiting for deployment healthchecks...
timeout /t 10 /nobreak >nul

echo ==============================================================================
echo BalanceVault Services Active:
echo   - Frontend UI:       http://localhost (or http://localhost:3000)
echo   - Backend REST API:  http://localhost:8080/api
echo   - System Health:     http://localhost:8080/api/health
echo   - Spring Actuator:   http://localhost:8080/actuator/health
echo   - PostgreSQL DB:     localhost:5432 (db: balancevault)
echo   - Redis Engine:      localhost:6379
echo ==============================================================================
echo To bootstrap the initial administrator:
echo   Run bootstrap-admin.bat
echo ==============================================================================

