import React, { useState } from 'react';
import type { EavRecord } from '../api';

export interface EmployeeInfo {
  nrp: string;
  nama: string;
  jabatan?: string;
  status?: string;
  perusahaan?: string;
  project?: string;
  departemen?: string;
  divisi?: string;
  avatarUrl: string;
  hasCustomPhoto: boolean;
  tanggalMasuk?: string;
  tanggalBerakhir?: string;
}

// Komponen Avatar Karyawan Ringan (0 HTTP request jika belum ada foto profil)
export function EmployeeAvatar({
  photoUrl,
  hasCustomPhoto,
  nama,
  size = 42,
}: {
  photoUrl?: string;
  hasCustomPhoto?: boolean;
  nama: string;
  size?: number;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (hasCustomPhoto && photoUrl && !loadFailed) {
    return (
      <img
        src={photoUrl}
        className="border-radius-100 shadow-sm"
        width={size}
        height={size}
        alt={nama}
        onError={() => setLoadFailed(true)}
        style={{
          objectFit: 'cover',
          border: '1.5px solid #2563eb',
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    );
  }

  // Fallback 1 ikon standar tanpa request file gambar (cepat, hemat bandwidth, loading instan)
  return (
    <div
      className="border-radius-100 d-inline-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: '#e2e8f0',
        color: '#475569',
        border: '1.5px solid #cbd5e1',
        fontSize: size >= 60 ? '30px' : '18px',
      }}
      title={nama}
    >
      <i className="bi bi-person-fill"></i>
    </div>
  );
}

export function extractEmployeeInfo(
  nrp: string,
  record?: Record<string, any> | EavRecord,
): EmployeeInfo {
  const vals: Record<string, any> =
    record && typeof record === 'object' && 'values' in record
      ? (record as EavRecord).values
      : (record as Record<string, any>) || {};

  const clean = (val?: any): string => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    return s !== '-' ? s : '';
  };

  const nama = clean(vals['NAMA-KARYAWAN'] || vals['FULL-NAME'] || vals['nama'] || vals['name']) || nrp;
  const jabatan = clean(vals['JABATAN'] || vals['jabatan'] || vals['POSISI'] || vals['posisi']);
  const status = clean(vals['STATUS'] || vals['STATUS-KERJA'] || vals['status'] || vals['status_kerja']);
  const perusahaan = clean(vals['PERUSAHAAN'] || vals['perusahaan'] || vals['NAMA-PERUSAHAAN-PENDEK']);
  const project = clean(vals['PROJECT'] || vals['project'] || vals['SITE'] || vals['site']);
  const departemen = clean(vals['DEPARTEMEN'] || vals['departemen']);
  const divisi = clean(vals['DIVISI'] || vals['divisi']);
  const tanggalMasuk = clean(vals['TANGGAL-MASUK-KERJA--TMK-'] || vals['tanggal_masuk']);
  const tanggalBerakhir = clean(vals['TANGGAL-BERAKHIR'] || vals['tanggal_berakhir']);

  // Cari field foto profil dari berbagai kemungkinan nama field
  const photo = clean(
    vals['FOTO-PROFIL'] ||
    vals['FOTO'] ||
    vals['FILE-FOTO'] ||
    vals['FOTO-KARYAWAN'] ||
    vals['PHOTO'] ||
    vals['avatar']
  );

  const hasCustomPhoto = Boolean(
    photo && (photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('data:'))
  );

  return {
    nrp,
    nama,
    jabatan,
    status,
    perusahaan,
    project,
    departemen,
    divisi,
    tanggalMasuk,
    tanggalBerakhir,
    avatarUrl: hasCustomPhoto ? photo : '',
    hasCustomPhoto,
  };
}

interface EmployeeCardProps {
  nrp: string;
  data?: Record<string, any> | EavRecord;
  mode?: 'chip' | 'full' | 'compact';
  style?: React.CSSProperties;
  className?: string;
}

export default function EmployeeCard({
  nrp,
  data,
  mode = 'chip',
  style,
  className = '',
}: EmployeeCardProps) {
  if (!nrp) return <span className="text-muted">-</span>;

  const info = extractEmployeeInfo(nrp, data);
  const statusUpper = (info.status || '').toUpperCase();
  const isAktif = statusUpper === 'AKTIF' || statusUpper === 'PKWTT' || statusUpper === 'PKWT';

  if (mode === 'full') {
    return (
      <div
        className={`card-box pd-20 border-radius-12 shadow-sm ${className}`}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          ...style,
        }}
      >
        <div className="d-flex align-items-center">
          <div className="avatar mr-3 flex-shrink-0">
            <EmployeeAvatar
              photoUrl={info.avatarUrl}
              hasCustomPhoto={info.hasCustomPhoto}
              nama={info.nama}
              size={64}
            />
          </div>
          <div className="flex-grow-1" style={{ lineHeight: '1.4' }}>
            <div className="d-flex align-items-center flex-wrap gap-1 mb-1">
              {info.perusahaan && (
                <span className="badge badge-pill badge-primary mr-1" style={{ fontSize: '11px' }}>
                  {info.perusahaan.replace(/-/g, ' ')}
                </span>
              )}
              {info.project && (
                <span className="badge badge-pill badge-secondary mr-1" style={{ fontSize: '11px' }}>
                  {info.project.replace(/-/g, ' ')}
                </span>
              )}
              {info.status && (
                <span
                  className={`badge badge-pill ${isAktif ? 'badge-success' : 'badge-warning'}`}
                  style={{ fontSize: '11px' }}
                >
                  {info.status}
                </span>
              )}
            </div>
            <h5 className="mb-0 weight-700 text-dark font-16">{info.nama}</h5>
            <div className="font-13 weight-600 text-primary">{info.nrp}</div>
            <div className="font-12 text-secondary">
              {info.jabatan ? info.jabatan.replace(/-/g, ' ') : '-'}
              {info.departemen ? ` · Dept. ${info.departemen.replace(/-/g, ' ')}` : ''}
              {info.divisi ? ` (${info.divisi.replace(/-/g, ' ')})` : ''}
            </div>
            {info.tanggalBerakhir && (
              <div className="font-11 text-muted mt-1">
                <i className="bi bi-calendar-event mr-1"></i> Kontrak berakhir: {info.tanggalBerakhir}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // mode === 'chip' or 'compact' (For DataTable cell rendering)
  return (
    <div
      className={`name-avatar d-flex align-items-center pr-2 pl-2 py-1 card-box my-1 ${className}`}
      style={{
        maxWidth: '340px',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        ...style,
      }}
    >
      <div className="avatar mr-2 flex-shrink-0">
        <EmployeeAvatar
          photoUrl={info.avatarUrl}
          hasCustomPhoto={info.hasCustomPhoto}
          nama={info.nama}
          size={42}
        />
      </div>
      <div className="txt" style={{ lineHeight: '1.2', overflow: 'hidden', minWidth: 0 }}>
        <div className="d-flex align-items-center flex-wrap gap-1 mb-1">
          {info.perusahaan && (
            <span
              className="badge badge-pill badge-primary mr-1"
              style={{ fontSize: '9px', padding: '2px 5px', fontWeight: 600 }}
            >
              {info.perusahaan.replace(/-/g, ' ')}
              {info.project ? ` | ${info.project}` : ''}
            </span>
          )}
          {info.status && (
            <span
              className={`badge badge-pill ${isAktif ? 'badge-success' : 'badge-warning'}`}
              style={{ fontSize: '9px', padding: '2px 5px', fontWeight: 600 }}
            >
              {info.status}
            </span>
          )}
        </div>
        <div
          className="font-13 weight-700 text-dark text-truncate"
          title={info.nama}
          style={{ maxWidth: '240px' }}
        >
          {info.nama}
        </div>
        <div className="font-11 weight-600 text-primary">{info.nrp}</div>
        {info.jabatan && (
          <div
            className="font-11 text-muted text-truncate"
            title={info.jabatan}
            style={{ maxWidth: '240px' }}
          >
            {info.jabatan.replace(/-/g, ' ')}
          </div>
        )}
      </div>
    </div>
  );
}

// Item ringkas berfoto & nama untuk dropdown filter atau autocomplete
export function EmployeeFilterItem({
  nrp,
  data,
}: {
  nrp: string;
  data?: Record<string, any> | EavRecord;
}) {
  const info = extractEmployeeInfo(nrp, data);
  const statusUpper = (info.status || '').toUpperCase();
  const isAktif = statusUpper === 'AKTIF' || statusUpper === 'PKWTT' || statusUpper === 'PKWT';

  return (
    <div className="d-flex align-items-center py-1 text-left" style={{ gap: '10px', minWidth: '220px' }}>
      <EmployeeAvatar
        photoUrl={info.avatarUrl}
        hasCustomPhoto={info.hasCustomPhoto}
        nama={info.nama}
        size={36}
      />
      <div style={{ lineHeight: '1.25', minWidth: 0, overflow: 'hidden' }}>
        <div className="d-flex align-items-center flex-wrap gap-1">
          <span className="font-12 weight-700 text-dark text-truncate" title={info.nama}>
            {info.nama}
          </span>
          {info.status && (
            <span
              className={`badge badge-pill ${isAktif ? 'badge-success' : 'badge-warning'} ml-1`}
              style={{ fontSize: '8px', padding: '1px 4px', fontWeight: 600 }}
            >
              {info.status}
            </span>
          )}
        </div>
        <div className="font-11 text-primary weight-600">
          {info.nrp}
          {info.jabatan && (
            <span className="text-secondary font-11 font-weight-normal ml-1">
              • {info.jabatan.replace(/-/g, ' ')}
            </span>
          )}
        </div>
        {info.perusahaan && (
          <div className="font-10 text-muted text-truncate">
            {info.perusahaan.replace(/-/g, ' ')}
            {info.project ? ` (${info.project})` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// Selector Karyawan Interaktif dengan Pencarian Nama/NRP & Card Preview
export function EmployeeSelectInput({
  value,
  onChange,
  options,
  placeholder = 'Pilih Karyawan…',
  disabled = false,
  readOnly = false,
  allowCustomText = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: EavRecord[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  allowCustomText?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Cari data karyawan aktif yang dipilih
  const selectedEmp = React.useMemo(
    () => options.find((r) => r.recordCode === value || r.values?.['NRP'] === value),
    [options, value],
  );

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options.slice(0, 60);
    const q = search.toLowerCase();
    return options
      .filter((r) => {
        const nrp = (r.recordCode || r.values?.['NRP'] || '').toLowerCase();
        const nama = (r.values?.['NAMA-KARYAWAN'] || r.values?.['FULL-NAME'] || '').toLowerCase();
        const jabatan = (r.values?.['JABATAN'] || '').toLowerCase();
        const perusahaan = (r.values?.['PERUSAHAAN'] || '').toLowerCase();
        return nrp.includes(q) || nama.includes(q) || jabatan.includes(q) || perusahaan.includes(q);
      })
      .slice(0, 60);
  }, [options, search]);

  if (disabled || readOnly) {
    return (
      <div>
        <input
          type="text"
          className="form-control bg-light text-muted font-weight-bold"
          value={value}
          readOnly
          disabled
        />
        {value && (
          <div className="mt-2">
            <EmployeeCard nrp={value} data={selectedEmp} mode="full" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Box pilihan karyawan aktif */}
      {value ? (
        <div className="border rounded p-2 bg-white shadow-sm d-flex align-items-center justify-content-between">
          <div className="flex-grow-1 mr-2 overflow-hidden">
            <EmployeeFilterItem nrp={value} data={selectedEmp} />
          </div>
          <div className="d-flex align-items-center flex-shrink-0" style={{ gap: '4px' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => {
                setOpen(true);
                setSearch('');
              }}
              title="Ganti Karyawan"
            >
              <i className="bi bi-arrow-repeat mr-1"></i> Ganti
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onChange('')}
              title="Hapus Pilihan"
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline-secondary form-control text-left d-flex justify-content-between align-items-center"
          onClick={() => {
            setOpen((o) => !o);
            setSearch('');
          }}
        >
          <span className="text-muted font-13">
            <i className="bi bi-person-bounding-box mr-2 text-primary"></i> {placeholder}
          </span>
          <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`}></i>
        </button>
      )}

      {/* Dropdown Popover dengan Card Pencarian */}
      {open && (
        <div
          className="dropdown-menu show p-2 shadow-lg border"
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            zIndex: 1060,
            width: '100%',
            minWidth: '340px',
            maxWidth: '520px',
            borderRadius: '8px',
          }}
        >
          <div className="input-group input-group-sm mb-2">
            <div className="input-group-prepend">
              <span className="input-group-text bg-light">
                <i className="bi bi-search"></i>
              </span>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama, NRP, jabatan, atau perusahaan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <div className="input-group-append">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch('')}
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
            )}
          </div>

          <div style={{ maxHeight: '270px', overflowY: 'auto' }}>
            {filtered.map((emp) => {
              const nrp = emp.recordCode || emp.values?.['NRP'];
              const isSelected = nrp === value;
              return (
                <div
                  key={nrp}
                  className="p-2 rounded mb-1 border"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                  }}
                  onClick={() => {
                    onChange(nrp);
                    setOpen(false);
                  }}
                >
                  <EmployeeFilterItem nrp={nrp} data={emp} />
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-3 text-muted font-12">
                Tidak ada karyawan yang cocok dengan &quot;{search}&quot;.
                {allowCustomText && search.trim() && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        onChange(search.trim());
                        setOpen(false);
                      }}
                    >
                      Gunakan &quot;{search}&quot; sebagai kode manual
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-top mt-2 pt-2 d-flex justify-content-between align-items-center font-11 text-muted">
            <span>
              Menampilkan {filtered.length} dari {options.length} karyawan
            </span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 font-11"
              onClick={() => setOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Tampilkan EmployeeCard full di bawahnya jika sudah dipilih dan dropdown tutup */}
      {value && !open && (
        <div className="mt-2">
          <EmployeeCard nrp={value} data={selectedEmp} mode="full" />
        </div>
      )}
    </div>
  );
}
