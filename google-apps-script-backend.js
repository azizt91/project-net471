/**
 * Fungsi utama untuk membuat tagihan bulanan secara otomatis.
 * Menyalin data pelanggan aktif dari sheet 'DATA' ke sheet 'Tagihan'.
 * Kolom ID di Tagihan akan diisi dengan Unique ID (UUID).
 */
function createMonthlyInvoices() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName("DATA");
  const tagihanSheet = ss.getSheetByName("Tagihan");

  // Validasi apakah sheet ditemukan
  if (!dataSheet) {
    SpreadsheetApp.getUi().alert("Error: Sheet 'DATA' tidak ditemukan!");
    return;
  }
  if (!tagihanSheet) {
    SpreadsheetApp.getUi().alert("Error: Sheet 'Tagihan' tidak ditemukan!");
    return;
  }

  const dataRange = dataSheet.getDataRange();
  const dataValues = dataRange.getValues();
  const tagihanHeaders = tagihanSheet.getRange(1, 1, 1, tagihanSheet.getLastColumn()).getValues()[0];

  // Baris pertama adalah header
  if (dataValues.length < 1) {
    SpreadsheetApp.getUi().alert("Sheet 'DATA' kosong atau tidak memiliki header.");
    return;
  }
  const headers = dataValues[0];

  // Dapatkan indeks kolom dari sheet 'DATA' berdasarkan nama header.
  // Pastikan nama header ("IDPL", "NAMA", "WHATSAPP", "TAGIHAN", "TANGGAL PASANG", "STATUS")
  // di bawah ini SESUAI PERSIS dengan nama header di baris pertama sheet 'DATA' Anda.
  const idpelColIdx = headers.indexOf("IDPL");
  const namaColIdx = headers.indexOf("NAMA");
  const hargaColIdx = headers.indexOf("TAGIHAN");
  const statusDataColIdx = headers.indexOf("STATUS"); // Kolom STATUS di sheet DATA

  // Periksa apakah semua kolom utama yang dibutuhkan ditemukan
  const missingCols = [];
  if (idpelColIdx === -1) missingCols.push("IDPL");
  if (namaColIdx === -1) missingCols.push("NAMA");
  if (hargaColIdx === -1) missingCols.push("TAGIHAN");
  if (statusDataColIdx === -1) missingCols.push("STATUS (di sheet DATA)");

  if (missingCols.length > 0) {
    SpreadsheetApp.getUi().alert("Error: Satu atau lebih kolom tidak ditemukan di header sheet 'DATA': " + missingCols.join(", ") + ".\nHarap periksa nama kolom di baris pertama sheet 'DATA'.");
    return;
  }

  const today = new Date();
  const currentMonthIndex = today.getMonth(); // 0 untuk Januari, 1 untuk Februari, dst.
  const currentYear = today.getFullYear();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const bulanTagihan = monthNames[currentMonthIndex];
  const tahunTagihan = currentYear;
  const periodeTagihan = bulanTagihan + " " + tahunTagihan;

  let rowsToAdd = [];

  // Loop melalui baris data (mulai dari indeks 1 untuk melewati header)
  for (let i = 1; i < dataValues.length; i++) {
    const row = dataValues[i];
    const statusPelanggan = row[statusDataColIdx];

    // Periksa apakah status pelanggan adalah "aktif" (tidak case-sensitive)
    if (typeof statusPelanggan === 'string' && statusPelanggan.trim().toLowerCase() === "aktif") {
      const idpl = row[idpelColIdx];
      const nama = row[namaColIdx];
      const tagihanValue = row[hargaColIdx];

      // Buat objek untuk baris baru
      const newRowObject = {
        'ID': Utilities.getUuid(),
        'IDPL': idpl,
        'NAMA': nama,
        'TAGIHAN': tagihanValue,
        'BULAN': bulanTagihan,
        'TAHUN': tahunTagihan,
        'PERIODE TAGIHAN': periodeTagihan,
        'STATUS': "BELUM LUNAS",
        'TANGGAL BAYAR': ""
      };
      
      const newRowForTagihan = tagihanHeaders.map(header => newRowObject[header.trim()] || "");
      rowsToAdd.push(newRowForTagihan);
    }
  }

  // Tambahkan semua baris baru ke sheet 'Tagihan' sekaligus (lebih efisien)
  if (rowsToAdd.length > 0) {
    tagihanSheet.getRange(tagihanSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
    SpreadsheetApp.getUi().alert(rowsToAdd.length + " tagihan baru telah ditambahkan ke sheet 'Tagihan' (dengan Unique ID).");
  } else {
    SpreadsheetApp.getUi().alert("Tidak ada data pelanggan dengan status 'aktif' yang ditemukan di sheet 'DATA' untuk ditambahkan sebagai tagihan baru.");
  }
}

/**
 * Fungsi opsional untuk membuat trigger waktu secara programatik.
 * Jalankan fungsi ini sekali dari editor skrip untuk mengatur trigger.
 */
function setupTrigger() {
  // Hapus trigger lama jika ada untuk fungsi ini, untuk menghindari duplikasi
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'createMonthlyInvoices') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Buat trigger baru untuk berjalan setiap tanggal 1, antara jam 00:00 dan 01:00.
  ScriptApp.newTrigger('createMonthlyInvoices')
    .timeBased()
    .onMonthDay(1) // Hari ke-1 setiap bulan
    .atHour(0)     // Sekitar jam 00:00 (antara 00:00 - 01:00)
    .create();
  SpreadsheetApp.getUi().alert("Trigger berhasil dibuat untuk menjalankan skrip 'createMonthlyInvoices' setiap tanggal 1 jam 00:00.");
}

// =================================================================
// BAGIAN 2: FUNGSI BARU UNTUK API WEB APP (SUDAH DIPERBAIKI DAN LENGKAP)
// =================================================================

// HAPUS SPREADSHEET_ID AGAR OTOMATIS BISA DI-COPY KE FILE MANA SAJA
const ss = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Menangani semua permintaan GET (untuk mengambil data).
 * @param {object} e - Event object dari Apps Script.
 * @returns {ContentService} - Output JSON.
 */
function doGet(e) {
  const action = e.parameter.action;
  let data;

  try {
    switch (action) {
      case 'getPelanggan':
        data = readSheetData('DATA');
        break;
      case 'getTagihan':
        data = readSheetData('Tagihan').filter(item =>
          item.IDPL && item.IDPL.trim() !== '' &&
          item.NAMA && item.NAMA.trim() !== '' &&
          item.IDPL !== 'N/A' && item.NAMA !== 'N/A'
        );
        break;
      case 'getLunas':
        data = readSheetData('Lunas');
        break;
      case 'getPengeluaran':
        data = readSheetData('Pengeluaran');
        break;
      case 'getDashboardStats':
        data = getDashboardStats(e.parameter.bulan, e.parameter.tahun);
        break;
      // --- PENAMBAHAN BARU UNTUK DASBOR PELANGGAN ---
      case 'getMyData':
        data = getSpecificCustomerData(e.parameter.idpl);
        break;
      case 'getPaket':
        data = readSheetData('Paket');
        break;
      default:
        data = { error: `Invalid GET action: ${action}` };
    }
  } catch (err) {
    data = { error: err.message, stack: err.stack };
  }

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menangani semua permintaan POST (untuk mengubah data: login, tambah, update, hapus).
 * @param {object} e - Event object dari Apps Script.
 * @returns {ContentService} - Output JSON.
 */
function doPost(e) {
  let result;
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;

    switch (action) {
      case 'login':
        result = handleLogin(request.username, request.password);
        break;
      case 'addPelanggan':
        result = addPelanggan(request.data);
        break;
      case 'updatePelanggan':
        result = updatePelanggan(request.rowNumber, request.data);
        break;
      case 'deletePelanggan':
        result = deleteRow('DATA', request.rowNumber);
        break;
      case 'addPengeluaran':
        result = addPengeluaran(request.data);
        break;
      case 'updatePengeluaran':
        result = updatePengeluaran(request.rowNumber, request.data);
        break;
      case 'deletePengeluaran':
        result = deleteRow('Pengeluaran', request.rowNumber);
        break;
      case 'bayar':
        result = processPayment(request.rowNumber, request.rowData);
        break;
      case 'batalBayar':
        result = batalBayar(request.rowNumber, request.rowData);
        break;
      // --- PENAMBAHAN ADA DI SINI ---
      case 'createInvoices':
        result = createMonthlyInvoices(request.bulan, request.tahun);
        break;

      // --- MANAJEMEN PAKET ---
      case 'getPaket':
        result = readSheetData('Paket');
        break;
      case 'addPaket':
        result = addRow('Paket', request.data);
        break;
      case 'updatePaket':
        result = updateRow('Paket', request.rowNumber, request.data);
        break;
      case 'deletePaket':
        result = deleteRow('Paket', request.rowNumber);
        break;
      // --------------------------------
      default:
        result = { error: `Invalid POST action: ${action}` };
    }
  } catch (err) {
    result = { error: err.message, stack: err.stack };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- FUNGSI BARU UNTUK MEMBUAT TAGIHAN ---
/**
 * Membuat tagihan bulanan untuk semua pelanggan aktif yang belum ditagih.
 * @returns {Object} - Pesan sukses atau informasi.
 */
function createMonthlyInvoices(reqBulan, reqTahun) {
  // 1. Dapatkan bulan dan tahun
  const now = new Date();
  const currentYear = reqTahun ? parseInt(reqTahun) : now.getFullYear();
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthName = reqBulan ? reqBulan : namaBulan[now.getMonth()];

  // 2. Baca semua data yang diperlukan dari sheet
  const pelangganData = readSheetData('DATA');
  const tagihanData = readSheetData('Tagihan');
  const lunasData = readSheetData('Lunas');
  const tagihanSheet = ss.getSheetByName('Tagihan');
  const tagihanHeaders = tagihanSheet.getRange(1, 1, 1, tagihanSheet.getLastColumn()).getValues()[0];

  // 3. Buat daftar IDPL yang sudah ditagih atau lunas bulan ini untuk pengecekan cepat
  const existingTagihanIds = new Set(
    tagihanData
      .filter(row => row['BULAN'] === currentMonthName && row['TAHUN'] == currentYear)
      .map(row => row.IDPL)
  );
  const existingLunasIds = new Set(
    lunasData
      .filter(row => row['BULAN'] === currentMonthName && row['TAHUN'] == currentYear)
      .map(row => row.IDPL)
  );

  // 4. Filter pelanggan yang berstatus 'AKTIF' dan belum ada di daftar tagihan/lunas bulan ini
  const customersToBill = pelangganData.filter(customer =>
    customer.STATUS === 'AKTIF' &&
    !existingTagihanIds.has(customer.IDPL) &&
    !existingLunasIds.has(customer.IDPL)
  );

  // 5. Jika tidak ada pelanggan yang perlu ditagih, kirim pesan dan hentikan proses
  if (customersToBill.length === 0) {
    return { message: 'Tidak ada tagihan baru yang perlu dibuat. Semua pelanggan aktif sudah memiliki tagihan untuk periode ini.' };
  }

  // 6. Siapkan baris-baris data baru untuk dimasukkan ke sheet 'Tagihan'
  const newRows = customersToBill.map(customer => {
    const newRowObject = {
      'ID': `TGH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      'IDPL': customer.IDPL,
      'NAMA': customer.NAMA,
      'WHATSAPP': customer.WHATSAPP,
      'TAGIHAN': customer.TAGIHAN,
      'BULAN': currentMonthName,
      'TAHUN': currentYear,
      'PERIODE TAGIHAN': `'${currentMonthName} ${currentYear}`, // Tambahkan kutip agar dianggap teks
      'STATUS': 'BELUM LUNAS',
      'TANGGAL BAYAR': '',
      'TANGGAL PASANG': customer['TANGGAL PASANG'] || ''
    };
    // Ubah objek menjadi array sesuai urutan header di sheet
    return tagihanHeaders.map(header => newRowObject[header.trim()] || '');
  });

  // 7. Tambahkan semua baris baru ke sheet dalam satu operasi untuk efisiensi
  tagihanSheet.getRange(tagihanSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);

  // 8. Kirim pesan sukses
  return { message: `Berhasil membuat ${newRows.length} tagihan baru untuk periode ${currentMonthName} ${currentYear}.` };
}

/**
 * Membaca semua data dari sheet yang diberikan dan mengubahnya menjadi array of objects.
 * @param {string} sheetName - Nama sheet yang akan dibaca.
 * @returns {Array<Object>} - Array berisi data dari sheet.
 */
function readSheetData(sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];

  const headers = values.shift().map(header => String(header).trim());
  return values.map((row, index) => {
    let obj = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header] = row[i];
      }
    });
    obj.rowNumber = index + 2;
    return obj;
  });
}

/**
 * Menghapus satu baris dari sheet berdasarkan nomor barisnya.
 * @param {string} sheetName - Nama sheet.
 * @param {number} rowNumber - Nomor baris yang akan dihapus.
 * @returns {Object} - Pesan sukses atau error.
 */
function deleteRow(sheetName, rowNumber) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Sheet ${sheetName} tidak ditemukan.` };
  sheet.deleteRow(parseInt(rowNumber));
  return { message: `Data berhasil dihapus!` };
}

/**
 * Menangani proses login user.
 * @param {string} username - Username dari input form.
 * @param {string} password - Password dari input form.
 * @returns {Object} - Hasil login.
 */
function handleLogin(username, password) {
  if (!username || !password) {
    throw new Error('Username dan password harus diisi');
  }

  const data = readSheetData('DATA');
  const user = data.find(row => String(row.USER).trim() === String(username).trim());

  if (!user) {
    throw new Error('Username atau password salah');
  }

  if (String(user.PASSWORD).trim() === String(password).trim()) {
    return {
      message: 'Login berhasil!',
      user: user.USER,
      level: user.LEVEL || 'ADMIN',
      idpl: user.IDPL,
    };
  } else {
    throw new Error('Username atau password salah');
  }
}

/**
 * Menambahkan pelanggan baru ke sheet 'DATA'.
 * @param {Object} data - Data pelanggan dari form frontend.
 * @returns {Object} - Pesan sukses.
 */
function addPelanggan(data) {
  const sheet = ss.getSheetByName('DATA');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Menentukan IDPL dan User baru dengan mencari nilai maksimum
  let nextIdpl = 'CST001';
  let nextUser = 'user1';
  const dataAll = sheet.getDataRange().getValues();
  if (dataAll.length > 1) {
    let maxCst = 0;
    let maxUser = 0;
    for (let i = 1; i < dataAll.length; i++) {
      const idplVal = String(dataAll[i][0]).trim();
      if (idplVal.startsWith('CST')) {
        const num = parseInt(idplVal.replace('CST', ''), 10);
        if (!isNaN(num) && num > maxCst) maxCst = num;
      }
      const userVal = String(dataAll[i][2]).trim();
      if (userVal.startsWith('user')) {
        const num = parseInt(userVal.replace('user', ''), 10);
        if (!isNaN(num) && num > maxUser) maxUser = num;
      }
    }
    nextIdpl = `CST${String(maxCst + 1).padStart(3, '0')}`;
    nextUser = `user${maxUser + 1}`;
  }

  // Membuat objek data baru yang lengkap
  const newRowObject = {
    'IDPL': nextIdpl,
    'NAMA': data.nama,
    'USER': nextUser,
    'PASSWORD': '1234',
    'LEVEL': 'USER',
    'KODE': 2,
    'ALAMAT': data.alamat,
    'PAKET': data.paket,
    'TAGIHAN': data.tagihan,
    'STATUS': 'AKTIF'
  };

  // Mengubah objek menjadi array sesuai urutan header di sheet
  const newRowArray = headers.map(header => newRowObject[header.trim()] !== undefined ? newRowObject[header.trim()] : '');

  sheet.appendRow(newRowArray);
  return { message: 'Pelanggan berhasil ditambahkan!' };
}

/**
 * Memperbarui data pelanggan yang ada.
 * @param {number} rowNumber - Nomor baris yang akan diupdate.
 * @param {Object} data - Data baru dari form frontend.
 * @returns {Object} - Pesan sukses.
 */
function updatePelanggan(rowNumber, data) {
  const sheet = ss.getSheetByName('DATA');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const originalRowValues = range.getValues()[0];

  // Membuat objek dari data baris yang ada di sheet
  let originalRowObject = {};
  headers.forEach((header, i) => {
    originalRowObject[header.trim()] = originalRowValues[i];
  });

  // Menimpa data lama dengan data baru dari form
  const updatedRowObject = {
    ...originalRowObject,
    'NAMA': data.nama,
    'ALAMAT': data.alamat,
    'PAKET': data.paket,
    'TAGIHAN': data.tagihan
  };

  // Mengubah kembali menjadi array untuk disimpan ke sheet
  const updatedRowArray = headers.map(header => updatedRowObject[header.trim()] || '');

  range.setValues([updatedRowArray]);
  return { message: 'Data berhasil diperbarui!' };
}

/**
 * Memindahkan tagihan ke lunas dan menghapus dari tagihan.
 * @param {number} rowNumber - Nomor baris di sheet 'Tagihan'.
 * @param {Object} rowData - Data lengkap dari baris tersebut.
 * @returns {Object} - Pesan sukses.
 */
function processPayment(rowNumber, rowData) {
  const lunasSheet = ss.getSheetByName('Lunas');
  const tagihanSheet = ss.getSheetByName('Tagihan');

  const lunasHeaders = lunasSheet.getRange(1, 1, 1, lunasSheet.getLastColumn()).getValues()[0];
  const newLunasRow = lunasHeaders.map(header => {
    if (header === 'STATUS') return 'LUNAS';
    if (header === 'TANGGAL BAYAR') return new Date();

    // --- INI ADALAH BAGIAN YANG SAYA TAMBAHKAN ---
    // Memaksa "PERIODE TAGIHAN" menjadi teks dengan menambahkan kutip tunggal
    if (header === 'PERIODE TAGIHAN') {
      return "'" + (rowData[header] || '');
    }

    return rowData[header] || '';
  });

  lunasSheet.appendRow(newLunasRow);
  tagihanSheet.deleteRow(parseInt(rowNumber));

  return { message: 'Pembayaran berhasil diproses!' };
}

/**
 * Mengembalikan tagihan dari Lunas ke Tagihan (Batalkan Pembayaran).
 * @param {number} rowNumber - Nomor baris di sheet 'Lunas'.
 * @param {Object} rowData - Data lengkap dari baris tersebut.
 * @returns {Object} - Pesan sukses.
 */
function batalBayar(rowNumber, rowData) {
  const lunasSheet = ss.getSheetByName('Lunas');
  const tagihanSheet = ss.getSheetByName('Tagihan');

  const tagihanHeaders = tagihanSheet.getRange(1, 1, 1, tagihanSheet.getLastColumn()).getValues()[0];
  const newTagihanRow = tagihanHeaders.map(header => {
    if (header === 'STATUS') return 'BELUM LUNAS';
    if (header === 'TANGGAL BAYAR') return '';

    // Memaksa "PERIODE TAGIHAN" menjadi teks dengan menambahkan kutip tunggal
    if (header === 'PERIODE TAGIHAN') {
      return "'" + (rowData[header] || '');
    }

    return rowData[header] || '';
  });

  tagihanSheet.appendRow(newTagihanRow);
  lunasSheet.deleteRow(parseInt(rowNumber));

  return { message: 'Pembayaran berhasil dibatalkan!' };
}

/**
 * Menambahkan data pengeluaran baru.
 * @param {Object} data - Data pengeluaran dari form.
 * @returns {Object} - Pesan sukses.
 */
function addPengeluaran(data) {
  const sheet = ss.getSheetByName('Pengeluaran');
  const nextId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const tanggalInput = new Date(data.TANGGAL);
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // Ambil nama bulan dan tahun dari tanggal
  const bulan = namaBulan[tanggalInput.getMonth()];
  const tahun = tanggalInput.getFullYear();
  // Buat format 'Bulan Tahun' untuk PERIODE TAGIHAN
  const periodeTagihan = `'${bulan} ${tahun}`;

  const newRow = [
    nextId,
    data.DESKRIPSI_PENGELUARAN,
    data.JUMLAH,
    tanggalInput.toLocaleDateString('id-ID'),
    bulan,
    tahun,
    periodeTagihan // <-- TAMBAHKAN PERIODE TAGIHAN DI SINI
  ];

  sheet.appendRow(newRow);
  return { message: 'Data pengeluaran berhasil ditambahkan!' };
}

/**
 * Memperbarui data pengeluaran.
 * @param {number} rowNumber - Nomor baris yang akan diupdate.
 * @param {Object} data - Data baru dari form.
 * @returns {Object} - Pesan sukses.
 */
function updatePengeluaran(rowNumber, data) {
  const sheet = ss.getSheetByName('Pengeluaran');
  const tanggalInput = new Date(data.TANGGAL);
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // Ambil nama bulan dan tahun dari tanggal
  const bulan = namaBulan[tanggalInput.getMonth()];
  const tahun = tanggalInput.getFullYear();
  // Buat format 'Bulan Tahun' untuk PERIODE TAGIHAN
  const periodeTagihan = `'${bulan} ${tahun}`;

  const updatedValues = [
    data.DESKRIPSI_PENGELUARAN,
    data.JUMLAH,
    tanggalInput.toLocaleDateString('id-ID'),
    bulan,
    tahun,
    periodeTagihan // <-- TAMBAHKAN PERIODE TAGIHAN DI SINI
  ];

  sheet.getRange(rowNumber, 2, 1, 6).setValues([updatedValues]);
  return { message: 'Data pengeluaran berhasil diperbarui!' };
}

/**
 * Menghitung statistik untuk halaman dashboard.
 * @param {string} bulan - Filter bulan.
 * @param {string} tahun - Filter tahun.
 * @returns {Object} - Objek berisi data statistik.
 */
function getDashboardStats(bulan, tahun) {
  const pelangganData = readSheetData('DATA');
  const tagihanData = readSheetData('Tagihan');
  const lunasData = readSheetData('Lunas');
  const pengeluaranData = readSheetData('Pengeluaran');

  const isFiltering = bulan && tahun && bulan !== 'semua';
  const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const filterByPeriode = (data) => {
    if (!isFiltering) return data;
    const filterBulanNama = namaBulan[parseInt(bulan, 10)];
    const targetPeriode = `${filterBulanNama} ${tahun}`;
    return data.filter(row => String(row['PERIODE TAGIHAN'] || '').trim() === targetPeriode);
  };

  const lunasFiltered = filterByPeriode(lunasData);
  const pengeluaranFiltered = filterByPeriode(pengeluaranData);
  const tagihanFiltered = filterByPeriode(tagihanData);
  const unpaidInvoices = tagihanFiltered.filter(row => row.STATUS && row.STATUS.toUpperCase() === 'BELUM LUNAS');


  // --- PERUBAHAN UTAMA ADA DI SINI ---
  const totalCustomers = pelangganData.filter(p => p.LEVEL === 'USER').length;
  const activeCustomers = pelangganData.filter(p => p.STATUS === 'AKTIF' && p.LEVEL === 'USER').length;
  const inactiveCustomers = pelangganData.filter(p => p.STATUS && p.STATUS.toUpperCase() === 'NONAKTIF' && p.LEVEL === 'USER').length;
  // ------------------------------------

  const totalRevenue = lunasFiltered.reduce((sum, row) => {
    const nominal = parseFloat(String(row.TAGIHAN || '0').replace(/\D/g, ''));
    return sum + nominal;
  }, 0);

  const totalExpenses = pengeluaranFiltered.reduce((sum, row) => {
    const nominal = parseFloat(String(row.JUMLAH || '0').replace(/\D/g, ''));
    return sum + nominal;
  }, 0);

  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    totalUnpaid: unpaidInvoices.length,
    totalPaid: lunasFiltered.length,
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses
  };
}

// --- FUNGSI BARU UNTUK DASBOR PELANGGAN ---
/**
 * Mengambil data tagihan, lunas, dan profil untuk satu pelanggan spesifik.
 * @param {string} idpl - ID Pelanggan yang login.
 * @returns {Object} - Berisi data profil, tagihan, dan riwayat lunas.
 */
function getSpecificCustomerData(idpl) {
  if (!idpl) {
    throw new Error('ID Pelanggan diperlukan.');
  }

  const profil = readSheetData('DATA').find(p => p.IDPL === idpl);
  const tagihan = readSheetData('Tagihan').filter(t => t.IDPL === idpl);
  const lunas = readSheetData('Lunas').filter(l => l.IDPL === idpl);

  return {
    profil: profil,
    tagihan: tagihan,
    riwayatLunas: lunas
  };
}

/**
 * Menambahkan baris data baru secara generik ke sheet tertentu.
 * @param {string} sheetName - Nama sheet
 * @param {Object} data - Data yang akan ditambahkan
 * @returns {Object} - Hasil
 */
function addRow(sheetName, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const newRow = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(newRow);
  return { message: 'Data berhasil ditambahkan!' };
}

/**
 * Memperbarui baris data secara generik.
 * @param {string} sheetName - Nama sheet
 * @param {number} rowNumber - Nomor baris
 * @param {Object} data - Data baru
 * @returns {Object} - Hasil
 */
function updateRow(sheetName, rowNumber, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const updatedRow = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.getRange(rowNumber, 1, 1, updatedRow.length).setValues([updatedRow]);
  return { message: 'Data berhasil diperbarui!' };
}