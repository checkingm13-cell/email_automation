const db = require('../config/db');

class GoogleSheetApiService {
    static async create(data) {
        const { sheet_name, spreadsheet_id, worksheet_name, status } = data;
        const [result] = await db.query(
            'INSERT INTO google_sheets (sheet_name, spreadsheet_id, worksheet_name, status) VALUES (?, ?, ?, ?)',
            [sheet_name, spreadsheet_id, worksheet_name || 'Sheet1', status || 'active']
        );
        return { id: result.insertId, ...data };
    }

    static async getAll() {
        const [rows] = await db.query('SELECT * FROM google_sheets ORDER BY created_at DESC');
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query('SELECT * FROM google_sheets WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async update(id, data) {
        const { sheet_name, spreadsheet_id, worksheet_name, status } = data;
        const [result] = await db.query(
            'UPDATE google_sheets SET sheet_name = ?, spreadsheet_id = ?, worksheet_name = ?, status = ? WHERE id = ?',
            [sheet_name, spreadsheet_id, worksheet_name, status, id]
        );
        if (result.affectedRows === 0) throw new Error('Google Sheet not found');
        return { id, ...data };
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM google_sheets WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw new Error('Google Sheet not found');
        return true;
    }
}

module.exports = GoogleSheetApiService;