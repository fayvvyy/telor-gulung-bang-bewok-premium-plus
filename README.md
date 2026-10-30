# Telor Gulung Bang Bewok

Platform website pelanggan dan fondasi API untuk toko TELOR GULUNG BANG BEWOK.

## Teknologi

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Lucide React, Recharts, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, PostgreSQL (`pg`), Prisma schema
- Autentikasi: bcrypt, JWT, cookie HTTP-only

## Menjalankan

1. Masukkan konfigurasi backend:
   - Salin `server/.env.example` menjadi `server/.env`.
   - Isi `DATABASE_URL` dan `JWT_SECRET` untuk PostgreSQL produksi.
2. Jalankan frontend:
   - `cd client`
   - `npm run dev`
3. Jalankan backend:
   - `cd server`
   - `npm run dev`

Frontend tersedia di `http://localhost:5173`; API di `http://localhost:4000`.

## Status implementasi

- Sudah tersedia UI pelanggan responsif, katalog, kategori, pencarian, keranjang lokal, dan checkout API.
- Backend menyediakan health check, produk, registrasi pelanggan, setup/login admin, checkout ter-server, status pesanan, dashboard ringkas, dan Socket.IO.
- PostgreSQL aktif otomatis saat `DATABASE_URL` tersedia. Tanpa database, API tetap berjalan dengan katalog dan pesanan in-memory untuk pengembangan.

QRIS, logo produksi, alamat, dan Cloudinary belum diberikan; gunakan placeholder melalui pengaturan sebelum produksi.
