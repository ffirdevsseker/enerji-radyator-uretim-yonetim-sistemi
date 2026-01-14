const express = require('express');
const router = express.Router();
const uretimController = require('../controllers/uretimController');
const { authenticateToken } = require('../middleware/auth');

// Tüm route'lar auth middleware ile korunuyor
router.use(authenticateToken);

/**
 * İrsaliye İşlemleri
 */

// Otomatik irsaliye numarası oluştur
router.get('/next-irsaliye-no', uretimController.getNextIrsaliyeNo);

// Yeni irsaliye oluştur (Çıkış veya Giriş)
router.post('/irsaliye', uretimController.createIrsaliye);

// Tüm irsaliyeleri listele
router.get('/irsaliyeler', uretimController.getIrsaliyeler);

// Belirli bir irsaliyenin detayını getir
router.get('/irsaliye/:id', uretimController.getIrsaliyeDetay);

// İrsaliye sil
router.delete('/irsaliye/:id', uretimController.deleteIrsaliye);

/**
 * Hammadde ve Radyatör Listeleri
 */

// Ham madde listesi
router.get('/hammaddeler', uretimController.getHammaddeler);

// Radyatör listesi
router.get('/radyatorler', uretimController.getRadyatorler);

/**
 * Raporlama ve Özet İşlemleri
 */

// Fabrikadaki kalan hammadde durumu
router.get('/kalan-hammaddeler', uretimController.getKalanHammaddeler);

// Maliyet özeti raporu
router.get('/maliyet-ozeti', uretimController.getMaliyetOzeti);

// Radyatör maliyet dosyası detayı
router.get('/radyator-maliyet/:radyator_id', uretimController.getRadyatorMaliyetDosyasi);

module.exports = router;
