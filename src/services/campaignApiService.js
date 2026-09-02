const db = require('../config/db');

class CampaignApiService {
    static async create(data) {
        const { campaign_name, google_sheet_id, sender_email, scheduled_at, rate_limit_per_minute } = data;
        const [result] = await db.query(
            'INSERT INTO campaigns (campaign_name, google_sheet_id, sender_email, scheduled_at, rate_limit_per_minute, status) VALUES (?, ?, ?, ?, ?, ?)',
            [campaign_name, google_sheet_id, sender_email, scheduled_at || null, rate_limit_per_minute || 10, 'draft']
        );
        return { id: result.insertId, ...data };
    }

    static async update(id, data) {
        const { campaign_name, google_sheet_id, sender_email, scheduled_at, status, rate_limit_per_minute } = data;
        const [result] = await db.query(
            'UPDATE campaigns SET campaign_name = ?, google_sheet_id = ?, sender_email = ?, scheduled_at = ?, status = ?, rate_limit_per_minute = ? WHERE id = ?',
            [campaign_name, google_sheet_id, sender_email, scheduled_at, status, rate_limit_per_minute, id]
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


    static async delete(id) {
        const [result] = await db.query('DELETE FROM campaigns WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw new Error('Campaign not found');
        return true;
    }
}

module.exports = CampaignApiService;