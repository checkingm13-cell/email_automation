# 🏛️ OCI Email Service — Document Vault

Welcome to the **Oracle Cloud Infrastructure (OCI) Email Delivery Document Vault**. This vault contains end-to-end architecture blueprints, DNS configuration standards, turnkey open-source deployment guides, and production code for running high-throughput, low-cost email infrastructure.

---

## 🗺️ Navigation Map

### 1. [[01 - OCI Email Architecture & Strategy]]
* Overview of OCI Email Delivery
* Comparison: Headless Chrome Automation vs OCI Native SMTP
* Throughput, SLA, and pricing breakdown (~$0.10 / 1k emails)

### 2. [[02 - OCI Console & DNS Setup Guide]]
* Creating Email Domains and Approved Senders
* Setting up 1024/2048-bit DKIM keys
* SPF & DMARC configuration for Cloudflare / cPanel
* Generating IAM SMTP credentials & locating regional endpoints

### 3. [[03 - Turnkey Open-Source Engine (Listmonk)]]
* Why Listmonk (1,500+ emails/sec, PostgreSQL, Go)
* Single-command Docker Compose deployment on your Oracle Cloud VPS (`mail-merge-vps`)
* UI setup, list management, CSV import, templates, and analytics

### 4. [[04 - Custom Code Integration (Node.js & Python)]]
* High-concurrency Node.js / Nodemailer worker script
* Fast Python bulk dispatcher
* Dynamic UTM injection and queue handling

### 5. [[05 - Deliverability, Warmup & Compliance]]
* Google & Yahoo bulk sender compliance (0.3% spam threshold)
* 14-day IP and domain warmup schedule
* OCI Suppression List management, Error 455 playbook & Service Limit Increase
* Risk management safeguards: Approved sender caps, 2 MB/60 MB limits & the **< 2% Hard Bounce threshold**

### 6. [[06 - Architecture Analysis Azure Graph Mailer vs Listmonk vs OCI]]
* In-depth codebase review of `azure-graph-mailer`
* Production architecture (Azure App Service Linux, SQLite WAL, multi-account pool)
* Triple-Provider integration (Graph + ACS + Oracle OCI for `education.yourpaperedition.com`)

### 7. [[07 - Production Verified Sending Domains & Senders Ledger]]
* Master reference table of all 5 verified production domains
* Exact CNAME, SPF, and DMARC settings verified in cPanel
* All active Approved Senders and their OCI OCIDs
* Database synchronization with `azure-graph-mailer`

### 7. [[07 - Complete System Design & Architecture Deep-Dive]]
* Enterprise multi-sender architecture & roadmap.sh system design
* Persistence tier: Native Node.js 24 SQLite WAL, indexes, and schema decomposition
* Account Pool: Fair round-robin, sliding 24h rolling quota, decoupled `cooldown_until` throttling
* UI Authority Guarantee: Zero overwrite on boot/re-seed, 1-click bulk preset quotas (500, 2k, 4k, 10k)
* Hexagonal Connection Adapters (`GRAPH_API`, `AZURE_ACS`, `OCI`) & RFC 5321 error classification
* Leaky-Bucket Queue Worker, crash recovery, and Dynamic Domain Link Resolver

---

## 📌 Quick Reference Data

| Parameter | Value |
|---|---|
| **OCI Service** | Oracle Cloud Infrastructure Email Delivery |
| **Tenancy Admin User** | `checkingm13@gmail.com` (Domain: `Default`) |
| **Verified Sending Domain** | `education.yourpaperedition.com` |
| **Approved Sender** | `newsletter@education.yourpaperedition.com` |
| **Protocol** | SMTP (Port 587 / STARTTLS or Port 2525; Port 25 blocked on trial) |
| **Default VPS** | `mail-merge-vps` (`100.96.100.52`) |
| **Supported Protocols** | SMTP, REST API |
| **Free Tier Allowance** | **First 3,000 emails / month 100% FREE** (Permanent Always Free) |
| **Unit Cost** | **$0.085 per 1,000 emails** (15% cheaper than AWS SES $0.10) |
| **Trial Sandbox Limit** | 200 emails / day; 10 emails / minute (safety sandbox) |
| **Production Enterprise Limit**| 50,000 emails / day (rolling 24h); 18,000 emails / minute rate |
