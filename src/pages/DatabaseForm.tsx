import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  eavApi,
  approvalApi,
  type BuilderEntity,
  type BuilderField,
  type PersetujuanStep,
  type EavRecord,
  type EntityDeletionImpact,
} from '../api';
import { slugify } from '../profile';
import DataTable from '../components/DataTable';

interface PersetujuanStepRow extends PersetujuanStep {
  sourceEntity?: string;
  sourceField?: string;
  isCustom?: boolean;
}

interface GabunganRow {
  tableShowCode: string;
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

import { useEav } from '../context/EavContext';

// tipe yang butuh konfigurasi sumber (tabel + field)
const SOURCE_TYPES = ['DARI-TABEL', 'INPUT-AUTOCOMPLITE', 'REFERENCE'];

function newField(): FieldRow {
  return { name: '', type: 'TEXT', level: 1, visibility: 'show', sort: 1, gabungan: [] };
}

export default function DatabaseForm() {
  const {
    entities,
    fieldShows,
    groupForms,
    persetujuan: persetujuanMeta,
    fetchMasterRecords,
    fetchSchema,
    invalidateSchema,
    loading,
  } = useEav();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editCode, setEditCode] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [menu, setMenu] = useState('');
  const [primary, setPrimary] = useState('');
  const [parent, setParent] = useState('');
  const [levelTable, setLevelTable] = useState<'primary' | 'secondary'>('primary');
  const [fields, setFields] = useState<FieldRow[]>([newField()]);
  const [persetujuan, setPersetujuan] = useState<PersetujuanStepRow[]>([]);
  const [sourceOptions, setSourceOptions] = useState<Record<string, EavRecord[]>>({});
  const [persetujuanConfigOpen, setPersetujuanConfigOpen] = useState<Record<number, boolean>>({});
  const [existingFieldCodes, setExistingFieldCodes] = useState<Set<string>>(new Set());
  const fieldFormRef = useRef<HTMLDivElement>(null);

  // State untuk konfirmasi hapus form & analisis dampak
  const [deleteTarget, setDeleteTarget] = useState<{ code: string; name: string } | null>(null);
  const [impactData, setImpactData] = useState<EntityDeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impactError, setImpactError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const tableList = useMemo(() => Object.values(entities), [entities]);

  const loadSourceRecords = useCallback(
    async (tableCode: string) => {
      if (!tableCode) return;
      const recs = await fetchMasterRecords(tableCode);
      setSourceOptions((prev) => ({ ...prev, [tableCode]: recs }));
    },
    [fetchMasterRecords],
  );

  const load = useCallback(() => {
    void fetchSchema();
    // Preload master data persetujuan (sifat DARI-TABEL) dari cache EavContext
    void Promise.all([
      fetchMasterRecords('DESKRIPSI-PERSETUJUAN'),
      fetchMasterRecords('DATABASE-LEVEL-PERSETUJUAN'),
      fetchMasterRecords('DATABASE-GROUP-PERSETUJUAN'),
    ]).then(([deskripsi, levels, groups]) => {
      setSourceOptions((prev) => ({
        ...prev,
        'DESKRIPSI-PERSETUJUAN': deskripsi,
        'DATABASE-LEVEL-PERSETUJUAN': levels,
        'DATABASE-GROUP-PERSETUJUAN': groups,
      }));
    });
  }, [fetchSchema, fetchMasterRecords]);

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
    setPersetujuan([]);
    setPersetujuanConfigOpen({});
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

    const cachedSteps = persetujuanMeta[code];
    if (cachedSteps) {
      setPersetujuan(
        Object.values(cachedSteps).map((s) => ({
          ...s,
          sourceEntity: 'DESKRIPSI-PERSETUJUAN',
          sourceField: 'DESKRIPSI-PERSETUJUAN',
        })),
      );
    } else {
      approvalApi
        .config(code)
        .then((steps) =>
          setPersetujuan(
            (steps ?? []).map((s) => ({
              ...s,
              sourceEntity: 'DESKRIPSI-PERSETUJUAN',
              sourceField: 'DESKRIPSI-PERSETUJUAN',
            })),
          ),
        )
        .catch(() => setPersetujuan([]));
    }

    const fieldRows = Object.values(e.fields ?? {})
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((f) => {
        const gabungan = fieldShows
          .filter((fs) => fs.entityCode === code && fs.fieldCode === f.code)
          .sort((a, b) => a.sort - b.sort)
          .map((fs) => ({ tableShowCode: fs.tableShowCode ?? code, fieldShowCode: fs.fieldShowCode, splitBy: fs.splitBy ?? '' }));
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
        persetujuan,
      };

      if (editCode) {
        await eavApi.updateEntity(editCode, entityBody);
      } else {
        await eavApi.createEntity(entityBody);
      }
      await approvalApi.saveConfig(code, persetujuan).catch(() => {});

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
                  .map((g, gi) => ({ tableShowCode: g.tableShowCode || code, fieldShowCode: g.fieldShowCode, splitBy: g.splitBy, sort: gi }))
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
      await invalidateSchema();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan form');
    } finally {
      setBusy(false);
    }
  }

  async function openDeleteModal(code: string, formName: string) {
    setDeleteTarget({ code, name: formName });
    setImpactData(null);
    setImpactError('');
    setLoadingImpact(true);
    try {
      const impact = await eavApi.getDeletionImpact(code);
      setImpactData(impact);
    } catch (err) {
      setImpactError(err instanceof Error ? err.message : 'Gagal menganalisis dampak penghapusan');
    } finally {
      setLoadingImpact(false);
    }
  }

  async function confirmDestroyForm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setImpactError('');
    try {
      await eavApi.deleteEntity(deleteTarget.code);
      if (editCode === deleteTarget.code) resetForm();
      setDeleteTarget(null);
      setImpactData(null);
      await invalidateSchema();
      await load();
    } catch (err) {
      setImpactError(err instanceof Error ? err.message : 'Gagal menghapus form');
    } finally {
      setDeleting(false);
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
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Alur Persetujuan Form ===== */}
      <div className="card-box pd-20 mb-20">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="h5 mb-0 text-primary">
              <i className="bi bi-shield-check mr-2"></i>
              Alur Persetujuan Form ({persetujuan.length} Penanda Tangan)
            </h5>
            <small className="text-secondary">
              Tentukan berapa banyak dan siapa saja penanda tangan untuk form ini.
            </small>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() =>
              setPersetujuan((prev) => {
                const idx = prev.length;
                const defaultLevels = ['LEVEL-1', 'LEVEL-2', 'LEVEL-3', 'LEVEL-4', 'LEVEL-5'];
                const defaultGrades = ['NRP', 'ATASAN-LANGSUNG', 'HR', 'MANAGER', 'MANAGER'];
                const defaultDescs = [
                  'DIAJUKAN-OLEH-',
                  'DISETUJUI-OLEH-',
                  'DIPERIKSA-OLEH-',
                  'DIKETAHU-OLEH-',
                  'DIKETAHU-OLEH-',
                ];
                return [
                  ...prev,
                  {
                    level: defaultLevels[idx] ?? `LEVEL-${idx + 1}`,
                    grade: defaultGrades[idx] ?? 'HR',
                    description: defaultDescs[idx] ?? 'DIKETAHU-OLEH-',
                    reference: 'NRP',
                    sourceEntity: 'DESKRIPSI-PERSETUJUAN',
                    sourceField: 'DESKRIPSI-PERSETUJUAN',
                  },
                ];
              })
            }
          >
            <i className="bi bi-plus-circle mr-1"></i> Tambah Penanda Tangan
          </button>
        </div>

        {persetujuan.length === 0 ? (
          <div className="alert alert-light border text-secondary font-14 mb-0">
            Form ini tidak memerlukan alur persetujuan. Klik <strong>+ Tambah Penanda Tangan</strong> jika form ini memerlukan tanda tangan atau verifikasi berjenjang.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm mb-0">
              <thead className="thead-light font-13">
                <tr>
                  <th style={{ width: '140px' }}>Level</th>
                  <th style={{ width: '220px' }}>Siapa Penanda Tangan</th>
                  <th>Label Tanda Tangan (Sifat DARI-TABEL)</th>
                  <th style={{ width: '50px' }} className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {persetujuan.map((p, idx) => {
                  const srcEntity = p.sourceEntity || 'DESKRIPSI-PERSETUJUAN';
                  const srcField = p.sourceField || 'DESKRIPSI-PERSETUJUAN';
                  const isConfigOpen = persetujuanConfigOpen[idx] || false;
                  const availableRecords = sourceOptions[srcEntity] || [];
                  const sourceEntityFields = Object.values(entities[srcEntity]?.fields ?? {});

                  const levelRecords = sourceOptions['DATABASE-LEVEL-PERSETUJUAN'] || [];
                  const groupRecords = sourceOptions['DATABASE-GROUP-PERSETUJUAN'] || [];

                  return (
                    <tr key={idx}>
                      <td className="align-middle">
                        <select
                          className="form-control form-control-sm font-13"
                          value={p.level}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersetujuan((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, level: val } : item)),
                            );
                          }}
                        >
                          {levelRecords.length > 0 ? (
                            levelRecords.map((r) => {
                              const lbl = r.values['LEVEL-PERSETUJUAN'] || r.recordCode;
                              return (
                                <option key={r.recordCode} value={r.recordCode}>
                                  {lbl}
                                </option>
                              );
                            })
                          ) : (
                            <>
                              <option value="LEVEL-1">Level 1</option>
                              <option value="LEVEL-2">Level 2</option>
                              <option value="LEVEL-3">Level 3</option>
                              <option value="LEVEL-4">Level 4</option>
                              <option value="LEVEL-5">Level 5</option>
                            </>
                          )}
                          {p.level &&
                            !levelRecords.some((r) => r.recordCode === p.level) &&
                            !['LEVEL-1', 'LEVEL-2', 'LEVEL-3', 'LEVEL-4', 'LEVEL-5'].includes(p.level) && (
                              <option value={p.level}>{p.level}</option>
                            )}
                        </select>
                      </td>
                      <td className="align-middle">
                        <select
                          className="form-control form-control-sm font-13"
                          value={p.grade ?? 'NRP'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersetujuan((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, grade: val } : item)),
                            );
                          }}
                        >
                          <option value="NRP">Pemohon (NRP Sendiri)</option>
                          <option value="ATASAN-LANGSUNG">Atasan Langsung (Otomatis)</option>
                          <option value="HR">HR / Personalia Site</option>
                          <option value="MANAGER">Manager / PJO</option>
                          {groupRecords
                            .filter(
                              (r) =>
                                !['NRP', 'ATASAN-LANGSUNG', 'HR', 'MANAGER'].includes(
                                  r.recordCode.toUpperCase(),
                                ),
                            )
                            .map((r) => (
                              <option key={r.recordCode} value={r.recordCode}>
                                {r.values['GROUP-PERSETUJUAN'] || r.recordCode}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        {!p.isCustom ? (
                          <>
                            <div className="d-flex align-items-center">
                              <select
                                className="form-control form-control-sm font-13 flex-grow-1"
                                value={p.description ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPersetujuan((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, description: val } : item)),
                                  );
                                }}
                              >
                                <option value="">-- Pilih Label --</option>
                                {availableRecords.length === 0 && (
                                  <>
                                    <option value="DIAJUKAN-OLEH-">diajukan oleh,</option>
                                    <option value="DISETUJUI-OLEH-">disetujui oleh,</option>
                                    <option value="DIPERIKSA-OLEH-">diperiksa oleh,</option>
                                    <option value="DIKETAHU-OLEH-">diketahu oleh,</option>
                                  </>
                                )}
                                {availableRecords.map((rec) => {
                                  const displayVal = rec.values[srcField] || rec.recordCode;
                                  return (
                                    <option key={rec.recordCode} value={rec.recordCode}>
                                      {displayVal}
                                    </option>
                                  );
                                })}
                                {p.description &&
                                  !availableRecords.some((r) => r.recordCode === p.description) &&
                                  !['DIAJUKAN-OLEH-', 'DISETUJUI-OLEH-', 'DIPERIKSA-OLEH-', 'DIKETAHU-OLEH-'].includes(
                                    p.description,
                                  ) && (
                                    <option value={p.description}>{p.description}</option>
                                  )}
                              </select>
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-secondary ml-1 p-0"
                                style={{ fontSize: '14px', lineHeight: 1 }}
                                title="Pengaturan sumber tabel & teks kustom"
                                onClick={() =>
                                  setPersetujuanConfigOpen((prev) => ({ ...prev, [idx]: !isConfigOpen }))
                                }
                              >
                                <i className="bi bi-gear"></i>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control form-control-sm font-13 flex-grow-1"
                              value={p.description ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPersetujuan((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, description: val } : item)),
                                );
                              }}
                              placeholder="Ketik label kustom..."
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-secondary ml-1 p-0"
                              style={{ fontSize: '14px', lineHeight: 1 }}
                              title="Pengaturan sumber tabel & teks kustom"
                              onClick={() =>
                                setPersetujuanConfigOpen((prev) => ({ ...prev, [idx]: !isConfigOpen }))
                              }
                            >
                              <i className="bi bi-gear"></i>
                            </button>
                          </div>
                        )}

                        {/* Panel Konfigurasi — muncul hanya saat ikon gerigi diklik */}
                        {isConfigOpen && (
                          <div className="p-2 mt-2 bg-light border rounded font-12">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="weight-600 text-dark font-12">
                                <i className="bi bi-sliders mr-1 text-primary"></i> Pengaturan Sumber
                              </span>
                              <button
                                type="button"
                                className="close font-14"
                                style={{ lineHeight: 1 }}
                                onClick={() =>
                                  setPersetujuanConfigOpen((prev) => ({ ...prev, [idx]: false }))
                                }
                              >
                                &times;
                              </button>
                            </div>

                            {/* Toggle mode: Dari Tabel / Teks Kustom */}
                            <div className="mb-2">
                              <div className="btn-group btn-group-sm w-100">
                                <button
                                  type="button"
                                  className={`btn ${!p.isCustom ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() =>
                                    setPersetujuan((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, isCustom: false } : item)),
                                    )
                                  }
                                >
                                  <i className="bi bi-table mr-1"></i> Dari Tabel
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${p.isCustom ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() =>
                                    setPersetujuan((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, isCustom: true } : item)),
                                    )
                                  }
                                >
                                  <i className="bi bi-pencil mr-1"></i> Teks Kustom
                                </button>
                              </div>
                            </div>

                            {/* Tabel Sumber & Field Sumber — hanya relevan di mode Dari Tabel */}
                            {!p.isCustom && (
                              <div className="row">
                                <div className="col-md-6">
                                  <label className="font-11 text-secondary mb-1">Tabel Sumber</label>
                                  <select
                                    className="form-control form-control-sm font-12"
                                    value={srcEntity}
                                    onChange={(e) => {
                                      const newEntity = e.target.value;
                                      const defaultField =
                                        Object.values(entities[newEntity]?.fields ?? {})[0]?.code ?? newEntity;
                                      setPersetujuan((prev) =>
                                        prev.map((item, i) =>
                                          i === idx
                                            ? { ...item, sourceEntity: newEntity, sourceField: defaultField, description: '' }
                                            : item,
                                        ),
                                      );
                                      if (newEntity) {
                                        loadSourceRecords(newEntity);
                                      }
                                    }}
                                  >
                                    <option value="">Pilih tabel sumber</option>
                                    {tableList.map((t) => (
                                      <option key={t.code} value={t.code}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-md-6">
                                  <label className="font-11 text-secondary mb-1">Field Sumber</label>
                                  <select
                                    className="form-control form-control-sm font-12"
                                    value={srcField}
                                    onChange={(e) => {
                                      const newField = e.target.value;
                                      setPersetujuan((prev) =>
                                        prev.map((item, i) =>
                                          i === idx ? { ...item, sourceField: newField } : item,
                                        ),
                                      );
                                    }}
                                  >
                                    <option value="">Pilih field</option>
                                    {sourceEntityFields.map((sf) => (
                                      <option key={sf.code} value={sf.code}>
                                        {sf.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center align-middle">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Hapus penanda tangan"
                          onClick={() =>
                            setPersetujuan((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                              {t.name}
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
                          <div className="col-md-4">
                            <select className="form-control" value={g.tableShowCode || editCode || ''} onChange={(e) => patchField(i, { gabungan: f.gabungan.map((x, xi) => xi === gi ? { ...x, tableShowCode: e.target.value, fieldShowCode: '' } : x) })}>
                              <option value="">Tabel saat ini</option>
                              {tableList.map((table) => <option key={table.code} value={table.code}>{table.name}</option>)}
                            </select>
                          </div>
                          <div className="col-md-4">
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
                              {Object.values(entities[g.tableShowCode || editCode || '']?.fields ?? {}).map((field) => <option key={field.code} value={field.code}>{field.name}</option>)}
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
                            gabungan: [...f.gabungan, { tableShowCode: editCode || '', fieldShowCode: '', splitBy: '|' }],
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
                      onClick={() => openDeleteModal(t.code, t.name)}
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

      {/* ===== Modal Konfirmasi Hapus Form & Analisis Dampak ===== */}
      {deleteTarget && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          tabIndex={-1}
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title text-danger d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle-fill mr-2"></i>
                  Konfirmasi Hapus Form
                </h5>
                <button
                  type="button"
                  className="close"
                  aria-label="Close"
                  disabled={deleting}
                  onClick={() => {
                    if (!deleting) {
                      setDeleteTarget(null);
                      setImpactData(null);
                    }
                  }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <p className="font-15 mb-1">
                    Anda akan menghapus form: <strong className="text-dark">{deleteTarget.name}</strong>{' '}
                    <code className="badge badge-secondary">{deleteTarget.code}</code>
                  </p>
                </div>

                {impactError && (
                  <div className="alert alert-danger font-14">
                    <i className="bi bi-exclamation-circle mr-2"></i>
                    {impactError}
                  </div>
                )}

                {loadingImpact ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="sr-only">Menganalisis dampak penghapusan...</span>
                    </div>
                    <p className="mt-2 text-muted font-14">
                      Sedang memeriksa data, sub-tabel, relasi luar, dan alur persetujuan...
                    </p>
                  </div>
                ) : impactData ? (
                  <>
                    {!impactData.hasImpact ? (
                      <div className="alert alert-success d-flex align-items-start mb-3">
                        <i className="bi bi-shield-check font-28 mr-3 text-success"></i>
                        <div>
                          <div className="weight-600 font-15 text-success mb-1">
                            Tidak Ada Data atau Relasi Lain yang Terdampak
                          </div>
                          <div className="font-13 text-muted">
                            Form ini belum memiliki record data tersimpan, tidak memiliki sub-tabel (child table), dan tidak sedang direferensikan oleh form lain. 
                            Menghapus form ini hanya akan menghapus konfigurasi struktur form dan kolomnya.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <i className="bi bi-exclamation-triangle-fill font-20 mr-2 text-warning"></i>
                          <strong className="font-14 text-dark">
                            Perhatian: Penghapusan akan berdampak pada data dan relasi berikut!
                          </strong>
                        </div>
                        <p className="font-13 text-secondary mb-0">
                          Seluruh data input yang telah tersimpan pada tabel ini beserta sub-tabelnya akan terhapus secara permanen dan tidak dapat dipulihkan.
                        </p>
                      </div>
                    )}

                    {/* Ringkasan Statistik Dampak */}
                    <div className="row mb-3 text-center">
                      <div className="col-md-3 col-6 mb-2">
                        <div className="p-2 border rounded bg-light">
                          <div className="font-12 text-muted weight-500">Data Records</div>
                          <div className={`font-20 weight-700 ${impactData.recordCount > 0 ? 'text-danger' : 'text-secondary'}`}>
                            {impactData.recordCount}
                          </div>
                          <div className="font-11 text-muted">record terisi</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-2">
                        <div className="p-2 border rounded bg-light">
                          <div className="font-12 text-muted weight-500">Field / Kolom</div>
                          <div className="font-20 weight-700 text-dark">
                            {impactData.fieldCount}
                          </div>
                          <div className="font-11 text-muted">kolom form</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-2">
                        <div className="p-2 border rounded bg-light">
                          <div className="font-12 text-muted weight-500">Sub-Tabel (Child)</div>
                          <div className={`font-20 weight-700 ${impactData.children.length > 0 ? 'text-danger' : 'text-secondary'}`}>
                            {impactData.children.length}
                          </div>
                          <div className="font-11 text-muted">tabel turunan</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-2">
                        <div className="p-2 border rounded bg-light">
                          <div className="font-12 text-muted weight-500">Referensi Luar</div>
                          <div className={`font-20 weight-700 ${impactData.referencedBy.length > 0 ? 'text-warning' : 'text-secondary'}`}>
                            {impactData.referencedBy.length}
                          </div>
                          <div className="font-11 text-muted">form lain</div>
                        </div>
                      </div>
                    </div>

                    {/* Rincian Child Tables jika ada */}
                    {impactData.children.length > 0 && (
                      <div className="card mb-3 border-danger">
                        <div className="card-header bg-light py-2 text-danger weight-600 font-13 d-flex align-items-center">
                          <i className="bi bi-diagram-3 mr-2"></i>
                          Sub-Tabel Turunan yang Akan Ikut Terhapus ({impactData.children.length})
                        </div>
                        <div className="card-body p-0">
                          <table className="table table-sm table-bordered mb-0 font-13">
                            <thead className="thead-light">
                              <tr>
                                <th>Nama Tabel</th>
                                <th>Kode</th>
                                <th className="text-center">Jumlah Kolom</th>
                                <th className="text-center">Jumlah Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {impactData.children.map((c) => (
                                <tr key={c.code}>
                                  <td className="weight-600">{c.name}</td>
                                  <td><code>{c.code}</code></td>
                                  <td className="text-center">{c.fieldCount} kolom</td>
                                  <td className="text-center">
                                    <span className={`badge ${c.recordCount > 0 ? 'badge-danger' : 'badge-secondary'}`}>
                                      {c.recordCount} records
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Rincian Referensi Luar jika ada */}
                    {impactData.referencedBy.length > 0 && (
                      <div className="card mb-3 border-warning">
                        <div className="card-header bg-light py-2 text-warning weight-600 font-13 d-flex align-items-center">
                          <i className="bi bi-link-45deg mr-2"></i>
                          Form Lain yang Mengambil Data dari Tabel ini ({impactData.referencedBy.length})
                        </div>
                        <div className="card-body p-0">
                          <table className="table table-sm table-bordered mb-0 font-13">
                            <thead className="thead-light">
                              <tr>
                                <th>Form Pengguna</th>
                                <th>Field / Dropdown Pengambil Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {impactData.referencedBy.map((ref, idx) => (
                                <tr key={idx}>
                                  <td className="weight-600">
                                    {ref.entityName} <code className="font-11 text-muted ml-1">({ref.entityCode})</code>
                                  </td>
                                  <td>
                                    {ref.fieldName} <code className="font-11 text-muted ml-1">({ref.fieldCode})</code>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="p-2 font-12 text-muted bg-light border-top">
                            <i className="bi bi-info-circle mr-1"></i>
                            Sumber dropdown (DARI-TABEL) pada form-form di atas akan di-reset atau tidak lagi menampilkan opsi dari tabel ini.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rincian Alur Persetujuan jika ada */}
                    {(impactData.approvalConfigs > 0 || impactData.approvalDataCount > 0) && (
                      <div className="p-2 mb-3 border rounded bg-light font-13">
                        <i className="bi bi-check2-square mr-2 text-primary"></i>
                        <strong>Alur & Riwayat Persetujuan:</strong> Menghapus{' '}
                        <span className="badge badge-info">{impactData.approvalConfigs} langkah konfigurasi persetujuan</span>{' '}
                        dan{' '}
                        <span className="badge badge-warning">{impactData.approvalDataCount} riwayat persetujuan dokumen</span>{' '}
                        terkait form ini.
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteTarget(null);
                    setImpactData(null);
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleting || loadingImpact}
                  onClick={confirmDestroyForm}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Menghapus Form & Data...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash mr-1"></i>
                      Hapus Form & Seluruh Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
