const TemplateService = require('../services/templateService');

class TemplateController {
    // POST /api/templates
    static async create(req, res) {
        try {
            const newTemplate = await TemplateService.create(req.body);
            res.status(201).json({ success: true, data: newTemplate });
        } catch (error) {
            if (error.message.includes('already exists')) {
                return res.status(409).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Failed to create template', error: error.message });
        }
    }

    // GET /api/templates
    static async getAll(req, res) {
        try {
            const templates = await TemplateService.getAll();
            res.status(200).json({ success: true, data: templates });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message });
        }
    }

    // GET /api/templates/:id
    static async getById(req, res) {
        try {
            const template = await TemplateService.getById(req.params.id);
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            res.status(200).json({ success: true, data: template });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch template', error: error.message });
        }
    }

    // PUT /api/templates/:id
    static async update(req, res) {
        try {
            const updatedTemplate = await TemplateService.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: updatedTemplate });
        } catch (error) {
            if (error.message.includes('already exists')) {
                return res.status(409).json({ success: false, message: error.message });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Failed to update template', error: error.message });
        }
    }

    // DELETE /api/templates/:id
    static async delete(req, res) {
        try {
            const result = await TemplateService.delete(req.params.id);
            res.status(200).json({ success: true, message: result.message });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Failed to delete template', error: error.message });
        }
    }
}

module.exports = TemplateController;
