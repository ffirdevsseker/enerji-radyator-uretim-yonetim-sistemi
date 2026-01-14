# ER Diyagramı (Entity-Relationship Diagram)

Bu doküman, Enerji Radyatör Üretim Yönetim Sistemi veritabanı yapısının ER diyagramını açıklar.

## 📊 Veritabanı Şeması Özeti

Veritabanı, radyatör üretim sürecinin tüm aşamalarını kapsayan 12+ tablodan oluşmaktadır.

## 🔗 Tablo İlişkileri

### Ana Varlıklar ve İlişkileri:

#### 1️⃣ **Müşteri-Satış İlişkisi**
```
musteriler (1) ──────< (N) fatura_kalemleri (N) >────── (1) radyotorler
```
- Bir müşteri birden fazla fatura kalemine sahip olabilir
- Her fatura kalemi bir radyatör türüne aittir

#### 2️⃣ **Tedarikçi-Satın Alma İlişkisi**
```
tedarikciler (1) ──────< (N) satinalma_hareketleri (N) >────── (1) ham_maddeler
```
- Bir tedarikçiden birden fazla hammadde alımı yapılabilir
- Her alım bir hammadde türüne aittir

#### 3️⃣ **Radyatör-Maliyet İlişkisi**
```
radyotorler (1) ──────< (N) maliyet_dosyasi
```
- Her radyatör türü için bir maliyet dosyası tanımlanır
- Maliyet dosyası, radyatör üretimi için gerekli hammaddeleri listeler

#### 4️⃣ **Üretim İrsaliye İlişkileri**
```
uretim_irsaliyeleri (1) ──────< (N) irsaliye_kalemleri

irsaliye_kalemleri (N) >────── (0..1) ham_maddeler
irsaliye_kalemleri (N) >────── (0..1) radyotorler
```
- Bir irsaliye birden fazla kaleme sahip olabilir
- Her kalem ya hammadde ya da radyatör içerir (mutually exclusive)

#### 5️⃣ **Stok Hareket Takibi**
```
stok_hareketleri (N) >────── (0..1) ham_maddeler
stok_hareketleri (N) >────── (0..1) radyotorler
```
- Stok hareketleri tüm giriş/çıkış işlemlerini loglar
- Polymorphic ilişki: hammadde VEYA radyatör

## 📋 Detaylı Tablo Açıklamaları

### Core Tables (Ana Tablolar)

#### 🏢 **musteriler**
- **Amaç:** Müşteri bilgilerini saklar
- **Alanlar:**
  - `id` (PK): Benzersiz müşteri kimliği
  - `adi`: Müşteri adı
  - `musteri_tipi`: Müşteri tipi (Bireysel/Kurumsal)
  - `vergi_no_tc`: Vergi numarası veya TC kimlik no
  - `telefon`: İletişim telefonu
  - `adres`: Adres bilgisi
- **İlişkiler:** 
  - → fatura_kalemleri (1:N)

#### 🏭 **tedarikciler**
- **Amaç:** Tedarikçi bilgilerini saklar
- **Alanlar:**
  - `id` (PK): Benzersiz tedarikçi kimliği
  - `adi`: Tedarikçi firma adı
  - `yetkili_kisi`: Yetkili kişi adı
  - `telefon`: İletişim telefonu
  - `email`: E-posta adresi
  - `adres`: Adres bilgisi
- **İlişkiler:**
  - → satinalma_hareketleri (1:N)

#### 🧱 **ham_maddeler**
- **Amaç:** Hammadde stoklarını ve bilgilerini saklar
- **Alanlar:**
  - `id` (PK): Benzersiz hammadde kimliği
  - `adi`: Hammadde adı
  - `birim`: Ölçü birimi (kg, adet, metre, vb.)
  - `depo_stok_miktari`: Depodaki stok miktarı
  - `fabrika_stok_miktari`: Fabrikadaki stok miktarı
  - `minimum_stok`: Minimum stok seviyesi
  - `liste_fiyati`: Liste fiyatı
  - `kaynak_tipi`: Stok kaynağı (Kendi Stok/Tedarikçi)
  - `son_stok_guncelleme`: Son güncelleme zamanı
- **İlişkiler:**
  - → satinalma_hareketleri (1:N)
  - → stok_hareketleri (1:N)
  - → irsaliye_kalemleri (1:N)
  - → maliyet_dosyasi (referans)

#### 🔥 **radyotorler**
- **Amaç:** Radyatör ürün bilgilerini ve stoklarını saklar
- **Alanlar:**
  - `id` (PK): Benzersiz radyatör kimliği
  - `adi`: Radyatör model adı
  - `kategori`: Ürün kategorisi
  - `stok_miktari`: Mevcut stok adedi
  - `olcu`: Radyatör ölçüsü
  - `dilim_sayisi`: Dilim sayısı
  - `son_stok_guncelleme`: Son güncelleme zamanı
- **İlişkiler:**
  - → fatura_kalemleri (1:N)
  - → stok_hareketleri (1:N)
  - → irsaliye_kalemleri (1:N)
  - → maliyet_dosyasi (1:N)

### Transaction Tables (İşlem Tabloları)

#### 💰 **satinalma_hareketleri**
- **Amaç:** Tedarikçilerden hammadde alımlarını kaydeder
- **Alanlar:**
  - `id` (PK): Hareket kimliği
  - `tedarikci_id` (FK): Tedarikçi referansı
  - `hammadde_id` (FK): Hammadde referansı
  - `miktar`: Alınan miktar
  - `alim_fiyat`: Birim alış fiyatı
  - `fatura_no`: Fatura numarası
  - `fatura_id`: Fatura grubu kimliği
  - `alim_tarihi`: Alım tarihi
- **İlişkiler:**
  - tedarikciler ← (N:1)
  - ham_maddeler ← (N:1)
- **İş Kuralı:** Her alım stoğu otomatik artırır

#### 📦 **uretim_irsaliyeleri**
- **Amaç:** Fabrikaya hammadde çıkışı ve radyatör girişi irsaliyelerini saklar
- **Alanlar:**
  - `id` (PK): İrsaliye kimliği
  - `irsaliye_no` (UNIQUE): Benzersiz irsaliye numarası
  - `tarih`: İrsaliye tarihi
  - `irsaliye_tipi`: Tip (ÇIKIŞ/GİRİŞ)
  - `aciklama`: Açıklama metni
- **İlişkiler:**
  - → irsaliye_kalemleri (1:N)
- **İş Kuralı:** İrsaliye numarası tekrar edemez

#### 📄 **irsaliye_kalemleri**
- **Amaç:** İrsaliye kalemlerini detaylı olarak saklar
- **Alanlar:**
  - `id` (PK): Kalem kimliği
  - `irsaliye_id` (FK): İrsaliye referansı
  - `urun_tipi`: Ürün tipi (Hammadde/Radyatör)
  - `hammadde_id` (FK, nullable): Hammadde referansı
  - `radyator_id` (FK, nullable): Radyatör referansı
  - `miktar`: Miktar
  - `birim_fiyat`: Birim fiyat
- **İlişkiler:**
  - uretim_irsaliyeleri ← (N:1)
  - ham_maddeler ← (N:0..1)
  - radyotorler ← (N:0..1)
- **İş Kuralı:** hammadde_id VEYA radyator_id dolu olmalı (ikisi birden değil)

#### 💵 **maliyet_dosyasi**
- **Amaç:** Her radyatör için gerekli hammaddeleri ve maliyetleri tanımlar
- **Alanlar:**
  - `id` (PK): Kayıt kimliği
  - `radyator_id` (FK): Radyatör referansı
  - `sira`: Sıra numarası
  - `stok_kodu`: Hammadde stok kodu
  - `stok_adi`: Hammadde adı
  - `birim`: Birim
  - `miktar`: Gerekli miktar
  - `fiyat`: Birim fiyat
- **İlişkiler:**
  - radyotorler ← (N:1)
- **İş Kuralı:** Radyatör üretiminde bu dosya baz alınır

#### 📊 **stok_hareketleri**
- **Amaç:** Tüm stok giriş/çıkış hareketlerini loglar
- **Alanlar:**
  - `id` (PK): Hareket kimliği
  - `tarih_saat`: İşlem zamanı
  - `urun_tipi`: Ürün tipi (Hammadde/Radyatör)
  - `hammadde_id` (FK, nullable): Hammadde referansı
  - `radyator_id` (FK, nullable): Radyatör referansı
  - `hareket_tipi`: Hareket tipi (Giriş/Çıkış)
  - `kaynak_tablo`: Kaynak tablo (nereden kaynaklandı)
  - `kaynak_id`: Kaynak kayıt kimliği
  - `miktar`: Miktar
  - `birim_fiyat`: Birim fiyat
- **İlişkiler:**
  - ham_maddeler ← (N:0..1)
  - radyotorler ← (N:0..1)
- **Özellik:** Audit log - tüm stok hareketlerini izler

#### 🧾 **fatura_kalemleri**
- **Amaç:** Müşteri satış fatura kalemlerini saklar
- **Alanlar:**
  - `id` (PK): Kalem kimliği
  - `musteri_id` (FK): Müşteri referansı
  - `radyator_id` (FK): Radyatör referansı
  - `miktar`: Satılan miktar
  - `birim_fiyat`: Satış fiyatı
  - `tarih`: Satış tarihi
  - `fatura_no`: Fatura numarası
- **İlişkiler:**
  - musteriler ← (N:1)
  - radyotorler ← (N:1)

#### 📋 **kalan_hammadde_kanit**
- **Amaç:** Fabrikada kullanılan hammaddelerin kanıt tablosu
- **Alanlar:**
  - `id` (PK): Kayıt kimliği
  - `irsaliye_id` (FK): İrsaliye referansı
  - `radyator_id` (FK): Radyatör referansı
  - `hammadde_id` (FK): Hammadde referansı
  - `kullanilan_miktar`: Kullanılan miktar
  - `birim`: Birim
  - `tarih`: İşlem tarihi
- **İlişkiler:**
  - uretim_irsaliyeleri ← (N:1)
  - radyotorler ← (N:1)
  - ham_maddeler ← (N:1)
- **Özellik:** Üretimde kullanılan hammaddeleri detaylı takip eder

## 🔄 Veri Akışı

### 1. Hammadde Tedarik Süreci
```
[Tedarikçi] → satinalma_hareketleri → ham_maddeler (depo_stok ↑)
                                   ↓
                            stok_hareketleri (log)
```

### 2. Üretim Çıkış Süreci (Hammadde Fabrikaya)
```
ham_maddeler (depo_stok ↓, fabrika_stok ↑) ← irsaliye_kalemleri ← uretim_irsaliyeleri (ÇIKIŞ)
                                          ↓
                                   stok_hareketleri (log)
```

### 3. Üretim Giriş Süreci (Radyatör Depoya)
```
uretim_irsaliyeleri (GİRİŞ) → irsaliye_kalemleri → radyotorler (stok ↑)
                                                ↓
                                         stok_hareketleri (log)
                                                ↓
                          maliyet_dosyasi → ham_maddeler (fabrika_stok ↓)
                                                ↓
                                    kalan_hammadde_kanit (kanıt)
```

### 4. Satış Süreci
```
[Müşteri] → fatura_kalemleri → radyotorler (stok ↓)
                             ↓
                      stok_hareketleri (log)
```

## 🎨 ER Diyagramı Görseli

README.md dosyasındaki ASCII diyagram temel ilişkileri göstermektedir. Detaylı görsel ER diyagramı için aşağıdaki araçlardan biri kullanılabilir:

### Önerilen Araçlar:
1. **MySQL Workbench** - Reverse engineering ile veritabanından otomatik diyagram oluşturma
2. **dbdiagram.io** - Online ER diyagram tasarlama
3. **Draw.io** - Ücretsiz diyagram çizim aracı
4. **Lucidchart** - Profesyonel diyagram tasarımı

### MySQL Workbench ile ER Diyagramı Oluşturma:
```
1. MySQL Workbench'i açın
2. Database → Reverse Engineer seçin
3. Veritabanı bağlantınızı yapın
4. caloenergia_vt veritabanını seçin
5. Execute → ER diyagramı otomatik oluşturulur
6. File → Export → Export as PNG/PDF
```

## 📐 Veritabanı Tasarım Prensipleri

### Normalizasyon:
- **1NF (First Normal Form):** Tüm tablolar atomik değerler içerir ✅
- **2NF (Second Normal Form):** Kısmi bağımlılıklar yoktur ✅
- **3NF (Third Normal Form):** Geçişli bağımlılıklar yoktur ✅

### Index Stratejisi:
- Primary Key'ler otomatik index'lenir
- Foreign Key'ler için index oluşturulması önerilir
- Sık sorgulanan kolonlar (fatura_no, irsaliye_no) için index

### Veri Bütünlüğü:
- **Referential Integrity:** Foreign Key constraint'ler
- **Domain Integrity:** CHECK constraint'ler
- **Entity Integrity:** PRIMARY KEY constraint'ler
- **Business Rules:** Trigger ve stored procedure'ler

## 🔒 Güvenlik ve İzinler

### Önerilen Kullanıcı Rolleri:
```sql
-- Admin: Tüm yetkiler
GRANT ALL PRIVILEGES ON caloenergia_vt.* TO 'admin_user'@'localhost';

-- Operator: CRUD yetkisi
GRANT SELECT, INSERT, UPDATE, DELETE ON caloenergia_vt.* TO 'operator_user'@'localhost';

-- Reporter: Sadece okuma yetkisi
GRANT SELECT ON caloenergia_vt.* TO 'reporter_user'@'localhost';
```

## 📊 Performans Optimizasyonu

### Önerilen Index'ler:
```sql
-- Sık kullanılan sorgular için
CREATE INDEX idx_satinalma_tarih ON satinalma_hareketleri(alim_tarihi);
CREATE INDEX idx_irsaliye_tarih ON uretim_irsaliyeleri(tarih);
CREATE INDEX idx_stok_tarih ON stok_hareketleri(tarih_saat);
CREATE INDEX idx_fatura_no ON satinalma_hareketleri(fatura_no);
CREATE INDEX idx_irsaliye_no ON uretim_irsaliyeleri(irsaliye_no);

-- Foreign key index'leri
CREATE INDEX idx_fatura_musteri ON fatura_kalemleri(musteri_id);
CREATE INDEX idx_fatura_radyator ON fatura_kalemleri(radyator_id);
CREATE INDEX idx_satinalma_tedarikci ON satinalma_hareketleri(tedarikci_id);
```

---

**Not:** Bu ER diyagramı, projenin akademik gereksinimlerini karşılamak üzere hazırlanmıştır. Gerçek üretim ortamında ek optimizasyonlar gerekebilir.

**Hazırlayan:** [Öğrenci Adı]  
**Tarih:** 14 Ocak 2026  
**Ders:** Sunucu Tabanlı Programlama
