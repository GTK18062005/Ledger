@echo off
title LedgerLine Automated Concurrency & Integrity Tests
echo ========================================================
echo Running Multi-Threaded Concurrency & Invariant Tests...
echo ========================================================

set "JAVA_HOME=D:\Program Files\Java\jdk-23"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0backend"
"D:\intellij\IntelliJ IDEA 2026.1.3\plugins\maven\lib\maven3\bin\mvn.cmd" test
pause

