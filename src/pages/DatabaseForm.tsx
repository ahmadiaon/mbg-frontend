import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  eavApi,
  type BuilderEntity,
  type BuilderField,
  type FieldShow,
  type GroupForm,
} from '../api';
import { slugify } from '../profile';
import DataTable from '../components/DataTable';

interface GabunganRow {
  fieldShowCode: string;
  splitBy: string;
}

interface FieldRow {
  name: string;
  type: string;
  level: number;
  visibility: string;
  sort: number;
  sourceEntity?: string;
  sourceField?: string;
  gabungan: GabunganRow[];
}

const FIELD_TYPES = [
  'TEXT',
  'DARI-TABEL',
  'DATE',
  'DATETIME',
  'FILE',
  'FILE-PDF',
  'GABUNGAN',
  'INPUT-AUTOCOMPLITE',
  'NOMINAL-UANG',
  'NRP',
  'REFERENCE',
  'COLOR',
  'HIDDEN',
];

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Teks',
  'DARI-TABEL': 'Dari Tabel',
  DATE: 'Tanggal',
  DATETIME: 'Tanggal & Jam',
  FILE: 'File',
  'FILE-PDF': 'File PDF',
  GABUNGAN: 'Gabungan',
  'INPUT-AUTOCOMPLITE': 'Input Autocomplete',
  'NOMINAL-UANG': 'Nominal Uang',
  NRP: 'NRP',
  REFERENCE: 'Referensi',
  COLOR: 'Warna',
  HIDDEN: 'Tersembunyi',
};

const LEVELS = [1, 2, 3, 4, 5];
const VISIBILITY = ['show', 'hide', 'filter', 'block'];
const LEVEL_LABELS: Record<number, string> = {
  1: '1 | Public',
  2: '2 | Admin Divisi',
  3: '3 | HR',
  4: '4 | Manajemen',
  5: '5 | Superadmin',
};

// tipe yang butuh konfigurasi sumber (tabel + field)
const SOURCE_TYPES = ['DARI-TABEL', 'INPUT-AUTOCOMPLITE', 'REFERENCE'];

function newField(): FieldRow {
  return { name: '', type: 'TEXT', level: 1, visibility: 'show', sort: 1, gabungan: [] };
}

export default function DatabaseForm() {
  const [entities, setEntities] = useState<Record<string, BuilderEntity>>({});
  const [fieldShows, setFieldShows] = useState<FieldShow[]>([]);
  const [groupForms, setGroupForms] = useState<GroupForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editCode, setEditCode] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [menu, setMenu] = useState('');
  const [primary, setPrimary] = useState('');
  const [parent, setParent] = useState('');
  const [levelTable, setLevelTable] = useState<'primary' | 'secondary'>('primary');
  const [fields, setFields] = useState<FieldRow[]>([newField()]);
  const [existingFieldCodes, setExistingFieldCodes] = useState<Set<string>>(new Set());
  const fieldFormRef = useRef<HTMLDivElement>(null);

  const tableList = useMemo(() => Object.values(entities), [entities]);

  const load = useCallback(() => {
    setLoading(true);
    eavApi
      .builder()
      .then((b) => {
        setEntities(b.entities ?? {});
        setFieldShows(b.fieldShows ?? []);
        setGroupForms(b.groupForms ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditCode(null);
    setName('');
    setMenu('');
    setPrimary('');
    setParent('');
    setLevelTable('primary');
    setFields([newField()]);
    setExistingFieldCodes(new Set());
  }

  function addField() {
    setFields((f) => [...f, newField()]);
  }

  function removeField(index: number) {
    setFields((f) => f.filter((_, i) => i !== index));
  }

  function patchField(index: number, patch: Partial<FieldRow>) {
    setFields((f) => f.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function moveField(index: number, dir: -1 | 1) {
    setFields((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function sourceFields(sourceEntity?: string): BuilderField[] {
    if (!sourceEntity) return [];
    return Object.values(entities[sourceEntity]?.fields ?? {});
  }

  function gabunganOptions(): { code: string; label: string }[] {
    const opts: { code: string; label: string }[] = [];
    if (editCode && entities[editCode]) {
      for (const [code, f] of Object.entries(entities[editCode].fields ?? {})) {
        opts.push({ code, label: f.name || code });
      }
    }
    for (const f of fields) {
      if (f.name.trim()) {
        const c = slugify(f.name);
        if (!opts.some((o) => o.code === c)) opts.push({ code: c, label: f.name.trim() });
      }
    }
    return opts;
  }

  function dataShow(code: string) {
    const e = entities[code];
    if (!e) return;
    setEditCode(code);
    setName(e.name);
    setMenu(e.menu ?? '');
    setPrimary(e.primaryCode ?? '');
    const parentCode =
      Object.values(entities).find((x) => x.id === e.parentId)?.code ?? '';
    setParent(parentCode);
    setLevelTable(parentCode ? 'secondary' : 'primary');

    const fieldRows = Object.values(e.fields ?? {})
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((f) => {
        const gabungan = fieldShows
          .filter((fs) => fs.entityCode === code && fs.fieldCode === f.code)
          .sort((a, b) => a.sort - b.sort)
          .map((fs) => ({ fieldShowCode: fs.fieldShowCode, splitBy: fs.splitBy ?? '' }));
        return {
          name: f.name,
          type: (f.type ?? 'TEXT').toUpperCase(),
          level: f.level ?? 1,
          visibility: f.visibility ?? 'show',
          sort: f.sort ?? 0,
          sourceEntity: f.data_source?.entitySource ?? undefined,
          sourceField: f.data_source?.fieldSource ?? undefined,
          gabungan,
        };
      });
    setFields(fieldRows.length ? fieldRows : [newField()]);
    setExistingFieldCodes(new Set(Object.keys(e.fields ?? {})));
    fieldFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function storeForm() {
    if (!name.trim()) {
      setError('Nama form wajib diisi');
      return;
    }
    if (!primary.trim()) {
      setError('Field primary wajib diisi');
      return;
    }
    const validFields = fields.filter((f) => f.name.trim());
    if (validFields.length === 0) {
      setError('Minimal 1 field');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const code = slugify(name);
      const entityBody = {
        code,
        name: name.trim(),
        menu: menu || undefined,
        parentCode: parent || undefined,
        primaryCode: slugify(primary),
      };

      if (editCode) {
        await eavApi.updateEntity(editCode, entityBody);
      } else {
        await eavApi.createEntity(entityBody);
      }

      for (const [idx, f] of validFields.entries()) {
        const fieldCode = slugify(f.name);
        const body = {
          code: fieldCode,
          name: f.name.trim(),
          type: f.type,
          level: f.level,
          sort: idx,
          visibility: f.visibility,
          sourceEntityCode: f.sourceEntity,
          sourceFieldCode: f.sourceField,
          gabungan:
            f.type === 'GABUNGAN'
              ? f.gabungan
                  .filter((g) => g.fieldShowCode)
                  .map((g, gi) => ({ fieldShowCode: g.fieldShowCode, splitBy: g.splitBy, sort: gi }))
              : undefined,
        };
        if (existingFieldCodes.has(fieldCode)) {
          await eavApi.updateField(code, fieldCode, body);
        } else {
          await eavApi.createField(code, body);
        }
      }

      // auto HIDDEN field untuk primary parent (secondary table)
      if (parent) {
        const parentPrimary = entities[parent]?.primaryCode;
        if (parentPrimary) {
          const hiddenBody = {
            code: parentPrimary,
            name: parentPrimary,
            type: 'HIDDEN',
            level: 1,
            sort: 0,
            visibility: 'hide',
          };
          if (existingFieldCodes.has(parentPrimary)) {
            await eavApi.updateField(code, parentPrimary, hiddenBody);
          } else {
            await eavApi.createField(code, hiddenBody);
          }
        }
      }

      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan form');
    } finally {
      setBusy(false);
    }
  }

  async function destroyForm(code: string) {
    if (!window.confirm(`Hapus tabel "${code}" beserta seluruh datanya?`)) return;
    setBusy(true);
    setError('');
    try {
      await eavApi.deleteEntity(code);
      if (editCode === code) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setBusy(false);
    }
  }

  function renderPreviewField(f: FieldRow) {
    if (f.type === 'HIDDEN') return null;
    const label = f.name.trim() || '(tanpa nama)';
    let control: React.ReactNode;
    if (SOURCE_TYPES.includes(f.type) || f.type === 'GABUNGAN') {
      control = <select className="form-control" disabled />;
    } else if (f.type === 'DATE') {
      control = <input type="date" className="form-control" disabled />;
    } else if (f.type === 'DATETIME') {
      control = <input type="datetime-local" className="form-control" disabled />;
    } else if (f.type === 'FILE' || f.type === 'FILE-PDF') {
      control = <input type="file" className="form-control" disabled />;
    } else if (f.type === 'COLOR') {
      control = <input type="color" className="form-control" disabled />;
    } else {
      control = <input type="text" className="form-control" disabled placeholder={label} />;
    }
    return (
      <div className="form-group" key={f.name}>
        <label className="font-14 weight-500">
          {label}
          {f.type === 'GABUNGAN' && f.gabungan.length > 0 && (
            <span className="text-secondary font-12 ml-1">
              ({f.gabungan.map((g) => g.fieldShowCode).join(' ') || ''})
            </span>
          )}
        </label>
        {control}
      </div>
    );
  }

  return (
    <div>
      <div className="title pb-20">
        <h2 className="h3 mb-0">Form Builder</h2>
        <p className="text-secondary font-14 mb-0">
          Buat &amp; edit struktur tabel (entity + field) secara dinamis
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ===== Manage Form ===== */}
      <div className="card-box pd-20 mb-20">
        <div className="h5 mb-3 text-primary">Manage Form</div>
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label className="font-14 weight-500">Nama Form</label>
              <input
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. KARYAWAN"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label className="font-14 weight-500">Field Primary</label>
              <input
                className="form-control"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="mis. NRP"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label className="font-14 weight-500">Nama Menu</label>
              <select
                className="form-control"
                value={menu}
                onChange={(e) => setMenu(e.target.value)}
              >
                <option value="">Pilih Group Form</option>
                {groupForms.map((g) => (
                  <option key={g.uuid} value={g.uuid}>
                    {g.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label className="font-14 weight-500">Level Table</label>
              <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                <button
                  type="button"
                  className={`btn ${levelTable === 'primary' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setLevelTable('primary');
                    setParent('');
                  }}
                >
                  Primary
                </button>
                <button
                  type="button"
                  className={`btn ${levelTable === 'secondary' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setLevelTable('secondary')}
                >
                  Secondary
                </button>
              </div>
            </div>
          </div>
          {levelTable === 'secondary' && (
            <div className="col-md-12">
              <div className="form-group">
                <label className="font-14 weight-500">Referensi Tabel (Parent)</label>
                <select className="form-control" value={parent} onChange={(e) => setParent(e.target.value)}>
                  <option value="">Pilih Tabel Referensi</option>
                  {tableList.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="row">
        {/* ===== Daftar Field ===== */}
        <div className="col-lg-8">
          <div className="card-box pd-20 mb-20" ref={fieldFormRef}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="h5 mb-0 text-primary">
                Daftar Field{editCode ? ` — ${editCode}` : ''}
              </span>
              <button className="btn btn-sm btn-primary" onClick={addField}>
                <i className="bi bi-plus"></i> Tambah Field
              </button>
            </div>

            {fields.map((f, i) => (
              <div className="card mb-2 border" key={i}>
                <div className="card-body pb-2">
                  <div className="row">
                    <div className="col-md-7">
                      <input
                        className="form-control"
                        value={f.name}
                        onChange={(e) => patchField(i, { name: e.target.value })}
                        placeholder={`Pertanyaan / field #${i + 1}`}
                      />
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-control"
                        value={f.type}
                        onChange={(e) => patchField(i, { type: e.target.value })}
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {FIELD_TYPE_LABELS[t] ?? t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2 d-flex justify-content-end">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => moveField(i, -1)} disabled={i === 0}>
                        <i className="bi bi-arrow-up"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary mx-1" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}>
                        <i className="bi bi-arrow-down"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeField(i)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div className="row mt-2">
                    <div className="col-md-6">
                      <label className="font-12 text-secondary">Level</label>
                      <select
                        className="form-control"
                        value={f.level}
                        onChange={(e) => patchField(i, { level: Number(e.target.value) })}
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABELS[l]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="font-12 text-secondary">Visibility</label>
                      <select
                        className="form-control"
                        value={f.visibility}
                        onChange={(e) => patchField(i, { visibility: e.target.value })}
                      >
                        {VISIBILITY.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* config sumber (DARI-TABEL dll) */}
                  {SOURCE_TYPES.includes(f.type) && (
                    <div className="row mt-2">
                      <div className="col-md-6">
                        <label className="font-12 text-secondary">Tabel Sumber</label>
                        <select
                          className="form-control"
                          value={f.sourceEntity ?? ''}
                          onChange={(e) => patchField(i, { sourceEntity: e.target.value, sourceField: '' })}
                        >
                          <option value="">Pilih tabel sumber</option>
                          {tableList.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.name} ({t.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="font-12 text-secondary">Field Sumber</label>
                        <select
                          className="form-control"
                          value={f.sourceField ?? ''}
                          onChange={(e) => patchField(i, { sourceField: e.target.value })}
                        >
                          <option value="">Pilih field</option>
                          {sourceFields(f.sourceEntity).map((sf) => (
                            <option key={sf.code} value={sf.code}>
                              {sf.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* config GABUNGAN */}
                  {f.type === 'GABUNGAN' && (
                    <div className="mt-2">
                      <label className="font-12 text-secondary">Gabungan Field (concat)</label>
                      {f.gabungan.map((g, gi) => (
                        <div className="row mb-1" key={gi}>
                          <div className="col-md-8">
                            <select
                              className="form-control"
                              value={g.fieldShowCode}
                              onChange={(e) =>
                                patchField(i, {
                                  gabungan: f.gabungan.map((x, xi) =>
                                    xi === gi ? { ...x, fieldShowCode: e.target.value } : x,
                                  ),
                                })
                              }
                            >
                              <option value="">Pilih field</option>
                              {gabunganOptions().map((o) => (
                                <option key={o.code} value={o.code}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <input
                              className="form-control"
                              value={g.splitBy}
                              placeholder="pemisah (| -)"
                              onChange={(e) =>
                                patchField(i, {
                                  gabungan: f.gabungan.map((x, xi) =>
                                    xi === gi ? { ...x, splitBy: e.target.value } : x,
                                  ),
                                })
                              }
                            />
                          </div>
                          <div className="col-md-1">
                            <button
                              className="btn btn-sm btn-outline-danger btn-block"
                              onClick={() =>
                                patchField(i, {
                                  gabungan: f.gabungan.filter((_, xi) => xi !== gi),
                                })
                              }
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          patchField(i, {
                            gabungan: [...f.gabungan, { fieldShowCode: '', splitBy: '|' }],
                          })
                        }
                      >
                        + Tambah field gabungan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="row mt-3">
              <div className="col-md-6">
                <button className="btn btn-success btn-block" onClick={storeForm} disabled={busy}>
                  {busy ? 'Menyimpan…' : editCode ? 'Simpan Perubahan' : 'Simpan Form'}
                </button>
              </div>
              <div className="col-md-6">
                <button className="btn btn-secondary btn-block" onClick={resetForm}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Preview ===== */}
        <div className="col-lg-4">
          <div className="card-box pd-20 mb-20" style={{ position: 'sticky', top: '90px' }}>
            <div className="h5 mb-3 text-primary">Preview</div>
            {fields.filter((f) => f.name.trim()).length === 0 ? (
              <p className="text-secondary font-14">Tambahkan field untuk melihat preview.</p>
            ) : (
              fields.map((f) => renderPreviewField(f))
            )}
          </div>
        </div>
      </div>

      {/* ===== Database Table ===== */}
      <div className="card-box pd-20">
        <div className="h5 mb-3 text-primary">Database Table</div>
        {loading ? (
          <p className="text-secondary">Memuat…</p>
        ) : (
          <DataTable<BuilderEntity>
            columns={[
              { key: 'code', header: 'Kode', filterable: true, render: (t) => <span className="weight-600">{t.code}</span> },
              { key: 'name', header: 'Nama', filterable: true, render: (t) => t.name },
              { key: 'menu', header: 'Menu', filterable: true, render: (t) => t.menu ?? '-' },
              { key: 'fieldCount', header: 'Field', render: (t) => Object.keys(t.fields ?? {}).length },
              {
                key: 'aksi',
                header: 'Aksi',
                render: (t) => (
                  <>
                    <button
                      className="btn btn-sm btn-outline-primary mr-1"
                      onClick={() => dataShow(t.code)}
                      title="Edit"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => destroyForm(t.code)}
                      title="Hapus"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </>
                ),
              },
            ]}
            data={tableList}
            searchableKeys={['code', 'name', 'menu']}
            rowKey={(t) => t.code}
            pageSize={10}
            emptyText="Belum ada tabel."
          />
        )}
      </div>
    </div>
  );
}
