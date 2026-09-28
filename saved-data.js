const STORAGE_KEY = 'bukuTamuEntries';
const GAS_URL = window.BUKU_TAMU_GAS_URL || 'PASTE_YOUR_DEPLOYMENT_URL_HERE';
const savedYearFilter = document.getElementById('savedYearFilter');
const savedMonthFilter = document.getElementById('savedMonthFilter');
const savedDataBody = document.getElementById('savedDataBody');
const savedTotalStat = document.getElementById('savedTotalStat');
const savedDownloadBtn = document.getElementById('savedDownloadBtn');

let appEntries = [];

async function requestAppScript(payload) {
  if (!GAS_URL || GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
    return { ok: true, entries: getEntries() };
  }

  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error('Gagal terhubung ke Apps Script.');
  }

  return response.json();
}

function getEntries() {
  if (appEntries.length) {
    return appEntries;
  }

  const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return Array.isArray(entries) ? entries : [];
}

async function refreshEntries() {
  if (!GAS_URL || GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
    appEntries = getEntries();
    return appEntries;
  }

  try {
    const result = await requestAppScript({ action: 'entries' });
    appEntries = Array.isArray(result.entries) ? result.entries : getEntries();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appEntries));
    return appEntries;
  } catch (error) {
    console.warn('Gagal mengambil data dari Apps Script, fallback ke localStorage:', error);
    appEntries = getEntries();
    return appEntries;
  }
}

function getYearOptions(entries) {
  const years = [...new Set(entries.map((entry) => Number(entry.year || new Date(entry.createdAt).getFullYear())))].sort((a, b) => b - a);
  return years.length ? years : [new Date().getFullYear()];
}

function getFilteredEntries(entries, selectedYear, selectedMonth) {
  return entries.filter((entry) => {
    const year = Number(entry.year || new Date(entry.createdAt).getFullYear());
    const month = new Date(entry.createdAt).getMonth();
    const inYear = Number(selectedYear) === year;
    const inMonth = selectedMonth === 'all' || Number(selectedMonth) === month;
    return inYear && inMonth;
  });
}

function renderSavedData() {
  const entries = getEntries();
  const selectedYear = Number(savedYearFilter.value || getYearOptions(entries)[0] || new Date().getFullYear());
  const selectedMonth = savedMonthFilter.value || 'all';
  const filteredEntries = getFilteredEntries(entries, selectedYear, selectedMonth);

  savedYearFilter.innerHTML = getYearOptions(entries)
    .map((year) => `<option value="${year}">${year}</option>`)
    .join('');
  savedYearFilter.value = String(selectedYear);

  savedTotalStat.textContent = filteredEntries.length;

  if (!filteredEntries.length) {
    savedDataBody.innerHTML = '<tr><td colspan="7">Belum ada data tamu tersimpan.</td></tr>';
    return;
  }

  savedDataBody.innerHTML = filteredEntries
    .map(
      (entry) => `
        <tr>
          <td>${entry.name || '-'}</td>
          <td>${entry.phone || '-'}</td>
          <td>${entry.company || '-'}</td>
          <td>${entry.purpose || '-'}</td>
          <td>${entry.day || '-'}</td>
          <td>${entry.date || new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(entry.createdAt))}</td>
          <td>${entry.year || new Date(entry.createdAt).getFullYear()}</td>
        </tr>
      `,
    )
    .join('');
}

function exportSavedData() {
  const entries = getEntries();
  const selectedYear = Number(savedYearFilter.value || getYearOptions(entries)[0] || new Date().getFullYear());
  const selectedMonth = savedMonthFilter.value || 'all';
  const filteredEntries = getFilteredEntries(entries, selectedYear, selectedMonth);

  if (!filteredEntries.length) {
    alert('Tidak ada data yang dapat diunduh pada filter saat ini.');
    return;
  }

  const exportRows = filteredEntries.map((entry) => ({
    Nama: entry.name || '-',
    'Nomor HP': entry.phone || '-',
    Instansi: entry.company || '-',
    Tujuan: entry.purpose || '-',
    Hari: entry.day || '-',
    Tanggal: entry.date || new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(entry.createdAt)),
    Tahun: entry.year || new Date(entry.createdAt).getFullYear(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Tamu');

  const monthLabel = selectedMonth === 'all' ? 'Semua-Bulan' : new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(selectedYear, Number(selectedMonth), 1));
  XLSX.writeFile(workbook, `data_tamu_tersimpan_${selectedYear}_${monthLabel}.xlsx`);
}

savedYearFilter.addEventListener('change', renderSavedData);
savedMonthFilter.addEventListener('change', renderSavedData);
savedDownloadBtn.addEventListener('click', exportSavedData);

refreshEntries().then(() => {
  renderSavedData();
});
