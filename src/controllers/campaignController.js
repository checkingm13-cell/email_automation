const CampaignApiService = require('../services/campaignApiService');

class CampaignController {
    static async create(req, res) {
        try {
            const campaign = await CampaignApiService.create(req.body);
            res.status(201).json({ success: true, data: campaign });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const campaigns = await CampaignApiService.getAll();
            res.status(200).json({ success: true, data: campaigns });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const campaign = await CampaignApiService.getById(req.params.id);
            if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });
            res.status(200).json({ success: true, data: campaign });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async update(req, res) {
        try {
            const campaign = await CampaignApiService.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: campaign });
        } catch (error) {
            if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async delete(req, res) {
        try {
            await CampaignApiService.delete(req.params.id);
            res.status(200).json({ success: true, message: 'Deleted successfully' });
        } catch (error) {
            if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = CampaignController;