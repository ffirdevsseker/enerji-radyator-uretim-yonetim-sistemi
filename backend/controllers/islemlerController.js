const db = require('../config/database');

// ============================================
// HAM MADDE ALIMLARI FONKSİYONLARI
// ============================================

// Ham madde alımlarını listele (filtrelerle)
exports.getHamMaddeAlimlari = async (req, res) => {
  try {
    const { baslangicTarihi, bitisTarihi, tedarikcId, hamMaddeId, faturaNo, grupla } = req.query;
    
    // Eğer grupla=true ise faturaları grupla
    if (grupla === 'true') {
      return exports.getHamMaddeAlimlariGruplu(req, res);
    }
    
    let query = `
      SELECT 
        sh.id,
        sh.alim_tarihi as tarih,
        t.adi as tedarikci_adi,
        hm.adi as ham_madde_adi,
        sh.miktar,
        sh.birim,
        sh.alim_fiyat as birim_fiyat,
        (sh.miktar * sh.alim_fiyat) as toplam_tutar,
        sh.fatura_no,
        sh.fatura_id,
        '' as aciklama
      FROM satinalma_hareketleri sh
      LEFT JOIN tedarikciler t ON sh.tedarikci_id = t.id
      LEFT JOIN ham_maddeler hm ON sh.hammadde_id = hm.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (baslangicTarihi) {
      query += ` AND sh.alim_tarihi >= ?`;
      params.push(baslangicTarihi);
    }
    
    if (bitisTarihi) {
      query += ` AND sh.alim_tarihi <= ?`;
      params.push(bitisTarihi);
    }
    
    // Çoklu tedarikçi seçimi desteği (virgülle ayrılmış)
    if (tedarikcId) {
      const tedarikcIds = tedarikcId.split(',').map(id => id.trim()).filter(id => id);
      if (tedarikcIds.length > 0) {
        query += ` AND sh.tedarikci_id IN (${tedarikcIds.map(() => '?').join(',')})`;
        params.push(...tedarikcIds);
      }
    }
    
    // Çoklu ham madde seçimi desteği (virgülle ayrılmış)
    if (hamMaddeId) {
      const hamMaddeIds = hamMaddeId.split(',').map(id => id.trim()).filter(id => id);
      if (hamMaddeIds.length > 0) {
        query += ` AND sh.hammadde_id IN (${hamMaddeIds.map(() => '?').join(',')})`;
        params.push(...hamMaddeIds);
      }
    }
    
    if (faturaNo) {
      query += ` AND sh.fatura_no LIKE ?`;
      params.push(`%${faturaNo}%`);
    }
    
    query += ` ORDER BY sh.alim_tarihi DESC, sh.fatura_id DESC`;
    
    const [rows] = await db.query(query, params);
    
    // Toplam özet hesapla
    const toplamMiktar = rows.reduce((sum, row) => sum + parseFloat(row.miktar || 0), 0);
    const toplamTutar = rows.reduce((sum, row) => sum + parseFloat(row.toplam_tutar || 0), 0);
    
    res.json({
      success: true,
      data: rows,
      ozet: {
        toplamMiktar: toplamMiktar.toFixed(2),
        toplamTutar: toplamTutar.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Ham madde alımları getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Ham madde alımlarını faturalara göre grupla
exports.getHamMaddeAlimlariGruplu = async (req, res) => {
  try {
    const { baslangicTarihi, bitisTarihi, tedarikcId, hamMaddeId, faturaNo } = req.query;
    
    let query = `
      SELECT 
        sf.id as fatura_id,
        sf.fatura_no,
        sf.alim_tarihi as tarih,
        t.adi as tedarikci_adi,
        sf.toplam_miktar,
        sf.toplam_tutar,
        COUNT(sh.id) as kalem_sayisi,
        GROUP_CONCAT(CONCAT(hm.adi, ' (', sh.miktar, ' ', sh.birim, ')') SEPARATOR ', ') as ham_maddeler
      FROM satinalma_faturalari sf
      LEFT JOIN tedarikciler t ON sf.tedarikci_id = t.id
      LEFT JOIN satinalma_hareketleri sh ON sf.id = sh.fatura_id
      LEFT JOIN ham_maddeler hm ON sh.hammadde_id = hm.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (baslangicTarihi) {
      query += ` AND sf.alim_tarihi >= ?`;
      params.push(baslangicTarihi);
    }
    
    if (bitisTarihi) {
      query += ` AND sf.alim_tarihi <= ?`;
      params.push(bitisTarihi);
    }
    
    if (tedarikcId) {
      const tedarikcIds = tedarikcId.split(',').map(id => id.trim()).filter(id => id);
      if (tedarikcIds.length > 0) {
        query += ` AND sf.tedarikci_id IN (${tedarikcIds.map(() => '?').join(',')})`;
        params.push(...tedarikcIds);
      }
    }
    
    if (faturaNo) {
      query += ` AND sf.fatura_no LIKE ?`;
      params.push(`%${faturaNo}%`);
    }
    
    query += ` GROUP BY sf.id ORDER BY sf.alim_tarihi DESC`;
    
    const [rows] = await db.query(query, params);
    
    // Toplam özet hesapla
    const toplamTutar = rows.reduce((sum, row) => sum + parseFloat(row.toplam_tutar || 0), 0);
    
    res.json({
      success: true,
      data: rows,
      ozet: {
        faturaAdedi: rows.length,
        toplamTutar: toplamTutar.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Ham madde alımları (gruplu) getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Yeni ham madde alımı ekle
exports.createHamMaddeAlimi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { tedarikcId, hamMaddeId, miktar, birim, birimFiyat, faturaNo, tarih } = req.body;
    
    // Satınalma hareketine ekle
    const [result] = await connection.query(
      `INSERT INTO satinalma_hareketleri 
       (tedarikci_id, hammadde_id, miktar, birim, alim_fiyat, fatura_no, alim_tarihi) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tedarikcId, hamMaddeId, miktar, birim, birimFiyat, faturaNo, tarih]
    );
    
    // Stok hareketine ekle (Giriş)
    await connection.query(
      `INSERT INTO stok_hareketleri 
       (hareket_tipi, urun_tipi, hammadde_id, miktar, birim_fiyat, kaynak_tablo, kaynak_id, tarih_saat) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Giriş', 'Hammadde', hamMaddeId, miktar, birimFiyat, 'Satınalma', result.insertId, 
       new Date(tarih)]
    );
    
    // Ham madde stok miktarını güncelle
    await connection.query(
      `UPDATE ham_maddeler 
       SET depo_stok_miktari = depo_stok_miktari + ? 
       WHERE id = ?`,
      [miktar, hamMaddeId]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Ham madde alımı başarıyla kaydedildi',
      id: result.insertId 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Ham madde alımı ekleme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  } finally {
    connection.release();
  }
};

// Ham madde alımını güncelle
exports.updateHamMaddeAlimi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { tedarikcId, hamMaddeId, miktar, birim, birimFiyat, faturaNo, tarih } = req.body;
    
    // Eski kaydı al
    const [oldRecord] = await connection.query(
      'SELECT * FROM satinalma_hareketleri WHERE id = ?',
      [id]
    );
    
    if (oldRecord.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }
    
    const eskiKayit = oldRecord[0];
    
    // Eski stok miktarını geri al
    await connection.query(
      `UPDATE ham_maddeler 
       SET depo_stok_miktari = depo_stok_miktari - ? 
       WHERE id = ?`,
      [eskiKayit.miktar, eskiKayit.hammadde_id]
    );
    
    // Satınalma hareketini güncelle
    await connection.query(
      `UPDATE satinalma_hareketleri 
       SET tedarikci_id = ?, hammadde_id = ?, miktar = ?, birim = ?, alim_fiyat = ?, 
           fatura_no = ?, alim_tarihi = ? 
       WHERE id = ?`,
      [tedarikcId, hamMaddeId, miktar, birim, birimFiyat, faturaNo, tarih, id]
    );
    
    // Yeni stok miktarını ekle
    await connection.query(
      `UPDATE ham_maddeler 
       SET depo_stok_miktari = depo_stok_miktari + ? 
       WHERE id = ?`,
      [miktar, hamMaddeId]
    );
    
    // Stok hareketini güncelle
    await connection.query(
      `UPDATE stok_hareketleri 
       SET hammadde_id = ?, miktar = ?, birim_fiyat = ?, tarih_saat = ? 
       WHERE kaynak_tablo = 'Satınalma' AND kaynak_id = ?`,
      [hamMaddeId, miktar, birimFiyat, new Date(tarih), id]
    );
    
    await connection.commit();
    
    res.json({ success: true, message: 'Ham madde alımı başarıyla güncellendi' });
  } catch (error) {
    await connection.rollback();
    console.error('Ham madde alımı güncelleme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  } finally {
    connection.release();
  }
};

// Ham madde alımını sil
exports.deleteHamMaddeAlimi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Kaydı al
    const [record] = await connection.query(
      'SELECT * FROM satinalma_hareketleri WHERE id = ?',
      [id]
    );
    
    if (record.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }
    
    const kayit = record[0];
    
    // Stok miktarını geri al
    await connection.query(
      `UPDATE ham_maddeler 
       SET depo_stok_miktari = depo_stok_miktari - ? 
       WHERE id = ?`,
      [kayit.miktar, kayit.hammadde_id]
    );
    
    // Stok hareketini sil
    await connection.query(
      `DELETE FROM stok_hareketleri 
       WHERE kaynak_tablo = 'Satınalma' AND kaynak_id = ?`,
      [id]
    );
    
    // Satınalma hareketini sil
    await connection.query('DELETE FROM satinalma_hareketleri WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ success: true, message: 'Ham madde alımı başarıyla silindi' });
  } catch (error) {
    await connection.rollback();
    console.error('Ham madde alımı silme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  } finally {
    connection.release();
  }
};

// ============================================
// RADYATÖR SATIŞLARI FONKSİYONLARI
// ============================================

// Radyatör satışlarını listele (filtrelerle)
exports.getRadyatorSatislari = async (req, res) => {
  try {
    const { baslangicTarihi, bitisTarihi, musteriId, radyatorId, faturaNo, grupla } = req.query;
    
    // Eğer grupla=true ise faturaları grupla
    if (grupla === 'true') {
      return exports.getRadyatorSatislariGruplu(req, res);
    }
    
    let query = `
      SELECT 
        fk.id,
        fk.fatura_tarihi as tarih,
        m.adi as musteri_adi,
        r.adi as model,
        fk.satilan_miktar as miktar,
        'adet' as birim,
        fk.satilan_birim_fiyat as birim_fiyat,
        (fk.satilan_miktar * fk.satilan_birim_fiyat) as toplam_tutar,
        fk.fatura_no,
        fk.fatura_id,
        '' as aciklama
      FROM fatura_kalemleri fk
      LEFT JOIN musteriler m ON fk.musteri_id = m.id
      LEFT JOIN radyotorler r ON fk.radyator_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (baslangicTarihi) {
      query += ` AND fk.fatura_tarihi >= ?`;
      params.push(baslangicTarihi);
    }
    
    if (bitisTarihi) {
      query += ` AND fk.fatura_tarihi <= ?`;
      params.push(bitisTarihi);
    }
    
    // Çoklu müşteri seçimi desteği (virgülle ayrılmış)
    if (musteriId) {
      const musteriIds = musteriId.split(',').map(id => id.trim()).filter(id => id);
      if (musteriIds.length > 0) {
        query += ` AND fk.musteri_id IN (${musteriIds.map(() => '?').join(',')})`;
        params.push(...musteriIds);
      }
    }
    
    // Çoklu radyatör seçimi desteği (virgülle ayrılmış)
    if (radyatorId) {
      const radyatorIds = radyatorId.split(',').map(id => id.trim()).filter(id => id);
      if (radyatorIds.length > 0) {
        query += ` AND fk.radyator_id IN (${radyatorIds.map(() => '?').join(',')})`;
        params.push(...radyatorIds);
      }
    }
    
    if (faturaNo) {
      query += ` AND fk.fatura_no LIKE ?`;
      params.push(`%${faturaNo}%`);
    }
    
    query += ` ORDER BY fk.fatura_tarihi DESC, fk.fatura_id DESC`;
    
    const [rows] = await db.query(query, params);
    
    // Toplam özet hesapla
    const toplamAdet = rows.reduce((sum, row) => sum + parseInt(row.miktar || 0), 0);
    const toplamTutar = rows.reduce((sum, row) => sum + parseFloat(row.toplam_tutar || 0), 0);
    
    res.json({
      success: true,
      data: rows,
      ozet: {
        toplamAdet,
        toplamTutar: toplamTutar.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Radyatör satışları getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Radyatör satışlarını faturalara göre grupla
exports.getRadyatorSatislariGruplu = async (req, res) => {
  try {
    const { baslangicTarihi, bitisTarihi, musteriId, radyatorId, faturaNo } = req.query;
    
    let query = `
      SELECT 
        f.id as fatura_id,
        f.fatura_no,
        f.fatura_tarihi as tarih,
        m.adi as musteri_adi,
        f.toplam_miktar,
        f.toplam_tutar,
        COUNT(fk.id) as kalem_sayisi,
        GROUP_CONCAT(CONCAT(r.adi, ' (', fk.satilan_miktar, ' adet)') SEPARATOR ', ') as radyatorler
      FROM faturalar f
      LEFT JOIN musteriler m ON f.musteri_id = m.id
      LEFT JOIN fatura_kalemleri fk ON f.id = fk.fatura_id
      LEFT JOIN radyotorler r ON fk.radyator_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (baslangicTarihi) {
      query += ` AND f.fatura_tarihi >= ?`;
      params.push(baslangicTarihi);
    }
    
    if (bitisTarihi) {
      query += ` AND f.fatura_tarihi <= ?`;
      params.push(bitisTarihi);
    }
    
    if (musteriId) {
      const musteriIds = musteriId.split(',').map(id => id.trim()).filter(id => id);
      if (musteriIds.length > 0) {
        query += ` AND f.musteri_id IN (${musteriIds.map(() => '?').join(',')})`;
        params.push(...musteriIds);
      }
    }
    
    if (faturaNo) {
      query += ` AND f.fatura_no LIKE ?`;
      params.push(`%${faturaNo}%`);
    }
    
    query += ` GROUP BY f.id ORDER BY f.fatura_tarihi DESC`;
    
    const [rows] = await db.query(query, params);
    
    // Toplam özet hesapla
    const toplamTutar = rows.reduce((sum, row) => sum + parseFloat(row.toplam_tutar || 0), 0);
    
    res.json({
      success: true,
      data: rows,
      ozet: {
        faturaAdedi: rows.length,
        toplamTutar: toplamTutar.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Radyatör satışları (gruplu) getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Yeni radyatör satışı ekle
exports.createRadyatorSatisi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { musteriId, radyatorId, miktar, birimFiyat, faturaNo, tarih } = req.body;
    
    // Stok kontrolü
    const [radyator] = await connection.query(
      'SELECT stok_miktari, adi FROM radyotorler WHERE id = ?',
      [radyatorId]
    );
    
    if (radyator.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Radyatör bulunamadı' });
    }
    
    if (radyator[0].stok_miktari < miktar) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Yetersiz stok! Mevcut stok: ${radyator[0].stok_miktari}` 
      });
    }
    
    // Fatura var mı kontrol et (aynı fatura_no ve müşteri için)
    let faturaId = null;
    const [existingFatura] = await connection.query(
      'SELECT id FROM faturalar WHERE fatura_no = ? AND musteri_id = ?',
      [faturaNo, musteriId]
    );
    
    if (existingFatura.length > 0) {
      // Mevcut fatura var, sadece ID'yi al
      faturaId = existingFatura[0].id;
    } else {
      // Yeni fatura oluştur
      const [faturaResult] = await connection.query(
        `INSERT INTO faturalar 
         (fatura_no, musteri_id, fatura_tarihi, toplam_miktar, toplam_tutar) 
         VALUES (?, ?, ?, 0, 0)`,
        [faturaNo, musteriId, tarih]
      );
      faturaId = faturaResult.insertId;
    }
    
    // Fatura kalemine ekle
    const toplamTutar = miktar * birimFiyat;
    const [result] = await connection.query(
      `INSERT INTO fatura_kalemleri 
       (fatura_id, musteri_id, radyator_id, satilan_miktar, satilan_birim_fiyat, fatura_no, fatura_tarihi) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [faturaId, musteriId, radyatorId, miktar, birimFiyat, faturaNo, tarih]
    );
    
    // Fatura toplamlarını güncelle
    await connection.query(
      `UPDATE faturalar 
       SET toplam_miktar = toplam_miktar + ?, 
           toplam_tutar = toplam_tutar + ? 
       WHERE id = ?`,
      [miktar, toplamTutar, faturaId]
    );
    
    // Stok hareketine ekle (Çıkış)
    await connection.query(
      `INSERT INTO stok_hareketleri 
       (hareket_tipi, urun_tipi, radyator_id, miktar, birim_fiyat, kaynak_tablo, kaynak_id, tarih_saat) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Çıkış', 'Radyatör', radyatorId, miktar, birimFiyat, 'Satış', result.insertId, 
       new Date(tarih)]
    );
    
    // Radyatör stok miktarını güncelle
    await connection.query(
      `UPDATE radyotorler 
       SET stok_miktari = stok_miktari - ? 
       WHERE id = ?`,
      [miktar, radyatorId]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Radyatör satışı başarıyla kaydedildi',
      id: result.insertId,
      faturaId: faturaId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Radyatör satışı ekleme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  } finally {
    connection.release();
  }
};

// Radyatör satışını güncelle
exports.updateRadyatorSatisi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { musteriId, radyatorId, miktar, birimFiyat, faturaNo, tarih } = req.body;
    
    // Eski kaydı al
    const [oldRecord] = await connection.query(
      'SELECT * FROM fatura_kalemleri WHERE id = ?',
      [id]
    );
    
    if (oldRecord.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }
    
    const eskiKayit = oldRecord[0];
    
    // Eski stok miktarını geri ekle
    await connection.query(
      `UPDATE radyotorler 
       SET stok_miktari = stok_miktari + ? 
       WHERE id = ?`,
      [eskiKayit.satilan_miktar, eskiKayit.radyator_id]
    );
    
    // Yeni stok kontrolü
    const [radyator] = await connection.query(
      'SELECT stok_miktari FROM radyotorler WHERE id = ?',
      [radyatorId]
    );
    
    if (radyator.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Radyatör bulunamadı' });
    }
    
    if (radyator[0].stok_miktari < miktar) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Yetersiz stok! Mevcut stok: ${radyator[0].stok_miktari}` 
      });
    }
    
    // Fatura kalemini güncelle
    await connection.query(
      `UPDATE fatura_kalemleri 
       SET musteri_id = ?, radyator_id = ?, satilan_miktar = ?, satilan_birim_fiyat = ?, 
           fatura_no = ?, fatura_tarihi = ? 
       WHERE id = ?`,
      [musteriId, radyatorId, miktar, birimFiyat, faturaNo, tarih, id]
    );
    
    // Yeni stok miktarını düş
    await connection.query(
      `UPDATE radyotorler 
       SET stok_miktari = stok_miktari - ? 
       WHERE id = ?`,
      [miktar, radyatorId]
    );
    
    // Stok hareketini güncelle
    await connection.query(
      `UPDATE stok_hareketleri 
       SET radyator_id = ?, miktar = ?, birim_fiyat = ?, tarih_saat = ? 
       WHERE kaynak_tablo = 'Satış' AND kaynak_id = ?`,
      [radyatorId, miktar, birimFiyat, new Date(tarih), id]
    );
    
    // Fatura toplamlarını yeniden hesapla (eğer fatura_id varsa)
    if (eskiKayit.fatura_id) {
      const [faturaToplamlar] = await connection.query(
        `SELECT 
          SUM(satilan_miktar) as toplam_miktar,
          SUM(satilan_miktar * satilan_birim_fiyat) as toplam_tutar
         FROM fatura_kalemleri 
         WHERE fatura_id = ?`,
        [eskiKayit.fatura_id]
      );
      
      if (faturaToplamlar.length > 0) {
        await connection.query(
          `UPDATE faturalar 
           SET toplam_miktar = ?, toplam_tutar = ? 
           WHERE id = ?`,
          [faturaToplamlar[0].toplam_miktar || 0, faturaToplamlar[0].toplam_tutar || 0, eskiKayit.fatura_id]
        );
      }
    }
    
    await connection.commit();
    
    res.json({ success: true, message: 'Radyatör satışı başarıyla güncellendi' });
  } catch (error) {
    await connection.rollback();
    console.error('Radyatör satışı güncelleme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  } finally {
    connection.release();
  }
};

// Radyatör satışını sil
exports.deleteRadyatorSatisi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Kaydı al
    const [record] = await connection.query(
      'SELECT * FROM fatura_kalemleri WHERE id = ?',
      [id]
    );
    
    if (record.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }
    
    const kayit = record[0];
    const faturaId = kayit.fatura_id;
    
    // Stok miktarını geri ekle
    await connection.query(
      `UPDATE radyotorler 
       SET stok_miktari = stok_miktari + ? 
       WHERE id = ?`,
      [kayit.satilan_miktar, kayit.radyator_id]
    );
    
    // Stok hareketini sil
    await connection.query(
      `DELETE FROM stok_hareketleri 
       WHERE kaynak_tablo = 'Satış' AND kaynak_id = ?`,
      [id]
    );
    
    // Fatura kalemini sil
    await connection.query('DELETE FROM fatura_kalemleri WHERE id = ?', [id]);
    
    // Fatura toplamlarını yeniden hesapla veya faturayı sil
    if (faturaId) {
      // Faturaya ait kalan kalemleri kontrol et
      const [remainingItems] = await connection.query(
        'SELECT COUNT(*) as count FROM fatura_kalemleri WHERE fatura_id = ?',
        [faturaId]
      );
      
      if (remainingItems[0].count === 0) {
        // Faturada başka kalem kalmadıysa faturayı sil
        await connection.query('DELETE FROM faturalar WHERE id = ?', [faturaId]);
      } else {
        // Fatura toplamlarını yeniden hesapla
        const [faturaToplamlar] = await connection.query(
          `SELECT 
            SUM(satilan_miktar) as toplam_miktar,
            SUM(satilan_miktar * satilan_birim_fiyat) as toplam_tutar
           FROM fatura_kalemleri 
           WHERE fatura_id = ?`,
          [faturaId]
        );
        
        if (faturaToplamlar.length > 0) {
          await connection.query(
            `UPDATE faturalar 
             SET toplam_miktar = ?, toplam_tutar = ? 
             WHERE id = ?`,
            [faturaToplamlar[0].toplam_miktar || 0, faturaToplamlar[0].toplam_tutar || 0, faturaId]
          );
        }
      }
    }
    
    await connection.commit();
    
    res.json({ success: true, message: 'Radyatör satışı başarıyla silindi' });
  } catch (error) {
    await connection.rollback();
    console.error('Radyatör satışı silme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  } finally {
    connection.release();
  }
};

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

// Tedarikçileri listele
exports.getTedarikciler = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, adi FROM tedarikciler ORDER BY adi');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Tedarikçiler getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Ham maddeleri listele
exports.getHamMaddeler = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, adi, birim FROM ham_maddeler WHERE kaynak_tipi = 'Kendi Stok' ORDER BY adi");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Ham maddeler getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Müşterileri listele
exports.getMusteriler = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, adi FROM musteriler ORDER BY adi');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Müşteriler getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Radyatörleri listele
exports.getRadyatorler = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, adi, stok_miktari FROM radyotorler ORDER BY adi');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Radyatörler getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Fatura numaralarını listele (autocomplete için)
exports.getFaturaNumaralari = async (req, res) => {
  try {
    const { tip } = req.query; // 'ham-madde' veya 'radyator'
    
    let query = '';
    
    if (tip === 'ham-madde') {
      // Ham madde alımlarından fatura numaraları
      query = `
        SELECT DISTINCT fatura_no 
        FROM satinalma_hareketleri 
        WHERE fatura_no IS NOT NULL AND fatura_no != '' 
        ORDER BY fatura_no DESC
        LIMIT 100
      `;
    } else if (tip === 'radyator') {
      // Radyatör satışlarından fatura numaraları
      query = `
        SELECT DISTINCT fatura_no 
        FROM fatura_kalemleri 
        WHERE fatura_no IS NOT NULL AND fatura_no != '' 
        ORDER BY fatura_no DESC
        LIMIT 100
      `;
    } else {
      // Her ikisi de - tüm fatura numaraları
      query = `
        SELECT DISTINCT fatura_no FROM (
          SELECT fatura_no FROM satinalma_hareketleri 
          WHERE fatura_no IS NOT NULL AND fatura_no != ''
          UNION
          SELECT fatura_no FROM fatura_kalemleri 
          WHERE fatura_no IS NOT NULL AND fatura_no != ''
        ) AS all_faturalar
        ORDER BY fatura_no DESC
        LIMIT 100
      `;
    }
    
    const [rows] = await db.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fatura numaraları getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Tarih aralığını getir (en eski ve bugün)
exports.getTarihAraligi = async (req, res) => {
  try {
    const { tip } = req.query; // 'ham-madde' veya 'radyator'
    
    let query = '';
    
    if (tip === 'ham-madde') {
      // Ham madde alımları için en eski tarih
      query = `
        SELECT 
          MIN(alim_tarihi) as enEskiTarih,
          MAX(alim_tarihi) as enYeniTarih
        FROM satinalma_hareketleri
      `;
    } else {
      // Radyatör satışları için en eski tarih
      query = `
        SELECT 
          MIN(fatura_tarihi) as enEskiTarih,
          MAX(fatura_tarihi) as enYeniTarih
        FROM fatura_kalemleri
      `;
    }
    
    const [rows] = await db.query(query);
    
    if (rows.length > 0 && rows[0].enEskiTarih) {
      res.json({ 
        success: true, 
        data: {
          enEskiTarih: rows[0].enEskiTarih,
          enYeniTarih: rows[0].enYeniTarih || new Date().toISOString().split('T')[0]
        }
      });
    } else {
      // Veri yoksa bugünün tarihini döndür
      const bugun = new Date().toISOString().split('T')[0];
      res.json({ 
        success: true, 
        data: {
          enEskiTarih: bugun,
          enYeniTarih: bugun
        }
      });
    }
  } catch (error) {
    console.error('Tarih aralığı getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// İşlem detayını getir (stok hareketi ile birlikte)
exports.getIslemDetayi = async (req, res) => {
  try {
    const { kaynakTablo, kaynakId } = req.params;
    
    const [stokHareket] = await db.query(
      `SELECT * FROM stok_hareketleri 
       WHERE kaynak_tablo = ? AND kaynak_id = ?`,
      [kaynakTablo, kaynakId]
    );
    
    res.json({ success: true, data: stokHareket[0] || null });
  } catch (error) {
    console.error('İşlem detayı getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// Fatura detayını getir (tüm kalemler ile)
exports.getFaturaDetayi = async (req, res) => {
  try {
    const { faturaId, tip } = req.params; // tip: 'alim' veya 'satis'
    
    if (tip === 'alim') {
      // Ham madde alımı fatura detayı
      const [fatura] = await db.query(
        `SELECT 
          sf.id,
          sf.fatura_no,
          sf.alim_tarihi as tarih,
          sf.toplam_miktar,
          sf.toplam_tutar,
          sf.olusturma_tarihi,
          t.adi as tedarikci_adi,
          t.telefon as tedarikci_telefon,
          t.adres as tedarikci_adres
        FROM satinalma_faturalari sf
        LEFT JOIN tedarikciler t ON sf.tedarikci_id = t.id
        WHERE sf.id = ?`,
        [faturaId]
      );
      
      if (fatura.length === 0) {
        return res.status(404).json({ success: false, message: 'Fatura bulunamadı' });
      }
      
      // Fatura kalemlerini getir
      const [kalemler] = await db.query(
        `SELECT 
          sh.id,
          hm.adi as ham_madde_adi,
          sh.miktar,
          sh.birim,
          sh.alim_fiyat as birim_fiyat,
          (sh.miktar * sh.alim_fiyat) as toplam
        FROM satinalma_hareketleri sh
        LEFT JOIN ham_maddeler hm ON sh.hammadde_id = hm.id
        WHERE sh.fatura_id = ?
        ORDER BY sh.id`,
        [faturaId]
      );
      
      res.json({
        success: true,
        data: {
          fatura: fatura[0],
          kalemler: kalemler,
          tip: 'alim'
        }
      });
      
    } else if (tip === 'satis') {
      // Radyatör satışı fatura detayı - faturalar tablosundan getir
      const [faturaInfo] = await db.query(
        `SELECT 
          f.id,
          f.fatura_no,
          f.fatura_tarihi as tarih,
          f.toplam_miktar,
          f.toplam_tutar,
          f.olusturma_tarihi,
          m.adi as musteri_adi,
          m.telefon as musteri_telefon,
          m.adres as musteri_adres
        FROM faturalar f
        LEFT JOIN musteriler m ON f.musteri_id = m.id
        WHERE f.id = ?`,
        [faturaId]
      );
      
      if (faturaInfo.length === 0) {
        return res.status(404).json({ success: false, message: 'Fatura bulunamadı' });
      }
      
      // Fatura kalemlerini getir
      const [kalemler] = await db.query(
        `SELECT 
          fk.id,
          r.adi as radyator_adi,
          r.olcu as radyator_olcu,
          fk.satilan_miktar as miktar,
          fk.satilan_birim_fiyat as birim_fiyat,
          (fk.satilan_miktar * fk.satilan_birim_fiyat) as toplam
        FROM fatura_kalemleri fk
        LEFT JOIN radyotorler r ON fk.radyator_id = r.id
        WHERE fk.fatura_id = ?
        ORDER BY fk.id`,
        [faturaId]
      );
      
      res.json({
        success: true,
        data: {
          fatura: faturaInfo[0],
          kalemler: kalemler,
          tip: 'satis'
        }
      });
      
    } else {
      res.status(400).json({ success: false, message: 'Geçersiz fatura tipi' });
    }
    
  } catch (error) {
    console.error('Fatura detayı getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

// ============================================
// ÇOKLU İŞLEM FONKSİYONLARI
// ============================================

// Çoklu ham madde alımı (Bir tedarikçiden birden fazla ham madde)
exports.createCokluHamMaddeAlimi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { tedarikcId, tarih, faturaNo, hamMaddeler } = req.body;
    
    // Validasyon
    if (!tedarikcId || !tarih || !hamMaddeler || !Array.isArray(hamMaddeler) || hamMaddeler.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Tedarikçi, tarih ve en az bir ham madde gereklidir' 
      });
    }
    
    // Otomatik fatura no üret (eğer yoksa)
    let faturaNO = faturaNo;
    if (!faturaNO) {
      const tarihStr = tarih.replace(/-/g, '');
      const [lastFatura] = await connection.query(
        `SELECT fatura_no FROM satinalma_faturalari 
         WHERE fatura_no LIKE ? ORDER BY id DESC LIMIT 1`,
        [`SF${tarihStr}%`]
      );
      
      if (lastFatura.length > 0) {
        const lastNo = parseInt(lastFatura[0].fatura_no.slice(-3));
        faturaNO = `SF${tarihStr}${String(lastNo + 1).padStart(3, '0')}`;
      } else {
        faturaNO = `SF${tarihStr}001`;
      }
    }
    
    let toplamMiktar = 0;
    let toplamTutar = 0;
    
    // Fatura oluştur
    const [faturaResult] = await connection.query(
      `INSERT INTO satinalma_faturalari 
       (fatura_no, tedarikci_id, alim_tarihi, toplam_miktar, toplam_tutar) 
       VALUES (?, ?, ?, 0, 0)`,
      [faturaNO, tedarikcId, tarih]
    );
    
    const faturaId = faturaResult.insertId;
    const eklenenHareketler = [];
    
    // Her ham madde için işlem yap
    for (const hamMadde of hamMaddeler) {
      const { hamMaddeId, miktar, birim, birimFiyat } = hamMadde;
      
      if (!hamMaddeId || !miktar || miktar <= 0 || !birimFiyat || birimFiyat < 0) {
        continue; // Geçersiz satırları atla
      }
      
      const satirToplam = miktar * birimFiyat;
      toplamMiktar += parseFloat(miktar);
      toplamTutar += satirToplam;
      
      // Satınalma hareketine ekle
      const [hareketResult] = await connection.query(
        `INSERT INTO satinalma_hareketleri 
         (fatura_id, tedarikci_id, hammadde_id, miktar, birim, alim_fiyat, fatura_no, alim_tarihi) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [faturaId, tedarikcId, hamMaddeId, miktar, birim || 'kg', birimFiyat, faturaNO, tarih]
      );
      
      // Stok hareketine ekle
      await connection.query(
        `INSERT INTO stok_hareketleri 
         (hareket_tipi, urun_tipi, hammadde_id, miktar, birim_fiyat, kaynak_tablo, kaynak_id, tarih_saat) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Giriş', 'Hammadde', hamMaddeId, miktar, birimFiyat, 'Satınalma', hareketResult.insertId, new Date(tarih)]
      );
      
      // Ham madde stok miktarını güncelle
      await connection.query(
        `UPDATE ham_maddeler 
         SET depo_stok_miktari = depo_stok_miktari + ? 
         WHERE id = ?`,
        [miktar, hamMaddeId]
      );
      
      eklenenHareketler.push({
        id: hareketResult.insertId,
        hamMaddeId,
        miktar,
        birimFiyat,
        toplam: satirToplam
      });
    }
    
    // Faturayı güncelle (toplam bilgileri)
    await connection.query(
      `UPDATE satinalma_faturalari 
       SET toplam_miktar = ?, toplam_tutar = ? 
       WHERE id = ?`,
      [toplamMiktar, toplamTutar, faturaId]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: `${eklenenHareketler.length} adet ham madde alımı başarıyla kaydedildi`,
      data: {
        faturaId,
        faturaNo: faturaNO,
        toplamMiktar,
        toplamTutar,
        hareketler: eklenenHareketler
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Çoklu ham madde alımı ekleme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + error.message 
    });
  } finally {
    connection.release();
  }
};

// Çoklu radyatör satışı (Bir müşteriye birden fazla radyatör)
exports.createCokluRadyatorSatisi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { musteriId, tarih, faturaNo, radyatorler } = req.body;
    
    // Validasyon
    if (!musteriId || !tarih || !radyatorler || !Array.isArray(radyatorler) || radyatorler.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Müşteri, tarih ve en az bir radyatör gereklidir' 
      });
    }
    
    // Otomatik fatura no üret (eğer yoksa)
    let faturaNO = faturaNo;
    if (!faturaNO) {
      const tarihStr = tarih.replace(/-/g, '');
      const [lastFatura] = await connection.query(
        `SELECT fatura_no FROM faturalar 
         WHERE fatura_no LIKE ? ORDER BY id DESC LIMIT 1`,
        [`ST${tarihStr}%`]
      );
      
      if (lastFatura.length > 0) {
        const lastNo = parseInt(lastFatura[0].fatura_no.slice(-3));
        faturaNO = `ST${tarihStr}${String(lastNo + 1).padStart(3, '0')}`;
      } else {
        faturaNO = `ST${tarihStr}001`;
      }
    }
    
    let toplamMiktar = 0;
    let toplamTutar = 0;
    
    // Stok kontrolü
    for (const radyator of radyatorler) {
      const { radyatorId, miktar } = radyator;
      
      if (!radyatorId || !miktar || miktar <= 0) {
        continue;
      }
      
      const [stokKontrol] = await connection.query(
        'SELECT stok_miktari, adi FROM radyotorler WHERE id = ?',
        [radyatorId]
      );
      
      if (stokKontrol.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false, 
          message: `Radyatör bulunamadı (ID: ${radyatorId})` 
        });
      }
      
      if (stokKontrol[0].stok_miktari < miktar) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `${stokKontrol[0].adi} için yetersiz stok! Mevcut: ${stokKontrol[0].stok_miktari}, İstenen: ${miktar}` 
        });
      }
    }
    
    // Yeni fatura oluştur
    const [faturaResult] = await connection.query(
      `INSERT INTO faturalar 
       (fatura_no, musteri_id, fatura_tarihi, toplam_miktar, toplam_tutar) 
       VALUES (?, ?, ?, 0, 0)`,
      [faturaNO, musteriId, tarih]
    );
    
    const faturaId = faturaResult.insertId;
    const eklenenHareketler = [];
    
    // Her radyatör için işlem yap
    for (const radyator of radyatorler) {
      const { radyatorId, miktar, birimFiyat } = radyator;
      
      if (!radyatorId || !miktar || miktar <= 0 || !birimFiyat || birimFiyat < 0) {
        continue; // Geçersiz satırları atla
      }
      
      const satirToplam = miktar * birimFiyat;
      toplamMiktar += parseInt(miktar);
      toplamTutar += satirToplam;
      
      // Fatura kalemine ekle
      const [hareketResult] = await connection.query(
        `INSERT INTO fatura_kalemleri 
         (fatura_id, musteri_id, radyator_id, satilan_miktar, satilan_birim_fiyat, fatura_no, fatura_tarihi) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [faturaId, musteriId, radyatorId, miktar, birimFiyat, faturaNO, tarih]
      );
      
      // Stok hareketine ekle
      await connection.query(
        `INSERT INTO stok_hareketleri 
         (hareket_tipi, urun_tipi, radyator_id, miktar, birim_fiyat, kaynak_tablo, kaynak_id, tarih_saat) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Çıkış', 'Radyatör', radyatorId, miktar, birimFiyat, 'Satış', hareketResult.insertId, new Date(tarih)]
      );
      
      // Radyatör stok miktarını güncelle
      await connection.query(
        `UPDATE radyotorler 
         SET stok_miktari = stok_miktari - ? 
         WHERE id = ?`,
        [miktar, radyatorId]
      );
      
      eklenenHareketler.push({
        id: hareketResult.insertId,
        radyatorId,
        miktar,
        birimFiyat,
        toplam: satirToplam
      });
    }
    
    // Fatura toplamlarını güncelle
    await connection.query(
      `UPDATE faturalar 
       SET toplam_miktar = ?, toplam_tutar = ? 
       WHERE id = ?`,
      [toplamMiktar, toplamTutar, faturaId]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: `${eklenenHareketler.length} adet radyatör satışı başarıyla kaydedildi`,
      data: {
        faturaId,
        faturaNo: faturaNO,
        toplamMiktar,
        toplamTutar,
        hareketler: eklenenHareketler
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Çoklu radyatör satışı ekleme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + error.message 
    });
  } finally {
    connection.release();
  }
};