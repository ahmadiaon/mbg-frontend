import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import {
  organizationApi,
  type OrgEmployeeLookupItem,
  type OrgGradeItem,
  type OrgNodeItem,
} from '../api';

const GRADE_BADGE_STYLES: Record<number, string> = {
  15: 'bg-purple-100 text-purple-800 border-purple-200',
  14: 'bg-purple-100 text-purple-800 border-purple-200',
  13: 'bg-purple-50 text-purple-700 border-purple-200',
  12: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  11: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  10: 'bg-blue-100 text-blue-900 border-blue-200',
  9: 'bg-blue-100 text-blue-800 border-blue-200',
  8: 'bg-blue-50 text-blue-800 border-blue-200',
  7: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  6: 'bg-sky-100 text-sky-800 border-sky-200',
  5: 'bg-amber-100 text-amber-900 border-amber-200',
  4: 'bg-amber-100 text-amber-800 border-amber-200',
  3: 'bg-amber-50 text-amber-700 border-amber-200',
  2: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  1: 'bg-slate-100 text-slate-700 border-slate-300',
};

function getGradeBadgeClass(grade: number) {
  return GRADE_BADGE_STYLES[grade] || 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function StrukturOrganisasi() {
  const { user, access } = useAuth();
  const userRole = user?.role ?? 1;
  const isSuperAdmin = userRole >= 14 || (access?.roleLevels?.some((l) => l >= 14) ?? false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [treeRoots, setTreeRoots] = useState<OrgNodeItem[]>([]);
  const [flatPositions, setFlatPositions] = useState<OrgNodeItem[]>([]);
  const [grades, setGrades] = useState<OrgGradeItem[]>([]);
  const [employees, setEmployees] = useState<OrgEmployeeLookupItem[]>([]);

  // UI View states
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [roleSimulator, setRoleSimulator] = useState<'admin' | 'user'>('admin');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalBusy, setModalBusy] = useState(false);

  // Form states
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('HAULING');
  const [formDivision, setFormDivision] = useState('');
  const [formCompany, setFormCompany] = useState('PT. MB');
  const [formGrade, setFormGrade] = useState<number>(1);
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formEmployeeNrp, setFormEmployeeNrp] = useState('');
  const [formSyncUserRole, setFormSyncUserRole] = useState(true);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<OrgNodeItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Can the current session edit? (SuperAdmin by token or active in simulator)
  const canEdit = isSuperAdmin && roleSimulator === 'admin';

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [treeRes, gradesRes, employeesRes] = await Promise.all([
        organizationApi.tree({
          company: companyFilter !== 'ALL' ? companyFilter : undefined,
          department: deptFilter !== 'ALL' ? deptFilter : undefined,
          search: search.trim() || undefined,
        }),
        organizationApi.grades().catch(() => []),
        organizationApi.employeesLookup().catch(() => []),
      ]);

      setTreeRoots(treeRes.roots || []);
      setFlatPositions(treeRes.flatList || []);
      setGrades(gradesRes);
      setEmployees(employeesRes);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat struktur organisasi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyFilter, deptFilter]);

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    flatPositions.forEach((p) => {
      if (p.department) set.add(p.department.toUpperCase());
    });
    return Array.from(set).sort();
  }, [flatPositions]);

  // Filtered list for table view
  const filteredFlatList = useMemo(() => {
    return flatPositions.filter((p) => {
      if (companyFilter !== 'ALL' && p.company !== 'ALL' && p.company !== companyFilter) return false;
      if (deptFilter !== 'ALL' && p.department?.toUpperCase() !== deptFilter.toUpperCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDept = p.department?.toLowerCase().includes(q) ?? false;
        const matchPerson = p.employeeName?.toLowerCase().includes(q) ?? false;
        const matchNrp = p.employeeNrp?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchDept && !matchPerson && !matchNrp) return false;
      }
      return true;
    });
  }, [flatPositions, companyFilter, deptFilter, search]);

  function handleOpenCreate(parentId?: number | null) {
    setModalMode('create');
    setSelectedNodeId(null);
    setFormTitle('');
    setFormDept(deptFilter !== 'ALL' ? deptFilter : 'HAULING');
    setFormDivision('');
    setFormCompany(companyFilter !== 'ALL' ? companyFilter : 'PT. MB');
    setFormGrade(1);
    setFormParentId(parentId ?? null);
    setFormEmployeeNrp('');
    setFormSyncUserRole(true);
    setEditModalOpen(true);
  }

  function handleOpenEdit(node: OrgNodeItem) {
    setModalMode('edit');
    setSelectedNodeId(node.id);
    setFormTitle(node.title);
    setFormDept(node.department || 'HAULING');
    setFormDivision(node.division || '');
    setFormCompany(node.company || 'PT. MB');
    setFormGrade(node.grade);
    setFormParentId(node.parentId);
    setFormEmployeeNrp(node.employeeNrp || '');
    setFormSyncUserRole(true);
    setEditModalOpen(true);
  }

  async function handleSaveNode(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Nama Jabatan wajib diisi');
      return;
    }

    setModalBusy(true);
    try {
      if (modalMode === 'create') {
        await organizationApi.createNode({
          title: formTitle.trim(),
          department: formDept || undefined,
          division: formDivision || undefined,
          company: formCompany,
          grade: Number(formGrade),
          parentId: formParentId,
          employeeNrp: formEmployeeNrp || null,
          syncUserRole: formSyncUserRole,
        });
        setSuccessMsg('Posisi baru dan Grade berhasil disimpan');
      } else if (selectedNodeId) {
        await organizationApi.updateNode(selectedNodeId, {
          title: formTitle.trim(),
          department: formDept || undefined,
          division: formDivision || undefined,
          company: formCompany,
          grade: Number(formGrade),
          parentId: formParentId,
          employeeNrp: formEmployeeNrp || null,
          syncUserRole: formSyncUserRole,
        });
        setSuccessMsg('Perubahan posisi & Grade berhasil diperbarui');
      }

      setEditModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  function handleOpenDelete(node: OrgNodeItem) {
    setNodeToDelete(node);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!nodeToDelete) return;
    setDeleteBusy(true);
    try {
      await organizationApi.deleteNode(nodeToDelete.id);
      setDeleteModalOpen(false);
      setNodeToDelete(null);
      setSuccessMsg('Posisi berhasil dihapus');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Gagal menghapus posisi: ' + (err?.message || 'Error'));
    } finally {
      setDeleteBusy(false);
    }
  }

  // Recursive tree card renderer
  function renderTreeNode(node: OrgNodeItem, level = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const isTop = level === 0;
    const isGm = level === 1;

    let cardBorder = 'border-slate-200 hover:border-blue-400';
    let cardBg = 'bg-white';
    let topBarBg = 'bg-blue-500';

    if (node.grade >= 13) {
      cardBorder = 'border-purple-300 hover:border-purple-500 shadow-md';
      cardBg = 'bg-gradient-to-b from-purple-50/50 to-white';
      topBarBg = 'bg-gradient-to-r from-purple-600 to-indigo-600';
    } else if (node.grade >= 10) {
      cardBorder = 'border-indigo-300 hover:border-indigo-500 shadow-sm';
      cardBg = 'bg-gradient-to-b from-indigo-50/40 to-white';
      topBarBg = 'bg-indigo-600';
    } else if (node.grade >= 6) {
      cardBorder = 'border-blue-200 hover:border-blue-400 shadow-sm';
      cardBg = 'bg-white';
      topBarBg = 'bg-blue-600';
    }

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          className={`relative group rounded-2xl p-4 transition-all duration-200 border-2 ${cardBorder} ${cardBg} ${
            isTop ? 'w-80' : isGm ? 'w-80' : 'w-72'
          }`}
        >
          {/* Top color accent strip */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${topBarBg}`} />

          {/* Header & Grade Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wide ${getGradeBadgeClass(
                node.grade
              )}`}
            >
              Grade {node.grade} • {node.gradeName}
            </span>
            {node.department && (
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {node.department}
              </span>
            )}
          </div>

          {/* Job Title */}
          <h4 className="text-sm font-bold text-slate-900 leading-snug">{node.title}</h4>

          {/* Employee Assigned */}
          <div className="flex items-center gap-2.5 mt-2.5 pt-2 border-t border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shadow-inner">
              {node.employeeName
                ? node.employeeName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : '—'}
            </div>
            <div className="text-xs leading-tight overflow-hidden">
              {node.employeeName ? (
                <>
                  <p className="font-bold text-slate-800 truncate" title={node.employeeName}>
                    {node.employeeName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">{node.employeeNrp}</p>
                </>
              ) : (
                <p className="text-slate-400 italic text-[11px]">(Belum ada pejabat)</p>
              )}
            </div>
          </div>

          {/* Superadmin Actions */}
          {canEdit && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-medium">
                {node.company || 'MBG'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(node)}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[11px] transition"
                  title="Edit Posisi & Grade"
                >
                  ✏️ Edit Grade
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreate(node.id)}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition"
                  title="Tambah Bawahan Langsung"
                >
                  ➕
                </button>
                {node.grade < 14 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(node)}
                    className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[11px] transition"
                    title="Hapus Posisi"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Child branches */}
        {hasChildren && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical connector down from parent card */}
            <div className="w-0.5 h-6 bg-slate-300" />

            {/* If more than 1 child, horizontal bar spanning children */}
            {node.children!.length > 1 && (
              <div
                className="h-0.5 bg-slate-300 mb-6"
                style={{
                  width: `calc(100% - ${100 / node.children!.length}%)`,
                }}
              />
            )}

            {/* Children grid */}
            <div
              className={`flex items-start justify-center gap-6 flex-wrap ${
                node.children!.length === 1 ? 'pt-0' : ''
              }`}
            >
              {node.children!.map((child) => renderTreeNode(child, level + 1))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
          <strong>Sukses!</strong> {successMsg}
          <button
            type="button"
            className="close"
            onClick={() => setSuccessMsg('')}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
          <strong>Perhatian:</strong> {error}
          <button
            type="button"
            className="close"
            onClick={() => setError('')}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="card-box pd-20 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20">
              🌳
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Struktur Organisasi & Manajemen Grade
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bagan Rantai Komando, Penentuan Grade / Role Level (1–15), dan Penugasan Karyawan
              </p>
            </div>
          </div>

          {/* Quick Action & Simulation Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Superadmin Simulation Pill */}
            {isSuperAdmin && (
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-semibold">
                <span className="px-2 text-slate-500">Pratinjau:</span>
                <button
                  type="button"
                  onClick={() => setRoleSimulator('user')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    roleSimulator === 'user'
                      ? 'bg-white text-blue-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👤 Karyawan (View)
                </button>
                <button
                  type="button"
                  onClick={() => setRoleSimulator('admin')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    roleSimulator === 'admin'
                      ? 'bg-white text-blue-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👑 Superadmin (Edit)
                </button>
              </div>
            )}

            {/* Add position button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenCreate(null)}
                className="btn btn-primary btn-sm rounded-lg flex items-center gap-1.5 font-semibold shadow-sm"
              >
                <span>➕</span>
                <span>Tambah Posisi</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline-secondary btn-sm rounded-lg"
              title="Muat Ulang Data"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & VIEW SWITCHER BAR */}
      <div className="card-box pd-15 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Perusahaan */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Perusahaan:
            </span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="form-control form-control-sm text-xs font-semibold rounded-lg"
              style={{ width: 'auto' }}
            >
              <option value="ALL">Semua Perusahaan</option>
              <option value="PT. MB">PT. Mitra Barito (PT. MB)</option>
              <option value="PT. SRI">PT. SRI</option>
              <option value="PT. MBLE">PT. MBLE</option>
              <option value="CV. BK">CV. Bunda Kandung</option>
            </select>
          </div>

          {/* Departemen */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Departemen:
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="form-control form-control-sm text-xs font-semibold rounded-lg"
              style={{ width: 'auto' }}
            >
              <option value="ALL">Semua Departemen</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Jabatan / Karyawan / NRP..."
              className="form-control form-control-sm text-xs rounded-lg pl-7"
            />
            <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* View Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'tree'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🌳</span> Bagan Pohon
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span> Tabel Kelola Grade
          </button>
        </div>
      </div>

      {/* GRADE LEGEND INFO BAR */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-blue-900 font-bold">
          <span>⚡ Tingkatan Grade (Role Level 1–15):</span>
          <span className="text-slate-600 font-normal hidden md:inline">
            Menentukan batas wewenang & level persetujuan (approval flow):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Grade 13-15: Direksi/Superuser
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            Grade 10-12: GM / Kepala PT
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Grade 6-8: Kepala Dept / Project
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Grade 3-5: Koordinator / Admin
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Grade 2: Group Leader
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Grade 1: Pelaksana/Crew
          </span>
        </div>
      </div>

      {/* LOADING SPINNER */}
      {loading ? (
        <div className="card-box pd-30 text-center text-slate-500 py-16">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Memuat struktur...</span>
          </div>
          <p className="mt-2 text-xs font-semibold">Memuat struktur organisasi & data Grade...</p>
        </div>
      ) : viewMode === 'tree' ? (
        /* VIEW 1: ORGANIZATIONAL TREE CHART */
        <div className="card-box pd-20 border border-slate-200 overflow-x-auto min-h-[600px] relative">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>
                Total Posisi Terdaftar: <strong>{flatPositions.length} Posisi</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                  canEdit
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {canEdit
                  ? '👑 Mode Superadmin: Klik tombol Edit Grade pada kartu untuk mengelola'
                  : '👤 Mode Tampilan Publik (Hanya Baca)'}
              </span>
            </div>
          </div>

          {/* Tree Roots Container */}
          <div className="min-w-[1000px] flex flex-col items-center py-4 space-y-8">
            {treeRoots.length > 0 ? (
              treeRoots.map((rootNode) => renderTreeNode(rootNode, 0))
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm font-semibold">
                  Tidak ada data struktur yang sesuai dengan filter.
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreate(null)}
                    className="mt-3 btn btn-primary btn-sm rounded-lg"
                  >
                    ➕ Tambah Posisi Utama
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: TABLE / LIST MANAGEMENT VIEW */
        <div className="card-box pd-20 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Matriks Posisi, Grade, & Pejabat Aktif
              </h3>
              <p className="text-xs text-slate-500">
                Kelola Grade dan pemegang jabatan secara cepat dalam bentuk daftar tabel
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenCreate(null)}
                className="btn btn-primary btn-sm rounded-lg font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>➕</span>
                <span>Tambah Jabatan Baru</span>
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover text-xs">
              <thead className="thead-light uppercase tracking-wider text-slate-600 font-bold">
                <tr>
                  <th>Nama Jabatan</th>
                  <th>Departemen / Divisi</th>
                  <th>Perusahaan</th>
                  <th>Atasan Langsung</th>
                  <th>Grade / Role Level</th>
                  <th>Pejabat Aktif</th>
                  {canEdit && <th className="text-center">Aksi Manajemen</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFlatList.length > 0 ? (
                  filteredFlatList.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-50/70 transition">
                      <td className="font-bold text-slate-900 flex items-center gap-2 py-3">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {pos.title}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-700">
                          {pos.department || '-'}
                        </span>
                        {pos.division && (
                          <span className="text-[10px] text-slate-500 ml-1">({pos.division})</span>
                        )}
                      </td>
                      <td className="py-3 font-medium text-slate-600">{pos.company || 'ALL'}</td>
                      <td className="py-3 text-slate-700 font-medium">
                        {pos.parentTitle || <span className="text-slate-400 italic">- Top Level -</span>}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold border ${getGradeBadgeClass(
                            pos.grade
                          )}`}
                        >
                          Grade {pos.grade} • {pos.gradeName}
                        </span>
                      </td>
                      <td className="py-3">
                        {pos.employeeName ? (
                          <div>
                            <div className="font-bold text-slate-800">{pos.employeeName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {pos.employeeNrp}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">(Belum ada pejabat)</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(pos)}
                              className="btn btn-outline-primary btn-xs rounded"
                              title="Edit Posisi & Grade"
                            >
                              ✏️ Edit
                            </button>
                            {pos.grade < 14 && (
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(pos)}
                                className="btn btn-outline-danger btn-xs rounded"
                                title="Hapus Posisi"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Tidak ada posisi yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: KELOLA POSISI & PENENTUAN GRADE */}
      {editModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-slate-50 border-b border-slate-100 py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    ⚙️
                  </div>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-slate-900">
                      {modalMode === 'create'
                        ? 'Tambah Posisi Baru & Tentukan Grade'
                        : 'Kelola Posisi & Penentuan Grade'}
                    </h5>
                    <p className="text-[11px] text-slate-500 mb-0">
                      Atur garis atasan-bawahan dan level wewenang jabatan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={() => setEditModalOpen(false)}
                  disabled={modalBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveNode}>
                <div className="modal-body p-4 space-y-3.5 text-xs">
                  {/* Nama Jabatan */}
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">
                      Nama Jabatan / Posisi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Foreman Hauling / Operator Dump Truck"
                      className="form-control form-control-sm text-xs rounded-lg font-semibold"
                      required
                    />
                  </div>

                  {/* Departemen & Divisi */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Departemen</label>
                      <input
                        type="text"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value.toUpperCase())}
                        placeholder="Contoh: HAULING"
                        className="form-control form-control-sm text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Divisi (Opsional)</label>
                      <input
                        type="text"
                        value={formDivision}
                        onChange={(e) => setFormDivision(e.target.value.toUpperCase())}
                        placeholder="Contoh: PORT / PIT"
                        className="form-control form-control-sm text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Perusahaan & Atasan Langsung */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Perusahaan</label>
                      <select
                        value={formCompany}
                        onChange={(e) => setFormCompany(e.target.value)}
                        className="form-control form-control-sm text-xs rounded-lg font-medium"
                      >
                        <option value="PT. MB">PT. Mitra Barito (PT. MB)</option>
                        <option value="PT. SRI">PT. SRI</option>
                        <option value="PT. MBLE">PT. MBLE</option>
                        <option value="CV. BK">CV. Bunda Kandung</option>
                        <option value="ALL">Semua / Group</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">
                        Atasan Langsung (Reports To)
                      </label>
                      <select
                        value={formParentId ?? ''}
                        onChange={(e) =>
                          setFormParentId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="form-control form-control-sm text-xs rounded-lg"
                      >
                        <option value="">-- Paling Atas (Direksi / Root) --</option>
                        {flatPositions
                          .filter((p) => modalMode === 'create' || p.id !== selectedNodeId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title} ({p.department || 'MBG'} - Grade {p.grade})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* PENENTUAN GRADE (FITUR KUNCI) */}
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-blue-900 flex items-center gap-1.5 mb-0 text-xs">
                        <span>⚡</span>
                        <span>TENTUKAN GRADE JABATAN (ROLE LEVEL 1–15):</span>
                      </label>
                      <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-1.5 py-0.5 rounded">
                        Sinkron Otoritas
                      </span>
                    </div>

                    <select
                      value={formGrade}
                      onChange={(e) => setFormGrade(Number(e.target.value))}
                      className="form-control form-control-sm text-xs font-bold text-blue-900 border-blue-300 rounded-lg bg-white"
                    >
                      {grades.length > 0 ? (
                        grades.map((g) => (
                          <option key={g.level} value={g.level}>
                            Grade {g.level}: {g.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="1">Grade 1: Karyawan / Crew Pelaksana</option>
                          <option value="2">Grade 2: Group Leader / Foreman</option>
                          <option value="3">Grade 3: Admin Divisi</option>
                          <option value="4">Grade 4: Koordinator Divisi</option>
                          <option value="5">Grade 5: Admin Departemen</option>
                          <option value="6">Grade 6: Kepala Departemen</option>
                          <option value="7">Grade 7: Admin Project</option>
                          <option value="8">Grade 8: Kepala Project</option>
                          <option value="9">Grade 9: Admin/Staf Perusahaan</option>
                          <option value="10">Grade 10: Kepala Perusahaan</option>
                          <option value="11">Grade 11: Staf HO</option>
                          <option value="12">Grade 12: Kepala / General Manager</option>
                          <option value="13">Grade 13: Owner / Direksi</option>
                          <option value="14">Grade 14: Super User</option>
                          <option value="15">Grade 15: Super User Utama</option>
                        </>
                      )}
                    </select>

                    <p className="text-[11px] text-blue-700 leading-snug mb-0">
                      💡 <em>Otomatisasi:</em> Menentukan grade ini akan langsung menetapkan wewenang
                      approval dan tingkatan akses untuk karyawan yang menduduki jabatan ini.
                    </p>
                  </div>

                  {/* Pejabat yang Ditugaskan */}
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">
                      Pejabat yang Ditugaskan (Karyawan Aktif)
                    </label>
                    <select
                      value={formEmployeeNrp}
                      onChange={(e) => setFormEmployeeNrp(e.target.value)}
                      className="form-control form-control-sm text-xs rounded-lg font-medium"
                    >
                      <option value="">-- Belum Ditugaskan / Lowong --</option>
                      {employees.map((emp) => (
                        <option key={emp.nrp} value={emp.nrp}>
                          {emp.name} (NRP: {emp.nrp} - Role {emp.currentRole})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sync User Role Option */}
                  <div className="flex items-center gap-2 pt-1 text-slate-700">
                    <input
                      type="checkbox"
                      id="syncUserRoleCheck"
                      checked={formSyncUserRole}
                      onChange={(e) => setFormSyncUserRole(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="syncUserRoleCheck"
                      className="text-[11px] font-medium cursor-pointer mb-0"
                    >
                      Sinkronkan langsung <strong>Role User Login</strong> karyawan bersangkutan
                      mengikuti Grade jabatan ini.
                    </label>
                  </div>
                </div>

                <div className="modal-footer bg-slate-50 border-t border-slate-100 py-2.5 px-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="btn btn-secondary btn-sm rounded-lg"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded-lg font-semibold shadow-sm"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI HAPUS POSISI */}
      {deleteModalOpen && nodeToDelete && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                  ⚠️
                </div>
                <div>
                  <h5 className="modal-title text-sm font-bold text-slate-900">
                    Hapus Posisi Struktur
                  </h5>
                  <p className="text-xs text-slate-500 mb-0">
                    Apakah Anda yakin ingin menghapus posisi ini?
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 mb-4">
                <p>
                  <strong>Jabatan:</strong> {nodeToDelete.title}
                </p>
                <p>
                  <strong>Departemen:</strong> {nodeToDelete.department || '-'}
                </p>
                <p>
                  <strong>Grade:</strong> Level {nodeToDelete.grade} ({nodeToDelete.gradeName})
                </p>
                {nodeToDelete.employeeName && (
                  <p>
                    <strong>Pejabat Aktif:</strong> {nodeToDelete.employeeName} (
                    {nodeToDelete.employeeNrp})
                  </p>
                )}
                <p className="text-[11px] text-amber-700 font-medium pt-1">
                  Catatan: Setiap bawahan langsung dari posisi ini akan otomatis dihubungkan ke
                  atasan di atasnya agar hierarki tidak putus.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="btn btn-secondary btn-sm rounded-lg"
                  disabled={deleteBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="btn btn-danger btn-sm rounded-lg font-semibold"
                  disabled={deleteBusy}
                >
                  {deleteBusy ? 'Menghapus...' : '🗑️ Ya, Hapus Posisi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
