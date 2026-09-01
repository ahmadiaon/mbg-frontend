export interface MenuItem {
  label: string;
  icon?: string; // class ikon (bi-* / dw-*)
  path?: string; // untuk item tanpa submenu
  children?: { label: string; path: string }[]; // untuk item dengan submenu
  minRole?: number; // tampil jika role >= minRole
  cap?: boolean; // render sebagai header section (sidebar-small-cap)
}

export const MENU: MenuItem[] = [
  { label: 'Dashboard', icon: 'bi bi-house', path: '/' },

  { label: 'Manage', cap: true, minRole: 2 },
  {
    label: 'Absensi',
    icon: 'bi bi-calendar-check',
    minRole: 2,
    children: [
      { label: 'Absensi', path: '/manage/absensi' },
      { label: 'Izin', path: '/manage/izin' },
      { label: 'Cuti', path: '/manage/cuti' },
      { label: 'Shift', path: '/manage/shift' },
    ],
  },

  { label: 'Payroll', cap: true, minRole: 2 },
  { label: 'Slip Gaji', icon: 'bi bi-journal-bookmark', minRole: 2, path: '/payroll/slip' },

  { label: 'Fitur', cap: true },
  { label: 'Struktur Organisasi', icon: 'bi bi-diagram-3', path: '/struktur-organisasi' },
  { label: 'Water Level', icon: 'bi bi-droplet', path: '/feature/water-level' },
  { label: 'MBG-Link', icon: 'bi bi-link-45deg', path: '/mbg-link' },
  { label: 'Recruitment', icon: 'bi bi-box-seam', minRole: 2, path: '/manage/recruitment' },
  { label: 'File Manager', icon: 'bi bi-folder', minRole: 2, path: '/feature/file-manager' },

  { label: 'Hauling', cap: true, minRole: 5 },
  {
    label: 'Absensi Hauling',
    icon: 'bi bi-truck',
    minRole: 5,
    children: [
      { label: 'Rute', path: '/hauling/time-cek' },
      { label: 'Izin', path: '/manage/izin' },
      { label: 'Cuti', path: '/manage/cuti' },
    ],
  },

  { label: 'Super User', cap: true, minRole: 5 },
  {
    label: 'Database',
    icon: 'bi bi-database',
    minRole: 5,
    children: [
      { label: 'Form', path: '/database/form' },
      { label: 'Data', path: '/database/data' },
      { label: 'User', path: '/database/user' },
      { label: 'Menu', path: '/database/menu' },
    ],
  },

  { label: 'Logistik', cap: true, minRole: 5 },
  {
    label: 'Permintaan',
    icon: 'bi bi-box-seam',
    minRole: 5,
    children: [
      { label: 'Permintaan', path: '/logistik/permintaan/permintaan' },
      { label: 'Pengadaan', path: '/logistik/permintaan/pengadaan' },
    ],
  },
  { label: 'Stok', icon: 'bi bi-cash-stack', minRole: 5, path: '/logistik/stok' },

  { label: 'Profil Saya', cap: true },
  {
    label: 'Kehadiran',
    icon: 'bi bi-calendar2-range',
    children: [
      { label: 'Absensi', path: '/me/kehadiran/absensi' },
      { label: 'Cuti', path: '/me/kehadiran/cuti' },
      { label: 'Izin', path: '/me/kehadiran/izin' },
    ],
  },
  { label: 'Profil', icon: 'bi bi-person-lines-fill', path: '/profile' },
  { label: 'Slip', icon: 'bi bi-cash-stack', path: '/my-slip' },
  { label: 'User', icon: 'bi bi-person-lines-fill', path: '/user' },
];
