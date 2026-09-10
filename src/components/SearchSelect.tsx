import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface SearchSelectOption {
  value: string;
  label?: ReactNode;
  searchText?: string;
}

interface SearchSelectProps {
  options: (string | SearchSelectOption)[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  renderOption?: (value: string) => ReactNode;
  getSearchText?: (value: string) => string;
}

// Multi-select dengan pencarian (gaya select2) — dipakai untuk filter kolom.
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih…',
  renderOption,
  getSearchText,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        const val = opt;
        const extraSearch = getSearchText ? getSearchText(val) : '';
        const searchText = extraSearch ? `${val} ${extraSearch}` : val;
        const label = renderOption ? renderOption(val) : val;
        return { value: val, label, searchText };
      }
      const val = opt.value;
      const extraSearch = getSearchText ? getSearchText(val) : '';
      const searchText = opt.searchText ?? (extraSearch ? `${val} ${extraSearch}` : val);
      const label = opt.label ?? (renderOption ? renderOption(val) : val);
      return { value: val, label, searchText };
    });
  }, [options, renderOption, getSearchText]);

  const filtered = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.trim().toLowerCase();
    return normalizedOptions.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        (o.searchText && o.searchText.toLowerCase().includes(q)),
    );
  }, [normalizedOptions, query]);

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  const isCustomRender = Boolean(renderOption);

  return (
    <div className="position-relative" ref={ref} style={{ minWidth: isCustomRender ? '180px' : '150px' }}>
      <button
        type="button"
        className={`btn btn-sm w-100 d-flex justify-content-between align-items-center ${
          value.length > 0 ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-truncate font-12">
          {value.length > 0 ? `${value.length} dipilih` : placeholder}
        </span>
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
      </button>

      {open && (
        <div
          className="dropdown-menu show p-2 shadow-lg"
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            zIndex: 1050,
            minWidth: isCustomRender ? '320px' : '220px',
            maxWidth: isCustomRender ? '420px' : '300px',
            borderRadius: '8px',
          }}
        >
          <input
            className="form-control form-control-sm mb-2"
            placeholder={isCustomRender ? 'Cari nama, NRP, jabatan…' : 'Cari…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filtered.map((item) => (
              <label
                key={item.value}
                className="dropdown-item d-flex align-items-center"
                style={{ cursor: 'pointer', padding: '6px 8px', whiteSpace: 'normal' }}
              >
                <input
                  type="checkbox"
                  className="mr-2 flex-shrink-0"
                  checked={value.includes(item.value)}
                  onChange={() => toggle(item.value)}
                />
                <div className="flex-grow-1 overflow-hidden">{item.label}</div>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="font-12 text-secondary p-2 text-center">Tidak ada hasil.</div>
            )}
          </div>
          {value.length > 0 && (
            <div className="border-top mt-1 pt-1 d-flex justify-content-between align-items-center">
              <span className="font-11 text-muted">{value.length} dipilih</span>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 font-12"
                onClick={() => onChange([])}
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
