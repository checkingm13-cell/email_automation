# scripts/start-local-proxy.ps1
# Starts local Squid proxy in WSL and verifies Tailscale routing for email automation

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Tailscale Local Squid Proxy Initializer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check if Tailscale is running and grab IPv4 address
Write-Host "`n[1/4] Checking Tailscale IPv4 address..." -ForegroundColor Yellow

$tailscaleIp = $null

# Check via tailscale CLI command first
if (Get-Command tailscale -ErrorAction SilentlyContinue) {
    try {
        $cliOutput = (& tailscale ip -4 2>$null)
        if ($cliOutput) {
            $candidateIp = $cliOutput.Trim()
            if ($candidateIp -match '^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
                $tailscaleIp = $candidateIp
            }
        }
    } catch {
        # Ignore and fallback
    }
}

# Fallback to network adapter lookup
if (-not $tailscaleIp) {
    try {
        $adapter = Get-NetIPAddress -InterfaceAlias "*Tailscale*" -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($adapter -and $adapter.IPAddress -match '^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
            $tailscaleIp = $adapter.IPAddress
        }
    } catch {
        # Ignore
    }
}

if (-not $tailscaleIp) {
    Write-Host "❌ Error: Tailscale is not running or no Tailscale IPv4 address detected." -ForegroundColor Red
    Write-Host "Please start Tailscale and connect, then re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host "✔ Found Tailscale IPv4: $tailscaleIp" -ForegroundColor Green

# 2. Restart Squid inside WSL
Write-Host "`n[2/4] Restarting Squid inside WSL..." -ForegroundColor Yellow
try {
    wsl -u root sudo systemctl restart squid
    Write-Host "✔ Squid service restarted successfully." -ForegroundColor Green
} catch {
    Write-Host "systemctl restart failed, attempting service restart fallback..." -ForegroundColor Yellow
    wsl -u root service squid restart
}

# Brief pause for proxy daemon to accept sockets
Start-Sleep -Seconds 1

# 3. Test proxy routing
$proxyUrl = "http://${tailscaleIp}:3128"
Write-Host "`n[3/4] Testing proxy routing via $proxyUrl..." -ForegroundColor Yellow

try {
    $routedIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -Proxy $proxyUrl -TimeoutSec 10).Trim()
    Write-Host "✔ Proxy routing successful! Routed External IP: $routedIp" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Failed to route requests through proxy at $proxyUrl" -ForegroundColor Red
    Write-Host "Details: $_" -ForegroundColor Red
    exit 1
}

# 4. Output exact PROXY_SERVER line
Write-Host "`n[4/4] Configuration ready!" -ForegroundColor Green
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Add or update the following line in your .env file on VPS:" -ForegroundColor Yellow
Write-Host "PROXY_SERVER=$proxyUrl" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan
