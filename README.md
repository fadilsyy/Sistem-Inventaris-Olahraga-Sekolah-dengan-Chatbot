# Sistem Inventaris Olahraga Sekolah dengan Chatbot (`INV-OR`)

Aplikasi web manajemen inventaris perlengkapan olahraga sekolah berbasis arsitektur **Unified MVC Monolith** (Node.js, Express, Tailwind CSS, dan PostgreSQL via Supabase). Sistem ini dirancang untuk membantu petugas gudang olahraga mencatat aset (`Sport` & `Non-Sport`), memantau ketersediaan unit di rak serta sirkulasi peminjaman per sesi, melacak kondisi fisik per jumlah unit (`Baik`, `Cukup`, `Rusak`), merekam seluruh aktivitas secara teraudit melalui **Unified Audit Logger**, serta mengecek kondisi stok secara cepat melalui **Floating AI Chatbot Assistant (Mode Mock)**.

---

## Fitur Utama

1. **Autentikasi & Proteksi Rute (JWT)**
   - Login petugas menggunakan kredensial terenkripsi (`bcrypt`) dengan sesi JWT berdurasi `1d` yang disimpan pada `httpOnly` cookie sekaligus mendukung header `Authorization: Bearer`.
   - Proteksi otomatis pada seluruh halaman HTML (3 menu utama: `/dashboard`, `/inventaris`, `/riwayat`) maupun endpoint REST API.
2. **Dashboard Ringkasan Eksekutif (`/dashboard`)**
   - Kartu KPI *real-time*: Total Jenis Barang, Total Unit Aset, Tersedia di Rak, Sedang Dipinjam (beserta jumlah sesi aktif), dan Komposisi Kondisi Fisik Unit (`Baik`, `Cukup`, `Rusak`).
   - **Watchlist Peringatan Dini** 3 kolom untuk memantau Peminjaman Aktif, Stok Rak Menipis (`≤ 2` unit), serta Unit Rusak / Perlu Perhatian.
   - Tabel ringkasan aktivitas audit inventaris terbaru.
3. **Manajemen Data Inventaris & Modal Transaksi Terkonsolidasi (`/inventaris`)**
   - **Pelacakan Stok & Sirkulasi Akurat:** Memisahkan **Total Unit Aset (`stok_sistem`)**, **Sedang Dipinjam (`stok_dipinjam`)**, dan **Tersedia di Rak (`stok_tersedia = stok_sistem - stok_dipinjam`)**.
   - **Pelacakan Kondisi Fisik Per Unit:** Setiap barang melacak kuantitas **`Baik`**, **`Cukup`**, dan **`Rusak`** secara terpisah (`stok_baik + stok_cukup + stok_rusak = stok_sistem`).
   - **Tambah & Edit Barang:** Klasifikasi kategori (`Sport` dan `Non-Sport`) dengan panduan contoh item dinamis, serta validasi lintas atribut saat edit (`total stok ≥ stok_dipinjam`).
   - **Barang Masuk (`+ Masuk`):** Pencatatan penambahan stok ke kondisi `Baik` dengan **Sumber / Keterangan Masuk wajib diisi** serta *Optimistic Concurrency Control* dan *rollback* otomatis.
   - **Barang Keluar (`- Keluar`):** Pengurangan stok permanen langsung dari modal dengan **checkbox pemilihan kondisi** (`Rusak`, `Cukup`, `Baik`), validasi sisa stok tersedia di rak, serta *radio button* alasan template + opsi `Lainnya`.
   - **Peminjaman & Pengembalian Independen (`Pinjam / Kembali`):** Setiap peminjaman dicatat sebagai tiket sesi mandiri pada tabel `peminjaman` sehingga pengembalian per peminjam/kelas dapat diproses terpisah tanpa saling memengaruhi.
   - **Atur Kondisi Fisik Unit (`Kondisi`):** Memindahkan jumlah unit antar kondisi (`Baik`, `Cukup`, `Rusak`) secara *batch* dengan **keterangan wajib diisi** saat mengubah kondisi menjadi `Cukup` atau `Rusak` (kolom keterangan disembunyikan otomatis saat memilih `Baik`).
4. **Unified Audit Log / Riwayat Aktivitas Stok (`/riwayat`)**
   - Rekam jejak kronologis menyeluruh untuk seluruh aktivitas inventaris (`IN`, `OUT`, `PINJAM`, `KEMBALI`, `CREATE`, `UPDATE`, `STATUS`) lengkap dengan kuantitas, perubahan angka stok (`stok_sebelum → stok_sesudah`), alasan/rincian, waktu kejadian, serta nama petugas.
   - Mendukung pencarian kata kunci, filter jenis aktivitas, dan filter rentang tanggal.
5. **Floating AI Chatbot Assistant — Mode Mock**
   - Widget asisten mengambang di pojok kanan bawah pada seluruh halaman terproteksi.
   - Terhubung langsung ke data live database (*Data-Grounded Mock Engine*) untuk menjawab pertanyaan seputar stok tersedia di rak, daftar peminjam aktif, unit rusak/cukup, maupun stok menipis tanpa memerlukan API key LLM berbayar, serta menyimpan riwayat percakapan antarhalaman selama sesi browser aktif (`sessionStorage`).

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
│   └── js/             # Script frontend (api.js, auth.js, inventaris.js, riwayat.js, dashboard.js, chatbot.js)
├── routes/             # Definisi endpoint View HTML (3 menu utama) & REST API (/api/*)
├── services/           # Logika bisnis, validasi lintas atribut, agregasi dashboard, & mock chatbot engine
├── utils/              # Utilitas terpusat (AppError, asyncHandler, responseHelper)
├── views/              # Halaman antarmuka HTML (login, dashboard, inventaris, riwayat)
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
2. Buka menu **SQL Editor** di sidebar kiri, klik **New Query**, lalu jalankan skrip SQL berikut untuk membuat tabel `users`, `barang`, `peminjaman`, dan `stock_movements`:

```sql
-- 1. Tabel Pengguna (Petugas Gudang)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_pengguna VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Inventaris Barang Olahraga (Pelacakan Stok Sirkulasi & Kondisi Per Unit)
CREATE TABLE IF NOT EXISTS public.barang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_barang VARCHAR(50) UNIQUE NOT NULL,
  nama_barang VARCHAR(150) NOT NULL,
  kategori VARCHAR(20) NOT NULL DEFAULT 'Sport' CHECK (kategori IN ('Sport', 'Non-Sport')),
  deskripsi TEXT,
  satuan VARCHAR(30) NOT NULL DEFAULT 'unit',
  stok_sistem INTEGER NOT NULL DEFAULT 0 CHECK (stok_sistem >= 0),
  stok_dipinjam INTEGER NOT NULL DEFAULT 0 CHECK (stok_dipinjam >= 0),
  stok_baik INTEGER NOT NULL DEFAULT 0 CHECK (stok_baik >= 0),
  stok_cukup INTEGER NOT NULL DEFAULT 0 CHECK (stok_cukup >= 0),
  stok_rusak INTEGER NOT NULL DEFAULT 0 CHECK (stok_rusak >= 0),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_barang_stok_dipinjam_le_sistem CHECK (stok_dipinjam <= stok_sistem),
  CONSTRAINT chk_barang_kondisi_sum CHECK (stok_baik + stok_cukup + stok_rusak = stok_sistem)
);

-- 3. Tabel Sesi Peminjaman Independen (Tiket Per Peminjam / Kegiatan)
CREATE TABLE IF NOT EXISTS public.peminjaman (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_id UUID NOT NULL REFERENCES public.barang(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  peminjam VARCHAR(150) NOT NULL,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  keterangan TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DIPINJAM' CHECK (status IN ('DIPINJAM', 'DIKEMBALIKAN')),
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ
);

-- 4. Tabel Unified Audit Log (Riwayat Seluruh Aktivitas Inventaris)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_id UUID NOT NULL REFERENCES public.barang(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  tipe VARCHAR(15) NOT NULL CHECK (tipe IN ('IN', 'OUT', 'PINJAM', 'KEMBALI', 'CREATE', 'UPDATE', 'STATUS')),
  jumlah INTEGER NOT NULL CHECK (jumlah >= 0),
  stok_sebelum INTEGER NOT NULL CHECK (stok_sebelum >= 0),
  stok_sesudah INTEGER NOT NULL CHECK (stok_sesudah >= 0),
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indeks Performa Query
CREATE INDEX IF NOT EXISTS idx_peminjaman_barang_status ON public.peminjaman(barang_id, status);
CREATE INDEX IF NOT EXISTS idx_peminjaman_borrowed_at ON public.peminjaman(borrowed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_barang_id ON public.stock_movements(barang_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- 6. Aktifkan Row Level Security (akses dikelola penuh oleh backend via Secret Key)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peminjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 7. Muat Ulang Schema Cache API Supabase
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
| **3** | **Tambah & Edit Inventaris** | Buka **Data Inventaris** (`/inventaris`) → klik **+ Tambah Barang Baru** → isi kode `SPT-001`, nama `Bola Basket`, kategori `Sport`, stok `10`, satuan `unit` → simpan. | Data tersimpan otomatis ke kondisi `10 Baik`; statistik kartu atas bertambah; perubahan data via modal **Edit** memvalidasi batas minimal `stok_dipinjam`. |
| **4** | **Barang Masuk (`+ Masuk`)** | Pada baris `[SPT-001] Bola Basket`, klik **`+ Masuk`** → coba simpan tanpa keterangan, lalu isi jumlah `2` & keterangan `"Donasi alumni"` → simpan. | Submit tanpa keterangan ditolak; input valid menambah total stok menjadi `12` (`12 Baik`) dan tercatat di audit log (`IN`). |
| **5** | **Atur Kondisi Per Unit (`Kondisi`)** | Klik **`Kondisi`** pada `Bola Basket` → ubah `3` unit dari `Baik` ke `Cukup` (pastikan keterangan wajib diisi). Setelah tersimpan, ubah `1` unit dari `Cukup` ke `Baik` (pastikan kolom keterangan tersembunyi). | Komposisi unit di tabel berubah menjadi `10 Baik, 2 Cukup`; seluruh perubahan tercatat di audit log (`STATUS`). |
| **6** | **Peminjaman & Pengembalian Per Sesi** | Klik **`Pinjam / Kembali`** → catat peminjaman `2` unit oleh `Kelas X IPA 1` dan `3` unit oleh `Kelas XI IPS 2` → klik **Kembalikan** hanya pada tiket `Kelas X IPA 1`. | Stok tersedia di rak berkurang `5` unit lalu pulih `2` unit saat `Kelas X IPA 1` kembali, sementara tiket `Kelas XI IPS 2` tetap aktif (`PINJAM` & `KEMBALI` tercatat). |
| **7** | **Barang Keluar (`- Keluar`) Multi-Kondisi** | Klik **`- Keluar`** → centang checkbox kondisi `Cukup` (`1` unit), pilih radio button alasan (atau **Lainnya** dengan rincian wajib), dan coba masukkan angka melebihi stok di rak. | Input melebihi stok tersedia di rak ditolak (`400 Bad Request`); input valid mengurangi total aset dan unit kondisi `Cukup` (`OUT`). |
| **8** | **Audit Log, Dashboard, & Chatbot** | Buka **Riwayat Stok** (`/riwayat`), **Dashboard** (`/dashboard`), lalu buka **Asisten AI** di pojok kanan bawah dan tanyakan `"barang apa saja yang sedang dipinjam?"`. | Seluruh aktivitas (`CREATE`, `IN`, `STATUS`, `PINJAM`, `KEMBALI`, `OUT`) tampil di `/riwayat`; KPI & watchlist `/dashboard` sinkron; chatbot menjawab sesuai data live database. |

---

## Ringkasan Endpoint API

Seluruh endpoint di bawah `/api/*` (kecuali `/api/health` dan `/api/auth/login`) dilindungi oleh middleware autentikasi JWT.

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Pemeriksaan status server & koneksi environment database |
| `POST` | `/api/auth/login` | Autentikasi petugas dan penerbitan token JWT |
| `POST` | `/api/auth/logout` | Menghapus sesi cookie autentikasi |
| `GET` | `/api/auth/me` | Mengambil profil petugas yang sedang login |
| `GET` | `/api/barang` | Mengambil daftar barang aktif (mendukung query `search`, `kategori`, `kondisi`, `statusStok`) |
| `GET` | `/api/barang/:id` | Mengambil detail barang beserta komposisi stok dan kondisi unit |
| `POST` | `/api/barang` | Menambahkan item inventaris baru (default masuk ke kondisi `Baik`) |
| `PUT` | `/api/barang/:id` | Memperbarui data item inventaris & koreksi komposisi kondisi per unit |
| `PATCH` | `/api/barang/:id/kondisi` | Memindahkan jumlah unit antar kondisi (`Baik`, `Cukup`, `Rusak`) secara *batch* |
| `POST` | `/api/stok/masuk` | Mencatat transaksi barang masuk (`IN`) dengan keterangan wajib |
| `POST` | `/api/stok/keluar` | Mencatat transaksi barang keluar (`OUT`) berbasis checkbox multi-kondisi |
| `GET` | `/api/stok/riwayat` | Mengambil Unified Audit Log seluruh aktivitas inventaris beserta filter |
| `GET` | `/api/peminjaman` | Mengambil daftar tiket peminjaman aktif (`DIPINJAM`) |
| `POST` | `/api/peminjaman` | Mencatat sesi peminjaman baru (`PINJAM`) |
| `PATCH` | `/api/peminjaman/:id/kembali` | Memproses pengembalian unit untuk satu tiket peminjaman spesifik (`KEMBALI`) |
| `GET` | `/api/dashboard` | Mengambil agregasi KPI, watchlist peringatan dini, dan log audit terbaru |
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