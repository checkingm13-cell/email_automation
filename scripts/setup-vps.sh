#!/usr/bin/env bash
# scripts/setup-vps.sh
# Automated setup for Ubuntu 22.04 LTS on Oracle Cloud VPS (AMD64 / ARM64 Ampere)

set -euo pipefail

# Ensure running with root privileges
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ Error: This script must be run as root (or with sudo)." >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "========================================================"
echo "🚀 Starting VPS Provisioning for Email Automation"
echo "========================================================"

# 1. Update APT & install base dependencies
echo -e "\n[1/6] Updating APT repositories and installing core utilities..."
apt-get update -y
apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    gnupg \
    ca-certificates \
    lsb-release \
    build-essential

# 2. Install Node.js LTS (v20) and npm
echo -e "\n[2/6] Installing Node.js LTS (v20.x)..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✔ Node.js is already installed ($(node -v))."
fi

# 3. Install Xvfb, x11vnc, and Playwright / Chromium runtime libraries
echo -e "\n[3/6] Installing Xvfb, x11vnc, and Chromium runtime libraries..."
apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    fonts-noto-color-emoji

# 4. Install Tailscale
echo -e "\n[4/6] Installing Tailscale..."
if ! command -v tailscale >/dev/null 2>&1; then
    curl -fsSL https://tailscale.com/install.sh | sh
    echo "✔ Tailscale installed successfully."
else
    echo "✔ Tailscale is already installed."
fi

# 5. Install Cloudflared (detects arm64 vs amd64)
echo -e "\n[5/6] Installing Cloudflared..."
if ! command -v cloudflared >/dev/null 2>&1; then
    ARCH="$(uname -m)"
    echo "Detected system architecture: $ARCH"
    case "$ARCH" in
        x86_64|amd64)
            CF_ARCH="amd64"
            ;;
        aarch64|arm64)
            CF_ARCH="arm64"
            ;;
        *)
            echo "❌ Error: Unsupported architecture for cloudflared: $ARCH" >&2
            exit 1
            ;;
    esac

    CF_DEB_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}.deb"
    echo "Downloading cloudflared (${CF_ARCH}) from: $CF_DEB_URL"
    curl -fsSL -o /tmp/cloudflared.deb "$CF_DEB_URL"
    dpkg -i /tmp/cloudflared.deb || apt-get install -fy
    rm -f /tmp/cloudflared.deb
    echo "✔ Cloudflared installed successfully ($(cloudflared --version))."
else
    echo "✔ Cloudflared is already installed ($(cloudflared --version))."
fi

# 6. Install PM2 globally
echo -e "\n[6/6] Installing PM2 process manager globally..."
npm install -g pm2

echo -e "\n========================================================"
echo "🎉 VPS Setup Complete!"
echo "========================================================"
echo "Next Steps:"
echo "1. Run 'tailscale up' to join your Tailscale tailnet."
echo "2. Set up your repository: npm install"
echo "3. Run 'node scripts/init-session.js' to authenticate Gmail session via VNC."
echo "4. Start apps with PM2: pm2 start ecosystem.config.js"
echo "========================================================"
