import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';
import { fetchProfile, type ProfileData } from '../profile';

interface BuilderMeta {
  entities: Record<string, unknown>;
  menus: Record<string, string[]>;
}

const MUTED = '#b2b1b6';

export default function Home() {
  const { user } = useAuth();
  const [entityCount, setEntityCount] = useState(0);
  const [menus, setMenus] = useState<[string, string[]][]>([]);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    api<BuilderMeta>('/eav/builder')
      .then((b) => {
        setEntityCount(Object.keys(b.entities).length);
        setMenus(Object.entries(b.menus));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat'));

    if (user?.nrp) {
      fetchProfile(user.nrp)
        .then(setProfile)
        .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat profil'));
    }
  }, [user?.nrp]);

  const tahunMasaKerja = profile?.masaKerja?.match(/(\d+) tahun/)?.[1] ?? '';

  const kpis = [
    {
      label: 'Masa Kerja',
      value: tahunMasaKerja ? `${tahunMasaKerja} th` : '-',
      icon: 'bi bi-calendar3',
      color: '#09cc06',
    },
    {
      label: 'Perusahaan',
      value: profile?.perusahaan || '-',
      icon: 'bi bi-building',
      color: '#265ed7',
    },
    {
      label: 'Departemen',
      value: profile?.departemen || '-',
      icon: 'bi bi-people',
      color: '#7d00ff',
    },
    {
      label: 'Entitas Aktif',
      value: String(entityCount),
      icon: 'bi bi-database',
      color: '#ff9f00',
    },
  ];

  const shortcuts = [
    { label: 'Slip Gaji', icon: 'bi bi-receipt', path: '/my-slip' },
    { label: 'Profil', icon: 'bi bi-person-badge', path: '/profile' },
    { label: 'Kehadiran', icon: 'bi bi-calendar-check', path: '/me/kehadiran/absensi' },
    { label: 'User', icon: 'bi bi-people', path: '/user' },
  ];

  return (
    <div>
      <div className="title pb-20">
        <h2 className="h3 mb-0">Dashboard</h2>
        <p className="text-secondary font-14 mb-0">
          Selamat datang, {profile?.nama || user?.name}
          {error ? ` · ${error}` : ''}
        </p>
      </div>

      {/* ===== Kartu Profil (hero) ===== */}
      <div className="card-box pd-20 mb-20 hero-accent">
        <div className="d-flex flex-wrap align-items-center">
          <div className="avatar mr-3 flex-shrink-0">
            <img
              src="/deskapp/images/photo2.jpg"
              className="border-radius-100 box-shadow img-profile"
              width="80"
              height="80"
              alt=""
            />
          </div>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center flex-wrap">
              <span className="h4 mb-0 mr-2">{profile?.nama || user?.name}</span>
              <span
                className="badge badge-pill badge-sm"
                style={{ color: '#265ed7', backgroundColor: '#e7ebf5' }}
              >
                {profile?.nrp || user?.nrp || ''}
              </span>
            </div>
            <div className="font-14 text-secondary weight-500 mt-1">
              {profile?.jabatan || ''}
              {profile?.jabatan && profile?.departemen ? ' · ' : ''}
              {profile?.departemen || ''}
            </div>
            <div className="mt-2">
              {profile?.perusahaan && (
                <span
                  className="badge badge-pill badge-sm mr-1"
                  style={{ color: '#265ed7', backgroundColor: '#e7ebf5' }}
                >
                  {profile.perusahaan}
                </span>
              )}
              {profile?.site && (
                <span
                  className="badge badge-pill badge-sm"
                  style={{ color: '#265ed7', backgroundColor: '#e7ebf5' }}
                >
                  {profile.site}
                </span>
              )}
            </div>
          </div>
          <div className="text-center ml-auto pl-3" style={{ minWidth: '150px' }}>
            <div className="weight-700 font-20 text-primary">
              {profile?.masaKerja || '-'}
            </div>
            <div className="font-12 weight-500" style={{ color: MUTED }}>
              Masa Kerja
            </div>
          </div>
        </div>
      </div>

      {/* ===== 4 Kartu KPI ===== */}
      <div className="row pb-10">
        {kpis.map((k) => (
          <div className="col-xl-3 col-lg-3 col-md-6 mb-20" key={k.label}>
            <div className="card-box height-100-p widget-style3">
              <div className="d-flex flex-wrap">
                <div className="widget-data">
                  <div className="weight-700 font-24 text-dark">{k.value}</div>
                  <div className="font-14 text-secondary weight-500">{k.label}</div>
                </div>
                <div className="widget-icon">
                  <div className="icon" style={{ color: k.color }}>
                    <i className={k.icon}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Shortcut Menu ===== */}
      <div className="title pb-10">
        <h5 className="h5 mb-0">Menu</h5>
      </div>
      <div className="row pb-10">
        {shortcuts.map((s) => (
          <div className="col-xl-3 col-lg-3 col-md-6 mb-20" key={s.label}>
            <a href={s.path} className="shortcut-tile">
              <div className="shortcut-tile-icon">
                <i className={s.icon}></i>
              </div>
              <div className="shortcut-tile-label">{s.label}</div>
            </a>
          </div>
        ))}
      </div>

      {/* ===== Menu Aplikasi (EAV) ===== */}
      {menus.length > 0 && (
        <div className="card-box pd-20 mb-20">
          <div className="h5 mb-2">Menu Aplikasi</div>
          {menus.map(([menu, codes]) => (
            <div key={menu} className="mb-2">
              <span className="font-14 weight-600 mr-2">{menu}</span>
              {codes.map((c) => (
                <span
                  key={c}
                  className="badge badge-pill badge-sm mr-1 mb-1"
                  style={{ color: '#6c757d', backgroundColor: '#f1f3f5', fontWeight: 500 }}
                >
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
