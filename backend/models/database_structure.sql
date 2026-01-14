-- Enerji Mevcut Veritabanı Yapısı
-- Mevcut tablolar: fatura_kalemleri, ham_maddeler, irsaliye_kalemleri, kalan_hammadde_kanit,
-- kulanicilar, maliyet_dosyasi, musteriler, radyotorler, satinalma_hareketleri, 
-- stok_hareketleri, tedarikciler, uretim_irsaliyeleri

-- Web sitesi için ek tablolar (mevcut veritabanına eklenecek)

-- Şirket Bilgileri Tablosu
CREATE TABLE IF NOT EXISTS company_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL DEFAULT 'Enerji',
    description TEXT,
    mission TEXT,
    vision TEXT,
    founded_year YEAR DEFAULT 2020,
    address TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Ekip Üyeleri Tablosu
CREATE TABLE IF NOT EXISTS team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    bio TEXT,
    photo_url VARCHAR(500),
    email VARCHAR(255),
    linkedin_url VARCHAR(500),
    position_order INT DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Hizmetler Tablosu
CREATE TABLE IF NOT EXISTS services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10,2),
    duration VARCHAR(100),
    features JSON,
    image_url VARCHAR(500),
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- İletişim Bilgileri Tablosu
CREATE TABLE IF NOT EXISTS contact_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    working_hours TEXT,
    map_coordinates VARCHAR(100),
    social_media JSON,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- İletişim Mesajları Tablosu
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(500),
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied', 'closed') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Hizmet Talepleri Tablosu
CREATE TABLE IF NOT EXISTS service_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    service_id INT,
    message TEXT,
    status ENUM('new', 'processing', 'completed', 'cancelled') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Öne Çıkan İçerikler Tablosu
CREATE TABLE IF NOT EXISTS featured_content (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Örnek Veri Ekleme

-- Şirket Bilgisi
INSERT INTO company_info (name, description, mission, vision, founded_year, address) VALUES 
('Enerji', 'Radyatör üretim ve enerji verimliliği konusunda uzman firma', 'Kaliteli radyatör üretimi ile enerji tasarrufu sağlamak', 'Radyatör sektöründe lider olmak', 2020, 'İzmir, Türkiye')
ON DUPLICATE KEY UPDATE id=id;

-- Hizmetler
INSERT INTO services (name, description, short_description, price) VALUES 
('Radyatör Üretimi', 'Özel ölçülerde kaliteli radyatör üretimi', 'İhtiyacınıza özel radyatör çözümleri', 0.00),
('Toptan Satış', 'Bayiler için toptan radyatör satışı', 'Bayilere özel fiyatlarla radyatör tedariki', 0.00),
('Teknik Destek', 'Radyatör montaj ve bakım hizmetleri', 'Profesyonel montaj ve bakım desteği', 0.00)
ON DUPLICATE KEY UPDATE id=id;

-- İletişim Bilgileri
INSERT INTO contact_info (phone, email, address, working_hours) VALUES 
('+90 232 XXX XX XX', 'info@enerji.com', 'İzmir, Türkiye', 'Pazartesi-Cuma: 08:00-17:00')
ON DUPLICATE KEY UPDATE id=id;

-- Ekip Üyeleri
INSERT INTO team_members (name, position, bio, position_order) VALUES 
('Genel Müdür', 'Genel Müdür', 'Radyatör sektöründe uzun yıllara dayanan deneyim', 1),
('Üretim Müdürü', 'Üretim Müdürü', 'Kalite kontrol ve üretim süreçlerinden sorumlu', 2),
('Satış Müdürü', 'Satış Müdürü', 'Müşteri ilişkileri ve satış operasyonları uzmanı', 3)
ON DUPLICATE KEY UPDATE id=id;

-- Öne Çıkan İçerikler
INSERT INTO featured_content (title, content, display_order) VALUES 
('Kaliteli Üretim', 'Modern tesislerde üretilen kaliteli radyatörler', 1),
('Hızlı Teslimat', 'Stoktan hızlı teslimat imkanı', 2),
('Uygun Fiyat', 'Rekabetçi fiyatlarla kaliteli ürünler', 3)
ON DUPLICATE KEY UPDATE id=id;