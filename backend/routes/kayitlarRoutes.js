const express = require('express');
const router = express.Router();
const kayitlarController = require('../controllers/kayitlarController');

// Kayitlar page routes
router.get('/', kayitlarController.getKayitlarData);
router.post('/contact-form', kayitlarController.handleContactForm);

// Records API (for frontend list and drill-down)
router.get('/records/:type/:id', kayitlarController.getRecordDetails);
router.get('/records', kayitlarController.getRecords);
router.post('/records', kayitlarController.createRecord);
router.put('/records/:id', kayitlarController.updateRecord);
router.delete('/records/:id', kayitlarController.deleteRecord);
router.post('/bulk', kayitlarController.bulkUpdateRecords);

// New table-specific endpoints
router.get('/table/:type', kayitlarController.getTableData);
router.post('/table/:type', kayitlarController.createTableRecord);

module.exports = router;