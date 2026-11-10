#!/usr/bin/env bash
set -euo pipefail

echo "=============================================================================="
echo " BalanceVault - Full Stack Deployment Script"
echo "=============================================================================="

if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Docker is not installed or not in PATH."
    exit 1
fi

echo "[1/3] Building backend and frontend containers..."
docker compose build

echo "[2/3] Starting BalanceVault cluster (PostgreSQL, Redis, Backend, Frontend)..."
docker compose up -d

echo "[3/3] Waiting for deployment healthchecks..."
sleep 10

echo "=============================================================================="
echo "BalanceVault Services Active:"
echo "  - Frontend UI:       http://localhost (or http://localhost:3000)"
echo "  - Backend REST API:  http://localhost:8080/api"
echo "  - System Health:     http://localhost:8080/api/health"
echo "  - Spring Actuator:   http://localhost:8080/actuator/health"
echo "  - PostgreSQL DB:     localhost:5432 (db: balancevault)"
echo "  - Redis Engine:      localhost:6379"
echo "=============================================================================="
echo "To bootstrap the initial administrator:"
echo "  Run ./bootstrap-admin.sh"
echo "=============================================================================="
