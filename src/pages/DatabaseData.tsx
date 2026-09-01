import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  eavApi,
  type BuilderEntity,
  type BuilderField,
  type EavRecord,
  type FieldShow,
} from '../api';
import { slugify } from '../profile';
import DataTable from '../components/DataTable';
import { renderFieldValue } from '../eavRender';

type FlatRow = { __recordCode: string; __recordUuid: string } & Record<string, string>;

export default function DatabaseData() {
  const [entities, setEntities] = useState<Record<string, BuilderEntity>>({});
  const [fieldShows, setFieldShows] = useState<FieldShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState('');
  const [records, setRecords] = useState<EavRecord[]>([]);
  const [sourceOptions, setSourceOptions] = useState<Record<string, EavRecord[]>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [editRecordCode, setEditRecordCode] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const tableList = useMemo(() => Object.values(entities), [entities]);
  const selectedEntity = selected ? entities[selected] : null;
  const selectedFields = useMemo(
    () =>
      selectedEntity
        ? Object.values(selectedEntity.fields ?? {}).sort(
            (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
          )
        : [],
    [selectedEntity],
  );
  const primaryField = selectedEntity?.primaryCode ?? '';

  const load = useCallback(() => {
    setLoading(true);
    eavApi
      .builder()
      .then((b) => {
        setEntities(b.entities ?? {});
        setFieldShows(b.fieldShows ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function selectTable(code: string) {
    setSelected(code);
    setRecords([]);
    setFormValues({});
    setEditRecordCode(null);
    setError('');
    const entity = entities[code];
    if (!entity) return;

    const [recs, srcMap] = await Promise.all([
      eavApi.records(code).catch(() => [] as EavRecord[]),
      (async () => {
        const map: Record<string, EavRecord[]> = {};
        const dariFields = Object.values(entity.fields ?? {}).filter((f) =>
          ['DARI-TABEL', 'INPUT-AUTOCOMPLITE', 'REFERENCE'].includes(
            (f.type ?? '').toUpperCase(),
          ),
        );
        await Promise.all(
          dariFields.map(async (f) => {
            const src = f.data_source?.entitySource;
            if (src && !map[src]) {
              map[src] = await eavApi.records(src).catch(() => [] as EavRecord[]);
            }
          }),
        );
        return map;
      })(),
    ]);
    setRecords(recs);
    setSourceOptions(srcMap);
  }

  const flatData = useMemo<FlatRow[]>(
    () =>
      records.map((r) => ({
        __recordCode: r.recordCode,
        __recordUuid: r.recordUuid,
        ...r.values,
      })),
    [records],
  );

  // ===== Form =====
  function resetForm() {
    setFormValues({});
    setEditRecordCode(null);
  }

  function editRecord(r: EavRecord) {
    setFormValues({ ...r.values });
    setEditRecordCode(r.recordCode);
  }

  function setValue(fieldCode: string, value: string) {
    setFormValues((v) => ({ ...v, [fieldCode]: value }));
  }

  async function store() {
    if (!selectedEntity) return;
    if (!primaryField || !formValues[primaryField]) {
      setError('Isi field primary terlebih dahulu');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const recordCode = slugify(formValues[primaryField]);
      const cleaned: Record<string, string> = {};
      for (const f of selectedFields) {
        const val = formValues[f.code];
        if (val !== undefined && val !== '') cleaned[f.code] = val;
      }
      await eavApi.storeRecord(selectedEntity.code, { recordCode, values: cleaned });
      resetForm();
      await selectTable(selectedEntity.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan data');
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(r: EavRecord) {
    if (!window.confirm(`Hapus data "${r.recordCode}"?`)) return;
    setBusy(true);
    setError('');
    try {
      await eavApi.deleteRecord(selected, r.recordCode);
      await selectTable(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus data');
    } finally {
      setBusy(false);
    }
  }

  // ===== Import / Export =====
  async function doExport() {
    if (!selected) return;
    setError('');
    try {
      await eavApi.exportXlsx(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal export');
    }
  }

  async function doImport(file: File) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const res = await eavApi.importXlsx(file);
      await selectTable(selected);
      alert(`Import selesai: ${res.imported} data`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal import');
    } finally {
      setBusy(false);
    }
  }

  // ===== Render input form sesuai type =====
  function renderInput(f: BuilderField) {
    const val = formValues[f.code] ?? '';
    const type = f.type.toUpperCase();

    if (type === 'HIDDEN') return null;

    if (type === 'GABUNGAN') {
      return (
        <input
          className="form-control"
          value={val}
          readOnly
          placeholder="(dihitung otomatis dari field gabungan)"
        />
      );
    }

    if (type === 'COLOR') {
      return (
        <input
          type="color"
          className="form-control"
          value={val?.startsWith('#') ? val : ''}
          onChange={(e) => setValue(f.code, e.target.value)}
        />
      );
    }

    if (type === 'DATE') {
      return (
        <input
          type="date"
          className="form-control"
          value={val}
          onChange={(e) => setValue(f.code, e.target.value)}
        />
      );
    }

    if (type === 'DATETIME') {
      return (
        <input
          type="datetime-local"
          className="form-control"
          value={val}
          onChange={(e) => setValue(f.code, e.target.value)}
        />
      );
    }

    if (type === 'NOMINAL-UANG') {
      return (
        <input
          type="number"
          className="form-control"
          value={val}
          onChange={(e) => setValue(f.code, e.target.value)}
        />
      );
    }

    if (['DARI-TABEL', 'INPUT-AUTOCOMPLITE', 'REFERENCE'].includes(type)) {
      const src = f.data_source?.entitySource;
      const fsrc = f.data_source?.fieldSource;
      const opts = sourceOptions[src ?? ''] ?? [];
      return (
        <select className="form-control" value={val} onChange={(e) => setValue(f.code, e.target.value)}>
          <option value="">-- {f.name} --</option>
          {opts.map((o) => (
            <option key={o.recordCode} value={o.recordCode}>
              {fsrc ? o.values[fsrc] ?? o.recordCode : o.recordCode}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        className="form-control"
        value={val}
        onChange={(e) => setValue(f.code, e.target.value)}
      />
    );
  }

  return (
    <div>
      <div className="title pb-20">
        <h2 className="h3 mb-0">Data Database</h2>
        <p className="text-secondary font-14 mb-0">Isi, cari, filter, import &amp; export data</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        {/* ===== List Table (DataTable) ===== */}
        <div className="col-md-6 mb-30">
          <div className="card-box pd-20">
            <div className="h5 mb-2 text-primary">List Tabel</div>
            {loading ? (
              <p className="text-secondary">Memuat…</p>
            ) : (
              <DataTable<BuilderEntity>
                columns={[
                  {
                    key: 'name',
                    header: 'Tabel',
                    filterable: true,
                    getValue: (t) => t.name,
                    render: (t) => (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          selectTable(t.code);
                        }}
                        className={selected === t.code ? 'weight-600 text-primary' : ''}
                      >
                        {t.name}
                        <span className="badge badge-pill badge-light ml-1">{t.code}</span>
                      </a>
                    ),
                  },
                ]}
                data={tableList}
                searchableKeys={['name', 'code']}
                rowKey={(t) => t.code}
                pageSize={12}
                emptyText="Belum ada tabel."
              />
            )}
          </div>
        </div>

        {/* ===== Form Input ===== */}
        <div className="col-md-6 mb-30">
          <div className="card-box pd-20">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="h5 mb-0 text-primary">{selectedEntity ? selectedEntity.name : 'Detail'}</span>
              {selectedEntity && (
                <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                  <i className="bi bi-plus"></i> Baru
                </button>
              )}
            </div>
            {!selectedEntity ? (
              <p className="text-secondary">Pilih tabel.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  store();
                }}
              >
                {selectedFields.map((f) => (
                  <div className="form-group" key={f.code}>
                    <label className="font-14 weight-500">{f.name}</label>
                    {renderInput(f)}
                  </div>
                ))}
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Menyimpan…' : editRecordCode ? 'Simpan Perubahan' : 'Simpan'}
                </button>
                {editRecordCode && (
                  <span className="text-secondary font-12 ml-2">Mengedit: {editRecordCode}</span>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        {/* ===== List Data (DataTable + filter + import/export) ===== */}
        <div className="col-md-12 mb-30">
          <div className="card-box pd-20">
            <div className="h5 mb-2 text-primary">
              List Data{selectedEntity ? ` — ${selectedEntity.name}` : ''}
            </div>

            {!selectedEntity ? (
              <p className="text-secondary">Pilih tabel untuk melihat data.</p>
            ) : (
              <DataTable<FlatRow>
                columns={[
                  ...selectedFields
                    .filter((f) => f.type.toUpperCase() !== 'HIDDEN')
                    .map((f) => ({
                      key: f.code,
                      header: f.name,
                      filterable: (f.visibility ?? 'show') !== 'block',
                      getValue: (row: FlatRow) => row[f.code] ?? '',
                      render: (row: FlatRow) =>
                        renderFieldValue(f, row[f.code], {
                          record: row,
                          sourceOptions,
                          fieldShows,
                        }),
                    })),
                  {
                    key: 'aksi',
                    header: 'Aksi',
                    render: (row: FlatRow) => {
                      const rec = records.find((r) => r.recordCode === row.__recordCode);
                      return (
                        <>
                          <button
                            className="btn btn-sm btn-outline-primary mr-1"
                            onClick={() => rec && editRecord(rec)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => rec && removeRecord(rec)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </>
                      );
                    },
                  },
                ]}
                data={flatData}
                searchableKeys={selectedFields.map((f) => f.code)}
                rowKey={(r) => r.__recordCode}
                pageSize={10}
                emptyText="Belum ada data."
                toolbar={
                  <>
                    <button className="btn btn-sm btn-outline-success" onClick={doExport}>
                      <i className="bi bi-download"></i> Export
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => importRef.current?.click()}
                      disabled={busy}
                    >
                      <i className="bi bi-upload"></i> Import
                    </button>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".xlsx"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) doImport(f);
                        e.target.value = '';
                      }}
                    />
                  </>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
