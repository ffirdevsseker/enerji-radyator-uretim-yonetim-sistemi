// Üretim Sayfası JavaScript
const API_BASE_URL = 'http://localhost:5000/api/uretim';

let hammaddeler = [];
let radyatorler = [];
let kalemCounter = 0;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('Üretim sayfası yüklendi');
    
    // Token kontrolü
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Arama input
    const searchInput = document.getElementById('searchIrsaliye');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Verileri yükle
    loadHammaddeler();
    loadRadyatorler();
    loadIrsaliyeler();
    loadMaliyetOzeti();
});

/**
 * İrsaliye Modal'ını Aç
 */
async function openIrsaliyeModal() {
    // Formu temizle
    const form = document.getElementById('irsaliyeForm');
    if (form) {
        form.reset();
    }
    
    // Başlangıç tarihini ayarla
    const tarihInput = document.getElementById('tarih');
    if (tarihInput) {
        tarihInput.value = new Date().toISOString().slice(0, 16);
    }
    
    // Otomatik irsaliye numarası al
    await fetchNextIrsaliyeNo();
    
    // Kalem satırlarını temizle
    document.getElementById('kalemlerBody').innerHTML = '';
    kalemCounter = 0;
    
    // İrsaliye tipi değişikliğini dinle
    const irsaliyeTipi = document.getElementById('irsaliye_tipi');
    if (irsaliyeTipi) {
        irsaliyeTipi.onchange = handleIrsaliyeTipiChange;
    }
    
    // Form submit
    if (form) {
        form.onsubmit = handleFormSubmit;
    }
    
    // Modal'ı aç
    openModal('irsaliyeModal');
}

/**
 * Otomatik İrsaliye Numarası Al
 */
async function fetchNextIrsaliyeNo() {
    try {
        const response = await fetch(`${API_BASE_URL}/next-irsaliye-no`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            const irsaliyeNoInput = document.getElementById('irsaliye_no');
            if (irsaliyeNoInput) {
                irsaliyeNoInput.value = result.irsaliye_no;
            }
        } else {
            showAlert('error', 'İrsaliye numarası oluşturulamadı!');
        }
    } catch (error) {
        console.error('İrsaliye numarası alma hatası:', error);
        showAlert('error', 'İrsaliye numarası alınırken hata oluştu!');
    }
}

/**
 * Ham madde listesini yükle
 * @param {string} stokDurumu - 'depo' parametresi ile sadece depoda stoku olanları getirir
 */
async function loadHammaddeler(stokDurumu = null) {
    try {
        let url = `${API_BASE_URL}/hammaddeler`;
        
        // Stok durumu filtresini ekle
        if (stokDurumu) {
            url += `?stokDurumu=${stokDurumu}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            hammaddeler = result.data;
        }
    } catch (error) {
        console.error('Ham madde yükleme hatası:', error);
    }
}

/**
 * Radyatör listesini yükle
 */
async function loadRadyatorler() {
    try {
        const response = await fetch(`${API_BASE_URL}/radyatorler`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            radyatorler = result.data;
        }
    } catch (error) {
        console.error('Radyatör yükleme hatası:', error);
    }
}

/**
 * İrsaliye tipine göre ürün seçeneklerini değiştir
 */
async function handleIrsaliyeTipiChange() {
    const tip = document.getElementById('irsaliye_tipi').value;
    // Mevcut satırları temizle
    document.getElementById('kalemlerBody').innerHTML = '';
    kalemCounter = 0;
    
    if (tip === 'ÇIKIŞ') {
        // Ham madde çıkışı için sadece depoda stoku olanları yükle
        await loadHammaddeler('depo');
        // İlk satırı ekle
        addKalemRow();
    } else if (tip === 'GİRİŞ') {
        // Giriş için tüm radyatörleri kullan (zaten yüklü)
        // İlk satırı ekle
        addKalemRow();
    }
}

/**
 * Yeni kalem satırı ekle
 */
function addKalemRow() {
    const tip = document.getElementById('irsaliye_tipi').value;
    
    if (!tip) {
        showAlert('error', 'Lütfen önce irsaliye türünü seçin!');
        return;
    }
    
    kalemCounter++;
    const tbody = document.getElementById('kalemlerBody');
    const row = document.createElement('tr');
    row.id = `kalem-${kalemCounter}`;
    
    let urunOptions = '';
    let urunTipi = '';
    
    if (tip === 'ÇIKIŞ') {
        // Hammadde seçenekleri
        urunTipi = 'Hammadde';
        urunOptions = '<option value="">Hammadde Seçin...</option>';
        hammaddeler.forEach(hm => {
            urunOptions += `<option value="${hm.id}" data-birim="${hm.birim}" data-fiyat="${hm.liste_fiyati}" data-stok="${hm.depo_stok_miktari}">
                ${hm.adi} (Stok: ${hm.depo_stok_miktari} ${hm.birim})
            </option>`;
        });
    } else if (tip === 'GİRİŞ') {
        // Radyatör seçenekleri
        urunTipi = 'Radyatör';
        urunOptions = '<option value="">Radyatör Seçin...</option>';
        radyatorler.forEach(rad => {
            urunOptions += `<option value="${rad.id}" data-birim="ADET" data-fiyat="${rad.birim_fiyat}">
                ${rad.adi} ${rad.olcu ? '(' + rad.olcu + ')' : ''}
            </option>`;
        });
    }
    
    row.innerHTML = `
        <td>
            <select class="urun-select" onchange="updateKalemBirim(${kalemCounter})" data-tipi="${urunTipi}">
                ${urunOptions}
            </select>
        </td>
        <td>
            <input type="number" step="0.001" min="0" class="miktar-input" placeholder="0">
        </td>
        <td>
            <input type="text" class="birim-input" readonly value="">
        </td>
        <td>
            <button type="button" class="btn-remove" onclick="removeKalemRow(${kalemCounter})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
}

/**
 * Ürün seçildiğinde birim bilgisini güncelle
 */
function updateKalemBirim(rowId) {
    const row = document.getElementById(`kalem-${rowId}`);
    const select = row.querySelector('.urun-select');
    const selectedOption = select.options[select.selectedIndex];
    
    const birimInput = row.querySelector('.birim-input');
    
    if (selectedOption.value) {
        birimInput.value = selectedOption.dataset.birim || '';
        
        // Stok kontrolü için uyarı
        if (selectedOption.dataset.stok !== undefined) {
            const stok = parseFloat(selectedOption.dataset.stok);
            if (stok <= 0) {
                showAlert('warning', 'Dikkat: Seçilen ürünün stoğu bulunmuyor!');
            }
        }
    } else {
        birimInput.value = '';
    }
}

/**
 * Satırı sil
 */
function removeKalemRow(rowId) {
    const row = document.getElementById(`kalem-${rowId}`);
    if (row) {
        row.remove();
    }
}

/**
 * Form submit işlemi
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        irsaliye_no: document.getElementById('irsaliye_no').value.trim(),
        tarih: document.getElementById('tarih').value,
        irsaliye_tipi: document.getElementById('irsaliye_tipi').value,
        aciklama: '',
        kalemler: []
    };
    
    // Kalemleri topla
    const rows = document.querySelectorAll('#kalemlerBody tr');
    
    if (rows.length === 0) {
        showAlert('error', 'En az bir kalem eklemelisiniz!');
        return;
    }
    
    let hasError = false;
    rows.forEach(row => {
        const urunSelect = row.querySelector('.urun-select');
        const urunTipi = urunSelect.dataset.tipi;
        const miktar = parseFloat(row.querySelector('.miktar-input').value);
        
        if (!urunSelect.value || !miktar || miktar <= 0) {
            hasError = true;
            return;
        }
        
        const kalem = {
            urun_tipi: urunTipi,
            miktar: miktar,
            birim_fiyat: 0
        };
        
        if (urunTipi === 'Hammadde') {
            kalem.hammadde_id = parseInt(urunSelect.value);
            kalem.radyator_id = null;
        } else {
            kalem.radyator_id = parseInt(urunSelect.value);
            kalem.hammadde_id = null;
        }
        
        formData.kalemler.push(kalem);
    });
    
    if (hasError) {
        showAlert('error', 'Lütfen tüm kalem bilgilerini eksiksiz doldurun!');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/irsaliye`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'İrsaliye başarıyla oluşturuldu!');
            closeModal('irsaliyeModal');
            loadIrsaliyeler();
            loadMaliyetOzeti();
        } else {
            showAlert('error', result.message || 'İrsaliye oluşturulamadı!');
        }
    } catch (error) {
        console.error('İrsaliye kaydetme hatası:', error);
        showAlert('error', 'Bir hata oluştu: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Formu temizle
 */
function resetForm() {
    const form = document.getElementById('irsaliyeForm');
    if (form) {
        form.reset();
    }
    document.getElementById('kalemlerBody').innerHTML = '';
    kalemCounter = 0;
    const tarihInput = document.getElementById('tarih');
    if (tarihInput) {
        tarihInput.value = new Date().toISOString().slice(0, 16);
    }
}

/**
 * İrsaliye listesini yükle
 */
async function loadIrsaliyeler() {
    try {
        const response = await fetch(`${API_BASE_URL}/irsaliyeler`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayIrsaliyeler(result.data);
        }
    } catch (error) {
        console.error('İrsaliye yükleme hatası:', error);
        showAlert('error', 'İrsaliyeler yüklenemedi!');
    }
}

/**
 * İrsaliyeleri tabloda göster
 */
function displayIrsaliyeler(data) {
    const tbody = document.getElementById('irsaliyeBody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">Henüz irsaliye kaydı bulunmuyor</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr data-irsaliye-id="${item.id}" data-irsaliye-no="${item.irsaliye_no}">
            <td><strong>${item.irsaliye_no}</strong></td>
            <td>${formatDate(item.tarih)}</td>
            <td>
                <span class="badge ${item.irsaliye_tipi === 'ÇIKIŞ' ? 'badge-warning' : 'badge-success'}">
                    ${item.irsaliye_tipi}
                </span>
            </td>
            <td><span class="badge badge-info">${item.kalem_sayisi}</span></td>
            <td class="col-actions">
                <button class="more-btn" aria-label="Daha fazla">•••</button>
            </td>
        </tr>
    `).join('');
}

/**
 * İrsaliye detayını görüntüle
 */
async function viewIrsaliye(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/irsaliye/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayIrsaliyeDetay(result.data);
            openModal('detayModal');
        } else {
            showAlert('error', 'İrsaliye detayı alınamadı!');
        }
    } catch (error) {
        console.error('İrsaliye detay hatası:', error);
        showAlert('error', 'Bir hata oluştu!');
    } finally {
        showLoading(false);
    }
}

/**
 * İrsaliye detayını modal içinde göster
 */
function displayIrsaliyeDetay(data) {
    const modalBody = document.getElementById('detayModalBody');
    
    // İrsaliye tipine göre farklı kolonlar
    const isGiris = data.irsaliye_tipi === 'GİRİŞ';
    const isCikis = data.irsaliye_tipi === 'ÇIKIŞ';
    
    let kalemlerHTML = '';
    let tableHeaders = '';
    
    if (data.kalemler.length === 0) {
        const colspanCount = isGiris ? 5 : 4;
        kalemlerHTML = `
            <tr class="empty-row">
                <td colspan="${colspanCount}">Bu irsaliyede kalem bulunmuyor</td>
            </tr>
        `;
    } else {
        if (isGiris) {
            // GİRİŞ: Ürün Tipi, Ürün Adı, Miktar, Birim, Toplam Maliyet
            tableHeaders = `
                <tr>
                    <th>Ürün Tipi</th>
                    <th>Ürün Adı</th>
                    <th>Miktar</th>
                    <th>Birim</th>
                    <th>Toplam Maliyet</th>
                </tr>
            `;
            kalemlerHTML = data.kalemler.map(kalem => `
                <tr>
                    <td>${kalem.urun_tipi}</td>
                    <td><strong>${kalem.urun_adi}</strong></td>
                    <td>${kalem.miktar}</td>
                    <td>${kalem.birim}</td>
                    <td><strong>${formatCurrency(kalem.toplam_maliyet || 0)}</strong></td>
                </tr>
            `).join('');
        } else {
            // ÇIKIŞ: Sadece Ürün Tipi, Ürün Adı, Miktar, Birim
            tableHeaders = `
                <tr>
                    <th>Ürün Tipi</th>
                    <th>Ürün Adı</th>
                    <th>Miktar</th>
                    <th>Birim</th>
                </tr>
            `;
            kalemlerHTML = data.kalemler.map(kalem => `
                <tr>
                    <td>${kalem.urun_tipi}</td>
                    <td><strong>${kalem.urun_adi}</strong></td>
                    <td>${kalem.miktar}</td>
                    <td>${kalem.birim}</td>
                </tr>
            `).join('');
        }
    }
    
    // Genel toplam sadece GİRİŞ'te göster
    let summaryBoxHTML = '';
    if (isGiris && data.kalemler.length > 0) {
        const toplamMaliyet = data.kalemler.reduce((sum, k) => sum + parseFloat(k.toplam_maliyet || 0), 0);
        summaryBoxHTML = `
            <div class="summary-box">
                <span class="summary-label">TOPLAM MALİYET:</span>
                <span class="summary-value highlight">${formatCurrency(toplamMaliyet)}</span>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div class="detail-info">
            <div class="detail-item">
                <span class="detail-label">İrsaliye No:</span>
                <span class="detail-value"><strong>${data.irsaliye_no}</strong></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Tarih:</span>
                <span class="detail-value">${formatDateTime(data.tarih)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Tip:</span>
                <span class="detail-value">
                    <span class="badge ${data.irsaliye_tipi === 'ÇIKIŞ' ? 'badge-warning' : 'badge-success'}">
                        ${data.irsaliye_tipi}
                    </span>
                </span>
            </div>
        </div>
        
        <h3 class="section-title">
            <i class="fas fa-list"></i> İrsaliye Kalemleri
        </h3>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    ${tableHeaders}
                </thead>
                <tbody>
                    ${kalemlerHTML}
                </tbody>
            </table>
        </div>
        
        ${summaryBoxHTML}
    `;
}

/**
 * İrsaliye sil
 */
async function deleteIrsaliye(id, irsaliyeNo) {
    if (!confirm(`"${irsaliyeNo}" numaralı irsaliyeyi silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve stok hareketleri de tersine çevrilecektir.`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/irsaliye/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'İrsaliye başarıyla silindi!');
            loadIrsaliyeler();
            loadMaliyetOzeti();
        } else {
            showAlert('error', result.message || 'İrsaliye silinemedi!');
        }
    } catch (error) {
        console.error('İrsaliye silme hatası:', error);
        showAlert('error', 'Bir hata oluştu!');
    } finally {
        showLoading(false);
    }
}

/**
 * Maliyet özetini yükle
 */
async function loadMaliyetOzeti() {
    try {
        const response = await fetch(`${API_BASE_URL}/maliyet-ozeti`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayMaliyetOzeti(result.data);
        }
    } catch (error) {
        console.error('Maliyet özeti yükleme hatası:', error);
    }
}

/**
 * Maliyet özetini tabloda göster
 */
function displayMaliyetOzeti(data) {
    const tbody = document.getElementById('maliyetBody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">Veri yok</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr style="cursor: pointer;" onclick="showMaliyetDosyasiDetay(${item.radyator_id})" title="Maliyet dosyasını görüntüle">
            <td><strong>${item.radyator_adi}</strong></td>
            <td>${item.stok_miktari || 0}</td>
            <td><span class="badge badge-info">${item.kullanilan_hammadde_sayisi}</span></td>
            <td><strong>${formatCurrency(item.toplam_maliyet)}</strong></td>
        </tr>
    `).join('');
}

/**
 * Radyatör maliyet dosyası detayını göster
 */
async function showMaliyetDosyasiDetay(radyatorId) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/radyator-maliyet/${radyatorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayMaliyetDosyasiDetay(result.data);
            openModal('maliyetDosyasiModal');
        } else {
            showAlert('error', result.message || 'Maliyet dosyası alınamadı!');
        }
    } catch (error) {
        console.error('Maliyet dosyası detay hatası:', error);
        showAlert('error', 'Maliyet dosyası detayları alınırken hata oluştu!');
    } finally {
        showLoading(false);
    }
}

/**
 * Maliyet dosyası detayını modal içinde göster
 */
function displayMaliyetDosyasiDetay(data) {
    const modalBody = document.getElementById('maliyetDosyasiModalBody');
    
    const radyator = data.radyator;
    const kalemler = data.maliyet_kalemleri;
    
    let kalemlerHTML = '';
    if (kalemler.length === 0) {
        kalemlerHTML = `
            <tr class="empty-row">
                <td colspan="4">Bu radyatör için maliyet dosyası kaydı bulunmuyor</td>
            </tr>
        `;
    } else {
        kalemlerHTML = kalemler.map(kalem => `
            <tr>
                <td><strong>${kalem.hammadde_adi}</strong></td>
                <td>${parseFloat(kalem.kullanilan_miktar_adet).toFixed(3)} ${kalem.hammadde_birim}</td>
                <td>${formatCurrency(kalem.maliyet)}</td>
                <td>${formatDate(kalem.tarih)}</td>
            </tr>
        `).join('');
    }
    
    modalBody.innerHTML = `
        <div class="detail-info">
            <div class="detail-item">
                <span class="detail-label">Radyatör:</span>
                <span class="detail-value"><strong>${radyator.adi}</strong></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Ölçü:</span>
                <span class="detail-value">${radyator.olcu || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Dilim Sayısı:</span>
                <span class="detail-value">${radyator.dilim_sayisi || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Birim Fiyat:</span>
                <span class="detail-value">${formatCurrency(radyator.birim_fiyat)}</span>
            </div>
        </div>
        
        <h3 class="section-title">
            <i class="fas fa-box"></i> Kullanılan Hammaddeler
        </h3>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Hammadde</th>
                        <th>Kullanılan Miktar</th>
                        <th>Maliyet</th>
                        <th>Tarih</th>
                    </tr>
                </thead>
                <tbody>
                    ${kalemlerHTML}
                </tbody>
            </table>
        </div>
        
        <div class="summary-box">
            <span class="summary-label">TOPLAM MALİYET:</span>
            <span class="summary-value highlight">${formatCurrency(data.toplam_maliyet)}</span>
        </div>
    `;
}

/**
 * Arama fonksiyonu
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#irsaliyeBody tr:not(.empty-row)');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

/**
 * Modal işlemleri
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Modal dışına tıklayınca kapat
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

/**
 * Alert göster
 */
function showAlert(type, message) {
    // Mevcut alert varsa kaldır
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    alert.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Container'ın en üstüne ekle
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    // 5 saniye sonra kaldır
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
    
    // Sayfayı en üste kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Loading göster/gizle
 */
function showLoading(show) {
    let spinner = document.getElementById('loadingSpinner');
    
    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loadingSpinner';
            document.body.appendChild(spinner);
        }
    } else {
        if (spinner) {
            spinner.remove();
        }
    }
}

/**
 * Tarih formatla (Kısa format)
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Tarih formatla (Uzun format)
 */
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

/**
 * Para formatı
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return '0,00 ₺';
    return parseFloat(value).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ₺';
}

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
        <button class='mview'>Görüntüle</button>
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
        const irsaliyeId = tr.getAttribute('data-irsaliye-id');
        if (irsaliyeId) {
            viewIrsaliye(parseInt(irsaliyeId));
        }
        remove();
    });
    
    menu.querySelector('.mdelete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const irsaliyeId = tr.getAttribute('data-irsaliye-id');
        const irsaliyeNo = tr.getAttribute('data-irsaliye-no');
        if (irsaliyeId) {
            deleteIrsaliye(parseInt(irsaliyeId), irsaliyeNo);
        }
        remove();
    });
}

// Üç nokta menü için event listener
document.addEventListener('DOMContentLoaded', function() {
    const tbody = document.getElementById('irsaliyeBody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
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


