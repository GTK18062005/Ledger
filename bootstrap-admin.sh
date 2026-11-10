#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  BalanceVault Production First-Admin Bootstrap CLI"
echo "========================================================"
echo ""
echo "This utility bootstraps the initial system administrator account."
echo "In production environments where DataSeeder is disabled, this"
echo "ensures secure setup without default credential backdoors."
echo ""

read -p "Enter Admin Email [default: admin@balancevault.io]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@balancevault.io}

read -s -p "Enter Admin Password (min 10 chars): " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "[ERROR] Password cannot be empty."
    exit 1
fi

read -p "Enter Bootstrap Secret (press Enter if none): " BOOTSTRAP_SECRET

PAYLOAD=$(cat <<EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASSWORD",
  "bootstrapSecret": "$BOOTSTRAP_SECRET"
}
EOF
)

echo "Attempting to bootstrap administrator: $ADMIN_EMAIL ..."

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/admin/bootstrap" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" -eq 201 ] || [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "\033[0;32m[SUCCESS] Administrator successfully bootstrapped!\033[0m"
    echo "$RESPONSE_BODY"
else
    echo -e "\033[0;31m[FAILED] HTTP Status $HTTP_STATUS\033[0m"
    echo "$RESPONSE_BODY"
    exit 1
fi

