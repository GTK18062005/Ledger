@echo off
title LedgerLine Backend Engine
echo ========================================================
echo Starting LedgerLine Spring Boot Engine on Port 8080...
echo ========================================================

set "JAVA_HOME=D:\Program Files\Java\jdk-23"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0backend"
java -jar target\ledgerline-engine-1.0.0.jar
pause
