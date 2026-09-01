# MBG Frontend

Frontend aplikasi **Mitra Barito Group**, dibangun dengan React + Vite dan memakai template admin **deskapp** (Bootstrap 4, tema terang).

## Tech Stack

- **React 19** + TypeScript
- **Vite** + React Router
- **pdfjs-dist** (render slip PDF → gambar, kompatibel Android)
- Template **deskapp** (Bootstrap 4)

## Fitur

| Fitur | Keterangan |
|---|---|
| **Login 2 langkah** | NRP → cek → NIK/PIN (6 kotak) → verifikasi WhatsApp |
| **Layout** | Sidebar gelap + header putih + footer (template deskapp) |
| **My Slip** | Pilih tahun/bulan → render PDF jadi gambar → zoom → unduh (rename) |

## Struktur Folder

```
mbg-frontend/
├── public/deskapp/       # Aset template deskapp (CSS, fonts, images, logo MBG)
├── src/
│   ├── layout/           # Layout, Sidebar, Navbar, menu.ts
│   ├── pages/            # Login, Authentication, Home, MySlip
│   ├── auth.tsx          # AuthProvider (token + user)
│   ├── api.ts            # fetch helper + endpoint API
│   ├── index.css         # Override tema (terang)
│   └── main.tsx
└── vite.config.ts        # Proxy /api -> :3000
```

## Cara Menjalankan

```bash
npm install
npm run dev              # http://localhost:5173
```

> Proxy `/api` sudah diarahkan ke backend `http://localhost:3000` (lihat `vite.config.ts`).

## Build

```bash
npm run build
```

## Catatan

- Tema mengikuti template **deskapp**: sidebar gelap `#142127`, header putih, ikon `dw-`/`bi-`.
- Logo MBG: `public/deskapp/images/logo-mbg.png`.
- Login test: NRP `MBLE-0422003`, PIN `222222` (dev).
