# 03 - Turnkey Open-Source Engine (Listmonk)

Instead of writing thousands of lines of UI and database code for contact lists, campaign scheduling, open/click tracking, and unsubscribe links, use **[Listmonk](https://listmonk.app/)**.

Listmonk is a self-hosted, high-performance newsletter and mailing list manager written in Go. It connects natively to OCI Email Delivery via SMTP.

---

## 1. Why Listmonk?

* **Raw Performance:** Can process and dispatch **1,500+ messages per second**.
* **Zero Bloat:** Single binary + PostgreSQL database.
* **Full Campaign UI:** Rich-text and HTML template editors, media manager, subscriber tags, and CSV import/export.
* **Tracking & Analytics:** Native click tracking, open tracking, and bounce management.
* **100% Free & Open-Source:** No subscriber limits, no monthly software licenses.

---

## 2. Deploying on Your Oracle Cloud VPS (`mail-merge-vps`)

Your VPS (`100.96.100.52`) already has Ubuntu 22.04 LTS and Docker ready.

### Step 1: Connect via Tailscale SSH
```bash
ssh ubuntu@100.96.100.52
```

### Step 2: Create Directory & Download Configs
```bash
mkdir -p ~/listmonk && cd ~/listmonk

# Download production docker-compose.yml
curl -Lo docker-compose.yml https://raw.githubusercontent.com/knadh/listmonk/master/docker-compose.yml
```

### Step 3: Initialize Database
```bash
docker compose run --rm app ./listmonk --install
```
*(When prompted to proceed, type `yes`)*.

### Step 4: Start Listmonk Service
```bash
docker compose up -d
```

Listmonk is now running 24/7 on port `9000`.

---

## 3. Connecting Listmonk to OCI Email Delivery

1. Open your browser on Windows:
   👉 **`http://100.96.100.52:9000`**
2. Log in with the default credentials:
   * **Username:** `listmonk`
   * **Password:** `listmonk` *(change this immediately under Settings)*.
3. In the sidebar, click **Settings** → **SMTP**.
4. Configure the OCI SMTP Server:

| Field | Value to Enter |
|---|---|
| **Host** | `smtp.email.ap-mumbai-1.oci.oraclecloud.com` (or your OCI region) |
| **Port** | `587` |
| **Auth Protocol** | `LOGIN` |
| **Username** | `[Your OCI SMTP Username from Step 6 of Setup Guide]` |
| **Password** | `[Your OCI SMTP Password]` |
| **TLS** | `STARTTLS` |
| **Max Connections** | `10` |
| **Rate Limit** | `50` req / `1` second (adjust based on warmup) |

5. Click **Test Connection** → Enter your email → Verify receipt.
6. Click **Save Changes**.

---

## 4. Running a Campaign in 3 Minutes

1. **Lists:** Create a List (e.g., "IJAR Authors - Sept 2026").
2. **Subscribers:** Click **Import** → upload your CSV file (columns: `email`, `name`, `attributes`).
3. **Campaigns:** Click **New Campaign** → Select your template → Add subject line and HTML body.
4. **Schedule / Send:** Click **Send** to launch the campaign through OCI Email Delivery immediately or schedule it for a specific hour.

---

## Next Step

If you need programmatic API dispatch from custom applications, read [[04 - Custom Code Integration (Node.js & Python)]].
