# Gate Check — Event Ticket Validator

Aplikasi frontend untuk validasi tiket acara menggunakan QR code dan pencarian manual. Aplikasi ini terhubung ke Google Apps Script dan Google Sheets sebagai sumber data.

## Fitur utama
- Scan QR code tiket
- Pencarian manual via kode tiket, nama, atau nomor WhatsApp
- Validasi status tiket
- Check-in dan undo check-in
- Edit data tiket
- Riwayat check-in

## Teknologi
- HTML
- JavaScript
- Tailwind CSS CDN
- html5-qrcode
- Google Apps Script
- Google Sheets

## Struktur proyek
- `index.html` — frontend aplikasi
- `google-apps-script.gs` — backend Apps Script
- `PANDUAN.md` — panduan setup dan penggunaan
- `.gitignore` — file yang diabaikan Git

## Catatan penting
Project ini menggunakan Google Apps Script Web App dan Google Sheets sebagai database. URL Apps Script dan konfigurasi sensitif tidak boleh dipublish secara terbuka di repo publik.

Untuk deployment yang aman:
1. Simpan URL Apps Script di environment variable pada hosting atau di konfigurasi deploy Anda.
2. Jangan menaruh token rahasia atau link yang bersifat pribadi di repo publik.
3. Pastikan sheet Google Sheets hanya bisa diakses sesuai kebutuhan.

## Cara menjalankan lokal
1. Jalankan server lokal di folder project:
   ```bash
   python -m http.server 8000
   ```
2. Buka:
   ```text
   http://localhost:8000/
   ```
3. Pastikan URL Apps Script pada file frontend sudah benar dan berakhiran `/exec`.

## Lisensi
Proyek ini dibuat untuk kebutuhan internal event dan dapat dimodifikasi sesuai kebutuhan.
