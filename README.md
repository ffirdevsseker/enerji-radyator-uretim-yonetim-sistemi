# Enerji Radyatör Üretim Yönetim Sistemi

## 📋 Proje Bilgileri

**Ders:** Sunucu Tabanlı Programlama  
**Konu:** MVC Mimarisi ile RESTful API Tasarımı  
**Geliştirme Dili/Çatısı:** Node.js (Express.js)  
**Veritabanı:** MySQL  
**Mimari:** MVC (Model-View-Controller)

## 🎯 Proje Amacı

Bu proje, bir radyatör üretim şirketinin iş süreçlerini yönetmek için geliştirilmiş kapsamlı bir web uygulamasıdır. Proje, MVC mimarisine sıkı şekilde uygun olarak tasarlanmış ve RESTful API prensiplerine göre yapılandırılmıştır.

### Temel İşlevler:
- **Müşteri ve Tedarikçi Yönetimi:** Müşteri ve tedarikçi kayıtlarının tutulması
- **Hammadde Alım Yönetimi:** Tedarikçilerden hammadde satın alma işlemlerinin takibi
- **Üretim Yönetimi:** Fabrikaya hammadde çıkışı ve radyatör girişi irsaliyelerinin yönetimi
- **Stok Takibi:** Hammadde ve radyatör stoklarının gerçek zamanlı takibi
- **Maliyet Hesaplama:** Radyatör üretim maliyetlerinin detaylı hesaplanması
- **Raporlama:** Çeşitli iş raporlarının oluşturulması

## 🏗️ Senaryo Tanımı

### İş Akışı:

1. **Hammadde Tedarik Aşaması:**
   - Tedarikçilerden hammadde satın alınır
   - Fatura ve irsaliye bilgileri kaydedilir
   - Hammaddeler depo stoğuna eklenir

2. **Üretim Aşaması:**
   - Depodan fabrikaya hammadde çıkışı yapılır (ÇIKIŞ İrsaliyesi)
   - Fabrikada radyatör üretilir
   - Üretilen radyatörler depoya gönderilir (GİRİŞ İrsaliyesi)
   - Maliyet dosyasına göre kullanılan hammaddeler fabrika stoğundan düşülür

3. **Satış Aşaması:**
   - Müşterilere radyatör satışı yapılır
   - Faturalama ve irsaliye düzenlenir

### İş Kuralları:

#### ✅ İş Kuralı 1: Stok Yetersizliği Kontrolü
**Kural:** Hammadde depo stoğu yetersizse üretim çıkış irsaliyesi oluşturulamaz.

**Kod Uygulaması:** 
```javascript
// uretimController.js - Satır 98-103
if (stokKontrol[0].depo_stok_miktari < 0) {
    await connection.rollback();
    return res.status(400).json({ 
        success: false, 
        message: `${stokKontrol[0].adi} için yetersiz depo stoku!` 
    });
}
```

**Senaryo:** Bir üretim çıkış irsaliyesi oluşturulurken, hammaddenin depo stoğu kontrol edilir. Eğer istenilen miktar kadar stok yoksa, işlem iptal edilir ve kullanıcıya hata mesajı döndürülür.

#### ✅ İş Kuralı 2: Tekrar Eden İrsaliye Numarası Kontrolü
**Kural:** Aynı irsaliye numarası ile birden fazla irsaliye oluşturulamaz.

**Kod Uygulaması:**
```javascript
// uretimController.js - Satır 23-31
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
```

**Senaryo:** Yeni bir irsaliye oluşturulmadan önce, veritabanında aynı numaralı bir irsaliye olup olmadığı kontrol edilir. Eğer varsa, işlem gerçekleştirilmez ve kullanıcıya uyarı verilir.

#### ✅ İş Kuralı 3: Maliyet Dosyasına Göre Otomatik Hammadde Düşümü
**Kural:** Radyatör üretimi tamamlandığında, maliyet dosyasında tanımlı hammadde miktarları otomatik olarak fabrika stoğundan düşülür.

**Kod Uygulaması:**
```javascript
// uretimController.js - Satır 127-128
await updateFabrikaStokAndKanit(connection, irsaliye_id, radyator_id, miktar);
```

**Senaryo:** Fabrikadan 10 adet radyatör girişi yapıldığında, her radyatör için maliyet dosyasında tanımlı hammadde gereksinimleri (örn: 2 kg alüminyum, 5 adet vida) otomatik olarak fabrika stoğundan düşülür ve kanıt tablosuna kaydedilir.

## 🚀 Kurulum Adımları

### Gereksinimler
- Node.js (v14 veya üzeri)
- MySQL (v8.0 veya üzeri)
- npm veya yarn paket yöneticisi

### 1. Projeyi İndirin
```bash
git clone https://github.com/kullanici_adi/enerji-uretim-sistemi.git
cd enerji-uretim-sistemi
```

### 2. Backend Kurulumu
```bash
cd backend
npm install
```

### 3. Veritabanı Kurulumu

MySQL'de yeni bir veritabanı oluşturun:
```sql
CREATE DATABASE caloenergia_vt CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
```

Veritabanı yapısını oluşturun:
```bash
mysql -u root -p caloenergia_vt < models/database_structure.sql
```

### 4. Ortam Değişkenlerini Ayarlayın

`.env.example` dosyasını `.env` olarak kopyalayın ve kendi bilgilerinizle doldurun:
```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=caloenergia_vt
DB_PORT=3306
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

### 5. Sunucuyu Başlatın

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### 6. Uygulamayı Açın
Tarayıcınızda `http://localhost:5000` adresine gidin.

**Varsayılan Giriş Bilgileri:**
- Kullanıcı Adı: `admin`
- Şifre: `admin123`

## 📂 Proje Klasör Yapısı

```
enerji-uretim-sistemi/
├── backend/                      # Backend uygulaması (MVC)
│   ├── config/                   # Yapılandırma dosyaları
│   │   └── database.js           # MySQL bağlantı havuzu
│   ├── controllers/              # Controller katmanı (İş mantığı)
│   │   ├── authController.js     # Kimlik doğrulama işlemleri
│   │   ├── kayitlarController.js # Kayıtlar ve dashboard
│   │   ├── islemlerController.js # Hammadde alımları ve satışlar
│   │   ├── uretimController.js   # Üretim irsaliyeleri
│   │   └── maliyetDosyasıController.js # Maliyet hesaplamaları
│   ├── models/                   # Model katmanı (Veri yapısı)
│   │   └── database_structure.sql # Veritabanı şeması
│   ├── routes/                   # Route katmanı (API endpoint'leri)
│   │   ├── authRoutes.js         # Auth endpoint'leri
│   │   ├── kayitlarRoutes.js     # Kayıtlar endpoint'leri
│   │   ├── islemlerRoutes.js     # İşlemler endpoint'leri
│   │   ├── uretimRoutes.js       # Üretim endpoint'leri
│   │   └── maliyetDosyasıRoutes.js # Maliyet endpoint'leri
│   ├── middleware/               # Middleware katmanı
│   │   └── auth.js               # JWT kimlik doğrulama
│   ├── .env.example              # Örnek ortam değişkenleri
│   ├── package.json              # Backend bağımlılıkları
│   └── server.js                 # Ana sunucu dosyası
├── frontend/                     # Frontend uygulaması (View)
│   ├── assets/                   # Statik dosyalar
│   │   ├── css/                  # CSS dosyaları
│   │   ├── images/               # Resim dosyaları
│   │   └── js/                   # Frontend JavaScript
│   ├── components/               # Yeniden kullanılabilir bileşenler
│   │   ├── header.html
│   │   ├── header.css
│   │   └── header.js
│   └── pages/                    # HTML sayfaları
│       ├── login.html            # Giriş sayfası
│       ├── kayitlar.html         # Dashboard sayfası
│       ├── islemler.html         # İşlemler sayfası
│       ├── uretim.html           # Üretim sayfası
│       └── maliyet-dosyalari.html # Maliyet sayfası
├── .gitignore                    # Git ignore dosyası
├── README.md                     # Proje dokümantasyonu
├── ER_DIAGRAM.md                 # ER Diyagramı detaylı açıklaması
└── TESLIM_KONTROL.md             # Teslim kontrol listesi
```

## 🔌 API Endpoint Listesi

### 🔐 Kimlik Doğrulama (Authentication)
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı | ❌ |
| POST | `/api/auth/login` | Kullanıcı girişi (JWT token döner) | ❌ |

### 📊 Kayıtlar (Dashboard)
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/api/kayitlar/data` | Dashboard özet verileri | ✅ |
| GET | `/api/kayitlar/records` | Tüm kayıtlar listesi | ✅ |
| POST | `/api/kayitlar/contact` | İletişim formu gönderimi | ✅ |

### 🏭 Hammadde Alımları ve İşlemler
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/api/islemler/ham-madde-alimlari` | Ham madde alımlarını listele | ✅ |
| POST | `/api/islemler/ham-madde-alimi` | Yeni ham madde alımı oluştur | ✅ |
| PUT | `/api/islemler/ham-madde-alimi/:id` | Ham madde alımını güncelle | ✅ |
| DELETE | `/api/islemler/ham-madde-alimi/:id` | Ham madde alımını sil | ✅ |
| GET | `/api/islemler/tedarikciler` | Tedarikçi listesi | ✅ |
| POST | `/api/islemler/tedarikci` | Yeni tedarikçi ekle | ✅ |
| GET | `/api/islemler/hammaddeler` | Hammadde listesi | ✅ |
| POST | `/api/islemler/hammadde` | Yeni hammadde ekle | ✅ |
| GET | `/api/islemler/faturalar` | Fatura listesi | ✅ |

### 🏗️ Üretim İşlemleri
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/api/uretim/next-irsaliye-no` | Sonraki irsaliye numarasını al | ✅ |
| POST | `/api/uretim/irsaliye` | Yeni irsaliye oluştur (ÇIKIŞ/GİRİŞ) | ✅ |
| GET | `/api/uretim/irsaliyeler` | Tüm irsaliyeleri listele | ✅ |
| GET | `/api/uretim/irsaliye/:id` | İrsaliye detayını getir | ✅ |
| DELETE | `/api/uretim/irsaliye/:id` | İrsaliye sil | ✅ |
| GET | `/api/uretim/hammaddeler` | Hammadde listesi (üretim için) | ✅ |
| GET | `/api/uretim/radyatorler` | Radyatör listesi | ✅ |
| GET | `/api/uretim/kalan-hammaddeler` | Fabrikadaki kalan hammaddeler | ✅ |
| GET | `/api/uretim/maliyet-ozeti` | Maliyet özeti raporu | ✅ |
| GET | `/api/uretim/radyator-maliyet/:radyator_id` | Radyatör maliyet dosyası | ✅ |

### 💰 Maliyet Dosyaları
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/api/radyatorler` | Radyatör listesi | ✅ |
| POST | `/api/radyator` | Yeni radyatör ekle | ✅ |
| GET | `/api/hammaddeler` | Hammadde listesi | ✅ |
| GET | `/api/maliyet/:id` | Radyatörün maliyet dosyasını getir | ✅ |
| POST | `/api/maliyet/:id` | Radyatörün maliyet dosyasını kaydet | ✅ |
| DELETE | `/api/maliyet/:id` | Radyatörün maliyet dosyasını sil | ✅ |

### 📝 İstek/Yanıt Örnekleri

#### Yeni İrsaliye Oluşturma
**İstek:**
```http
POST /api/uretim/irsaliye
Content-Type: application/json
Authorization: Bearer <token>

{
  "irsaliye_no": "URT-2026-001",
  "tarih": "2026-01-14",
  "irsaliye_tipi": "ÇIKIŞ",
  "aciklama": "Fabrikaya hammadde sevkiyatı",
  "kalemler": [
    {
      "urun_tipi": "Hammadde",
      "hammadde_id": 5,
      "miktar": 100,
      "birim_fiyat": 25.50
    }
  ]
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "İrsaliye başarıyla oluşturuldu!",
  "irsaliye_id": 42
}
```

#### Hammadde Alımı Oluşturma
**İstek:**
```http
POST /api/islemler/ham-madde-alimi
Content-Type: application/json
Authorization: Bearer <token>

{
  "tedarikci_id": 3,
  "alim_tarihi": "2026-01-14",
  "fatura_no": "FT-2026-001",
  "kalemler": [
    {
      "hammadde_id": 5,
      "miktar": 500,
      "birim_fiyat": 22.00
    }
  ]
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Ham madde alımı başarıyla oluşturuldu!",
  "fatura_id": 18
}
```

## 📊 ER Diyagramı

> 📖 **Detaylı ER Diyagramı için:** [ER_DIAGRAM.md](ER_DIAGRAM.md) dosyasına bakınız. Bu dosyada tüm tablolar, ilişkiler, veri akışları ve görsel diyagram oluşturma talimatları detaylı olarak açıklanmıştır.

## 🏛️ MVC Mimarisi Uygulaması

Bu proje katı bir şekilde MVC (Model-View-Controller) mimarisine uygun olarak tasarlanmıştır:

### 📦 Model (Veri Katmanı)
- **Konum:** `backend/models/database_structure.sql`
- **Görev:** Veritabanı şemasını tanımlar, tablo yapılarını ve ilişkileri belirler
- **İçerik:** SQL tablolar, foreign key'ler, constraint'ler

### 🎮 Controller (İş Mantığı Katmanı)
- **Konum:** `backend/controllers/`
- **Görev:** HTTP isteklerini işler, iş mantığını çalıştırır, veritabanı sorguları yapar
- **Dosyalar:**
  - `authController.js` - Kimlik doğrulama işlemleri
  - `kayitlarController.js` - Dashboard ve kayıt işlemleri
  - `islemlerController.js` - Hammadde alım/satış işlemleri
  - `uretimController.js` - Üretim irsaliye işlemleri
  - `maliyetDosyasıController.js` - Maliyet hesaplama işlemleri

### 🗺️ Routes (Yönlendirme Katmanı)
- **Konum:** `backend/routes/`
- **Görev:** API endpoint'lerini tanımlar, controller fonksiyonlarına yönlendirir
- **Middleware:** JWT authentication middleware ile route koruması

### 👁️ View (Görünüm Katmanı)
- **Konum:** `frontend/`
- **Görev:** Kullanıcı arayüzünü gösterir, AJAX ile API'lere istek gönderir
- **Teknoloji:** HTML, CSS, Vanilla JavaScript

### 🔧 Config (Yapılandırma Katmanı)
- **Konum:** `backend/config/database.js`
- **Görev:** Veritabanı bağlantısını yapılandırır, connection pool yönetir

## 🔒 Güvenlik

- **JWT Authentication:** Tüm API endpoint'leri JWT token ile korunmaktadır
- **Password Hashing:** Kullanıcı şifreleri bcrypt ile hashlenir
- **SQL Injection Prevention:** Prepared statements kullanılır
- **CORS:** Cross-origin istekler kontrol edilir
- **Environment Variables:** Hassas bilgiler .env dosyasında tutulur

## 🧪 CRUD İşlemleri

Proje, aşağıdaki varlıklar için tam CRUD (Create, Read, Update, Delete) işlemlerini destekler:

### ✅ Hammadde Alımları
- **Create:** Yeni hammadde alımı oluşturma
- **Read:** Alımları listeleme ve filtreleme
- **Update:** Alım bilgilerini güncelleme
- **Delete:** Alım kaydını silme

### ✅ Üretim İrsaliyeleri
- **Create:** Yeni irsaliye oluşturma (ÇIKIŞ/GİRİŞ)
- **Read:** İrsaliyeleri listeleme ve detay görüntüleme
- **Update:** İrsaliye bilgilerini güncelleme
- **Delete:** İrsaliye silme

### ✅ Maliyet Dosyaları
- **Create:** Yeni radyatör maliyet dosyası oluşturma
- **Read:** Maliyet dosyasını görüntüleme
- **Update:** Maliyet kalemlerini güncelleme
- **Delete:** Maliyet dosyasını silme

### ✅ Tedarikçi ve Hammadde Yönetimi
- **Create:** Yeni tedarikçi/hammadde ekleme
- **Read:** Listeleme ve arama
- **Update:** Bilgi güncelleme
- **Delete:** Kayıt silme

## 📈 Özellikler

- ✅ Tam RESTful API tasarımı
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Transaction yönetimi (ACID prensiplerine uygun)
- ✅ Hata yönetimi ve loglama
- ✅ Responsive tasarım
- ✅ Gerçek zamanlı stok takibi
- ✅ Otomatik maliyet hesaplama
- ✅ Raporlama ve filtreleme
- ✅ İş kurallarının kod seviyesinde uygulanması

## 🛠️ Teknolojiler

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL2** - MySQL veritabanı driver
- **JWT** - Token tabanlı kimlik doğrulama
- **bcryptjs** - Şifre hashleme
- **dotenv** - Environment variable yönetimi
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling
- **JavaScript (ES6+)** - Client-side scripting
- **Fetch API** - AJAX istekleri

