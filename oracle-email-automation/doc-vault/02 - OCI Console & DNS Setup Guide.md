# 02 - OCI Console & DNS Setup Guide

This guide details the exact clicks and DNS records needed to authorize OCI Email Delivery to send emails on behalf of your domain with maximum inbox placement.

---

## Step 1: Create an Email Domain in OCI

1. Sign in to the **Oracle Cloud Console** (`cloud.oracle.com`).
2. Open the main navigation menu (top left) and go to:
   **Developer Services** → **Application Integration** → **Email Delivery** → **Email Domains**.
3. Select your compartment (usually `root` or your project compartment).
4. Click **Create Email Domain**.
5. Name it your sending domain (e.g., `worldwidejournals.com` or `mail.worldwidejournals.com`).

---

## Step 2: Configure DKIM (DomainKeys Identified Mail)

DKIM cryptographically signs every outgoing email to prove authenticity and prevent spoofing. Based on the official [Oracle Cloud Infrastructure DKIM Documentation](https://docs.oracle.com/en-us/iaas/Content/Email/Tasks/configuredkim.htm), follow the exact procedure below:

### 2.1 In the OCI Console (Generate DKIM Key)
1. Open the navigation menu (top-left **☰**) ➔ **Developer Services** ➔ **Application Integration** ➔ **Email Delivery** ➔ **Email Domains**.
2. Click on your newly created **Email Domain** name (e.g., `education.yourpaperpublication.com` or `yourdomain.com`).
3. Under the **Resources** menu on the lower left, click **DKIM**.
4. Click the blue **Add DKIM** button.
5. Select **Add new DKIM** and click **Next**.
6. **Configure Selector:**
   * Enter a DKIM selector name (e.g., `oci` or `mail`).
   * *Selector Rules:* Up to 63 lowercase alphanumeric characters or hyphens (must not start or end with a hyphen).
   * *Unique Selectors:* If you use other Oracle services (like Oracle Integration Cloud / OIC or OTM) on the same domain, each service must use a distinct selector.
   * Click **Next**.
7. **Generate the Record:**
   * Select **Generate DKIM Record** (OCI automatically manages the cryptographic key pair).
   * *(Optional: If your organization requires custom keys, OCI also supports importing an existing private key in PEM format).*
   * Click **Add DKIM**.
8. OCI will generate and display your DNS record:
   * **CNAME Record (Name / Host):** e.g., `oci._domainkey` or `oci._domainkey.education`
   * **CNAME Value (Target):** e.g., `oci.education.yourpaperpublication.com.dkim.ap-mumbai-1.oraclecloud.com`
   * *(Note: In non-commercial government realms, OCI provides a DKIM Text Record Value instead).*

### 2.2 In Your DNS Provider (Publish CNAME Record)
Add the CNAME record in your DNS manager (Cloudflare, cPanel, GoDaddy, Namecheap):
* **Record Type:** `CNAME`
* **Name / Host:** 
  * If your OCI Email Domain is a **subdomain** (`education.domain.com`): Enter `oci._domainkey.education`
  * If your OCI Email Domain is the **root domain** (`domain.com`): Enter `oci._domainkey`
* **Target / Value:** Paste the exact string from OCI (e.g., `oci.education.yourpaperpublication.com.dkim.ap-mumbai-1.oraclecloud.com`).
* **Proxy Status (Cloudflare):** **DNS Only (Grey Cloud ☁️)**.  
  > [!CAUTION]
  > **Do NOT enable the Orange Cloud (Proxied)**. DKIM is an email authentication protocol. Cloudflare HTTP proxying will break email verification.
* **TTL:** `Auto` or `1 min` (for fast propagation).

### 2.3 Verification & OCI Lifecycle Policies
1. **Verification Time:** Cloudflare updates in 1–5 minutes. Return to the OCI Console under **Email Domain ➔ DKIM** and confirm the status changes from **`Needs Attention`** to **`Active` (Green)**.
2. **One Active Key Rule:** Only **one DKIM key can be active** per email domain at any given time.
3. **Capacity Limit (2 Keys Max):** OCI allows up to **two DKIM keys per domain** to support zero-downtime key rotation.
4. **Key Rotation (Every 6 Months):** Oracle officially recommends rotating DKIM keys every 6 months. To rotate: generate a second DKIM key with a new selector (e.g., `oci2`), publish the new CNAME to DNS, click **Activate** on the new key in OCI, and safely delete the retired key.
5. **Approved Senders Sequence:** Always wait until DKIM is **Active** before creating Approved Senders in Step 5.

---

## Step 3: Configure SPF (Sender Policy Framework)

SPF tells inboxes which servers are permitted to send mail for your domain.

Add or update the TXT record on your root domain (`@`):
* **Type:** `TXT`
* **Name:** `@` (or `yourdomain.com`)
* **Value:**
  ```text
  v=spf1 include:recipient.email.oraclecloud.com ~all
  ```

> [!NOTE]
> If you already have existing sending services (e.g., Google Workspace or Brevo), merge them into one line:
> ```text
> v=spf1 include:_spf.google.com include:recipient.email.oraclecloud.com ~all
> ```

---

## Step 4: Configure DMARC

Required by Gmail & Yahoo since Feb 2024 for all bulk senders.

* **Type:** `TXT`
* **Name:** `_dmarc.yourdomain.com`
* **Value:**
  ```text
  v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; pct=100;
  ```

---

## Step 5: Add Approved Senders

1. In OCI Console, navigate to **Email Delivery** → **Approved Senders**.
2. Click **Create Approved Sender**.
3. Enter the exact email address you want to send from (e.g., `newsletter@worldwidejournals.com` or `editor@ijar.in`).
4. Ensure the domain part matches the verified Email Domain from Step 1.

---

## Step 6: Generate SMTP Credentials

You can generate SMTP credentials using either of the following paths in OCI:

### Path A: Via Identity Domains (Production / Tenancy Login: `checkingm13@gmail.com`)
1. Open the navigation menu (top left ☰) → **Identity & Security** → under **Identity**, click **Domains**.
2. Click on the domain name **`Default`** (active domain blue link).
3. Under the **User management** section in the left sidebar, click **Users**.
4. Click on your active user: **`checkingm13@gmail.com`** (Status: Active).
5. In the user details page, scroll down to the **Resources** menu on the lower left.
6. Click **SMTP Credentials**.
7. Click the **Generate SMTP Credentials** button.
8. Enter a Description (e.g., `education-mailer` or `bulk-email-dispatcher`).
9. Click **Generate**.
10. **IMMEDIATELY COPY** both the **Username** (`ocid1.user.oc1...`) and the **Password**. The password is shown only once and cannot be retrieved again.

### Path B: Via "My Profile" Shortcut
1. In the left navigation menu under Identity, click **My profile** (or click your User Avatar in the top right → **User Settings**).
2. Under **Resources** on the bottom left, click **SMTP Credentials**.
3. Click **Generate SMTP Credentials** and save the credentials.

---

## Step 7: Locate Your Regional SMTP Endpoint

OCI uses region-specific SMTP hostnames:

| OCI Region | Region Identifier | SMTP Endpoint |
|---|---|---|
| **India South (Mumbai)** | `ap-mumbai-1` | `smtp.email.ap-mumbai-1.oci.oraclecloud.com` |
| **India Central (Hyderabad)** | `ap-hyderabad-1` | `smtp.email.ap-hyderabad-1.oci.oraclecloud.com` |
| **US East (Ashburn)** | `us-ashburn-1` | `smtp.email.us-ashburn-1.oci.oraclecloud.com` |
| **Europe (Frankfurt)** | `eu-frankfurt-1` | `smtp.email.eu-frankfurt-1.oci.oraclecloud.com` |

* **Port:** `587` (STARTTLS, Recommended) or `25`.

---

## Next Step

Now that your credentials and DNS are ready, deploy the open-source frontend: [[03 - Turnkey Open-Source Engine (Listmonk)]].
