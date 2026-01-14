const express = require('express');
const router = express.Router();
const maliyetController = require('../controllers/maliyetDosyasıController');
const { authenticateToken } = require('../middleware/auth');

// Radyötör endpoint'leri
router.get('/radyatorler', authenticateToken, maliyetController.getRadyatorler);
router.post('/radyatorler', authenticateToken, maliyetController.createRadyator);

// Hammadde endpoint'leri
router.get('/hammaddeler', authenticateToken, maliyetController.getHammaddeler);

// Maliyet dosyası endpoint'leri (eski yapı)
router.get('/maliyet-dosyalari/:id', authenticateToken, maliyetController.getMaliyetler);
router.post('/maliyet-dosyalari/:id', authenticateToken, maliyetController.saveMaliyetler);
router.delete('/maliyet-dosyalari/:id', authenticateToken, maliyetController.deleteMaliyetDosyasi);

// Yeni maliyet_dosyasi tablosu endpoint'leri
router.get('/maliyet-dosyasi/:radyatorId', authenticateToken, maliyetController.getMaliyetlerFromDosyasi);
router.post('/maliyet-dosyasi/:radyatorId/hammadde', authenticateToken, maliyetController.addHammadde);
router.put('/maliyet-dosyasi/satir/:id', authenticateToken, maliyetController.updateMaliyetSatiri);
router.delete('/maliyet-dosyasi/satir/:id', authenticateToken, maliyetController.deleteMaliyetSatiri);

module.exports = router;
