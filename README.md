# QA Screen Snap & Rectangle Editor (Chrome Extension)

Ekstensi Chrome lokal untuk QA tester: screenshot tampilan layar (viewport tab saat ini) dengan 1 klik, beri anotasi kotak (rectangle), lalu copy ke clipboard dan tab editor otomatis tertutup.

---

## Fitur Utama
- **One-Click Viewport Capture**: Menangkap tampilan layar tab aktif sesuai lebar resolusi layar Anda.
- **Top URL Bar**: Otomatis menyematkan banner URL halaman dan timestamp di bagian atas screenshot (tanpa menutupi konten asli website). Dilengkapi toggle di toolbar jika ingin mematikan/menyalakan.
- **Rectangle Annotation**: Menggambar outline kotak untuk menandai bug / UI defect.
- **QA Color Palette**: Pilihan warna cepat (Merah Crimson bug default, Oranye, Kuning, Hijau, Cyan, Biru, Putih) + Custom Color Picker.
- **Stroke Width**: 4 pilihan ketebalan garis (2px, 4px, 7px, 11px).
- **Undo / Redo / Clear**: Mendukung `Ctrl+Z` (Undo), `Ctrl+Y` (Redo), dan tombol Clear.
- **Copy to Clipboard & Auto-Close**: Tekan tombol **Copy to Clipboard** atau shortcut `Ctrl+C` / `Enter`. Gambar langsung disalin ke clipboard sistem dalam format PNG dan tab editor otomatis tertutup setelah konfirmasi tersalin.

---

## Cara Pasang di Google Chrome (Load Unpacked)

1. Buka Google Chrome.
2. Buka tab baru dan ketik di address bar:
   ```text
   chrome://extensions
   ```
3. Di pojok kanan atas, **aktifkan toggle "Developer mode"**.
4. Klik tombol **"Load unpacked"** di pojok kiri atas.
5. Pilih folder proyek ini:
   ```text
   d:\Work\Project\my-screenshot-app
   ```
6. Ekstensi **"QA Screen Snap & Rectangle Editor"** akan langsung muncul dan siap digunakan!
7. *(Saran)*: Klik ikon puzzle (Extensions) di toolbar Chrome, lalu klik pin 📌 pada ekstensi agar selalu terlihat di toolbar.

---

## Cara Menggunakan

1. Buka website / aplikasi web yang ingin Anda test.
2. Klik ikon ekstensi di toolbar Chrome **atau** tekan shortcut:
   ```text
   Alt + Shift + S
   ```
3. Ekstensi akan otomatis mengambil screenshot layar saat ini dan membuka tab editor baru.
4. Drag mouse di atas gambar untuk menggambar kotak rectangle penanda bug.
5. Tekan tombol **"Copy to Clipboard"** (atau tekan `Ctrl + C` / `Enter`).
6. Muncul notifikasi "Copied!", dan tab editor akan tertutup secara otomatis.
7. Anda tinggal melakukan `Ctrl + V` (Paste) ke Jira, Slack, Trello, Google Docs, Notion, atau chat lainnya!
