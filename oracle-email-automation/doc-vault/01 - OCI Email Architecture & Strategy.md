# 01 - OCI Email Architecture & Strategy

## 1. The Core Shift: Why OCI Email Delivery?

Earlier, the project operated by automating a headless Google Chrome browser on an Oracle VPS (`mail-merge-vps` in `D:\projects\extension\cloud`), driving the Gmail web UI.

### Architectural Comparison

| Dimension | Headless Chrome (Gmail UI) | OCI Email Delivery Service |
|---|---|---|
| **Protocol** | Web UI Clicks (CDP / Puppeteer) | Direct RFC SMTP / REST API |
| **Sending Cap** | 500 / day (Free) or 2,000 / day (Workspace) | **Unlimited** (Scales to millions) |
| **Throughput** | 1 email every 3–5 seconds (~1,000/hour max) | **1,500+ emails / second** |
| **Ban Risk** | **High** (Google bot-detection flags headless sessions) | **Zero** (Compliant enterprise infrastructure) |
| **Authentication** | Tied to personal Google account | Custom DKIM + SPF on your actual domain |
| **Cost** | Free until account is suspended | **~$0.10 per 1,000 emails** |

---

## 2. High-Level System Design

```
+-------------------------------------------------------------+
|                     INPUT & TRIGGER LAYERS                  |
|  - Google Sheets / CSV Recipient Lists                      |
|  - Webhook Triggers / Scheduled Batches                     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                MANAGEMENT & DISPATCH LAYER                  |
|  Option A: Listmonk (Open-Source Web UI & Analytics)        |
|  Option B: Custom Node.js / Python API Microservice         |
+-------------------------------------------------------------+
                              | (Encrypted SMTP / Port 587)
                              v
+-------------------------------------------------------------+
|            ORACLE CLOUD INFRASTRUCTURE (OCI)                |
|  - Approved Sender Validation                               |
|  - DKIM Signature Ingestion (1024 / 2048-bit)               |
|  - Dedicated / Shared Clean IP Pools                        |
|  - Automated Suppression Filtering (Prevents repeat bounces)|
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                     RECIPIENT INBOXES                       |
|  Gmail (Google Workspace), Yahoo, Outlook, Corporate Mail   |
+-------------------------------------------------------------+
```

---

## 3. Pricing, Quotas & Real-World Economics

### 💰 Official Pricing Structure:
1. **Always Free Allowance:**
   * **First 3,000 emails every month: 100% FREE ($0.00)**.
   * This allowance is permanent, never expires, and applies to both free and paid accounts.
2. **Paid Usage (Over 3,000 emails):**
   * **$0.085 per 1,000 emails** (~₹7.10 per 1,000).
   * 15% cheaper than AWS SES ($0.10 / 1k).

### 📊 Exact Monthly Cost Calculations:
| Monthly Volume | Free Tier Deduction | Billable Emails | Monthly Cost (USD) | Approx (INR) |
|---|---|---|---|---|
| **3,000 emails** | 3,000 free | 0 | **$0.00** | ₹0 |
| **10,000 emails** | 3,000 free | 7,000 | **$0.595** | ~₹50 |
| **50,000 emails** | 3,000 free | 47,000 | **$3.995** | ~₹335 |
| **100,000 emails** | 3,000 free | 97,000 | **$8.245** | ~₹690 |
| **500,000 emails** | 3,000 free | 497,000 | **$42.245** | ~₹3,530 |
| **1,000,000 emails** | 3,000 free | 997,000 | **$84.745** | ~₹7,080 |

* **Commercial Comparison:**
  * Mailchimp / Brevo for 500k emails: **$250 – $400 / month (₹21,000 – ₹33,000)**.
  * AWS SES for 500k emails: **$50.00 / month**.
  * **OCI Savings:** 88% to 92% cheaper than commercial SaaS; 15% cheaper than AWS SES.

---

### 🛡️ Account Tiers & Throughput Sandbox Limits

| Account Type | Daily Sending Limit | Rate Limit / Minute | Security Sandbox Notes |
|---|---|---|---|
| **Free Trial (30-day)** | **200 emails / day** | **10 emails / min** | Safety sandbox to prevent abuse. Outbound Port 25 blocked. |
| **Always Free** | 3,000 emails / month | Standard | Permanent commercial-grade free allowance. |
| **Paid / Enterprise** | **50,000 emails / day** | **18,000 emails / min** (300/sec) | Rolling 24h quota. Unlocked automatically or upon limit request. |
| **High-Volume Enterprise** | 100k – 10M+ / day | Custom | Available by submitting a Service Limit Increase request. |

### ⚙️ Operational Rules:
* **Ports:** Port 25 is blocked outbound on compute instances to prevent spam. Always connect via **Port 587 (STARTTLS)** or **Port 2525**.
* **Attachment Limit:** Up to **60 MB** per message (default 2 MB, configurable up to 60 MB).
* **Limit Increases:** Navigate to `Governance & Administration` ➔ `Limits, Quotas and Usage` ➔ `Email Delivery` ➔ `Request a service limit increase`.

---

## 4. Next Steps

Proceed to [[02 - OCI Console & DNS Setup Guide]] to configure your domain and credentials.
