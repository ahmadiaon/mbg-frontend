import type { ReactNode } from 'react';
import type { BuilderField, EavRecord, FieldShow } from './api';

export function formatNominal(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value).trim();
  const isNegative = str.startsWith('-');
  const clean = str.replace(/[^0-9]/g, '');
  if (!clean) return str;
  const n = Number(clean);
  if (Number.isNaN(n)) return str;
  return (isNegative ? '- Rp. ' : 'Rp. ') + n.toLocaleString('id-ID');
}

export function RupiahInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  placeholder = '0',
  className = '',
}: {
  value: string | number | undefined | null;
  onChange: (val: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const str = value !== undefined && value !== null ? String(value).trim() : '';
  const clean = str.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  const display = clean ? Number(clean).toLocaleString('id-ID') : '';

  return (
    <div className={`input-group ${className}`}>
      <div className="input-group-prepend">
        <span className="input-group-text font-weight-bold bg-light text-dark">Rp.</span>
      </div>
      <input
        type="text"
        className="form-control font-weight-bold"
        placeholder={placeholder}
        value={display}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
          onChange(raw);
        }}
      />
    </div>
  );
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID');
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function resolveDariTabel(
  field: BuilderField,
  value: string | undefined | null,
  sourceOptions?: Record<string, EavRecord[]>,
): string {
  if (!value) return '';
  const src = field.data_source?.entitySource;
  const fsrc = field.data_source?.fieldSource;
  if (src && sourceOptions?.[src]) {
    const found = sourceOptions[src].find(
      (r) => r.recordCode === value || (fsrc && r.values[fsrc] === value),
    );
    if (found) return fsrc ? (found.values[fsrc] ?? value) : value;
  }
  return value;
}

export function computeGabungan(
  field: BuilderField,
  record: Record<string, string> | undefined,
  fieldShows: FieldShow[],
): string {
  const shows = fieldShows
    .filter((fs) => fs.fieldCode === field.code && (!fs.entityCode || fs.entityCode === field.fullCode.split('-')[0]))
    .sort((a, b) => a.sort - b.sort);
  if (shows.length === 0) return record?.[field.code] ?? '';
  let result = '';
  for (const fs of shows) {
    const v = record?.[fs.fieldShowCode] ?? '';
    if (result === '') result = v;
    else result += (fs.splitBy ?? '') + v;
  }
  return result;
}

interface RenderCtx {
  record?: Record<string, string>;
  sourceOptions?: Record<string, EavRecord[]>;
  fieldShows?: FieldShow[];
  entityCode?: string;
}

import EmployeeCard from './components/EmployeeCard';

export function isEmployeeField(field: BuilderField, _currentEntityCode?: string): boolean {
  const type = (field.type ?? '').toUpperCase();
  const code = (field.code ?? '').toUpperCase();
  const name = (field.name ?? '').toUpperCase();
  const src = (field.data_source?.entitySource ?? '').toUpperCase();

  // Field nama atau text/gabungan SELALU BUKAN employee reference picker/chip
  if (
    code.includes('NAMA') ||
    name.includes('NAMA') ||
    code === 'FULL-NAME' ||
    type === 'TEXT' ||
    type === 'GABUNGAN'
  ) {
    return false;
  }

  // Jika field memiliki data_source ke tabel selain KARYAWAN (misal: DATABASE-AGAMA, PERUSAHAAN, dll),
  // MAKA PASTI BUKAN employee reference picker! Sesuai tabel & field yang dikonfigurasi.
  if (src && src !== 'KARYAWAN') {
    return false;
  }

  // Tipe data NRP atau kode NRP di tabel manapun (termasuk KARYAWAN) atau relasi DARI-TABEL/REFERENCE ke KARYAWAN
  return (
    type === 'NRP' ||
    code === 'NRP' ||
    ((type === 'REFERENCE' || type === 'DARI-TABEL') && (src === 'KARYAWAN' || code === 'NRP'))
  );
}

// Render nilai sesuai type data (untuk tampilan tabel / detail).
export function renderFieldValue(
  field: BuilderField,
  value: string | undefined | null,
  ctx: RenderCtx = {},
): ReactNode {
  // Nama karyawan atau field nama teks lainnya SELALU text biasa tanpa gambar dll
  const codeUpper = (field.code ?? '').toUpperCase();
  const nameUpper = (field.name ?? '').toUpperCase();
  if (
    codeUpper.includes('NAMA') ||
    nameUpper.includes('NAMA') ||
    codeUpper === 'FULL-NAME'
  ) {
    return value ?? '';
  }

  const type = (field.type ?? 'TEXT').toUpperCase();

  // Tampilkan EmployeeCard chip untuk field NRP atau referensi karyawan di semua tabel (termasuk tabel KARYAWAN)
  const isNrpOrEmployee =
    codeUpper === 'NRP' ||
    type === 'NRP' ||
    isEmployeeField(field, ctx.entityCode);

  if (isNrpOrEmployee && value) {
    const empRecords = ctx.sourceOptions?.['KARYAWAN'] ?? [];
    const empRecord =
      empRecords.find(
        (r) =>
          r.recordCode === value ||
          r.values?.['NRP'] === value ||
          r.values?.['nik_employee'] === value,
      ) || ctx.record;

    return <EmployeeCard nrp={value} data={empRecord} mode="chip" />;
  }

  switch (type) {
    case 'HIDDEN':
      return null;
    case 'COLOR': {
      const v = value || '';
      if (!v) return '';
      const color = v.startsWith('#') ? v : `#${v}`;
      return (
        <span className="d-inline-flex align-items-center">
          <span
            className="mr-1"
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              display: 'inline-block',
              backgroundColor: color,
              border: '1px solid #ccc',
            }}
          />
          <span className="font-12">{v}</span>
        </span>
      );
    }
    case 'DARI-TABEL':
    case 'INPUT-AUTOCOMPLITE':
    case 'REFERENCE':
      return resolveDariTabel(field, value, ctx.sourceOptions);
    case 'NOMINAL-UANG':
      return formatNominal(value);
    case 'DATE':
      return formatDate(value);
    case 'DATETIME':
      return formatDateTime(value);
    case 'GABUNGAN':
      return computeGabungan(field, ctx.record, ctx.fieldShows ?? []);
    case 'FILE':
    case 'FILE-PDF': {
      const v = value || '';
      if (!v) return '';
      if (/^https?:\/\//.test(v)) {
        return (
          <a href={v} target="_blank" rel="noreferrer" title={v}>
            <i className="bi bi-box-arrow-up-right"></i> Buka
          </a>
        );
      }
      const isPdf = type === 'FILE-PDF' || /\.pdf$/i.test(v);
      return (
        <span className="d-inline-flex align-items-center">
          <i className={`bi ${isPdf ? 'bi-file-earmark-pdf text-danger' : 'bi-file-earmark text-primary'} mr-1`}></i>
          <span className="font-12">{v}</span>
        </span>
      );
    }
    case 'FOTO-PROFIL':
    case 'GAMBAR': {
      const v = value || '';
      if (!v) return <span className="text-muted font-12">-</span>;
      return (
        <div className="d-inline-flex align-items-center py-1">
          <img
            src={v}
            alt={field.name}
            className="rounded border shadow-sm"
            style={{
              width: '33px',
              height: '44px',
              objectFit: 'cover',
            }}
          />
        </div>
      );
    }
    case 'NRP':
    default:
      return value ?? '';
  }
}
