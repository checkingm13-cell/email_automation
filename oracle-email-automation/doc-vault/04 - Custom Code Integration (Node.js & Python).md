# 04 - Custom Code Integration (Node.js & Python)

If you are building custom backends, webhook integrations, or extending the existing server code in `D:\projects\extension\cloud\server.js`, you can dispatch emails directly through OCI Email Delivery using Node.js or Python.

---

## 1. Node.js (Production High-Concurrency Dispatcher)

Install dependencies:
```bash
npm install nodemailer dotenv
```

### `oci-mailer.js`

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize pooled SMTP transporter for maximum throughput
const transporter = nodemailer.createTransport({
  host: process.env.OCI_SMTP_HOST || 'smtp.email.ap-mumbai-1.oci.oraclecloud.com',
  port: parseInt(process.env.OCI_SMTP_PORT || '587', 10),
  secure: false, // true for port 465, false for port 587 (STARTTLS)
  auth: {
    user: process.env.OCI_SMTP_USER, // e.g., ocid1.user.oc1..aaaaaa...
    pass: process.env.OCI_SMTP_PASS, // Your generated OCI SMTP password
  },
  pool: true,             // Keeps sockets open between messages
  maxConnections: 10,     // Up to 10 concurrent connections
  maxMessages: 200,       // Recycle connection after 200 emails
});

/**
 * Dispatches an email with UTM parameters and compliance headers
 */
async function sendOciEmail({ to, subject, htmlContent, campaignTag, authorName }) {
  // Personalize HTML
  const personalizedHtml = htmlContent.replace(/{{name}}/g, authorName || 'Author');

  const mailOptions = {
    from: '"Worldwide Journals" <newsletter@yourdomain.com>', // Must be in OCI Approved Senders
    to: to,
    subject: subject,
    html: personalizedHtml,
    headers: {
      'X-Campaign-ID': campaignTag || 'bulk-run',
      'List-Unsubscribe': '<https://yourdomain.com/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[OCI-SMTP Error] Failed sending to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOciEmail };
```

---

## 2. Python (Batch / CLI Dispatcher)

Ideal for processing data pipelines or Google Sheet exports.

### `oci_sender.py`

```python
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("OCI_SMTP_HOST", "smtp.email.ap-mumbai-1.oci.oraclecloud.com")
SMTP_PORT = int(os.getenv("OCI_SMTP_PORT", 587))
SMTP_USER = os.getenv("OCI_SMTP_USER")
SMTP_PASS = os.getenv("OCI_SMTP_PASS")
SENDER_EMAIL = "newsletter@yourdomain.com"

def send_batch(recipients, subject, html_template):
    context = ssl.create_default_context()
    
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls(context=context)
        server.login(SMTP_USER, SMTP_PASS)
        
        for item in recipients:
            recipient_email = item.get("email")
            author_name = item.get("name", "Author")
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Worldwide Journals <{SENDER_EMAIL}>"
            msg["To"] = recipient_email
            msg["List-Unsubscribe"] = "<https://yourdomain.com/unsubscribe>"
            
            body = html_template.replace("{{name}}", author_name)
            msg.attach(MIMEText(body, "html"))
            
            try:
                server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
                print(f"[SUCCESS] Sent to {recipient_email}")
            except Exception as e:
                print(f"[FAILED] Error sending to {recipient_email}: {e}")

if __name__ == "__main__":
    sample_list = [
        {"email": "test@example.com", "name": "Dr. Sharma"}
    ]
    template = "<h3>Dear {{name}},</h3><p>Your research paper is invited.</p>"
    send_batch(sample_list, "Call for Papers - October 2026", template)
```

---

## Next Step

Review deliverability limits and warmup practices in [[05 - Deliverability, Warmup & Compliance]].
