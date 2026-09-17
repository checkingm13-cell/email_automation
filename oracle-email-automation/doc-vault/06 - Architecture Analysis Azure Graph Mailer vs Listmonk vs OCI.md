# 06 - Architecture Analysis: Azure Graph Mailer vs Listmonk vs OCI

## 1. Executive Summary

This document captures the in-depth architectural evaluation of **`azure-graph-mailer`** (`D:\projects\azure-graph-mailer`), comparing it against **Listmonk** and **Oracle Cloud Infrastructure (OCI) Email Delivery**, specifically for high-volume campaigns using domain **`education.yourpaperedition.com`**.

---

## 2. Deep-Dive: The `azure-graph-mailer` Engine

The existing codebase in `D:\projects\azure-graph-mailer` is a specialized, production-ready dispatch engine designed for multi-account sending.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Web Dashboard (public/index.html + public/js/app.js)       │
│  - Real-time Account Fuel Gauges      - Live Terminal Log Stream        │
│  - CSV Drag-and-Drop Contact Parser   - Dynamic Template Editor         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (REST API on /api)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Express Server (src/app.js & src/routes/api.js)           │
│  - REST Controllers       - Multer CSV Uploads    - Health Check (/ping)│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
┌─────────────────────────────────┐   ┌───────────────────────────────────┐
│     SQLite DB (Node 24 WAL)     │   │      Continuous Queue Worker      │
│  - Accounts, Contacts, Templates│   │      (src/services/queueWorker)   │
│  - Campaigns, Queue, Logs       │   │  - 2.5s Anti-Spam Pacing          │
│  - Persistent at /home/data/    │   │  - Auto-Retry with Backoff        │
└─────────────────────────────────┘   └─────────────────┬─────────────────┘
                                                        │
                                      ┌─────────────────┴─────────────────┐
                                      │ Leased Account Pool (accountPool) │
                                      │  - 60s per-mailbox cooldown       │
                                      │  - 500/day quota cap per account  │
                                      └─────────────────┬─────────────────┘
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
┌───────────────────────────────────────────────┐               ┌───────────────────────────────────┐
│      Graph Mailer (src/services/graphMailer)  │               │ ACS Mailer (src/services/acsMailer│
│  - Microsoft Entra ID OAuth Handshake         │               │ - Azure Communication Services    │
│  - Shared Mailboxes via Send-As Permissions   │               │ - High-Volume Cloud Pipe          │
│  - POST /v1.0/users/{sender}/sendMail         │               │ - DoNotReply@mail.theparipex...   │
└───────────────────────────────────────────────┘               └───────────────────────────────────┘
```

### Key Capabilities Already Present in Code:
1. **Production Deployment Model:**
   * Deployed to **Azure App Service Linux** running Node.js 20 LTS with "Always On" enabled.
   * Persistent database storage at `/home/data/mailer.db` (Node 24 native SQLite in WAL mode) ensuring campaign queues, logs, and contact lists survive process restarts.
   * Local `.bat` files (`DISPATCH_CAMPAIGN_E2E.bat`, `RUN_LOCAL.bat`) are purely local developer utilities; production runs continuous background loops via `queueWorker.js`.
2. **The 1-License Shared Mailbox Strategy:**
   * Uses 1 paid Microsoft 365 license to power **up to 40+ free Shared Mailboxes** (`Dr. Reeta Shah`, `editor@...`) via delegated `Mail.Send` application permissions.
3. **Anti-Spam Pacing & Cooldowns:**
   * Global 2.5s pacing (24 emails/minute).
   * 60-second cooldown per account after each dispatch.
   * Rolling 24-hour daily quota caps (500 emails/account).
4. **Embedded Web UI (`public/`):**
   * Over 60 KB of custom client-side JavaScript providing live account fuel gauges, CSV contact parsing, and template management.

---

## 3. Comparison: Azure Graph Mailer vs. Listmonk vs. OCI

| Feature | **Azure Graph Mailer (Current)** | **Listmonk** | **Oracle OCI Email Delivery** |
|---|---|---|---|
| **Role** | Multi-Account Cold Engine | Self-Hosted Campaign App | High-Volume Cloud Pipe |
| **Max Safe Scale** | 500 – 3,000 / day | Millions (needs SMTP pipe) | Millions / day |
| **Best Used For** | 1-to-1 B2B Personalized Outreach | Newsletters & List Management | Bulk Marketing & Blasts |
| **Throttling** | 30/min (Microsoft Graph cap) | None (Hardware dependent) | High enterprise throughput |
| **Account Ban Risk** | **High** if used for bulk blasts | Zero | Zero |
| **Cost for 100k Emails** | $30 – $80+ (ACS / M365) | $0 (Open-Source App) | **~$10 (~₹830)** |

---

## 4. The Unified Solution: Triple-Provider Architecture

Instead of replacing `azure-graph-mailer` with Listmonk, the optimal strategy is to **extend `azure-graph-mailer` with Oracle OCI Email Delivery**.

This gives you a single application that dynamically selects the right provider based on campaign scale:

```
                                 [Your Existing Engine]
                             (D:\projects\azure-graph-mailer)
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      [Provider 1: GRAPH]          [Provider 2: ACS]            [Provider 3: OCI]
      (Microsoft Graph API)   (Azure Communication Services)   (Oracle Email Delivery)
               │                            │                            │
      - 1-to-1 Cold Emails         - Transactional Mail         - High-Volume Bulk Blasts
      - Personal Outlook inboxes   - High-priority system mail   - education.yourpaperedition.com
      - Max 500/day per account    - Pay-per-use                - 100k+ emails at ~$0.10/1k
```

---

## 5. Implementation: Adding `src/services/ociMailer.js`

To enable this, create `src/services/ociMailer.js` inside `azure-graph-mailer`:

```javascript
/**
 * src/services/ociMailer.js
 * Oracle Cloud Infrastructure Email Delivery Dispatcher
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.OCI_SMTP_HOST || 'smtp.email.ap-mumbai-1.oci.oraclecloud.com',
  port: parseInt(process.env.OCI_SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.OCI_SMTP_USER,
    pass: process.env.OCI_SMTP_PASS
  },
  pool: true,
  maxConnections: 10
});

async function sendViaOCI({ to, subject, htmlBody, senderEmail, senderName }) {
  const mailOptions = {
    from: `"${senderName || 'Worldwide Journals'}" <${senderEmail || 'newsletter@education.yourpaperedition.com'}>`,
    to: to,
    subject: subject,
    html: htmlBody,
    headers: {
      'List-Unsubscribe': '<https://education.yourpaperedition.com/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId, provider: 'OCI' };
}

module.exports = { sendViaOCI };
```

And in `src/services/queueWorker.js`, dispatch based on `account.provider`:

```javascript
if (account.provider === 'GRAPH') {
  await sendViaGraph({ to: item.recipient_email, subject, htmlBody, account });
} else if (account.provider === 'ACS') {
  await sendViaACS({ to: item.recipient_email, subject, htmlBody, account });
} else if (account.provider === 'OCI') {
  await sendViaOCI({ 
    to: item.recipient_email, 
    subject, 
    htmlBody, 
    senderEmail: account.email, 
    senderName: account.display_name 
  });
}
```

---

## 6. Domain Configuration for `education.yourpaperedition.com`

Before dispatching bulk campaigns via OCI:
1. **Email Domain:** Add `education.yourpaperedition.com` under OCI Email Delivery.
2. **DKIM:** Add OCI's CNAME record to DNS (`oci._domainkey.education.yourpaperedition.com`).
3. **SPF:** Add TXT record:
   ```text
   v=spf1 include:recipient.email.oraclecloud.com ~all
   ```
4. **Approved Sender:** Register `newsletter@education.yourpaperedition.com` (or `editor@education.yourpaperedition.com`).
