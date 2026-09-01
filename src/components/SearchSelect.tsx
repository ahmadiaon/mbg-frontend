import { useEffect, useRef, useState } from 'react';

interface SearchSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

// Multi-select dengan pencarian (gaya select2) — dipakai untuk filter kolom.
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih…',
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

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div className="position-relative" ref={ref} style={{ minWidth: '150px' }}>
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
          className="dropdown-menu show p-2"
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            zIndex: 1050,
            minWidth: '220px',
            maxWidth: '280px',
          }}
        >
          <input
            className="form-control form-control-sm mb-2"
            placeholder="Cari…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.map((v) => (
              <label
                key={v}
                className="dropdown-item d-flex align-items-center"
                style={{ cursor: 'pointer', padding: '4px 8px' }}
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={value.includes(v)}
                  onChange={() => toggle(v)}
                />
                <span className="font-12">{v}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="font-12 text-secondary p-2">Tidak ada hasil.</div>
            )}
          </div>
          {value.length > 0 && (
            <div className="border-top mt-1 pt-1">
              <button
                type="button"
                className="btn btn-link btn-sm p-0 font-12"
                onClick={() => onChange([])}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
