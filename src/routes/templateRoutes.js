const express = require('express');
const router = express.Router();
const TemplateController = require('../controllers/templateController');

// Create a new template
router.post('/', TemplateController.create);

// Get all templates
router.get('/', TemplateController.getAll);

// Get a single template by ID
router.get('/:id', TemplateController.getById);

// Update a template by ID
router.put('/:id', TemplateController.update);

// Delete a template by ID
router.delete('/:id', TemplateController.delete);

module.exports = router;