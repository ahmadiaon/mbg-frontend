import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  eavApi,
  approvalApi,
  type BuilderEntity,
  type BuilderField,
  type EavRecord,
  type PersetujuanStep,
  type ApprovalDataRow,
} from '../api';
import { slugify } from '../profile';
import { useAuth } from '../auth';
import { useEav } from '../context/EavContext';
import DataTable from '../components/DataTable';
import { renderFieldValue, isEmployeeField } from '../eavRender';
import EmployeeCard from '../components/EmployeeCard';
import PhotoProfileCropperModal from '../components/PhotoProfileCropperModal';

type FlatRow = { __recordCode: string; __recordUuid: string } & Record<string, string>;

export default function DatabaseData() {
  const { user } = useAuth();
  const {
    entities,
    fieldShows,
    persetujuan,
    fetchMasterRecords,
    fetchSchema,
  } = useEav();

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState('');
  const [records, setRecords] = useState<EavRecord[]>([]);
  const [sourceOptions, setSourceOptions] = useState<Record<string, EavRecord[]>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [editRecordCode, setEditRecordCode] = useState<string | null>(null);
  const [actionRecord, setActionRecord] = useState<EavRecord | null>(null);
  const [actionMode, setActionMode] = useState<'show' | 'history' | 'update' | null>(null);
  const [changeTypes, setChangeTypes] = useState<Array<{ code: string; type: string; description: string }>>([]);
  const [changeTypeCode, setChangeTypeCode] = useState('');
  const [historicalValues, setHistoricalValues] = useState<Record<string, string>>({});
  const [historyRows, setHistoryRows] = useState<unknown[]>([]);
  const [familyData, setFamilyData] = useState<Record<string, unknown> | null>(null);
  const [approvalConfig, setApprovalConfig] = useState<PersetujuanStep[]>([]);
  const [approvalRows, setApprovalRows] = useState<ApprovalDataRow[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalActionBusy, setApprovalActionBusy] = useState<number | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropTargetField, setCropTargetField] = useState<string | null>(null);
  const [cropTargetEntity, setCropTargetEntity] = useState<string | null>(null);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [childFormValues, setChildFormValues] = useState<Record<string, Record<string, string>>>({});
  const [childOpen, setChildOpen] = useState<Record<string, boolean>>({});
  const [childBusy, setChildBusy] = useState<Record<string, boolean>>({});
  const formCardRef = useRef<HTMLDivElement>(null);
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

  const childEntities = useMemo(() => {
    if (!selectedEntity) return [];
    return Object.values(entities)
      .filter((e) => e.parentId === selectedEntity.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedEntity, entities]);

  const load = useCallback(() => {
    void fetchSchema();
  }, [fetchSchema]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshRecords(code: string) {
    setRecordsLoading(true);
    try {
      const recs = await eavApi.records(code);
      setRecords(recs);
    } catch {
      // ignore
    } finally {
      setRecordsLoading(false);
    }
  }

  async function selectTable(code: string) {
    setSelected(code);
    setRecords([]);
    setRecordsLoading(true);
    setFormValues({});
    setEditRecordCode(null);
    setChildFormValues({});
    setChildOpen({});
    setChildBusy({});
    setError('');
    const entity = entities[code];
    if (!entity) {
      setRecordsLoading(false);
      return;
    }

    // Ambil konfigurasi approval langsung dari EavContext (0 HTTP request!)
    const stepsMap = persetujuan[code];
    if (stepsMap) {
      setApprovalConfig(Object.values(stepsMap));
    } else {
      setApprovalConfig([]);
    }

    const allFields = Object.values(entity.fields ?? {});
    const children = Object.values(entities).filter((e) => e.parentId === entity.id);
    const allChildFields = children.flatMap((c) => Object.values(c.fields ?? {}));
    const combinedFields = [...allFields, ...allChildFields];

    const dariFields = combinedFields.filter((f) =>
      ['DARI-TABEL', 'INPUT-AUTOCOMPLITE', 'REFERENCE'].includes(
        (f.type ?? '').toUpperCase(),
      ),
    );
    const hasEmployee = combinedFields.some((f) => isEmployeeField(f));

    try {
      const [recs, srcMap] = await Promise.all([
        eavApi.records(code).catch(() => [] as EavRecord[]),
        (async () => {
          const map: Record<string, EavRecord[]> = {};
          await Promise.all([
            ...dariFields.map(async (f) => {
              const src = f.data_source?.entitySource;
              if (src && !map[src]) {
                map[src] = await fetchMasterRecords(src);
              }
            }),
            (async () => {
              if (hasEmployee && !map['KARYAWAN']) {
                map['KARYAWAN'] = await fetchMasterRecords('KARYAWAN');
              }
            })(),
          ]);
          return map;
        })(),
      ]);
      setRecords(recs);
      setSourceOptions(srcMap);
    } finally {
      setRecordsLoading(false);
    }
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
    setChildFormValues({});
    setChildOpen({});
  }

  function setChildValue(childCode: string, fieldCode: string, value: string) {
    setChildFormValues((prev) => ({
      ...prev,
      [childCode]: {
        ...(prev[childCode] ?? {}),
        [fieldCode]: value,
      },
    }));
  }

  function editRecord(r: EavRecord) {
    setFormValues({ ...r.values });
    setEditRecordCode(r.recordCode);

    if (selectedEntity) {
      const children = Object.values(entities).filter((e) => e.parentId === selectedEntity.id);
      const newChildValues: Record<string, Record<string, string>> = {};
      const newChildOpen: Record<string, boolean> = {};

      children.forEach((child, idx) => {
        const cVals: Record<string, string> = {};
        const childFields = Object.values(child.fields ?? {});
        for (const f of childFields) {
          if (r.values[f.code] !== undefined) {
            cVals[f.code] = r.values[f.code];
          }
        }
        // Pastikan field penghubung / primary child terisi dengan recordCode parent
        const linkField = childFields.find(
          (f) =>
            f.code === primaryField ||
            f.code.toUpperCase() === 'NRP' ||
            f.code === child.primaryCode,
        );
        if (linkField && !cVals[linkField.code]) {
          cVals[linkField.code] = r.recordCode;
        }
        newChildValues[child.code] = cVals;
        if (idx === 0) {
          newChildOpen[child.code] = true;
        }
      });
      setChildFormValues(newChildValues);
      setChildOpen(newChildOpen);
    }

    // Scroll form ke tampilan
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function showRecord(r: EavRecord) {
    setActionRecord(r);
    setActionMode('show');
    setFamilyData(await eavApi.family(selected, r.recordCode).catch(() => null));
    setApprovalLoading(true);
    approvalApi
      .data(selected, r.recordCode)
      .then(setApprovalRows)
      .catch(() => setApprovalRows([]))
      .finally(() => setApprovalLoading(false));
  }

  async function initApproval() {
    if (!actionRecord) return;
    const requesterNrp =
      actionRecord.values['NRP'] || actionRecord.values['nrp'] || user?.nrp;
    if (!requesterNrp) {
      alert('NRP pemohon tidak ditemukan');
      return;
    }
    setApprovalLoading(true);
    try {
      const rows = await approvalApi.init(selected, actionRecord.recordCode, requesterNrp);
      setApprovalRows(rows);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal memulai alur persetujuan');
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleApprovalAction(id: number, action: 'ACC' | 'DECLINE') {
    if (!actionRecord) return;
    setApprovalActionBusy(id);
    try {
      await approvalApi.action(id, action);
      const updated = await approvalApi.data(selected, actionRecord.recordCode);
      setApprovalRows(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal memproses persetujuan');
    } finally {
      setApprovalActionBusy(null);
    }
  }

  async function updateRecord(r: EavRecord) {
    setActionRecord(r);
    setHistoricalValues({ ...r.values });
    setChangeTypeCode('');
    setActionMode('update');
    setFamilyData(await eavApi.family(selected, r.recordCode).catch(() => null));
    const types = await eavApi.changeTypes(selected).catch(() => []);
    setChangeTypes(types);
  }

  async function showHistory(r: EavRecord) {
    setActionRecord(r);
    setActionMode('history');
    setHistoryRows(await eavApi.history(selected, r.recordCode).catch(() => []));
  }

  async function submitHistoricalUpdate() {
    if (!actionRecord || !changeTypeCode) {
      setError('Jenis perubahan wajib dipilih');
      return;
    }
    setBusy(true);
    try {
      await eavApi.historicalUpdate(selected, actionRecord.recordCode, changeTypeCode, historicalValues);
      setActionMode(null);
      setActionRecord(null);
      await refreshRecords(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat historical update');
    } finally {
      setBusy(false);
    }
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
      if (!editRecordCode && approvalConfig.length > 0) {
        const requesterNrp = cleaned['NRP'] || cleaned['nrp'] || user?.nrp;
        if (requesterNrp) {
          try {
            await approvalApi.init(selectedEntity.code, recordCode, requesterNrp);
          } catch (err) {
            console.warn('Gagal inisialisasi approval otomatis:', err);
          }
        }
      }
      resetForm();
      await refreshRecords(selectedEntity.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan data');
    } finally {
      setBusy(false);
    }
  }

  async function saveChild(childEntity: BuilderEntity) {
    const currentRecordCode = editRecordCode || (primaryField ? formValues[primaryField] : null);
    if (!currentRecordCode) {
      alert(`Pilih atau simpan data ${selectedEntity?.name ?? 'utama'} terlebih dahulu.`);
      return;
    }

    setChildBusy((prev) => ({ ...prev, [childEntity.code]: true }));
    setError('');
    try {
      const values = childFormValues[childEntity.code] || {};
      const cleaned: Record<string, string> = {};
      const childFields = Object.values(childEntity.fields ?? {});

      for (const f of childFields) {
        const val = values[f.code];
        if (val !== undefined && val !== '') {
          cleaned[f.code] = val;
        }
      }
      // Pastikan primary link field terisi
      const childLinkField = childFields.find(
        (f) =>
          f.code === primaryField ||
          f.code.toUpperCase() === 'NRP' ||
          f.code === childEntity.primaryCode,
      );
      if (childLinkField) {
        cleaned[childLinkField.code] = currentRecordCode;
      }

      await eavApi.storeRecord(childEntity.code, {
        recordCode: currentRecordCode,
        values: cleaned,
      });

      if (selectedEntity) {
        await refreshRecords(selectedEntity.code);
      }
      alert(`Data ${childEntity.name} berhasil disimpan!`);
    } catch (e) {
      alert(e instanceof Error ? e.message : `Gagal menyimpan data ${childEntity.name}`);
    } finally {
      setChildBusy((prev) => ({ ...prev, [childEntity.code]: false }));
    }
  }

  const handleApplyCrop = (croppedDataUrl: string) => {
    if (!cropTargetField) return;
    if (cropTargetEntity && selectedEntity && cropTargetEntity !== selectedEntity.code) {
      setChildValue(cropTargetEntity, cropTargetField, croppedDataUrl);
    } else {
      setValue(cropTargetField, croppedDataUrl);
    }
    setCropperOpen(false);
  };

  async function removeRecord(r: EavRecord) {
    if (!window.confirm(`Hapus data "${r.recordCode}"?`)) return;
    setBusy(true);
    setError('');
    try {
      await eavApi.deleteRecord(selected, r.recordCode);
      await refreshRecords(selected);
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
      await refreshRecords(selected);
      alert(`Import selesai: ${res.imported} data`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal import');
    } finally {
      setBusy(false);
    }
  }

  // ===== Render input form sesuai type =====
  function renderInput(
    f: BuilderField,
    val: string,
    onChange: (val: string) => void,
    isLocked = false,
    entityCode = selectedEntity?.code,
  ) {
    const type = f.type.toUpperCase();

    if (type === 'HIDDEN') return null;

    if (isLocked) {
      return (
        <div className="input-group">
          <input
            type="text"
            className="form-control bg-light text-muted"
            value={val}
            readOnly
            disabled
          />
          <div className="input-group-append">
            <span className="input-group-text bg-light text-muted font-12">
              <i className="bi bi-lock-fill mr-1"></i> Terkunci (Parent)
            </span>
          </div>
        </div>
      );
    }

    const isPhotoProfile =
      type === 'FOTO-PROFIL' ||
      type === 'FOTO PROFIL' ||
      f.name.toUpperCase().includes('FOTO PROFIL') ||
      f.code.toUpperCase().includes('FOTO-PROFIL');

    if (isPhotoProfile) {
      return (
        <div className="p-3 border rounded bg-light">
          <div className="d-flex align-items-center">
            {/* Box Preview 4:3 Potret */}
            <div
              className="mr-3 border rounded overflow-hidden shadow-sm d-flex align-items-center justify-content-center bg-white flex-shrink-0"
              style={{
                width: '75px',
                height: '100px', // rasio 3:4 (4x3 potret)
                position: 'relative',
              }}
            >
              {val ? (
                <img
                  src={val}
                  alt={f.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div className="text-center text-muted">
                  <i className="bi bi-person-bounding-box font-24"></i>
                  <div className="font-10 weight-600">4 : 3 Potret</div>
                </div>
              )}
            </div>

            <div className="flex-grow-1">
              <div className="font-13 weight-600 text-dark mb-1">
                {f.name} (Foto 4 x 3)
              </div>
              <div className="font-11 text-muted mb-2">
                Pasfoto formal rasio 4x3 (tinggi lebih panjang) dengan bantuan deteksi wajah otomatis &amp; bebas digeser.
              </div>

              <div className="d-flex flex-wrap align-items-center">
                <label className="btn btn-sm btn-outline-primary mb-0 mr-2 cursor-pointer">
                  <i className="bi bi-camera mr-1"></i> {val ? 'Ganti Foto' : 'Pilih Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setCropSourceImage(reader.result as string);
                          setCropTargetField(f.code);
                          setCropTargetEntity(entityCode ?? null);
                          setCropperOpen(true);
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>

                {val && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary mr-2"
                      onClick={() => {
                        setCropSourceImage(val);
                        setCropTargetField(f.code);
                        setCropTargetEntity(entityCode ?? null);
                        setCropperOpen(true);
                      }}
                      title="Sesuaikan ulang crop 4x3"
                    >
                      <i className="bi bi-crop mr-1"></i> Sesuaikan
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onChange('')}
                      title="Hapus foto"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

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
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    if (type === 'DATE') {
      return (
        <input
          type="date"
          className="form-control"
          value={val}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    if (type === 'DATETIME') {
      return (
        <input
          type="datetime-local"
          className="form-control"
          value={val}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    if (type === 'NOMINAL-UANG') {
      return (
        <input
          type="number"
          className="form-control"
          value={val}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    if (isEmployeeField(f)) {
      const empList = sourceOptions['KARYAWAN'] ?? [];
      const selectedEmp = empList.find(
        (r) => r.recordCode === val || r.values?.['NRP'] === val,
      );
      return (
        <div>
          {empList.length > 0 ? (
            <select
              className="form-control"
              value={val}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">-- Pilih {f.name} --</option>
              {empList.map((emp) => {
                const nama = emp.values['NAMA-KARYAWAN'] || emp.values['FULL-NAME'] || emp.recordCode;
                const jabatan = emp.values['JABATAN'] ? ` (${emp.values['JABATAN'].replace(/-/g, ' ')})` : '';
                return (
                  <option key={emp.recordCode} value={emp.recordCode}>
                    {emp.recordCode} — {nama} {jabatan}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type="text"
              className="form-control"
              placeholder={`Masukkan ${f.name} (contoh: MBLE-0422003)`}
              value={val}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {val && (
            <div className="mt-2">
              <EmployeeCard nrp={val} data={selectedEmp} mode="full" />
            </div>
          )}
        </div>
      );
    }

    if (['DARI-TABEL', 'INPUT-AUTOCOMPLITE', 'REFERENCE'].includes(type)) {
      const src = f.data_source?.entitySource;
      const fsrc = f.data_source?.fieldSource;
      const opts = sourceOptions[src ?? ''] ?? [];
      return (
        <select className="form-control" value={val} onChange={(e) => onChange(e.target.value)}>
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
        onChange={(e) => onChange(e.target.value)}
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
          </div>
        </div>

        {/* ===== Form Input ===== */}
        <div className="col-md-6 mb-30">
          <div className="card-box pd-20" ref={formCardRef}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <span className="h5 mb-0 text-primary">{selectedEntity ? selectedEntity.name : 'Detail'}</span>
                {selectedEntity && approvalConfig.length > 0 && (
                  <span className="badge badge-success ml-2" title="Form ini memiliki alur persetujuan bertingkat">
                    <i className="bi bi-shield-check mr-1"></i>
                    {approvalConfig.length} Persetujuan
                  </span>
                )}
                {childEntities.length > 0 && (
                  <span className="badge badge-info ml-2" title={`${childEntities.length} tabel child terhubung`}>
                    <i className="bi bi-diagram-3 mr-1"></i>
                    {childEntities.length} Child
                  </span>
                )}
              </div>
              {selectedEntity && (
                <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                  <i className="bi bi-plus"></i> Baru
                </button>
              )}
            </div>
            {!selectedEntity ? (
              <p className="text-secondary">Pilih tabel.</p>
            ) : (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    store();
                  }}
                >
                  {selectedFields.map((f) => (
                    <div className="form-group" key={f.code}>
                      <label className="font-14 weight-500">{f.name}</label>
                      {renderInput(
                        f,
                        formValues[f.code] ?? '',
                        (val) => setValue(f.code, val),
                        false,
                        selectedEntity.code,
                      )}
                    </div>
                  ))}
                  <div className="d-flex align-items-center">
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? 'Menyimpan…' : editRecordCode ? 'Simpan Perubahan' : 'Simpan'}
                    </button>
                    {editRecordCode && (
                      <span className="text-secondary font-12 ml-2">Mengedit: <strong>{editRecordCode}</strong></span>
                    )}
                  </div>
                </form>

                {/* ===== Child Tables Accordion ===== */}
                {childEntities.length > 0 && (
                  <div className="mt-4 pt-3 border-top">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="font-14 weight-600 text-dark">
                        <i className="bi bi-diagram-3 mr-1 text-primary"></i>
                        Tabel Child Terkait ({childEntities.length})
                      </div>
                      {editRecordCode && (
                        <span className="badge badge-info px-2 py-1 font-11">
                          Terkait: {editRecordCode}
                        </span>
                      )}
                    </div>

                    {!editRecordCode && !formValues[primaryField] && (
                      <div className="alert alert-light border font-12 text-muted py-2 mb-3">
                        <i className="bi bi-info-circle mr-1 text-primary"></i>
                        Pilih data pada tabel di bawah untuk mengisi dan mengupdate data child secara bersamaan.
                      </div>
                    )}

                    <div className="accordion" id="accordionChildTables">
                      {childEntities.map((child) => {
                        const isOpen = !!childOpen[child.code];
                        const childFields = Object.values(child.fields ?? {}).sort(
                          (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
                        );
                        const values = childFormValues[child.code] || {};
                        const isSaving = !!childBusy[child.code];

                        return (
                          <div className="card mb-2 border shadow-sm" key={child.code}>
                            <div
                              className="card-header py-2 px-3 bg-white d-flex align-items-center justify-content-between cursor-pointer"
                              style={{ cursor: 'pointer' }}
                              onClick={() =>
                                setChildOpen((prev) => ({
                                  ...prev,
                                  [child.code]: !prev[child.code],
                                }))
                              }
                            >
                              <div className="d-flex align-items-center">
                                <i className="bi bi-table text-primary mr-2"></i>
                                <span className="weight-600 font-13 text-dark mr-2">
                                  {child.name}
                                </span>
                                <span className="badge badge-pill badge-light font-11">
                                  {child.code}
                                </span>
                              </div>
                              <div className="d-flex align-items-center">
                                <span className="badge badge-secondary font-11 mr-2">
                                  {childFields.length} Field
                                </span>
                                <i
                                  className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`}
                                ></i>
                              </div>
                            </div>

                            {isOpen && (
                              <div className="card-body p-3 bg-white border-top">
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    void saveChild(child);
                                  }}
                                >
                                  {childFields.map((f) => {
                                    const isLinkField =
                                      f.code === primaryField ||
                                      f.code.toUpperCase() === 'NRP' ||
                                      f.code === child.primaryCode;
                                    const val = isLinkField
                                      ? (editRecordCode || formValues[primaryField] || '')
                                      : (values[f.code] ?? '');

                                    return (
                                      <div className="form-group mb-3" key={f.code}>
                                        <label className="font-13 weight-500 mb-1">
                                          {f.name}
                                          {isLinkField && (
                                            <span className="badge badge-warning text-dark ml-2 font-11">
                                              Primary Link
                                            </span>
                                          )}
                                        </label>
                                        {renderInput(
                                          f,
                                          val,
                                          (newVal) => setChildValue(child.code, f.code, newVal),
                                          isLinkField,
                                          child.code,
                                        )}
                                      </div>
                                    );
                                  })}

                                  <div className="d-flex align-items-center justify-content-between mt-3 pt-2 border-top">
                                    <button
                                      type="submit"
                                      className="btn btn-sm btn-primary"
                                      disabled={isSaving || (!editRecordCode && !formValues[primaryField])}
                                    >
                                      {isSaving ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm mr-1" role="status" />
                                          Menyimpan…
                                        </>
                                      ) : (
                                        <>
                                          <i className="bi bi-check-circle mr-1"></i>
                                          Simpan {child.name}
                                        </>
                                      )}
                                    </button>
                                    {editRecordCode && (
                                      <span className="text-muted font-11">
                                        Record: {editRecordCode}
                                      </span>
                                    )}
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
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
                          <button className="btn btn-sm btn-outline-secondary mr-1" title="Lihat data aktif" onClick={() => rec && showRecord(rec)}>
                            <i className="bi bi-eye"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-dark mr-1" title="Lihat parent dan child terkait" onClick={() => rec && showRecord(rec)}>
                            <i className="bi bi-diagram-3"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary mr-1"
                            onClick={() => rec && editRecord(rec)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-warning mr-1" title="Buat perubahan historical" onClick={() => rec && updateRecord(rec)}>
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-info mr-1" title="Lihat histori" onClick={() => rec && showHistory(rec)}>
                            <i className="bi bi-clock-history"></i>
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
                loading={recordsLoading}
                loadingText="Memuat data…"
                onRowClick={(row) => {
                  const rec = records.find((r) => r.recordCode === row.__recordCode);
                  if (rec) editRecord(rec);
                }}
                selectedRowKey={editRecordCode ?? undefined}
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
      {actionMode && actionRecord && (
        <div className="modal d-block" role="dialog" aria-modal="true" style={{ background: 'rgba(0,0,0,.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{actionMode === 'show' ? 'Data Aktif' : actionMode === 'update' ? 'Update Historical' : 'Riwayat Data'} — {actionRecord.recordCode}</h5>
                <button className="close" onClick={() => setActionMode(null)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                {actionMode === 'show' && (
                  <>
                    <h6 className="weight-600 mb-3 text-secondary">Data Kolom</h6>
                    {selectedFields
                      .filter((f) => f.type.toUpperCase() !== 'HIDDEN')
                      .map((field) => (
                        <div className="row border-bottom py-2" key={field.code}>
                          <div className="col-md-5 font-14 weight-600">{field.name}</div>
                          <div className="col-md-7">
                            {renderFieldValue(field, actionRecord.values[field.code], {
                              record: actionRecord.values,
                              sourceOptions,
                              fieldShows,
                            })}
                          </div>
                        </div>
                      ))}

                    {/* ALUR PERSETUJUAN */}
                    {approvalConfig.length > 0 && (
                      <div className="mt-4 pt-3 border-top">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="weight-600 mb-0 text-primary">
                            <i className="bi bi-shield-check mr-2"></i>Alur Persetujuan
                          </h6>
                          {approvalRows.length === 0 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={initApproval}
                              disabled={approvalLoading}
                            >
                              <i className="bi bi-play-circle mr-1"></i> Mulai Alur Persetujuan
                            </button>
                          )}
                        </div>

                        {approvalLoading ? (
                          <div className="py-2 text-secondary font-13">
                            <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                            Memuat data persetujuan...
                          </div>
                        ) : approvalRows.length === 0 ? (
                          <div className="alert alert-light border font-13 mb-0">
                            Belum ada alur persetujuan aktif untuk record ini. Klik &quot;Mulai Alur Persetujuan&quot; untuk memulai.
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm table-bordered">
                              <thead className="thead-light font-12">
                                <tr>
                                  <th style={{ width: 90 }}>Level</th>
                                  <th>Keterangan / Peran</th>
                                  <th>Penanda Tangan</th>
                                  <th style={{ width: 140 }}>Status</th>
                                  <th style={{ width: 160 }}>Waktu</th>
                                  <th style={{ width: 150 }} className="text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="font-13">
                                {approvalRows.map((row) => {
                                  const stepCfg = approvalConfig.find((c) => c.level === row.level);
                                  const label =
                                    stepCfg?.description?.replace(/-/g, ' ').trim() ||
                                    stepCfg?.grade ||
                                    row.level;
                                  const isPending = row.status === null;
                                  const isMe =
                                    user?.nrp === row.nrp || (user?.role !== undefined && user.role <= 2);
                                  const canAct = isPending && isMe;

                                  return (
                                    <tr key={row.id}>
                                      <td className="weight-600">{row.level}</td>
                                      <td>{label}</td>
                                      <td>
                                        <code>{row.nrp}</code>
                                        {user?.nrp === row.nrp && (
                                          <span className="badge badge-info ml-1">Anda</span>
                                        )}
                                      </td>
                                      <td>
                                        {row.status === 'ACC' ? (
                                          <span className="badge badge-success">
                                            <i className="bi bi-check-circle mr-1"></i> Disetujui
                                          </span>
                                        ) : row.status === 'DECLINE' ? (
                                          <span className="badge badge-danger">
                                            <i className="bi bi-x-circle mr-1"></i> Ditolak
                                          </span>
                                        ) : (
                                          <span className="badge badge-warning">
                                            <i className="bi bi-hourglass-split mr-1"></i> Menunggu
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-muted font-12">
                                        {row.dateChange
                                          ? new Date(row.dateChange).toLocaleString('id-ID')
                                          : '-'}
                                      </td>
                                      <td className="text-center">
                                        {canAct ? (
                                          <div className="btn-group btn-group-sm">
                                            <button
                                              type="button"
                                              className="btn btn-success btn-sm"
                                              title="Setujui (ACC)"
                                              disabled={approvalActionBusy === row.id}
                                              onClick={() => handleApprovalAction(row.id, 'ACC')}
                                            >
                                              <i className="bi bi-check-lg"></i> ACC
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-danger btn-sm"
                                              title="Tolak (DECLINE)"
                                              disabled={approvalActionBusy === row.id}
                                              onClick={() => handleApprovalAction(row.id, 'DECLINE')}
                                            >
                                              <i className="bi bi-x-lg"></i> Tolak
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-muted font-12">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {familyData && (
                      <details className="mt-3" open>
                        <summary className="font-14 weight-600">Data parent-child terkait</summary>
                        <pre className="bg-light p-2 mt-2" style={{ maxHeight: 260, overflow: 'auto' }}>
                          {JSON.stringify(familyData, null, 2)}
                        </pre>
                      </details>
                    )}
                  </>
                )}
                {actionMode === 'update' && (
                  <>
                    <div className="alert alert-info">Data kiri adalah data aktif. Ubah hanya data baru di kolom kanan.</div>
                    <div className="form-group"><label>Jenis Perubahan</label><select className="form-control" value={changeTypeCode} onChange={(e) => setChangeTypeCode(e.target.value)}><option value="">-- pilih jenis perubahan --</option>{changeTypes.map((type) => <option key={type.code} value={type.code}>{type.type} — {type.description}</option>)}</select></div>
                    <div className="row font-12 font-weight-bold border-bottom pb-2"><div className="col-md-6">Data Sebelumnya</div><div className="col-md-6">Data Perubahan</div></div>
                    {selectedFields.filter((f) => f.type.toUpperCase() !== 'HIDDEN').map((field) => <div className="row border-bottom py-2" key={field.code}><div className="col-md-6">{renderFieldValue(field, actionRecord.values[field.code], { record: actionRecord.values, sourceOptions, fieldShows })}</div><div className="col-md-6"><label className="font-12">{field.name}</label><input className="form-control form-control-sm" value={historicalValues[field.code] ?? ''} onChange={(e) => setHistoricalValues((values) => ({ ...values, [field.code]: e.target.value }))} /></div></div>)}
                  </>
                )}
                {actionMode === 'history' && (historyRows.length ? historyRows.map((item, index) => <pre className="bg-light p-2" key={index}>{JSON.stringify(item, null, 2)}</pre>) : <p className="text-muted">Belum ada histori.</p>)}
              </div>
              <div className="modal-footer">{actionMode === 'update' && <button className="btn btn-warning" disabled={busy} onClick={submitHistoricalUpdate}>{busy ? 'Mengirim...' : 'Simpan Historical Update'}</button>}<button className="btn btn-secondary" onClick={() => setActionMode(null)}>Tutup</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Cropper Foto Profil 4x3 ===== */}
      <PhotoProfileCropperModal
        isOpen={cropperOpen}
        imageSrc={cropSourceImage}
        onClose={() => {
          setCropperOpen(false);
          setCropSourceImage(null);
          setCropTargetField(null);
          setCropTargetEntity(null);
        }}
        onApplyCrop={(croppedDataUrl) => {
          handleApplyCrop(croppedDataUrl);
        }}
      />
    </div>
  );
}
