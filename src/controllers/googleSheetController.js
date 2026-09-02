const GoogleSheetApiService = require('../services/googleSheetApiService');

class GoogleSheetController {
    static async create(req, res) {
        try {
            const sheet = await GoogleSheetApiService.create(req.body);
            res.status(201).json({ success: true, data: sheet });
        } catch (error) {
            if (error.errno === 1062) return res.status(409).json({ success: false, message: 'Spreadsheet ID and Worksheet must be unique' });
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const sheets = await GoogleSheetApiService.getAll();
            res.status(200).json({ success: true, data: sheets });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const sheet = await GoogleSheetApiService.getById(req.params.id);
            if (!sheet) return res.status(404).json({ success: false, message: 'Not found' });
            res.status(200).json({ success: true, data: sheet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async update(req, res) {
        try {
            const sheet = await GoogleSheetApiService.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: sheet });
        } catch (error) {
            if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            await GoogleSheetApiService.delete(req.params.id);
            res.status(200).json({ success: true, message: 'Deleted successfully' });
        } catch (error) {
            if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = GoogleSheetController;