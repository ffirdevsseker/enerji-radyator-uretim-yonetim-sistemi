const db = require('../config/database');

// Radyötörleri getir
exports.getRadyatorler = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, adi as radyator_adi FROM radyotorler ORDER BY adi');
        res.json(rows);
    } catch (error) {
        console.error('Radyötörler getirilirken hata:', error);
        res.status(500).json({ error: 'Radyötörler getirilemedi' });
    }
};

// Yeni radyötör ekle
exports.createRadyator = async (req, res) => {
    try {
        const { radyator_adi } = req.body;
        
        if (!radyator_adi) {
            return res.status(400).json({ error: 'Radyötör adı gerekli' });
        }

        const [result] = await db.query(
            'INSERT INTO radyotorler (adi) VALUES (?)',
            [radyator_adi]
        );

        res.status(201).json({
            id: result.insertId,
            radyator_adi,
            message: 'Radyötör başarıyla eklendi'
        });
    } catch (error) {
        console.error('Radyötör eklenirken hata:', error);
        res.status(500).json({ error: 'Radyötör eklenemedi' });
    }
};

// Hammaddeleri getir
exports.getHammaddeler = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, id as stok_kodu, adi as stok_adi, birim, liste_fiyati FROM ham_maddeler ORDER BY adi'
        );
        res.json(rows);
    } catch (error) {
        console.error('Hammaddeler getirilirken hata:', error);
        res.status(500).json({ error: 'Hammaddeler getirilemedi' });
    }
};

// Belirli bir radyötörün maliyet verilerini getir
exports.getMaliyetler = async (req, res) => {
    try {
        const radyatorId = req.params.id;

        const [rows] = await db.query(
            `SELECT * FROM maliyet_dosyalari 
             WHERE radyator_id = ? 
             ORDER BY sira`,
            [radyatorId]
        );

        res.json(rows);
    } catch (error) {
        console.error('Maliyet verileri getirilirken hata:', error);
        res.status(500).json({ error: 'Maliyet verileri getirilemedi' });
    }
};

// Radyötör için maliyet verilerini kaydet/güncelle
exports.saveMaliyetler = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const radyatorId = req.params.id;
        const maliyetSatirlari = req.body;

        await connection.beginTransaction();

        // Önce mevcut kayıtları sil
        await connection.query(
            'DELETE FROM maliyet_dosyalari WHERE radyator_id = ?',
            [radyatorId]
        );

        // Yeni kayıtları ekle
        if (maliyetSatirlari && maliyetSatirlari.length > 0) {
            for (let i = 0; i < maliyetSatirlari.length; i++) {
                const satir = maliyetSatirlari[i];
                
                // Boş satırları atlayın
                if (!satir.stok_kodu && !satir.stok_adi) {
                    continue;
                }

                await connection.query(
                    `INSERT INTO maliyet_dosyalari 
                     (radyator_id, sira, stok_kodu, stok_adi, birim, miktar, fiyat) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        radyatorId,
                        i + 1,
                        satir.stok_kodu || null,
                        satir.stok_adi || null,
                        satir.birim || null,
                        satir.miktar || 0,
                        satir.fiyat || 0
                    ]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Maliyet verileri başarıyla kaydedildi' });
    } catch (error) {
        await connection.rollback();
        console.error('Maliyet verileri kaydedilirken hata:', error);
        res.status(500).json({ error: 'Maliyet verileri kaydedilemedi' });
    } finally {
        connection.release();
    }
};

// Maliyet dosyasını sil
exports.deleteMaliyetDosyasi = async (req, res) => {
    try {
        const radyatorId = req.params.id;

        await db.query(
            'DELETE FROM maliyet_dosyalari WHERE radyator_id = ?',
            [radyatorId]
        );

        res.json({ message: 'Maliyet dosyası başarıyla silindi' });
    } catch (error) {
        console.error('Maliyet dosyası silinirken hata:', error);
        res.status(500).json({ error: 'Maliyet dosyası silinemedi' });
    }
};

// Yeni hammadde ekle (maliyet_dosyasi tablosuna)
exports.addHammadde = async (req, res) => {
    try {
        const radyatorId = req.params.radyatorId;
        const { ham_maddeler_id, kullanilan_miktar_adet } = req.body;

        // Validation
        if (!ham_maddeler_id || !kullanilan_miktar_adet) {
            return res.status(400).json({ error: 'Hammadde ve miktar bilgisi gerekli' });
        }

        // Hammadde bilgilerini çek (liste_fiyati için)
        const [hammadde] = await db.query(
            'SELECT id, adi, birim, liste_fiyati FROM ham_maddeler WHERE id = ?',
            [ham_maddeler_id]
        );

        if (!hammadde || hammadde.length === 0) {
            return res.status(404).json({ error: 'Hammadde bulunamadı' });
        }

        const hammaddeData = hammadde[0];
        const listeFiyati = hammaddeData.liste_fiyati || 0;
        const miktar = parseFloat(kullanilan_miktar_adet);
        const maliyet = listeFiyati * miktar;

        // maliyet_dosyasi tablosuna ekle
        const [result] = await db.query(
            `INSERT INTO maliyet_dosyasi 
             (radyatorler_id, ham_maddeler_id, kullanilan_miktar_adet, maliyet, tarih) 
             VALUES (?, ?, ?, ?, NOW())`,
            [radyatorId, ham_maddeler_id, miktar, maliyet]
        );

        res.status(201).json({
            id: result.insertId,
            radyatorler_id: radyatorId,
            ham_maddeler_id: ham_maddeler_id,
            kullanilan_miktar_adet: miktar,
            maliyet: maliyet,
            message: 'Hammadde başarıyla eklendi'
        });
    } catch (error) {
        console.error('Hammadde eklenirken hata:', error);
        res.status(500).json({ error: 'Hammadde eklenemedi' });
    }
};

// Maliyet_dosyasi tablosundan verileri getir (radyatör bazında)
exports.getMaliyetlerFromDosyasi = async (req, res) => {
    try {
        const radyatorId = req.params.radyatorId;

        const [rows] = await db.query(
            `SELECT 
                md.id,
                md.radyatorler_id,
                md.ham_maddeler_id,
                md.kullanilan_miktar_adet,
                md.maliyet,
                md.tarih,
                hm.adi as stok_adi,
                hm.birim,
                hm.liste_fiyati
             FROM maliyet_dosyasi md
             LEFT JOIN ham_maddeler hm ON md.ham_maddeler_id = hm.id
             WHERE md.radyatorler_id = ?
             ORDER BY md.tarih DESC, md.id DESC`,
            [radyatorId]
        );

        res.json(rows);
    } catch (error) {
        console.error('Maliyet verileri getirilirken hata:', error);
        res.status(500).json({ error: 'Maliyet verileri getirilemedi' });
    }
};

// Maliyet satırını güncelle
exports.updateMaliyetSatiri = async (req, res) => {
    try {
        const { id } = req.params;
        const { kullanilan_miktar_adet } = req.body;

        if (!kullanilan_miktar_adet) {
            return res.status(400).json({ error: 'Miktar bilgisi gerekli' });
        }

        // Önce mevcut kaydı al
        const [rows] = await db.query(
            `SELECT md.*, hm.liste_fiyati 
             FROM maliyet_dosyasi md
             LEFT JOIN ham_maddeler hm ON md.ham_maddeler_id = hm.id
             WHERE md.id = ?`,
            [id]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        const currentRecord = rows[0];
        const listeFiyati = currentRecord.liste_fiyati || 0;
        const miktar = parseFloat(kullanilan_miktar_adet);
        const maliyet = listeFiyati * miktar;

        // Güncelle
        await db.query(
            `UPDATE maliyet_dosyasi 
             SET kullanilan_miktar_adet = ?, maliyet = ?
             WHERE id = ?`,
            [miktar, maliyet, id]
        );

        res.json({
            id: id,
            kullanilan_miktar_adet: miktar,
            maliyet: maliyet,
            message: 'Güncelleme başarılı'
        });
    } catch (error) {
        console.error('Güncelleme hatası:', error);
        res.status(500).json({ error: 'Güncelleme başarısız' });
    }
};

// Maliyet satırını sil
exports.deleteMaliyetSatiri = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM maliyet_dosyasi WHERE id = ?', [id]);

        res.json({ message: 'Satır başarıyla silindi' });
    } catch (error) {
        console.error('Silme hatası:', error);
        res.status(500).json({ error: 'Silme başarısız' });
    }
};
