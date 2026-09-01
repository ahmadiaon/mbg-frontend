import type { ReactNode } from 'react';
import type { BuilderField, EavRecord, FieldShow } from './api';

export function formatNominal(value: string | undefined | null): string {
  if (!value) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return 'Rp ' + n.toLocaleString('id-ID');
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
    const found = sourceOptions[src].find((r) => r.recordCode === value);
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
    .filter((fs) => fs.fieldCode === field.code)
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
}

// Render nilai sesuai type data (untuk tampilan tabel / detail).
export function renderFieldValue(
  field: BuilderField,
  value: string | undefined | null,
  ctx: RenderCtx = {},
): ReactNode {
  const type = (field.type ?? 'TEXT').toUpperCase();
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
    case 'NRP':
    default:
      return value ?? '';
  }
}
