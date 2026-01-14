// Maliyet Dosyaları JavaScript

// Global değişkenler
let radyatorler = [];
let hammaddeler = [];
let seciliRadyator = null;
let maliyetSatirlari = [];
let currentRowForHammadde = null;

// Token kontrolü
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Lütfen önce giriş yapın');
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    // Önce authentication kontrolü
    if (!checkAuth()) {
        return;
    }
    
    await loadRadyatorler();
    await loadHammaddeler();
    setupModalListeners();
});

// 1️⃣ Radyötörleri yükle ve butonları oluştur
async function loadRadyatorler() {
    try {
        const response = await fetch('http://localhost:5000/api/radyatorler', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.status === 403 || response.status === 401) {
            alert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Radyötörler yüklenemedi');
        }

        radyatorler = await response.json();
        renderRadyatorButtons();
    } catch (error) {
        console.error('Radyötörler yüklenirken hata:', error);
        showError('Radyötörler yüklenirken bir hata oluştu');
    }
}

// Radyötör butonlarını render et
function renderRadyatorButtons() {
    const container = document.getElementById('radyator-buttons');
    container.innerHTML = '';

    // Radyötör butonları
    radyatorler.forEach(radyator => {
        const button = document.createElement('button');
        button.className = 'btn-radyator';
        button.textContent = radyator.radyator_adi || radyator.adi;
        button.onclick = () => selectRadyator(radyator);
        container.appendChild(button);
    });

    // + butonu (tüm radyötörleri göster)
    const addButton = document.createElement('button');
    addButton.className = 'btn-radyator-add';
    addButton.textContent = '+';
    addButton.onclick = openRadyatorSelectionModal;
    container.appendChild(addButton);
}

// Radyötör seç
function selectRadyator(radyator) {
    seciliRadyator = radyator;
    
    // Aktif butonu işaretle
    const buttons = document.querySelectorAll('.btn-radyator');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === (radyator.radyator_adi || radyator.adi)) {
            btn.classList.add('active');
        }
    });

    // Seçili radyötör adını göster
    document.getElementById('secili-radyator').textContent = radyator.radyator_adi || radyator.adi;
    
    // Maliyet bölümünü göster
    document.getElementById('maliyet-section').style.display = 'block';
    
    // Maliyet verilerini yükle
    loadMaliyetler();
}

// 2️⃣ Maliyet verilerini yükle
async function loadMaliyetler() {
    try {
        // Yeni endpoint kullan: maliyet_dosyasi tablosundan veri çek
        const response = await fetch(`http://localhost:5000/api/maliyet-dosyasi/${seciliRadyator.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            maliyetSatirlari = await response.json();
            console.log('Yüklenen maliyet satırları:', maliyetSatirlari);
        } else {
            maliyetSatirlari = [];
        }
        
        renderMaliyetTable();
        calculateTotal();
    } catch (error) {
        console.error('Maliyet verileri yüklenirken hata:', error);
        maliyetSatirlari = [];
        renderMaliyetTable();
        calculateTotal();
    }
}

// Maliyet tablosunu render et
function renderMaliyetTable() {
    const tbody = document.getElementById('maliyet-table-body');
    tbody.innerHTML = '';

    // Ham madde satırları
    maliyetSatirlari.forEach((satir, index) => {
        const row = createTableRow(satir, index);
        tbody.appendChild(row);
    });

    // Eğer hiç satır yoksa bilgilendirme göster
    if (maliyetSatirlari.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 20px; color: #999;">
                Henüz hammadde eklenmemiş. "+ Hammadde Ekle" butonuna tıklayarak hammadde ekleyebilirsiniz.
            </td>
        `;
        tbody.appendChild(emptyRow);
    }
}

// Tablo satırı oluştur
function createTableRow(satir, index) {
    const tr = document.createElement('tr');
    
    // Sayısal değerleri parse et
    const kullanılanMiktar = parseFloat(satir.kullanilan_miktar_adet) || 0;
    const listeFiyati = parseFloat(satir.liste_fiyati) || 0;
    const maliyet = parseFloat(satir.maliyet) || 0;
    
    tr.innerHTML = `
        <td style="text-align: center;">${index + 1}</td>
        <td>${satir.stok_adi || '-'}</td>
        <td style="text-align: center;">${satir.birim || '-'}</td>
        <td style="text-align: center;">
            <input type="number" 
                   class="editable-input" 
                   value="${kullanılanMiktar}" 
                   onchange="updateMiktar(${satir.id}, this.value)"
                   step="0.001"
                   min="0">
        </td>
        <td style="text-align: center;">${formatCurrency(listeFiyati)}</td>
        <td style="text-align: right; font-weight: bold; padding-right: 20px;">
            ${formatCurrency(maliyet)}
        </td>
        <td style="text-align: center;">
            <button class="btn-delete-row" onclick="deleteRow(${satir.id})">Sil</button>
        </td>
    `;
    
    return tr;
}

// Yeni satır ekle (modal açılmadan boş satır eklenmez artık)
function addNewRow() {
    // Bu fonksiyon artık kullanılmıyor, modal üzerinden ekleme yapılacak
}

// Hammadde ekleme modalını aç
function openAddHammaddeModal() {
    if (!seciliRadyator) {
        showError('Lütfen önce bir radyatör seçin');
        return;
    }

    const modal = document.getElementById('add-hammadde-modal');
    modal.classList.add('show');
    
    // Dropdown'ı doldur
    populateHammaddeDropdown();
    
    // Formu sıfırla
    document.getElementById('add-hammadde-form').reset();
}

// Hammadde ekleme modalını kapat
function closeAddHammaddeModal() {
    const modal = document.getElementById('add-hammadde-modal');
    modal.classList.remove('show');
}

// Hammadde dropdown'ını doldur
function populateHammaddeDropdown() {
    const select = document.getElementById('hammadde-select');
    select.innerHTML = '<option value="">-- Hammadde Seçin --</option>';
    
    hammaddeler.forEach(hammadde => {
        const option = document.createElement('option');
        option.value = hammadde.id;
        option.textContent = `${hammadde.stok_adi} (${hammadde.birim}) - ${formatCurrency(hammadde.liste_fiyati || 0)}`;
        select.appendChild(option);
    });
}

// Hammadde ekleme form submit
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-hammadde-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const hammaddeId = document.getElementById('hammadde-select').value;
            const miktar = document.getElementById('kullanilan-miktar').value;
            
            if (!hammaddeId || !miktar) {
                showError('Lütfen tüm alanları doldurun');
                return;
            }

            try {
                const response = await fetch(`http://localhost:5000/api/maliyet-dosyasi/${seciliRadyator.id}/hammadde`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        ham_maddeler_id: hammaddeId,
                        kullanilan_miktar_adet: miktar
                    })
                });

                if (response.ok) {
                    closeAddHammaddeModal();
                    await loadMaliyetler();
                    showSuccess('Hammadde başarıyla eklendi');
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Kayıt başarısız');
                }
            } catch (error) {
                console.error('Hammadde ekleme hatası:', error);
                showError('Hammadde eklenirken bir hata oluştu: ' + error.message);
            }
        });
    }
});

// Hammadde seçim modalını aç (eski fonksiyon - ihtiyaç yoksa kaldırılabilir)
function openHammaddeModal(rowIndex) {
    currentRowForHammadde = rowIndex;
    const modal = document.getElementById('hammadde-modal');
    modal.classList.add('show');
    renderHammaddeList();
}

// Satır sil
function deleteRow(id) {
    if (confirm('Bu satırı silmek istediğinizden emin misiniz?')) {
        deleteMaliyetSatiri(id);
    }
}

// Maliyet satırını sil (backend'e istek gönder)
async function deleteMaliyetSatiri(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/maliyet-dosyasi/satir/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            await loadMaliyetler();
            showSuccess('Satır başarıyla silindi');
        } else {
            throw new Error('Silme işlemi başarısız');
        }
    } catch (error) {
        console.error('Silme hatası:', error);
        showError('Satır silinirken bir hata oluştu');
    }
}

// Miktar güncelle
async function updateMiktar(id, value) {
    try {
        const response = await fetch(`http://localhost:5000/api/maliyet-dosyasi/satir/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                kullanilan_miktar_adet: value
            })
        });

        if (response.ok) {
            await loadMaliyetler();
        } else {
            throw new Error('Güncelleme başarısız');
        }
    } catch (error) {
        console.error('Güncelleme hatası:', error);
        showError('Miktar güncellenirken bir hata oluştu');
    }
}

// Fiyat güncelle (artık kullanılmıyor, fiyat sadece okunur)
function updateFiyat(index, value) {
    // Bu fonksiyon artık kullanılmıyor
    // Liste fiyatı ham_maddeler tablosundan gelir, değiştirilemez
}

// Satır toplamını hesapla (artık direkt maliyet değeri kullanılıyor)
function calculateRowTotal(satir) {
    return satir.maliyet || 0;
}

// 3️⃣ Toplam maliyeti hesapla
function calculateTotal() {
    if (!maliyetSatirlari || maliyetSatirlari.length === 0) {
        document.getElementById('toplam-maliyet').textContent = formatCurrency(0);
        return;
    }
    
    const total = maliyetSatirlari.reduce((sum, satir) => {
        const maliyet = parseFloat(satir.maliyet) || 0;
        return sum + maliyet;
    }, 0);
    
    document.getElementById('toplam-maliyet').textContent = formatCurrency(total);
}

// Para formatı
function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(value);
}

// Maliyet verilerini kaydet
async function saveMaliyetler() {
    if (!seciliRadyator) return;

    try {
        const response = await fetch(`http://localhost:5000/api/maliyet-dosyalari/${seciliRadyator.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(maliyetSatirlari)
        });

        if (!response.ok) {
            throw new Error('Kayıt başarısız');
        }
    } catch (error) {
        console.error('Kayıt hatası:', error);
        showError('Kayıt sırasında bir hata oluştu');
    }
}

// 4️⃣ Hammadde listesini yükle
async function loadHammaddeler() {
    try {
        const response = await fetch('http://localhost:5000/api/hammaddeler', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.status === 403 || response.status === 401) {
            alert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
        }

        if (response.ok) {
            hammaddeler = await response.json();
        }
    } catch (error) {
        console.error('Hammaddeler yüklenirken hata:', error);
    }
}

// Hammadde modalını kapat
function closeHammaddeModal() {
    const modal = document.getElementById('hammadde-modal');
    modal.classList.remove('show');
    currentRowForHammadde = null;
}

// Hammadde listesini render et
function renderHammaddeList(searchTerm = '') {
    const container = document.getElementById('hammadde-list');
    container.innerHTML = '';

    const filtered = hammaddeler.filter(h => {
        const searchStr = searchTerm.toLowerCase();
        return (h.stok_kodu || '').toLowerCase().includes(searchStr) ||
               (h.stok_adi || '').toLowerCase().includes(searchStr);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Hammadde bulunamadı</div>';
        return;
    }

    filtered.forEach(hammadde => {
        const item = document.createElement('div');
        item.className = 'hammadde-item';
        item.innerHTML = `
            <strong>${hammadde.stok_adi}</strong>
            <small>${hammadde.stok_kodu} - ${hammadde.birim} - ${formatCurrency(hammadde.liste_fiyati || 0)}</small>
        `;
        item.onclick = () => selectHammadde(hammadde);
        container.appendChild(item);
    });
}

// Hammadde seç
function selectHammadde(hammadde) {
    if (currentRowForHammadde === -1) {
        // Yeni satır ekle
        maliyetSatirlari.push({
            stok_kodu: hammadde.stok_kodu,
            stok_adi: hammadde.stok_adi,
            birim: hammadde.birim,
            miktar: 0,
            fiyat: hammadde.liste_fiyati || 0
        });
    } else if (currentRowForHammadde !== null) {
        // Mevcut satırı güncelle
        maliyetSatirlari[currentRowForHammadde] = {
            stok_kodu: hammadde.stok_kodu,
            stok_adi: hammadde.stok_adi,
            birim: hammadde.birim,
            miktar: maliyetSatirlari[currentRowForHammadde].miktar || 0,
            fiyat: hammadde.liste_fiyati || 0
        };
    }
    
    renderMaliyetTable();
    calculateTotal();
    saveMaliyetler();
    closeHammaddeModal();
}

// 5️⃣ Radyötör seçim modalı
function openRadyatorSelectionModal() {
    const modal = document.getElementById('radyator-selection-modal');
    modal.classList.add('show');
    renderRadyatorSelectionList();
}

function closeRadyatorSelectionModal() {
    const modal = document.getElementById('radyator-selection-modal');
    modal.classList.remove('show');
}

// Radyötör seçim listesini render et
function renderRadyatorSelectionList(searchTerm = '') {
    const container = document.getElementById('radyator-selection-list');
    container.innerHTML = '';

    const filtered = radyatorler.filter(r => {
        const searchStr = searchTerm.toLowerCase();
        const radyatorAdi = (r.radyator_adi || r.adi || '').toLowerCase();
        return radyatorAdi.includes(searchStr);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Radyötör bulunamadı</div>';
        return;
    }

    filtered.forEach(radyator => {
        const item = document.createElement('div');
        item.className = 'radyator-selection-item';
        item.innerHTML = `<strong>${radyator.radyator_adi || radyator.adi}</strong>`;
        item.onclick = () => {
            selectRadyator(radyator);
            closeRadyatorSelectionModal();
        };
        container.appendChild(item);
    });
}

// Yeni radyötör ekleme (eski fonksiyonlar - isteğe bağlı)
function openYeniRadyatorModal() {
    const modal = document.getElementById('yeni-radyator-modal');
    modal.classList.add('show');
    document.getElementById('radyator-adi').value = '';
}

function closeYeniRadyatorModal() {
    const modal = document.getElementById('yeni-radyator-modal');
    modal.classList.remove('show');
}

// Yeni radyötör kaydet
document.getElementById('yeni-radyator-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const adi = document.getElementById('radyator-adi').value.trim();
    if (!adi) return;

    try {
        const response = await fetch('http://localhost:5000/api/radyatorler', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ radyator_adi: adi })
        });

        if (response.ok) {
            closeYeniRadyatorModal();
            await loadRadyatorler();
            showSuccess('Radyötör başarıyla eklendi');
        } else {
            throw new Error('Kayıt başarısız');
        }
    } catch (error) {
        console.error('Radyötör ekleme hatası:', error);
        showError('Radyötör eklenirken bir hata oluştu');
    }
});

// Modal dinleyicilerini ayarla
function setupModalListeners() {
    // Hammadde arama
    document.getElementById('hammadde-search')?.addEventListener('input', (e) => {
        renderHammaddeList(e.target.value);
    });

    // Radyötör seçim arama
    document.getElementById('radyator-selection-search')?.addEventListener('input', (e) => {
        renderRadyatorSelectionList(e.target.value);
    });

    // Modal kapatma butonları
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    // Modal dışına tıklama
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

// Yardımcı fonksiyonlar
function showError(message) {
    alert('Hata: ' + message);
}

function showSuccess(message) {
    alert(message);
}
