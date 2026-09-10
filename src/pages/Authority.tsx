import { useEffect, useMemo, useState } from 'react';
import {
  authorityAdminApi,
  type EmploymentStatusItem,
  type FeatureDefinitionItem,
  type RoleLevelItem,
} from '../api';

const STANDARD_ACTIONS = [
  { key: 'canRead', label: 'Read', icon: 'bi-eye', color: 'text-primary' },
  { key: 'canWrite', label: 'Write', icon: 'bi-pencil-square', color: 'text-success' },
  { key: 'canEdit', label: 'Edit', icon: 'bi-pencil', color: 'text-warning' },
  { key: 'canDelete', label: 'Delete', icon: 'bi-trash', color: 'text-danger' },
  { key: 'canImport', label: 'Import', icon: 'bi-upload', color: 'text-info' },
  { key: 'canExport', label: 'Export', icon: 'bi-download', color: 'text-secondary' },
  { key: 'canApprove', label: 'Approve', icon: 'bi-check2-circle', color: 'text-success' },
  { key: 'canViewHistory', label: 'History', icon: 'bi-clock-history', color: 'text-dark' },
] as const;

const ADVANCED_ACTIONS = [
  { key: 'canSubmit', label: 'Submit', icon: 'bi-send', color: 'text-primary' },
  { key: 'canReject', label: 'Reject', icon: 'bi-x-circle', color: 'text-danger' },
  { key: 'canRestore', label: 'Restore', icon: 'bi-arrow-counterclockwise', color: 'text-secondary' },
] as const;

const SCOPES = [
  'SELF',
  'DIVISION',
  'DEPARTMENT',
  'PROJECT',
  'COMPANY',
  'ALL_COMPANIES',
  'ALL_BUSINESS',
  'ALL_SYSTEM',
];

type PolicyRecord = {
  canRead: boolean;
  canWrite: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canViewHistory: boolean;
  canRestore: boolean;
  scopeType: string;
};

function defaultPolicy(): PolicyRecord {
  return {
    canRead: false,
    canWrite: false,
    canEdit: false,
    canDelete: false,
    canImport: false,
    canExport: false,
    canSubmit: false,
    canApprove: false,
    canReject: false,
    canViewHistory: false,
    canRestore: false,
    scopeType: 'SELF',
  };
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-';
}

export default function Authority() {
  const [roles, setRoles] = useState<RoleLevelItem[]>([]);
  const [features, setFeatures] = useState<FeatureDefinitionItem[]>([]);
  const [statuses, setStatuses] = useState<EmploymentStatusItem[]>([]);
  const [users, setUsers] = useState<{ id: number; nrp: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState(1);
  const [viewMode, setViewMode] = useState<'matrix' | 'global'>('matrix');
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'matrix' | 'roles' | 'status'>('matrix');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);

  // Draft state per modul: { [featureCode]: PolicyRecord }
  const [drafts, setDrafts] = useState<Record<string, PolicyRecord>>({});

  // Forms
  const [statusForm, setStatusForm] = useState({ userId: '', roleLevel: '1', startDate: '', endDate: '' });
  const [featureForm, setFeatureForm] = useState({ code: '', name: '', route: '', icon: 'bi-grid', menuGroup: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [roleData, featureData, statusData, userData] = await Promise.all([
        authorityAdminApi.roles(),
        authorityAdminApi.features(),
        authorityAdminApi.employmentStatuses(),
        authorityAdminApi.users(),
      ]);
      setRoles(roleData);
      setFeatures(featureData);
      setStatuses(statusData);
      setUsers(userData);
      if (roleData.length > 0 && !selectedRole) {
        setSelectedRole(roleData[0].level);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data otoritas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Sinkronkan drafts saat role yang dipilih berganti atau saat data features dimuat
  useEffect(() => {
    const next: Record<string, PolicyRecord> = {};
    for (const f of features) {
      const p = f.policies?.find((item) => item.roleLevel?.level === selectedRole);
      if (p) {
        next[f.code] = {
          canRead: Boolean(p.canRead),
          canWrite: Boolean(p.canWrite),
          canEdit: Boolean(p.canEdit),
          canDelete: Boolean(p.canDelete),
          canImport: Boolean(p.canImport),
          canExport: Boolean(p.canExport),
          canSubmit: Boolean(p.canSubmit),
          canApprove: Boolean(p.canApprove),
          canReject: Boolean(p.canReject),
          canViewHistory: Boolean(p.canViewHistory),
          canRestore: Boolean(p.canRestore),
          scopeType: p.scopeType || 'SELF',
        };
      } else {
        next[f.code] = defaultPolicy();
      }
    }
    setDrafts(next);
    setHasChanges(false);
  }, [selectedRole, features]);

  const displayedActions = useMemo(() => {
    return showAdvancedActions ? [...STANDARD_ACTIONS, ...ADVANCED_ACTIONS] : STANDARD_ACTIONS;
  }, [showAdvancedActions]);

  const filteredFeatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return features;
    return features.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        (f.route && f.route.toLowerCase().includes(q)),
    );
  }, [features, searchQuery]);

  // Handler toggle izin aksi tertentu
  function handleToggleAction(featureCode: string, actionKey: keyof PolicyRecord) {
    setDrafts((prev) => {
      const current = prev[featureCode] || defaultPolicy();
      const updated = { ...current, [actionKey]: !current[actionKey] };
      return { ...prev, [featureCode]: updated };
    });
    setHasChanges(true);
  }

  // Handler ubah scope data
  function handleScopeChange(featureCode: string, scopeType: string) {
    setDrafts((prev) => {
      const current = prev[featureCode] || defaultPolicy();
      return { ...prev, [featureCode]: { ...current, scopeType } };
    });
    setHasChanges(true);
  }

  // Preset Cepat per baris
  function applyRowPreset(featureCode: string, type: 'full' | 'read' | 'approval' | 'none') {
    setDrafts((prev) => {
      const current = prev[featureCode] || defaultPolicy();
      let updated: PolicyRecord;
      if (type === 'full') {
        updated = {
          ...current,
          canRead: true,
          canWrite: true,
          canEdit: true,
          canDelete: true,
          canImport: true,
          canExport: true,
          canSubmit: true,
          canApprove: true,
          canReject: true,
          canViewHistory: true,
          canRestore: true,
          scopeType: current.scopeType === 'SELF' ? 'DEPARTMENT' : current.scopeType,
        };
      } else if (type === 'read') {
        updated = {
          ...current,
          canRead: true,
          canWrite: false,
          canEdit: false,
          canDelete: false,
          canImport: false,
          canExport: true,
          canSubmit: false,
          canApprove: false,
          canReject: false,
          canViewHistory: true,
          canRestore: false,
        };
      } else if (type === 'approval') {
        updated = {
          ...current,
          canRead: true,
          canWrite: false,
          canEdit: false,
          canDelete: false,
          canImport: false,
          canExport: false,
          canSubmit: true,
          canApprove: true,
          canReject: true,
          canViewHistory: true,
          canRestore: false,
        };
      } else {
        updated = defaultPolicy();
      }
      return { ...prev, [featureCode]: updated };
    });
    setHasChanges(true);
  }

  // Salin wewenang dari role lain
  function copyFromRole(sourceLevel: number) {
    setDrafts((prev) => {
      const next: Record<string, PolicyRecord> = { ...prev };
      for (const f of features) {
        const p = f.policies?.find((item) => item.roleLevel?.level === sourceLevel);
        if (p) {
          next[f.code] = {
            canRead: Boolean(p.canRead),
            canWrite: Boolean(p.canWrite),
            canEdit: Boolean(p.canEdit),
            canDelete: Boolean(p.canDelete),
            canImport: Boolean(p.canImport),
            canExport: Boolean(p.canExport),
            canSubmit: Boolean(p.canSubmit),
            canApprove: Boolean(p.canApprove),
            canReject: Boolean(p.canReject),
            canViewHistory: Boolean(p.canViewHistory),
            canRestore: Boolean(p.canRestore),
            scopeType: p.scopeType || 'SELF',
          };
        } else {
          next[f.code] = defaultPolicy();
        }
      }
      return next;
    });
    setHasChanges(true);
    setMessage(`Hak akses berhasil disalin dari Role Level ${sourceLevel}. Klik 'Simpan Semua' untuk menyimpan ke database.`);
  }

  // Toggle kolom penuh sekaligus
  function toggleColumnFull(actionKey: keyof PolicyRecord) {
    const allChecked = filteredFeatures.every((f) => drafts[f.code]?.[actionKey]);
    const nextVal = !allChecked;

    setDrafts((prev) => {
      const next = { ...prev };
      for (const f of filteredFeatures) {
        next[f.code] = {
          ...(next[f.code] || defaultPolicy()),
          [actionKey]: nextVal,
        };
      }
      return next;
    });
    setHasChanges(true);
  }

  // Simpan seluruh perubahan policy untuk role yang aktif
  async function saveAllChanges() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = Object.entries(drafts).map(([featureCode, pol]) => ({
        featureCode,
        roleLevel: selectedRole,
        employmentStatusCode: 'ACTIVE',
        ...pol,
      }));

      await authorityAdminApi.upsertBatchPolicies(payload);
      setMessage(`Berhasil menyimpan seluruh kebijakan hak akses untuk Role Level ${selectedRole}!`);
      setHasChanges(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan perubahan kebijakan');
    } finally {
      setSaving(false);
    }
  }

  async function createStatus() {
    if (!statusForm.userId || !statusForm.startDate) {
      setError('User dan tanggal mulai wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await authorityAdminApi.createEmploymentStatus({
        userId: Number(statusForm.userId),
        roleLevel: Number(statusForm.roleLevel),
        startDate: statusForm.startDate,
        endDate: statusForm.endDate || undefined,
        statusCode: 'ACTIVE',
        isPrimary: true,
      });
      setMessage('Status kerja berhasil ditambahkan');
      setStatusForm({ userId: '', roleLevel: '1', startDate: '', endDate: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat status kerja');
    } finally {
      setSaving(false);
    }
  }

  async function createFeature() {
    if (!featureForm.code.trim() || !featureForm.name.trim()) {
      setError('Kode dan nama modul wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await authorityAdminApi.createFeature(featureForm);
      setShowAddFeatureModal(false);
      setFeatureForm({ code: '', name: '', route: '', icon: 'bi-grid', menuGroup: '' });
      setMessage(`Modul ${created.name} (${created.code}) berhasil didaftarkan. Silakan atur izin akses pada tabel.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mendaftarkan modul');
    } finally {
      setSaving(false);
    }
  }

  const activeRoleObj = roles.find((r) => r.level === selectedRole);

  return (
    <div className="pd-ltr-20 xs-pd-20-10">
      {/* Page Header */}
      <div className="page-header mb-20 bg-white pd-20 border-radius-8 shadow-sm border">
        <div className="row align-items-center">
          <div className="col-md-7">
            <div className="title">
              <h4 className="h4 text-blue mb-1 d-flex align-items-center gap-2">
                <i className="bi bi-shield-lock-fill text-primary mr-2"></i>
                Matriks Otoritas & Hak Akses Pengguna
              </h4>
              <p className="text-secondary font-14 mb-0">
                Kelola hak akses modul, tingkatan wewenang role, dan cakupan data langsung dari tabel interaktif.
              </p>
            </div>
          </div>
          <div className="col-md-5 text-right mt-2 mt-md-0">
            <button
              className="btn btn-outline-primary btn-sm mr-2"
              onClick={() => setShowAddFeatureModal(true)}
            >
              <i className="bi bi-plus-circle mr-1"></i> Tambah Modul Baru
            </button>
            {hasChanges && (
              <button
                className="btn btn-success btn-sm shadow-sm"
                disabled={saving}
                onClick={saveAllChanges}
              >
                <i className="bi bi-check2 mr-1"></i> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill mr-2"></i> {error}
          <button type="button" className="close" onClick={() => setError('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {message && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle-fill mr-2"></i> {message}
          <button type="button" className="close" onClick={() => setMessage('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="card-box pd-20 text-center text-secondary">
          <div className="spinner-border text-primary mr-2" role="status"></div>
          Memuat matriks otoritas sistem...
        </div>
      ) : (
        <div className="card-box mb-30 border">
          {/* Nav Tabs */}
          <div className="pd-20 pb-0 border-bottom">
            <ul className="nav nav-tabs customtab" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === 'matrix' ? 'active font-weight-bold text-primary' : ''}`}
                  onClick={() => setTab('matrix')}
                >
                  <i className="bi bi-grid-3x3-gap-fill mr-1"></i> Tabel Matriks Hak Akses
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === 'roles' ? 'active font-weight-bold text-primary' : ''}`}
                  onClick={() => setTab('roles')}
                >
                  <i className="bi bi-diagram-3-fill mr-1"></i> Tingkatan Role ({roles.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === 'status' ? 'active font-weight-bold text-primary' : ''}`}
                  onClick={() => setTab('status')}
                >
                  <i className="bi bi-people-fill mr-1"></i> Penugasan User & Status Kerja ({statuses.length})
                </button>
              </li>
            </ul>
          </div>

          {/* TAB 1: TABEL MATRIKS HAK AKSES */}
          {tab === 'matrix' && (
            <div className="pd-20">
              {/* Role Level Horizontal Selector Bar */}
              <div className="mb-20">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="font-14 font-weight-bold text-secondary">
                    <i className="bi bi-person-badge mr-1"></i> PILIH TINGKATAN ROLE:
                  </span>
                  <span className="badge badge-pill badge-primary px-3 py-1 font-13">
                    Aktif: Level {selectedRole} - {activeRoleObj?.name || 'Role'}
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2 pb-2" style={{ gap: '6px' }}>
                  {roles.map((r) => {
                    const isSelected = r.level === selectedRole;
                    return (
                      <button
                        key={r.level}
                        type="button"
                        onClick={() => setSelectedRole(r.level)}
                        className={`btn btn-sm ${
                          isSelected
                            ? 'btn-primary font-weight-bold shadow-sm'
                            : 'btn-outline-secondary bg-light text-dark'
                        }`}
                        style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '12px' }}
                      >
                        <span className={`badge ${isSelected ? 'badge-light text-primary' : 'badge-secondary'} mr-1`}>
                          {r.level}
                        </span>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="row align-items-center mb-15">
                <div className="col-md-5 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0"
                      placeholder="Cari modul / nama fitur..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <div className="input-group-append">
                        <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}>
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-7 text-md-right d-flex flex-wrap align-items-center justify-content-md-end gap-2" style={{ gap: '8px' }}>
                  {/* Salin dari Role Lain */}
                  <div className="d-flex align-items-center mr-1">
                    <span className="text-secondary font-12 mr-1">
                      <i className="bi bi-copy mr-1"></i>Salin:
                    </span>
                    <select
                      className="form-control form-control-sm font-12 bg-white"
                      style={{ width: '135px' }}
                      defaultValue=""
                      onChange={(e) => {
                        const lvl = Number(e.target.value);
                        if (lvl) {
                          copyFromRole(lvl);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>Dari Role...</option>
                      {roles.filter((r) => r.level !== selectedRole).map((r) => (
                        <option key={r.level} value={r.level}>
                          Lvl {r.level} - {r.name.length > 12 ? r.name.substring(0, 12) + '...' : r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle Aksi Lengkap */}
                  <button
                    type="button"
                    className={`btn btn-sm ${showAdvancedActions ? 'btn-info font-weight-bold text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setShowAdvancedActions(!showAdvancedActions)}
                    title="Tampilkan aksi tambahan (Submit, Reject, Restore)"
                  >
                    <i className={`bi ${showAdvancedActions ? 'bi-dash-circle' : 'bi-plus-circle'} mr-1`}></i>
                    {showAdvancedActions ? 'Aksi Standar (8)' : 'Aksi Lengkap (11)'}
                  </button>

                  {/* View Mode Switcher */}
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className={`btn ${viewMode === 'matrix' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('matrix')}
                    >
                      <i className="bi bi-table mr-1"></i> Tabel Aksi
                    </button>
                    <button
                      type="button"
                      className={`btn ${viewMode === 'global' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('global')}
                    >
                      <i className="bi bi-grid-3x3 mr-1"></i> Peta Semua Role
                    </button>
                  </div>

                  {hasChanges ? (
                    <button
                      className="btn btn-sm btn-success shadow-sm ml-2 font-weight-bold"
                      disabled={saving}
                      onClick={saveAllChanges}
                    >
                      <i className="bi bi-floppy mr-1"></i> {saving ? 'Menyimpan...' : 'Simpan Semua'}
                    </button>
                  ) : (
                    <span className="badge badge-light text-muted border px-2 py-1 font-12 ml-2">
                      <i className="bi bi-check2-all text-success mr-1"></i> Tersimpan
                    </span>
                  )}
                </div>
              </div>

              {/* VIEW 1: TABEL MATRIKS AKSI (EDITABLE PER ROLE) */}
              {viewMode === 'matrix' && (
                <div className="table-responsive border rounded bg-white shadow-sm">
                  <table className="table table-hover table-bordered mb-0 align-middle font-13">
                    <thead className="thead-light">
                      <tr className="text-center font-12 text-uppercase text-secondary">
                        <th style={{ width: '45px' }} className="py-2">No</th>
                        <th style={{ minWidth: '220px' }} className="text-left py-2">
                          Modul / Fitur Aplikasi
                        </th>
                        {displayedActions.map((act) => (
                          <th
                            key={act.key}
                            style={{ minWidth: '70px', cursor: 'pointer' }}
                            className="py-2"
                            onClick={() => toggleColumnFull(act.key)}
                            title={`Klik untuk centang / batalkan semua ${act.label}`}
                          >
                            <div className="d-flex flex-column align-items-center">
                              <span>{act.label}</span>
                              <span className="badge badge-light text-primary font-10 mt-1" style={{ fontSize: '10px' }}>
                                ⚡ Semua
                              </span>
                            </div>
                          </th>
                        ))}
                        <th style={{ minWidth: '150px' }} className="text-left py-2">Cakupan Scope</th>
                        <th style={{ minWidth: '185px' }} className="py-2">Preset Cepat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeatures.map((feat, idx) => {
                        const pol = drafts[feat.code] || defaultPolicy();
                        return (
                          <tr key={feat.code} className="hover-highlight">
                            <td className="text-center text-muted font-weight-bold">{idx + 1}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span
                                  className="avatar-sm d-flex align-items-center justify-content-center bg-light text-primary rounded mr-2"
                                  style={{ width: '32px', height: '32px', fontSize: '16px' }}
                                >
                                  <i className={`bi ${feat.icon || 'bi-grid'}`}></i>
                                </span>
                                <div>
                                  <div className="font-weight-bold text-dark">{feat.name}</div>
                                  <div className="font-11 text-muted font-monospace">
                                    <code>{feat.code}</code> {feat.route && `• ${feat.route}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Action Checkboxes */}
                            {displayedActions.map((act) => {
                              const checked = Boolean(pol[act.key]);
                              return (
                                <td
                                  key={act.key}
                                  className="text-center p-1"
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: checked ? '#ecfdf5' : undefined,
                                    transition: 'background-color 0.15s ease',
                                    userSelect: 'none',
                                  }}
                                  onClick={() => handleToggleAction(feat.code, act.key)}
                                  title={`Klik untuk ubah ${act.label} (${checked ? 'Aktif' : 'Nonaktif'})`}
                                >
                                  <div
                                    className="custom-control custom-checkbox d-inline-block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      className="custom-control-input"
                                      id={`chk-${feat.code}-${act.key}`}
                                      checked={checked}
                                      onChange={() => handleToggleAction(feat.code, act.key)}
                                    />
                                    <label
                                      className="custom-control-label"
                                      htmlFor={`chk-${feat.code}-${act.key}`}
                                      style={{ cursor: 'pointer' }}
                                    ></label>
                                  </div>
                                </td>
                              );
                            })}

                            {/* Scope Selector Dropdown */}
                            <td>
                              <select
                                className="form-control form-control-sm font-12 bg-white"
                                value={pol.scopeType || 'SELF'}
                                onChange={(e) => handleScopeChange(feat.code, e.target.value)}
                              >
                                {SCOPES.map((sc) => (
                                  <option key={sc} value={sc}>
                                    {sc}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Quick Presets */}
                            <td className="text-center p-1">
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-xs"
                                  onClick={() => applyRowPreset(feat.code, 'full')}
                                  title="Berikan Semua Akses"
                                  style={{ fontSize: '11px', padding: '2px 6px' }}
                                >
                                  Penuh
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-xs"
                                  onClick={() => applyRowPreset(feat.code, 'read')}
                                  title="Hanya Akses Baca & Ekspor"
                                  style={{ fontSize: '11px', padding: '2px 6px' }}
                                >
                                  Baca
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-info btn-xs"
                                  onClick={() => applyRowPreset(feat.code, 'approval')}
                                  title="Akses Approval (Baca, Ajukan, Setujui, Tolak)"
                                  style={{ fontSize: '11px', padding: '2px 6px' }}
                                >
                                  Appr
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-xs"
                                  onClick={() => applyRowPreset(feat.code, 'none')}
                                  title="Tutup Akses Sama Sekali"
                                  style={{ fontSize: '11px', padding: '2px 6px' }}
                                >
                                  Tutup
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredFeatures.length === 0 && (
                        <tr>
                          <td colSpan={displayedActions.length + 3} className="text-center text-muted py-4">
                            Tidak ada modul yang cocok dengan pencarian <strong>"{searchQuery}"</strong>.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 2: PETA SEMUA ROLE (GLOBAL MATRIX OVERVIEW) */}
              {viewMode === 'global' && (
                <div className="table-responsive border rounded bg-white shadow-sm">
                  <table className="table table-bordered table-hover mb-0 font-12">
                    <thead className="thead-dark">
                      <tr className="text-center text-uppercase">
                        <th style={{ minWidth: '180px' }} className="text-left py-2">Modul / Fitur</th>
                        {roles.map((r) => (
                          <th
                            key={r.level}
                            style={{ minWidth: '85px', cursor: 'pointer' }}
                            className={`py-2 ${r.level === selectedRole ? 'bg-primary text-white font-weight-bold' : ''}`}
                            onClick={() => {
                              setSelectedRole(r.level);
                              setViewMode('matrix');
                            }}
                            title={`Klik untuk edit detail Role Lvl ${r.level}`}
                          >
                            Lvl {r.level}
                            <div className="font-10 text-muted" style={{ textTransform: 'none', color: '#cbd5e1' }}>
                              {r.name.substring(0, 10)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feat) => (
                        <tr key={feat.code}>
                          <td className="font-weight-bold text-dark">
                            <i className={`bi ${feat.icon || 'bi-grid'} text-primary mr-1`}></i>
                            {feat.name}
                          </td>
                          {roles.map((r) => {
                            const p = feat.policies?.find((item) => item.roleLevel?.level === r.level);
                            const hasRead = Boolean(p?.canRead);
                            const hasWrite = Boolean(p?.canWrite);
                            const hasDelete = Boolean(p?.canDelete);
                            const hasApprove = Boolean(p?.canApprove);

                            let badgeClass = 'badge-light text-muted';
                            let label = '-';

                            if (hasRead && hasWrite && hasDelete && hasApprove) {
                              badgeClass = 'badge-success';
                              label = 'Full+Appr';
                            } else if (hasRead && hasWrite && hasDelete) {
                              badgeClass = 'badge-primary';
                              label = 'CRUD';
                            } else if (hasRead && hasWrite) {
                              badgeClass = 'badge-info';
                              label = 'Read/Write';
                            } else if (hasRead) {
                              badgeClass = 'badge-warning text-dark';
                              label = 'Read';
                            }

                            return (
                              <td
                                key={r.level}
                                className="text-center p-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedRole(r.level);
                                  setViewMode('matrix');
                                }}
                                title={`Ubah izin ${feat.name} untuk Level ${r.level}`}
                              >
                                <span className={`badge ${badgeClass} font-10 px-2 py-1`}>
                                  {label}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Petunjuk & Panduan */}
              <div className="alert alert-light border mt-20 d-flex align-items-center justify-content-between p-3 font-12 text-secondary">
                <div>
                  <span className="badge badge-info mr-2">Panduan</span>
                  Klik tombol <strong>⚡ Semua</strong> pada judul kolom untuk mencentang seluruh modul sekaligus. Gunakan tombol preset <strong>Penuh</strong> atau <strong>Baca</strong> untuk kemudahan konfigurasi per baris.
                </div>
                {hasChanges && (
                  <button
                    className="btn btn-success btn-sm shadow-sm"
                    disabled={saving}
                    onClick={saveAllChanges}
                  >
                    <i className="bi bi-floppy mr-1"></i> Simpan Perubahan
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ROLES MANAGEMENT */}
          {tab === 'roles' && (
            <div className="pd-20 table-responsive">
              <table className="table table-striped table-hover border">
                <thead className="thead-light">
                  <tr>
                    <th>Level</th>
                    <th>Kode</th>
                    <th>Nama Role</th>
                    <th>Deskripsi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((item) => (
                    <tr key={item.level}>
                      <td>
                        <span className="badge badge-primary font-12">Level {item.level}</span>
                      </td>
                      <td>
                        <code>{item.code}</code>
                      </td>
                      <td className="font-weight-bold">{item.name}</td>
                      <td className="text-muted">{item.description || '-'}</td>
                      <td>
                        <span className={`badge ${item.active ? 'badge-success' : 'badge-secondary'}`}>
                          {item.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: STATUS KERJA & PENUGASAN USER */}
          {tab === 'status' && (
            <div className="pd-20">
              <div className="card bg-light border pd-15 mb-20">
                <div className="font-weight-bold mb-2 text-dark font-14">
                  <i className="bi bi-person-plus mr-1"></i> Tambah Penugasan Status Kerja User
                </div>
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <label className="font-12 mb-1">User Karyawan</label>
                    <select
                      className="form-control form-control-sm bg-white"
                      value={statusForm.userId}
                      onChange={(e) => setStatusForm((v) => ({ ...v, userId: e.target.value }))}
                    >
                      <option value="">-- Pilih User --</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.nrp} - {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="font-12 mb-1">Tingkatan Role</label>
                    <select
                      className="form-control form-control-sm bg-white"
                      value={statusForm.roleLevel}
                      onChange={(e) => setStatusForm((v) => ({ ...v, roleLevel: e.target.value }))}
                    >
                      {roles.map((item) => (
                        <option key={item.level} value={item.level}>
                          Level {item.level} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2 mb-2">
                    <label className="font-12 mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      className="form-control form-control-sm bg-white"
                      value={statusForm.startDate}
                      onChange={(e) => setStatusForm((v) => ({ ...v, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-2 mb-2">
                    <label className="font-12 mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      className="form-control form-control-sm bg-white"
                      value={statusForm.endDate}
                      onChange={(e) => setStatusForm((v) => ({ ...v, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-2 mb-2 d-flex align-items-end">
                    <button
                      className="btn btn-primary btn-sm btn-block shadow-sm"
                      disabled={saving}
                      onClick={createStatus}
                    >
                      <i className="bi bi-save mr-1"></i> Tambahkan
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-responsive border rounded bg-white">
                <table className="table table-striped table-hover mb-0 font-13">
                  <thead className="thead-light">
                    <tr>
                      <th>NRP</th>
                      <th>Nama Karyawan</th>
                      <th>Role Ditugaskan</th>
                      <th>Unit Organisasi</th>
                      <th>Periode Wewenang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="badge badge-light border font-monospace">{item.employeeNrp}</span>
                        </td>
                        <td className="font-weight-bold">{item.user.name}</td>
                        <td>
                          <span className="badge badge-primary font-12">
                            Level {item.roleLevel.level} - {item.roleLevel.name}
                          </span>
                        </td>
                        <td className="text-muted">
                          {[item.company, item.project, item.department, item.division]
                            .filter(Boolean)
                            .map((unit) => unit!.name)
                            .join(' / ') || '-'}
                        </td>
                        <td>
                          {formatDate(item.startDate)} s/d {formatDate(item.endDate)}
                        </td>
                      </tr>
                    ))}
                    {statuses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">
                          Belum ada status penugasan kerja yang tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah Modul / Feature Baru */}
      {showAddFeatureModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-16 text-white">
                  <i className="bi bi-grid-plus mr-2"></i> Daftarkan Modul / Feature Baru
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setShowAddFeatureModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body pd-20">
                <div className="form-group mb-3">
                  <label className="font-13 font-weight-bold">Kode Modul (Huruf Kapital & Strip)</label>
                  <input
                    className="form-control font-monospace text-uppercase"
                    placeholder="Contoh: WATER-LEVEL"
                    value={featureForm.code}
                    onChange={(e) => setFeatureForm((v) => ({ ...v, code: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="font-13 font-weight-bold">Nama Modul</label>
                  <input
                    className="form-control"
                    placeholder="Contoh: Monitoring Ketinggian Air"
                    value={featureForm.name}
                    onChange={(e) => setFeatureForm((v) => ({ ...v, name: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="font-13 font-weight-bold">Route React / URL</label>
                  <input
                    className="form-control font-monospace"
                    placeholder="Contoh: /water-level"
                    value={featureForm.route}
                    onChange={(e) => setFeatureForm((v) => ({ ...v, route: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="font-13 font-weight-bold">Icon Bootstrap</label>
                  <input
                    className="form-control"
                    placeholder="Contoh: bi-water atau bi-grid"
                    value={featureForm.icon}
                    onChange={(e) => setFeatureForm((v) => ({ ...v, icon: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddFeatureModal(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm shadow-sm"
                  disabled={saving}
                  onClick={createFeature}
                >
                  {saving ? 'Mendaftarkan...' : 'Daftarkan Modul'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
