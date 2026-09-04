export interface MenuItem {
  label: string;
  icon?: string; // class ikon (bi-* / dw-*)
  path?: string; // untuk item tanpa submenu
  children?: { label: string; path: string; implemented?: boolean }[]; // untuk item dengan submenu
  implemented?: boolean;
  minRole?: number; // tampil jika role >= minRole
  featureCode?: string; // tampil jika backend memberi akses read
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

  { label: 'Payroll', cap: true, featureCode: 'PAYROLL' },
  { label: 'Slip Gaji', icon: 'bi bi-journal-bookmark', featureCode: 'PAYROLL', path: '/payroll/slip' },

  { label: 'Fitur', cap: true },
  { label: 'Struktur Organisasi', icon: 'bi bi-diagram-3', path: '/struktur-organisasi', implemented: false },
  { label: 'Water Level', icon: 'bi bi-droplet', featureCode: 'WATER-LEVEL', path: '/feature/water-level', implemented: false },
  { label: 'MBG-Link', icon: 'bi bi-link-45deg', path: '/mbg-link' },
  { label: 'Recruitment', icon: 'bi bi-box-seam', featureCode: 'RECRUITMENT', path: '/manage/recruitment', implemented: false },
  { label: 'File Manager', icon: 'bi bi-folder', featureCode: 'FILE-MANAGER', path: '/feature/file-manager', implemented: false },

  { label: 'Hauling', cap: true, minRole: 5 },
  {
    label: 'Absensi Hauling',
    icon: 'bi bi-truck',
    featureCode: 'DATABASE',
    children: [
      { label: 'Rute', path: '/hauling/time-cek', implemented: false },
      { label: 'Izin', path: '/manage/izin', implemented: false },
      { label: 'Cuti', path: '/manage/cuti', implemented: false },
    ],
  },

  { label: 'Super User', cap: true, minRole: 5 },
  {
    label: 'Database',
    icon: 'bi bi-database',
    minRole: 5,
    children: [
      { label: 'Form', path: '/database/form', implemented: true },
      { label: 'Data', path: '/database/data', implemented: true },
      { label: 'User', path: '/database/user', implemented: false },
      { label: 'Menu', path: '/database/menu', implemented: false },
      { label: 'Otoritas', path: '/authority', implemented: true },
    ],
  },

  { label: 'Logistik', cap: true, minRole: 5 },
  {
    label: 'Permintaan',
    icon: 'bi bi-box-seam',
    minRole: 5,
    children: [
      { label: 'Permintaan', path: '/logistik/permintaan/permintaan', implemented: false },
      { label: 'Pengadaan', path: '/logistik/permintaan/pengadaan', implemented: false },
    ],
  },
  { label: 'Stok', icon: 'bi bi-cash-stack', minRole: 5, path: '/logistik/stok' },

  { label: 'Profil Saya', cap: true },
  {
    label: 'Kehadiran',
    icon: 'bi bi-calendar2-range',
    children: [
      { label: 'Absensi', path: '/me/kehadiran/absensi', implemented: false },
      { label: 'Cuti', path: '/me/kehadiran/cuti', implemented: false },
      { label: 'Izin', path: '/me/kehadiran/izin', implemented: false },
    ],
  },
  { label: 'Profil', icon: 'bi bi-person-lines-fill', path: '/profile' },
  { label: 'Slip', icon: 'bi bi-cash-stack', path: '/my-slip' },
  { label: 'User', icon: 'bi bi-person-lines-fill', path: '/user', implemented: false },
];
