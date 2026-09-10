import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import {
  organizationApi,
  type OrgEmployeeLookupItem,
  type OrgGradeItem,
  type OrgNodeItem,
} from '../api';

// Konfigurasi Tema Estetika per Tingkatan Grade (1–15)
const GRADE_CONFIG: Record<
  number,
  {
    gradient: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    avatarBg: string;
    avatarText: string;
    label: string;
  }
> = {
  15: {
    gradient: 'from-purple-700 via-indigo-700 to-purple-800',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-950',
    badgeBorder: 'border-purple-300',
    avatarBg: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-purple-200',
    avatarText: 'text-white',
    label: 'Super User Utama',
  },
  14: {
    gradient: 'from-purple-600 to-indigo-600',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    avatarBg: 'bg-purple-600 text-white',
    avatarText: 'text-white',
    label: 'Super User',
  },
  13: {
    gradient: 'from-purple-500 to-indigo-500',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    avatarBg: 'bg-purple-500 text-white',
    avatarText: 'text-white',
    label: 'Owner / Direksi',
  },
  12: {
    gradient: 'from-indigo-600 via-blue-700 to-indigo-700',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-950',
    badgeBorder: 'border-indigo-300',
    avatarBg: 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white',
    avatarText: 'text-white',
    label: 'Kepala / GM',
  },
  11: {
    gradient: 'from-indigo-500 to-blue-600',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    avatarBg: 'bg-indigo-500 text-white',
    avatarText: 'text-white',
    label: 'Staf HO',
  },
  10: {
    gradient: 'from-blue-600 to-cyan-700',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-950',
    badgeBorder: 'border-blue-300',
    avatarBg: 'bg-blue-600 text-white',
    avatarText: 'text-white',
    label: 'Kepala Perusahaan',
  },
  9: {
    gradient: 'from-blue-500 to-sky-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    avatarBg: 'bg-blue-500 text-white',
    avatarText: 'text-white',
    label: 'Admin Perusahaan',
  },
  8: {
    gradient: 'from-blue-500 to-teal-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    avatarBg: 'bg-teal-600 text-white',
    avatarText: 'text-white',
    label: 'Kepala Project',
  },
  7: {
    gradient: 'from-cyan-600 to-teal-600',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-200',
    avatarBg: 'bg-cyan-600 text-white',
    avatarText: 'text-white',
    label: 'Admin Project',
  },
  6: {
    gradient: 'from-sky-600 to-blue-700',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-300',
    avatarBg: 'bg-sky-600 text-white',
    avatarText: 'text-white',
    label: 'Kepala Departemen',
  },
  5: {
    gradient: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-950',
    badgeBorder: 'border-amber-300',
    avatarBg: 'bg-amber-600 text-white',
    avatarText: 'text-white',
    label: 'Admin Departemen',
  },
  4: {
    gradient: 'from-amber-400 to-orange-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    avatarBg: 'bg-amber-500 text-white',
    avatarText: 'text-white',
    label: 'Koordinator Divisi',
  },
  3: {
    gradient: 'from-amber-400 to-yellow-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    avatarBg: 'bg-amber-400 text-slate-900',
    avatarText: 'text-slate-900',
    label: 'Admin Divisi',
  },
  2: {
    gradient: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-950',
    badgeBorder: 'border-emerald-300',
    avatarBg: 'bg-emerald-600 text-white',
    avatarText: 'text-white',
    label: 'Group Leader',
  },
  1: {
    gradient: 'from-slate-400 to-slate-500',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    avatarBg: 'bg-slate-400 text-white',
    avatarText: 'text-white',
    label: 'Karyawan / Crew',
  },
};

function getGradeConfig(grade: number) {
  return (
    GRADE_CONFIG[grade] || {
      gradient: 'from-slate-400 to-slate-500',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-800',
      badgeBorder: 'border-slate-300',
      avatarBg: 'bg-slate-400 text-white',
      avatarText: 'text-white',
      label: `Grade ${grade}`,
    }
  );
}

export default function StrukturOrganisasi() {
  const { user, access } = useAuth();
  const userRole = user?.role ?? 1;
  const isSuperAdmin = userRole >= 14 || (access?.roleLevels?.some((l) => l >= 14) ?? false);

  // Edit Mode Toggle (default on for Superadmin)
  const [editMode, setEditMode] = useState(isSuperAdmin);

  // Canvas zoom & panning
  const [zoom, setZoom] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());

  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [treeRoots, setTreeRoots] = useState<OrgNodeItem[]>([]);
  const [flatPositions, setFlatPositions] = useState<OrgNodeItem[]>([]);
  const [grades, setGrades] = useState<OrgGradeItem[]>([]);
  const [employees, setEmployees] = useState<OrgEmployeeLookupItem[]>([]);

  // Filters
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals & Action Target
  const [activeModal, setActiveModal] = useState<
    'quick-grade' | 'assign-person' | 'edit-node' | 'create-child' | 'delete' | null
  >(null);
  const [selectedNode, setSelectedNode] = useState<OrgNodeItem | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  // Form states
  const [targetGrade, setTargetGrade] = useState<number>(1);
  const [targetEmployeeNrp, setTargetEmployeeNrp] = useState<string>('');
  const [syncUserRole, setSyncUserRole] = useState<boolean>(true);

  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('HAULING');
  const [formDivision, setFormDivision] = useState('');
  const [formCompany, setFormCompany] = useState('PT. MB');
  const [formParentId, setFormParentId] = useState<number | null>(null);

  const [empSearchQuery, setEmpSearchQuery] = useState('');

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

  function notify(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  }

  function toggleCollapse(nodeId: number) {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  // Quick Grade Action
  function handleOpenQuickGrade(node: OrgNodeItem) {
    setSelectedNode(node);
    setTargetGrade(node.grade);
    setSyncUserRole(true);
    setActiveModal('quick-grade');
  }

  async function handleSaveQuickGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNode) return;
    setModalBusy(true);
    try {
      await organizationApi.updateNode(selectedNode.id, {
        grade: Number(targetGrade),
        syncUserRole,
      });
      notify(`Grade "${selectedNode.title}" berhasil diubah ke Level ${targetGrade}`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal mengubah grade: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  // Assign Person Action
  function handleOpenAssignPerson(node: OrgNodeItem) {
    setSelectedNode(node);
    setTargetEmployeeNrp(node.employeeNrp || '');
    setEmpSearchQuery('');
    setSyncUserRole(true);
    setActiveModal('assign-person');
  }

  async function handleSaveAssignPerson(nrpToAssign: string | null) {
    if (!selectedNode) return;
    setModalBusy(true);
    try {
      await organizationApi.assignEmployee(selectedNode.id, nrpToAssign, syncUserRole);
      const personName = employees.find((e) => e.nrp === nrpToAssign)?.name || 'Lowong';
      notify(`Pejabat posisi "${selectedNode.title}" berhasil diatur: ${personName}`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menetapkan karyawan: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  // Create Child Action
  function handleOpenCreateChild(parentNode: OrgNodeItem | null) {
    setSelectedNode(parentNode);
    setFormTitle('');
    setFormDept(parentNode?.department || 'HAULING');
    setFormDivision(parentNode?.division || '');
    setFormCompany(parentNode?.company || 'PT. MB');
    setTargetGrade(parentNode ? Math.max(1, parentNode.grade - 2) : 15);
    setTargetEmployeeNrp('');
    setSyncUserRole(true);
    setActiveModal('create-child');
  }

  async function handleSaveCreateChild(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Nama Jabatan wajib diisi');
      return;
    }
    setModalBusy(true);
    try {
      await organizationApi.createNode({
        title: formTitle.trim(),
        department: formDept || undefined,
        division: formDivision || undefined,
        company: formCompany,
        grade: Number(targetGrade),
        parentId: selectedNode ? selectedNode.id : null,
        employeeNrp: targetEmployeeNrp || null,
        syncUserRole,
      });
      notify(`Posisi "${formTitle.trim()}" berhasil ditambahkan ke bagan pohon!`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menambahkan posisi: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  // Full Edit Node Action
  function handleOpenEditNode(node: OrgNodeItem) {
    setSelectedNode(node);
    setFormTitle(node.title);
    setFormDept(node.department || 'HAULING');
    setFormDivision(node.division || '');
    setFormCompany(node.company || 'PT. MB');
    setFormParentId(node.parentId);
    setTargetGrade(node.grade);
    setTargetEmployeeNrp(node.employeeNrp || '');
    setSyncUserRole(true);
    setActiveModal('edit-node');
  }

  async function handleSaveEditNode(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNode || !formTitle.trim()) return;
    setModalBusy(true);
    try {
      await organizationApi.updateNode(selectedNode.id, {
        title: formTitle.trim(),
        department: formDept || undefined,
        division: formDivision || undefined,
        company: formCompany,
        grade: Number(targetGrade),
        parentId: formParentId,
        employeeNrp: targetEmployeeNrp || null,
        syncUserRole,
      });
      notify(`Perubahan posisi "${formTitle.trim()}" berhasil disimpan`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  // Delete Action
  function handleOpenDelete(node: OrgNodeItem) {
    setSelectedNode(node);
    setActiveModal('delete');
  }

  async function handleConfirmDelete() {
    if (!selectedNode) return;
    setModalBusy(true);
    try {
      await organizationApi.deleteNode(selectedNode.id);
      notify(`Posisi "${selectedNode.title}" berhasil dihapus`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menghapus posisi: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  // Filtered employees for assign dialog
  const filteredEmployees = useMemo(() => {
    if (!empSearchQuery.trim()) return employees.slice(0, 30);
    const q = empSearchQuery.toLowerCase();
    return employees
      .filter((e) => e.name.toLowerCase().includes(q) || e.nrp.toLowerCase().includes(q))
      .slice(0, 40);
  }, [employees, empSearchQuery]);

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    flatPositions.forEach((p) => {
      if (p.department) set.add(p.department.toUpperCase());
    });
    return Array.from(set).sort();
  }, [flatPositions]);

  // Highlighting when searching
  const isSearching = Boolean(search.trim());
  function matchesSearch(node: OrgNodeItem) {
    if (!isSearching) return true;
    const q = search.toLowerCase();
    return (
      node.title.toLowerCase().includes(q) ||
      (node.department && node.department.toLowerCase().includes(q)) ||
      (node.employeeName && node.employeeName.toLowerCase().includes(q)) ||
      (node.employeeNrp && node.employeeNrp.toLowerCase().includes(q))
    );
  }

  // RECURSIVE TREE CARD RENDERER
  function renderTreeNode(node: OrgNodeItem, level = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const gradeInfo = getGradeConfig(node.grade);
    const isMatch = matchesSearch(node);

    return (
      <li key={node.id}>
        {/* Top Anchor Dot */}
        <div className="w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 shadow-sm" />

        {/* PROPORTIONAL ORG CARD */}
        <div
          className={`org-node-card group relative bg-white rounded-2xl transition-all duration-200 text-left w-[260px] p-3.5 z-10 border ${
            isMatch
              ? 'border-slate-200/90 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.16)] hover:-translate-y-0.5'
              : 'opacity-30 border-dashed border-slate-300'
          } ${
            node.grade >= 14
              ? 'ring-1 ring-purple-400/50'
              : node.grade >= 10
              ? 'ring-1 ring-indigo-400/40'
              : ''
          }`}
        >
          {/* Subtle Top Accent Ribbon with rounded corners */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r ${gradeInfo.gradient}`}
          />

          {/* Card Top: Grade Badge & Department Tag */}
          <div className="flex items-center justify-between gap-1.5 mb-1.5 mt-0.5">
            {/* Grade Badge */}
            <button
              type="button"
              onClick={() => editMode && handleOpenQuickGrade(node)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider transition-all flex items-center gap-1 ${
                gradeInfo.badgeBg
              } ${gradeInfo.badgeText} ${gradeInfo.badgeBorder} ${
                editMode ? 'hover:scale-105 cursor-pointer shadow-xs' : ''
              }`}
              title={editMode ? 'Klik untuk langsung mengubah Grade posisi ini' : ''}
            >
              <span>Grade {node.grade}</span>
              <span className="text-[9px] font-normal opacity-80">• {gradeInfo.label}</span>
              {editMode && <span className="opacity-70 text-[10px]">⚡</span>}
            </button>

            {/* Department Tag */}
            {node.department && (
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[90px]">
                {node.department}
              </span>
            )}
          </div>

          {/* Job Title */}
          <div className="mt-1">
            <h4
              className="text-[13px] font-bold text-slate-900 leading-snug hover:text-blue-600 transition cursor-pointer"
              onClick={() => editMode && handleOpenEditNode(node)}
              title={editMode ? 'Klik untuk mengedit detail posisi' : ''}
            >
              {node.title}
            </h4>
            {node.division && (
              <span className="text-[9px] text-slate-500 font-mono inline-block mt-0.5">
                Divisi: {node.division}
              </span>
            )}
          </div>

          {/* Occupant / Employee Box */}
          <div
            onClick={() => editMode && handleOpenAssignPerson(node)}
            className={`mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2.5 rounded-xl p-1.5 -mx-1 transition ${
              editMode ? 'hover:bg-blue-50/70 cursor-pointer group/emp' : ''
            }`}
            title={editMode ? 'Klik untuk mengganti pejabat posisi ini' : ''}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 shadow-xs ${
                  node.employeeName
                    ? gradeInfo.avatarBg
                    : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300'
                }`}
              >
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
                    <p
                      className="font-bold text-slate-800 text-[11px] truncate tracking-tight"
                      title={node.employeeName}
                    >
                      {node.employeeName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {node.employeeNrp}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">(Posisi Lowong)</p>
                )}
              </div>
            </div>

            {editMode && (
              <span className="text-[10px] text-blue-600 opacity-0 group-hover/emp:opacity-100 font-bold shrink-0 transition">
                Ganti 👤
              </span>
            )}
          </div>

          {/* Sleek Action Footer Bar (Edit Mode) */}
          {editMode && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                {node.company || 'MBG'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenQuickGrade(node)}
                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded font-bold text-[10px] transition flex items-center gap-1 shadow-2xs"
                  title="Tentukan Grade Posisi"
                >
                  <span>⚡</span> Grade
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditNode(node)}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded font-bold text-[10px] transition flex items-center gap-1 shadow-2xs"
                  title="Edit Posisi Lengkap"
                >
                  <span>✏️</span> Edit
                </button>
                {node.grade < 14 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(node)}
                    className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] transition shadow-2xs"
                    title="Hapus Posisi"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Connector Anchor Dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 shadow-sm" />

          {/* TAMBAH BAWAHAN (+) BUTTON — cleanly centered on the connector stem */}
          {editMode && (
            <button
              type="button"
              onClick={() => handleOpenCreateChild(node)}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center text-xs shadow-md border-2 border-white hover:scale-115 transition-all z-20"
              title={`Tambah bawahan langsung untuk: ${node.title}`}
            >
              +
            </button>
          )}

          {/* COLLAPSE / EXPAND TOGGLE PILL */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              className={`absolute left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold shadow-xs whitespace-nowrap z-20 transition ${
                editMode ? '-bottom-10' : '-bottom-5'
              }`}
              title={isCollapsed ? 'Buka cabang bawahan' : 'Tutup cabang bawahan'}
            >
              {isCollapsed
                ? `▶ ${node.children!.length} Bawahan`
                : `▼ ${node.children!.length} Bawahan`}
            </button>
          )}
        </div>

        {/* RECURSIVE SUBORDINATES BRANCH */}
        {hasChildren && !isCollapsed && (
          <ul>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {/* PURE MATHEMATICAL CSS TREE CONNECTOR LINES */}
      <style>{`
        /* Blueprint Canvas Background */
        .org-canvas-blueprint {
          background-color: #f8fafc;
          background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
          background-size: 24px 24px;
        }

        /* Tree Root Container */
        .org-tree-wrapper {
          display: flex;
          justify-content: center;
          padding: 24px 40px 120px 40px;
          min-width: fit-content;
          transform-origin: top center;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .org-chart-tree, .org-chart-tree ul {
          display: flex;
          justify-content: center;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        /* Spacing between vertical generations: exactly 44px */
        .org-chart-tree ul {
          padding-top: 44px;
          position: relative;
        }

        /* Each sibling branch */
        .org-chart-tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 44px 16px 0 16px;
        }

        /* Horizontal branch bar spanning across siblings */
        .org-chart-tree li::before, .org-chart-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #64748b;
          width: 50%;
          height: 44px;
        }
        .org-chart-tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #64748b;
        }

        /* Outer curved corners for first and last siblings */
        .org-chart-tree li:first-child::before {
          border: none;
        }
        .org-chart-tree li:last-child::after {
          border: none;
        }
        .org-chart-tree li:first-child::after {
          border-radius: 12px 0 0 0;
        }
        .org-chart-tree li:last-child::before {
          border-right: 2px solid #64748b;
          border-radius: 0 12px 0 0;
        }

        /* Single Child: seamless vertical line straight down, no horizontal line */
        .org-chart-tree li:only-child {
          padding-top: 44px;
        }
        .org-chart-tree li:only-child::before, .org-chart-tree li:only-child::after {
          display: none;
        }

        /* Downward connector stem from parent card to children ul */
        .org-chart-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #64748b;
          width: 0;
          height: 44px;
          transform: translateX(-50%);
        }
      `}</style>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 alert alert-success alert-dismissible fade show shadow-2xl border border-emerald-300 py-2.5 px-4 rounded-xl flex items-center gap-2">
          <strong>✅ Berhasil:</strong> {toastMsg}
          <button type="button" className="close ml-3" onClick={() => setToastMsg('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm rounded-xl" role="alert">
          <strong>⚠️ Peringatan:</strong> {error}
          <button type="button" className="close" onClick={() => setError('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* TOP HEADER & CONTROL COCKPIT */}
      <div className="card-box pd-20 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title with icon */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20">
              🌳
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Bagan Pohon Struktur Organisasi & Manajemen Grade
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bagan Rantai Komando Proposional: Ubah Grade (1–15), Tugaskan Karyawan, dan Tambah Posisi Langsung pada Pohon
              </p>
            </div>
          </div>

          {/* Quick Actions & Canvas Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !editMode
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                👤 Lihat Bagan
              </button>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  editMode
                    ? 'bg-white text-blue-700 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>👑</span>
                <span>Edit Struktur & Grade</span>
              </button>
            </div>

            {/* Add Top Level Root Position */}
            {editMode && (
              <button
                type="button"
                onClick={() => handleOpenCreateChild(null)}
                className="btn btn-primary btn-sm rounded-xl font-bold shadow-sm flex items-center gap-1.5 px-3.5"
                title="Tambah Posisi Utama Paling Atas (Direksi / Root)"
              >
                <span>➕</span>
                <span>Tambah Posisi Utama</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="btn-group btn-group-sm border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                className="btn btn-light text-xs font-bold"
                title="Perkecil Bagan (-10%)"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="btn btn-light text-xs font-mono px-2"
                title="Reset Ukuran (100%)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                className="btn btn-light text-xs font-bold"
                title="Perbesar Bagan (+10%)"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline-secondary btn-sm rounded-xl"
              title="Muat Ulang Struktur"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & HIERARCHY SEARCH BAR */}
      <div className="card-box pd-15 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
              <option value="ALL">Semua Perusahaan (Mitra Barito Group)</option>
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
          <div className="relative min-w-[240px]">
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

        {/* Expand / Collapse All */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCollapsedNodes(new Set())}
            className="btn btn-outline-secondary btn-xs rounded-lg font-medium"
          >
            Buka Semua Cabang
          </button>
          <button
            type="button"
            onClick={() => {
              const allChildIds = new Set<number>();
              flatPositions.forEach((p) => {
                if (p.parentId) allChildIds.add(p.id);
              });
              setCollapsedNodes(allChildIds);
            }}
            className="btn btn-outline-secondary btn-xs rounded-lg font-medium"
          >
            Tutup Semua Cabang
          </button>
        </div>
      </div>

      {/* GRADE LEGEND PALETTE */}
      <div className="p-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-200/70 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-blue-950 font-bold">
          <span>⚡ Panduan Tingkatan Grade (Role Level 1–15):</span>
          <span className="text-slate-500 font-normal hidden md:inline">
            Klik tombol <strong>⚡ Grade</strong> pada kartu untuk langsung mengubah level wewenang:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
            Grade 13-15: Direksi/Superuser
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
            Grade 10-12: GM / Kepala PT
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
            Grade 6-8: Kepala Dept / Project
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            Grade 3-5: Koordinator / Admin
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
            Grade 2: Group Leader
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
            Grade 1: Pelaksana/Crew
          </span>
        </div>
      </div>

      {/* THE PROPORTIONAL ORGANIGRAM CANVAS */}
      <div className="card-box pd-20 border border-slate-200 shadow-sm overflow-auto min-h-[700px] org-canvas-blueprint relative rounded-2xl">
        {/* Status header */}
        <div className="flex justify-between items-center pb-3 mb-2 border-b border-slate-200/80 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Total Posisi di Bagan: <strong>{flatPositions.length} Posisi Struktural</strong>
            </span>
          </div>
          <div>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                editMode
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {editMode
                ? '👑 Mode Edit Aktif: Klik Grade / Pejabat / Tombol [+] di bawah kartu untuk mengubah'
                : '👤 Mode Tampilan Publik: Hanya-baca'}
            </span>
          </div>
        </div>

        {/* LOADING SPINNER */}
        {loading ? (
          <div className="text-center py-28 text-slate-500">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Memuat bagan pohon...</span>
            </div>
            <p className="mt-2 text-xs font-semibold">Menyusun bagan pohon organisasi & garis hierarki...</p>
          </div>
        ) : treeRoots.length > 0 ? (
          /* ORGANIGRAM TREE */
          <div
            className="org-tree-wrapper"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className="org-chart-tree">
              <ul>
                {treeRoots.map((rootNode) => renderTreeNode(rootNode, 0))}
              </ul>
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="text-center py-24 text-slate-400">
            <p className="text-4xl mb-2">🌳</p>
            <p className="text-sm font-semibold">
              Belum ada posisi pada bagan pohon yang sesuai dengan filter.
            </p>
            {editMode && (
              <button
                type="button"
                onClick={() => handleOpenCreateChild(null)}
                className="mt-3 btn btn-primary btn-sm rounded-xl font-bold shadow-sm"
              >
                ➕ Buat Posisi Utama (Root)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS                                                             */}
      {/* ========================================================================= */}

      {/* MODAL 1: QUICK GRADE PICKER */}
      {activeModal === 'quick-grade' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-amber-50/80 border-b border-amber-100 py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-amber-950">
                      Tentukan Grade Posisi
                    </h5>
                    <p className="text-[11px] text-amber-800 mb-0 truncate max-w-[200px]">
                      {selectedNode.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveQuickGrade}>
                <div className="modal-body p-4 space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Pilih Tingkat Grade (Role Level 1–15):
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="form-control form-control-sm font-bold text-blue-900 border-blue-300 rounded-lg"
                    >
                      {grades.length > 0 ? (
                        grades.map((g) => (
                          <option key={g.level} value={g.level}>
                            Grade {g.level}: {g.name}
                          </option>
                        ))
                      ) : (
                        Object.entries(GRADE_CONFIG).map(([lvl, info]) => (
                          <option key={lvl} value={lvl}>
                            Grade {lvl}: {info.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                    💡 Menentukan Grade di sini otomatis menetapkan wewenang approval (cuti, izin, lembur) bagi pejabat posisi ini.
                  </div>

                  {selectedNode.employeeNrp && (
                    <div className="flex items-center gap-2 pt-1 text-slate-700">
                      <input
                        type="checkbox"
                        id="syncUserRoleCheckQuick"
                        checked={syncUserRole}
                        onChange={(e) => setSyncUserRole(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label
                        htmlFor="syncUserRoleCheckQuick"
                        className="text-[11px] font-medium cursor-pointer mb-0"
                      >
                        Sinkronkan <strong>Role Akun Login</strong> karyawan ({selectedNode.employeeName})
                      </label>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-slate-50 py-2.5 px-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-xs rounded-lg"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded-lg font-bold shadow-sm"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : '💾 Simpan Grade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN PERSON DIALOG */}
      {activeModal === 'assign-person' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-blue-50/80 border-b border-blue-100 py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-blue-950">
                      Tugaskan Pejabat Posisi
                    </h5>
                    <p className="text-[11px] text-blue-700 mb-0">
                      Posisi: <strong>{selectedNode.title}</strong> (Grade {selectedNode.grade})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body p-4 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cari Nama Karyawan atau NRP:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={empSearchQuery}
                      onChange={(e) => setEmpSearchQuery(e.target.value)}
                      placeholder="Ketik minimal 2 huruf nama atau NRP..."
                      className="form-control form-control-sm text-xs rounded-lg pl-7"
                    />
                    <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-[260px] divide-y divide-slate-100">
                  <div
                    onClick={() => handleSaveAssignPerson(null)}
                    className="p-2.5 hover:bg-red-50 flex items-center justify-between cursor-pointer transition text-red-600 font-semibold"
                  >
                    <span>🚫 Kosongkan Pejabat (Posisi Lowong)</span>
                    <span className="text-[10px] bg-red-100 px-2 py-0.5 rounded font-bold">Set Lowong</span>
                  </div>

                  {filteredEmployees.map((emp) => {
                    const isCurrent = emp.nrp === selectedNode.employeeNrp;
                    return (
                      <div
                        key={emp.nrp}
                        onClick={() => handleSaveAssignPerson(emp.nrp)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          isCurrent ? 'bg-blue-50/90 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-slate-800 text-xs">{emp.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{emp.nrp}</div>
                          </div>
                        </div>
                        <div>
                          {isCurrent ? (
                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold">
                              ✓ Sedang Menjabat
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 hover:text-blue-600 font-semibold">
                              Pilih ➜
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1 text-slate-700">
                  <input
                    type="checkbox"
                    id="syncRoleAssign"
                    checked={syncUserRole}
                    onChange={(e) => setSyncUserRole(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="syncRoleAssign" className="text-[11px] font-medium cursor-pointer mb-0">
                    Sinkronkan role akun login karyawan menjadi <strong>Grade {selectedNode.grade}</strong>.
                  </label>
                </div>
              </div>

              <div className="modal-footer bg-slate-50 py-2.5 px-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary btn-sm rounded-lg"
                  disabled={modalBusy}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH BAWAHAN LANGSUNG PADA POHON */}
      {activeModal === 'create-child' && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-emerald-50/80 border-b border-emerald-100 py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">➕</span>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-emerald-950">
                      {selectedNode
                        ? `Tambah Bawahan untuk: ${selectedNode.title}`
                        : 'Tambah Posisi Utama (Root)'}
                    </h5>
                    <p className="text-[11px] text-emerald-700 mb-0">
                      Menambahkan cabang baru pada bagan pohon hierarki
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveCreateChild}>
                <div className="modal-body p-4 space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nama Posisi / Jabatan Baru <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Koordinator Pit / Foreman Hauling"
                      className="form-control form-control-sm text-xs rounded-lg font-semibold"
                      required
                      autoFocus
                    />
                  </div>

                  {selectedNode && (
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        Atasan Langsung (Reports To):
                      </span>
                      <strong className="text-slate-900 text-xs">
                        {selectedNode.title} (Grade {selectedNode.grade})
                      </strong>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Departemen</label>
                      <input
                        type="text"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value.toUpperCase())}
                        className="form-control form-control-sm text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Divisi (Opsional)</label>
                      <input
                        type="text"
                        value={formDivision}
                        onChange={(e) => setFormDivision(e.target.value.toUpperCase())}
                        className="form-control form-control-sm text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <label className="font-bold text-blue-900 block mb-0 text-xs">
                      ⚡ Tentukan Grade Posisi Baru (Level 1–15):
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="form-control form-control-sm font-bold text-blue-900 border-blue-300 rounded-lg"
                    >
                      {grades.map((g) => (
                        <option key={g.level} value={g.level}>
                          Grade {g.level}: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Pejabat Pertama (Opsional):
                    </label>
                    <select
                      value={targetEmployeeNrp}
                      onChange={(e) => setTargetEmployeeNrp(e.target.value)}
                      className="form-control form-control-sm text-xs rounded-lg"
                    >
                      <option value="">-- Belum Ditugaskan (Lowong) --</option>
                      {employees.map((emp) => (
                        <option key={emp.nrp} value={emp.nrp}>
                          {emp.name} ({emp.nrp})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-footer bg-slate-50 py-2.5 px-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-sm rounded-lg"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded-lg font-bold shadow-sm"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : '➕ Tambahkan ke Bagan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT DETAIL POSISI */}
      {activeModal === 'edit-node' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-blue-50/80 border-b border-blue-100 py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-slate-900">
                      Edit Detail Posisi & Hierarki
                    </h5>
                    <p className="text-[11px] text-slate-500 mb-0">
                      Ubah judul, atasan langsung, departemen, dan grade
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveEditNode}>
                <div className="modal-body p-4 space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nama Posisi / Jabatan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="form-control form-control-sm text-xs rounded-lg font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Atasan Langsung (Pindahkan Cabang / Reports To):
                    </label>
                    <select
                      value={formParentId ?? ''}
                      onChange={(e) =>
                        setFormParentId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="form-control form-control-sm text-xs rounded-lg font-medium"
                    >
                      <option value="">-- Paling Atas (Direksi / Root) --</option>
                      {flatPositions
                        .filter((p) => p.id !== selectedNode.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.department || 'MBG'} - Grade {p.grade})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Departemen</label>
                      <input
                        type="text"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value.toUpperCase())}
                        className="form-control form-control-sm text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Divisi</label>
                      <input
                        type="text"
                        value={formDivision}
                        onChange={(e) => setFormDivision(e.target.value.toUpperCase())}
                        className="form-control form-control-sm text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <label className="font-bold text-blue-900 block mb-0 text-xs">
                      ⚡ Grade Jabatan (Level 1–15):
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="form-control form-control-sm font-bold text-blue-900 border-blue-300 rounded-lg"
                    >
                      {grades.map((g) => (
                        <option key={g.level} value={g.level}>
                          Grade {g.level}: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Pejabat yang Ditugaskan:
                    </label>
                    <select
                      value={targetEmployeeNrp}
                      onChange={(e) => setTargetEmployeeNrp(e.target.value)}
                      className="form-control form-control-sm text-xs rounded-lg font-medium"
                    >
                      <option value="">-- Belum Ditugaskan (Lowong) --</option>
                      {employees.map((emp) => (
                        <option key={emp.nrp} value={emp.nrp}>
                          {emp.name} ({emp.nrp})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-footer bg-slate-50 py-2.5 px-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-sm rounded-lg"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded-lg font-bold shadow-sm"
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

      {/* MODAL 5: DELETE CONFIRMATION */}
      {activeModal === 'delete' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-2xl border-0 shadow-2xl p-4">
              <div className="flex items-center gap-2.5 mb-2 text-red-600 font-bold text-sm">
                <span className="text-xl">⚠️</span>
                <span>Hapus Posisi Dari Bagan?</span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Anda akan menghapus posisi <strong>{selectedNode.title}</strong> (Grade {selectedNode.grade}).
                Setiap bawahan langsung akan otomatis dihubungkan ke atasan di atasnya agar garis hierarki tetap utuh.
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary btn-xs rounded-lg"
                  disabled={modalBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="btn btn-danger btn-xs rounded-lg font-bold"
                  disabled={modalBusy}
                >
                  {modalBusy ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
