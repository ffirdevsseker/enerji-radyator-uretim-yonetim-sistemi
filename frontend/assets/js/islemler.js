// İşlemler Sayfası JavaScript

// Global değişkenler
let currentTab = 'ham-madde'; // 'ham-madde' veya 'radyator'
let currentData = [];
let tedarikciler = [];
let hamMaddeler = [];
let musteriler = [];
let radyatorler = [];
let faturaNumaralari = [];

const API_BASE_URL = 'http://localhost:5000/api';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('İşlemler sayfası yüklendi');
    
    // Token kontrolü
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Event listener'ları başlat
    initializeEventListeners();
    
    // İlk verileri yükle
    loadInitialData();
});

// Event listener'ları başlat
function initializeEventListeners() {
    // Sekme değiştirme
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // Filtre butonu
    document.getElementById('filterBtn').addEventListener('click', applyFilters);
    
    // Filtreleri temizle
    document.getElementById('clearFilterBtn').addEventListener('click', clearFilters);
    
    // Yeni kayıt ekle
    document.getElementById('addNewBtn').addEventListener('click', openAddModal);
    
    // Modal kapatma butonları
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', () => closeModal(button.dataset.modal));
    });
    
    document.querySelectorAll('[data-close]').forEach(button => {
        button.addEventListener('click', () => closeModal(button.dataset.close));
    });
    
    // Modal dışına tıklayınca kapat
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Form submit olayları
    document.getElementById('hamMaddeForm').addEventListener('submit', handleHamMaddeSubmit);
    document.getElementById('radyatorForm').addEventListener('submit', handleRadyatorSubmit);
    
    // Bugünün tarihini varsayılan olarak ayarla
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('hamMaddeTarih').value = today;
    document.getElementById('radyatorTarih').value = today;
    
    // Custom dropdown event listeners
    initializeCustomDropdown();
}

// İlk verileri yükle
async function loadInitialData() {
    try {
        showLoading(true);
        
        // Dropdown verilerini yükle
        await Promise.all([
            loadTedarikciler(),
            loadHamMaddeler(),
            loadMusteriler(),
            loadRadyatorler(),
            loadFaturaNumaralari()
        ]);
        
        // İlk sekme (ham-madde) için dropdown'ları doldur
        if (currentTab === 'ham-madde') {
            const dataWithField = tedarikciler.map(t => ({...t, tedarikci_adi: t.adi}));
            populateFirmaDropdown(dataWithField, 'tedarikci_adi');
            const hamMaddeData = hamMaddeler.map(h => ({...h, ham_madde_adi: h.adi}));
            populateUrunDropdown(hamMaddeData, 'ham_madde_adi');
        }
        
        // Tarih filtrelerini boş bırak (tüm verileri göster)
        document.getElementById('baslangicTarihi').value = '';
        document.getElementById('bitisTarihi').value = '';
        
        // Ana tabloyu yükle
        await loadTableData();
        
    } catch (error) {
        console.error('İlk veri yükleme hatası:', error);
        showAlert('Veriler yüklenirken bir hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

// Sekme değiştir
function switchTab(tab) {
    currentTab = tab;
    
    // Aktif sekmeyi güncelle
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (tab === 'ham-madde') {
        // Ham Madde sekmesi
        // Custom dropdown için tedarikçileri doldur
        const dataWithField = tedarikciler.map(t => ({...t, tedarikci_adi: t.adi}));
        populateFirmaDropdown(dataWithField, 'tedarikci_adi');
        // Custom dropdown için ham maddeleri doldur
        const hamMaddeData = hamMaddeler.map(h => ({...h, ham_madde_adi: h.adi}));
        populateUrunDropdown(hamMaddeData, 'ham_madde_adi');
    } else {
        // Radyatör sekmesi
        // Custom dropdown için müşterileri doldur
        const musteriData = musteriler.map(m => ({...m, musteri_adi: m.adi}));
        populateFirmaDropdown(musteriData, 'musteri_adi');
        // Custom dropdown için radyatörleri doldur
        const radyatorData = radyatorler.map(r => ({...r, model: r.adi}));
        populateUrunDropdown(radyatorData, 'model');
    }
    
    // Fatura numaralarını sekmeye göre yeniden yükle
    loadFaturaNumaralari();
    
    // Filtreleri temizle ve tabloyu yenile
    clearFilters();
    loadTableData();
}

// Tedarikçileri yükle
async function loadTedarikciler() {
    try {
        const response = await fetch(`${API_BASE_URL}/islemler/tedarikciler`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            tedarikciler = result.data;
            // Modal için normal select
            populateSelect('tedarikcId', tedarikciler, 'id', 'adi');
        }
    } catch (error) {
        console.error('Tedarikçiler yükleme hatası:', error);
    }
}

// Ham maddeleri yükle
async function loadHamMaddeler() {
    try {
        const response = await fetch(`${API_BASE_URL}/islemler/ham-maddeler`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            hamMaddeler = result.data;
            // Modal için normal select
            populateSelect('hamMaddeSelectModal', hamMaddeler, 'id', 'adi');
        }
    } catch (error) {
        console.error('Ham maddeler yükleme hatası:', error);
    }
}

// Müşterileri yükle
async function loadMusteriler() {
    try {
        const response = await fetch(`${API_BASE_URL}/islemler/musteriler`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            musteriler = result.data;
            populateSelect('musteriId', musteriler, 'id', 'adi');
        }
    } catch (error) {
        console.error('Müşteriler yükleme hatası:', error);
    }
}

// Radyatörleri yükle
async function loadRadyatorler() {
    try {
        const response = await fetch(`${API_BASE_URL}/islemler/radyatorler`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            radyatorler = result.data;
            // Modal için normal select
            populateSelect('radyatorSelectModal', radyatorler, 'id', 'adi');
        }
    } catch (error) {
        console.error('Radyatörler yükleme hatası:', error);
    }
}

// Fatura numaralarını yükle
async function loadFaturaNumaralari() {
    try {
        const tip = currentTab; // 'ham-madde' veya 'radyator'
        const response = await fetch(`${API_BASE_URL}/islemler/fatura-numaralari?tip=${tip}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            faturaNumaralari = result.data;
            populateFaturaDatalist(faturaNumaralari);
        }
    } catch (error) {
        console.error('Fatura numaraları yükleme hatası:', error);
    }
}

// Fatura datalist'ini doldur
function populateFaturaDatalist(data) {
    const datalist = document.getElementById('faturaListesi');
    datalist.innerHTML = '';
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.fatura_no;
        datalist.appendChild(option);
    });
}

// Tarih aralığını yükle
async function loadTarihAraligi() {
    try {
        const tip = currentTab; // 'ham-madde' veya 'radyator'
        const response = await fetch(`${API_BASE_URL}/islemler/tarih-araligi?tip=${tip}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success && result.data) {
            // Tarih input'larını doldur (ISO formatını YYYY-MM-DD'ye çevir)
            const baslangicTarih = result.data.enEskiTarih ? result.data.enEskiTarih.split('T')[0] : '';
            const bitisTarih = result.data.enYeniTarih ? result.data.enYeniTarih.split('T')[0] : '';
            
            document.getElementById('baslangicTarihi').value = baslangicTarih;
            document.getElementById('bitisTarihi').value = bitisTarih;
        }
    } catch (error) {
        console.error('Tarih aralığı yükleme hatası:', error);
    }
}

// Select elementini doldur
function populateSelect(selectId, data, valueField, textField) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Mevcut seçenekleri temizle (ilk option hariç)
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Yeni seçenekleri ekle
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueField];
        option.textContent = item[textField];
        select.appendChild(option);
    });
}

// Tablo verilerini yükle
async function loadTableData() {
    try {
        showLoading(true);
        
        const endpoint = currentTab === 'ham-madde' 
            ? '/islemler/ham-madde-alimlari' 
            : '/islemler/radyator-satislari';
        
        // Filtre parametrelerini hazırla
        const params = new URLSearchParams();
        
        const baslangicTarihi = document.getElementById('baslangicTarihi').value;
        const bitisTarihi = document.getElementById('bitisTarihi').value;
        const firmaIds = getSelectedFirmaIds(); // Çoklu seçim
        const urunIds = getSelectedUrunIds(); // Çoklu seçim
        const faturaNo = document.getElementById('faturaNo').value;
        
        if (baslangicTarihi) params.append('baslangicTarihi', baslangicTarihi);
        if (bitisTarihi) params.append('bitisTarihi', bitisTarihi);
        
        if (currentTab === 'ham-madde') {
            // Çoklu tedarikçi seçimi - virgülle ayrılmış
            if (firmaIds.length > 0) params.append('tedarikcId', firmaIds.join(','));
            // Çoklu ham madde seçimi - virgülle ayrılmış
            if (urunIds.length > 0) params.append('hamMaddeId', urunIds.join(','));
        } else {
            // Çoklu müşteri seçimi - virgülle ayrılmış
            if (firmaIds.length > 0) params.append('musteriId', firmaIds.join(','));
            // Çoklu radyatör seçimi - virgülle ayrılmış
            if (urunIds.length > 0) params.append('radyatorId', urunIds.join(','));
        }
        
        if (faturaNo) params.append('faturaNo', faturaNo);
        
        const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentData = result.data;
            renderTable(result.data);
            updateSummary(result.ozet);
        } else {
            showAlert(result.message || 'Veriler yüklenemedi', 'error');
        }
        
    } catch (error) {
        console.error('Tablo yükleme hatası:', error);
        showAlert('Veriler yüklenirken bir hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

// Tabloyu render et
function renderTable(data) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    
    // Başlıkları oluştur
    if (currentTab === 'ham-madde') {
        tableHead.innerHTML = `
            <tr>
                <th>Tarih</th>
                <th>Tedarikçi</th>
                <th>Miktar</th>
                <th>Toplam</th>
                <th>Fatura</th>
                <th>İşlem</th>
            </tr>
        `;
        
        // Satırları oluştur
        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>Henüz kayıt bulunmamaktadır.</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = data.map(item => `
                <tr data-fatura-id="${item.fatura_id || ''}" data-record-id="${item.id || ''}">
                    <td data-label="Tarih">${formatDate(item.tarih)}</td>
                    <td data-label="Tedarikçi">${item.tedarikci_adi || '-'}</td>
                    <td data-label="Miktar">${parseFloat(item.miktar || 0).toFixed(2)} ${item.birim || 'kg'}</td>
                    <td data-label="Toplam">₺${parseFloat(item.toplam_tutar || 0).toFixed(2)}</td>
                    <td data-label="Fatura">${item.fatura_no || '-'}</td>
                    <td data-label="İşlemler" class="col-actions">
                        <button class="more-btn" aria-label="Daha fazla">⋯</button>
                    </td>
                </tr>
            `).join('');
        }
    } else {
        tableHead.innerHTML = `
            <tr>
                <th>Fatura</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Miktar</th>
                <th>Toplam</th>
                <th>İşlem</th>
            </tr>
        `;
        
        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>Henüz kayıt bulunmamaktadır.</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = data.map(item => `
                <tr data-fatura-id="${item.fatura_id || ''}" data-record-id="${item.id || ''}">
                    <td data-label="Fatura">${item.fatura_no || '-'}</td>
                    <td data-label="Tarih">${formatDate(item.tarih)}</td>
                    <td data-label="Müşteri">${item.musteri_adi || '-'}</td>
                    <td data-label="Miktar">${item.miktar || 0} adet</td>
                    <td data-label="Toplam">₺${parseFloat(item.toplam_tutar || 0).toFixed(2)}</td>
                    <td data-label="İşlemler" class="col-actions">
                        <button class="more-btn" aria-label="Daha fazla">⋯</button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

// Özet bilgileri güncelle
function updateSummary(ozet) {
    // Özet bilgileri kaldırıldı, fonksiyon boş bırakıldı
    // İleride gerekirse tekrar eklenebilir
    console.log('Özet:', ozet);
}

// Filtreleri uygula
function applyFilters() {
    loadTableData();
}

// Filtreleri temizle
function clearFilters() {
    // Tarih filtrelerini boş bırak (tüm verileri göster)
    document.getElementById('baslangicTarihi').value = '';
    document.getElementById('bitisTarihi').value = '';
    clearFirmaDropdown(); // Custom dropdown'u temizle
    clearUrunDropdown(); // Custom ürün dropdown'u temizle
    document.getElementById('faturaNo').value = '';
    loadTableData();
}

// Yeni kayıt modalını aç
function openAddModal() {
    if (currentTab === 'ham-madde') {
        document.getElementById('hamMaddeModalTitle').textContent = 'Yeni Ham Madde Alımı';
        document.getElementById('hamMaddeForm').reset();
        document.getElementById('hamMaddeId').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('hamMaddeTarih').value = today;
        openModal('hamMaddeModal');
    } else {
        document.getElementById('radyatorModalTitle').textContent = 'Yeni Radyatör Satışı';
        document.getElementById('radyatorForm').reset();
        document.getElementById('radyatorSatisId').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('radyatorTarih').value = today;
        openModal('radyatorModal');
    }
}

// Modal aç
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Modal kapat
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Ham madde form submit
async function handleHamMaddeSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('hamMaddeId').value;
    const data = {
        tedarikcId: document.getElementById('tedarikcId').value,
        hamMaddeId: document.getElementById('hamMaddeSelectModal').value,
        miktar: document.getElementById('hamMaddeMiktar').value,
        birim: document.getElementById('hamMaddeBirim').value,
        birimFiyat: document.getElementById('hamMaddeBirimFiyat').value,
        faturaNo: document.getElementById('hamMaddeFaturaNo').value,
        tarih: document.getElementById('hamMaddeTarih').value,
        aciklama: document.getElementById('hamMaddeAciklama').value
    };
    
    try {
        const url = id 
            ? `${API_BASE_URL}/islemler/ham-madde-alimlari/${id}`
            : `${API_BASE_URL}/islemler/ham-madde-alimlari`;
        
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            closeModal('hamMaddeModal');
            loadTableData();
        } else {
            showAlert(result.message || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Form submit hatası:', error);
        showAlert('Bir hata oluştu', 'error');
    }
}

// Radyatör form submit
async function handleRadyatorSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('radyatorSatisId').value;
    const data = {
        musteriId: document.getElementById('musteriId').value,
        radyatorId: document.getElementById('radyatorSelectModal').value,
        miktar: document.getElementById('radyatorMiktar').value,
        birimFiyat: document.getElementById('radyatorBirimFiyat').value,
        faturaNo: document.getElementById('radyatorFaturaNo').value,
        tarih: document.getElementById('radyatorTarih').value
    };
    
    try {
        const url = id 
            ? `${API_BASE_URL}/islemler/radyator-satislari/${id}`
            : `${API_BASE_URL}/islemler/radyator-satislari`;
        
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            closeModal('radyatorModal');
            loadTableData();
        } else {
            showAlert(result.message || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Form submit hatası:', error);
        showAlert('Bir hata oluştu', 'error');
    }
}

// Kayıt sil
async function deleteRecord(id) {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const endpoint = currentTab === 'ham-madde' 
            ? `/islemler/ham-madde-alimlari/${id}`
            : `/islemler/radyator-satislari/${id}`;
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            loadTableData();
        } else {
            showAlert(result.message || 'Silme işlemi başarısız', 'error');
        }
    } catch (error) {
        console.error('Silme hatası:', error);
        showAlert('Bir hata oluştu', 'error');
    }
}

// İşlem detayını görüntüle
async function viewDetail(kaynakTablo, kaynakId) {
    try {
        const response = await fetch(`${API_BASE_URL}/islemler/detay/${kaynakTablo}/${kaynakId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            const detayContent = document.getElementById('detayContent');
            
            detayContent.innerHTML = `
                <div class="detay-row">
                    <div class="detay-label">Hareket Tipi:</div>
                    <div class="detay-value">${data.hareket_tipi}</div>
                </div>
                <div class="detay-row">
                    <div class="detay-label">Ürün Tipi:</div>
                    <div class="detay-value">${data.urun_tipi}</div>
                </div>
                <div class="detay-row">
                    <div class="detay-label">Miktar:</div>
                    <div class="detay-value">${data.miktar}</div>
                </div>
                <div class="detay-row">
                    <div class="detay-label">Tarih:</div>
                    <div class="detay-value">${formatDateTime(data.tarih_saat)}</div>
                </div>
                <div class="detay-row">
                    <div class="detay-label">Kaynak Tablo:</div>
                    <div class="detay-value">${data.kaynak_tablo}</div>
                </div>
                <div class="detay-row">
                    <div class="detay-label">Açıklama:</div>
                    <div class="detay-value">${data.aciklama || '-'}</div>
                </div>
            `;
            
            openModal('detayModal');
        } else {
            showAlert('Detay bilgisi bulunamadı', 'error');
        }
    } catch (error) {
        console.error('Detay görüntüleme hatası:', error);
        showAlert('Bir hata oluştu', 'error');
    }
}

// Fatura detayını görüntüle (YENİ)
async function viewFaturaDetail(tip, faturaId) {
    if (!faturaId) {
        showAlert('Fatura bilgisi bulunamadı', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/islemler/fatura-detayi/${tip}/${faturaId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const { fatura, kalemler, tip: faturaTip } = result.data;
            const detayContent = document.getElementById('detayContent');
            
            // Fatura başlığı
            let firmaAdi = '';
            let firmaInfo = '';
            
            if (faturaTip === 'alim') {
                firmaAdi = fatura.tedarikci_adi || '-';
                firmaInfo = `
                    <div class="info-item">
                        <span class="info-label">Telefon:</span>
                        <span class="info-value">${fatura.tedarikci_telefon || '-'}</span>
                    </div>
                    ${fatura.tedarikci_adres ? `
                    <div class="info-item">
                        <span class="info-label">Adres:</span>
                        <span class="info-value">${fatura.tedarikci_adres}</span>
                    </div>` : ''}
                `;
            } else {
                firmaAdi = fatura.musteri_adi || '-';
                firmaInfo = `
                    <div class="info-item">
                        <span class="info-label">Telefon:</span>
                        <span class="info-value">${fatura.musteri_telefon || '-'}</span>
                    </div>
                    ${fatura.musteri_adres ? `
                    <div class="info-item">
                        <span class="info-label">Adres:</span>
                        <span class="info-value">${fatura.musteri_adres}</span>
                    </div>` : ''}
                `;
            }
            
            // Kalemler tablosu
            let kalemlerHTML = '';
            if (faturaTip === 'alim') {
                kalemlerHTML = kalemler.map((kalem, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${kalem.ham_madde_adi}</td>
                        <td class="text-center">${parseFloat(kalem.miktar).toFixed(2)} ${kalem.birim}</td>
                        <td class="text-right">₺${parseFloat(kalem.birim_fiyat).toFixed(2)}</td>
                        <td class="text-right"><strong>₺${parseFloat(kalem.toplam).toFixed(2)}</strong></td>
                    </tr>
                `).join('');
            } else {
                kalemlerHTML = kalemler.map((kalem, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${kalem.radyator_adi} ${kalem.radyator_olcu ? '(' + kalem.radyator_olcu + ')' : ''}</td>
                        <td class="text-center">${kalem.miktar} adet</td>
                        <td class="text-right">₺${parseFloat(kalem.birim_fiyat).toFixed(2)}</td>
                        <td class="text-right"><strong>₺${parseFloat(kalem.toplam).toFixed(2)}</strong></td>
                    </tr>
                `).join('');
            }
            
            detayContent.innerHTML = `
                <div class="fatura-detay">
                    <!-- Fatura Başlık -->
                    <div class="fatura-header">
                        <div class="fatura-title">
                            <h3>${faturaTip === 'alim' ? '🛒 SATIN ALMA FATURASI' : '🏷️ SATIŞ FATURASI'}</h3>
                            <div class="fatura-no">Fatura No: <strong>${fatura.fatura_no}</strong></div>
                        </div>
                        <div class="fatura-date">
                            <div class="date-item">
                                <span class="date-label">Tarih:</span>
                                <span class="date-value">${formatDate(fatura.tarih)}</span>
                            </div>
                            <div class="date-item">
                                <span class="date-label">Oluşturulma:</span>
                                <span class="date-value">${formatDateTime(fatura.olusturma_tarihi)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Firma Bilgileri -->
                    <div class="firma-info">
                        <h4>${faturaTip === 'alim' ? 'Tedarikçi Bilgileri' : 'Müşteri Bilgileri'}</h4>
                        <div class="info-item">
                            <span class="info-label">${faturaTip === 'alim' ? 'Tedarikçi:' : 'Müşteri:'}</span>
                            <span class="info-value"><strong>${firmaAdi}</strong></span>
                        </div>
                        ${firmaInfo}
                    </div>
                    
                    ${fatura.aciklama ? `
                    <div class="fatura-aciklama">
                        <h4>Açıklama</h4>
                        <p>${fatura.aciklama}</p>
                    </div>
                    ` : ''}
                    
                    <!-- Kalemler Tablosu -->
                    <div class="kalemler-section">
                        <h4>Fatura Kalemleri</h4>
                        <table class="kalemler-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%">#</th>
                                    <th style="width: 40%">${faturaTip === 'alim' ? 'Ham Madde' : 'Ürün'}</th>
                                    <th style="width: 15%" class="text-center">Miktar</th>
                                    <th style="width: 20%" class="text-right">Birim Fiyat</th>
                                    <th style="width: 20%" class="text-right">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${kalemlerHTML}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="4" class="text-right"><strong>GENEL TOPLAM:</strong></td>
                                    <td class="text-right"><strong class="total-amount">₺${parseFloat(fatura.toplam_tutar).toFixed(2)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
            
            openModal('detayModal');
        } else {
            showAlert('Fatura detayı bulunamadı', 'error');
        }
    } catch (error) {
        console.error('Fatura detayı görüntüleme hatası:', error);
        showAlert('Bir hata oluştu: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Yardımcı Fonksiyonlar

// Loading göster/gizle
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Tarih formatla
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// Tarih ve saat formatla
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Alert göster
function showAlert(message, type = 'info') {
    alert(message);
}

// ============================================
// CUSTOM DROPDOWN FONKSİYONLARI
// ============================================

let selectedFirmaIds = [];
let selectedUrunIds = [];

// Custom dropdown'u başlat
function initializeCustomDropdown() {
    // Firma dropdown
    const firmaHeader = document.getElementById('firmaSelectHeader');
    const firmaList = document.getElementById('firmaSelectList');
    const firmaSelectAll = document.getElementById('firmaSelectAll');
    
    firmaHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown('firma');
    });
    
    firmaSelectAll.addEventListener('change', (e) => {
        handleSelectAll('firma', e.target.checked);
    });
    
    // Ürün dropdown
    const urunHeader = document.getElementById('urunSelectHeader');
    const urunList = document.getElementById('urunSelectList');
    const urunSelectAll = document.getElementById('urunSelectAll');
    
    urunHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown('urun');
    });
    
    urunSelectAll.addEventListener('change', (e) => {
        handleSelectAll('urun', e.target.checked);
    });
    
    // Dropdown dışına tıklanınca kapat
    document.addEventListener('click', (e) => {
        if (!document.getElementById('firmaSelectWrapper').contains(e.target)) {
            closeDropdown('firma');
        }
        if (!document.getElementById('urunSelectWrapper').contains(e.target)) {
            closeDropdown('urun');
        }
    });
}

// Dropdown'u aç/kapat
function toggleDropdown(type) {
    const header = document.getElementById(`${type}SelectHeader`);
    const list = document.getElementById(`${type}SelectList`);
    
    header.classList.toggle('active');
    list.classList.toggle('active');
}

// Dropdown'u kapat
function closeDropdown(type) {
    const header = document.getElementById(`${type}SelectHeader`);
    const list = document.getElementById(`${type}SelectList`);
    
    header.classList.remove('active');
    list.classList.remove('active');
}

// Tedarikçi listesini custom dropdown'a doldur
function populateFirmaDropdown(data, textField) {
    const container = document.getElementById('firmaSelectItems');
    container.innerHTML = '';
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        
        const label = document.createElement('label');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = item.id;
        checkbox.dataset.text = item[textField];
        checkbox.addEventListener('change', () => handleCheckboxChange('firma'));
        
        const span = document.createElement('span');
        span.textContent = item[textField];
        
        label.appendChild(checkbox);
        label.appendChild(span);
        div.appendChild(label);
        container.appendChild(div);
    });
    
    // Dropdown text'ini güncelle
    updateDropdownText('firma');
}

// Ürün listesini custom dropdown'a doldur
function populateUrunDropdown(data, textField) {
    const container = document.getElementById('urunSelectItems');
    container.innerHTML = '';
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        
        const label = document.createElement('label');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = item.id;
        checkbox.dataset.text = item[textField];
        checkbox.addEventListener('change', () => handleCheckboxChange('urun'));
        
        const span = document.createElement('span');
        span.textContent = item[textField];
        
        label.appendChild(checkbox);
        label.appendChild(span);
        div.appendChild(label);
        container.appendChild(div);
    });
    
    // Dropdown text'ini güncelle
    updateDropdownText('urun');
}

// "Tümü" seçeneğini işle
function handleSelectAll(type, checked) {
    const checkboxes = document.querySelectorAll(`#${type}SelectItems input[type="checkbox"]`);
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });
    
    if (type === 'firma') {
        if (checked) {
            selectedFirmaIds = Array.from(checkboxes).map(cb => cb.value);
        } else {
            selectedFirmaIds = [];
        }
    } else {
        if (checked) {
            selectedUrunIds = Array.from(checkboxes).map(cb => cb.value);
        } else {
            selectedUrunIds = [];
        }
    }
    
    updateDropdownText(type);
}

// Tekil checkbox değişimini işle
function handleCheckboxChange(type) {
    const checkboxes = document.querySelectorAll(`#${type}SelectItems input[type="checkbox"]`);
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    
    if (type === 'firma') {
        selectedFirmaIds = checkedBoxes.map(cb => cb.value);
    } else {
        selectedUrunIds = checkedBoxes.map(cb => cb.value);
    }
    
    // "Tümü" checkbox'ını güncelle
    const selectAll = document.getElementById(`${type}SelectAll`);
    selectAll.checked = checkedBoxes.length === checkboxes.length;
    
    updateDropdownText(type);
}

// Dropdown başlık metnini güncelle
function updateDropdownText(type) {
    const textElement = document.getElementById(`${type}SelectText`);
    const checkboxes = document.querySelectorAll(`#${type}SelectItems input[type="checkbox"]`);
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    
    let defaultText = '';
    if (type === 'firma') {
        defaultText = currentTab === 'ham-madde' ? 'Tedarikçi' : 'Müşteri';
    } else {
        defaultText = currentTab === 'ham-madde' ? 'Ham Madde' : 'Radyatör';
    }
    
    if (checkedBoxes.length === 0) {
        textElement.textContent = defaultText;
    } else if (checkedBoxes.length === checkboxes.length) {
        textElement.textContent = 'Tümü';
    } else if (checkedBoxes.length === 1) {
        textElement.textContent = checkedBoxes[0].dataset.text;
    } else {
        textElement.textContent = `${checkedBoxes.length} seçili`;
    }
}

// Seçili firma ID'lerini al
function getSelectedFirmaIds() {
    return selectedFirmaIds;
}

// Seçili ürün ID'lerini al
function getSelectedUrunIds() {
    return selectedUrunIds;
}

// Custom dropdown'u temizle
function clearFirmaDropdown() {
    selectedFirmaIds = [];
    
    const checkboxes = document.querySelectorAll('#firmaSelectItems input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    const selectAll = document.getElementById('firmaSelectAll');
    selectAll.checked = false;
    
    updateDropdownText('firma');
}

// Custom ürün dropdown'u temizle
function clearUrunDropdown() {
    selectedUrunIds = [];
    
    const checkboxes = document.querySelectorAll('#urunSelectItems input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    const selectAll = document.getElementById('urunSelectAll');
    selectAll.checked = false;
    
    updateDropdownText('urun');
}

// ============================================
// ÇOKLU İŞLEM FONKSİYONLARI
// ============================================

// Dinamik satır sayacı
let hamMaddeRowCounter = 0;
let radyatorRowCounter = 0;

// Ham madde alımı modal'ını aç (yeni çoklu işlem)
function openAddModal() {
    if (currentTab === 'ham-madde') {
        openHamMaddeCokluModal();
    } else {
        openRadyatorCokluModal();
    }
}

// Çoklu ham madde alımı modal'ını aç
function openHamMaddeCokluModal() {
    const modal = document.getElementById('hamMaddeModal');
    document.getElementById('hamMaddeModalTitle').textContent = 'Yeni Ham Madde Alımı';
    document.getElementById('hamMaddeForm').reset();
    document.getElementById('hamMaddeId').value = '';
    
    // Bugünün tarihini ayarla
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('hamMaddeTarih').value = today;
    
    // Satırları temizle
    const container = document.getElementById('hamMaddeRowsContainer');
    container.innerHTML = '';
    hamMaddeRowCounter = 0;
    
    // İlk satırı ekle
    addHamMaddeRow();
    
    modal.classList.add('active');
}

// Ham madde satırı ekle
function addHamMaddeRow() {
    hamMaddeRowCounter++;
    const rowId = `hamMaddeRow_${hamMaddeRowCounter}`;
    
    const container = document.getElementById('hamMaddeRowsContainer');
    const row = document.createElement('tr');
    row.id = rowId;
    row.className = 'item-row';
    
    row.innerHTML = `
        <td>
            <select class="form-control hamMaddeSelect" data-row="${hamMaddeRowCounter}" required>
                <option value="">Seçiniz...</option>
                ${hamMaddeler.map(hm => `<option value="${hm.id}">${hm.adi}</option>`).join('')}
            </select>
        </td>
        <td>
            <input type="number" class="form-control hamMaddeMiktar" data-row="${hamMaddeRowCounter}" 
                   step="0.01" min="0.01" placeholder="0.00" required>
        </td>
        <td>
            <select class="form-control hamMaddeBirim" data-row="${hamMaddeRowCounter}" required>
                <option value="kg">kg</option>
                <option value="ton">ton</option>
                <option value="adet">adet</option>
                <option value="m">m</option>
                <option value="m2">m²</option>
                <option value="m3">m³</option>
            </select>
        </td>
        <td>
            <input type="number" class="form-control hamMaddeBirimFiyat" data-row="${hamMaddeRowCounter}" 
                   step="0.01" min="0" placeholder="0.00" required>
        </td>
        <td>
            <span class="hamMaddeSatirToplam" data-row="${hamMaddeRowCounter}">0.00</span>
        </td>
        <td class="text-center">
            <button type="button" class="btn-icon btn-delete" onclick="removeHamMaddeRow('${rowId}')" 
                    title="Satırı Sil">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </td>
    `;
    
    container.appendChild(row);
    
    // Event listener'ları ekle
    row.querySelector('.hamMaddeMiktar').addEventListener('input', calculateHamMaddeRowTotal);
    row.querySelector('.hamMaddeBirimFiyat').addEventListener('input', calculateHamMaddeRowTotal);
}

// Ham madde satırını sil
function removeHamMaddeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        // En az bir satır kalmalı
        const container = document.getElementById('hamMaddeRowsContainer');
        if (container.children.length <= 1) {
            showAlert('En az bir ham madde satırı olmalıdır', 'warning');
            return;
        }
        row.remove();
        calculateHamMaddeGenelToplam();
    }
}

// Ham madde satır toplamını hesapla
function calculateHamMaddeRowTotal(event) {
    const rowNum = event.target.dataset.row;
    const miktar = parseFloat(document.querySelector(`.hamMaddeMiktar[data-row="${rowNum}"]`).value) || 0;
    const birimFiyat = parseFloat(document.querySelector(`.hamMaddeBirimFiyat[data-row="${rowNum}"]`).value) || 0;
    const toplam = miktar * birimFiyat;
    
    document.querySelector(`.hamMaddeSatirToplam[data-row="${rowNum}"]`).textContent = toplam.toFixed(2);
    
    calculateHamMaddeGenelToplam();
}

// Ham madde genel toplamı hesapla
function calculateHamMaddeGenelToplam() {
    const satirToplamlar = document.querySelectorAll('.hamMaddeSatirToplam');
    let genelToplam = 0;
    
    satirToplamlar.forEach(span => {
        genelToplam += parseFloat(span.textContent) || 0;
    });
    
    document.getElementById('hamMaddeGenelToplam').textContent = genelToplam.toFixed(2) + ' ₺';
}

// Çoklu radyatör satışı modal'ını aç
function openRadyatorCokluModal() {
    const modal = document.getElementById('radyatorModal');
    document.getElementById('radyatorModalTitle').textContent = 'Yeni Radyatör Satışı';
    document.getElementById('radyatorForm').reset();
    document.getElementById('radyatorSatisId').value = '';
    
    // Bugünün tarihini ayarla
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('radyatorTarih').value = today;
    
    // Satırları temizle
    const container = document.getElementById('radyatorRowsContainer');
    container.innerHTML = '';
    radyatorRowCounter = 0;
    
    // İlk satırı ekle
    addRadyatorRow();
    
    modal.classList.add('active');
}

// Radyatör satırı ekle
function addRadyatorRow() {
    radyatorRowCounter++;
    const rowId = `radyatorRow_${radyatorRowCounter}`;
    
    const container = document.getElementById('radyatorRowsContainer');
    const row = document.createElement('tr');
    row.id = rowId;
    row.className = 'item-row';
    
    row.innerHTML = `
        <td>
            <select class="form-control radyatorSelect" data-row="${radyatorRowCounter}" required>
                <option value="">Seçiniz...</option>
                ${radyatorler.map(r => `<option value="${r.id}" data-stok="${r.stok_miktari}">${r.adi} - ${r.olcu}</option>`).join('')}
            </select>
        </td>
        <td class="text-center">
            <span class="radyatorStok" data-row="${radyatorRowCounter}">-</span>
        </td>
        <td>
            <input type="number" class="form-control radyatorMiktar" data-row="${radyatorRowCounter}" 
                   min="1" placeholder="0" required>
        </td>
        <td>
            <input type="number" class="form-control radyatorBirimFiyat" data-row="${radyatorRowCounter}" 
                   step="0.01" min="0" placeholder="0.00" required>
        </td>
        <td>
            <span class="radyatorSatirToplam" data-row="${radyatorRowCounter}">0.00</span>
        </td>
        <td class="text-center">
            <button type="button" class="btn-icon btn-delete" onclick="removeRadyatorRow('${rowId}')" 
                    title="Satırı Sil">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </td>
    `;
    
    container.appendChild(row);
    
    // Event listener'ları ekle
    const select = row.querySelector('.radyatorSelect');
    select.addEventListener('change', updateRadyatorStok);
    row.querySelector('.radyatorMiktar').addEventListener('input', calculateRadyatorRowTotal);
    row.querySelector('.radyatorBirimFiyat').addEventListener('input', calculateRadyatorRowTotal);
}

// Radyatör seçildiğinde stok bilgisini göster
function updateRadyatorStok(event) {
    const rowNum = event.target.dataset.row;
    const selectedOption = event.target.selectedOptions[0];
    const stok = selectedOption ? selectedOption.dataset.stok : '-';
    
    document.querySelector(`.radyatorStok[data-row="${rowNum}"]`).textContent = stok || '-';
}

// Radyatör satırını sil
function removeRadyatorRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        // En az bir satır kalmalı
        const container = document.getElementById('radyatorRowsContainer');
        if (container.children.length <= 1) {
            showAlert('En az bir radyatör satırı olmalıdır', 'warning');
            return;
        }
        row.remove();
        calculateRadyatorGenelToplam();
    }
}

// Radyatör satır toplamını hesapla
function calculateRadyatorRowTotal(event) {
    const rowNum = event.target.dataset.row;
    const miktar = parseFloat(document.querySelector(`.radyatorMiktar[data-row="${rowNum}"]`).value) || 0;
    const birimFiyat = parseFloat(document.querySelector(`.radyatorBirimFiyat[data-row="${rowNum}"]`).value) || 0;
    const toplam = miktar * birimFiyat;
    
    document.querySelector(`.radyatorSatirToplam[data-row="${rowNum}"]`).textContent = toplam.toFixed(2);
    
    calculateRadyatorGenelToplam();
}

// Radyatör genel toplamı hesapla
function calculateRadyatorGenelToplam() {
    const satirToplamlar = document.querySelectorAll('.radyatorSatirToplam');
    let genelToplam = 0;
    
    satirToplamlar.forEach(span => {
        genelToplam += parseFloat(span.textContent) || 0;
    });
    
    document.getElementById('radyatorGenelToplam').textContent = genelToplam.toFixed(2) + ' ₺';
}

// Ham madde form submit (çoklu)
async function handleHamMaddeSubmit(e) {
    e.preventDefault();
    
    const tedarikcId = document.getElementById('tedarikcId').value;
    const tarih = document.getElementById('hamMaddeTarih').value;
    const faturaNo = document.getElementById('hamMaddeFaturaNo').value;
    
    // Satırları topla
    const hamMaddeler = [];
    const rows = document.querySelectorAll('#hamMaddeRowsContainer .item-row');
    
    rows.forEach(row => {
        const rowNum = row.querySelector('.hamMaddeSelect').dataset.row;
        const hamMaddeId = row.querySelector('.hamMaddeSelect').value;
        const miktar = row.querySelector('.hamMaddeMiktar').value;
        const birim = row.querySelector('.hamMaddeBirim').value;
        const birimFiyat = row.querySelector('.hamMaddeBirimFiyat').value;
        
        if (hamMaddeId && miktar && birim && birimFiyat) {
            hamMaddeler.push({
                hamMaddeId: parseInt(hamMaddeId),
                miktar: parseFloat(miktar),
                birim,
                birimFiyat: parseFloat(birimFiyat)
            });
        }
    });
    
    if (hamMaddeler.length === 0) {
        showAlert('En az bir ham madde ekleyin', 'warning');
        return;
    }
    
    const data = {
        tedarikcId: parseInt(tedarikcId),
        tarih,
        faturaNo: faturaNo || null,
        hamMaddeler
    };
    
    try {
        showLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/islemler/ham-madde-alimlari/coklu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message || 'Ham madde alımları başarıyla kaydedildi', 'success');
            closeModal('hamMaddeModal');
            await loadTableData();
        } else {
            showAlert(result.message || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Ham madde alımı kaydetme hatası:', error);
        showAlert('Bir hata oluştu: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Radyatör form submit (çoklu)
async function handleRadyatorSubmit(e) {
    e.preventDefault();
    
    const musteriId = document.getElementById('musteriId').value;
    const tarih = document.getElementById('radyatorTarih').value;
    const faturaNo = document.getElementById('radyatorFaturaNo').value;
    
    // Satırları topla
    const radyatorler = [];
    const rows = document.querySelectorAll('#radyatorRowsContainer .item-row');
    
    rows.forEach(row => {
        const rowNum = row.querySelector('.radyatorSelect').dataset.row;
        const radyatorId = row.querySelector('.radyatorSelect').value;
        const miktar = row.querySelector('.radyatorMiktar').value;
        const birimFiyat = row.querySelector('.radyatorBirimFiyat').value;
        
        if (radyatorId && miktar && birimFiyat) {
            radyatorler.push({
                radyatorId: parseInt(radyatorId),
                miktar: parseInt(miktar),
                birimFiyat: parseFloat(birimFiyat)
            });
        }
    });
    
    if (radyatorler.length === 0) {
        showAlert('En az bir radyatör ekleyin', 'warning');
        return;
    }
    
    const data = {
        musteriId: parseInt(musteriId),
        tarih,
        faturaNo: faturaNo || null,
        radyatorler
    };
    
    try {
        showLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/islemler/radyator-satislari/coklu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message || 'Radyatör satışları başarıyla kaydedildi', 'success');
            closeModal('radyatorModal');
            await loadTableData();
        } else {
            showAlert(result.message || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Radyatör satışı kaydetme hatası:', error);
        showAlert('Bir hata oluştu: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Satır ekleme butonları için event listener'lar
document.addEventListener('DOMContentLoaded', function() {
    const addHamMaddeRowBtn = document.getElementById('addHamMaddeRowBtn');
    if (addHamMaddeRowBtn) {
        addHamMaddeRowBtn.addEventListener('click', addHamMaddeRow);
    }
    
    const addRadyatorRowBtn = document.getElementById('addRadyatorRowBtn');
    if (addRadyatorRowBtn) {
        addRadyatorRowBtn.addEventListener('click', addRadyatorRow);
    }

    // Üç nokta menü için event listener - Kayıtlar sayfasından uyarlandı
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const more = e.target.closest('.more-btn');
            if (more) {
                const tr = e.target.closest('tr');
                if (tr) {
                    openRowMenu(tr, more);
                }
                return;
            }
        });
    }
});

// Üç nokta menü fonksiyonu - Kayıtlar sayfasından uyarlandı
function openRowMenu(tr, btn) {
    // Close any existing menu first
    const existingMenu = document.querySelector('.row-menu');
    if (existingMenu) existingMenu.remove();
    
    // Create contextual menu
    const menu = document.createElement('div');
    menu.className = 'row-menu';
    
    // Calculate position
    const btnRect = btn.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // Position below the button, aligned to the right
    menu.style.top = (btnRect.bottom + scrollY + 4) + 'px';
    menu.style.right = (window.innerWidth - btnRect.right - scrollX) + 'px';
    
    menu.innerHTML = `
        <button class='mview'>Detayı Görüntüle</button>
        <button class='mdelete'>Sil</button>
    `;
    
    document.body.appendChild(menu);
    
    // Auto-adjust if menu goes off-screen
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight) {
        // Position above the button instead
        menu.style.top = (btnRect.top + scrollY - menuRect.height - 4) + 'px';
    }
    if (menuRect.left < 0) {
        // Align to the left edge of the button if off-screen
        menu.style.right = 'auto';
        menu.style.left = (btnRect.left + scrollX) + 'px';
    }
    
    // Close menu on outside click or escape
    const remove = (e) => {
        if (e && e.target && menu.contains(e.target)) return;
        menu.remove();
        document.removeEventListener('click', remove);
        document.removeEventListener('keydown', escapeHandler);
    };
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            remove();
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', remove);
        document.addEventListener('keydown', escapeHandler);
    }, 10);
    
    // Menu action handlers
    menu.querySelector('.mview').addEventListener('click', (e) => {
        e.stopPropagation();
        // Get fatura_id from the row
        const faturaId = tr.getAttribute('data-fatura-id');
        if (faturaId) {
            const currentTab = document.querySelector('.tab-button.active')?.dataset.tab;
            const type = currentTab === 'ham-madde' ? 'alim' : 'satis';
            viewFaturaDetail(type, faturaId);
        }
        remove();
    });
    
    menu.querySelector('.mdelete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get record id from the row
        const recordId = tr.getAttribute('data-record-id');
        if (recordId) {
            deleteRecord(recordId);
        }
        remove();
    });
}


