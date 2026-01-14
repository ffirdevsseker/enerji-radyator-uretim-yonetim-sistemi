const express = require('express');
const router = express.Router();
const islemlerController = require('../controllers/islemlerController');
const { authenticateToken } = require('../middleware/auth');

// Tüm route'lar için token doğrulama
router.use(authenticateToken);

// ============================================
// HAM MADDE ALIMLARI ROUTE'LARI
// ============================================
router.get('/ham-madde-alimlari', islemlerController.getHamMaddeAlimlari);
router.post('/ham-madde-alimlari', islemlerController.createHamMaddeAlimi);
router.put('/ham-madde-alimlari/:id', islemlerController.updateHamMaddeAlimi);
router.delete('/ham-madde-alimlari/:id', islemlerController.deleteHamMaddeAlimi);

// Çoklu ham madde alımı (Yeni)
router.post('/ham-madde-alimlari/coklu', islemlerController.createCokluHamMaddeAlimi);

// ============================================
// RADYATÖR SATIŞLARI ROUTE'LARI
// ============================================
router.get('/radyator-satislari', islemlerController.getRadyatorSatislari);
router.post('/radyator-satislari', islemlerController.createRadyatorSatisi);
router.put('/radyator-satislari/:id', islemlerController.updateRadyatorSatisi);
router.delete('/radyator-satislari/:id', islemlerController.deleteRadyatorSatisi);

// Çoklu radyatör satışı (Yeni)
router.post('/radyator-satislari/coklu', islemlerController.createCokluRadyatorSatisi);

// ============================================
// YARDIMCI ROUTE'LAR
// ============================================
router.get('/tedarikciler', islemlerController.getTedarikciler);
router.get('/ham-maddeler', islemlerController.getHamMaddeler);
router.get('/musteriler', islemlerController.getMusteriler);
router.get('/radyatorler', islemlerController.getRadyatorler);
router.get('/fatura-numaralari', islemlerController.getFaturaNumaralari);
router.get('/tarih-araligi', islemlerController.getTarihAraligi);

// İşlem detayı (stok hareketi bilgisi)
router.get('/detay/:kaynakTablo/:kaynakId', islemlerController.getIslemDetayi);

// Fatura detayı (tüm kalemler ile)
router.get('/fatura-detayi/:tip/:faturaId', islemlerController.getFaturaDetayi);

module.exports = router;