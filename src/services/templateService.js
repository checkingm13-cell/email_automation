const db = require('../config/db');

class TemplateService {
    // Create a new template
    static async create(templateData) {
        const { journal_id, template_name, form_number, subject, html_content, text_content, status } = templateData;

        const query = `
      INSERT INTO templates (journal_id, template_name, form_number, subject, html_content, text_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const [result] = await db.query(query, [
                journal_id || null,
                template_name,
                form_number || null,
                subject || '',
                html_content || '',
                text_content || '',
                status || 'active'
            ]);
            return { id: result.insertId, ...templateData };
        } catch (error) {
            if (error.errno === 1062) { // MariaDB/MySQL Duplicate Entry Error Code
                throw new Error(`Template with name '${template_name}' already exists.`);
            }
            throw error;
        }
    }

    // Get all templates
    static async getAll() {
        const query = `
      SELECT id, journal_id, template_name, form_number, subject, status, created_at, updated_at 
      FROM templates 
      ORDER BY created_at DESC
    `;
        const [rows] = await db.query(query);
        return rows;
    }

    // Get a single template by ID
    static async getById(id) {
        const query = `
      SELECT id, journal_id, template_name, form_number, subject, html_content, text_content, status, created_at, updated_at 
      FROM templates 
      WHERE id = ?
    `;
        const [rows] = await db.query(query, [id]);
        return rows[0] || null;
    }

    // Update a template
    // Update a template (Dynamic Partial Update)
    static async update(id, templateData) {
        // 1. Filter out undefined values so we only update what was actually sent
        const fieldsToUpdate = {};
        for (const [key, value] of Object.entries(templateData)) {
            if (value !== undefined) {
                fieldsToUpdate[key] = value;
            }
        }

        if (Object.keys(fieldsToUpdate).length === 0) {
            throw new Error('No valid fields provided to update.');
        }

        // 2. Build the dynamic SQL query
        const setClause = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
        const values = Object.values(fieldsToUpdate);
        values.push(id); // Add the ID for the WHERE clause

        const query = `UPDATE templates SET ${setClause} WHERE id = ?`;

        try {
            const [result] = await db.query(query, values);

            if (result.affectedRows === 0) {
                throw new Error('Template not found.');
            }

            // 3. Fetch and return the fully updated template
            return await TemplateService.getById(id);

        } catch (error) {
            if (error.errno === 1062) {
                throw new Error(`Template with name '${fieldsToUpdate.template_name}' already exists.`);
            }
            if (error.errno === 1452) { // Foreign key constraint error code
                throw new Error(`Foreign key constraint failed. The provided journal_id does not exist in the journals table.`);
            }
            throw error;
        }
    }

    // Delete a template
    static async delete(id) {
        const query = `DELETE FROM templates WHERE id = ?`;
        const [result] = await db.query(query, [id]);

        if (result.affectedRows === 0) {
            throw new Error('Template not found.');
        }
        return { message: 'Template deleted successfully.' };
    }
}

module.exports = TemplateService;