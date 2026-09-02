const db = require('../config/db');
const crypto = require('crypto');

class UnsubscribeService {
    /**
     * Generates a secure, unique token for an email and saves it to the database
     */
    static async generateToken(email, campaignId) {
        const token = crypto.randomBytes(32).toString('hex');

        await db.query(
            'INSERT INTO unsubscribe_tokens (email, campaign_id, token) VALUES (?, ?, ?)',
            [email, campaignId, token]
        );

        return token;
    }

    /**
     * Validates the token and adds the user to the global unsubscribes table
     */
    static async processUnsubscribe(token) {
        // 1. Find the token (must be unused)
        const [tokens] = await db.query(
            'SELECT * FROM unsubscribe_tokens WHERE token = ? AND used = 0',
            [token]
        );

        if (tokens.length === 0) {
            return { success: false, message: 'Invalid or already used unsubscribe link.' };
        }

        const tokenData = tokens[0];

        // 2. Mark the token as used
        await db.query(
            'UPDATE unsubscribe_tokens SET used = 1, used_at = NOW() WHERE id = ?',
            [tokenData.id]
        );

        // 3. Add to global unsubscribes (INSERT IGNORE prevents duplicate errors)
        await db.query(
            'INSERT IGNORE INTO unsubscribes (email, recipient_name, source) VALUES (?, ?, ?)',
            [tokenData.email, 'Unknown', 'unsubscribe_link']
        );

        return { success: true, email: tokenData.email };
    }
}

module.exports = UnsubscribeService;