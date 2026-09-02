const express = require('express');
const router = express.Router();
const GoogleSheetController = require('../controllers/googleSheetController');

router.post('/', GoogleSheetController.create);
router.get('/', GoogleSheetController.getAll);
router.get('/:id', GoogleSheetController.getById);
router.put('/:id', GoogleSheetController.update);
router.delete('/:id', GoogleSheetController.delete);

module.exports = router;