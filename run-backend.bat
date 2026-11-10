@echo off
title LedgerLine Backend Engine
echo ========================================================
echo Starting LedgerLine Spring Boot Engine on Port 8080...
echo ========================================================

if exist "D:\Program Files\Java\jdk-23" (
    set "JAVA_HOME=D:\Program Files\Java\jdk-23"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

cd /d "%~dp0backend"

if not exist "target\ledgerline-engine-1.0.0.jar" (
    echo Packaging backend jar...
    if exist "C:\Users\tharu\apache-maven-3.9.5\bin\mvn.cmd" (
        call "C:\Users\tharu\apache-maven-3.9.5\bin\mvn.cmd" package -DskipTests
    ) else (
        call mvn package -DskipTests
    )
)

java -jar target\ledgerline-engine-1.0.0.jar
pause
