// lunas.js (Versi Perbaikan untuk UI Mobile)
document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_LUNAS_URL = `${window.AppConfig.API_BASE_URL}?action=getLunas`;
    const API_TAGIHAN_URL = `${window.AppConfig.API_BASE_URL}?action=getTagihan`;
    let paidData = []; // Data lunas
    let unpaidData = []; // Data tagihan (untuk pengecekan struk cetak)

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const invoiceList = document.getElementById('invoice-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaid-tab');

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    fetchPaidData();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        
        // Tombol tab "Unpaid" sekarang hanya berfungsi sebagai link ke tagihan.html
        unpaidTab.addEventListener('click', () => {
            window.location.href = 'tagihan.html';
        });

        invoiceList.addEventListener('click', handleInvoiceListClick);
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchPaidData() {
        showLoading();
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const filterBulan = urlParams.get('bulan');
            const filterTahun = urlParams.get('tahun');
            const isFiltering = filterBulan && filterTahun && filterBulan !== 'semua';

            const [response, unpaidResponse] = await Promise.all([
                fetch(API_LUNAS_URL),
                fetch(API_TAGIHAN_URL)
            ]);
            
            if (!response.ok) throw new Error('Gagal mengambil data dari server');
            
            let rawData = await response.json();
            if (unpaidResponse.ok) {
                unpaidData = await unpaidResponse.json();
            }
            if (!Array.isArray(rawData)) throw new TypeError('Format data tidak valid');

            // Filter data jika ada parameter dari URL
            if (isFiltering) {
                const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const filterBulanNama = namaBulan[parseInt(filterBulan, 10)];
                const targetPeriode = `${filterBulanNama} ${filterTahun}`;

                paidData = rawData.filter(row => (row['PERIODE TAGIHAN'] || '').trim().replace(/^'/, '') === targetPeriode);
                
                searchInput.placeholder = `Disaring: ${targetPeriode}`;
                searchInput.disabled = true;
            } else {
                paidData = rawData;
            }

            // Urutkan data berdasarkan tanggal bayar (terbaru dulu)
            paidData.sort((a, b) => new Date(b['TANGGAL BAYAR'] || 0) - new Date(a['TANGGAL BAYAR'] || 0));

            renderList();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function renderList() {
        invoiceList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredData = paidData.filter(item =>
            (item.NAMA && item.NAMA.toLowerCase().includes(searchTerm)) ||
            (item['PERIODE TAGIHAN'] && item['PERIODE TAGIHAN'].toLowerCase().includes(searchTerm))
        );

        if (filteredData.length === 0) {
            invoiceList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada riwayat lunas ditemukan.</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            const amount = item.TAGIHAN ? formatter.format(String(item.TAGIHAN).replace(/[^0-9]/g, '')) : 'N/A';
            const period = item['PERIODE TAGIHAN'] || 'Periode tidak tersedia';
            const customerName = item.NAMA || 'Nama tidak tersedia';
            
            let paymentDateHtml = '<div class="w-12 shrink-0"></div>';
            if (item['TANGGAL BAYAR']) {
                const paidDate = new Date(item['TANGGAL BAYAR']);
                const day = paidDate.getDate().toString().padStart(2, '0');
                const month = paidDate.toLocaleString('id-ID', { month: 'short' });
                const year = paidDate.getFullYear();
                paymentDateHtml = `
                    <div class="flex flex-col items-center justify-center w-12 shrink-0 text-center">
                        <p class="text-lg font-bold text-gray-800">${day}</p>
                        <p class="text-xs text-gray-500">${month}</p>
                        <p class="text-xs text-gray-500">${year}</p>
                    </div>
                `;
            }
            
            const invoiceDiv = document.createElement('div');
            invoiceDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200 hover:bg-gray-50';
            
            invoiceDiv.innerHTML = `
                ${paymentDateHtml}
                <div class="flex flex-col justify-center flex-1">
                    <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
                    <span class="bg-[#eae8f3] text-[#110e1b] text-xs font-medium w-fit px-2.5 py-0.5 rounded-full mt-1">
                        ${period}
                    </span>
                </div>
                <div class="shrink-0 flex items-center gap-1.5">
                    <div class="flex flex-col items-end mr-1">
                        <p class="text-green-600 text-sm font-bold leading-normal">LUNAS</p>
                        <p class="text-gray-500 text-xs font-medium leading-normal">${amount}</p>
                    </div>
                    <button class="print-btn flex items-center justify-center w-7 h-7 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" data-row-number="${item.rowNumber}" title="Cetak Struk">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" fill="currentColor" viewBox="0 0 256 256"><path d="M224,104H208V32a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8v72H32a16,16,0,0,0-16,16v64a16,16,0,0,0,16,16H56v24a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8V200h24a16,16,0,0,0,16-16V120A16,16,0,0,0,224,104ZM64,40H192V104H64ZM184,216H72V168H184Zm40-32H200V160a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8v24H32V120H224v64ZM196,136a12,12,0,1,1-12-12A12,12,0,0,1,196,136Z"></path></svg>
                    </button>
                    <button class="revert-btn flex items-center justify-center w-7 h-7 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" data-row-number="${item.rowNumber}" title="Batalkan Pembayaran">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L60.63,81.29l17,17A8,8,0,0,1,72,112H24a8,8,0,0,1-8-8V56A8,8,0,0,1,29.66,50.3L49.31,70,59.78,59.43a96,96,0,0,1,164.2,68.5A8,8,0,0,1,224,128Z"></path></svg>
                    </button>
                </div>
            `;
            
            invoiceList.appendChild(invoiceDiv);
        });
    }

    // ===============================================
    // Button Click Handlers & Actions
    // ===============================================
    function handleInvoiceListClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        const rowNumber = button.dataset.rowNumber;
        if (!rowNumber) return;

        const targetItem = paidData.find(item => String(item.rowNumber) === String(rowNumber));
        if (!targetItem) {
            alert('Data tagihan tidak ditemukan.');
            return;
        }

        if (button.classList.contains('print-btn')) {
            const otherUnpaidBills = unpaidData.filter(b => b.IDPL === targetItem.IDPL);
            printReceipt(targetItem, otherUnpaidBills);
        } else if (button.classList.contains('revert-btn')) {
            revertPayment(targetItem);
        }
    }

    async function revertPayment(invoice) {
        const customerName = invoice.NAMA || 'pelanggan ini';
        if (!confirm(`Batalkan pembayaran lunas untuk ${customerName} (kembalikan ke Tagihan)?`)) return;

        showLoading();
        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'batalBayar',
                    rowNumber: invoice.rowNumber,
                    rowData: invoice
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);

            alert(result.message || 'Pembayaran berhasil dibatalkan');
            fetchPaidData();
        } catch (error) {
            console.error('Error reverting payment:', error);
            hideLoading();
            alert(`Error: ${error.message}`);
        }
    }

    function printReceipt(invoice, otherUnpaidBills) {
        const invoiceDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoice.TAGIHAN || 0);
        const period = invoice['PERIODE TAGIHAN'] || '-';
        
        let unpaidNotes = '';
        if (otherUnpaidBills && otherUnpaidBills.length > 0) {
            const unpaidPeriods = otherUnpaidBills.map(b => b['PERIODE TAGIHAN']).join(', ');
            unpaidNotes = `<div style="margin-top: 15px; padding: 10px; border: 1px dashed #000; font-size: 12px; background: #fff3cd;">
                <strong>Catatan Penting:</strong><br>
                Anda masih memiliki tagihan yang <b>belum dibayar</b> untuk bulan:<br><b>${unpaidPeriods}</b>
            </div>`;
        }

        const html = `
        <html>
        <head>
            <title>Struk Pembayaran NET471</title>
            <style>
                body { font-family: monospace; padding: 20px; width: 300px; margin: 0 auto; color: #000; }
                .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                .header h2 { margin: 0; font-size: 20px; font-weight: bold; }
                .header p { margin: 5px 0 0; font-size: 14px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                .total { font-weight: bold; font-size: 16px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
                .status { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; border: 2px solid #000; padding: 5px; letter-spacing: 2px; }
                @media print {
                    body { width: 100%; padding: 0; margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>NET471 ISP</h2>
                <p>Struk Pembayaran Internet</p>
            </div>
            
            <div class="row"><span>Tanggal:</span><span>${invoiceDate}</span></div>
            <div class="row"><span>IDPL:</span><span>${invoice.IDPL || '-'}</span></div>
            <div class="row"><span>Nama:</span><span>${invoice.NAMA || '-'}</span></div>
            <div class="row"><span>Periode:</span><span>${period}</span></div>
            
            <div class="row total"><span>TOTAL BAYAR</span><span>${amount}</span></div>
            
            <div class="status">LUNAS</div>
            
            ${unpaidNotes}
            
            <div class="footer">
                Terima kasih telah menggunakan<br>layanan NET471<br>
                <span style="font-size: 10px;">Simpan struk ini sebagai bukti pembayaran yang sah.</span>
            </div>
        </body>
        </html>
        `;
        
        let printIframe = document.getElementById('print-receipt-iframe');
        if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'print-receipt-iframe';
            printIframe.style.position = 'absolute';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = 'none';
            document.body.appendChild(printIframe);
        }
        
        const doc = printIframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        
        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        }, 500);
    }

    // ===============================================
    // Skeleton Loading Functions
    // ===============================================
    function showLoading() {
        invoiceList.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="w-12 shrink-0">
                    <div style="height: 3rem; width: 2.5rem; background-color: #e0e0e0; border-radius: 4px; animation: skeleton-loading 1.5s infinite; margin: 0 auto;"></div>
                </div>
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div style="height: 1rem; background-color: #e0e0e0; border-radius: 4px; width: 75%; animation: skeleton-loading 1.5s infinite;"></div>
                    <div style="height: 0.75rem; background-color: #e0e0e0; border-radius: 4px; width: 50%; animation: skeleton-loading 1.5s infinite;"></div>
                </div>
                <div class="shrink-0 flex items-center gap-1.5">
                    <div class="flex flex-col items-end mr-1 gap-1">
                        <div style="height: 0.75rem; background-color: #e0e0e0; border-radius: 4px; width: 3rem; animation: skeleton-loading 1.5s infinite;"></div>
                        <div style="height: 0.75rem; background-color: #e0e0e0; border-radius: 4px; width: 4rem; animation: skeleton-loading 1.5s infinite;"></div>
                    </div>
                    <div style="height: 1.75rem; width: 1.75rem; background-color: #e0e0e0; border-radius: 0.5rem; animation: skeleton-loading 1.5s infinite;"></div>
                    <div style="height: 1.75rem; width: 1.75rem; background-color: #e0e0e0; border-radius: 0.5rem; animation: skeleton-loading 1.5s infinite;"></div>
                </div>
            `;
            invoiceList.appendChild(skeletonItem);
        }
        
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `@keyframes skeleton-loading { 0% { background-color: #e0e0e0; } 50% { background-color: #f0f0f0; } 100% { background-color: #e0e0e0; } }`;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const skeletonItems = invoiceList.querySelectorAll('div > div[style*="animation"]');
        if(skeletonItems.length > 0) {
           invoiceList.innerHTML = '';
        }
    }
});