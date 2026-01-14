const db = require('../config/database');

const safeQuery = async (sql, params = []) => {
    try {
        const [rows] = await db.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Kayitlar query error:', error.message);
        return [];
    }
};

// Silent query for optional tables (like featured_content)
const silentQuery = async (sql, params = []) => {
    try {
        const [rows] = await db.execute(sql, params);
        return rows;
    } catch (error) {
        // Silently fail for optional tables
        return [];
    }
};

const kayitlarController = {
    // Get kayitlar page data (dashboard style)
    getKayitlarData: async (req, res) => {
        try {
            // Use silentQuery for optional featured_content table
            let featuredContent = await silentQuery('SELECT * FROM featured_content WHERE active = 1 ORDER BY display_order LIMIT 5');

            const statistics = {
                customers: (await safeQuery('SELECT COUNT(*) AS c FROM musteriler'))[0]?.c || 0,
                suppliers: (await safeQuery('SELECT COUNT(*) AS c FROM tedarikciler'))[0]?.c || 0,
                products: (await safeQuery('SELECT COUNT(*) AS c FROM radyotorler'))[0]?.c || 0,
                materials: (await safeQuery("SELECT COUNT(*) AS c FROM ham_maddeler WHERE kaynak_tipi = 'Kendi Stok'"))[0]?.c || 0
            };

            const lowStockProducts = await safeQuery(`
                SELECT id, adi, stok_miktari, kategori, son_stok_guncelleme
                FROM radyotorler
                ORDER BY stok_miktari ASC
                LIMIT 6
            `);

            const lowStockMaterials = await safeQuery(`
                SELECT id, adi, depo_stok_miktari, fabrika_stok_miktari, minimum_stok, birim, son_stok_guncelleme
                FROM ham_maddeler
                WHERE kaynak_tipi = 'Kendi Stok'
                ORDER BY (depo_stok_miktari + fabrika_stok_miktari - minimum_stok) ASC
                LIMIT 6
            `);

            res.json({
                success: true,
                data: {
                    featuredContent,
                    statistics,
                    lowStock: {
                        products: lowStockProducts,
                        materials: lowStockMaterials
                    }
                },
                message: 'Kayitlar data fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching kayitlar data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching kayitlar data'
            });
        }
    },

    // Handle contact form submission from kayitlar page
    handleContactForm: async (req, res) => {
        try {
            const { name, email, message } = req.body;

            if (!name || !email || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            const query = `INSERT INTO contact_messages (name, email, message, created_at) VALUES (?, ?, ?, NOW())
                           ON DUPLICATE KEY UPDATE id=id`;
            await db.execute(query, [name, email, message]);

            res.json({
                success: true,
                message: 'Message sent successfully'
            });
        } catch (error) {
            console.error('Error handling contact form:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending message'
            });
        }
    },

    // Records list built from operational tables
    getRecords: async (req, res) => {
        try {
            const rows = await safeQuery(`
                SELECT * FROM (
                    SELECT 'customer' AS type, m.id AS record_id, m.adi AS name,
                           CONCAT('Tip: ', COALESCE(m.musteri_tipi, '—')) AS subtitle,
                           CONCAT('Vergi/T.C.: ', COALESCE(m.vergi_no_tc, '—'), ' | Telefon: ', COALESCE(m.telefon, '—')) AS meta,
                           NULL AS stock_value,
                           CONCAT_WS('|', 'Müşteri', COALESCE(m.musteri_tipi, '')) AS tags,
                           NULL AS last_updated,
                           'musteriler' AS source_table
                    FROM musteriler m
                    UNION ALL
                    SELECT 'supplier' AS type, t.id AS record_id, t.adi AS name,
                           CONCAT('Yetkili: ', COALESCE(t.yetkili_kisi, '—')) AS subtitle,
                           CONCAT('Telefon: ', COALESCE(t.telefon, '—')) AS meta,
                           NULL AS stock_value,
                           'Tedarikçi' AS tags,
                           NULL AS last_updated,
                           'tedarikciler' AS source_table
                    FROM tedarikciler t
                    UNION ALL
                    SELECT 'product' AS type, r.id AS record_id, r.adi AS name,
                           CONCAT('Kategori: ', COALESCE(r.kategori, '—')) AS subtitle,
                           CONCAT('Ölçü: ', COALESCE(r.olcu, '—'), ' | Dilim: ', COALESCE(r.dilim_sayisi, '-')) AS meta,
                           r.stok_miktari AS stock_value,
                           'Radyatör' AS tags,
                           DATE_FORMAT(r.son_stok_guncelleme, '%Y-%m-%d %H:%i') AS last_updated,
                           'radyotorler' AS source_table
                    FROM radyotorler r
                    UNION ALL
                    SELECT 'material' AS type, h.id AS record_id, h.adi AS name,
                           CONCAT('Birim: ', COALESCE(h.birim, '—')) AS subtitle,
                           CONCAT('Depo: ', COALESCE(h.depo_stok_miktari, 0), ' | Fabrika: ', COALESCE(h.fabrika_stok_miktari, 0)) AS meta,
                           (COALESCE(h.depo_stok_miktari, 0) + COALESCE(h.fabrika_stok_miktari, 0)) AS stock_value,
                           CONCAT_WS('|', 'Hammadde', COALESCE(h.kaynak_tipi, '')) AS tags,
                           DATE_FORMAT(h.son_stok_guncelleme, '%Y-%m-%d %H:%i') AS last_updated,
                           'ham_maddeler' AS source_table
                    FROM ham_maddeler h
                    WHERE h.kaynak_tipi = 'Kendi Stok'
                ) AS combined
                ORDER BY type, name
                LIMIT 600
            `);

            const normalized = rows.map(row => ({
                id: row.record_id,
                type: row.type,
                name: row.name,
                subtitle: row.subtitle,
                meta: row.meta,
                stock: row.stock_value !== null ? Number(row.stock_value) : null,
                tags: row.tags ? row.tags.split('|').filter(Boolean) : [],
                lastUpdated: row.last_updated,
                sourceTable: row.source_table
            }));

            res.json({ success: true, data: normalized });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'DB error' });
        }
    },

    // Detailed drilldown for drawer
    getRecordDetails: async (req, res) => {
        const { type, id } = req.params;
        try {
            if (!['customer', 'supplier', 'product', 'material'].includes(type)) {
                return res.status(400).json({ success: false, message: 'Unsupported type' });
            }

            let header = null;
            let history = [];
            let aggregates = {};

            if (type === 'customer') {
                const rows = await safeQuery('SELECT * FROM musteriler WHERE id = ?', [id]);
                if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' });
                header = rows[0];
                history = await safeQuery(`
                    SELECT fk.id, fk.fatura_no, fk.fatura_tarihi, fk.satilan_miktar, fk.satilan_birim_fiyat,
                           r.adi AS radyator_adi
                    FROM fatura_kalemleri fk
                    LEFT JOIN radyotorler r ON fk.radyator_id = r.id
                    WHERE fk.musteri_id = ?
                    ORDER BY fk.fatura_tarihi DESC
                    LIMIT 12
                `, [id]);

                const agg = await safeQuery(`
                    SELECT SUM(fk.satilan_miktar) AS total_qty,
                           SUM(fk.satilan_miktar * fk.satilan_birim_fiyat) AS total_amount
                    FROM fatura_kalemleri fk
                    WHERE fk.musteri_id = ?
                `, [id]);
                aggregates = agg[0] || {};
            }

            if (type === 'supplier') {
                const rows = await safeQuery('SELECT * FROM tedarikciler WHERE id = ?', [id]);
                if (!rows.length) return res.status(404).json({ success: false, message: 'Supplier not found' });
                header = rows[0];
                history = await safeQuery(`
                    SELECT sah.id, sah.alim_tarihi, sah.miktar, sah.alim_fiyat, sah.fatura_no,
                           hm.adi AS hammadde_adi
                    FROM satinalma_hareketleri sah
                    LEFT JOIN ham_maddeler hm ON sah.hammadde_id = hm.id
                    WHERE sah.tedarikci_id = ?
                    ORDER BY sah.alim_tarihi DESC
                    LIMIT 12
                `, [id]);

                const agg = await safeQuery(`
                    SELECT SUM(sah.miktar) AS total_qty,
                           SUM(sah.miktar * sah.alim_fiyat) AS total_amount
                    FROM satinalma_hareketleri sah
                    WHERE sah.tedarikci_id = ?
                `, [id]);
                aggregates = agg[0] || {};
            }

            if (type === 'product') {
                const rows = await safeQuery('SELECT * FROM radyotorler WHERE id = ?', [id]);
                if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
                header = rows[0];
                history = await safeQuery(`
                    SELECT sh.id, sh.tarih_saat, sh.hareket_tipi, sh.kaynak_tablo, sh.miktar, sh.birim_fiyat
                    FROM stok_hareketleri sh
                    WHERE sh.urun_tipi = 'Radyatör' AND sh.radyator_id = ?
                    ORDER BY sh.tarih_saat DESC
                    LIMIT 15
                `, [id]);

                const agg = await safeQuery(`
                    SELECT
                        SUM(CASE WHEN sh.hareket_tipi = 'Giriş' THEN sh.miktar ELSE 0 END) AS total_in,
                        SUM(CASE WHEN sh.hareket_tipi = 'Çıkış' THEN sh.miktar ELSE 0 END) AS total_out
                    FROM stok_hareketleri sh
                    WHERE sh.urun_tipi = 'Radyatör' AND sh.radyator_id = ?
                `, [id]);
                aggregates = agg[0] || {};
            }

            if (type === 'material') {
                const rows = await safeQuery('SELECT * FROM ham_maddeler WHERE id = ?', [id]);
                if (!rows.length) return res.status(404).json({ success: false, message: 'Material not found' });
                header = rows[0];
                history = await safeQuery(`
                    SELECT sh.id, sh.tarih_saat, sh.hareket_tipi, sh.kaynak_tablo, sh.miktar, sh.birim_fiyat
                    FROM stok_hareketleri sh
                    WHERE sh.urun_tipi = 'Hammadde' AND sh.hammadde_id = ?
                    ORDER BY sh.tarih_saat DESC
                    LIMIT 15
                `, [id]);

                const agg = await safeQuery(`
                    SELECT
                        SUM(CASE WHEN sh.hareket_tipi = 'Giriş' THEN sh.miktar ELSE 0 END) AS total_in,
                        SUM(CASE WHEN sh.hareket_tipi = 'Çıkış' THEN sh.miktar ELSE 0 END) AS total_out
                    FROM stok_hareketleri sh
                    WHERE sh.urun_tipi = 'Hammadde' AND sh.hammadde_id = ?
                `, [id]);
                aggregates = agg[0] || {};
            }

            res.json({ success: true, data: { header, history, aggregates } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'DB error' });
        }
    },

    // Legacy mutation endpoints are disabled to keep ERP data authoritative
    createRecord: async (_req, res) => {
        res.status(501).json({
            success: false,
            message: 'Kayıt ekleme işlemi üretim veritabanında ilgili modüllerden yapılır. Bu sayfa yalnızca raporlamaya yöneliktir.'
        });
    },

    updateRecord: async (req, res) => {
        try {
            const { id } = req.params;
            const { type } = req.query;
            const data = req.body;

            if (!id || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Kayıt ID ve tip gerekli'
                });
            }

            let tableName = '';
            let updateFields = [];
            let updateValues = [];

            switch (type) {
                case 'customer':
                    tableName = 'musteriler';
                    if (data.adi) { updateFields.push('adi = ?'); updateValues.push(data.adi); }
                    if (data.musteri_tipi) { updateFields.push('musteri_tipi = ?'); updateValues.push(data.musteri_tipi); }
                    if (data.vergi_no_tc !== undefined) { updateFields.push('vergi_no_tc = ?'); updateValues.push(data.vergi_no_tc || null); }
                    if (data.telefon !== undefined) { updateFields.push('telefon = ?'); updateValues.push(data.telefon || null); }
                    if (data.adres !== undefined) { updateFields.push('adres = ?'); updateValues.push(data.adres || null); }
                    break;

                case 'supplier':
                    tableName = 'tedarikciler';
                    if (data.adi) { updateFields.push('adi = ?'); updateValues.push(data.adi); }
                    if (data.yetkili_kisi !== undefined) { updateFields.push('yetkili_kisi = ?'); updateValues.push(data.yetkili_kisi || null); }
                    if (data.telefon !== undefined) { updateFields.push('telefon = ?'); updateValues.push(data.telefon || null); }
                    if (data.adres !== undefined) { updateFields.push('adres = ?'); updateValues.push(data.adres || null); }
                    break;

                case 'product':
                    tableName = 'radyotorler';
                    if (data.adi) { updateFields.push('adi = ?'); updateValues.push(data.adi); }
                    if (data.olcu !== undefined) { updateFields.push('olcu = ?'); updateValues.push(data.olcu || null); }
                    if (data.dilim_sayisi !== undefined) { updateFields.push('dilim_sayisi = ?'); updateValues.push(data.dilim_sayisi || null); }
                    if (data.stok_miktari !== undefined) { updateFields.push('stok_miktari = ?'); updateValues.push(data.stok_miktari || 0); }
                    if (data.birim_fiyat !== undefined) { updateFields.push('birim_fiyat = ?'); updateValues.push(data.birim_fiyat || null); }
                    // Update last stock update time if stock changed
                    if (data.stok_miktari !== undefined) { updateFields.push('son_stok_guncelleme = NOW()'); }
                    break;

                case 'material':
                    tableName = 'ham_maddeler';
                    if (data.adi) { updateFields.push('adi = ?'); updateValues.push(data.adi); }
                    if (data.birim !== undefined) { updateFields.push('birim = ?'); updateValues.push(data.birim || null); }
                    if (data.liste_fiyati !== undefined) { updateFields.push('liste_fiyati = ?'); updateValues.push(data.liste_fiyati || null); }
                    if (data.depo_stok_miktari !== undefined) { updateFields.push('depo_stok_miktari = ?'); updateValues.push(data.depo_stok_miktari || 0); }
                    if (data.fabrika_stok_miktari !== undefined) { updateFields.push('fabrika_stok_miktari = ?'); updateValues.push(data.fabrika_stok_miktari || 0); }
                    // Update last stock update time if stock changed
                    if (data.depo_stok_miktari !== undefined || data.fabrika_stok_miktari !== undefined) { 
                        updateFields.push('son_stok_guncelleme = NOW()'); 
                    }
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Geçersiz kayıt tipi'
                    });
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Güncellenecek alan bulunamadı'
                });
            }

            // Add ID to values array
            updateValues.push(id);

            const sql = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
            console.log('Update SQL:', sql, 'Values:', updateValues);

            const [result] = await db.execute(sql, updateValues);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kayıt bulunamadı'
                });
            }

            res.json({
                success: true,
                message: 'Kayıt başarıyla güncellendi',
                affectedRows: result.affectedRows
            });

        } catch (error) {
            console.error('Update record error:', error);
            res.status(500).json({
                success: false,
                message: 'Kayıt güncellenirken hata oluştu: ' + error.message
            });
        }
    },

    deleteRecord: async (req, res) => {
        try {
            const { id } = req.params;
            const { type } = req.query;

            if (!id || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Kayıt ID ve tip gerekli'
                });
            }

            let tableName = '';

            switch (type) {
                case 'customer':
                    tableName = 'musteriler';
                    break;
                case 'supplier':
                    tableName = 'tedarikciler';
                    break;
                case 'product':
                    tableName = 'radyotorler';
                    break;
                case 'material':
                    tableName = 'ham_maddeler';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Geçersiz kayıt tipi'
                    });
            }

            const sql = `DELETE FROM ${tableName} WHERE id = ?`;
            console.log('Delete SQL:', sql, 'ID:', id);

            const [result] = await db.execute(sql, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kayıt bulunamadı'
                });
            }

            res.json({
                success: true,
                message: 'Kayıt başarıyla silindi',
                affectedRows: result.affectedRows
            });

        } catch (error) {
            console.error('Delete record error:', error);
            res.status(500).json({
                success: false,
                message: 'Kayıt silinirken hata oluştu: ' + error.message
            });
        }
    },

    bulkUpdateRecords: async (_req, res) => {
        res.status(501).json({
            success: false,
            message: 'Toplu düzenleme desteklenmiyor. Lütfen ilgili operasyon modüllerini kullanın.'
        });
    },

    // Get data for specific table type
    getTableData: async (req, res) => {
        try {
            const { type } = req.params;
            let rows = [];
            let tableName = '';

            switch (type) {
                case 'customer':
                    tableName = 'musteriler';
                    rows = await safeQuery('SELECT * FROM musteriler ORDER BY adi ASC');
                    break;
                case 'supplier':
                    tableName = 'tedarikciler';
                    rows = await safeQuery('SELECT * FROM tedarikciler ORDER BY adi ASC');
                    break;
                case 'product':
                    tableName = 'radyotorler';
                    rows = await safeQuery('SELECT * FROM radyotorler ORDER BY adi ASC');
                    break;
                case 'material':
                    tableName = 'ham_maddeler';
                    rows = await safeQuery("SELECT * FROM ham_maddeler WHERE kaynak_tipi = 'Kendi Stok' ORDER BY adi ASC");
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid table type'
                    });
            }

            res.json({
                success: true,
                data: rows,
                tableName: tableName,
                type: type
            });
        } catch (error) {
            console.error('Error fetching table data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching table data'
            });
        }
    },

    // Create new record in specific table
    createTableRecord: async (req, res) => {
        try {
            const { type } = req.params;
            const data = req.body;

            let query = '';
            let params = [];
            let insertId = 0;

            switch (type) {
                case 'customer':
                    query = `INSERT INTO musteriler (adi, musteri_tipi, vergi_no_tc, telefon, adres) 
                             VALUES (?, ?, ?, ?, ?)`;
                    params = [
                        data.adi || '',
                        data.musteri_tipi || 'Bireysel',
                        data.vergi_no_tc || null,
                        data.telefon || null,
                        data.adres || null
                    ];
                    break;

                case 'supplier':
                    query = `INSERT INTO tedarikciler (adi, yetkili_kisi, telefon, adres) 
                             VALUES (?, ?, ?, ?)`;
                    params = [
                        data.adi || '',
                        data.yetkili_kisi || null,
                        data.telefon || null,
                        data.adres || null
                    ];
                    break;

                case 'product':
                    query = `INSERT INTO radyotorler (adi, olcu, dilim_sayisi, stok_miktari, min_stok, birim_fiyat, kategori) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    params = [
                        data.adi || '',
                        data.olcu || null,
                        data.dilim_sayisi || null,
                        data.stok_miktari || 0,
                        data.minimum_stok || 0,
                        data.birim_fiyat || 0,
                        data.kategori || null
                    ];
                    break;

                case 'material':
                    query = `INSERT INTO ham_maddeler (adi, liste_fiyati, depo_stok_miktari, fabrika_stok_miktari, birim, minimum_stok, kaynak_tipi) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    params = [
                        data.adi || '',
                        data.liste_fiyati || 0,
                        data.depo_stok_miktari || 0,
                        data.fabrika_stok_miktari || 0,
                        data.birim || 'kg',
                        data.minimum_stok || 0,
                        data.kaynak_tipi || 'Kendi Stok'
                    ];
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid table type'
                    });
            }

            const [result] = await db.execute(query, params);
            insertId = result.insertId;

            res.json({
                success: true,
                message: 'Record created successfully',
                id: insertId
            });
        } catch (error) {
            console.error('Error creating record:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating record: ' + error.message
            });
        }
    }
};

module.exports = kayitlarController;

// Optional helper table for sandbox/testing – kept for backwards-compatibility
(async function ensureRecordsTable(){
    try{
        await db.execute(`CREATE TABLE IF NOT EXISTS records (
            id INT PRIMARY KEY AUTO_INCREMENT,
            type VARCHAR(50),
            name VARCHAR(255),
            meta VARCHAR(255),
            stock INT DEFAULT NULL,
            tags VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    }catch(err){ console.error('Could not ensure records table:', err.message); }
})();
