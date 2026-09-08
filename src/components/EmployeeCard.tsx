import React from 'react';
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
  tanggalMasuk?: string;
  tanggalBerakhir?: string;
}

// Generate deterministic avatar (/deskapp/images/photo1.jpg - photo9.jpg)
export function getAvatarForNrp(nrp: string, customPhoto?: string): string {
  if (customPhoto && (customPhoto.startsWith('http') || customPhoto.startsWith('/'))) {
    return customPhoto;
  }
  if (!nrp) return '/deskapp/images/photo5.jpg';
  let hash = 0;
  for (let i = 0; i < nrp.length; i++) {
    hash = (hash * 31 + nrp.charCodeAt(i)) >>> 0;
  }
  const photoIndex = (hash % 9) + 1;
  return `/deskapp/images/photo${photoIndex}.jpg`;
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
  const photo = clean(vals['FOTO'] || vals['PHOTO'] || vals['avatar']);

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
    avatarUrl: getAvatarForNrp(nrp, photo),
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
            <img
              src={info.avatarUrl}
              alt={info.nama}
              className="border-radius-100 shadow-sm"
              width="64"
              height="64"
              style={{ objectFit: 'cover', border: '2px solid #3b82f6' }}
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
        <img
          src={info.avatarUrl}
          className="border-radius-100 shadow-sm"
          width="42"
          height="42"
          alt={info.nama}
          style={{ objectFit: 'cover', border: '1.5px solid #2563eb' }}
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
