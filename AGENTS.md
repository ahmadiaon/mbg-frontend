# MBG-FRONTEND — AGENT & DEVELOPER CONTEXT

## 📌 Deskripsi Project
Frontend Single Page Application (SPA) untuk ERP MBG v2.0 dibangun menggunakan React 19, TypeScript, Vite, dan template DeskApp Admin.

## ⚙️ Environment & Proxy
- **Port**: `5173`
- **Proxy Vite (`vite.config.ts`)**:
  - `/api` $\rightarrow$ `http://localhost:3000`
  - `/assets` $\rightarrow$ `http://localhost:3000`
- **Build**: `npm run build` (menghasilkan file statis di `dist/`)

## 🧱 Halaman & Fitur Utama
1. **`src/pages/StrukturOrganisasi.tsx`**:
   - Tab 1: **Kanban Board Grade (G01–G19)**: Visualisasi jabatan terkelompok per grade, drag-and-drop / tabel interaktif.
   - Tab 2: **Bagan Pohon Organisasi**: Visualisasi hierarki pelaporan dari Direksi puncak hingga pelaksana lapangan.
   - Hak Akses: Tombol edit grade hanya muncul untuk `isSuperAdmin` (Grade $\ge$ 13).
2. **`src/pages/OtorisasiAdmin.tsx`**: Manajemen Role, Feature Access Matrix, dan penugasan override pengguna.
3. **`src/pages/DatabaseEav.tsx`**: Visualisasi data EAV dinamis.

## 🛠️ Script Penting
- `npm run dev`: Menjalankan Vite dev server di port 5173.
- `npm run build`: Type-checking (`tsc -b`) dan build produksi Vite.
