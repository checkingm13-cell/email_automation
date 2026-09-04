@echo off
title Gmail Mail Merge - Local Control Center
cd /d "%~dp0"
echo ======================================================
echo Starting Gmail Native Mail Merge Local Control Center...
echo Dashboard: http://localhost:3000
echo ======================================================
start http://localhost:3000
node index.js
pause
