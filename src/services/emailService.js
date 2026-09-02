const { google } = require('googleapis');
const path = require('path');
const crypto = require('crypto');

class EmailService {
    static async sendEmail({
        to,
        subject,
        htmlContent,
        textContent,
        recipientName,
        senderEmail,
        senderRefreshToken,
        unsubscribeUrl
    }) {
        try {
            const cleanTo = String(to).trim();
            if (!cleanTo || !cleanTo.includes('@')) {
                throw new Error(`Invalid recipient address: "${cleanTo}"`);
            }

            // 1. Dynamic Authentication
            let authClient;
            if (senderRefreshToken) {
                // Personal Gmail: OAuth 2.0
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    'http://localhost'
                );
                oauth2Client.setCredentials({ refresh_token: senderRefreshToken });
                authClient = oauth2Client;
            } else {
                // Workspace: Service Account with DWD
                authClient = new google.auth.GoogleAuth({
                    keyFile: path.join(__dirname, '../../credentials.json'),
                    scopes: ['https://www.googleapis.com/auth/gmail.send'],
                    clientOptions: { subject: senderEmail }
                });
            }

            const client = await authClient.getClient();

            // 2. Personalize Content
            const name = recipientName || 'Subscriber';
            let finalHtml = htmlContent.replace(/\{\{Name\}\}/gi, name);
            let finalText = textContent.replace(/\{\{Name\}\}/gi, name);

            // 3. AUTOMATICALLY INJECT Unsubscribe Footer (Pipeline Enforcement)
            const htmlFooter = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-family: Arial, sans-serif; font-size: 12px; color: #888888; text-align: center;">
          <p style="margin: 0 0 8px 0;">You are receiving this email because you opted in to our mailing list.</p>
          <a href="${unsubscribeUrl}" style="color: #888888; text-decoration: underline;">Click here to unsubscribe</a>
        </div>
      `;

            const textFooter = `\n\n---\nYou are receiving this email because you opted in to our mailing list.\nTo stop receiving these emails, click here or copy/paste this link into your browser:\n${unsubscribeUrl}`;

            finalHtml = finalHtml + htmlFooter;
            finalText = finalText + textFooter;

            // 4. Construct MIME Message
            const domain = senderEmail.split('@')[1];
            const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@${domain}>`;
            const boundary = 'boundary_' + Date.now();

            const mimeMessage = [
                `Date: ${new Date().toUTCString()}`,
                `From: "Editorial Team" <${senderEmail}>`,
                `To: ${cleanTo}`,
                `Subject: ${subject}`,
                `Message-ID: ${messageId}`,
                `Reply-To: ${senderEmail}`,
                `List-Unsubscribe: <${unsubscribeUrl}>, <mailto:${senderEmail}?subject=Unsubscribe>`,
                `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
                `MIME-Version: 1.0`,
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset="UTF-8"',
                'Content-Transfer-Encoding: 7bit',
                '',
                finalText,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset="UTF-8"',
                'Content-Transfer-Encoding: 7bit',
                '',
                finalHtml,
                '',
                `--${boundary}--`
            ].join('\r\n');

            const encodedMessage = Buffer.from(mimeMessage)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // 5. Send via Gmail API
            const gmail = google.gmail({ version: 'v1', auth: client });
            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw: encodedMessage }
            });

            return { success: true, messageId: response.data.id };

        } catch (error) {
            console.error(`   ❌ Send Error for ${senderEmail}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailService;