# Buku Tamu

Aplikasi buku tamu sederhana untuk mencatat kehadiran tamu secara cepat dan rapi.

## Fitur

- Formulir input nama, nomor HP, instansi, tujuan, dan catatan
- Simpan data di browser menggunakan localStorage
- Cari tamu berdasarkan nama, instansi, tujuan, dan catatan
- Hapus data tamu yang sudah tidak diperlukan
- Tampilan responsif untuk desktop maupun mobile
- Halaman khusus untuk tamu mengisi sendiri melalui HP

## Cara menjalankan lokal

1. Masuk ke folder proyek
2. Jalankan server statis:

```bash
python -m http.server 8000
```

3. Buka browser ke: http://localhost:8000
4. Untuk form mandiri tamu via HP, buka: http://localhost:8000/guest-mobile.html

## Cara online / deployment

1. Buka file `config.js` dan ganti nilai berikut:

```js
window.BUKU_TAMU_GAS_URL = 'https://script.google.com/macros/s/AKF.../exec';
```

2. Deploy Apps Script dari file `Code.gs`:
   - Buka project Apps Script
   - Klik Deploy > New deployment
   - Pilih type: Web app
   - Atur access: Anyone
   - Jalankan deployment dan salin URL hasil publish
   - Paste URL tersebut ke `config.js`

3. Setelah URL terisi, halaman web akan mengirim data ke Apps Script dan menyimpan ke Google Sheets, bukan ke localStorage.
4. Jika URL masih placeholder, aplikasi otomatis tetap berjalan di mode lokal untuk ujicoba.

## Cara publish ke internet

Karena aplikasi ini terdiri dari front-end statis + backend Apps Script, langkah paling cepat adalah:

- Deploy Apps Script sebagai web app
- Gunakan URL hasil deployment sebagai `window.BUKU_TAMU_GAS_URL`
- Hosting front-end bisa dilakukan dari GitHub Pages, Netlify, atau Vercel
- Untuk satu proyek desktop sederhana, cukup hosting front-end secara statis dan backend tetap di Apps Script

Setelah URL web app aktif, seluruh form input akan tersimpan secara online ke Google Sheets.
## File utama

- `index.html` untuk struktur halaman utama
- `guest-mobile.html` untuk form tamu mandiri via HP
- `saved-data.html` untuk halaman data tersimpan
- `style.css` untuk tampilan
- `config.js` untuk konfigurasi URL deployment online
- `script.js`, `guest-mobile.js`, dan `saved-data.js` untuk logika aplikasi
