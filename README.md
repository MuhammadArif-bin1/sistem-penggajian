# Payroll Management System (Sistem Penggajian Karyawan)

Sistem Penggajian Karyawan (Payroll Management System) adalah aplikasi fullstack berbasis **Next.js 16 (App Router)** dan **TypeScript** yang dibangun sebagai **Project Uji Kompetensi (SERKOM) Program Analis**. 

Aplikasi ini menggunakan konsep **Clean Architecture** dengan memisahkan logic menjadi:
- **Route Handlers** (API Layer)
- **Service Layer** (Business Logic)
- **Repository Pattern** (Data Access)
- **Zod & React Hook Form** (Validation)
- **Prisma ORM** & **Supabase PostgreSQL** (Database Layer)

---

## 🚀 Fitur Utama

### 🔐 Autentikasi & Otorisasi
- Login/Logout dengan **JWT (JSON Web Token)** disimpan di HTTP-only cookie.
- **Password Hashing** menggunakan **BcryptJS**.
- **Middleware Protected Routes** membatasi hak akses role Admin & Karyawan.

### 👑 Portal Admin (Akses Penuh)
- **Dashboard Interaktif**:
  - Ringkasan statistik (Total Karyawan, Pengeluaran Bulan Ini, Jabatan, Slip Gaji).
  - Grafik pengeluaran gaji bulanan menggunakan **Recharts**.
  - Audit Log (Aktivitas Terbaru) operasional sistem.
  - Aksi cepat (Tambah Karyawan, Tambah Jabatan, Generate Payroll).
- **Manajemen Karyawan (CRUD)**:
  - Form teruji dengan pencarian, filtering (Jabatan/Status), sorting, dan pagination.
  - Opsi pembuatan akun portal karyawan langsung dari form.
- **Manajemen Jabatan (CRUD)**:
  - Konfigurasi Gaji Pokok & Tunjangan per Jabatan.
- **Manajemen Payroll & Slip Gaji**:
  - Generate payroll otomatis per periode bulanan.
  - Input Bonus & Potongan oleh Admin, total gaji dihitung secara otomatis.
  - Cetak slip gaji dengan **QR Code unik**.
- **Laporan Bulanan**:
  - Filter laporan berdasarkan Bulan/Tahun dan Karyawan.
  - Cetak Laporan ke PDF & Ekspor ke Excel (.csv terformat).

### 👤 Portal Karyawan (Akses Terbatas)
- **Dashboard Karyawan**:
  - Pesan selamat datang & profil jabatan.
  - Rincian slip gaji terakhir & riwayat payroll bulanan.
- **Unduh/Cetak Slip**:
  - Melihat rincian pendapatan & potongan secara transparan dan mencetak slip gaji mandiri.
- **Pengaturan Profil**:
  - Mengubah Email, Kata Sandi, dan Foto Profil pribadi.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Framer Motion.
- **Backend (API)**: Next.js API Routes (Single Repository).
- **Database & ORM**: Neon PostgreSQL, Prisma ORM.
- **State Management & Form**: TanStack React Query, React Hook Form, Zod.

---

## 📂 Struktur Folder (Clean Architecture)

```
sistem-penggajian/
├── prisma/
│   ├── schema.prisma   # Skema Relasi Database
│   └── seed.ts         # Data Dummy (20 Karyawan, 5 Jabatan, 40+ Slip Gaji)
├── src/
│   ├── app/
│   │   ├── (auth)/     # Portal Login
│   │   ├── (dashboard)/# Antarmuka Dashboard (Admin & Karyawan)
│   │   ├── api/        # Endpoint API Route Handler
│   │   ├── globals.css # Tailwind & Print Styles
│   │   ├── layout.tsx  # Root Layout
│   │   ├── loading.tsx # Loading Spinner Global
│   │   └── not-found.tsx# Halaman 404
│   ├── components/     # UI Reusable & Dashboard Modules
│   ├── hooks/          # React Hooks
│   ├── lib/            # Helper Instansi (Prisma, JWT, Excel/CSV, Auth)
│   ├── repositories/   # Lapisan Akses Database (Repository Pattern)
│   ├── schemas/        # Zod Validasi Skema
│   ├── services/       # Lapisan Bisnis Logic (Service Layer)
│   └── middleware.ts   # Route Protection & JWT Authorization Guard
├── .env                # Konfigurasi Variabel Lingkungan
└── package.json
```

---

## ⚙️ Instalasi & Konfigurasi

### 1. Clone & Install Dependensi
Buka terminal di direktori proyek dan jalankan:
```bash
npm install
```

### 2. Konfigurasi Database Supabase PostgreSQL
1. Buat akun gratis di [Supabase.com](https://supabase.com) jika belum memiliki.
2. Buat project baru dan catat password database.
3. Salin **Connection String** (Transaction Pooler & Direct Connection):
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```
4. Buat file `.env` di root folder proyek dan masukkan connection string tersebut.

### 3. Sinkronisasi Database (Prisma Migration)
Jalankan migrasi untuk membuat tabel-tabel di database Neon:
```bash
npx prisma migrate dev --name init
```

### 4. Menjalankan Seeder (Data Dummy)
Jalankan perintah berikut untuk mengisi database dengan akun admin, 5 jabatan, 20 karyawan (data Indonesia), serta riwayat payroll:
```bash
npx prisma db seed
```

---

## 🏃 Menjalankan Aplikasi

Jalankan server lokal dalam mode development:
```bash
npm run dev
```
Buka browser dan buka alamat [http://localhost:3000](http://localhost:3000).

---

## 🔑 Informasi Login Pengujian

### 1. Akun Administrator (Akses Penuh)
- **Email**: `admin@payroll.com`
- **Password**: `admin123`

### 2. Akun Karyawan (Akses Terbatas)
- **Email**: `karyawan@payroll.com`
- **Password**: `karyawan123`
*(Atau gunakan email salah satu dari 20 karyawan dummy hasil seeder dengan password default `password123`)*

---

## 📦 Build Production & Deploy Vercel

### Build Lokal
Untuk memverifikasi kesiapan production build:
```bash
npm run build
npm start
```

### Deploy ke Vercel
1. Hubungkan repository GitHub Anda ke [Vercel](https://vercel.com).
2. Tambahkan **Environment Variables** di Vercel Settings:
   - `DATABASE_URL` (Koneksi Neon Anda)
   - `JWT_SECRET` (Secret key Anda)
3. Klik **Deploy**. Vercel akan otomatis mendeteksi konfigurasi Next.js dan mem-build aplikasi dengan aman.
