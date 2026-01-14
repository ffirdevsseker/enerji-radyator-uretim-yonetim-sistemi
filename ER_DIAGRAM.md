# ER Diyagramı (Entity–Relationship Diagram)

Bu doküman, **Enerji Radyatör Üretim Yönetim Sistemi** veritabanının
Entity–Relationship (ER) diyagramını, tablo yapılarını, ilişkileri ve
veri akışlarını açıklamak amacıyla hazırlanmıştır.

ER diyagramı; satın alma, üretim, stok, maliyet ve satış süreçlerinin
tamamını kapsayacak şekilde tasarlanmıştır.

---

## 📊 Genel Veritabanı Yapısı

Veritabanı aşağıdaki ana süreçleri destekler:

- Kullanıcı yönetimi
- Hammadde tedariki
- Radyatör üretimi
- Maliyet (reçete) yönetimi
- Stok giriş–çıkış takibi
- Satış ve faturalama
- Üretimde kullanılan hammaddelerin kanıtlanması

Toplamda **12+ tablo** içeren ilişkisel bir yapı kullanılmaktadır.

---

## 🧩 Tabloların Genel Listesi

### Kimlik ve Tanım Tabloları
- **kullanicilar**
- **musteriler**
- **tedarikciler**

### Ürün ve Stok Tabloları
- **ham_maddeler**
- **radyotorler**
- **stok_hareketleri**

### Satın Alma Süreci
- **satinalma_faturalar**
- **satinalma_hareketleri**

### Üretim Süreci
- **uretim_irsaliyeleri**
- **irsaliye_kalemleri**
- **kalan_hammadde_kanit**

### Satış Süreci
- **faturalar**
- **fatura_kalemleri**

### Maliyet Yönetimi
- **maliyet_dosyalari**

---

## 🔗 Tablo İlişkileri (Cardinality)

### 1️⃣ Kullanıcılar
kullanicilar

yaml
Kodu kopyala
- Sistem kullanıcılarını tutar
- Diğer tablolarla doğrudan ilişki kurulmamıştır
- Yetkilendirme ve işlem takibi için kullanılır

---

### 2️⃣ Müşteri – Satış İlişkisi
musteriler (1) ───< faturalar (N)
faturalar (1) ───< fatura_kalemleri (N)
fatura_kalemleri (N) >─── (1) radyotorler

yaml
Kodu kopyala

- Bir müşteri birden fazla satış faturası oluşturabilir
- Her fatura birden fazla satış kalemi içerebilir
- Her fatura kalemi yalnızca **bir radyatör** içerir

---

### 3️⃣ Tedarikçi – Satın Alma İlişkisi
tedarikciler (1) ───< satinalma_faturalar (N)
satinalma_faturalar (1) ───< satinalma_hareketleri (N)
satinalma_hareketleri (N) >─── (1) ham_maddeler

yaml
Kodu kopyala

- Bir tedarikçiden birden fazla satın alma faturası kesilebilir
- Her satın alma faturası birden fazla hammadde satırı içerebilir
- Her satın alma hareketi yalnızca bir hammaddeye aittir

---

### 4️⃣ Hammadde ve Radyatör Tanımları
ham_maddeler (1) ───< stok_hareketleri (N)
radyotorler (1) ───< stok_hareketleri (N)

yaml
Kodu kopyala

- Hammaddeler ve radyatörler stok takibine tabidir
- Tüm stok giriş–çıkışları **stok_hareketleri** tablosunda loglanır

---

### 5️⃣ Üretim İrsaliyesi İlişkileri
uretim_irsaliyeleri (1) ───< irsaliye_kalemleri (N)

irsaliye_kalemleri (N) >─── (0..1) ham_maddeler
irsaliye_kalemleri (N) >─── (0..1) radyotorler

yaml
Kodu kopyala

- Bir üretim irsaliyesi birden fazla kalem içerebilir
- Her irsaliye kalemi **ya hammadde ya radyatör** içerir
- Aynı kalemde iki ürün tipi birlikte bulunamaz

---

### 6️⃣ Maliyet Dosyası (Üretim Reçetesi)
radyotorler (1) ───< maliyet_dosyalari (N)
ham_maddeler (1) ───< maliyet_dosyalari (N)

yaml
Kodu kopyala

- Maliyet dosyası, radyatör üretiminde kullanılan hammaddeleri tanımlar
- Her kayıt:
  - Bir radyatöre
  - Bir hammaddeye
  - Kullanılan miktara
  - Maliyet bilgisine sahiptir

---

### 7️⃣ Üretimde Kullanılan Hammadde Kanıtı
kalan_hammadde_kanit (N) >─── (1) ham_maddeler
kalan_hammadde_kanit (N) >─── (1) uretim_irsaliyeleri

yaml
Kodu kopyala

- Üretim sırasında fiilen kullanılan hammaddeler bu tabloda kayıt altına alınır
- Üretim irsaliyesi ile birebir ilişkilidir
- Denetim ve raporlama amacıyla kullanılır

---

## ⚙️ İş Kuralları (Business Rules)

### ✅ İş Kuralı 1: İrsaliye Numarası Tekrar Edemez
- `uretim_irsaliyeleri.irsaliye_no` alanı **benzersizdir**
- Aynı irsaliye numarasıyla ikinci kayıt oluşturulamaz

---

### ✅ İş Kuralı 2: İrsaliye Kaleminde Ürün Tipi Tutarlılığı
- `urun_tipi = 'Hammadde'` ise:
  - `hammadde_id` **dolu**
  - `radyator_id` **boş** olmalıdır
- `urun_tipi = 'Radyatör'` ise:
  - `radyator_id` **dolu**
  - `hammadde_id` **boş** olmalıdır

---

### ✅ İş Kuralı 3: Üretim Sonrası Otomatik Hammadde Düşümü
- Radyatör üretimi tamamlandığında:
  - İlgili radyatörün **maliyet_dosyalari** kayıtları baz alınır
  - Gerekli hammaddeler **fabrika stoklarından** düşülür
  - İşlem **stok_hareketleri** tablosuna loglanır
  - Kullanılan miktarlar **kalan_hammadde_kanit** tablosuna kaydedilir

---

## 🔄 Veri Akış Senaryoları

### 1️⃣ Hammadde Satın Alma Akışı
Tedarikçi
→ satinalma_faturalar
→ satinalma_hareketleri
→ ham_maddeler (stok ↑)
→ stok_hareketleri (log)

yaml
Kodu kopyala

---

### 2️⃣ Üretime Hammadde Çıkışı
ham_maddeler (depo stok ↓ / fabrika stok ↑)
← irsaliye_kalemleri
← uretim_irsaliyeleri (ÇIKIŞ)
→ stok_hareketleri (log)

yaml
Kodu kopyala

---

### 3️⃣ Üretim ve Radyatör Girişi
uretim_irsaliyeleri (GİRİŞ)
→ irsaliye_kalemleri
→ radyotorler (stok ↑)
→ maliyet_dosyalari
→ ham_maddeler (fabrika stok ↓)
→ kalan_hammadde_kanit
→ stok_hareketleri (log)

yaml
Kodu kopyala

---

### 4️⃣ Satış Akışı
Müşteri
→ faturalar
→ fatura_kalemleri
→ radyotorler (stok ↓)
→ stok_hareketleri (log)

yaml
Kodu kopyala

---

## 🎨 ER Diyagramı Görseli

Bu dokümanda anlatılan ilişkilerin görsel karşılığı aşağıdaki dosyada yer almaktadır:

📎 **Sunucu_er_diyagrami.png**
