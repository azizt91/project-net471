// pelanggan.js (Versi Perbaikan Total - Tanpa Modal)
document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_BASE_URL = window.AppConfig.API_BASE_URL;
    let allData = [];
    let currentFilter = 'all';
    let currentEditingRowNumber = null;
    let lastView = 'list'; // Untuk melacak view terakhir sebelum ke form

    let paketOptions = {}; // Akan diisi dinamis dari API

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const views = {
        list: document.getElementById('list-view'),
        detail: document.getElementById('detail-view'),
        form: document.getElementById('form-view')
    };

    const customerList = document.getElementById('customer-list');
    const searchInput = document.getElementById('search-input');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const customerForm = document.getElementById('customer-form');

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    populatePaketDropdown();
    fetchData();

    // ===============================================
    // PERUBAHAN 1: View Management (Pengganti Modal)
    // ===============================================
    function switchView(viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }
        window.scrollTo(0, 0);
    }

    // ===============================================
    // PERUBAHAN 2: Event Listeners Disesuaikan
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderCustomerList);
        addCustomerBtn.addEventListener('click', openAddForm);
        customerForm.addEventListener('submit', handleFormSubmit);

        // Tombol Kembali
        document.getElementById('back-from-detail').addEventListener('click', () => switchView('list'));
        document.getElementById('back-from-form').addEventListener('click', () => {
            // Kembali ke view sebelumnya (bisa list atau detail)
            if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
                switchView(lastView);
            }
        });
        document.getElementById('cancel-btn').addEventListener('click', () => {
            if (confirm('Yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.')) {
                switchView(lastView);
            }
        });

        // Event listener lainnya
        document.getElementById('customer-package').addEventListener('change', handlePaketChange);
        document.getElementById('edit-customer-detail-btn').addEventListener('click', handleEditFromDetailView);
        const deleteBtn = document.getElementById('delete-customer-detail-btn');
        if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteFromDetailView);
    }

    // ===============================================
    // Data Fetch & Display Logic (Tidak banyak berubah)
    // ===============================================
    async function fetchData() {
        showLoading(); // <-- Skeleton Loading tetap di sini
        switchView('list');
        try {
            // Fetch pelanggan & paket secara bersamaan
            const [response, paketResponse] = await Promise.all([
                fetch(`${API_BASE_URL}?action=getPelanggan`),
                fetch(`${window.AppConfig.API_BASE_URL}?action=getPaket`)
            ]);

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            let rawData = await response.json();

            if (paketResponse.ok) {
                const paketData = await paketResponse.json();
                paketOptions = {};
                if (Array.isArray(paketData)) {
                    paketData.forEach(pkg => {
                        if (pkg.NAMA_PAKET) {
                            paketOptions[pkg.NAMA_PAKET] = pkg.HARGA;
                        }
                    });
                }
                populatePaketDropdown();
            }

            if (rawData.error) throw new Error(rawData.error);
            if (!Array.isArray(rawData)) throw new TypeError('Format data tidak valid');

            allData = rawData
                .filter(item => item.LEVEL === 'USER')
                .sort((a, b) => b.rowNumber - a.rowNumber);

            renderCustomerList();
        } catch (error) {
            console.error('Error fetching data:', error);
            customerList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        }
    }

    function renderCustomerList() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = allData;

        const filteredData = data.filter(item =>
            Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm))
        );

        customerList.innerHTML = ''; // Pastikan skeleton dihapus sebelum render
        if (filteredData.length === 0) {
            customerList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada pelanggan ditemukan.</p>`;
            return;
        }

        filteredData.forEach(item => {
            const paketName = item.PAKET || '-';

            const customerItem = document.createElement('div');
            customerItem.className = "flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50";
            customerItem.innerHTML = `<div class="flex items-center gap-4"><div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 flex items-center justify-center bg-[#501ee6] text-white font-bold text-xl">${item.NAMA.charAt(0)}</div><div class="flex flex-col justify-center"><p class="text-[#110e1b] text-base font-medium">${item.NAMA}</p><div class="mt-1"><span class="px-2 py-0.5 bg-[#eae8f3] text-[#625095] rounded-full text-xs font-semibold">${paketName}</span></div></div></div><div class="shrink-0"><div class="flex items-center justify-center"></div></div>`;
            customerItem.addEventListener('click', () => openDetailView(item)); // <-- Mengarah ke view detail
            customerList.appendChild(customerItem);
        });
    }

    // ===============================================
    // PERUBAHAN 3: Fungsi Form & Detail diubah menjadi View
    // ===============================================
    function populatePaketDropdown() {
        const paketSelect = document.getElementById('customer-package');
        paketSelect.innerHTML = '<option value="">-- Pilih Paket --</option>';
        Object.keys(paketOptions).forEach(paketName => {
            paketSelect.innerHTML += `<option value="${paketName}">${paketName}</option>`;
        });
    }

    function handlePaketChange(event) {
        const price = paketOptions[event.target.value] || '0';
        document.getElementById('customer-bill').value = price;
    }

    function openAddForm() {
        customerForm.reset();
        currentEditingRowNumber = null;
        document.getElementById('modal-title').textContent = 'Tambah Pelanggan';
        document.getElementById('save-btn-text').textContent = 'Simpan';
        lastView = 'list'; // Jika batal, kembali ke list
        switchView('form');
    }

    function openEditForm(customerData) {
        customerForm.reset();
        currentEditingRowNumber = customerData.rowNumber;
        document.getElementById('modal-title').textContent = 'Edit Pelanggan';
        document.getElementById('save-btn-text').textContent = 'Update';

        document.getElementById('customer-name').value = customerData.NAMA || '';
        document.getElementById('customer-address').value = customerData.ALAMAT || '';
        document.getElementById('customer-package').value = customerData.PAKET || '';
        document.getElementById('customer-bill').value = String(customerData.TAGIHAN || '').replace(/[^0-9]/g, '');



        lastView = 'detail'; // Jika batal, kembali ke detail
        switchView('form');
    }

    function handleEditFromDetailView() {
        const customerData = allData.find(item => item.rowNumber === currentEditingRowNumber);
        if (customerData) openEditForm(customerData);
    }

    async function handleDeleteFromDetailView() {
        const customerData = allData.find(item => item.rowNumber === currentEditingRowNumber);
        if (!customerData) return;

        if (!confirm(`Yakin ingin menghapus pelanggan ${customerData.NAMA}?`)) return;

        const deleteBtn = document.getElementById('delete-customer-detail-btn');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Menghapus...';
        deleteBtn.disabled = true;

        try {
            await fetch(API_BASE_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'deletePelanggan',
                    rowNumber: currentEditingRowNumber
                })
            });

            showSuccessNotification('Pelanggan berhasil dihapus');
            fetchData();
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert(`Gagal menghapus pelanggan: ${error.message}`);
        } finally {
            deleteBtn.textContent = originalText;
            deleteBtn.disabled = false;
        }
    }

    function openDetailView(customer) {
        currentEditingRowNumber = customer.rowNumber;
        const profileImage = document.getElementById('detail-profile-image');
        profileImage.style.backgroundImage = 'none';
        profileImage.className = 'bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-24 w-24 flex items-center justify-center bg-[#501ee6] text-white font-bold text-4xl';
        profileImage.textContent = customer.NAMA ? customer.NAMA.charAt(0).toUpperCase() : '-';

        document.getElementById('detail-customer-name').textContent = customer.NAMA || '-';
        document.getElementById('detail-customer-id').textContent = customer.IDPL || '-';

        const details = {
            'idpl': customer.IDPL, 'nama': customer.NAMA, 'alamat': customer.ALAMAT,
            'paket': customer.PAKET,
            'tagihan': customer.TAGIHAN ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(customer.TAGIHAN) : '-'
        };
        for (const key in details) {
            const el = document.getElementById(`detail-${key}`);
            if (el) el.textContent = details[key] || '-';
        }

        loadUnpaidBills(customer.IDPL);
        switchView('detail');
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-customer-btn');
        const isEditing = !!currentEditingRowNumber;
        if (isEditing && !confirm('Yakin ingin menyimpan perubahan?')) return;

        const formData = {
            nama: document.getElementById('customer-name').value, 
            alamat: document.getElementById('customer-address').value,
            paket: document.getElementById('customer-package').value, 
            tagihan: document.getElementById('customer-bill').value
        };

        setButtonLoading(saveBtn, true, isEditing ? 'Update' : 'Simpan');
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: isEditing ? 'updatePelanggan' : 'addPelanggan',
                    rowNumber: currentEditingRowNumber, data: formData
                })
            });
            const result = await response.json();
            if (result.error) {
                showErrorNotification(result.error);
            } else {
                showSuccessNotification(isEditing ? 'Data berhasil diperbarui!' : 'Pelanggan baru berhasil ditambahkan!');
                fetchData();
            }
        } catch (error) {
            showErrorNotification(`Gagal menyimpan data: ${error.message}`);
        } finally {
            setButtonLoading(saveBtn, false, isEditing ? 'Update' : 'Simpan');
        }
    }

    // ===============================================
    // UI Helpers (Termasuk Skeleton Loading Anda)
    // ===============================================
    function showLoading() {
        customerList.innerHTML = Array(6).fill('').map(() => `<div class="skeleton-item flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 animate-pulse"><div class="flex items-center gap-4"><div class="bg-gray-200 rounded-full h-14 w-14"></div><div class="flex flex-col justify-center gap-2"><div class="bg-gray-200 h-4 w-32 rounded"></div><div class="bg-gray-200 h-3 w-24 rounded"></div></div></div><div class="shrink-0"><div class="bg-gray-200 size-3 rounded-full"></div></div></div>`).join('');
    }

    async function loadUnpaidBills(customerId) {
        const unpaidBillsSection = document.getElementById('unpaid-bills-section');
        const unpaidBillsList = document.getElementById('unpaid-bills-list');
        unpaidBillsSection.classList.remove('hidden');
        unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Memuat tagihan...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}?action=getTagihan`);
            const responseData = await response.json();
            const customerUnpaidBills = responseData.filter(bill => bill.IDPL === customerId && bill.STATUS !== 'LUNAS');

            if (customerUnpaidBills.length > 0) {
                unpaidBillsList.innerHTML = '';
                customerUnpaidBills.forEach(bill => {
                    unpaidBillsList.innerHTML += `<div class="flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between"><div class="flex flex-col justify-center"><p class="text-[#110e1b] text-base font-medium">${bill.NAMA || '-'}</p><p class="text-[#625095] text-sm">${bill['PERIODE TAGIHAN'] || ''}</p></div><div class="shrink-0"><p class="text-[#110e1b] text-base">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bill.TAGIHAN)}</p></div></div>`;
                });
            } else {
                unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Tidak ada tagihan yang belum dibayar.</p>';
            }
        } catch (error) {
            unpaidBillsList.innerHTML = `<p class="text-sm text-red-500 px-4">Gagal memuat tagihan.</p>`;
        }
    }

    function setButtonLoading(button, isLoading, originalText) {
        const span = button.querySelector('span');
        if (span) {
            button.disabled = isLoading;
            span.textContent = isLoading ? 'Memproses...' : originalText;
        }
    }

    function showSuccessNotification(message) { alert(message); }
    function showErrorNotification(message) { alert(message); }
});
