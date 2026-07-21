// paket.js - Package Management with CRUD for NET471 (Google Apps Script)

document.addEventListener('DOMContentLoaded', async () => {
    // State Management
    let allPackages = [];
    let filteredPackages = [];
    let currentEditingPackageRow = null;

    // DOM Selectors
    const views = { list: document.getElementById('list-view'), form: document.getElementById('form-view') };
    const packageList = document.getElementById('package-list');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const packageForm = document.getElementById('package-form');
    const formTitle = document.getElementById('form-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const backToProfileBtn = document.getElementById('back-to-profile');

    // Initial Setup
    initializeEventListeners();
    fetchPackages();

    // Event Listeners
    function initializeEventListeners() {
        // Back buttons
        backToProfileBtn?.addEventListener('click', () => window.location.href = 'profile.html');
        document.getElementById('back-from-form')?.addEventListener('click', () => {
            if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
                switchView('list');
            }
        });
        document.getElementById('cancel-btn')?.addEventListener('click', () => {
            if (confirm('Yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.')) {
                switchView('list');
            }
        });

        // Add package button
        document.getElementById('add-package-btn')?.addEventListener('click', () => {
            currentEditingPackageRow = null;
            formTitle.textContent = 'Tambah Paket';
            saveBtnText.textContent = 'Simpan';
            packageForm.reset();
            switchView('form');
        });

        // Form submit
        packageForm.addEventListener('submit', handleSubmit);

        // Search functionality
        searchInput.addEventListener('input', handleSearch);
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            filteredPackages = [...allPackages];
            renderPackages();
        });

        // Event delegation for edit/delete buttons
        packageList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-package-btn');
            const deleteBtn = e.target.closest('.delete-package-btn');

            if (editBtn) {
                const packageRow = parseInt(editBtn.dataset.rowNumber);
                handleEdit(packageRow);
            } else if (deleteBtn) {
                const packageRow = parseInt(deleteBtn.dataset.rowNumber);
                const packageName = deleteBtn.dataset.packageName;
                handleDelete(packageRow, packageName);
            }
        });
    }

    // View Management
    function switchView(viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewName]) views[viewName].classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Fetch Packages
    async function fetchPackages() {
        showSkeletonLoading();
        
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPaket`);
            if (!response.ok) throw new Error('Gagal mengambil data paket dari server');
            
            const rawData = await response.json();
            if (rawData.error) throw new Error(rawData.error);
            if (!Array.isArray(rawData)) throw new TypeError('Format data tidak valid');
            
            // Filter out empty rows if any
            allPackages = rawData.filter(pkg => pkg.NAMA_PAKET && pkg.NAMA_PAKET.trim() !== '');
            filteredPackages = [...allPackages];
            renderPackages();
        } catch (error) {
            console.error('Error fetching packages:', error);
            showError(`Gagal memuat data paket: ${error.message}`);
        }
    }

    // Render Packages
    function renderPackages() {
        if (filteredPackages.length === 0) {
            packageList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64px" height="64px" fill="#d1d5db" viewBox="0 0 256 256">
                        <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,40a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,128Z"></path>
                    </svg>
                    <p class="text-gray-500 mt-4 text-center">
                        ${searchInput.value ? 'Paket tidak ditemukan' : 'Belum ada paket. Tambah paket baru!'}
                    </p>
                </div>
            `;
            return;
        }

        packageList.innerHTML = filteredPackages.map(pkg => createPackageCard(pkg)).join('');
    }

    // Create Package Card
    function createPackageCard(pkg) {
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        return `
            <div class="bg-white rounded-xl shadow-sm p-4 mx-4 mb-3 border border-gray-200">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-[#110e1b] text-lg font-bold">${pkg.NAMA_PAKET}</h3>
                            <span class="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">ID: ${pkg.ID_PAKET || '-'}</span>
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="inline-flex items-center gap-1 bg-purple-100 text-[#5324e0] px-3 py-1 rounded-full text-xs font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
                                    <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
                                </svg>
                                ${pkg.KECEPATAN} Mbps
                            </span>
                        </div>
                        <p class="text-[#110e1b] text-2xl font-bold text-green-600">${formatter.format(pkg.HARGA)}</p>
                        ${pkg.DESKRIPSI ? `<p class="text-sm text-gray-600 mt-2">${pkg.DESKRIPSI}</p>` : ''}
                    </div>
                </div>
                
                <div class="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button class="edit-package-btn flex-1 flex items-center justify-center gap-2 bg-[#eae8f3] text-[#110e1b] py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors" data-row-number="${pkg.rowNumber}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.31,64l24-24L216,84.69Z"></path></svg>
                        Edit
                    </button>
                    <button class="delete-package-btn flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors" data-row-number="${pkg.rowNumber}" data-package-name="${pkg.NAMA_PAKET}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                        Hapus
                    </button>
                </div>
            </div>
        `;
    }

    // Search Handler
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm) {
            clearSearchBtn.classList.remove('hidden');
            filteredPackages = allPackages.filter(pkg => 
                (pkg.NAMA_PAKET && pkg.NAMA_PAKET.toLowerCase().includes(searchTerm)) ||
                (pkg.DESKRIPSI && pkg.DESKRIPSI.toLowerCase().includes(searchTerm)) ||
                (pkg.KECEPATAN && pkg.KECEPATAN.toString().includes(searchTerm))
            );
        } else {
            clearSearchBtn.classList.add('hidden');
            filteredPackages = [...allPackages];
        }
        
        renderPackages();
    }

    // Edit Handler
    function handleEdit(rowNumber) {
        const pkg = allPackages.find(p => p.rowNumber === rowNumber);
        if (!pkg) return;

        currentEditingPackageRow = rowNumber;
        formTitle.textContent = 'Edit Paket';
        saveBtnText.textContent = 'Simpan Perubahan';
        
        document.getElementById('package-name').value = pkg.NAMA_PAKET || '';
        document.getElementById('package-price').value = pkg.HARGA || '';
        document.getElementById('package-speed').value = pkg.KECEPATAN || '';
        document.getElementById('package-description').value = pkg.DESKRIPSI || '';
        
        switchView('form');
    }

    // Delete Handler
    async function handleDelete(rowNumber, packageName) {
        if (!confirm(`Yakin ingin menghapus paket "${packageName}"?`)) {
            return;
        }

        const deleteBtn = document.querySelector(`.delete-package-btn[data-row-number="${rowNumber}"]`);
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="animate-spin inline-block mr-2">⏳</span> Menghapus...';
        deleteBtn.disabled = true;

        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'deletePaket',
                    rowNumber: rowNumber
                })
            });
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            alert(result.message || 'Paket berhasil dihapus');
            fetchPackages();
        } catch (error) {
            console.error('Error deleting package:', error);
            alert(`Gagal menghapus paket: ${error.message}`);
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }

    // Form Submit Handler
    async function handleSubmit(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('save-package-btn');
        const isEditing = !!currentEditingPackageRow;
        
        if (isEditing && !confirm('Yakin ingin menyimpan perubahan?')) return;

        const packageData = {
            NAMA_PAKET: document.getElementById('package-name').value,
            HARGA: parseInt(document.getElementById('package-price').value),
            KECEPATAN: parseInt(document.getElementById('package-speed').value),
            DESKRIPSI: document.getElementById('package-description').value
        };
        
        if (!isEditing) {
            // Generate a random ID for new package
            packageData.ID_PAKET = `PKT-${Date.now().toString().slice(-6)}`;
        } else {
            // retain the ID if editing
            const existingPkg = allPackages.find(p => p.rowNumber === currentEditingPackageRow);
            if (existingPkg) packageData.ID_PAKET = existingPkg.ID_PAKET;
        }

        const originalBtnText = saveBtnText.textContent;
        // The save-btn doesn't exist by id in form, wait it's a type="submit" button in form?
        // Let's find it by id or just use saveBtnText
        saveBtnText.textContent = 'Menyimpan...';

        try {
            const payload = {
                action: isEditing ? 'updatePaket' : 'addPaket',
                data: packageData
            };
            
            if (isEditing) {
                payload.rowNumber = currentEditingPackageRow;
            }

            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            alert(result.message || 'Data paket berhasil disimpan');
            fetchPackages();
            switchView('list');
        } catch (error) {
            console.error('Error saving package:', error);
            alert(`Gagal menyimpan data paket: ${error.message}`);
        } finally {
            saveBtnText.textContent = originalBtnText;
        }
    }

    // Helpers
    function showSkeletonLoading() {
        packageList.innerHTML = Array(3).fill(0).map(() => `
            <div class="bg-white rounded-xl shadow-sm p-4 mx-4 mb-3 animate-pulse border border-gray-100">
                <div class="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div class="h-5 bg-gray-200 rounded-full w-24 mb-3"></div>
                <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div class="flex gap-3 pt-4 border-t border-gray-100">
                    <div class="h-10 bg-gray-200 rounded w-1/2"></div>
                    <div class="h-10 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        `).join('');
    }

    function showError(message) {
        packageList.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 m-4 bg-red-50 rounded-xl">
                <svg class="text-red-500 w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <p class="text-red-700 text-center font-medium">${message}</p>
                <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors">
                    Coba Lagi
                </button>
            </div>
        `;
    }
});
