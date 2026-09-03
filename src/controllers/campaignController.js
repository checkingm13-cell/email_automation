const CampaignService = require('../services/campaignService');

class CampaignController {
    static async create(req, res) {
        try {
            const campaign = await CampaignService.create(req.body);
            res.status(201).json({ success: true, data: campaign });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const campaigns = await CampaignService.getAll();
            res.status(200).json({ success: true, data: campaigns });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const campaign = await CampaignService.getById(req.params.id);
            if (!campaign) {
                return res.status(404).json({ success: false, message: 'Campaign not found' });
            }
            res.status(200).json({ success: true, data: campaign });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async schedule(req, res) {
        try {
            const { scheduled_at } = req.body;
            if (!scheduled_at) {
                return res.status(400).json({ success: false, message: 'scheduled_at is required' });
            }
            const updated = await CampaignService.schedule(req.params.id, scheduled_at);
            res.status(200).json({ success: true, message: 'Campaign scheduled successfully', data: updated });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async trigger(req, res) {
        try {
            const updated = await CampaignService.trigger(req.params.id);
            res.status(200).json({ 
                success: true, 
                message: `Campaign #${req.params.id} queued for immediate execution`, 
                data: updated 
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async cancel(req, res) {
        try {
            const cancelled = await CampaignService.cancel(req.params.id);
            res.status(200).json({ success: true, message: 'Campaign cancelled', data: cancelled });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = CampaignController;