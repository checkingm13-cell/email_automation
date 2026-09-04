@echo off
title Gmail Mail Merge - Local Control Center
cd /d "%~dp0"

:: Disable QuickEdit mode so console mouse clicks do not freeze Node.js
powershell -NoProfile -Command "$t = Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern IntPtr GetStdHandle(int n); [DllImport(\"kernel32.dll\")] public static extern bool GetConsoleMode(IntPtr h, out uint m); [DllImport(\"kernel32.dll\")] public static extern bool SetConsoleMode(IntPtr h, uint m);' -Name 'CK' -Namespace 'W32' -PassThru; $h = $t::GetStdHandle(-10); $m = 0; $t::GetConsoleMode($h, [ref]$m); $t::SetConsoleMode($h, $m -band -bnot 0x0040 -band -bnot 0x0020)" >nul 2>nul

echo ======================================================
echo Starting Gmail Native Mail Merge Local Control Center...
echo Dashboard: http://localhost:3000
echo ======================================================
start http://localhost:3000
node index.js
pause
