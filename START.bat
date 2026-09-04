@echo off
title Gmail Mail Merge - Local Control Center
cd /d "%~dp0"

:: 1. Validate Node.js presence
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not detected in system PATH.
    echo Please install Node.js 20+ from https://nodejs.org/ and re-run.
    pause
    exit /b 1
)

:: 2. Disable QuickEdit mode so console mouse clicks do not freeze Node.js
powershell -NoProfile -Command "$t = Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern IntPtr GetStdHandle(int n); [DllImport(\"kernel32.dll\")] public static extern bool GetConsoleMode(IntPtr h, out uint m); [DllImport(\"kernel32.dll\")] public static extern bool SetConsoleMode(IntPtr h, uint m);' -Name 'CK' -Namespace 'W32' -PassThru; $h = $t::GetStdHandle(-10); $m = 0; $t::GetConsoleMode($h, [ref]$m); $t::SetConsoleMode($h, $m -band -bnot 0x0040 -band -bnot 0x0020)" >nul 2>nul

echo ======================================================
echo  Gmail Native Mail Merge - Operations Control Center
echo  Mode: Resident IP Safe ^(Zero Overhead^)
echo  Opening Dashboard at http://localhost:3000...
echo ======================================================

:: 3. Open browser after 2-second delay to ensure server is listening
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

node index.js
pause

