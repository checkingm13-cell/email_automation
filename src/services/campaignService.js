const db = require('../config/db');

class CampaignService {
    /**
     * Creates a new campaign
     * Requires subject, body_template, scheduled_at, and at least one of spreadsheet_title or spreadsheet_url
     */
    static async create(data) {
        const {
            spreadsheet_title,
            spreadsheet_url,
            recipient_column = 'email',
            subject,
            body_template,
            scheduled_at
        } = data;

        if (!spreadsheet_title && !spreadsheet_url) {
            throw new Error('Either spreadsheet_title or spreadsheet_url must be provided.');
        }

        if (!subject || !subject.trim()) {
            throw new Error('Subject is required.');
        }

        if (!body_template || !body_template.trim()) {
            throw new Error('Body template is required.');
        }

        if (!scheduled_at) {
            throw new Error('Scheduled datetime (scheduled_at) is required.');
        }

        const scheduledDate = new Date(scheduled_at);
        if (isNaN(scheduledDate.getTime())) {
            throw new Error('Invalid scheduled_at date format.');
        }

        const [result] = await db.query(
            `INSERT INTO campaigns 
            (spreadsheet_title, spreadsheet_url, recipient_column, subject, body_template, scheduled_at, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
            [
                spreadsheet_title ? spreadsheet_title.trim() : null,
                spreadsheet_url ? spreadsheet_url.trim() : null,
                recipient_column ? recipient_column.trim() : 'email',
                subject.trim(),
                body_template,
                scheduledDate
            ]
        );

        return await this.getById(result.insertId);
    }

    /**
     * Returns all campaigns ordered by creation date
     */
    static async getAll() {
        const [rows] = await db.query('SELECT * FROM campaigns ORDER BY created_at DESC');
        return rows;
    }

    /**
     * Returns a single campaign by ID
     */
    static async getById(id) {
        const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Reschedules a campaign to a new date/time
     */
    static async schedule(id, scheduledAt) {
        const campaign = await this.getById(id);
        if (!campaign) {
            throw new Error(`Campaign #${id} not found.`);
        }

        if (campaign.status === 'RUNNING') {
            throw new Error(`Cannot reschedule campaign #${id} while it is currently RUNNING.`);
        }

        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
            throw new Error('Invalid scheduled_at date format.');
        }

        await db.query(
            `UPDATE campaigns 
            SET scheduled_at = ?, status = 'PENDING', last_error = NULL 
            WHERE id = ?`,
            [scheduledDate, id]
        );

        return await this.getById(id);
    }

    /**
     * Triggers a campaign immediately
     * Sets scheduled_at = NOW() and status = 'PENDING'
     */
    static async trigger(id) {
        const campaign = await this.getById(id);
        if (!campaign) {
            throw new Error(`Campaign #${id} not found.`);
        }

        if (campaign.status === 'RUNNING') {
            throw new Error(`Campaign #${id} is already RUNNING.`);
        }

        await db.query(
            `UPDATE campaigns 
            SET scheduled_at = NOW(), status = 'PENDING', last_error = NULL 
            WHERE id = ?`,
            [id]
        );

        // Dynamically invoke CampaignScheduler to process immediately if idle
        try {
            const CampaignScheduler = require('./campaignScheduler');
            CampaignScheduler.processDueCampaigns().catch(err => {
                console.error(`Error during immediate trigger execution for #${id}:`, err.message);
            });
        } catch (schedErr) {
            console.warn('Could not immediately invoke scheduler:', schedErr.message);
        }

        return await this.getById(id);
    }

    /**
     * Cancels a pending campaign
     */
    static async cancel(id) {
        const campaign = await this.getById(id);
        if (!campaign) {
            throw new Error(`Campaign #${id} not found.`);
        }

        if (campaign.status === 'RUNNING') {
            throw new Error(`Cannot cancel campaign #${id} because it is currently RUNNING.`);
        }

        if (campaign.status === 'COMPLETED') {
            throw new Error(`Cannot cancel campaign #${id} because it has already COMPLETED.`);
        }

        await db.query("UPDATE campaigns SET status = 'CANCELLED' WHERE id = ?", [id]);
        return await this.getById(id);
    }

    /**
     * Updates status to RUNNING and sets started_at
     */
    static async markRunning(id) {
        await db.query(
            "UPDATE campaigns SET status = 'RUNNING', started_at = NOW(), last_error = NULL WHERE id = ?",
            [id]
        );
    }

    /**
     * Updates status to COMPLETED and sets completed_at
     */
    static async markCompleted(id) {
        await db.query(
            "UPDATE campaigns SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?",
            [id]
        );
    }

    /**
     * Updates status to FAILED and records error message
     */
    static async markFailed(id, errorMessage) {
        await db.query(
            "UPDATE campaigns SET status = 'FAILED', completed_at = NOW(), last_error = ? WHERE id = ?",
            [errorMessage, id]
        );
    }
}

module.exports = CampaignService;
