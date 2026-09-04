@echo off
setlocal enabledelayedexpansion
title Gmail Mail Merge - Automatic Environment Setup
cd /d "%~dp0"

echo ================================================================
echo  GMAIL NATIVE MAIL MERGE - LOCAL ENVIRONMENT SETUP & BOOTSTRAP
echo ================================================================
echo.

:: 1. Check Node.js
echo [1/7] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed on this PC!
    echo.
    echo Attempting to install Node.js via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [!] Automatic install failed. Please manually download and install Node.js LTS from:
        echo     https://nodejs.org/
        echo After installing, restart this script.
        pause
        exit /b 1
    )
    echo [OK] Node.js installed. Please close and re-open this terminal if paths need refreshing.
) else (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
    echo [OK] Node.js detected: !NODE_VER!
)
echo.

:: 2. Check Git
echo [2/7] Checking Git installation...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Git was not detected in PATH. (Optional if already cloned)
) else (
    for /f "tokens=*" %%v in ('git --version') do set GIT_VER=%%v
    echo [OK] Git detected: !GIT_VER!
)
echo.

:: 3. Check Google Chrome
echo [3/7] Checking Google Chrome browser...
set CHROME_FOUND=0
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1

if "!CHROME_FOUND!"=="1" (
    echo [OK] Google Chrome is installed.
) else (
    echo [WARNING] Google Chrome was not found in standard paths!
    echo Gmail Native Mail Merge requires real Google Chrome for persistent logins.
    echo Please ensure Chrome is installed from: https://www.google.com/chrome/
)
echo.

:: 4. Check Environment Configuration (.env)
echo [4/7] Checking .env configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env not found. Copying from .env.example...
        copy ".env.example" ".env" >nul
        echo [IMPORTANT] Created .env file.
        echo Please verify that your Supabase DATABASE_URL is properly set in .env!
    ) else (
        echo [WARNING] Neither .env nor .env.example found!
    )
) else (
    echo [OK] .env configuration file exists.
)
echo.

:: 5. Create Required Local Directories
echo [5/7] Creating required local workspace folders...
if not exist "logs\screenshots" mkdir "logs\screenshots"
if not exist "chrome-profile" mkdir "chrome-profile"
if not exist "chrome-profile-editorial" mkdir "chrome-profile-editorial"
echo [OK] Directories verified (logs\screenshots, chrome-profile, chrome-profile-editorial).
echo.

:: 6. Install NPM Dependencies & Playwright
echo [6/7] Installing required Node.js packages...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install encountered an error!
    pause
    exit /b 1
)
echo [INFO] Verifying Playwright browser drivers...
call npx playwright install chromium
echo [OK] Dependencies successfully installed.
echo.

:: 7. Synchronize Supabase Database & Test Connectivity
echo [7/7] Synchronizing with Supabase Database (Source of Truth)...
call node scripts/setup-supabase-profiles.js
echo.
call node index.js --status
if %errorlevel% neq 0 (
    echo [WARNING] Could not connect to Supabase database. Please check your internet or .env settings.
) else (
    echo [OK] Database connectivity and profile records confirmed!
)
echo.

echo ================================================================
echo  SETUP COMPLETE: PC is now fully configured for Mail Merge!
echo ================================================================
echo.
echo NOTE: If this is a new PC, make sure your Chrome profile
echo has an active session logged into your Gmail sender accounts.
echo.

set /p RUN_NOW="Would you like to start the Control Center now? (Y/N): "
if /i "!RUN_NOW!"=="Y" (
    call START.bat
)

pause
