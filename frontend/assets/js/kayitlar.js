// kayitlar.js - UI interactions (frontend only)

// Helper function - must be defined before DOMContentLoaded
function escapeHtml(s){ 
	if (!s) return '';
	return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
}

document.addEventListener('DOMContentLoaded', function(){
	console.log('=== kayitlar.js DOM loaded ===');
	const globalSearch = document.getElementById('globalSearch');
	const leftSearch = document.getElementById('leftSearch');
	const tabs = document.querySelectorAll('.tabs .tab');
	const qfs = document.querySelectorAll('.quick-filters .qf');
	const recordsBody = document.getElementById('recordsBody');
	let drawer = null; // Will be created later
	const selectAll = document.getElementById('selectAll');

	console.log('recordsBody:', recordsBody);
	console.log('qfs buttons:', qfs.length);

	// NEW: Track current active table type
	let currentTableType = 'customer';

	// PAGINATION: Variables
	let allRecords = []; // Tüm kayıtlar
	let currentPage = 1; // Şu anki sayfa
	const recordsPerPage = 20; // Sayfa başına kayıt sayısı

	// SEARCH: Variables
	let searchQuery = ''; // Current search query
	let filteredRecords = []; // Filtered records based on search

	// CUSTOMER TYPE FILTER: Variables
	let customerTypeFilter = 'all'; // 'all', 'bireysel', or 'bayi'

	// Toggle Insight Cards functionality
	const toggleBtn = document.getElementById('toggleInsightCards');
	const cardsContainer = document.getElementById('insightCardsContainer');
	
	if(toggleBtn && cardsContainer) {
		// Load saved state from localStorage (default: hidden)
		const savedState = localStorage.getItem('insightCardsVisible');
		const isVisible = savedState === 'true';
		
		if(isVisible) {
			cardsContainer.classList.remove('hidden');
			toggleBtn.classList.add('expanded');
		}
		
		toggleBtn.addEventListener('click', function() {
			const isCurrentlyHidden = cardsContainer.classList.contains('hidden');
			
			if(isCurrentlyHidden) {
				// Show cards
				cardsContainer.classList.remove('hidden');
				toggleBtn.classList.add('expanded');
				localStorage.setItem('insightCardsVisible', 'true');
			} else {
				// Hide cards
				cardsContainer.classList.add('hidden');
				toggleBtn.classList.remove('expanded');
				localStorage.setItem('insightCardsVisible', 'false');
			}
		});
	}

	// Initialize list search functionality
	const listSearchInput = document.getElementById('listSearchInput');
	const clearSearchBtn = document.getElementById('clearSearchBtn');

	if (listSearchInput) {
		listSearchInput.addEventListener('input', debounce(handleListSearch, 300));
	}

	if (clearSearchBtn) {
		clearSearchBtn.addEventListener('click', () => {
			listSearchInput.value = '';
			searchQuery = '';
			clearSearchBtn.style.display = 'none';
			handleListSearch(); // Re-render without filter
		});
	}

	// Load initial records from server
	loadInitialData();

	async function loadInitialData(){
		try{
			// Load statistics for the insight cards
			const res = await fetch('/api/kayitlar/');
			const json = await res.json();
			if(json.success && json.data && json.data.statistics){ 
				// Update statistics cards
				const stats = json.data.statistics;
				const statCustomers = document.getElementById('statCustomers');
				const statSuppliers = document.getElementById('statSuppliers');
				const statProducts = document.getElementById('statProducts');
				const statMaterials = document.getElementById('statMaterials');
				
				if(statCustomers) statCustomers.textContent = stats.customers || 0;
				if(statSuppliers) statSuppliers.textContent = stats.suppliers || 0;
				if(statProducts) statProducts.textContent = stats.products || 0;
				if(statMaterials) statMaterials.textContent = stats.materials || 0;
		}
		
		// Show customer type filter by default (since customer is the default view)
		const customerTypeFilterDiv = document.getElementById('customerTypeFilter');
		if (customerTypeFilterDiv) {
			customerTypeFilterDiv.style.display = 'block';
		}
		
		// Load customer table by default
		loadTableData('customer');
	}catch(err){ console.error('Could not load initial data', err); }
	}	async function loadRecordsFromServer(){
		// This function is kept for backward compatibility
		// Now we use loadTableData instead
		loadTableData(currentTableType);
	}

	function renderRecords(rows){
		// This function is deprecated but kept for backward compatibility
		console.warn('renderRecords is deprecated, using loadTableData instead');
		return;
	}

	// debounce helper
	function debounce(fn, wait){
		let t;
		return function(...args){
			clearTimeout(t);
			t = setTimeout(()=>fn.apply(this,args), wait);
		}
	}

	const doSearch = debounce(()=>{
		const a = (globalSearch && globalSearch.value) ? globalSearch.value : '';
		const b = (leftSearch && leftSearch.value) ? leftSearch.value : '';
		const q = (a || b).trim().toLowerCase();
		for(const r of recordsBody.querySelectorAll('tr')){
			const text = r.innerText.toLowerCase();
			r.style.display = text.includes(q) ? '' : 'none';
		}
	}, 300);

	if(globalSearch) globalSearch.addEventListener('input', doSearch);
	if(leftSearch) leftSearch.addEventListener('input', doSearch);

	// tabs
	tabs.forEach(t=>t.addEventListener('click', (e)=>{
		tabs.forEach(x=>x.classList.remove('active'));
		t.classList.add('active');
		const type = t.dataset.type;
		filterByType(type);
	}));

	qfs.forEach(b=>b.addEventListener('click', ()=>{
		console.log('Button clicked!', b.dataset.type);
		qfs.forEach(x=>x.classList.remove('active'));
		b.classList.add('active');
		const type = b.dataset.type;
		currentTableType = type; // Update current table type
		console.log('Current table type set to:', currentTableType);
		// mirror to tabs if exists
		const matching = Array.from(tabs).find(x=>x.dataset.type===type);
		if(matching){ tabs.forEach(x=>x.classList.remove('active')); matching.classList.add('active'); }
		
		// Show/hide customer type filter based on selected type
		const customerTypeFilterDiv = document.getElementById('customerTypeFilter');
		if (customerTypeFilterDiv) {
			customerTypeFilterDiv.style.display = (type === 'customer') ? 'block' : 'none';
		}
		
		// Reset customer type filter when switching away from customer
		if (type !== 'customer') {
			customerTypeFilter = 'all';
		}
		
		// NEW: Load table data from server
		console.log('About to call loadTableData with type:', type);
		loadTableData(type);
	}));

	// Customer Type Filter Buttons
	const customerTypeButtons = document.querySelectorAll('.customer-type-btn');
	customerTypeButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			// Update active button
			customerTypeButtons.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			
			// Update filter value
			customerTypeFilter = btn.dataset.customerType;
			console.log('Customer type filter set to:', customerTypeFilter);
			
			// Re-render with new filter
			currentPage = 1;
			renderCurrentPageFiltered(currentTableType);
			updatePagination();
		});
	});

	function filterByType(type){
		for(const r of recordsBody.querySelectorAll('tr')){
			if(type==='all' || r.dataset.type===type) r.style.display=''; else r.style.display='none';
		}
	}

	// NEW: Load table data from server dynamically
	async function loadTableData(type) {
		console.log('loadTableData called with type:', type);
		try {
			const res = await fetch(`/api/kayitlar/table/${type}`);
			console.log('Response status:', res.status);
			
			// Check if response is ok
			if (!res.ok) {
				console.error(`Failed to load table data: ${res.status} ${res.statusText}`);
				const text = await res.text();
				console.error('Response body:', text);
				return;
			}
			
			const json = await res.json();
			console.log('Received data:', json);
			if (json.success) {
				console.log('Calling renderTableData with', json.data.length, 'rows');
				renderTableData(type, json.data);
			} else {
				console.error('Failed to load table data:', json.message);
			}
		} catch (err) {
			console.error('Error loading table data:', err);
		}
	}

	// Expose loadTableData to window for reloading after new record
	window.reloadCurrentTable = function() {
		loadTableData(currentTableType);
	};

	// Listen for reload events from new record modal
	document.addEventListener('reloadTableData', (e) => {
		if (e.detail && e.detail.type) {
			currentTableType = e.detail.type;
			loadTableData(e.detail.type);
		}
	});

	// NEW: Render table data based on type
	function renderTableData(type, data) {
		console.log('renderTableData called with type:', type, 'and', data.length, 'rows');
		
		// PAGINATION: Tüm kayıtları sakla
		allRecords = data;
		currentPage = 1; // Yeni veri geldiğinde ilk sayfaya dön
		
		// SEARCH: Reset search when loading new data
		searchQuery = '';
		filteredRecords = [];
		const searchInput = document.getElementById('listSearchInput');
		const clearBtn = document.getElementById('clearSearchBtn');
		if (searchInput) searchInput.value = '';
		if (clearBtn) clearBtn.style.display = 'none';
		
		// Define table headers dynamically
		const thead = document.querySelector('.records-table thead tr');
		console.log('thead element:', thead);
		if (thead) {
			thead.innerHTML = '<th><input id="selectAll" type="checkbox" aria-label="Tümünü seç"></th>';
			
			// Add columns based on type
			if (type === 'customer') {
				thead.innerHTML += '<th>Müşteri Tipi</th><th>Ad/Firma</th><th>Vergi/TC No</th><th>Telefon</th><th>Adres</th><th>İşlemler</th>';
			} else if (type === 'supplier') {
				thead.innerHTML += '<th>Tedarikçi Adı</th><th>Yetkili Kişi</th><th>Telefon</th><th>Adres</th><th></th><th>İşlemler</th>';
			} else if (type === 'product') {
				thead.innerHTML += '<th>Radyatör Adı</th><th>Ölçü</th><th>Dilim Sayısı</th><th>Stok</th><th>Birim Fiyat</th><th>İşlemler</th>';
			} else if (type === 'material') {
				thead.innerHTML += '<th>Hammadde Adı</th><th>Birim</th><th>Liste Fiyatı</th><th>Depo Stok</th><th>Fabrika Stok</th><th>İşlemler</th>';
			}
			
			// Reattach select all handler
			const newSelectAll = document.getElementById('selectAll');
			if(newSelectAll) {
				newSelectAll.addEventListener('change', ()=>{ 
					const all = !!newSelectAll.checked; 
					document.querySelectorAll('.row-select').forEach(cb=>cb.checked = all); 
				});
			}
		}

		// PAGINATION: İlk sayfayı render et
		renderCurrentPage(type);
		updatePagination();
	}

	// SEARCH: Handle list search
	function handleListSearch() {
		const input = document.getElementById('listSearchInput');
		const clearBtn = document.getElementById('clearSearchBtn');
		
		if (!input) return;

		searchQuery = input.value.trim().toLowerCase();
		
		// Show/hide clear button
		if (clearBtn) {
			clearBtn.style.display = searchQuery ? 'flex' : 'none';
		}

		// Filter records based on search query
		if (searchQuery === '') {
			// No search query, show all records
			filteredRecords = allRecords;
		} else {
			// Filter records that match the search query
			filteredRecords = allRecords.filter(record => {
				// Search across all visible fields
				const searchableText = Object.values(record)
					.filter(val => val !== null && val !== undefined)
					.map(val => String(val).toLowerCase())
					.join(' ');
				
				return searchableText.includes(searchQuery);
			});
		}

		// Reset to first page and render with filtered results
		currentPage = 1;
		renderCurrentPageFiltered(currentTableType);
		updatePagination();
	}

	// PAGINATION: Şu anki sayfayı render et (filtered version)
	function renderCurrentPageFiltered(type) {
		recordsBody.innerHTML = '';
		
		// Start with all records or search-filtered records
		let dataToRender = searchQuery ? filteredRecords : allRecords;
		
		// Apply customer type filter if we're on customer table
		if (type === 'customer' && customerTypeFilter !== 'all') {
			dataToRender = dataToRender.filter(record => {
				const recordType = (record.musteri_tipi || '').toLowerCase();
				return recordType === customerTypeFilter;
			});
		}
		
		const startIndex = (currentPage - 1) * recordsPerPage;
		const endIndex = startIndex + recordsPerPage;
		const pageData = dataToRender.slice(startIndex, endIndex);

		console.log('Rendering filtered page', currentPage, 'with', pageData.length, 'rows out of', dataToRender.length, 'total');
		
		// Show "no results" message if empty
		const emptyPanel = document.querySelector('.panel-empty[data-hook="records"]');
		if (pageData.length === 0) {
			if (emptyPanel) {
				if (searchQuery) {
					emptyPanel.textContent = 'Arama sonucu bulunamadı.';
				} else {
					emptyPanel.textContent = 'Henüz kayıt listesi bulunamadı.';
				}
				emptyPanel.classList.add('show');
			}
			return;
		} else {
			if (emptyPanel) {
				emptyPanel.classList.remove('show');
			}
		}

		// Render rows (same logic as renderCurrentPage)
		for (const row of pageData) {
			const tr = document.createElement('tr');
			tr.setAttribute('data-type', type);
			tr.setAttribute('data-id', row.id);
			tr.tabIndex = 0;

			let rowHtml = '<td><input class="row-select" type="checkbox" data-id="' + row.id + '"></td>';

			if (type === 'customer') {
				rowHtml += `
					<td>${escapeHtml(row.musteri_tipi || '')}</td>
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.vergi_no_tc || '—')}</td>
					<td>${escapeHtml(row.telefon || '—')}</td>
					<td>${escapeHtml(row.adres || '—')}</td>
				`;
			} else if (type === 'supplier') {
				rowHtml += `
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.yetkili_kisi || '—')}</td>
					<td>${escapeHtml(row.telefon || '—')}</td>
					<td>${escapeHtml(row.adres || '—')}</td>
					<td></td>
				`;
			} else if (type === 'product') {
				const birimFiyat = row.birim_fiyat ? parseFloat(row.birim_fiyat).toFixed(2) + ' TL' : '—';
				rowHtml += `
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.olcu || '—')}</td>
					<td>${row.dilim_sayisi || '—'}</td>
					<td class="col-stock">${row.stok_miktari || 0}</td>
					<td>${birimFiyat}</td>
				`;
			} else if (type === 'material') {
				const listeFiyati = row.liste_fiyati ? parseFloat(row.liste_fiyati).toFixed(2) + ' TL' : '—';
				rowHtml += `
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.birim || '—')}</td>
					<td>${listeFiyati}</td>
					<td>${row.depo_stok_miktari || 0}</td>
					<td>${row.fabrika_stok_miktari || 0}</td>
				`;
			}

			// Add actions column with menu
			rowHtml += `
				<td class="col-actions" style="position: relative;">
					<button class="more-btn" data-id="${row.id}" aria-label="İşlemler">⋮</button>
				</td>
			`;

			tr.innerHTML = rowHtml;
			recordsBody.appendChild(tr);

			// Attach row click to open drawer (except on checkbox and buttons)
			tr.addEventListener('click', (e) => {
				if (e.target.type === 'checkbox') return;
				if (e.target.classList.contains('more-btn')) return;
				openDrawer(type, row);
			});
		}

		// Attach menu handlers for action buttons
		attachMenuHandlers(type);
	}

	// PAGINATION: Şu anki sayfayı render et
	function renderCurrentPage(type) {
		// Use the filtered version which handles both filtered and non-filtered cases
		renderCurrentPageFiltered(type);
	}

	// Legacy renderCurrentPage kept for reference (now using renderCurrentPageFiltered)
	function renderCurrentPageLegacy(type) {
		recordsBody.innerHTML = '';
		
		const startIndex = (currentPage - 1) * recordsPerPage;
		const endIndex = startIndex + recordsPerPage;
		const pageData = allRecords.slice(startIndex, endIndex);

		console.log('Starting to render page', currentPage, 'with', pageData.length, 'rows');
		// Render rows
		for (const row of pageData) {
			const tr = document.createElement('tr');
			tr.setAttribute('data-type', type);
			tr.setAttribute('data-id', row.id);
			tr.tabIndex = 0;

			let rowHtml = '<td><input class="row-select" type="checkbox" data-id="' + row.id + '"></td>';

			if (type === 'customer') {
				rowHtml += `
					<td>${escapeHtml(row.musteri_tipi || '')}</td>
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.vergi_no_tc || '—')}</td>
					<td>${escapeHtml(row.telefon || '—')}</td>
					<td>${escapeHtml(row.adres || '—')}</td>
				`;
			} else if (type === 'supplier') {
				rowHtml += `
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.yetkili_kisi || '—')}</td>
					<td>${escapeHtml(row.telefon || '—')}</td>
					<td>${escapeHtml(row.adres || '—')}</td>
					<td></td>
				`;
			} else if (type === 'product') {
				const birimFiyat = row.birim_fiyat ? parseFloat(row.birim_fiyat).toFixed(2) + ' TL' : '—';
				rowHtml += `
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.olcu || '—')}</td>
					<td>${row.dilim_sayisi || '—'}</td>
					<td class="col-stock">${row.stok_miktari || 0}</td>
					<td>${birimFiyat}</td>
				`;
			} else if (type === 'material') {
				const listeFiyati = row.liste_fiyati ? parseFloat(row.liste_fiyati).toFixed(2) + ' TL' : '—';
				rowHtml += `
					<td class="col-name">${escapeHtml(row.adi || '')}</td>
					<td>${escapeHtml(row.birim || '')}</td>
					<td>${listeFiyati}</td>
					<td>${row.depo_stok_miktari || 0}</td>
					<td>${row.fabrika_stok_miktari || 0}</td>
				`;
			}

			rowHtml += '<td class="col-actions"><button class="more-btn" aria-label="Daha fazla">⋯</button></td>';
			tr.innerHTML = rowHtml;
			recordsBody.appendChild(tr);
		}

		// Reattach event listeners for row checkboxes
		document.querySelectorAll('.row-select').forEach(cb => cb.addEventListener('change', () => { }));
		
		// Show/hide empty state message
		const emptyMsg = document.querySelector('.panel-empty[data-hook="records"]');
		if(emptyMsg) {
			emptyMsg.style.display = allRecords.length === 0 ? 'block' : 'none';
		}
		
		// Always show table (even if empty) so headers are visible
		const table = document.querySelector('.records-table');
		if(table) {
			table.style.display = 'table'; // Always show table
		}
		
		// If no data, show an empty row message
		if (allRecords.length === 0) {
			const thead = document.querySelector('.records-table thead tr');
			const tr = document.createElement('tr');
			const colCount = thead ? thead.querySelectorAll('th').length : 6;
			tr.innerHTML = `<td colspan="${colCount}" style="text-align: center; padding: 20px; color: #999;">Henüz kayıt bulunamadı</td>`;
			recordsBody.appendChild(tr);
		}
	}

	// PAGINATION: Sayfalama kontrollerini güncelle
	function updatePagination() {
		// Use filtered records if search is active, otherwise use all records
		let dataToUse = searchQuery ? filteredRecords : allRecords;
		
		// Apply customer type filter if we're on customer table
		if (currentTableType === 'customer' && customerTypeFilter !== 'all') {
			dataToUse = dataToUse.filter(record => {
				const recordType = (record.musteri_tipi || '').toLowerCase();
				return recordType === customerTypeFilter;
			});
		}
		
		const totalRecords = dataToUse.length;
		const totalPages = Math.ceil(totalRecords / recordsPerPage);
		
		const paginationContainer = document.getElementById('paginationContainer');
		const paginationInfo = document.getElementById('paginationInfo');
		const paginationNumbers = document.getElementById('paginationNumbers');
		
		const firstPageBtn = document.getElementById('firstPageBtn');
		const prevPageBtn = document.getElementById('prevPageBtn');
		const nextPageBtn = document.getElementById('nextPageBtn');
		const lastPageBtn = document.getElementById('lastPageBtn');

		// Eğer hiç kayıt yoksa pagination'ı gizle
		if (totalRecords === 0) {
			if (paginationContainer) paginationContainer.style.display = 'none';
			return;
		}

		// Pagination'ı göster
		if (paginationContainer) paginationContainer.style.display = 'flex';

		// Info güncelle
		const startRecord = (currentPage - 1) * recordsPerPage + 1;
		const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
		if (paginationInfo) {
			paginationInfo.textContent = `${startRecord}-${endRecord} / ${totalRecords} kayıt`;
		}

		// Buton durumlarını güncelle
		if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
		if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
		if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
		if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;

		// Sayfa numaralarını oluştur
		if (paginationNumbers) {
			paginationNumbers.innerHTML = '';
			
			// En fazla 7 sayfa numarası göster (1 ... 4 5 6 ... 10 gibi)
			const maxVisible = 7;
			let startPage = 1;
			let endPage = totalPages;

			if (totalPages > maxVisible) {
				const halfVisible = Math.floor(maxVisible / 2);
				
				if (currentPage <= halfVisible + 1) {
					// Başlangıca yakınız
					endPage = maxVisible - 1;
				} else if (currentPage >= totalPages - halfVisible) {
					// Sona yakınız
					startPage = totalPages - maxVisible + 2;
				} else {
					// Ortadayız
					startPage = currentPage - halfVisible;
					endPage = currentPage + halfVisible;
				}
			}

			// İlk sayfa
			if (startPage > 1) {
				addPageButton(1);
				if (startPage > 2) {
					addEllipsis();
				}
			}

			// Ortadaki sayfalar
			for (let i = startPage; i <= endPage; i++) {
				addPageButton(i);
			}

			// Son sayfa
			if (endPage < totalPages) {
				if (endPage < totalPages - 1) {
					addEllipsis();
				}
				addPageButton(totalPages);
			}
		}
	}

	// PAGINATION: Sayfa numarası butonu ekle
	function addPageButton(pageNum) {
		const paginationNumbers = document.getElementById('paginationNumbers');
		const btn = document.createElement('button');
		btn.className = 'page-number-btn';
		btn.textContent = pageNum;
		if (pageNum === currentPage) {
			btn.classList.add('active');
		}
		btn.addEventListener('click', () => {
			currentPage = pageNum;
			renderCurrentPageFiltered(currentTableType);
			updatePagination();
		});
		paginationNumbers.appendChild(btn);
	}

	// PAGINATION: Üç nokta ekle
	function addEllipsis() {
		const paginationNumbers = document.getElementById('paginationNumbers');
		const span = document.createElement('span');
		span.className = 'pagination-ellipsis';
		span.textContent = '...';
		paginationNumbers.appendChild(span);
	}

	// PAGINATION: Buton event listener'ları
	document.getElementById('firstPageBtn')?.addEventListener('click', () => {
		currentPage = 1;
		renderCurrentPageFiltered(currentTableType);
		updatePagination();
	});

	document.getElementById('prevPageBtn')?.addEventListener('click', () => {
		if (currentPage > 1) {
			currentPage--;
			renderCurrentPageFiltered(currentTableType);
			updatePagination();
		}
	});

	document.getElementById('nextPageBtn')?.addEventListener('click', () => {
		const dataToUse = searchQuery ? filteredRecords : allRecords;
		const totalPages = Math.ceil(dataToUse.length / recordsPerPage);
		if (currentPage < totalPages) {
			currentPage++;
			renderCurrentPageFiltered(currentTableType);
			updatePagination();
		}
	});

	document.getElementById('lastPageBtn')?.addEventListener('click', () => {
		const dataToUse = searchQuery ? filteredRecords : allRecords;
		const totalPages = Math.ceil(dataToUse.length / recordsPerPage);
		currentPage = totalPages;
		renderCurrentPageFiltered(currentTableType);
		updatePagination();
	});

	// row interactions
	recordsBody.addEventListener('click', (e)=>{
		const tr = e.target.closest('tr');
		if(!tr) return;
		const more = e.target.closest('.more-btn');
		if(more){ openRowMenu(tr, more); return; }
		// single click -> open drawer functionality removed
	});

	// handle keyboard enter on rows - functionality removed

	// Variable to store original info content
	let savedInfoContent = '';

	// Drawer creation
	function createDrawer(){
		const d = document.createElement('div');
		d.className='drawer';
		d.innerHTML = `
			<div class="drawer-header">
				<div class="title">📋 Detay</div>
				<div><button class="close-drawer" aria-label="Kapat">✕</button></div>
			</div>
			<div class="drawer-body">
				<div class="drawer-tabs">
					<nav>
						<button class="dtab active" data-tab="info">Genel Bilgi</button>
						<button class="dtab" data-tab="history">Geçmiş İşlemler</button>
					</nav>
				</div>
				<div class="drawer-content">
					<div class="empty-state">
						<div class="icon">⏳</div>
						<p>İçerik yükleniyor...</p>
					</div>
				</div>
			</div>`;
		document.body.appendChild(d);
		
		// Close button handler
		d.querySelector('.close-drawer').addEventListener('click', ()=>closeDrawer());
		
		// Tab switching handlers
		d.querySelectorAll('.dtab').forEach(tab => {
			tab.addEventListener('click', ()=>{
				d.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
				tab.classList.add('active');
				const tabName = tab.dataset.tab;
				
				if(tabName === 'info') {
					// Restore the original info content
					d.querySelector('.drawer-content').innerHTML = savedInfoContent;
				} else if(tabName === 'history') {
					d.querySelector('.drawer-content').innerHTML = `
						<div class="empty-state">
							<div class="icon">📊</div>
							<p>Geçmiş işlemler burada gösterilecek</p>
						</div>
					`;
				}
			});
		});
		
		return d;
	}

	function openDrawerWithData(tr){
		// Lazy load drawer if not created yet
		if (!drawer) {
			drawer = createDrawer();
		}
		
		// Reset to first tab
		drawer.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
		drawer.querySelector('.dtab[data-tab="info"]')?.classList.add('active');
		
		const type = tr.getAttribute('data-type');
		const id = tr.getAttribute('data-id');
		
		// Get data from row cells
		const cells = tr.querySelectorAll('td');
		const name = tr.querySelector('.col-name')?.innerText.trim() || 'Detay';
		
		// Update drawer title with icon based on type
		let icon = '📋';
		if(type === 'customer') icon = '👤';
		else if(type === 'supplier') icon = '🏭';
		else if(type === 'product') icon = '🔧';
		else if(type === 'material') icon = '📦';
		
		drawer.querySelector('.title').innerText = `${icon} ${name}`;
		
		// Build content based on type
		let contentHtml = '<div class="info-section"><h3>Genel Bilgiler</h3>';
		
		if(type === 'customer') {
			const musteriTipi = cells[1]?.innerText || '—';
			const vergiNo = cells[3]?.innerText || '—';
			const telefon = cells[4]?.innerText || '—';
			const adres = cells[5]?.innerText || '—';
			
			contentHtml += `
				<div class="info-row">
					<span class="info-label">Müşteri Adı</span>
					<span class="info-value"><strong>${escapeHtml(name)}</strong></span>
				</div>
				<div class="info-row">
					<span class="info-label">Müşteri Tipi</span>
					<span class="info-value">${escapeHtml(musteriTipi)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Vergi/TC No</span>
					<span class="info-value">${escapeHtml(vergiNo)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Telefon</span>
					<span class="info-value">${escapeHtml(telefon)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Adres</span>
					<span class="info-value">${escapeHtml(adres)}</span>
				</div>
			`;
		} else if(type === 'supplier') {
			const yetkili = cells[2]?.innerText || '—';
			const telefon = cells[3]?.innerText || '—';
			const adres = cells[4]?.innerText || '—';
			
			contentHtml += `
				<div class="info-row">
					<span class="info-label">Tedarikçi Adı</span>
					<span class="info-value"><strong>${escapeHtml(name)}</strong></span>
				</div>
				<div class="info-row">
					<span class="info-label">Yetkili Kişi</span>
					<span class="info-value">${escapeHtml(yetkili)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Telefon</span>
					<span class="info-value">${escapeHtml(telefon)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Adres</span>
					<span class="info-value">${escapeHtml(adres)}</span>
				</div>
			`;
		} else if(type === 'product') {
			const olcu = cells[2]?.innerText || '—';
			const dilimSayisi = cells[3]?.innerText || '—';
			const stok = cells[4]?.innerText || '0';
			const birimFiyat = cells[5]?.innerText || '—';
			
			contentHtml += `
				<div class="info-row">
					<span class="info-label">Radyatör Adı</span>
					<span class="info-value"><strong>${escapeHtml(name)}</strong></span>
				</div>
				<div class="info-row">
					<span class="info-label">Ölçü</span>
					<span class="info-value">${escapeHtml(olcu)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Dilim Sayısı</span>
					<span class="info-value">${escapeHtml(dilimSayisi)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Stok Miktarı</span>
					<span class="info-value"><strong>${escapeHtml(stok)}</strong></span>
				</div>
				<div class="info-row">
					<span class="info-label">Birim Fiyat</span>
					<span class="info-value"><strong>${escapeHtml(birimFiyat)}</strong></span>
				</div>
			`;
		} else if(type === 'material') {
			const birim = cells[2]?.innerText || '—';
			const listeFiyati = cells[3]?.innerText || '—';
			const depoStok = cells[4]?.innerText || '0';
			const fabrikaStok = cells[5]?.innerText || '0';
			
			contentHtml += `
				<div class="info-row">
					<span class="info-label">Hammadde Adı</span>
					<span class="info-value"><strong>${escapeHtml(name)}</strong></span>
				</div>
				<div class="info-row">
					<span class="info-label">Birim</span>
					<span class="info-value">${escapeHtml(birim)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Liste Fiyatı</span>
					<span class="info-value"><strong>${escapeHtml(listeFiyati)}</strong></span>
				</div>
				<div class="info-row">
					<span class="info-label">Depo Stok</span>
					<span class="info-value">${escapeHtml(depoStok)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Fabrika Stok</span>
					<span class="info-value">${escapeHtml(fabrikaStok)}</span>
				</div>
			`;
		}
		
		contentHtml += '</div>'; // close info-section
		
		drawer.querySelector('.drawer-content').innerHTML = contentHtml;
		
		// Save the info content so we can restore it when switching back to info tab
		savedInfoContent = contentHtml;
		
		openDrawer();
	}

	function openDrawer(){
		if (!drawer) return;
		drawer.classList.add('open');
		showDrawerBackdrop(true);
		// focus trap (simple)
		const focusable = drawer.querySelectorAll('button, [href], input, select, textarea');
		if(focusable.length) focusable[0].focus();
		document.body.style.overflow='hidden';
	}

	function closeDrawer(){
		if (!drawer) return;
		drawer.classList.remove('open');
		showDrawerBackdrop(false);
		document.body.style.overflow='auto';
	}

	function openEditModal(tr) {
		const type = tr.getAttribute('data-type');
		const id = tr.getAttribute('data-id');
		const cells = tr.querySelectorAll('td');
		const name = tr.querySelector('.col-name')?.innerText.trim() || '';
		
		let formHtml = '<form id="editForm">';
		
		if (type === 'customer') {
			const musteriTipi = cells[1]?.innerText || '';
			const vergiNo = cells[3]?.innerText || '';
			const telefon = cells[4]?.innerText || '';
			const adres = cells[5]?.innerText || '';
			
			formHtml += `
				<input type="hidden" name="type" value="customer">
				<input type="hidden" name="id" value="${escapeHtml(id)}">
				
				<label>
					Müşteri Adı *
					<input type="text" name="adi" value="${escapeHtml(name)}" required>
				</label>
				
				<label>
					Müşteri Tipi *
					<select name="musteri_tipi" required>
						<option value="bayi" ${musteriTipi === 'bayi' ? 'selected' : ''}>Bayi</option>
						<option value="bireysel" ${musteriTipi === 'bireysel' ? 'selected' : ''}>Bireysel</option>
					</select>
				</label>
				
				<label>
					Vergi/TC No
					<input type="text" name="vergi_no_tc" value="${escapeHtml(vergiNo === '—' ? '' : vergiNo)}">
				</label>
				
				<label>
					Telefon
					<input type="tel" name="telefon" value="${escapeHtml(telefon === '—' ? '' : telefon)}">
				</label>
				
				<label>
					Adres
					<textarea name="adres" rows="3">${escapeHtml(adres === '—' ? '' : adres)}</textarea>
				</label>
			`;
		} else if (type === 'supplier') {
			const yetkili = cells[2]?.innerText || '';
			const telefon = cells[3]?.innerText || '';
			const adres = cells[4]?.innerText || '';
			
			formHtml += `
				<input type="hidden" name="type" value="supplier">
				<input type="hidden" name="id" value="${escapeHtml(id)}">
				
				<label>
					Tedarikçi Adı *
					<input type="text" name="adi" value="${escapeHtml(name)}" required>
				</label>
				
				<label>
					Yetkili Kişi
					<input type="text" name="yetkili_kisi" value="${escapeHtml(yetkili === '—' ? '' : yetkili)}">
				</label>
				
				<label>
					Telefon
					<input type="tel" name="telefon" value="${escapeHtml(telefon === '—' ? '' : telefon)}">
				</label>
				
				<label>
					Adres
					<textarea name="adres" rows="3">${escapeHtml(adres === '—' ? '' : adres)}</textarea>
				</label>
			`;
		} else if (type === 'product') {
			const olcu = cells[2]?.innerText || '';
			const dilimSayisi = cells[3]?.innerText || '';
			const stok = cells[4]?.innerText || '0';
			const birimFiyatText = cells[5]?.innerText || '';
			const birimFiyat = birimFiyatText.replace(' TL', '').replace('—', '');
			
			formHtml += `
				<input type="hidden" name="type" value="product">
				<input type="hidden" name="id" value="${escapeHtml(id)}">
				
				<label>
					Radyatör Adı *
					<input type="text" name="adi" value="${escapeHtml(name)}" required>
				</label>
				
				<label>
					Ölçü
					<input type="text" name="olcu" value="${escapeHtml(olcu === '—' ? '' : olcu)}">
				</label>
				
				<label>
					Dilim Sayısı
					<input type="number" name="dilim_sayisi" value="${escapeHtml(dilimSayisi === '—' ? '' : dilimSayisi)}" min="0">
				</label>
				
				<label>
					Stok Miktarı
					<input type="number" name="stok_miktari" value="${escapeHtml(stok)}" min="0">
				</label>
				
				<label>
					Birim Fiyat (TL)
					<input type="number" name="birim_fiyat" value="${escapeHtml(birimFiyat)}" step="0.01" min="0">
				</label>
			`;
		} else if (type === 'material') {
			const birim = cells[2]?.innerText || '';
			const listeFiyatiText = cells[3]?.innerText || '';
			const listeFiyati = listeFiyatiText.replace(' TL', '').replace('—', '');
			const depoStok = cells[4]?.innerText || '0';
			const fabrikaStok = cells[5]?.innerText || '0';
			
			formHtml += `
				<input type="hidden" name="type" value="material">
				<input type="hidden" name="id" value="${escapeHtml(id)}">
				
				<label>
					Hammadde Adı *
					<input type="text" name="adi" value="${escapeHtml(name)}" required>
				</label>
				
				<label>
					Birim
					<input type="text" name="birim" value="${escapeHtml(birim === '—' ? '' : birim)}">
				</label>
				
				<label>
					Liste Fiyatı (TL)
					<input type="number" name="liste_fiyati" value="${escapeHtml(listeFiyati)}" step="0.01" min="0">
				</label>
				
				<label>
					Depo Stok
					<input type="number" name="depo_stok_miktari" value="${escapeHtml(depoStok)}" min="0">
				</label>
				
				<label>
					Fabrika Stok
					<input type="number" name="fabrika_stok_miktari" value="${escapeHtml(fabrikaStok)}" min="0">
				</label>
			`;
		}
		
		formHtml += '</form>';
		
		openModal('✏️ Kayıt Düzenle', formHtml, `
			<button id="editCancel" class="btn">İptal</button>
			<button id="editSave" class="btn primary">Kaydet</button>
		`);
		
		// Event handlers
		setTimeout(() => {
			document.getElementById('editCancel')?.addEventListener('click', () => {
				closeModal();
			});
			
			document.getElementById('editSave')?.addEventListener('click', async () => {
				const form = document.getElementById('editForm');
				if (!form.checkValidity()) {
					form.reportValidity();
					return;
				}
				
				const formData = new FormData(form);
				const data = {};
				formData.forEach((value, key) => {
					if (key !== 'type' && key !== 'id') {
						data[key] = value;
					}
				});
				
				const recordType = formData.get('type');
				const recordId = formData.get('id');
				
				try {
					const saveBtn = document.getElementById('editSave');
					if (saveBtn) {
						saveBtn.disabled = true;
						saveBtn.textContent = 'Kaydediliyor...';
					}
					
					const response = await fetch(`/api/kayitlar/records/${recordId}?type=${recordType}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(data)
					});
					
					const result = await response.json();
					
					if (result.success) {
						showToast('✅ Kayıt başarıyla güncellendi');
						closeModal();
						// Reload the table data
						loadTableData(currentTableType);
					} else {
						alert('Hata: ' + (result.message || 'Güncelleme başarısız'));
						if (saveBtn) {
							saveBtn.disabled = false;
							saveBtn.textContent = 'Kaydet';
						}
					}
				} catch (error) {
					console.error('Update error:', error);
					alert('Sunucu hatası: ' + error.message);
					const saveBtn = document.getElementById('editSave');
					if (saveBtn) {
						saveBtn.disabled = false;
						saveBtn.textContent = 'Kaydet';
					}
				}
			});
		}, 50);
	}

	function openRowMenu(tr, btn){
		// Close any existing menu first
		const existingMenu = document.querySelector('.row-menu');
		if(existingMenu) existingMenu.remove();
		
		// Create contextual menu
		const menu = document.createElement('div');
		menu.className='row-menu';
		
		// Calculate position
		const btnRect = btn.getBoundingClientRect();
		const scrollY = window.scrollY || window.pageYOffset;
		const scrollX = window.scrollX || window.pageXOffset;
		
		// Position below the button, aligned to the right
		menu.style.top = (btnRect.bottom + scrollY + 4) + 'px';
		menu.style.right = (window.innerWidth - btnRect.right - scrollX) + 'px';
		
		menu.innerHTML = `
			<button class='mview'>Detayı Görüntüle</button>
			<button class='medit'>Düzenle</button>
			<button class='mdelete'>Sil</button>
		`;
		
		document.body.appendChild(menu);
		
		// Auto-adjust if menu goes off-screen
		const menuRect = menu.getBoundingClientRect();
		if(menuRect.bottom > window.innerHeight) {
			// Position above the button instead
			menu.style.top = (btnRect.top + scrollY - menuRect.height - 4) + 'px';
		}
		if(menuRect.left < 0) {
			// Align to the left edge of the button if off-screen
			menu.style.right = 'auto';
			menu.style.left = (btnRect.left + scrollX) + 'px';
		}
		
		// Close menu on outside click or escape
		const remove = (e)=>{ 
			if(e && e.target && menu.contains(e.target)) return; // Don't close if clicking inside menu
			menu.remove(); 
			document.removeEventListener('click', remove);
			document.removeEventListener('keydown', escapeHandler);
		};
		
		const escapeHandler = (e)=>{ 
			if(e.key === 'Escape'){ 
				e.preventDefault();
				remove(); 
			}
		};
		
		setTimeout(()=>{
			document.addEventListener('click', remove);
			document.addEventListener('keydown', escapeHandler);
		}, 10);
		
		// Menu action handlers
		menu.querySelector('.mview').addEventListener('click', (e)=>{ 
			e.stopPropagation();
			openDrawerWithData(tr); 
			remove(); 
		});
		
		menu.querySelector('.medit')?.addEventListener('click', (e)=>{ 
			e.stopPropagation();
			openEditModal(tr); 
			remove(); 
		});
		
		menu.querySelector('.mdelete')?.addEventListener('click', (e)=>{ 
			e.stopPropagation();
			openDeleteConfirmModal(tr);
			remove(); 
		});
	}

	// Delete confirmation modal
	function openDeleteConfirmModal(tr) {
		console.log('openDeleteConfirmModal called', tr);
		const deleteModal = document.getElementById('deleteConfirmModal');
		console.log('deleteModal element:', deleteModal);
		const deleteConfirmClose = document.getElementById('deleteConfirmClose');
		const deleteConfirmNo = document.getElementById('deleteConfirmNo');
		const deleteConfirmYes = document.getElementById('deleteConfirmYes');
		
		if (!deleteModal) {
			console.error('Delete modal not found!');
			return;
		}
		
		// Get record info
		const type = tr.getAttribute('data-type');
		const id = tr.getAttribute('data-id');
		const name = tr.querySelector('.col-name')?.innerText.trim() || '';
		
		// Update modal content
		const bodyEl = document.getElementById('deleteConfirmBody');
		if (bodyEl) {
			bodyEl.innerHTML = `
				<p style="margin: 0 0 16px 0; font-size: 16px;">
					<strong>${escapeHtml(name)}</strong> kaydını silmek istediğinize emin misiniz?
				</p>
				<p style="margin: 0; color: #666; font-size: 14px;">Bu işlem geri alınamaz.</p>
			`;
		}
		
		// Show modal
		deleteModal.hidden = false;
		deleteModal.classList.add('show');
		console.log('Modal should be visible now. Hidden:', deleteModal.hidden, 'Classes:', deleteModal.className);
		console.log('Modal computed style:', window.getComputedStyle(deleteModal).display);
		
		// Close handlers
		const closeModal = () => {
			deleteModal.classList.remove('show');
			setTimeout(() => deleteModal.hidden = true, 160);
		};
		
		// Remove old event listeners by cloning
		const newDeleteConfirmClose = deleteConfirmClose?.cloneNode(true);
		const newDeleteConfirmNo = deleteConfirmNo?.cloneNode(true);
		const newDeleteConfirmYes = deleteConfirmYes?.cloneNode(true);
		
		if (deleteConfirmClose && newDeleteConfirmClose) {
			deleteConfirmClose.parentNode.replaceChild(newDeleteConfirmClose, deleteConfirmClose);
		}
		if (deleteConfirmNo && newDeleteConfirmNo) {
			deleteConfirmNo.parentNode.replaceChild(newDeleteConfirmNo, deleteConfirmNo);
		}
		if (deleteConfirmYes && newDeleteConfirmYes) {
			deleteConfirmYes.parentNode.replaceChild(newDeleteConfirmYes, deleteConfirmYes);
		}
		
		// Add event listeners
		if (newDeleteConfirmClose) {
			newDeleteConfirmClose.addEventListener('click', closeModal);
		}
		
		if (newDeleteConfirmNo) {
			newDeleteConfirmNo.addEventListener('click', closeModal);
		}
		
		if (newDeleteConfirmYes) {
			newDeleteConfirmYes.addEventListener('click', async () => {
				try {
					// Disable button and show loading state
					newDeleteConfirmYes.disabled = true;
					newDeleteConfirmYes.textContent = 'Siliniyor...';
					
					// Call delete API
					const response = await fetch(`/api/kayitlar/records/${id}?type=${type}`, {
						method: 'DELETE',
						headers: {
							'Content-Type': 'application/json'
						}
					});
					
					const result = await response.json();
					
					if (result.success) {
						showToast('✅ Kayıt başarıyla silindi');
						closeModal();
						// Reload the table data
						loadTableData(currentTableType);
					} else {
						alert('Hata: ' + (result.message || 'Silme başarısız'));
						newDeleteConfirmYes.disabled = false;
						newDeleteConfirmYes.textContent = 'Evet, Sil';
					}
				} catch (error) {
					console.error('Delete error:', error);
					alert('Sunucu hatası: ' + error.message);
					newDeleteConfirmYes.disabled = false;
					newDeleteConfirmYes.textContent = 'Evet, Sil';
				}
			});
		}
		
		// Focus on "No" button by default
		setTimeout(() => {
			if (newDeleteConfirmNo) newDeleteConfirmNo.focus();
		}, 50);
	}

});


// QUICK SALE / QUICK PURCHASE modals and stock simulation
(function(){
	function openQuickSale(tr){
		const name = tr.querySelector('.col-name')?.innerText || '';
		const stock = parseStockFromRow(tr);
		const body = `
			<form id="quickSaleForm">
				<div><strong>${escapeHtml(name.split('\n')[0])}</strong></div>
				<div>Stok: <span id="qsStock">${stock}</span></div>
				<label>Miktar <input id="qsQty" type="number" min="1" value="1" required></label>
			</form>
		`;
		openModal('Hızlı Satış', body, `<button id="qsCancel" class="btn">İptal</button><button id="qsSave" class="btn primary">Kaydet</button>`);
		setTimeout(()=>{
			document.getElementById('qsCancel').addEventListener('click', ()=>{ closeModal(); });
			document.getElementById('qsSave').addEventListener('click', ()=>{
				const qty = Number(document.getElementById('qsQty').value || 0);
				if(qty<=0){ alert('Geçerli miktar girin'); return; }
				const currentStock = parseStockFromRow(tr);
				if(!Number.isFinite(currentStock)){ alert('Bu öğe için stok bilgisi yok.'); return; }
				if(qty>currentStock){
					if(!confirm(`Stokta sadece ${currentStock} adet var — onaylıyor musunuz? (backorder)`)) return;
				}
				// simulate stock update
				const newStock = currentStock - qty;
				updateStockOnRow(tr, newStock);
				closeModal();
				showToast('Satış kaydedildi — stok güncellendi.');
			});
		},20);
	}

	function openQuickPurchase(tr){
		const name = tr.querySelector('.col-name')?.innerText || '';
		const body = `
			<form id="quickPurchaseForm">
				<div><strong>${escapeHtml(name.split('\n')[0])}</strong></div>
				<label>Miktar <input id="qpQty" type="number" min="1" value="1" required></label>
				<label>Fatura No <input id="qpInvoice" type="text"></label>
			</form>
		`;
		openModal('Hızlı Alım', body, `<button id="qpCancel" class="btn">İptal</button><button id="qpSave" class="btn primary">Kaydet</button>`);
		setTimeout(()=>{
			document.getElementById('qpCancel').addEventListener('click', ()=>{ closeModal(); });
			document.getElementById('qpSave').addEventListener('click', ()=>{
				const qty = Number(document.getElementById('qpQty').value || 0);
				if(qty<=0){ alert('Geçerli miktar girin'); return; }
				// simulate stock increase if applicable
				const currentStock = parseStockFromRow(tr);
				if(!Number.isFinite(currentStock)){
					// if no stock column, just show toast
					closeModal(); showToast('Alım kaydedildi.'); return;
				}
				const newStock = currentStock + qty;
				updateStockOnRow(tr, newStock);
				closeModal();
				showToast('Alım kaydedildi — stok güncellendi.');
			});
		},20);
	}

	// Helper: parse stock from row (prefers data-stock attribute, falls back to cell text)
	function parseStockFromRow(tr){
		const ds = tr.getAttribute('data-stock');
		if(ds!=null){ const n = Number(ds); return Number.isFinite(n)?n:NaN; }
		const cell = tr.querySelector('.col-stock');
		if(!cell) return NaN;
		// Keep only digits, dot and minus sign
		const txt = cell.innerText.replace(/[^0-9.\-]/g,'').trim();
		const n = Number(txt);
		return Number.isFinite(n)?n:NaN;
	}

	function updateStockOnRow(tr, newStock){
		tr.setAttribute('data-stock', String(newStock));
		const cell = tr.querySelector('.col-stock');
		if(cell) cell.innerText = String(newStock);
	}

	// Expose to global scope for calls from row menu and drawer
	window.openQuickSale = openQuickSale;
	window.openQuickPurchase = openQuickPurchase;

	// Wire drawer buttons by delegating click on document (drawer created dynamically)
	document.addEventListener('click', (e)=>{
		const ds = e.target;
		if(ds.classList && ds.classList.contains('action')){
			const label = ds.innerText.toLowerCase();
			// find selected/active row name from drawer title to map back to row
			const title = document.querySelector('.drawer .title')?.innerText || '';
			const candidate = Array.from(document.querySelectorAll('#recordsBody tr')).find(r=>r.querySelector('.col-name')?.innerText.includes(title));
			if(label.includes('sat')){ if(candidate) openQuickSale(candidate); }
			if(label.includes('al')){ if(candidate) openQuickPurchase(candidate); }
		}
	});

})();

// NEW RECORD MODAL SYSTEM
;(function() {
	const newRecordModal = document.getElementById('newRecordModal');
	const newRecordClose = document.getElementById('newRecordClose');
	const newRecordCancel = document.getElementById('newRecordCancel');
	const newRecordSave = document.getElementById('newRecordSave');
	const newRecordForm = document.getElementById('newRecordForm');
	const newRecordBtn = document.getElementById('newRecordBtn');

	// Get current table type from active button
	function getCurrentTableType() {
		const activeBtn = document.querySelector('.quick-filters .qf.active');
		return activeBtn ? activeBtn.dataset.type : 'customer';
	}

	// Form templates for each table type
	const formTemplates = {
		customer: `
			<label>Müşteri Adı/Firma Adı *
				<input name="adi" type="text" placeholder="Örn: Ahmet Yılmaz veya ABC Ltd." required>
			</label>
			<label>Müşteri Tipi *
				<select name="musteri_tipi" required>
					<option value="Bireysel">Bireysel</option>
					<option value="Bayi">Bayi</option>
				</select>
			</label>
			<label>Vergi No / T.C. Kimlik No
				<input name="vergi_no_tc" type="text" placeholder="Vergi numarası veya T.C.">
			</label>
			<label>Telefon
				<input name="telefon" type="tel" placeholder="0555 123 4567">
			</label>
			<label>Adres
				<textarea name="adres" placeholder="Tam adres bilgisi..." rows="3"></textarea>
			</label>
		`,
		supplier: `
			<label>Tedarikçi Adı *
				<input name="adi" type="text" placeholder="Tedarikçi firma adı" required>
			</label>
			<label>Yetkili Kişi
				<input name="yetkili_kisi" type="text" placeholder="İsim Soyisim">
			</label>
			<label>Telefon
				<input name="telefon" type="tel" placeholder="0555 123 4567">
			</label>
			<label>Adres
				<textarea name="adres" placeholder="Tam adres bilgisi..." rows="3"></textarea>
			</label>
		`,
		product: `
			<label>Radyatör Adı *
				<input name="adi" type="text" placeholder="Örn: Panel Radyatör 600x1200" required>
			</label>
			<div class="form-row">
				<label>Ölçü
					<input name="olcu" type="text" placeholder="Örn: 600x1200">
				</label>
				<label>Dilim Sayısı
					<input name="dilim_sayisi" type="number" min="1" placeholder="Örn: 8">
				</label>
			</div>
			<label>Kategori
				<input name="kategori" type="text" placeholder="Örn: Panel, Alüminyum">
			</label>
			<div class="form-row">
				<label>Stok Miktarı
					<input name="stok_miktari" type="number" min="0" value="0">
				</label>
				<label>Minimum Stok
					<input name="minimum_stok" type="number" min="0" value="0">
				</label>
			</div>
			<div class="form-row">
				<label>Birim Fiyat (TL)
					<input name="birim_fiyat" type="number" step="0.01" min="0" value="0">
				</label>
			</div>
		`,
		material: `
			<label>Hammadde Adı *
				<input name="adi" type="text" placeholder="Örn: Alüminyum Profil" required>
			</label>
			<label>Birim *
				<select name="birim" required>
					<option value="kg">Kilogram (kg)</option>
					<option value="adet">Adet</option>
					<option value="m">Metre (m)</option>
					<option value="m2">Metrekare (m²)</option>
					<option value="litre">Litre</option>
				</select>
			</label>
			<div class="form-row">
				<label>Depo Stok Miktarı
					<input name="depo_stok_miktari" type="number" step="0.01" min="0" value="0">
				</label>
				<label>Fabrika Stok Miktarı
					<input name="fabrika_stok_miktari" type="number" step="0.01" min="0" value="0">
				</label>
			</div>
			<div class="form-row">
				<label>Minimum Stok
					<input name="minimum_stok" type="number" min="0" value="0">
				</label>
				<label>Liste Fiyatı (TL)
					<input name="liste_fiyati" type="number" step="0.01" min="0" value="0">
				</label>
			</div>
			<label>Kaynak Tipi
				<select name="kaynak_tipi">
					<option value="Kendi Stok">Kendi Stok</option>
					<option value="Fabrika Temin">Fabrika Temin</option>
				</select>
			</label>
		`
	};

	const formTitles = {
		customer: 'Yeni Müşteri Ekle',
		supplier: 'Yeni Tedarikçi Ekle',
		product: 'Yeni Radyatör Ekle',
		material: 'Yeni Hammadde Ekle'
	};

	function openNewRecordModal() {
		const type = getCurrentTableType();
		const title = formTitles[type] || 'Yeni Kayıt Ekle';
		const formHtml = formTemplates[type] || '';

		document.getElementById('newRecordTitle').innerText = title;
		newRecordForm.innerHTML = formHtml;
		newRecordForm.dataset.type = type;
		
		newRecordModal.hidden = false;
		newRecordModal.classList.add('show');
		
		setTimeout(() => {
			const firstInput = newRecordForm.querySelector('input, select, textarea');
			if (firstInput) firstInput.focus();
		}, 50);
	}

	function closeNewRecordModal() {
		newRecordModal.classList.remove('show');
		setTimeout(() => {
			newRecordModal.hidden = true;
			newRecordForm.innerHTML = '';
		}, 160);
	}

	async function saveNewRecord() {
		const type = newRecordForm.dataset.type;
		const formData = new FormData(newRecordForm);
		const data = {};
		
		// Convert FormData to object
		for (let [key, value] of formData.entries()) {
			data[key] = value;
		}

		// Basic validation
		if (!data.adi || !data.adi.trim()) {
			alert('Lütfen gerekli alanları doldurun');
			return;
		}

		try {
			console.log('Saving new record:', type, data);
			const res = await fetch(`/api/kayitlar/table/${type}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			console.log('Response status:', res.status, res.statusText);
			
			if (!res.ok) {
				const text = await res.text();
				console.error('Error response:', text);
				alert('Sunucu hatası: ' + res.status + ' ' + text.substring(0, 100));
				return;
			}

			const json = await res.json();
			
			if (json.success) {
				closeNewRecordModal();
				showToast('Kayıt başarıyla eklendi');
				// Reload table data - dispatch event
				document.dispatchEvent(new CustomEvent('reloadTableData', { detail: { type } }));
			} else {
				alert('Hata: ' + (json.message || 'Kayıt eklenemedi'));
			}
		} catch (err) {
			console.error('Error saving record:', err);
			alert('Sunucu hatası: Kayıt eklenemedi - ' + err.message);
		}
	}

	// Helper to call loadTableData from outside the main closure
	function loadTableDataGlobal(type) {
		// Trigger a custom event that the main script can listen to
		document.dispatchEvent(new CustomEvent('reloadTableData', { detail: { type } }));
	}

	// Event listeners
	if (newRecordBtn) {
		newRecordBtn.addEventListener('click', openNewRecordModal);
	}
	
	if (newRecordClose) {
		newRecordClose.addEventListener('click', closeNewRecordModal);
	}
	
	if (newRecordCancel) {
		newRecordCancel.addEventListener('click', closeNewRecordModal);
	}
	
	if (newRecordSave) {
		newRecordSave.addEventListener('click', saveNewRecord);
	}

	// Toast helper - make it global
	window.showToast = function(msg) {
		const t = document.createElement('div');
		t.className = 'toast';
		t.innerText = msg;
		t.style.position = 'fixed';
		t.style.bottom = '18px';
		t.style.right = '18px';
		t.style.background = 'var(--card)';
		t.style.padding = '10px 14px';
		t.style.boxShadow = 'var(--shadow)';
		t.style.zIndex = '2100';
		t.style.borderRadius = '8px';
		document.body.appendChild(t);
		setTimeout(() => t.remove(), 3200);
	};
})();

// OLD MODAL SYSTEM (for other modals)
;(function(){
	const modalOverlay = document.getElementById('modalOverlay');
	const modalTitle = document.getElementById('modalTitle');
	const modalBody = document.getElementById('modalBody');
	const modalFooter = document.getElementById('modalFooter');
	const modalClose = document.getElementById('modalClose');
	const exportBtn = document.getElementById('exportBtn');

	// Make these functions global so they can be accessed from openEditModal
	window.openModal = function(title, bodyHtml, footerHtml){
		modalTitle.innerText = title;
		modalBody.innerHTML = bodyHtml;
		modalFooter.innerHTML = footerHtml || '';
		modalOverlay.hidden = false;
		modalOverlay.classList.add('show');
		// focus first input if any
		setTimeout(()=>{
			const f = modalOverlay.querySelector('input, button, select, textarea');
			if(f) f.focus();
		},50);
	};
	
	window.closeModal = function(){ 
		modalOverlay.classList.remove('show'); 
		setTimeout(()=>{ 
			modalOverlay.hidden = true; 
			modalBody.innerHTML=''; 
			modalFooter.innerHTML=''; 
		}, 160); 
	};

// Backdrop helper for drawer
function showDrawerBackdrop(show){
	let bd = document.querySelector('.drawer-backdrop');
	if(show){
		if(!bd){ bd = document.createElement('div'); bd.className='drawer-backdrop'; document.body.appendChild(bd); /* small delay to allow transition */ setTimeout(()=>bd.classList.add('show'),10); }
		// clicking backdrop closes drawer
		bd.addEventListener('click', ()=>{ closeDrawer(); });
	} else {
		if(bd){ bd.classList.remove('show'); setTimeout(()=>bd.remove(),220); }
	}
}

	if(modalClose) modalClose.addEventListener('click', closeModal);
	// Extra safe hide in case animation or class removal doesn't immediately hide
	if(modalClose) modalClose.addEventListener('click', ()=>{ modalOverlay.classList.remove('show'); modalOverlay.hidden = true; modalBody.innerHTML=''; modalFooter.innerHTML=''; });

	// PDF Export functionality
	if(exportBtn) exportBtn.addEventListener('click', ()=> {
		// Get all checked rows
		const checkedRows = document.querySelectorAll('#recordsBody input[type="checkbox"]:checked');
		
		if(checkedRows.length === 0) {
			showToast('Lütfen dışa aktarmak için en az bir satır seçin.');
			return;
		}

		// Determine the report title based on current table type
		let reportTitle = '';
		let fileName = '';
		
		// Get current active filter to determine record type
		const activeFilter = document.querySelector('.quick-filters .qf.active');
		const recordType = activeFilter ? activeFilter.dataset.type : 'customer';
		
		switch(recordType) {
			case 'customer':
				reportTitle = 'Enerji Deposundaki Müşteri Listesi';
				fileName = 'musteriler';
				break;
			case 'supplier':
				reportTitle = 'Enerji Deposundaki Tedarikçi Listesi';
				fileName = 'tedarikciler';
				break;
			case 'product':
				reportTitle = 'Enerji Deposundaki Radyatör Listesi';
				fileName = 'radyatorler';
				break;
			case 'material':
				reportTitle = 'Enerji Deposundaki Hammadde Listesi';
				fileName = 'hammaddeler';
				break;
			default:
				reportTitle = 'Enerji Kayıtlar Raporu';
				fileName = 'kayitlar';
		}

		// Define column headers based on record type
		let tableHeaders = [];
		let columnWidths = {};
		
		switch(recordType) {
			case 'customer':
				tableHeaders = ['Müşteri Tipi', 'Ad/Firma', 'Vergi/TC No', 'Telefon', 'Adres'];
				columnWidths = { 0: 25, 1: 40, 2: 30, 3: 30, 4: 45 };
				break;
			case 'supplier':
				tableHeaders = ['Tedarikçi Adı', 'Yetkili Kişi', 'Telefon', 'Adres'];
				columnWidths = { 0: 45, 1: 40, 2: 30, 3: 55 };
				break;
			case 'product':
				tableHeaders = ['Radyatör Adı', 'Ölçü', 'Dilim Sayısı', 'Stok', 'Birim Fiyat'];
				columnWidths = { 0: 50, 1: 30, 2: 30, 3: 25, 4: 35 };
				break;
			case 'material':
				tableHeaders = ['Hammadde Adı', 'Birim', 'Liste Fiyatı', 'Depo Stok', 'Fabrika Stok'];
				columnWidths = { 0: 50, 1: 25, 2: 30, 3: 30, 4: 35 };
				break;
		}

		// Collect data from checked rows
		const exportData = [];
		checkedRows.forEach(checkbox => {
			const row = checkbox.closest('tr');
			const cells = row.querySelectorAll('td');
			
			// Extract text from each cell (skip checkbox column and actions column)
			const rowData = [];
			for (let i = 1; i < cells.length - 1; i++) {
				// Skip empty cells for suppliers
				if (recordType === 'supplier' && i === 5) continue;
				rowData.push(cells[i]?.textContent.trim() || '—');
			}
			exportData.push(rowData);
		});

		// Generate PDF
		try {
			const { jsPDF } = window.jspdf;
			const doc = new jsPDF('landscape'); // Use landscape for better table display
			
			// Add company logo or header (optional)
			doc.setFillColor(15, 122, 254);
			doc.rect(0, 0, 297, 25, 'F');
			
			// Add title in white on blue background
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(18);
			doc.setFont('helvetica', 'bold');
			doc.text(reportTitle, 14, 15);
			
			// Add date and record count
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			const today = new Date().toLocaleDateString('tr-TR', { 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			});
			doc.text(`Rapor Tarihi: ${today}`, 14, 21);
			doc.text(`Toplam Kayıt: ${exportData.length}`, 200, 21);
			
			// Reset text color for table
			doc.setTextColor(0, 0, 0);
			
			// Add table using autoTable plugin
			doc.autoTable({
				head: [tableHeaders],
				body: exportData,
				startY: 30,
				theme: 'grid',
				styles: { 
					font: 'helvetica',
					fontSize: 9,
					cellPadding: 4,
					lineColor: [200, 200, 200],
					lineWidth: 0.1
				},
				headStyles: { 
					fillColor: [15, 122, 254],
					textColor: [255, 255, 255],
					fontStyle: 'bold',
					fontSize: 10,
					halign: 'left',
					cellPadding: 5
				},
				alternateRowStyles: {
					fillColor: [248, 249, 250]
				},
				columnStyles: columnWidths,
				margin: { left: 14, right: 14 },
				didDrawPage: function (data) {
					// Footer with page numbers
					doc.setFontSize(8);
					doc.setTextColor(128, 128, 128);
					const pageCount = doc.internal.getNumberOfPages();
					const pageSize = doc.internal.pageSize;
					const pageHeight = pageSize.height || pageSize.getHeight();
					doc.text(
						`Sayfa ${data.pageNumber} / ${pageCount}`, 
						data.settings.margin.left, 
						pageHeight - 10
					);
					doc.text(
						'Enerji Yönetim Sistemi', 
						pageSize.width - 70, 
						pageHeight - 10
					);
				}
			});
			
			// Save the PDF with dynamic filename
			const timestamp = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
			doc.save(`${fileName}_${timestamp}.pdf`);
			showToast(`${exportData.length} kayıt PDF olarak dışa aktarıldı.`);
			
		} catch(error) {
			console.error('PDF oluşturma hatası:', error);
			showToast('PDF oluşturulurken bir hata oluştu.');
		}
	});

	function showToast(msg){
		const t = document.createElement('div');
		t.className='toast'; t.innerText = msg;
		t.style.position='fixed'; t.style.bottom='18px'; t.style.right='18px'; t.style.background='var(--card)'; t.style.padding='10px 14px'; t.style.boxShadow= 'var(--shadow)'; t.style.zIndex='2100';
		document.body.appendChild(t);
		setTimeout(()=>t.remove(), 3200);
	}

	function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

})();

	// Final UX features: saved views, view toggle, export CSV, ESC handling, focus trap
	(function(){
		const saveViewBtn = document.getElementById('saveViewBtn');
		const savedViewsList = document.getElementById('savedViewsList');
		const viewTableBtn = document.getElementById('viewTable');
		const viewCardBtn = document.getElementById('viewCard');
		const cardContainer = document.getElementById('cardContainer');
		const exportCsvBtn = document.getElementById('exportCsv');

		// Saved views in localStorage
		// Saved views: guard in case related DOM elements were removed
		function loadSavedViews(){
			if(!savedViewsList) return;
			const data = JSON.parse(localStorage.getItem('savedViews')||'[]');
			renderSavedViews(data);
		}
		function renderSavedViews(list){
			if(!savedViewsList) return;
			if(!list.length) savedViewsList.innerText='Henüz kayıtlı görünüm yok.';
			else{
				savedViewsList.innerHTML = list.map((v,i)=>`<div><button class="sv-btn" data-id="${i}">${escapeHtml(v.name)}</button></div>`).join('');
				document.querySelectorAll('.sv-btn').forEach(b=>b.addEventListener('click', ()=>{
					const id = b.dataset.id; applySavedView(list[id]);
				}));
			}
		}
		function applySavedView(view){
			if(!view) return;
			// simple: apply qf type filter if present
			if(view.type){ document.querySelectorAll('.qf').forEach(q=> q.classList.toggle('active', q.dataset.type===view.type)); const matching = Array.from(document.querySelectorAll('.tabs .tab')).find(x=>x.dataset.type===view.type); if(matching){ document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active')); matching.classList.add('active'); }
			}
			showToast('Kaydedilmiş görünüm uygulandı.');
		}
		if(saveViewBtn) saveViewBtn.addEventListener('click', ()=>{
			const activeQ = document.querySelector('.quick-filters .qf.active')?.dataset.type || 'all';
			const name = prompt('Görünüm adı:','Sık kullanılan'); if(!name) return;
			const data = JSON.parse(localStorage.getItem('savedViews')||'[]'); data.push({name, type:activeQ}); localStorage.setItem('savedViews', JSON.stringify(data)); loadSavedViews();
		});
		loadSavedViews();

		// View toggle
		if(viewTableBtn && viewCardBtn){
			viewTableBtn.addEventListener('click', ()=>{ viewTableBtn.setAttribute('aria-pressed','true'); viewCardBtn.setAttribute('aria-pressed','false'); document.querySelector('.records-table').style.display='table'; if(cardContainer) cardContainer.style.display='none'; });
			viewCardBtn.addEventListener('click', ()=>{ viewTableBtn.setAttribute('aria-pressed','false'); viewCardBtn.setAttribute('aria-pressed','true'); renderCards(); document.querySelector('.records-table').style.display='none'; if(cardContainer) cardContainer.style.display='grid'; });
		}
		function renderCards(){
			const rows = Array.from(document.querySelectorAll('#recordsBody tr')).filter(r=>r.style.display!=='none');
			cardContainer.innerHTML = rows.map(r=>{
				const type = r.dataset.type||''; const name = r.querySelector('.col-name')?.innerText||''; const meta = r.querySelector('.col-meta')?.innerText||''; const stock = r.querySelector('.col-stock')?.innerText||'';
				return `<div class="card"><div class="card-head">${escapeHtml(name)}</div><div class="card-meta">${escapeHtml(meta)}<div class="card-stock">Stok: ${escapeHtml(stock)}</div></div></div>`;
			}).join('');
		}

		// Export CSV (visible rows)
		if(exportCsvBtn) exportCsvBtn.addEventListener('click', ()=>{
			const rows = Array.from(document.querySelectorAll('#recordsBody tr')).filter(r=>r.style.display!=='none');
			const csv = ['Tur,AdFirma,Meta,Stok'].concat(rows.map(r=>{
				const tur = r.dataset.type||''; const name = r.querySelector('.col-name')?.innerText.replace(/\n/g,' | ')||''; const meta = r.querySelector('.col-meta')?.innerText||''; const stock = r.querySelector('.col-stock')?.innerText||'';
				return [tur, name, meta, stock].map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',');
			})).join('\n');
			const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
		});

		// ESC key closes modal/drawer
		document.addEventListener('keydown', (e)=>{
			if(e.key==='Escape'){
				// close modal if open
				const mo = document.getElementById('modalOverlay'); if(mo && !mo.hidden){ closeModal(); return; }
				// close drawer if open
				const dr = document.querySelector('.drawer'); if(dr && dr.classList.contains('open')){ closeDrawer(); }
			}
		});

		// Simple drawer focus-trap: keep tab within drawer when open
		document.addEventListener('focusin', (e)=>{
			const dr = document.querySelector('.drawer'); if(dr && dr.classList.contains('open')){
				if(!dr.contains(e.target)){
					const focusable = dr.querySelectorAll('button, [href], input, select, textarea'); if(focusable.length) focusable[0].focus();
				}
			}
		});

	})();
