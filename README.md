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
- `config.js` — runtime config URL Apps Script
- `google-apps-script.gs` — backend Apps Script
- `.gitignore` — file yang diabaikan Git

## Keamanan dan deploy
URL Apps Script tidak boleh ditaruh di repo GitHub publik. Gunakan variabel environment di Vercel atau hosting Anda.

### Set di Vercel
1. Buka dashboard Vercel project Anda.
2. Masuk ke Settings > Environment Variables.
3. Tambahkan variabel:
   - Name: `APPS_SCRIPT_URL`
   - Value: your Google Apps Script Web App URL ending with `/exec`
4. Deploy ulang project.

### Cara kerja pada repo publik
Project ini sudah diatur agar URL tidak hardcoded di file publik. File `config.js` di-generate otomatis dari variable environment saat build.

## Cara menjalankan lokal
1. Jalankan server lokal di folder project:
   ```bash
   python -m http.server 8000
   ```
2. Buka:
   ```text
   http://localhost:8000/
   ```
3. Pastikan `APPS_SCRIPT_URL` valid dan berakhiran `/exec`.

## Lisensi
Proyek ini dibuat untuk kebutuhan internal event dan dapat dimodifikasi sesuai kebutuhan.
