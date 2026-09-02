const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');

router.post('/', CampaignController.create);
router.get('/', CampaignController.getAll);
router.get('/:id', CampaignController.getById);
router.put('/:id', CampaignController.update);
router.delete('/:id', CampaignController.delete);

module.exports = router;