const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');

// CRUD & Inspection
router.post('/', CampaignController.create);
router.get('/', CampaignController.getAll);
router.get('/:id', CampaignController.getById);

// Lifecycle Actions
router.post('/:id/schedule', CampaignController.schedule);
router.post('/:id/trigger', CampaignController.trigger);
router.post('/:id/trigger-now', CampaignController.trigger); // Alias for compatibility
router.post('/:id/cancel', CampaignController.cancel);

module.exports = router;