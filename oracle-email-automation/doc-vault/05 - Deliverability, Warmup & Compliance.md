# 05 - Deliverability, Warmup & Compliance

When sending high volumes (100k+ emails), the bottleneck is not server power—it is mailbox provider trust (Gmail, Yahoo, Outlook).

---

## 1. Google & Yahoo Sender Requirements (Mandatory)

Senders of more than 5,000 emails per day must meet these strict criteria:

1. **Spam Rate Below 0.30%:**
   - Keep user-reported spam complaints below **0.10%** normally.
   - Never cross **0.30%**, or Gmail will drop or spam-folder your entire domain.
2. **Authentication:**
   - SPF and DKIM must both pass and align with the `From:` header domain.
3. **One-Click Unsubscribe:**
   - Must include `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers.
   - Unsubscribe requests must be honored within 48 hours.
4. **Valid Forward and Reverse DNS (rDNS):**
   - Handled automatically by OCI on their sending IP infrastructure.

---

## 2. 14-Day IP & Domain Warmup Schedule

Never blast 100,000 emails on Day 1 of a new OCI sending domain or IP. Follow this ramp:

| Day | Max Emails / Day | Hourly Throttle | Target Audience |
|---|---|---|---|
| **Day 1–2** | 1,000 – 2,000 | ~200 / hr | Highly engaged subscribers (recent openers) |
| **Day 3–4** | 5,000 | ~500 / hr | Active authors |
| **Day 5–7** | 10,000 – 15,000 | ~1,000 / hr | Broad subscriber base |
| **Day 8–10** | 30,000 | ~2,500 / hr | Full active list |
| **Day 11–14** | 60,000 – 100,000 | ~5,000 / hr | Full volume |
| **Day 15+** | Unlimited | Max throughput | Full production blasts |

---

## 3. OCI Suppression List Management

OCI Email Delivery maintains an internal **Suppression List** for each tenancy.

* **What gets suppressed:** Addresses that return a hard bounce (`5xx` error) or user spam complaint.
* **Behavior:** If you attempt to send to a suppressed address, OCI will reject the send immediately without hurting your external sender reputation.
* **Best Practice:** Periodically export the suppression list from:
  **Developer Services** → **Email Delivery** → **Suppression List**
  and prune these emails from your primary database / Listmonk list.

---

## 4. Monitoring Reputation (Google Postmaster Tools)

1. Register your sending domain at [Google Postmaster Tools](https://postmaster.google.com/).
2. Add the verification TXT record to your DNS.
3. Check daily for:
   * **Domain Reputation:** (Aim for *High* or *Medium*).
   * **Spam Rate:** (Must stay below 0.10%).
   * **DKIM / SPF Success Rates:** (Must be 100%).

---

## 5. OCI Service Limit Increase Playbook (Resolving Error 455)

When sending bursts from a new or trial tenancy, OCI may return:
```text
455 Maximum messages sent per minute reached : limit is 10
```

### 📋 How to Request Enterprise Limit Increase:
1. Open **Oracle Cloud Console** (`cloud.oracle.com`).
2. Go to **Governance & Administration** ➔ **Limits, Quotas and Usage**.
3. In the **Service** dropdown, select **Email Delivery**.
4. Identify:
   * **`send-email-count`** (Daily limit, default 200–50,000)
   * **`send-rate-per-minute`** (Rate limit, default 10–18,000)
5. Click **Request a service limit increase**.
6. Provide these 4 mandatory answers in the justification box to ensure instant approval:
   ```text
   Request for OCI Email Delivery Limit Increase:
   1. Sending Domain: education.yourpaperedition.com (DKIM 2048-bit and SPF rp.oracleemaildelivery.com verified).
   2. Email Category: Academic journal editorial alerts, publication acceptance notices, and scholarly newsletters.
   3. Recipient Source: 100% opt-in registered authors, reviewers, and researchers from our journal portal.
   4. Compliance & Hygiene: Automated bounce suppression and RFC-compliant List-Unsubscribe one-click headers are active. Bounce rate is below 1%.
   ```
7. Oracle's postmaster team typically reviews and upgrades limits within 12–24 hours.

---

## 6. Official OCI FAQ: Risk Management & Account Safeguards

According to the official Oracle Cloud Infrastructure (OCI) Email Delivery FAQ, safeguards exist to protect the shared sending IP pool and preserve sender domain reputation against blacklisting.

### 1. Reputation Safeguards
* Sudden volume spikes from unverified or new cloud accounts trigger instant spam flags at Gmail, Yahoo, and Microsoft.
* Oracle artificially restricts initial throughput to force healthy sending behavior until trust is established.

### 2. Approved Senders Quotas
* Mail can only be dispatched from email addresses explicitly registered under **Approved Senders**.
* **Free Trial Cap:** Maximum **2,000 Approved Senders**.
* **Enterprise (Paid) Cap:** Maximum **10,000 Approved Senders**.

### 3. Strict Rolling 24-Hour Limits
* Limits operate on a rolling **24-hour continuous window** (not resetting at midnight):
  * **Free Trial:** Max **200 emails / 24 hours**; speed capped at **10 emails / minute**.
  * **Enterprise Account:** Max **50,000 emails / 24 hours**; speed capped at **18,000 emails / minute** (300/sec).

### 4. Suppression List & The 2% Bounce Rule (Critical)
* **Automated Blocking:** Any recipient that returns a **Hard Bounce** (`5xx` non-existent address) or a **Spam Complaint** is automatically added to the tenancy's OCI Suppression List.
* Once suppressed, OCI will refuse to send to that address in the future to protect your reputation.
* ⚠️ **Account Suspension Rule:** Your overall **Hard Bounce Rate MUST stay strictly below 2%**. Exceeding a 2% bounce rate triggers automated account review and potential service suspension by Oracle Postmasters.

### 5. Message Size & Encoding Limits
* **Default Limit:** **2 MB per message** (including MIME headers, HTML body, attachments, and base64 encoding overhead).
* **Enterprise Expansion:** Can be increased up to **60 MB** per email via Service Limit Request.

---

### 🛡️ 4-Point Execution Plan (Zero Suspension Risk)
1. **Verified Senders Only:** Never send from an unapproved address or unverified domain.
2. **Clean Lists Before Dispatch:** Validate CSV contact lists through email verifiers (pruning invalid/dead boxes) to guarantee **< 2% bounce rate**.
3. **Gradual Warm-Up:** Begin with 200–500 emails/day, monitoring delivery metrics in OCI Console.
4. **Limit Upgrades:** Once payment is enabled and clean sending history is recorded, request enterprise limits via `Limits, Quotas and Usage`.
