@echo off
title Gmail Mail Merge - Operations Control Center
cd /d "%~dp0"

echo ================================================================
echo   GMAIL NATIVE MAIL MERGE - OPERATIONS CONTROL CENTER
echo   Resident IP Safe ^| Zero Overhead
echo ================================================================
echo.

:: 1. Validate Node.js presence
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not detected in system PATH.
    echo Please run SETUP.bat or install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check dependencies installed
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found. Running npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed!
        pause
        exit /b 1
    )
)

:: 3. Ensure essential directories exist
if not exist "logs\screenshots" mkdir "logs\screenshots"
if not exist "chrome-profile" mkdir "chrome-profile"
if not exist "chrome-profile-editorial" mkdir "chrome-profile-editorial"

:: 4. Disable QuickEdit mode so console mouse clicks do not freeze Node.js
powershell -NoProfile -Command "$t = Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern IntPtr GetStdHandle(int n); [DllImport(\"kernel32.dll\")] public static extern bool GetConsoleMode(IntPtr h, out uint m); [DllImport(\"kernel32.dll\")] public static extern bool SetConsoleMode(IntPtr h, uint m);' -Name 'CK' -Namespace 'W32' -PassThru; $h = $t::GetStdHandle(-10); $m = 0; $t::GetConsoleMode($h, [ref]$m); $t::SetConsoleMode($h, $m -band -bnot 0x0040 -band -bnot 0x0020)" >nul 2>nul

:: 5. Launch Application and open browser once ready
echo Starting backend server on http://localhost:3000...
echo Close this window to stop the service.
echo.

:: Open browser after 3.5s delay to ensure Express has bound port 3000
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

node index.js
pause


