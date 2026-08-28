# Panduan Setup — Gate Check (Event Ticket Validator)

Update ini menyesuaikan struktur kolom spreadsheet kamu yang sudah ada (hasil form pendaftaran), plus fitur baru: **edit** dan **hapus/batalkan** data tiket yang sudah check-in lewat tab **Riwayat**.

---

## Yang berubah dari versi sebelumnya

1. **Kolom N & O ditambahkan** di spreadsheet kamu:
   - **N: Status Penukaran** — isi `Belum Ditukarkan` di semua baris data yang sudah ada.
   - **O: Waktu Penukaran** — biarkan kosong, otomatis terisi saat panitia check-in tiket.
2. **Tab baru "Riwayat"** di web app — daftar semua tiket yang sudah check-in, bisa dicari, dan tiap tiket bisa:
   - ✏️ **Edit** data (nama, email, WhatsApp, kategori, jumlah tiket)
   - ↩️ **Batalkan Check-in** (kembalikan status ke "Belum Ditukarkan" — untuk kalau salah scan)
   - 🗑️ **Hapus Data** permanen dari spreadsheet
3. `CONFIG.APPS_SCRIPT_URL` di `index.html` **sudah saya isi otomatis** dengan Web App URL yang kamu kirim:
   ```
   https://script.google.com/macros/s/AKfycbxoBHmDPBLTUCULnyFmsOsaU1YNjrBqEsPaAxv4iX_Gj84DFlVoIkwJhBHtZBj2-wT8/exec
   ```

---

## LANGKAH 1 — Siapkan kolom baru di Spreadsheet

Struktur sheet kamu sekarang (kolom A–M sudah ada dari form, N–O baru):

| Kolom | Nama |
|---|---|
| A | Timestamp |
| B | Order ID |
| C | Nama Lengkap |
| D | Email |
| E | Nomor WhatsApp |
| F | Kategori Tiket |
| G | Jumlah Tiket |
| H | Total Harga |
| I | Status Pembayaran |
| J | E-Ticket Code / QR Code Unique String |
| K | Metode Pembayaran |
| L | Bukti Pembayaran |
| M | E-Ticket Email Sent At |
| **N** | **Status Penukaran** ⟵ tambahkan header ini |
| **O** | **Waktu Penukaran** ⟵ tambahkan header ini |

**Yang perlu kamu lakukan:**
1. Klik kolom N baris 1 → ketik `Status Penukaran`.
2. Klik kolom O baris 1 → ketik `Waktu Penukaran`.
3. Isi kolom N di **semua baris data yang sudah ada** dengan teks persis: `Belum Ditukarkan`
   (Cara cepat: ketik di sel N2, lalu drag kotak kecil di pojok kanan-bawah sel ke bawah sampai baris terakhir — auto-fill.)
4. Kolom O biarkan **kosong** untuk semua baris — nanti otomatis terisi timestamp saat tiket di-check-in.

> ⚠️ Cek juga nama tab sheet kamu (di bagian bawah, misal "Form Responses 1" atau nama lain) — kamu akan butuh nama ini di Langkah 2.

---

## LANGKAH 2 — Update kode di Apps Script

1. Buka spreadsheet kamu → menu **Extensions → Apps Script** (script yang lama, yang sudah kamu deploy).
2. **Hapus semua isi editor**, lalu paste seluruh isi file **`google-apps-script.gs`** yang baru (di attachment).
3. Cari baris ini di paling atas:
   ```js
   const SHEET_NAME = "Tickets";
   ```
   **Ganti `"Tickets"`** dengan nama tab sheet kamu yang sebenarnya (persis sama, termasuk huruf besar/kecil dan spasi). Misalnya kalau nama tabnya "Form Responses 1":
   ```js
   const SHEET_NAME = "Form Responses 1";
   ```
4. Klik 💾 **Save**.

---

## LANGKAH 3 — Deploy ulang (WAJIB, karena URL kamu sudah ada)

Karena kode `.gs` berubah, kamu **harus** membuat versi deployment baru supaya URL yang sudah ada ikut terupdate:

1. Klik **Deploy → Manage deployments**.
2. Klik ikon ✏️ (edit) pada deployment yang aktif.
3. Di dropdown **Version**, pilih **New version**.
4. Klik **Deploy**.
5. Kalau muncul permintaan izin ulang, klik **Authorize access** → pilih akun → **Advanced** → **Go to (nama project) (unsafe)** → **Allow**.

URL Web App kamu **tetap sama** (tidak berubah):
```
https://script.google.com/macros/s/AKfycbxoBHmDPBLTUCULnyFmsOsaU1YNjrBqEsPaAxv4iX_Gj84DFlVoIkwJhBHtZBj2-wT8/exec
```

---

## LANGKAH 4 — Ganti file frontend

`index.html` yang baru sudah otomatis diisi dengan URL Web App kamu, jadi **tidak perlu edit apa-apa** — tinggal pakai file ini menggantikan yang lama (di hosting kamu, atau kalau masih testing lokal, buka langsung di browser).

Kalau kamu ingin menambah proteksi token (opsional):
- Isi `SECRET_TOKEN` di `google-apps-script.gs`
- Isi `CONFIG.TOKEN` di `index.html` dengan nilai yang sama

---

## LANGKAH 5 — Uji Coba

1. Buka `index.html`. Statistik di atas (Total / Check-in / Sisa) harus muncul angkanya.
2. Tab **Manual** → masukkan salah satu `E-Ticket Code` dari sheet → modal **hijau** (Tiket Valid) muncul dengan detail termasuk Kategori Tiket & Status Bayar.
3. Klik **Tukarkan Tiket** → cek sheet, kolom N & O otomatis terisi.
4. Buka tab **Riwayat** → tiket yang baru di-check-in harus muncul di daftar.
5. Tap tiket itu di Riwayat → modal edit terbuka:
   - Ubah salah satu field → **Simpan Perubahan** → cek sheet ikut berubah.
   - Klik **Batalkan Check-in** → status kembali ke "Belum Ditukarkan", tiket hilang dari daftar Riwayat.
   - Scan/cari lagi tiket yang sama → klik **Tukarkan Tiket** lagi supaya statusnya "Sudah Ditukarkan" lagi.
   - (Hati-hati) tombol **Hapus Data** akan menghapus baris itu permanen dari spreadsheet — coba di data dummy dulu.

---

## Troubleshooting

| Masalah | Penyebab & Solusi |
|---|---|
| Statistik "–" terus / semua kode "Tidak Ditemukan" | `SHEET_NAME` di `.gs` tidak sama persis dengan nama tab sheet kamu. Cek ulang Langkah 2. |
| Perubahan tidak terasa setelah edit `.gs` | Lupa **Deploy → Manage deployments → New version → Deploy** (Langkah 3). Edit kode saja tidak otomatis update URL yang sudah dipakai. |
| Tab Riwayat kosong padahal sudah ada yang check-in | Pastikan kolom N terisi persis `Sudah Ditukarkan` (bukan varian lain) — ini terisi otomatis oleh sistem, tapi kalau kamu isi manual pastikan ejaannya sama persis. |
| Kamera tidak menyala | Buka lewat HTTPS (bukan `file://`), bukan lewat `localhost` juga tidak masalah. Izinkan akses kamera di browser. |
| Ingin batasi akses data | Isi `SECRET_TOKEN` (di `.gs`) dan `CONFIG.TOKEN` (di `index.html`) dengan nilai yang sama. |

---

## Struktur File

```
ticket-validator/
├── index.html               # Frontend — dibuka panitia di HP/browser
├── google-apps-script.gs    # Backend — paste ke Apps Script editor lalu deploy ulang
└── PANDUAN.md                # Panduan ini
```

Selamat menjalankan event! 🎟️
