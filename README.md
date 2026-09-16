# DuitTrack

DuitTrack adalah aplikasi pencatatan dan pemantauan keuangan pribadi berbasis web. Pengguna dapat mencatat pemasukan dan pengeluaran melalui dashboard web maupun Telegram, mengatur budget, melihat proyeksi cashflow, serta mendapatkan ringkasan keuangan berbasis AI.

## Fitur

- Autentikasi pengguna: daftar, login, lupa password, dan reset password.
- Dashboard bulanan dengan saldo, pemasukan, pengeluaran, rata-rata pengeluaran harian, tren, transaksi terbaru, dan streak pencatatan.
- Pencatatan transaksi pemasukan dan pengeluaran dari web.
- Integrasi Telegram untuk mencatat transaksi menggunakan bahasa natural, misalnya `beli kopi 20rb`.
- Pemilihan kategori interaktif jika kategori transaksi dari Telegram belum terdeteksi.
- Kategori sistem dan kategori pribadi untuk pemasukan maupun pengeluaran.
- Tag transaksi yang dapat dibuat dan dikelola oleh pengguna.
- Budget keseluruhan dan budget per kategori untuk setiap bulan.
- Peringatan ketika penggunaan budget mendekati atau melewati batas.
- Halaman cashflow dengan rata-rata pengeluaran, proyeksi akhir bulan, dan perbandingan terhadap budget.
- Ringkasan naratif bulanan menggunakan Google Gemini.
- Notifikasi di aplikasi dan pengaturan reminder Telegram.
- Reminder harian Telegram dan ringkasan bulanan otomatis.
- Pencarian serta filter transaksi berdasarkan catatan, kategori, tag, tipe, bulan, dan rentang tanggal.
- Ekspor transaksi ke CSV, Excel (`.xlsx`), dan PDF.
- Profil pengguna, username, avatar, perubahan password, dan mode tema terang/gelap.
- Row Level Security (RLS) Supabase untuk membatasi data berdasarkan pemilik akun.

## Teknologi

- [Next.js](https://nextjs.org/) 16 dengan App Router
- React 19 dan TypeScript
- Tailwind CSS 4
- Supabase Auth, PostgreSQL, Storage, dan Row Level Security
- Telegram Bot API
- Google Gemini API
- Recharts untuk visualisasi data
- ExcelJS untuk ekspor Excel
- PDFKit untuk ekspor PDF
- Lucide React untuk ikon
- Scheduled job untuk reminder dan ringkasan otomatis

## Struktur proyek

```text
src/
├── app/
│   ├── (auth)/                 # Halaman login, register, dan reset password
│   ├── (dashboard)/            # Dashboard, transaksi, budget, cashflow, profil, settings
│   └── api/                    # Route handler API Next.js
├── components/                 # Komponen UI yang dapat digunakan ulang
├── context/                    # Context profil, tema, dan toast
├── lib/
│   ├── ai/                     # Pembuatan ringkasan keuangan dengan Gemini
│   ├── budget/                 # Pemeriksaan dan alert budget
│   ├── notifications/          # Pembuatan notifikasi aplikasi
│   ├── parser/                 # Parser transaksi dari pesan Telegram
│   ├── supabase/               # Client browser, server, service role, dan actions
│   └── telegram/               # Utilitas Telegram dan pending category selection
└── proxy.ts                    # Middleware/proxy autentikasi dan Supabase session

supabase/
└── migrations/                 # Migration database berurutan
```

## Prasyarat

- Node.js 20.9 atau lebih baru
- npm
- Project Supabase
- Supabase CLI jika migration dijalankan dari command line
- Akun/bot Telegram jika ingin menggunakan integrasi Telegram
- Google AI Studio API key jika ingin mengaktifkan ringkasan AI

## Instalasi lokal

1. Clone repository dan masuk ke direktori project.

   ```bash
   git clone <URL_REPOSITORY>
   cd duittrack
   ```

2. Install dependency.

   ```bash
   npm install
   ```

3. Buat file environment lokal.

   ```bash
   cp .env.example .env.local
   ```

   Pada Windows PowerShell, gunakan:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Isi nilai environment variable sesuai konfigurasi pada bagian berikutnya.

5. Jalankan migration Supabase.

   Untuk project remote yang sudah terhubung:

   ```bash
   supabase db push
   ```

   Untuk development lokal dengan Supabase CLI, inisialisasi konfigurasi terlebih dahulu jika folder ini belum memiliki `supabase/config.toml`:

   ```bash
   supabase init
   supabase start
   supabase db reset
   ```

6. Jalankan server development.

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Environment variables

Salin `.env.example` menjadi `.env.local`. Jangan commit `.env.local` atau secret ke repository.

| Variable                            | Wajib                  | Keterangan                                                                         |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Ya                     | URL project Supabase.                                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Ya                     | Public anon key Supabase untuk client dan session pengguna.                        |
| `SUPABASE_SERVICE_ROLE_KEY`         | Ya untuk Telegram/cron | Service role key untuk proses server tepercaya. Jangan pernah diekspos ke browser. |
| `TELEGRAM_BOT_TOKEN`                | Jika memakai Telegram  | Token bot dari BotFather.                                                          |
| `TELEGRAM_WEBHOOK_SECRET`           | Jika memakai Telegram  | Secret yang diverifikasi dari header webhook Telegram.                             |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Jika memakai Telegram  | Username bot tanpa tanda `@`, digunakan untuk deep link di Settings.               |
| `GEMINI_API_KEY`                    | Jika memakai AI        | API key Google Gemini.                                                             |
| `GEMINI_MODEL`                      | Opsional               | Nama model Gemini yang digunakan untuk ringkasan.                                  |
| `CRON_SECRET`                       | Untuk cron             | Secret yang digunakan untuk mengamankan endpoint cron.                             |

Contoh minimal:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
CRON_SECRET=your-cron-secret
```

## Database Supabase

Migration berada di `supabase/migrations` dan harus dijalankan secara berurutan. Migration tersebut membuat dan mengembangkan tabel berikut:

- `profiles`: profil, username, avatar, preferensi notifikasi, dan koneksi Telegram.
- `categories`: kategori sistem dan kategori milik pengguna.
- `tags`: tag milik pengguna.
- `transactions`: transaksi pemasukan/pengeluaran dari web atau Telegram.
- `transaction_tags`: relasi many-to-many transaksi dan tag.
- `budgets`: budget bulanan keseluruhan atau per kategori.
- `telegram_links`: kode sementara untuk menghubungkan akun Telegram.
- `ai_summaries`: cache ringkasan AI per pengguna dan bulan.
- `notifications`: notifikasi dalam aplikasi.
- `telegram_pending_picks`: state pemilihan kategori yang tertunda dari Telegram.
- `user_keyword_mappings`: mapping kata kunci pribadi ke kategori.

RLS diaktifkan pada tabel data pengguna. Endpoint yang membutuhkan akses lintas pengguna atau proses terjadwal menggunakan `SUPABASE_SERVICE_ROLE_KEY` di server.

## Integrasi Telegram

### Mengatur webhook

Setelah aplikasi berjalan pada URL HTTPS, daftarkan webhook menggunakan Telegram Bot API:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<DOMAIN>/api/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Endpoint webhook memverifikasi header `X-Telegram-Bot-Api-Secret-Token`. Karena itu, nilai `secret_token` harus sama dengan `TELEGRAM_WEBHOOK_SECRET`.

### Menghubungkan akun pengguna

1. Login ke DuitTrack.
2. Buka **Settings** dan generate kode koneksi Telegram.
3. Buka bot Telegram yang sudah dikonfigurasi.
4. Kirim `/start <kode>` atau gunakan deep link yang tersedia di halaman Settings.

### Perintah Telegram

| Perintah        | Fungsi                                                            |
| --------------- | ----------------------------------------------------------------- |
| `/start <kode>` | Menghubungkan akun Telegram dengan akun DuitTrack.                |
| `/budget`       | Menampilkan status budget bulan berjalan.                         |
| `/ringkasan`    | Mengirim ringkasan keuangan bulan berjalan menggunakan AI.        |
| `/batal`        | Membatalkan transaksi Telegram terakhir.                          |
| Pesan bebas     | Mencatat transaksi, contohnya `gaji 8jt` atau `makan siang 35rb`. |

Jika parser tidak menemukan kategori, bot akan meminta pengguna memilih kategori atau membuat kategori baru. Kata yang telah dipetakan pengguna akan disimpan untuk membantu deteksi berikutnya.

## Scheduled job

Project ini menyediakan dua endpoint job terjadwal:

| Endpoint                    | Jadwal UTC   | Fungsi                                                                    |
| --------------------------- | ------------ | ------------------------------------------------------------------------- |
| `/api/cron/monthly-summary` | `0 1 1 * *`  | Mengirim ringkasan bulan sebelumnya pada tanggal 1 setiap bulan.          |
| `/api/cron/daily-reminder`  | `0 13 * * *` | Mengirim reminder kepada pengguna yang belum mencatat transaksi hari itu. |

Kedua endpoint hanya menerima request dengan header berikut:

```http
Authorization: Bearer <CRON_SECRET>
```

Sediakan `CRON_SECRET` pada environment server yang menjalankan job. Untuk menguji secara lokal:

```bash
curl http://localhost:3000/api/cron/daily-reminder \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Halaman aplikasi

| Path                   | Keterangan                                                 |
| ---------------------- | ---------------------------------------------------------- |
| `/login`               | Login pengguna.                                            |
| `/register`            | Registrasi akun baru.                                      |
| `/forgot-password`     | Memulai proses reset password.                             |
| `/reset-password`      | Menetapkan password baru.                                  |
| `/`                    | Dashboard ringkasan keuangan.                              |
| `/transactions`        | Daftar, filter, tambah, edit, hapus, dan ekspor transaksi. |
| `/budgets`             | Pengelolaan budget bulanan.                                |
| `/cashflow`            | Proyeksi cashflow dan perbandingan budget.                 |
| `/profile`             | Profil, username, avatar, dan password.                    |
| `/settings`            | Preferensi aplikasi, Telegram, dan notifikasi.             |
| `/settings/categories` | Pengelolaan kategori.                                      |
| `/settings/tags`       | Pengelolaan tag.                                           |

## API utama

Semua endpoint data pengguna memerlukan session Supabase yang valid.

| Endpoint                   | Kegunaan                                                                |
| -------------------------- | ----------------------------------------------------------------------- |
| `/api/dashboard`           | Data agregasi dashboard berdasarkan bulan.                              |
| `/api/transactions`        | CRUD transaksi.                                                         |
| `/api/transactions/stats`  | Statistik transaksi dan filter.                                         |
| `/api/budgets`             | CRUD budget bulanan.                                                    |
| `/api/categories`          | CRUD kategori.                                                          |
| `/api/tags`                | CRUD tag.                                                               |
| `/api/cashflow`            | Perhitungan cashflow dan proyeksi.                                      |
| `/api/summary/trend`       | Tren pemasukan/pengeluaran beberapa bulan.                              |
| `/api/search`              | Pencarian data.                                                         |
| `/api/export`              | Ekspor transaksi dengan `format=csv`, `format=xlsx`, atau `format=pdf`. |
| `/api/profile`             | Membaca dan memperbarui profil.                                         |
| `/api/notifications`       | Membaca notifikasi.                                                     |
| `/api/streak`              | Status streak pencatatan.                                               |
| `/api/telegram/link`       | Membuat dan memeriksa kode koneksi Telegram.                            |
| `/api/telegram/disconnect` | Memutus koneksi Telegram.                                               |
| `/api/telegram-webhook`    | Menerima update dari Telegram.                                          |

Contoh ekspor berdasarkan rentang tanggal:

```text
/api/export?format=xlsx&from=2026-01-01&to=2026-01-31
```

## Script yang tersedia

```bash
npm run dev       # Menjalankan development server
npm run lint      # Menjalankan ESLint
npm run build     # Membuat production build
npm run start     # Menjalankan production build
```

Sebelum membuat pull request, jalankan minimal:

```bash
npm run lint
npm run build
```

## Catatan keamanan

- Jangan menaruh `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, atau `CRON_SECRET` pada kode client.
- Jangan meng-commit `.env.local`.
- Gunakan HTTPS untuk webhook Telegram dan lingkungan production.
- Jangan menghapus atau melewati RLS tanpa meninjau kembali isolasi data antar pengguna.
- Ganti secret yang pernah bocor dan perbarui webhook Telegram bila secret webhook berubah.
