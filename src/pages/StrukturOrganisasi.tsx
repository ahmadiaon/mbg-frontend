import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import {
  organizationApi,
  type OrgEmployeeLookupItem,
  type OrgGradeItem,
  type OrgNodeItem,
} from '../api';

const GRADE_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  15: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', label: 'Super User Utama' },
  14: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'Super User' },
  13: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Owner / Direksi' },
  12: { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300', label: 'Kepala / GM' },
  11: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', label: 'Staf HO' },
  10: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', label: 'Kepala Perusahaan' },
  9: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', label: 'Admin Perusahaan' },
  8: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'Kepala Project' },
  7: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', label: 'Admin Project' },
  6: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', label: 'Kepala Departemen' },
  5: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', label: 'Admin Departemen' },
  4: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', label: 'Koordinator Divisi' },
  3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Admin Divisi' },
  2: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Group Leader' },
  1: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Karyawan / Crew' },
};

function getGradeInfo(grade: number) {
  return GRADE_COLORS[grade] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: `Grade ${grade}`,
  };
}

export default function StrukturOrganisasi() {
  const { user, access } = useAuth();
  const userRole = user?.role ?? 1;
  const isSuperAdmin = userRole >= 14 || (access?.roleLevels?.some((l) => l >= 14) ?? false);

  // Mode Edit Bagan Pohon: aktif jika user adalah Superadmin / Role >= 14
  const [editMode, setEditMode] = useState(isSuperAdmin);

  // Zoom & Canvas control
  const [zoom, setZoom] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());

  // Data states
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

  // Form inputs for modals
  const [targetGrade, setTargetGrade] = useState<number>(1);
  const [targetEmployeeNrp, setTargetEmployeeNrp] = useState<string>('');
  const [syncUserRole, setSyncUserRole] = useState<boolean>(true);

  // Form for Full Edit / Create Child
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('HAULING');
  const [formDivision, setFormDivision] = useState('');
  const [formCompany, setFormCompany] = useState('PT. MB');
  const [formParentId, setFormParentId] = useState<number | null>(null);

  // Employee search inside modal
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

  // Toggle Collapse/Expand
  function toggleCollapse(nodeId: number) {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  // Action Handlers
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
      notify(`Grade ${selectedNode.title} berhasil diubah ke Level ${targetGrade}`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal mengubah grade: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

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
      notify(`Pejabat posisi "${selectedNode.title}" berhasil diatur ke: ${personName}`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menetapkan karyawan: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  function handleOpenCreateChild(parentNode: OrgNodeItem) {
    setSelectedNode(parentNode);
    setFormTitle('');
    setFormDept(parentNode.department || 'HAULING');
    setFormDivision(parentNode.division || '');
    setFormCompany(parentNode.company || 'PT. MB');
    setTargetGrade(Math.max(1, parentNode.grade - 2)); // default lower grade
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
      notify(`Posisi bawahan "${formTitle.trim()}" berhasil ditambahkan di bagan pohon!`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menambahkan posisi: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

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
      notify(`Perubahan pada posisi "${formTitle.trim()}" berhasil disimpan`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

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

  // Recursive Tree Node Renderer for the Org Chart
  function renderTreeNode(node: OrgNodeItem, level = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const gradeInfo = getGradeInfo(node.grade);

    // Accent line on top of card
    let accentGradient = 'bg-blue-600';
    if (node.grade >= 13) accentGradient = 'bg-gradient-to-r from-purple-600 to-indigo-600';
    else if (node.grade >= 10) accentGradient = 'bg-gradient-to-r from-indigo-600 to-blue-600';
    else if (node.grade >= 6) accentGradient = 'bg-gradient-to-r from-blue-600 to-sky-500';
    else if (node.grade >= 3) accentGradient = 'bg-gradient-to-r from-amber-500 to-orange-500';
    else if (node.grade === 2) accentGradient = 'bg-emerald-500';
    else accentGradient = 'bg-slate-400';

    return (
      <li key={node.id}>
        {/* THE NODE CARD */}
        <div className="org-node-card group relative bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 text-left w-[290px] p-3.5 z-10">
          {/* Top Accent Strip */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${accentGradient}`} />

          {/* Card Header: Grade Badge & Department */}
          <div className="flex items-center justify-between gap-1.5 mb-1.5 mt-0.5">
            {/* Clickable Grade Badge */}
            <button
              type="button"
              onClick={() => editMode && handleOpenQuickGrade(node)}
              className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wide transition-all ${
                gradeInfo.bg
              } ${gradeInfo.text} ${gradeInfo.border} ${
                editMode ? 'hover:ring-2 hover:ring-blue-400 cursor-pointer' : ''
              }`}
              title={editMode ? 'Klik untuk langsung mengubah Grade posisi ini' : ''}
            >
              Grade {node.grade} • {gradeInfo.label}
              {editMode && <span className="ml-1 opacity-70">⚡</span>}
            </button>

            {node.department && (
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[100px]">
                {node.department}
              </span>
            )}
          </div>

          {/* Job Title */}
          <div className="flex items-start justify-between gap-2">
            <h4
              className="text-[13px] font-bold text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition"
              onClick={() => editMode && handleOpenEditNode(node)}
              title={editMode ? 'Klik untuk edit detail posisi' : ''}
            >
              {node.title}
            </h4>
            {node.division && (
              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono shrink-0">
                {node.division}
              </span>
            )}
          </div>

          {/* Employee Occupant Card */}
          <div
            onClick={() => editMode && handleOpenAssignPerson(node)}
            className={`mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 rounded-xl p-1.5 -mx-1 transition ${
              editMode ? 'hover:bg-blue-50/60 cursor-pointer group/emp' : ''
            }`}
            title={editMode ? 'Klik untuk mengganti / menugaskan pejabat posisi ini' : ''}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 shadow-inner ${
                  node.employeeName
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300'
                }`}
              >
                {node.employeeName
                  ? node.employeeName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                  : '👤'}
              </div>
              <div className="text-xs leading-tight overflow-hidden">
                {node.employeeName ? (
                  <>
                    <p className="font-bold text-slate-800 text-[11px] truncate" title={node.employeeName}>
                      {node.employeeName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">{node.employeeNrp}</p>
                  </>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">
                    (Lowong / Belum Ada Pejabat)
                  </p>
                )}
              </div>
            </div>

            {editMode && (
              <span className="text-[10px] text-blue-600 opacity-0 group-hover/emp:opacity-100 font-bold shrink-0">
                Ganti 👤
              </span>
            )}
          </div>

          {/* Superadmin Direct Change Action Bar */}
          {editMode && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-semibold text-slate-400">
                {node.company || 'MBG'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenQuickGrade(node)}
                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-bold text-[10px] transition flex items-center gap-0.5"
                  title="Ubah Grade Posisi"
                >
                  <span>⚡</span> Grade
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditNode(node)}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[10px] transition flex items-center gap-0.5"
                  title="Edit Detail Posisi"
                >
                  <span>✏️</span> Edit
                </button>
                {node.grade < 14 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(node)}
                    className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] transition"
                    title="Hapus Posisi Ini"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ADD SUBORDINATE BUTTON (+) directly pinned to bottom of node */}
          {editMode && (
            <button
              type="button"
              onClick={() => handleOpenCreateChild(node)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center text-xs shadow-md border-2 border-white hover:scale-110 transition z-20"
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
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 text-[9px] font-bold shadow-sm whitespace-nowrap z-20 transition"
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
      {/* ORGANIGRAM TREE CSS STYLES */}
      <style>{`
        .org-tree-wrapper {
          display: flex;
          justify-content: center;
          padding: 20px 40px 100px 40px;
          min-width: fit-content;
          transform-origin: top center;
          transition: transform 0.2s ease;
        }
        .org-tree, .org-tree ul {
          display: flex;
          justify-content: center;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .org-tree ul {
          padding-top: 36px;
          position: relative;
        }
        .org-tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 36px 16px 0 16px;
        }
        /* Top horizontal connector lines */
        .org-tree li::before, .org-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #94a3b8;
          width: 50%;
          height: 36px;
        }
        .org-tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #94a3b8;
        }
        /* Remove extra outer bar ends */
        .org-tree li:first-child::before {
          border: 0 none;
        }
        .org-tree li:last-child::after {
          border: 0 none;
        }
        .org-tree li:first-child::after {
          border-radius: 10px 0 0 0;
        }
        .org-tree li:last-child::before {
          border-right: 2px solid #94a3b8;
          border-radius: 0 10px 0 0;
        }
        /* Single child has no horizontal cross bar */
        .org-tree li:only-child {
          padding-top: 28px;
        }
        .org-tree li:only-child::before, .org-tree li:only-child::after {
          display: none;
        }
        /* Vertical line from parent node down to child ul */
        .org-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #94a3b8;
          width: 0;
          height: 36px;
          transform: translateX(-50%);
        }
      `}</style>

      {/* TOAST SUCCESS ALERT */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 alert alert-success alert-dismissible fade show shadow-lg border border-emerald-300">
          <strong>✅ Berhasil!</strong> {toastMsg}
          <button
            type="button"
            className="close ml-3"
            onClick={() => setToastMsg('')}
          >
            <span>&times;</span>
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
          <strong>⚠️ Peringatan:</strong> {error}
          <button type="button" className="close" onClick={() => setError('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* HEADER CARD: TITLE & CONTROL COCKPIT */}
      <div className="card-box pd-20 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20">
              🌳
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Bagan Pohon Struktur Organisasi & Manajemen Grade
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bagan Interaktif Rantai Komando: Ubah Grade (1–15), Tugaskan Karyawan, dan Tambah Bawahan Langsung pada Pohon
              </p>
            </div>
          </div>

          {/* Quick Actions & Canvas Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Edit Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-semibold">
              <span className="px-2 text-slate-500">Mode:</span>
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

            {/* Add Root Position */}
            {editMode && (
              <button
                type="button"
                onClick={() => {
                  setSelectedNode(null);
                  setFormTitle('');
                  setFormDept('BOD');
                  setFormDivision('');
                  setFormCompany('PT. MB');
                  setTargetGrade(15);
                  setTargetEmployeeNrp('');
                  setSyncUserRole(true);
                  setActiveModal('create-child');
                }}
                className="btn btn-primary btn-sm rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                title="Tambah Posisi Paling Atas (Root Level)"
              >
                <span>➕</span>
                <span>Tambah Posisi Utama</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                className="btn btn-outline-secondary"
                title="Perkecil Bagan"
              >
                🔍 -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="btn btn-outline-secondary font-mono"
                title="Reset Ukuran (100%)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                className="btn btn-outline-secondary"
                title="Perbesar Bagan"
              >
                🔍 +
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline-secondary btn-sm rounded-lg"
              title="Muat Ulang Struktur"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & HIERARCHY SEARCH BAR */}
      <div className="card-box pd-15 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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

        {/* Expand/Collapse All */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCollapsedNodes(new Set())}
            className="btn btn-outline-secondary btn-xs rounded"
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
            className="btn btn-outline-secondary btn-xs rounded"
          >
            Tutup Semua Cabang
          </button>
        </div>
      </div>

      {/* GRADE COLOR LEGEND BAR */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-blue-900 font-bold">
          <span>⚡ Panduan Tingkatan Grade (Role Level 1–15):</span>
          <span className="text-slate-600 font-normal hidden md:inline">
            Klik tombol <strong>⚡ Grade</strong> pada kartu untuk langsung menetapkan level otoritas:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            Grade 13-15: Direksi/Superuser
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            Grade 10-12: GM / Kepala PT
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Grade 6-8: Kepala Dept / Project
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Grade 3-5: Koordinator / Admin
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Grade 2: Group Leader
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Grade 1: Pelaksana/Crew
          </span>
        </div>
      </div>

      {/* THE MAIN INTERACTIVE ORGANIGRAM TREE CANVAS */}
      <div className="card-box pd-20 border border-slate-200 overflow-auto min-h-[680px] bg-slate-50/50 relative">
        {/* Status indicator bar */}
        <div className="flex justify-between items-center pb-3 mb-2 border-b border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Total Terdaftar di Bagan: <strong>{flatPositions.length} Posisi Struktural</strong>
            </span>
          </div>
          <div>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
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
          <div className="text-center py-24 text-slate-500">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Memuat bagan pohon...</span>
            </div>
            <p className="mt-2 text-xs font-semibold">Menyusun bagan pohon organisasi & Grade...</p>
          </div>
        ) : treeRoots.length > 0 ? (
          /* ORGANIGRAM TREE CONTAINER */
          <div
            className="org-tree-wrapper"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className="org-tree">
              <ul>
                {treeRoots.map((rootNode) => renderTreeNode(rootNode, 0))}
              </ul>
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-2">🌳</p>
            <p className="text-sm font-semibold">
              Belum ada posisi pada bagan pohon yang sesuai dengan filter.
            </p>
            {editMode && (
              <button
                type="button"
                onClick={() => {
                  setSelectedNode(null);
                  setFormTitle('');
                  setFormDept('BOD');
                  setFormDivision('');
                  setFormCompany('PT. MB');
                  setTargetGrade(15);
                  setTargetEmployeeNrp('');
                  setSyncUserRole(true);
                  setActiveModal('create-child');
                }}
                className="mt-3 btn btn-primary btn-sm rounded-lg font-semibold shadow-sm"
              >
                ➕ Buat Posisi Utama (Root)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS UNTUK PERUBAHAN LANGSUNG PADA BAGAN POHON                         */}
      {/* ========================================================================= */}

      {/* MODAL 1: QUICK EDIT GRADE (Penentuan Grade Cepat) */}
      {activeModal === 'quick-grade' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-amber-50 border-b border-amber-100 py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-amber-950">
                      Tentukan Grade Posisi
                    </h5>
                    <p className="text-[11px] text-amber-700 mb-0 truncate max-w-[200px]">
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
                        Object.entries(GRADE_COLORS).map(([lvl, info]) => (
                          <option key={lvl} value={lvl}>
                            Grade {lvl}: {info.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-800">
                    💡 Menentukan Grade di sini akan langsung menetapkan batas kewenangan persetujuan
                    (approval) bagi pejabat posisi ini.
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
                        Sinkronkan <strong>Role Akun Login</strong> karyawan bersangkutan (
                        {selectedNode.employeeName})
                      </label>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-slate-50 py-2 px-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-xs rounded"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded font-bold shadow-sm"
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

      {/* MODAL 2: ASSIGN / GANTI PEJABAT KARYAWAN */}
      {activeModal === 'assign-person' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-blue-50 border-b border-blue-100 py-3 px-4">
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
                {/* Search Bar for Employees */}
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

                {/* Employee selection list */}
                <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-[260px] divide-y divide-slate-100">
                  {/* Option to clear/leave vacant */}
                  <div
                    onClick={() => handleSaveAssignPerson(null)}
                    className="p-2.5 hover:bg-red-50 flex items-center justify-between cursor-pointer transition text-red-600 font-semibold"
                  >
                    <span>🚫 Kosongkan Pejabat (Posisi Lowong)</span>
                    <span className="text-[10px] bg-red-100 px-2 py-0.5 rounded">Set Lowong</span>
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
                          <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
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
                            <span className="text-[10px] text-slate-400 hover:text-blue-600">
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
                    Sinkronkan role akun user karyawan bersangkutan menjadi <strong>Grade {selectedNode.grade}</strong>.
                  </label>
                </div>
              </div>

              <div className="modal-footer bg-slate-50 py-2.5 px-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary btn-sm rounded"
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-emerald-50 border-b border-emerald-100 py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">➕</span>
                  <div>
                    <h5 className="modal-title text-sm font-bold text-emerald-950">
                      {selectedNode
                        ? `Tambah Posisi Bawahan untuk: ${selectedNode.title}`
                        : 'Tambah Posisi Utama (Root)'}
                    </h5>
                    <p className="text-[11px] text-emerald-700 mb-0">
                      Tambahkan cabang kotak baru ke dalam bagan pohon hierarki
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
                  {/* Nama Jabatan Baru */}
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

                  {/* Atasan Langsung Info */}
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

                  {/* Departemen & Divisi */}
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

                  {/* Tentukan Grade */}
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

                  {/* Pejabat yang Ditugaskan */}
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
                    className="btn btn-secondary btn-sm rounded"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded font-bold shadow-sm"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : '➕ Tambahkan ke Bagan Pohon'}
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
              <div className="modal-header bg-blue-50 border-b border-blue-100 py-3 px-4">
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

                  {/* Atasan Langsung Parent Selector */}
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

                  {/* Departemen & Divisi */}
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

                  {/* Grade */}
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

                  {/* Pejabat */}
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
                    className="btn btn-secondary btn-sm rounded"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded font-bold shadow-sm"
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

      {/* MODAL 5: KONFIRMASI HAPUS */}
      {activeModal === 'delete' && selectedNode && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-2xl border-0 shadow-2xl p-4">
              <div className="flex items-center gap-2.5 mb-2 text-red-600 font-bold text-sm">
                <span className="text-xl">⚠️</span>
                <span>Hapus Posisi Dari Bagan?</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Anda akan menghapus posisi <strong>{selectedNode.title}</strong> (Grade {selectedNode.grade}).
                Bawahan langsung akan otomatis dihubungkan ke atasan di atasnya agar hierarki tidak putus.
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary btn-xs rounded"
                  disabled={modalBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="btn btn-danger btn-xs rounded font-bold"
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
