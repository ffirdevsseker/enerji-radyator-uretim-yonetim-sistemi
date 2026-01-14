const pool = require('../config/database');

/**
 * İrsaliye Oluşturma (Çıkış veya Giriş)
 * - Üretim Çıkışı: Ham madde fabrikaya gönderilir
 * - Üretim Girişi: Radyatör fabrikadan gelir
 */
exports.createIrsaliye = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { irsaliye_no, tarih, irsaliye_tipi, aciklama, kalemler } = req.body;
        
        // Validasyon
        if (!irsaliye_no || !tarih || !irsaliye_tipi || !kalemler || kalemler.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Gerekli alanlar eksik!' 
            });
        }
        
        // İrsaliye No kontrolü
        const [existingIrsaliye] = await connection.query(
            'SELECT id FROM uretim_irsaliyeleri WHERE irsaliye_no = ?',
            [irsaliye_no]
        );
        
        if (existingIrsaliye.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Bu irsaliye numarası zaten kullanılıyor!' 
            });
        }
        
        // 1. İrsaliye Ana Kaydı Oluştur
        const [irsaliyeResult] = await connection.query(
            `INSERT INTO uretim_irsaliyeleri (irsaliye_no, tarih, irsaliye_tipi, aciklama) 
             VALUES (?, ?, ?, ?)`,
            [irsaliye_no, tarih, irsaliye_tipi, aciklama || null]
        );
        
        const irsaliye_id = irsaliyeResult.insertId;
        
        // 2. İrsaliye Kalemlerini Ekle ve Stok Hareketi Yap
        for (const kalem of kalemler) {
            const { urun_tipi, hammadde_id, radyator_id, miktar, birim_fiyat } = kalem;
            
            // İrsaliye kalemini ekle
            await connection.query(
                `INSERT INTO irsaliye_kalemleri 
                 (irsaliye_id, urun_tipi, hammadde_id, radyator_id, miktar, birim_fiyat) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    irsaliye_id, 
                    urun_tipi, 
                    urun_tipi === 'Hammadde' ? hammadde_id : null,
                    urun_tipi === 'Radyatör' ? radyator_id : null,
                    miktar, 
                    birim_fiyat || 0
                ]
            );
            
            // Stok Hareketi ve Stok Güncelleme
            if (irsaliye_tipi === 'ÇIKIŞ') {
                // ÇIKIŞ: Ham madde fabrikaya gidiyor
                if (urun_tipi === 'Hammadde') {
                    // Stok hareketi kaydet
                    await connection.query(
                        `INSERT INTO stok_hareketleri 
                         (tarih_saat, urun_tipi, hammadde_id, hareket_tipi, kaynak_tablo, kaynak_id, miktar, birim_fiyat) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [new Date(), 'Hammadde', hammadde_id, 'Çıkış', 'Üretim Çıkış', irsaliye_id, miktar, birim_fiyat || 0]
                    );
                    
                    // Depo stoğunu azalt, Fabrika stoğunu artır
                    await connection.query(
                        `UPDATE ham_maddeler 
                         SET depo_stok_miktari = depo_stok_miktari - ?, 
                             fabrika_stok_miktari = fabrika_stok_miktari + ?,
                             son_stok_guncelleme = NOW()
                         WHERE id = ?`,
                        [miktar, miktar, hammadde_id]
                    );
                    
                    // Stok kontrolü
                    const [stokKontrol] = await connection.query(
                        'SELECT depo_stok_miktari, adi FROM ham_maddeler WHERE id = ?',
                        [hammadde_id]
                    );
                    
                    if (stokKontrol[0].depo_stok_miktari < 0) {
                        await connection.rollback();
                        return res.status(400).json({ 
                            success: false, 
                            message: `${stokKontrol[0].adi} için yetersiz depo stoku!` 
                        });
                    }
                }
            } else if (irsaliye_tipi === 'GİRİŞ') {
                // GİRİŞ: Radyatör fabrikadan geliyor
                if (urun_tipi === 'Radyatör') {
                    // Stok hareketi kaydet
                    await connection.query(
                        `INSERT INTO stok_hareketleri 
                         (tarih_saat, urun_tipi, radyator_id, hareket_tipi, kaynak_tablo, kaynak_id, miktar, birim_fiyat) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [new Date(), 'Radyatör', radyator_id, 'Giriş', 'Üretim Giriş', irsaliye_id, miktar, birim_fiyat || 0]
                    );
                    
                    // Radyatör stoğunu artır
                    await connection.query(
                        `UPDATE radyotorler 
                         SET stok_miktari = stok_miktari + ?,
                             son_stok_guncelleme = NOW()
                         WHERE id = ?`,
                        [miktar, radyator_id]
                    );
                    
                    // Maliyet dosyasına göre kullanılan hammaddeleri fabrika stoğundan düş
                    await updateFabrikaStokAndKanit(connection, irsaliye_id, radyator_id, miktar);
                }
            }
        }
        
        await connection.commit();
        
        res.status(201).json({ 
            success: true, 
            message: 'İrsaliye başarıyla oluşturuldu!',
            irsaliye_id 
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('İrsaliye oluşturma hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'İrsaliye oluşturulamadı!',
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

/**
 * Fabrika stoğunu güncelle ve kalan hammadde kanıt tablosunu doldur
 */
async function updateFabrikaStokAndKanit(connection, giren_irsaliye_id, radyator_id, radyator_miktari) {
    // Maliyet dosyasından bu radyatör için kullanılan hammaddeleri al
    const [maliyetler] = await connection.query(
        `SELECT ham_maddeler_id, kullanilan_miktar_adet 
         FROM maliyet_dosyasi 
         WHERE radyatorler_id = ?`,
        [radyator_id]
    );
    
    for (const maliyet of maliyetler) {
        const toplam_kullanim = maliyet.kullanilan_miktar_adet * radyator_miktari;
        
        // Fabrika stoğunu azalt
        await connection.query(
            `UPDATE ham_maddeler 
             SET fabrika_stok_miktari = fabrika_stok_miktari - ?,
                 son_stok_guncelleme = NOW()
             WHERE id = ?`,
            [toplam_kullanim, maliyet.ham_maddeler_id]
        );
        
        // En son çıkış irsaliyesini bul (bu hammadde için)
        const [cikisIrsaliyesi] = await connection.query(
            `SELECT ui.id, ui.tarih, ik.miktar 
             FROM uretim_irsaliyeleri ui
             JOIN irsaliye_kalemleri ik ON ui.id = ik.irsaliye_id
             WHERE ui.irsaliye_tipi = 'ÇIKIŞ' 
             AND ik.urun_tipi = 'Hammadde'
             AND ik.hammadde_id = ?
             ORDER BY ui.tarih DESC
             LIMIT 1`,
            [maliyet.ham_maddeler_id]
        );
        
        if (cikisIrsaliyesi.length > 0) {
            const cikisan_irsaliye_id = cikisIrsaliyesi[0].id;
            const toplam_cikan_miktar = cikisIrsaliyesi[0].miktar;
            
            // Mevcut kalan hammadde kaydını kontrol et
            const [mevcutKanit] = await connection.query(
                `SELECT id, maliyet_dosyasi_tuketimi, fabrika_fire_kayip 
                 FROM kalan_hammadde_kanit 
                 WHERE cikisan_irsaliye_id = ? AND hammadde_id = ?`,
                [cikisan_irsaliye_id, maliyet.ham_maddeler_id]
            );
            
            if (mevcutKanit.length > 0) {
                // Güncelle
                const yeni_tuketim = mevcutKanit[0].maliyet_dosyasi_tuketimi + toplam_kullanim;
                const yeni_fire = toplam_cikan_miktar - yeni_tuketim;
                
                await connection.query(
                    `UPDATE kalan_hammadde_kanit 
                     SET giren_irsaliye_id = ?,
                         maliyet_dosyasi_tuketimi = ?,
                         fabrika_fire_kayip = ?
                     WHERE id = ?`,
                    [giren_irsaliye_id, yeni_tuketim, yeni_fire, mevcutKanit[0].id]
                );
            } else {
                // Yeni kayıt oluştur
                const fabrika_fire_kayip = toplam_cikan_miktar - toplam_kullanim;
                
                await connection.query(
                    `INSERT INTO kalan_hammadde_kanit 
                     (cikisan_irsaliye_id, giren_irsaliye_id, hammadde_id, toplam_cikan_miktar, maliyet_dosyasi_tuketimi, fabrika_fire_kayip) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cikisan_irsaliye_id, giren_irsaliye_id, maliyet.ham_maddeler_id, toplam_cikan_miktar, toplam_kullanim, fabrika_fire_kayip]
                );
            }
        }
    }
}

/**
 * Tüm İrsaliyeleri Listele
 */
exports.getIrsaliyeler = async (req, res) => {
    try {
        const [irsaliyeler] = await pool.query(
            `SELECT 
                ui.id,
                ui.irsaliye_no,
                ui.tarih,
                ui.irsaliye_tipi,
                ui.aciklama,
                COUNT(ik.id) as kalem_sayisi
             FROM uretim_irsaliyeleri ui
             LEFT JOIN irsaliye_kalemleri ik ON ui.id = ik.irsaliye_id
             GROUP BY ui.id
             ORDER BY ui.tarih DESC`
        );
        
        res.status(200).json({ 
            success: true, 
            data: irsaliyeler 
        });
        
    } catch (error) {
        console.error('İrsaliye listeleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'İrsaliyeler listelenemedi!',
            error: error.message 
        });
    }
};

/**
 * Belirli Bir İrsaliyenin Detaylarını Getir
 */
exports.getIrsaliyeDetay = async (req, res) => {
    try {
        const { id } = req.params;
        
        // İrsaliye ana bilgisi
        const [irsaliye] = await pool.query(
            'SELECT * FROM uretim_irsaliyeleri WHERE id = ?',
            [id]
        );
        
        if (irsaliye.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'İrsaliye bulunamadı!' 
            });
        }
        
        // İrsaliye kalemleri
        const [kalemler] = await pool.query(
            `SELECT 
                ik.*,
                CASE 
                    WHEN ik.urun_tipi = 'Hammadde' THEN hm.adi
                    WHEN ik.urun_tipi = 'Radyatör' THEN r.adi
                END as urun_adi,
                CASE 
                    WHEN ik.urun_tipi = 'Hammadde' THEN hm.birim
                    WHEN ik.urun_tipi = 'Radyatör' THEN 'ADET'
                END as birim,
                (ik.miktar * ik.birim_fiyat) as toplam,
                -- Radyatör için maliyet dosyasından toplam maliyet hesapla
                CASE 
                    WHEN ik.urun_tipi = 'Radyatör' THEN (
                        SELECT COALESCE(SUM(md.maliyet), 0) * ik.miktar
                        FROM maliyet_dosyasi md
                        WHERE md.radyatorler_id = ik.radyator_id
                    )
                    ELSE 0
                END as toplam_maliyet
             FROM irsaliye_kalemleri ik
             LEFT JOIN ham_maddeler hm ON ik.hammadde_id = hm.id
             LEFT JOIN radyotorler r ON ik.radyator_id = r.id
             WHERE ik.irsaliye_id = ?`,
            [id]
        );
        
        res.status(200).json({ 
            success: true, 
            data: {
                ...irsaliye[0],
                kalemler
            }
        });
        
    } catch (error) {
        console.error('İrsaliye detay hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'İrsaliye detayları alınamadı!',
            error: error.message 
        });
    }
};

/**
 * Kalan Hammadde Durumu
 * Fabrikaya gönderilen, kullanılan ve kalan hammadde miktarlarını hesaplar
 */
exports.getKalanHammaddeler = async (req, res) => {
    try {
        const [kalanlar] = await pool.query(
            `SELECT 
                hm.id as hammadde_id,
                hm.adi as hammadde_adi,
                hm.birim,
                
                -- Fabrikaya gönderilen toplam miktar (ÇIKIŞ irsaliyeleri)
                COALESCE((
                    SELECT SUM(ik.miktar)
                    FROM irsaliye_kalemleri ik
                    INNER JOIN uretim_irsaliyeleri ui ON ik.irsaliye_id = ui.id
                    WHERE ik.hammadde_id = hm.id
                    AND ui.irsaliye_tipi = 'ÇIKIŞ'
                    AND ik.urun_tipi = 'Hammadde'
                ), 0) as gonderilen,
                
                -- Maliyet dosyasına göre teorik kullanım
                COALESCE((
                    SELECT SUM(md.kullanilan_miktar_adet * ik.miktar)
                    FROM irsaliye_kalemleri ik
                    INNER JOIN uretim_irsaliyeleri ui ON ik.irsaliye_id = ui.id
                    INNER JOIN maliyet_dosyasi md ON md.radyatorler_id = ik.radyator_id 
                        AND md.ham_maddeler_id = hm.id
                    WHERE ui.irsaliye_tipi = 'GİRİŞ'
                    AND ik.urun_tipi = 'Radyatör'
                ), 0) as kullanilan,
                
                -- Kalan = Gönderilen - Kullanılan
                COALESCE((
                    SELECT SUM(ik.miktar)
                    FROM irsaliye_kalemleri ik
                    INNER JOIN uretim_irsaliyeleri ui ON ik.irsaliye_id = ui.id
                    WHERE ik.hammadde_id = hm.id
                    AND ui.irsaliye_tipi = 'ÇIKIŞ'
                    AND ik.urun_tipi = 'Hammadde'
                ), 0) - COALESCE((
                    SELECT SUM(md.kullanilan_miktar_adet * ik.miktar)
                    FROM irsaliye_kalemleri ik
                    INNER JOIN uretim_irsaliyeleri ui ON ik.irsaliye_id = ui.id
                    INNER JOIN maliyet_dosyasi md ON md.radyatorler_id = ik.radyator_id 
                        AND md.ham_maddeler_id = hm.id
                    WHERE ui.irsaliye_tipi = 'GİRİŞ'
                    AND ik.urun_tipi = 'Radyatör'
                ), 0) as kalan
                
             FROM ham_maddeler hm
             HAVING gonderilen > 0
             ORDER BY hm.adi`
        );
        
        res.status(200).json({ 
            success: true, 
            data: kalanlar 
        });
        
    } catch (error) {
        console.error('Kalan hammadde hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Kalan hammaddeler alınamadı!',
            error: error.message 
        });
    }
};

/**
 * Maliyet Özeti
 */
exports.getMaliyetOzeti = async (req, res) => {
    try {
        const [ozet] = await pool.query(
            `SELECT 
                r.id as radyator_id,
                r.adi as radyator_adi,
                r.stok_miktari,
                COUNT(DISTINCT md.ham_maddeler_id) as kullanilan_hammadde_sayisi,
                SUM(md.maliyet) as toplam_maliyet,
                SUM(md.maliyet) / NULLIF(COUNT(DISTINCT md.id), 0) as ortalama_birim_maliyet
             FROM radyotorler r
             LEFT JOIN maliyet_dosyasi md ON r.id = md.radyatorler_id
             GROUP BY r.id
             HAVING kullanilan_hammadde_sayisi > 0
             ORDER BY r.adi`
        );
        
        res.status(200).json({ 
            success: true, 
            data: ozet 
        });
        
    } catch (error) {
        console.error('Maliyet özeti hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Maliyet özeti alınamadı!',
            error: error.message 
        });
    }
};

/**
 * İrsaliye Silme
 */
exports.deleteIrsaliye = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // İrsaliye kontrolü
        const [irsaliye] = await connection.query(
            'SELECT * FROM uretim_irsaliyeleri WHERE id = ?',
            [id]
        );
        
        if (irsaliye.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'İrsaliye bulunamadı!' 
            });
        }
        
        // İrsaliye kalemlerini al
        const [kalemler] = await connection.query(
            'SELECT * FROM irsaliye_kalemleri WHERE irsaliye_id = ?',
            [id]
        );
        
        // Stokları geri al
        for (const kalem of kalemler) {
            if (irsaliye[0].irsaliye_tipi === 'ÇIKIŞ' && kalem.urun_tipi === 'Hammadde') {
                // Depo stoğunu artır, Fabrika stoğunu azalt
                await connection.query(
                    `UPDATE ham_maddeler 
                     SET depo_stok_miktari = depo_stok_miktari + ?, 
                         fabrika_stok_miktari = fabrika_stok_miktari - ?,
                         son_stok_guncelleme = NOW()
                     WHERE id = ?`,
                    [kalem.miktar, kalem.miktar, kalem.hammadde_id]
                );
            } else if (irsaliye[0].irsaliye_tipi === 'GİRİŞ' && kalem.urun_tipi === 'Radyatör') {
                // Radyatör stoğunu azalt
                await connection.query(
                    `UPDATE radyotorler 
                     SET stok_miktari = stok_miktari - ?,
                         son_stok_guncelleme = NOW()
                     WHERE id = ?`,
                    [kalem.miktar, kalem.radyator_id]
                );
            }
        }
        
        // İrsaliyeyi sil (CASCADE ile kalemler de silinir)
        await connection.query(
            'DELETE FROM uretim_irsaliyeleri WHERE id = ?',
            [id]
        );
        
        // Stok hareketlerini sil
        await connection.query(
            'DELETE FROM stok_hareketleri WHERE kaynak_id = ? AND (kaynak_tablo = ? OR kaynak_tablo = ?)',
            [id, 'Üretim Çıkış', 'Üretim Giriş']
        );
        
        await connection.commit();
        
        res.status(200).json({ 
            success: true, 
            message: 'İrsaliye başarıyla silindi!' 
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('İrsaliye silme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'İrsaliye silinemedi!',
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

/**
 * Ham Madde Listesi
 */
exports.getHammaddeler = async (req, res) => {
    try {
        // Query parametresinden filtre kontrolü
        const { stokDurumu } = req.query;
        
        let query = 'SELECT id, adi, birim, depo_stok_miktari, liste_fiyati FROM ham_maddeler';
        let whereConditions = [];
        
        // Eğer sadece stokta olanlar isteniyorsa filtre ekle
        if (stokDurumu === 'depo') {
            whereConditions.push('depo_stok_miktari > 0');
            whereConditions.push("kaynak_tipi = 'Kendi Stok'");
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY adi';
        
        const [hammaddeler] = await pool.query(query);
        
        res.status(200).json({ 
            success: true, 
            data: hammaddeler 
        });
        
    } catch (error) {
        console.error('Ham madde listeleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ham maddeler listelenemedi!',
            error: error.message 
        });
    }
};

/**
 * Radyatör Listesi
 */
exports.getRadyatorler = async (req, res) => {
    try {
        const [radyatorler] = await pool.query(
            'SELECT id, adi, olcu, dilim_sayisi, birim_fiyat FROM radyotorler ORDER BY adi'
        );
        
        res.status(200).json({ 
            success: true, 
            data: radyatorler 
        });
        
    } catch (error) {
        console.error('Radyatör listeleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Radyatörler listelenemedi!',
            error: error.message 
        });
    }
};

/**
 * Otomatik İrsaliye Numarası Oluştur
 * Format: IR-YYYY-NNNN (IR-2025-0001)
 */
exports.getNextIrsaliyeNo = async (req, res) => {
    try {
        // Mevcut yıl
        const currentYear = new Date().getFullYear();
        
        // Bu yıla ait son irsaliye numarasını bul
        const [lastIrsaliye] = await pool.query(
            `SELECT irsaliye_no 
             FROM uretim_irsaliyeleri 
             WHERE irsaliye_no LIKE ? 
             ORDER BY id DESC 
             LIMIT 1`,
            [`IR-${currentYear}-%`]
        );
        
        let nextNumber = 1;
        
        if (lastIrsaliye.length > 0) {
            // Son irsaliye numarasından sıra numarasını çıkar
            const lastNo = lastIrsaliye[0].irsaliye_no;
            const match = lastNo.match(/IR-\d{4}-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        
        // Yeni irsaliye numarasını oluştur (4 haneli, sıfır ile doldur)
        const newIrsaliyeNo = `IR-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
        
        res.status(200).json({ 
            success: true, 
            irsaliye_no: newIrsaliyeNo 
        });
        
    } catch (error) {
        console.error('İrsaliye numarası oluşturma hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'İrsaliye numarası oluşturulamadı!',
            error: error.message 
        });
    }
};

/**
 * Radyatör Maliyet Dosyası Detayı
 * Belirli bir radyatör için tüm maliyet dosyası kayıtlarını getirir
 */
exports.getRadyatorMaliyetDosyasi = async (req, res) => {
    try {
        const { radyator_id } = req.params;
        
        // Radyatör bilgisi
        const [radyator] = await pool.query(
            'SELECT id, adi, olcu, dilim_sayisi, birim_fiyat FROM radyotorler WHERE id = ?',
            [radyator_id]
        );
        
        if (radyator.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Radyatör bulunamadı!' 
            });
        }
        
        // Maliyet dosyası kayıtları
        const [maliyetDosyasi] = await pool.query(
            `SELECT 
                md.id,
                md.radyatorler_id,
                md.ham_maddeler_id,
                hm.adi as hammadde_adi,
                hm.birim as hammadde_birim,
                md.kullanilan_miktar_adet,
                md.maliyet,
                md.tarih
             FROM maliyet_dosyasi md
             INNER JOIN ham_maddeler hm ON md.ham_maddeler_id = hm.id
             WHERE md.radyatorler_id = ?
             ORDER BY hm.adi, md.tarih DESC`,
            [radyator_id]
        );
        
        // Toplam maliyet hesapla
        const toplamMaliyet = maliyetDosyasi.reduce((sum, item) => sum + parseFloat(item.maliyet), 0);
        
        res.status(200).json({ 
            success: true, 
            data: {
                radyator: radyator[0],
                maliyet_kalemleri: maliyetDosyasi,
                toplam_maliyet: toplamMaliyet
            }
        });
        
    } catch (error) {
        console.error('Maliyet dosyası detay hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Maliyet dosyası detayları alınamadı!',
            error: error.message 
        });
    }
};
