const STORAGE_KEY = 'bukuTamuEntries';
const GAS_URL = window.BUKU_TAMU_GAS_URL || 'PASTE_YOUR_DEPLOYMENT_URL_HERE';

const guestForm = document.getElementById('guestMobileForm');
const successState = document.getElementById('successState');
const newGuestBtn = document.getElementById('newGuestBtn');
const mobileName = document.getElementById('mobileName');
const mobilePhone = document.getElementById('mobilePhone');
const mobileCompany = document.getElementById('mobileCompany');
const mobilePurpose = document.getElementById('mobilePurpose');
const mobileNotes = document.getElementById('mobileNotes');
const mobileAutoDay = document.getElementById('mobileAutoDay');
const mobileAutoDate = document.getElementById('mobileAutoDate');
const mobileAutoYear = document.getElementById('mobileAutoYear');
const mobileStartCameraBtn = document.getElementById('mobileStartCameraBtn');
const mobileCapturePhotoBtn = document.getElementById('mobileCapturePhotoBtn');
const mobileCameraPreview = document.getElementById('mobileCameraPreview');
const mobilePhotoCanvas = document.getElementById('mobilePhotoCanvas');
const mobilePhotoPreview = document.getElementById('mobilePhotoPreview');
const mobileMessage = document.getElementById('mobileMessage');

let stream = null;
let photoDataUrl = '';

async function requestAppScript(payload) {
  if (!GAS_URL || GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
    return { ok: true, entries: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'), message: 'Mode lokal aktif.' };
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

function resetFormState() {
  guestForm.reset();
  photoDataUrl = '';
  mobilePhotoPreview.src = '';
  mobilePhotoPreview.hidden = true;
  mobilePhotoPreview.classList.remove('visible');
  showMessage('');
  mobileName.focus();
}

function getEntries() {
  const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return Array.isArray(entries) ? entries : [];
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function updateAutoDateFields() {
  const now = new Date();
  mobileAutoDay.textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now);
  mobileAutoDate.textContent = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  mobileAutoYear.textContent = String(now.getFullYear());
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showMessage('Browser ini tidak mendukung kamera.', true);
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

    mobileCameraPreview.srcObject = stream;
    mobileCameraPreview.style.display = 'block';
    mobilePhotoPreview.hidden = true;
    mobilePhotoPreview.classList.remove('visible');
    mobileCapturePhotoBtn.disabled = false;
    mobileStartCameraBtn.textContent = 'Kamera aktif';
    mobileStartCameraBtn.disabled = true;
    showMessage('Kamera siap digunakan.');

    setTimeout(() => {
      if (stream && !photoDataUrl) {
        capturePhoto();
      }
    }, 1200);
  } catch (error) {
    console.error('Gagal mengaktifkan kamera:', error);
    showMessage('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.', true);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (mobileCameraPreview.srcObject) {
    mobileCameraPreview.srcObject = null;
  }

  mobileCameraPreview.style.display = 'none';
  mobileStartCameraBtn.textContent = 'Aktifkan kamera';
  mobileStartCameraBtn.disabled = false;
  mobileCapturePhotoBtn.disabled = true;
}

function capturePhoto() {
  if (!stream) {
    showMessage('Kamera belum aktif.', true);
    return;
  }

  const context = mobilePhotoCanvas.getContext('2d');
  mobilePhotoCanvas.width = mobileCameraPreview.videoWidth || 640;
  mobilePhotoCanvas.height = mobileCameraPreview.videoHeight || 480;

  context.drawImage(mobileCameraPreview, 0, 0, mobilePhotoCanvas.width, mobilePhotoCanvas.height);
  photoDataUrl = mobilePhotoCanvas.toDataURL('image/jpeg', 0.9);
  mobilePhotoPreview.src = photoDataUrl;
  mobilePhotoPreview.hidden = false;
  mobilePhotoPreview.classList.add('visible');
  mobileCameraPreview.style.display = 'none';
  mobileStartCameraBtn.textContent = 'Ulangi kamera';
  mobileStartCameraBtn.disabled = false;
  mobileCapturePhotoBtn.disabled = true;
  showMessage('Foto berhasil diambil.');
}

function showMessage(message, isError = false) {
  mobileMessage.textContent = message;
  mobileMessage.classList.toggle('error', isError);
}

guestForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = {
    id: crypto.randomUUID(),
    name: mobileName.value.trim(),
    phone: mobilePhone.value.trim(),
    company: mobileCompany.value.trim(),
    purpose: mobilePurpose.value.trim(),
    notes: mobileNotes.value.trim(),
    day: mobileAutoDay.textContent,
    date: mobileAutoDate.textContent,
    year: Number(mobileAutoYear.textContent),
    photoDataUrl,
    createdAt: new Date().toISOString(),
  };

  if (!formData.name || !formData.phone || !formData.company || !formData.purpose) {
    showMessage('Harap lengkapi semua data wajib.', true);
    return;
  }

  try {
    if (GAS_URL && !GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
      const result = await requestAppScript({ action: 'saveGuest', data: formData });
      if (!result.ok) {
        showMessage(result.message || 'Gagal menyimpan data.', true);
        return;
      }
    } else {
      const entries = getEntries();
      entries.unshift(formData);
      saveEntries(entries);
    }

    guestForm.classList.add('hidden');
    successState.classList.remove('hidden');
    showMessage('Data terkirim.');
    stopCamera();
  } catch (error) {
    console.error('Submit mobile gagal:', error);
    showMessage('Gagal mengirim data tamu.', true);
  }
});

newGuestBtn.addEventListener('click', () => {
  guestForm.classList.remove('hidden');
  successState.classList.add('hidden');
  resetFormState();
  startCamera();
});

mobileStartCameraBtn.addEventListener('click', startCamera);
mobileCapturePhotoBtn.addEventListener('click', capturePhoto);
showMessage('');
updateAutoDateFields();
startCamera();
