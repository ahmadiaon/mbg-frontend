import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import SearchSelect from './SearchSelect';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  filterable?: boolean; // tampilkan filter (searchable select) di kolom ini
  getValue?: (row: T) => string; // nilai mentah untuk search & filter
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  searchPlaceholder?: string;
  searchableKeys?: string[];
  emptyText?: string;
  toolbar?: ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  pageSize = 10,
  searchPlaceholder = 'Cari…',
  searchableKeys,
  emptyText = 'Belum ada data.',
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setPage(0);
  }, [search, data, activeFilters]);

  const getRaw = (row: T, col: DataTableColumn<T>): string =>
    col.getValue ? col.getValue(row) : String((row as Record<string, unknown>)[col.key] ?? '');

  const filterableColumns = useMemo(
    () => columns.filter((c) => c.filterable),
    [columns],
  );

  const filtered = useMemo(() => {
    let result = data;

    const q = search.trim().toLowerCase();
    if (q) {
      const keys =
        searchableKeys && searchableKeys.length > 0
          ? searchableKeys
          : columns.map((c) => c.key);
      result = result.filter((row) =>
        keys.some((k) =>
          String((row as Record<string, unknown>)[k] ?? '')
            .toLowerCase()
            .includes(q),
        ),
      );
    }

    for (const col of filterableColumns) {
      const vals = activeFilters[col.key];
      if (vals && vals.length > 0) {
        result = result.filter((row) => vals.includes(getRaw(row, col)));
      }
    }
    return result;
  }, [data, search, activeFilters, searchableKeys, columns, filterableColumns]);

  function optionsFor(col: DataTableColumn<T>): string[] {
    // jika kolom ini sedang aktif, tampilkan opsi asli (agar tetap bisa centang ulang)
    const source = activeFilters[col.key]?.length ? data : filtered;
    return [...new Set(source.map((r) => getRaw(r, col)).filter((v) => v !== ''))].sort();
  }

  function setFilter(key: string, values: string[]) {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (values.length === 0) delete next[key];
      else next[key] = values;
      return next;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-2" style={{ gap: '8px' }}>
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: '260px' }}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="d-flex align-items-center" style={{ gap: '8px' }}>
          <span className="font-12 text-secondary">Total: {filtered.length}</span>
          {toolbar}
        </div>
      </div>

      {filterableColumns.length > 0 && (
        <div className="d-flex flex-wrap mb-2" style={{ gap: '6px' }}>
          {filterableColumns.map((col) => (
            <SearchSelect
              key={`filter-${col.key}`}
              placeholder={String(col.header)}
              options={optionsFor(col)}
              value={activeFilters[col.key] ?? []}
              onChange={(vals) => setFilter(col.key, vals)}
            />
          ))}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-striped table-bordered nowrap">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-secondary">
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render
                        ? c.render(row)
                        : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <i className="bi bi-chevron-left"></i> Sebelumnya
          </button>
          <span className="font-12 text-secondary">
            Hal. {safePage + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Berikutnya <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}
