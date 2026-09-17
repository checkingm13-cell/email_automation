# 07 - Production Verified Sending Domains & Senders Ledger

> **Last Updated:** September 16, 2026  
> **Status:** 100% Active, Authenticated (2048-bit DKIM, SPF, DMARC), and Registered in OCI + Azure Graph Mailer.

---

## 🌐 1. The 5 Active Production Email Domains

All 5 domains are configured under OCI Region **India South (Mumbai) `ap-mumbai-1` (`bom1`)**:

| # | Sending Subdomain | Base Domain | DKIM Host (CNAME Name) | DKIM Target Host (CNAME Value) | SPF Record (TXT) | DMARC Record (TXT) |
|---|---|---|---|---|---|---|
| **1** | `education.researchandrise.com` | `researchandrise.com` | `oci._domainkey.education` | `oci.education.researchandrise.com.dkim.bom1.oracleemaildelivery.com` | `v=spf1 include:recipient.email.oraclecloud.com ~all` | `v=DMARC1; p=none;` |
| **2** | `publication.onlypaperpublication.com` | `onlypaperpublication.com` | `oci._domainkey.publication` | `oci.publication.onlypaperpublication.com.dkim.bom1.oracleemaildelivery.com` | `v=spf1 +a +mx +ip4:103.224.246.201 include:spf.mailjet.com include:recipient.email.oraclecloud.com ~all` | `v=DMARC1; p=none;` |
| **3** | `education.yourseducationmatter.com` | `yourseducationmatter.com` | `oci._domainkey.education` | `oci.education.yourseducationmatter.com.dkim.bom1.oracleemaildelivery.com` | `v=spf1 include:recipient.email.oraclecloud.com ~all` | `v=DMARC1; p=none;` |
| **4** | `education.yourpaperpublication.com` | `yourpaperpublication.com` | `oci._domainkey.education` | `oci.education.yourpaperpublication.com.dkim.bom1.oracleemaildelivery.com` | `v=spf1 include:recipient.email.oraclecloud.com ~all` | `v=DMARC1; p=none;` |
| **5** | `education.yourpaperedition.com` | `yourpaperedition.com` | `oci._domainkey.education` | `oci.education.yourpaperedition.com.dkim.bom1.oracleemaildelivery.com` | `v=spf1 include:recipient.email.oraclecloud.com ~all` | `v=DMARC1; p=none;` |

---

## ✉️ 2. Production Approved Senders Registered in OCI

Each sender address is verified and active in **Oracle Cloud Console ➔ Email Delivery ➔ Approved Senders**:

| # | Sender Email Address | Display Name | Associated OCI OCID |
|---|---|---|---|
| **1** | `research@education.researchandrise.com` | Research & Rise Academic | `ocid1.emailsender.oc1.ap-mumbai-1.amaaaaaawvh7c2ya2qpi3bc7bdr7crbdpqymsiuvmpks2yglqnavdol4dntq` |
| **2** | `editor@publication.onlypaperpublication.com` | Paper Publication Editorial | `ocid1.emailsender.oc1.ap-mumbai-1.amaaaaaawvh7c2yavfnxy6g2xp7axycf432seuwp7s4aouqoutv5q2fhgm5q` |
| **3** | `academic@education.yourseducationmatter.com` | Education Matters Journal | `ocid1.emailsender.oc1.ap-mumbai-1.amaaaaaawvh7c2yazdxzpb3ykx3fxsptvr6jcj3jsgub3l73rhnkdatmrknq` |
| **4** | `editorial@education.yourpaperpublication.com` | Paper Publication Review Board | `ocid1.emailsender.oc1.ap-mumbai-1.amaaaaaawvh7c2yasvtnu3gx2oq5kn3b654onmre4ockx7uxuviaio6dgw7q` |
| **5** | `newsletter@education.yourpaperedition.com` | Paper Edition Education Newsletter | `ocid1.emailsender.oc1.ap-mumbai-1.amaaaaaawvh7c2ya2vtqg4fgwn2yaewexqyjyb6kzdbhp4quoecwea7h75fq` |

---

## ⚙️ 3. Azure Graph Mailer Database Integration (`data/mailer.db`)

All 5 accounts are registered into the local dispatch database with provider **OCI**, a daily limit of **10,000 emails/account**, and **0s cooldown**:

```sql
SELECT id, email, display_name, provider, daily_limit, is_active FROM accounts WHERE provider = 'OCI';
```

### Active Pool Status:
* Total Combined Daily Sending Capacity: **50,000 emails/day**
* Round-Robin rotation automatically distributes campaigns across these 5 domains.
* Link resolution automatically rewrites `{{senderDomain}}` to match each sender's respective domain.

---

## 🔐 4. Central SMTP Authentication Settings (`.env`)

These credentials in `azure-graph-mailer/.env` authenticate all 5 domains without requiring separate passwords:

```env
OCI_SMTP_HOST=smtp.email.ap-mumbai-1.oci.oraclecloud.com
OCI_SMTP_PORT=587
OCI_SMTP_USER=ocid1.user.oc1..aaaaaaaaconx3pcyv2bqcmemderchjvjlkm35omxze2cqijfs4hg4see4gtq@ocid1.tenancy.oc1..aaaaaaaa5jforpookd2ntmkz5y2kldg3vbykm6jnei4cwpesmvhn525of2zq.4j.com
OCI_SMTP_PASS=xvZ8!;-;][Ryp[)1uiy<
```
