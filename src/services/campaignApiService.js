const db = require('../config/db');

class CampaignApiService {
    static async create(data) {
        const {
            campaign_name,
            google_sheet_id,
            spreadsheet_title,
            worksheet_name = 'Sheet1',
            subject,
            body_template,
            recipient_column = 'email',
            sender_email,
            scheduled_at,
            status = 'PENDING'
        } = data;

        const [result] = await db.query(
            `INSERT INTO campaigns (
                campaign_name, google_sheet_id, spreadsheet_title, worksheet_name, 
                subject, body_template, recipient_column, sender_email, scheduled_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                campaign_name,
                google_sheet_id || null,
                spreadsheet_title || campaign_name,
                worksheet_name,
                subject || '',
                body_template || '',
                recipient_column,
                sender_email || null,
                scheduled_at || null,
                scheduled_at ? 'SCHEDULED' : status
            ]
        );
        return { id: result.insertId, ...data };
    }

    static async update(id, data) {
        const {
            campaign_name,
            google_sheet_id,
            spreadsheet_title,
            worksheet_name,
            subject,
            body_template,
            recipient_column,
            sender_email,
            scheduled_at,
            status
        } = data;

        const [result] = await db.query(
            `UPDATE campaigns SET 
                campaign_name = COALESCE(?, campaign_name),
                google_sheet_id = COALESCE(?, google_sheet_id),
                spreadsheet_title = COALESCE(?, spreadsheet_title),
                worksheet_name = COALESCE(?, worksheet_name),
                subject = COALESCE(?, subject),
                body_template = COALESCE(?, body_template),
                recipient_column = COALESCE(?, recipient_column),
                sender_email = COALESCE(?, sender_email),
                scheduled_at = COALESCE(?, scheduled_at),
                status = COALESCE(?, status)
            WHERE id = ?`,
            [
                campaign_name,
                google_sheet_id,
                spreadsheet_title,
                worksheet_name,
                subject,
                body_template,
                recipient_column,
                sender_email,
                scheduled_at,
                status,
                id
            ]
        );
        if (result.affectedRows === 0) throw new Error('Campaign not found');
        return { id, ...data };
    }

    static async getAll() {
        const [rows] = await db.query(`
            SELECT c.*, gs.sheet_name 
            FROM campaigns c 
            LEFT JOIN google_sheets gs ON c.google_sheet_id = gs.id 
            ORDER BY c.created_at DESC
        `);
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query(`
            SELECT c.*, gs.sheet_name, gs.spreadsheet_id 
            FROM campaigns c 
            LEFT JOIN google_sheets gs ON c.google_sheet_id = gs.id 
            WHERE c.id = ?
        `, [id]);
        return rows[0] || null;
    }

    static async schedule(id, scheduledAt) {
        if (!scheduledAt) throw new Error('scheduled_at timestamp is required');
        const [result] = await db.query(
            `UPDATE campaigns SET scheduled_at = ?, status = 'SCHEDULED' WHERE id = ? AND status IN ('PENDING', 'SCHEDULED', 'FAILED')`,
            [scheduledAt, id]
        );
        if (result.affectedRows === 0) throw new Error('Campaign not found or cannot be scheduled in current status');
        return { id, scheduled_at: scheduledAt, status: 'SCHEDULED' };
    }

    static async cancel(id) {
        const [result] = await db.query(
            `UPDATE campaigns SET status = 'CANCELLED' WHERE id = ? AND status IN ('PENDING', 'SCHEDULED')`,
            [id]
        );
        if (result.affectedRows === 0) throw new Error('Campaign not found or cannot be cancelled in current status');
        return { id, status: 'CANCELLED' };
    }

    static async getLogs(id) {
        const [rows] = await db.query(
            `SELECT * FROM campaign_execution_logs WHERE campaign_id = ? ORDER BY created_at ASC`,
            [id]
        );
        return rows;
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM campaigns WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw new Error('Campaign not found');
        return true;
    }
}

module.exports = CampaignApiService;