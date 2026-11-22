# Sistem Inventaris Olahraga Sekolah dengan Chatbot (`INV-OR`)

Aplikasi web manajemen inventaris perlengkapan olahraga sekolah berbasis arsitektur **Unified MVC Monolith** (Node.js, Express, Tailwind CSS, dan PostgreSQL via Supabase). Sistem ini dirancang untuk membantu petugas gudang olahraga mencatat aset (`Sport` & `Non-Sport`), memantau kondisi fisik dan ketersediaan barang, merekam transaksi barang masuk/keluar secara teraudit, serta mengecek kondisi stok secara cepat melalui **Floating AI Chatbot Assistant (Mode Mock)**.

---

## Fitur Utama

1. **Autentikasi & Proteksi Rute (JWT)**
   - Login petugas menggunakan kredensial terenkripsi (`bcrypt`) dengan sesi JWT berdurasi `1d` yang disimpan pada `httpOnly` cookie sekaligus mendukung header `Authorization: Bearer`.
   - Proteksi otomatis pada seluruh halaman HTML maupun endpoint REST API.
2. **Dashboard Ringkasan Eksekutif (`/dashboard`)**
   - Kartu KPI *real-time*: Total Jenis Barang Aktif, Total Unit di Gudang, Status Dipinjam, dan Item Perlu Perhatian.
   - Grafik progres distribusi kategori (`Sport` vs `Non-Sport`) dan kondisi fisik (`Baik`, `Cukup`, `Rusak`).
   - **Watchlist Peringatan Dini** otomatis untuk barang dengan stok habis (`0`), stok menipis (`≤ 2` unit), kondisi rusak, atau sedang dipinjam.
3. **Manajemen Data Inventaris (`/inventaris`)**
   - Tambah, ubah, dan arsipkan barang (*soft archive* melalui `is_archived = true` agar riwayat transaksi tetap utuh).
   - Klasifikasi kategori statis (`Sport` dan `Non-Sport`) lengkap dengan panduan contoh item dinamis.
   - Pencarian instan, multi-filter (kategori, kondisi, ketersediaan), serta pembaruan cepat (*inline quick update*) status ketersediaan langsung dari tabel.
4. **Mutasi Stok Masuk & Keluar (`/barang-masuk` & `/barang-keluar`)**
   - Pencatatan **Barang Masuk (`IN`)** dari pengadaan, donasi, atau pengembalian.
   - Pencatatan **Barang Keluar (`OUT`)** dengan validasi ketat **anti-stok minus** dan wajib keterangan peminjam/kegiatan.
   - Dilengkapi *Optimistic Concurrency Control* dan mekanisme *rollback* otomatis apabila pencatatan riwayat gagal.
5. **Riwayat Pergerakan Stok / Audit Log (`/riwayat`)**
   - Rekam jejak kronologis setiap mutasi stok lengkap dengan angka `stok_sebelum → stok_sesudah`, keterangan, waktu kejadian, serta nama petugas yang mencatat.
   - Mendukung pencarian kata kunci, filter jenis transaksi, dan filter rentang tanggal.
6. **Floating AI Chatbot Assistant — Mode Mock**
   - Widget asisten mengambang di pojok kanan bawah pada seluruh halaman terproteksi.
   - Terhubung langsung ke data live database (*Data-Grounded Mock Engine*) tanpa memerlukan API key LLM berbayar, serta menyimpan riwayat percakapan antarhalaman selama sesi browser aktif (`sessionStorage`).

---

## Arsitektur & Struktur Folder

Aplikasi berjalan dalam satu repositori dan satu *origin* server (klien dan API berada di port yang sama):

```text
Sistem-Inventaris-Olahraga-Sekolah-dengan-Chatbot/
├── config/             # Konfigurasi koneksi klien database Supabase
├── controllers/        # Handler request & response HTTP per modul fitur
├── middlewares/        # Proteksi autentikasi JWT (Page & API) & Global Error Handler
├── models/             # Query akses data ke tabel PostgreSQL (Supabase)
├── public/
│   ├── css/            # Source input.css & hasil kompilasi Tailwind (output.css)
│   └── js/             # Script frontend (api.js, auth.js, inventaris.js, stok.js, dashboard.js, chatbot.js)
├── routes/             # Definisi endpoint View HTML & REST API (/api/*)
├── services/           # Logika bisnis, validasi, agregasi dashboard, & mock chatbot engine
├── utils/              # Utilitas terpusat (AppError, asyncHandler, responseHelper)
├── views/              # Halaman antarmuka HTML (login, dashboard, inventaris, barang-masuk, barang-keluar, riwayat)
├── .env.example        # Template variabel environment
├── app.js              # Konfigurasi middleware Express & routing utama
├── seedUser.js         # Script seeding akun petugas awal ke database
├── server.js           # Entry point server HTTP
└── tailwind.config.js  # Konfigurasi Tailwind CSS
```

---

## Prasyarat Sistem

Pastikan perangkat lokal sudah terpasang:
- **Node.js** versi `18.x` atau lebih baru (beserta `npm`)
- **Git**
- Akun dan proyek **Supabase** (untuk database PostgreSQL)

---

## Panduan Instalasi & Konfigurasi (Dari Awal)

Ikuti langkah-langkah berikut secara berurutan setelah melakukan `git clone` atau `git pull`:

### Langkah 1: Clone Repositori & Install Dependensi

```bash
git clone <url-repositori-ini>
cd Sistem-Inventaris-Olahraga-Sekolah-dengan-Chatbot
npm install
```

### Langkah 2: Siapkan Skema Database di Supabase

1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard) dan buka proyek yang digunakan.
2. Buka menu **SQL Editor** di sidebar kiri, klik **New Query**, lalu jalankan skrip SQL berikut untuk membuat tabel `users`, `barang`, dan `stock_movements`:

```sql
-- 1. Tabel Pengguna (Petugas Gudang)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_pengguna VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Inventaris Barang Olahraga
CREATE TABLE IF NOT EXISTS public.barang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_barang VARCHAR(50) UNIQUE NOT NULL,
  nama_barang VARCHAR(150) NOT NULL,
  kategori VARCHAR(20) NOT NULL DEFAULT 'Sport' CHECK (kategori IN ('Sport', 'Non-Sport')),
  deskripsi TEXT,
  satuan VARCHAR(30) NOT NULL DEFAULT 'unit',
  stok_sistem INTEGER NOT NULL DEFAULT 0 CHECK (stok_sistem >= 0),
  kondisi VARCHAR(20) NOT NULL DEFAULT 'Baik' CHECK (kondisi IN ('Baik', 'Cukup', 'Rusak')),
  ketersediaan VARCHAR(20) NOT NULL DEFAULT 'Tersedia' CHECK (ketersediaan IN ('Tersedia', 'Dipinjam')),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel Riwayat Pergerakan Stok (Audit Log)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_id UUID NOT NULL REFERENCES public.barang(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  tipe VARCHAR(15) NOT NULL CHECK (tipe IN ('IN', 'OUT', 'OPNAME')),
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  stok_sebelum INTEGER NOT NULL CHECK (stok_sebelum >= 0),
  stok_sesudah INTEGER NOT NULL CHECK (stok_sesudah >= 0),
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indeks Performa Query
CREATE INDEX IF NOT EXISTS idx_stock_movements_barang_id ON public.stock_movements(barang_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- 5. Aktifkan Row Level Security (akses dikelola penuh oleh backend via Secret Key)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 6. Muat Ulang Schema Cache API Supabase
NOTIFY pgrst, 'reload schema';
```

3. Pastikan muncul pesan **`Success. No rows returned`**.

### Langkah 3: Konfigurasi File `.env`

1. Salin file `.env.example` menjadi file baru bernama **`.env`** di root proyek:
   - **Windows (PowerShell):**
     ```powershell
     Copy-Item .env.example .env
     ```
   - **macOS / Linux / Git Bash:**
     ```bash
     cp .env.example .env
     ```
2. Ambil kredensial proyek dari **Supabase Dashboard → Project Settings → API Keys** (atau bagian **API**):
   - **`SUPABASE_URL`**: Salin *Project URL* (contoh: `https://xyzcompany.supabase.co` — **jangan** menyertakan `/rest/v1/`).
   - **`SUPABASE_SERVICE_ROLE_KEY`**: Salin **Secret key** (`sb_secret_...` atau `service_role` key). **Jangan** menggunakan *Publishable / anon key* karena tabel mengaktifkan RLS.
3. Buka file `.env` dan isi seluruh variabelnya:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=[https://ganti-dengan-project-url-anda.supabase.co](https://ganti-dengan-project-url-anda.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=ganti-dengan-secret-key-supabase-anda
JWT_SECRET=ganti_dengan_string_rahasia_minimal_32_karakter_acak
JWT_EXPIRES_IN=1d
```

> **Catatan:** Pastikan file `.env` sudah disimpan (`Ctrl + S`). File `.env` sudah terdaftar di `.gitignore` agar kredensial tidak ikut terunggah ke GitHub.

### Langkah 4: Kompilasi Tailwind CSS

Bangun file stylesheet `public/css/output.css` sebelum menjalankan aplikasi:

```bash
npm run build:css
```

### Langkah 5: Seeding Akun Petugas Awal

Jalankan script seeding untuk membuat akun petugas default di tabel `users`:

```bash
node seedUser.js
```

- Jika konfigurasi `.env` dan database benar, terminal akan menampilkan **`[SEED BERHASIL]`**.
- Kredensial login default yang dibuat:
  - **Email:** `petugas@sekolah.sch.id`
  - **Password:** `admin123`

### Langkah 6: Jalankan Server Aplikasi

- **Mode Development (auto-reload dengan Nodemon):**
  ```bash
  npm run dev
  ```
- **Mode Production:**
  ```bash
  npm start
  ```

Buka browser dan akses **`http://localhost:3000`**.

---

## Panduan Pengujian Fitur (Testing Checklist)

Gunakan alur berikut untuk memverifikasi bahwa seluruh modul aplikasi berjalan normal di perangkat lokal:

| No | Modul / Skenario | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **1** | **Health Check API** | Buka `http://localhost:3000/api/health` di browser. | JSON mengembalikan `"server": "ONLINE"` dan `"databaseConfigured": true`. |
| **2** | **Proteksi Rute & Login** | Akses `http://localhost:3000/dashboard` sebelum login, lalu masuk di `/login` dengan akun petugas. | Diarahkan ke `/login` saat belum login; berhasil masuk ke `/dashboard` setelah kredensial valid dikirim. |
| **3** | **Tambah & Kelola Inventaris** | Buka **Data Inventaris** (`/inventaris`) → klik **+ Tambah Barang Baru** → isi kode `SPT-001`, nama `Bola Basket`, kategori `Sport`, stok `5`, satuan `unit`, kondisi `Baik` → simpan. | Data tersimpan dan muncul di tabel; statistik kartu atas bertambah; perubahan status *Tersedia/Dipinjam* di tabel tersimpan otomatis. |
| **4** | **Barang Masuk (`IN`)** | Buka **Barang Masuk** (`/barang-masuk`) → pilih `[SPT-001] Bola Basket` → isi jumlah `3` & keterangan `"Donasi alumni"` → simpan. | Muncul notifikasi sukses; stok sistem bertambah dari `5` menjadi `8`; transaksi muncul di tabel kanan. |
| **5** | **Barang Keluar (`OUT`) & Anti-Stok Minus** | Buka **Barang Keluar** (`/barang-keluar`) → coba keluarkan `20` unit (melebihi stok), lalu coba keluarkan `2` unit dengan keterangan `"Praktik PJOK Kelas X"`. | Input `20` ditolak server (`400 Bad Request`); input `2` berhasil dan stok berkurang menjadi `6`. |
| **6** | **Audit Log Riwayat** | Buka **Riwayat Stok** (`/riwayat`) → uji pencarian nama barang dan filter jenis transaksi (`IN` / `OUT`). | Seluruh mutasi tampil berurutan lengkap dengan perubahan angka stok (`5 → 8`, `8 → 6`), keterangan, dan nama petugas. |
| **7** | **Dashboard Eksekutif** | Buka **Dashboard** (`/dashboard`). | Kartu KPI, bar proporsi kategori & kondisi, daftar peringatan dini, dan 6 aktivitas terbaru terisi sesuai data database. |
| **8** | **Floating AI Chatbot** | Klik tombol **Asisten AI Mock** di pojok kanan bawah → klik chip `"Ringkasan stok gudang"` atau ketik `"Cek stok Bola Basket"`. | Chatbot membalas dengan angka stok aktual dari database dan riwayat chat tetap bertahan saat berpindah halaman. |

---

## Ringkasan Endpoint API

Seluruh endpoint di bawah `/api/*` (kecuali `/api/health` dan `/api/auth/login`) dilindungi oleh middleware autentikasi JWT.

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Pemeriksaan status server & koneksi environment database |
| `POST` | `/api/auth/login` | Autentikasi petugas dan penerbitan token JWT |
| `POST` | `/api/auth/logout` | Menghapus sesi cookie autentikasi |
| `GET` | `/api/auth/me` | Mengambil profil petugas yang sedang login |
| `GET` | `/api/barang` | Mengambil daftar barang aktif (mendukung query `search`, `kategori`, `kondisi`, `ketersediaan`) |
| `POST` | `/api/barang` | Menambahkan item inventaris baru |
| `PUT` | `/api/barang/:id` | Memperbarui data lengkap item inventaris |
| `PATCH` | `/api/barang/:id/status` | Pembaruan cepat status kondisi atau ketersediaan barang |
| `DELETE` | `/api/barang/:id` | Mengarsipkan barang (*soft archive*) |
| `POST` | `/api/stok/masuk` | Mencatat transaksi barang masuk (`IN`) |
| `POST` | `/api/stok/keluar` | Mencatat transaksi barang keluar (`OUT`) dengan validasi stok |
| `GET` | `/api/stok/riwayat` | Mengambil log audit pergerakan stok beserta filter |
| `GET` | `/api/dashboard/summary` | Mengambil agregasi KPI, kategori, kondisi, dan watchlist dashboard |
| `POST` | `/api/chatbot/message` | Mengirim pertanyaan ke Asisten Inventaris (Mode Mock) |

---

## Troubleshooting Umum

- **`[SEED GAGAL] Koneksi database Supabase belum dikonfigurasi`**
  Pastikan nama file adalah `.env` (bukan `.env.example` atau `.env.txt`), seluruh nilai sudah diisi tanpa tanda kutip berlebih, dan file sudah disimpan. Jika server sudah berjalan sebelum `.env` diubah, ketik `rs` pada terminal `npm run dev` untuk memuat ulang environment.
- **Error `Invalid API key` saat login atau seeding**
  Pastikan `SUPABASE_SERVICE_ROLE_KEY` diisi menggunakan **Secret key** (`sb_secret_...`), bukan *Publishable key*, serta `SUPABASE_URL` tidak mengandung akhiran `/rest/v1/`.
- **Error `Could not find the '...' column of '...' in the schema cache`**
  Jalankan perintah `NOTIFY pgrst, 'reload schema';` pada **SQL Editor** di Supabase Dashboard agar API Supabase menyegarkan struktur tabel terbaru.
- **Tampilan halaman tidak memiliki styling / berantakan**
  Jalankan ulang `npm run build:css` untuk menghasilkan file `public/css/output.css`, lalu lakukan *hard refresh* (`Ctrl + Shift + R`) di browser.