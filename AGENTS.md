# MBG Frontend (React)

## Stack
React 19 + Vite + TypeScript + React Router. Tanpa jQuery.

## Tema
Template **deskapp** (Bootstrap 4) di `public/deskapp/`. Tema terang, sidebar gelap `#142127`, header putih, ikon `dw-`/`bi-`. Override ada di `src/index.css`.

## Struktur
- `src/layout/` — Layout, Sidebar, Navbar, `menu.ts`.
- `src/pages/` — Login, Authentication, Home, MySlip.
- `src/auth.tsx` — AuthProvider (token + user).
- `src/api.ts` — fetch helper + endpoint API.

## Proxy
Vite proxy `/api` → `http://localhost:3000` (lihat `vite.config.ts`).

## Perintah
- dev: `npm.cmd run dev` (port 5173)
- build: `npm.cmd run build`

## Aturan
- Komentar Bahasa Indonesia.
- UI ikuti template deskapp.
