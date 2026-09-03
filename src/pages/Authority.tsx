import { useEffect, useMemo, useState } from 'react';
import {
  authorityAdminApi,
  type EmploymentStatusItem,
  type FeatureDefinitionItem,
  type RoleLevelItem,
} from '../api';

const ACTIONS = [
  ['canRead', 'Read'],
  ['canWrite', 'Write'],
  ['canEdit', 'Edit'],
  ['canDelete', 'Delete'],
  ['canImport', 'Import'],
  ['canExport', 'Export'],
  ['canSubmit', 'Submit'],
  ['canApprove', 'Approve'],
  ['canReject', 'Reject'],
  ['canViewHistory', 'History'],
  ['canRestore', 'Restore'],
] as const;

type PolicyDraft = Record<string, boolean | number | string>;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-';
}

export default function Authority() {
  const [roles, setRoles] = useState<RoleLevelItem[]>([]);
  const [features, setFeatures] = useState<FeatureDefinitionItem[]>([]);
  const [statuses, setStatuses] = useState<EmploymentStatusItem[]>([]);
  const [users, setUsers] = useState<{ id: number; nrp: string; name: string }[]>([]);
  const [selectedFeature, setSelectedFeature] = useState('HISTORICAL-DATA');
  const [selectedRole, setSelectedRole] = useState(4);
  const [draft, setDraft] = useState<PolicyDraft>({});
  const [tab, setTab] = useState<'policy' | 'roles' | 'status'>('policy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [statusForm, setStatusForm] = useState({ userId: '', roleLevel: '2', startDate: '', endDate: '' });
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat otoritas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const feature = features.find((item) => item.code === selectedFeature);
  const policy = feature?.policies.find((item) => item.roleLevel.level === selectedRole);

  useEffect(() => {
    const next: PolicyDraft = { roleLevel: selectedRole, employmentStatusCode: 'ACTIVE', scopeType: 'SELF' };
    if (policy) {
      for (const [key] of ACTIONS) next[key] = policy[key];
      next.scopeType = policy.scopeType;
    }
    setDraft(next);
  }, [selectedFeature, selectedRole, features]);

  const accessibleFeatures = useMemo(() => features.filter((item) => item.active), [features]);

  async function savePolicy() {
    if (!feature) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await authorityAdminApi.upsertPolicy(feature.code, draft);
      setMessage(`Policy ${feature.code} role ${selectedRole} tersimpan`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan policy');
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
      setMessage('Status kerja berhasil dibuat');
      setStatusForm({ userId: '', roleLevel: '2', startDate: '', endDate: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat status kerja');
    } finally {
      setSaving(false);
    }
  }

  async function createFeature() {
    if (!featureForm.code.trim() || !featureForm.name.trim()) {
      setError('Code dan nama feature wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await authorityAdminApi.createFeature(featureForm);
      setSelectedFeature(created.code);
      setFeatureForm({ code: '', name: '', route: '', icon: 'bi-grid', menuGroup: '' });
      setMessage(`Feature ${created.code} berhasil dibuat. Buat policy agar dapat dipakai user.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat feature');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="title pb-20">
        <h2 className="h3 mb-0">Otoritas Aplikasi</h2>
        <p className="text-secondary font-14 mb-0">Role, feature, policy, dan status kerja aktif</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {loading ? <div className="text-secondary">Memuat otoritas...</div> : (
        <>
          <div className="card-box mb-20">
            <div className="pd-20 pb-0">
              <ul className="nav nav-tabs">
                <li className="nav-item"><button className={`nav-link ${tab === 'policy' ? 'active' : ''}`} onClick={() => setTab('policy')}>Feature Policy</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}>Role Level</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>Status Kerja</button></li>
              </ul>
            </div>

            {tab === 'policy' && (
              <div className="pd-20">
                <div className="alert alert-light border mb-20">
                  <div className="font-14 weight-600 mb-2">Daftarkan Feature Baru</div>
                  <div className="row">
                    <div className="col-md-2 mb-2"><input className="form-control" placeholder="CODE" value={featureForm.code} onChange={(e) => setFeatureForm((v) => ({ ...v, code: e.target.value }))} /></div>
                    <div className="col-md-3 mb-2"><input className="form-control" placeholder="Nama feature" value={featureForm.name} onChange={(e) => setFeatureForm((v) => ({ ...v, name: e.target.value }))} /></div>
                    <div className="col-md-3 mb-2"><input className="form-control" placeholder="Route React" value={featureForm.route} onChange={(e) => setFeatureForm((v) => ({ ...v, route: e.target.value }))} /></div>
                    <div className="col-md-2 mb-2"><input className="form-control" placeholder="Icon" value={featureForm.icon} onChange={(e) => setFeatureForm((v) => ({ ...v, icon: e.target.value }))} /></div>
                    <div className="col-md-2 mb-2"><button className="btn btn-outline-primary btn-block" disabled={saving} onClick={createFeature}>Daftarkan</button></div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-5 mb-20">
                    <label>Feature</label>
                    <select className="form-control" value={selectedFeature} onChange={(e) => setSelectedFeature(e.target.value)}>
                      {accessibleFeatures.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
                    </select>
                  </div>
                  <div className="col-md-3 mb-20">
                    <label>Role Level</label>
                    <select className="form-control" value={selectedRole} onChange={(e) => setSelectedRole(Number(e.target.value))}>
                      {roles.map((item) => <option key={item.level} value={item.level}>{item.level} - {item.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4 mb-20">
                    <label>Status Kerja</label>
                    <input className="form-control" value="ACTIVE" disabled />
                  </div>
                </div>
                <div className="row">
                  {ACTIONS.map(([key, label]) => (
                    <div className="col-xl-3 col-lg-4 col-md-6" key={key}>
                      <div className="custom-control custom-checkbox mb-15">
                        <input id={`policy-${key}`} type="checkbox" className="custom-control-input" checked={Boolean(draft[key])} onChange={(e) => setDraft((value) => ({ ...value, [key]: e.target.checked }))} />
                        <label className="custom-control-label" htmlFor={`policy-${key}`}>{label}</label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="row align-items-end">
                  <div className="col-md-4">
                    <label>Scope Data</label>
                    <select className="form-control" value={String(draft.scopeType ?? 'SELF')} onChange={(e) => setDraft((value) => ({ ...value, scopeType: e.target.value }))}>
                      {['SELF', 'DIVISION', 'DEPARTMENT', 'PROJECT', 'COMPANY', 'ALL_COMPANIES', 'ALL_BUSINESS', 'ALL_SYSTEM'].map((scope) => <option key={scope}>{scope}</option>)}
                    </select>
                  </div>
                  <div className="col-md-8 mt-20 mt-md-0">
                    <button className="btn btn-primary" disabled={saving || !feature} onClick={savePolicy}>{saving ? 'Menyimpan...' : 'Simpan Policy'}</button>
                    <span className="text-secondary font-12 ml-2">Feature baru default tertutup sampai policy dibuat.</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'roles' && (
              <div className="pd-20 table-responsive">
                <table className="table table-striped table-hover"><thead><tr><th>Level</th><th>Code</th><th>Nama</th><th>Deskripsi</th><th>Status</th></tr></thead><tbody>
                  {roles.map((item) => <tr key={item.level}><td>{item.level}</td><td><code>{item.code}</code></td><td>{item.name}</td><td>{item.description}</td><td>{item.active ? 'Aktif' : 'Nonaktif'}</td></tr>)}
                </tbody></table>
              </div>
            )}

            {tab === 'status' && (
              <div className="pd-20">
                <div className="row mb-20">
                  <div className="col-md-3"><label>User</label><select className="form-control" value={statusForm.userId} onChange={(e) => setStatusForm((v) => ({ ...v, userId: e.target.value }))}><option value="">-- pilih user --</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nrp} - {user.name}</option>)}</select></div>
                  <div className="col-md-2"><label>Role</label><select className="form-control" value={statusForm.roleLevel} onChange={(e) => setStatusForm((v) => ({ ...v, roleLevel: e.target.value }))}>{roles.map((item) => <option key={item.level} value={item.level}>{item.level}</option>)}</select></div>
                  <div className="col-md-2"><label>Mulai</label><input type="date" className="form-control" value={statusForm.startDate} onChange={(e) => setStatusForm((v) => ({ ...v, startDate: e.target.value }))} /></div>
                  <div className="col-md-2"><label>Selesai</label><input type="date" className="form-control" value={statusForm.endDate} onChange={(e) => setStatusForm((v) => ({ ...v, endDate: e.target.value }))} /></div>
                  <div className="col-md-3 d-flex align-items-end"><button className="btn btn-primary" disabled={saving} onClick={createStatus}>Tambah Status Kerja</button></div>
                </div>
                <div className="table-responsive"><table className="table table-striped table-hover"><thead><tr><th>NRP</th><th>User</th><th>Role</th><th>Organisasi</th><th>Periode</th></tr></thead><tbody>
                  {statuses.map((item) => <tr key={item.id}><td>{item.employeeNrp}</td><td>{item.user.name}</td><td>{item.roleLevel.level} - {item.roleLevel.name}</td><td>{[item.company, item.project, item.department, item.division].filter(Boolean).map((unit) => unit!.name).join(' / ') || '-'}</td><td>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td></tr>)}
                  {statuses.length === 0 && <tr><td colSpan={5} className="text-center text-muted">Belum ada status kerja.</td></tr>}
                </tbody></table></div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
