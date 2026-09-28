const STORAGE_KEY = 'bukuTamuEntries';
const GAS_URL = window.BUKU_TAMU_GAS_URL || 'PASTE_YOUR_DEPLOYMENT_URL_HERE';

const guestForm = document.getElementById('guestForm');
const guestList = document.getElementById('guestList');
const entryCount = document.getElementById('entryCount');
const searchInput = document.getElementById('searchInput');
const guestTemplate = document.getElementById('guestTemplate');
const startCameraBtn = document.getElementById('startCameraBtn');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const cameraPreview = document.getElementById('cameraPreview');
const photoCanvas = document.getElementById('photoCanvas');
const photoPreview = document.getElementById('photoPreview');
const yearFilter = document.getElementById('yearFilter');
const monthFilter = document.getElementById('monthFilter');
const totalGuestsStat = document.getElementById('totalGuestsStat');
const peakDayStat = document.getElementById('peakDayStat');
const peakMonthStat = document.getElementById('peakMonthStat');
const dailyTableBody = document.getElementById('dailyTableBody');
const savedGuestTableBody = document.getElementById('savedGuestTableBody');
const autoDay = document.getElementById('autoDay');
const autoDate = document.getElementById('autoDate');
const autoYear = document.getElementById('autoYear');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');

let stream = null;
let photoDataUrl = '';
let guestChart = null;
let appEntries = [];

function getEntries() {
  if (appEntries.length) {
    return appEntries;
  }

  const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return Array.isArray(entries) ? entries : [];
}

function saveEntries(entries) {
  appEntries = Array.isArray(entries) ? entries : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appEntries));
}

async function requestAppScript(payload) {
  if (!GAS_URL || GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
    return { ok: true, entries: getEntries(), message: 'Mode lokal aktif.' };
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
    console.warn('Tidak bisa mengambil data dari Apps Script, fallback ke localStorage:', error);
    appEntries = getEntries();
    return appEntries;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function updateAutoDateFields() {
  const now = new Date();
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now);
  const fullDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const yearValue = now.getFullYear();

  autoDay.textContent = dayName;
  autoDate.textContent = fullDate;
  autoYear.textContent = String(yearValue);
}

function getYearOptions(entries) {
  const years = [...new Set(entries.map((entry) => new Date(entry.createdAt).getFullYear()))].sort((a, b) => b - a);
  return years.length ? years : [new Date().getFullYear()];
}

function getDayData(entries) {
  const dateMap = new Map();

  entries.forEach((entry) => {
    const date = new Date(entry.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dateMap.set(key, (dateMap.get(key) || 0) + 1);
  });

  return [...dateMap.entries()]
    .map(([date, count]) => {
      const parsed = new Date(`${date}T00:00:00`);
      return {
        date,
        year: parsed.getFullYear(),
        monthLabel: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(parsed),
        dayLabel: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parsed),
        count,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getMonthlyData(entries, selectedYear) {
  const monthData = Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(2024, index, 1)),
    count: 0,
  }));

  entries
    .filter((entry) => new Date(entry.createdAt).getFullYear() === Number(selectedYear))
    .forEach((entry) => {
      const date = new Date(entry.createdAt);
      monthData[date.getMonth()].count += 1;
    });

  return monthData;
}

function getFilteredEntries(entries, selectedYear, selectedMonth) {
  return entries.filter((entry) => {
    const date = new Date(entry.createdAt);
    const inYear = Number(selectedYear) === date.getFullYear();
    const inMonth = selectedMonth === 'all' || Number(selectedMonth) === date.getMonth();
    return inYear && inMonth;
  });
}

function getDailyDataForMonth(entries, selectedYear, selectedMonth) {
  const monthIndex = Number(selectedMonth);
  const monthDays = new Map();

  for (let day = 1; day <= new Date(selectedYear, monthIndex + 1, 0).getDate(); day += 1) {
    const dateKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthDays.set(dateKey, 0);
  }

  entries.forEach((entry) => {
    const date = new Date(entry.createdAt);
    if (date.getFullYear() === Number(selectedYear) && date.getMonth() === monthIndex) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      monthDays.set(key, (monthDays.get(key) || 0) + 1);
    }
  });

  return [...monthDays.entries()]
    .map(([date, count]) => {
      const parsed = new Date(`${date}T00:00:00`);
      return {
        date,
        year: parsed.getFullYear(),
        dayLabel: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parsed),
        count,
      };
    })
    .filter((item) => item.count > 0 || item.date.includes(`${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`));
}

function exportFilteredExcel() {
  const entries = getEntries();
  const selectedYear = Number(yearFilter.value || new Date().getFullYear());
  const selectedMonth = monthFilter.value || 'all';
  const filteredEntries = getFilteredEntries(entries, selectedYear, selectedMonth);
  const exportRows = (selectedMonth === 'all' ? getDayData(filteredEntries) : getDailyDataForMonth(filteredEntries, selectedYear, Number(selectedMonth)))
    .map((item) => ({
      Tanggal: item.date,
      Hari: item.dayLabel || new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(`${item.date}T00:00:00`)),
      Tahun: item.year || selectedYear,
      Jumlah: item.count,
    }));

  if (!exportRows.length) {
    alert('Tidak ada data untuk diunduh pada filter saat ini.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Tamu');

  const monthLabel = selectedMonth === 'all' ? 'Semua-Bulan' : new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(selectedYear, Number(selectedMonth), 1));
  XLSX.writeFile(workbook, `data_tamu_${selectedYear}_${monthLabel}.xlsx`);
}

function renderSavedGuestTable(filteredEntries) {
  if (!filteredEntries.length) {
    savedGuestTableBody.innerHTML = '<tr><td colspan="7">Belum ada data tamu tersimpan.</td></tr>';
    return;
  }

  savedGuestTableBody.innerHTML = filteredEntries
    .map((entry) => `
      <tr>
        <td>${entry.name || '-'}</td>
        <td>${entry.phone || '-'}</td>
        <td>${entry.company || '-'}</td>
        <td>${entry.purpose || '-'}</td>
        <td>${entry.day || '-'}</td>
        <td>${entry.date || new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(entry.createdAt))}</td>
        <td>${entry.year || new Date(entry.createdAt).getFullYear()}</td>
      </tr>
    `)
    .join('');
}

function renderDashboard() {
  const entries = getEntries();
  const years = getYearOptions(entries);
  const selectedYear = Number(yearFilter.value || years[0] || new Date().getFullYear());
  const selectedMonth = monthFilter.value || 'all';
  const filteredEntries = getFilteredEntries(entries, selectedYear, selectedMonth);

  yearFilter.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join('');
  yearFilter.value = String(selectedYear);

  const dailyData = selectedMonth === 'all' ? getDayData(filteredEntries) : getDailyDataForMonth(filteredEntries, selectedYear, Number(selectedMonth));
  const totalGuests = filteredEntries.length;
  const monthlyData = getMonthlyData(entries, selectedYear);
  const peakDay = dailyData.reduce((highest, current) => (current.count > highest.count ? current : highest), { date: '-', count: 0 });
  const peakMonth = monthlyData.reduce((highest, current) => (current.count > highest.count ? current : highest), { label: '-', count: 0 });

  totalGuestsStat.textContent = totalGuests;
  peakDayStat.textContent = peakDay.date === '-' ? '-' : `${peakDay.date} (${peakDay.count})`;
  peakMonthStat.textContent = peakMonth.label === '-' ? '-' : `${peakMonth.label} (${peakMonth.count})`;

  dailyTableBody.innerHTML = dailyData.length
    ? dailyData
        .slice(0, 30)
        .map(
          (item) => `
            <tr>
              <td>${item.date}</td>
              <td>${item.dayLabel || new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(`${item.date}T00:00:00`))}</td>
              <td>${item.year || selectedYear}</td>
              <td>${item.count}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="4">Belum ada data tamu.</td></tr>';

  renderSavedGuestTable(filteredEntries);

  if (window.Chart) {
    if (guestChart) {
      guestChart.destroy();
    }

    const ctx = document.getElementById('guestChart');
    const chartLabels = selectedMonth === 'all'
      ? monthlyData.map((item) => item.label)
      : getDailyDataForMonth(filteredEntries, selectedYear, Number(selectedMonth)).map((item) => item.date.split('-').slice(2).join('/'));
    const chartValues = selectedMonth === 'all'
      ? monthlyData.map((item) => item.count)
      : getDailyDataForMonth(filteredEntries, selectedYear, Number(selectedMonth)).map((item) => item.count);

    guestChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: selectedMonth === 'all' ? `Jumlah tamu ${selectedYear}` : `Jumlah tamu ${selectedYear}-${Number(selectedMonth) + 1}`,
            data: chartValues,
            backgroundColor: 'rgba(37, 99, 235, 0.7)',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Browser ini tidak mendukung kamera.');
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    cameraPreview.srcObject = stream;
    cameraPreview.style.display = 'block';
    photoPreview.hidden = true;
    photoPreview.classList.remove('visible');
    capturePhotoBtn.disabled = false;
    startCameraBtn.textContent = 'Kamera aktif';
    startCameraBtn.disabled = true;
  } catch (error) {
    console.error('Gagal mengaktifkan kamera:', error);
    alert('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (cameraPreview.srcObject) {
    cameraPreview.srcObject = null;
  }

  cameraPreview.style.display = 'none';
  startCameraBtn.textContent = 'Aktifkan kamera';
  startCameraBtn.disabled = false;
  capturePhotoBtn.disabled = true;
}

function capturePhoto() {
  if (!stream) {
    alert('Kamera belum aktif.');
    return;
  }

  const context = photoCanvas.getContext('2d');
  photoCanvas.width = cameraPreview.videoWidth || 640;
  photoCanvas.height = cameraPreview.videoHeight || 480;

  context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
  photoDataUrl = photoCanvas.toDataURL('image/jpeg', 0.9);
  photoPreview.src = photoDataUrl;
  photoPreview.hidden = false;
  photoPreview.classList.add('visible');
  cameraPreview.style.display = 'none';
  startCameraBtn.textContent = 'Ulangi kamera';
  startCameraBtn.disabled = false;
  capturePhotoBtn.disabled = true;
}

function renderEntries(filterText = '') {
  const entries = getEntries();
  const keyword = filterText.trim().toLowerCase();

  const filteredEntries = entries.filter((entry) => {
    const haystack = [
      entry.name,
      entry.company,
      entry.phone,
      entry.purpose,
      entry.notes,
      entry.photoDataUrl || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });

  entryCount.textContent = `${filteredEntries.length} tamu`;

  if (filteredEntries.length === 0) {
    guestList.innerHTML = `
      <div class="empty-state">
        <p>Tidak ada data tamu yang cocok.</p>
      </div>
    `;
    renderDashboard();
    return;
  }

  guestList.innerHTML = '';

  filteredEntries.forEach((entry) => {
    const fragment = guestTemplate.content.cloneNode(true);
    const item = fragment.querySelector('.guest-item');

    fragment.querySelector('.guest-name').textContent = entry.name;
    fragment.querySelector('.guest-company').textContent = entry.company;
    fragment.querySelector('.guest-detail strong').textContent = entry.phone;
    fragment.querySelector('.guest-detail span:last-child strong').textContent = entry.purpose;
    fragment.querySelector('.guest-date-meta').textContent = `Hari: ${entry.day || '-'} • Tanggal: ${entry.date || '-'} • Tahun: ${entry.year || '-'}`;
    fragment.querySelector('.guest-notes').textContent = entry.notes || 'Tidak ada catatan tambahan.';
    fragment.querySelector('.guest-time').textContent = `Waktu masuk: ${formatDate(entry.createdAt)}`;

    const photoBox = fragment.querySelector('.guest-photo');
    if (entry.photoDataUrl) {
      const image = document.createElement('img');
      image.src = entry.photoDataUrl;
      image.alt = `Foto ${entry.name}`;
      image.className = 'guest-photo-image';
      photoBox.appendChild(image);
      photoBox.hidden = false;
    }

    const deleteBtn = fragment.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      try {
        if (GAS_URL && !GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
          const result = await requestAppScript({ action: 'deleteGuest', id: entry.id });
          if (!result.ok) {
            alert(result.message || 'Gagal menghapus data.');
            return;
          }
        } else {
          const remaining = getEntries().filter((itemEntry) => itemEntry.id !== entry.id);
          saveEntries(remaining);
        }

        await refreshEntries();
        renderEntries(searchInput.value);
      } catch (error) {
        console.error('Delete gagal:', error);
        alert('Gagal menghapus data tamu.');
      }
    });

    item.dataset.id = entry.id;
    guestList.appendChild(fragment);
  });

  renderDashboard();
}

guestForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = {
    id: crypto.randomUUID(),
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    company: document.getElementById('company').value.trim(),
    purpose: document.getElementById('purpose').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    day: autoDay.textContent,
    date: autoDate.textContent,
    year: Number(autoYear.textContent),
    photoDataUrl,
    createdAt: new Date().toISOString(),
  };

  if (!formData.name || !formData.phone || !formData.company || !formData.purpose) {
    return;
  }

  try {
    if (GAS_URL && !GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
      const result = await requestAppScript({ action: 'saveGuest', data: formData });
      if (!result.ok) {
        alert(result.message || 'Gagal menyimpan data.');
        return;
      }
    } else {
      const entries = getEntries();
      entries.unshift(formData);
      saveEntries(entries);
    }

    await refreshEntries();
    guestForm.reset();
    photoDataUrl = '';
    photoPreview.src = '';
    photoPreview.hidden = true;
    photoPreview.classList.remove('visible');
    stopCamera();
    renderEntries(searchInput.value);
  } catch (error) {
    console.error('Submit gagal:', error);
    alert('Gagal menyimpan data tamu.');
  }
});

searchInput.addEventListener('input', (event) => {
  renderEntries(event.target.value);
});

yearFilter.addEventListener('change', () => {
  renderDashboard();
});

monthFilter.addEventListener('change', () => {
  renderDashboard();
});

downloadExcelBtn.addEventListener('click', exportFilteredExcel);

startCameraBtn.addEventListener('click', startCamera);
capturePhotoBtn.addEventListener('click', capturePhoto);

updateAutoDateFields();
refreshEntries().then(() => {
  renderDashboard();
  renderEntries();
});
