import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import {
  organizationApi,
  type MasterJabatanItem,
  type OrgEmployeeLookupItem,
  type OrgGradeItem,
  type OrgNodeItem,
} from '../api';
import GradeKanbanBoard from '../components/GradeKanbanBoard';

interface GradeStyle {
  accentColor: string;
  badgeClass: string;
  badgeStyle: React.CSSProperties;
  label: string;
}

const GRADE_STYLES: Record<number, GradeStyle> = {
  // G19 â€” Founder / Owner
  19: {
    accentColor: '#1a0533',
    badgeClass: 'badge badge-pill',
    badgeStyle: { backgroundColor: '#1a0533', color: '#ffd700' },
    label: 'G19 Â· Founder / Owner',
  },
  // G18 â€” Komisaris
  18: {
    accentColor: '#3b0764',
    badgeClass: 'badge badge-pill',
    badgeStyle: { backgroundColor: '#3b0764', color: '#ffffff' },
    label: 'G18 Â· Komisaris',
  },
  // G17 â€” Direktur Utama
  17: {
    accentColor: '#582c87',
    badgeClass: 'badge badge-pill',
    badgeStyle: { backgroundColor: '#582c87', color: '#ffffff' },
    label: 'G17 Â· Direktur Utama',
  },
  // G16 â€” Direktur Operasional
  16: {
    accentColor: '#6f42c1',
    badgeClass: 'badge badge-pill',
    badgeStyle: { backgroundColor: '#6f42c1', color: '#ffffff' },
    label: 'G16 Â· Direktur Operasional',
  },
  // G15 â€” General Manager
  15: {
    accentColor: '#4f46e5',
    badgeClass: 'badge badge-pill',
    badgeStyle: { backgroundColor: '#4f46e5', color: '#ffffff' },
    label: 'G15 Â· General Manager',
  },
  // G14 â€” Manager
  14: {
    accentColor: '#1b00ff',
    badgeClass: 'badge badge-pill badge-primary',
    badgeStyle: { backgroundColor: '#1b00ff', color: '#ffffff' },
    label: 'G14 Â· Manager',
  },
  // G13 â€” Kepala Divisi
  13: {
    accentColor: '#2563eb',
    badgeClass: 'badge badge-pill badge-primary',
    badgeStyle: { backgroundColor: '#2563eb', color: '#ffffff' },
    label: 'G13 Â· Kepala Divisi',
  },
  // G12 â€” Staff Manager
  12: {
    accentColor: '#3b82f6',
    badgeClass: 'badge badge-pill badge-primary',
    badgeStyle: { backgroundColor: '#3b82f6', color: '#ffffff' },
    label: 'G12 Â· Staff Manager',
  },
  // G11 â€” Kepala / Direktur Perusahaan
  11: {
    accentColor: '#0284c7',
    badgeClass: 'badge badge-pill badge-info',
    badgeStyle: { backgroundColor: '#0284c7', color: '#ffffff' },
    label: 'G11 Â· Kepala Perusahaan',
  },
  // G10 â€” Staff Perusahaan
  10: {
    accentColor: '#0891b2',
    badgeClass: 'badge badge-pill badge-info',
    badgeStyle: { backgroundColor: '#0891b2', color: '#ffffff' },
    label: 'G10 Â· Staff Perusahaan',
  },
  // G09 â€” KTT / PJO
  9: {
    accentColor: '#0d9488',
    badgeClass: 'badge badge-pill badge-info',
    badgeStyle: { backgroundColor: '#0d9488', color: '#ffffff' },
    label: 'G09 Â· KTT / PJO',
  },
  // G08 â€” Staff PJO / KTT
  8: {
    accentColor: '#059669',
    badgeClass: 'badge badge-pill badge-success',
    badgeStyle: { backgroundColor: '#059669', color: '#ffffff' },
    label: 'G08 Â· Staff PJO / KTT',
  },
  // G07 â€” Kepala Departemen
  7: {
    accentColor: '#d97706',
    badgeClass: 'badge badge-pill badge-warning',
    badgeStyle: { backgroundColor: '#d97706', color: '#ffffff' },
    label: 'G07 Â· Kepala Departemen',
  },
  // G06 â€” Superintendent
  6: {
    accentColor: '#f59e0b',
    badgeClass: 'badge badge-pill badge-warning text-dark',
    badgeStyle: { backgroundColor: '#f59e0b', color: '#212529' },
    label: 'G06 Â· Superintendent',
  },
  // G05 â€” Staff Departemen
  5: {
    accentColor: '#eab308',
    badgeClass: 'badge badge-pill badge-warning text-dark',
    badgeStyle: { backgroundColor: '#eab308', color: '#212529' },
    label: 'G05 Â· Staff Departemen',
  },
  // G04 â€” Supervisor / Koordinator
  4: {
    accentColor: '#ca8a04',
    badgeClass: 'badge badge-pill badge-warning text-dark',
    badgeStyle: { backgroundColor: '#ca8a04', color: '#212529' },
    label: 'G04 Â· Supervisor / Koordinator',
  },
  // G03 â€” Section
  3: {
    accentColor: '#65a30d',
    badgeClass: 'badge badge-pill badge-success',
    badgeStyle: { backgroundColor: '#65a30d', color: '#ffffff' },
    label: 'G03 Â· Section',
  },
  // G02 â€” Group Leader
  2: {
    accentColor: '#10b981',
    badgeClass: 'badge badge-pill badge-success',
    badgeStyle: { backgroundColor: '#10b981', color: '#ffffff' },
    label: 'G02 Â· Group Leader',
  },
  // G01 â€” Karyawan
  1: {
    accentColor: '#64748b',
    badgeClass: 'badge badge-pill badge-secondary',
    badgeStyle: { backgroundColor: '#64748b', color: '#ffffff' },
    label: 'G01 Â· Karyawan',
  },
};

function getGradeStyle(grade: number, dynamicName?: string): GradeStyle {
  const base =
    GRADE_STYLES[grade] || {
      accentColor: '#6c757d',
      badgeClass: 'badge badge-pill badge-secondary',
      badgeStyle: { backgroundColor: '#6c757d', color: '#ffffff' },
      label: `Grade ${grade}`,
    };

  if (dynamicName) {
    const code = grade < 10 ? `G0${grade}` : `G${grade}`;
    return {
      ...base,
      label: `${code} · ${dynamicName}`,
    };
  }

  return base;
}

export default function StrukturOrganisasi() {
  const { user, access } = useAuth();
  const userRole = user?.role ?? 1;
  const isSuperAdmin = userRole >= 13 || (access?.roleLevels?.some((l) => l >= 13) ?? false);

  // Mode Edit Bagan Pohon: default aktif untuk Superadmin
  const [editMode, setEditMode] = useState(isSuperAdmin);

  // Zoom & collapse
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

  // Tab Utama: 'kanban' (Kelola Grade 285 Jabatan) vs 'tree' (Bagan Pohon)
  const [activeMainTab, setActiveMainTab] = useState<'kanban' | 'tree'>('kanban');
  const [masterJabatan, setMasterJabatan] = useState<MasterJabatanItem[]>([]);

  // Mapping nama Grade dinamis dari EAV table GRADE
  const gradeNameMap = useMemo(() => {
    const map = new Map<number, string>();
    grades.forEach((g) => map.set(g.level, g.name));
    return map;
  }, [grades]);

  // Filters
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Tabel Jabatan & Kelola Grade di Atas Bagan Pohon
  const [showTable, setShowTable] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [tableGradeFilter, setTableGradeFilter] = useState<string>('ALL');
  const [inlineGradeBusy, setInlineGradeBusy] = useState<number | null>(null);

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
      const [treeRes, gradesRes, employeesRes, masterRes] = await Promise.all([
        organizationApi.tree({
          company: companyFilter !== 'ALL' ? companyFilter : undefined,
          department: deptFilter !== 'ALL' ? deptFilter : undefined,
          search: search.trim() || undefined,
        }),
        organizationApi.grades().catch(() => []),
        organizationApi.employeesLookup().catch(() => []),
        organizationApi.masterJabatan().catch(() => []),
      ]);

      setTreeRoots(treeRes.roots || []);
      setFlatPositions(treeRes.flatList || []);
      setGrades(gradesRes);
      setEmployees(employeesRes);
      setMasterJabatan(masterRes || []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat struktur organisasi');
    } finally {
      setLoading(false);
    }
  }

  // Handler memindahkan satu master jabatan (dari drag & drop atau dropdown quick move)
  async function handleMoveMasterGrade(item: MasterJabatanItem, targetGrade: number) {
    const prevGrade = item.grade;
    setMasterJabatan((prev) =>
      prev.map((p) => (p.recordCode === item.recordCode ? { ...p, grade: targetGrade } : p))
    );

    try {
      await organizationApi.updateMasterJabatanGrade(item.recordCode, targetGrade);
      notify(
        `✅ Jabatan "${item.title}" dipindahkan ke Grade G${
          targetGrade < 10 ? '0' + targetGrade : targetGrade
        } (${gradeNameMap.get(targetGrade) || ''})`
      );
      setFlatPositions((prev) =>
        prev.map((p) => (p.title === item.title ? { ...p, grade: targetGrade } : p))
      );
    } catch (err: any) {
      setMasterJabatan((prev) =>
        prev.map((p) => (p.recordCode === item.recordCode ? { ...p, grade: prevGrade } : p))
      );
      alert('Gagal memindahkan grade: ' + (err?.message || 'Error'));
    }
  }

  // Handler memindahkan banyak master jabatan sekaligus (bulk)
  async function handleBulkMoveMasterGrade(items: Array<{ recordCode: string; grade: number }>) {
    const gradeMapUpdate = new Map<string, number>();
    items.forEach((it) => gradeMapUpdate.set(it.recordCode, it.grade));

    setMasterJabatan((prev) =>
      prev.map((p) =>
        gradeMapUpdate.has(p.recordCode) ? { ...p, grade: gradeMapUpdate.get(p.recordCode)! } : p
      )
    );

    try {
      await organizationApi.batchUpdateMasterJabatanGrades(items);
      notify(`✅ Berhasil memindahkan ${items.length} jabatan`);
      await loadData();
    } catch (err: any) {
      alert('Gagal memindahkan sebagian jabatan: ' + (err?.message || 'Error'));
      await loadData();
    }
  }

  // Handler menerapkan Rekomendasi Pintar (Auto-Map PRD)
  async function handleApplyMasterPreset() {
    try {
      const res = await organizationApi.applyMasterJabatanPreset();
      notify(`🚀 ${res.message}`);
      await loadData();
    } catch (err: any) {
      alert('Gagal menerapkan rekomendasi PRD: ' + (err?.message || 'Error'));
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

  // Action: Open Quick Grade
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
      notify(`Grade posisi "${selectedNode.title}" berhasil diubah ke Level ${targetGrade}`);
      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert('Gagal mengubah grade: ' + (err?.message || 'Error'));
    } finally {
      setModalBusy(false);
    }
  }

  // Action: Assign Person
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

  // Action: Create Child
  function handleOpenCreateChild(parentNode: OrgNodeItem | null) {
    setSelectedNode(parentNode);
    setFormTitle('');
    setFormDept(parentNode?.department || 'HAULING');
    setFormDivision(parentNode?.division || '');
    setFormCompany(parentNode?.company || 'PT. MB');
    setTargetGrade(parentNode ? Math.max(1, parentNode.grade - 2) : 19);
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

  // Action: Edit Node
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

  // Action: Delete
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

  // Filtered employees for dialog
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

  // Search match
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

  // Action: Ubah Grade langsung secara instan dari Tabel Jabatan
  async function handleInlineGradeChange(nodeId: number, newGrade: number) {
    setInlineGradeBusy(nodeId);
    try {
      await organizationApi.updateNode(nodeId, {
        grade: Number(newGrade),
        syncUserRole: true,
      });
      const target = flatPositions.find((p) => p.id === nodeId);
      notify(`Grade posisi "${target?.title || nodeId}" berhasil diubah menjadi Grade ${newGrade}`);
      await loadData();
    } catch (err: any) {
      alert('Gagal mengubah grade: ' + (err?.message || 'Error'));
    } finally {
      setInlineGradeBusy(null);
    }
  }

  // Filter posisi khusus untuk Tabel Jabatan di atas bagan pohon
  const filteredTablePositions = useMemo(() => {
    let list = [...flatPositions];
    if (companyFilter !== 'ALL') {
      list = list.filter((p) => p.company === companyFilter);
    }
    if (deptFilter !== 'ALL') {
      list = list.filter((p) => (p.department || '').toUpperCase() === deptFilter.toUpperCase());
    }
    if (tableGradeFilter !== 'ALL') {
      const g = Number(tableGradeFilter);
      list = list.filter((p) => p.grade === g);
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.employeeName && p.employeeName.toLowerCase().includes(q)) ||
          (p.employeeNrp && p.employeeNrp.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q)) ||
          (p.division && p.division.toLowerCase().includes(q)),
      );
    }
    // Urutkan default: Grade tertinggi ke terendah, lalu alfabet nama posisi
    return list.sort((a, b) => b.grade - a.grade || a.title.localeCompare(b.title));
  }, [flatPositions, companyFilter, deptFilter, tableGradeFilter, tableSearch]);

  // RECURSIVE NODE RENDERER (Clean DeskApp Card & Mathematical Connectors)
  function renderTreeNode(node: OrgNodeItem, level = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const gradeStyle = getGradeStyle(node.grade, gradeNameMap.get(node.grade));
    const isMatch = matchesSearch(node);

    return (
      <li key={node.id}>
        {/* Top Anchor Dot */}
        <div className="org-anchor-dot org-anchor-top" />

        {/* CARD POSISI (DESKAPP / BOOTSTRAP STYLING) */}
        <div
          className={`org-node-card card-box ${isMatch ? '' : 'org-node-dimmed'}`}
          style={{
            borderTop: `4px solid ${gradeStyle.accentColor}`,
          }}
        >
          {/* Card Top: Grade Badge & Department */}
          <div className="d-flex align-items-center justify-content-between mb-1">
            <button
              type="button"
              onClick={() => editMode && handleOpenQuickGrade(node)}
              className={`${gradeStyle.badgeClass} border-0`}
              style={{
                ...gradeStyle.badgeStyle,
                fontSize: '10px',
                padding: '3px 8px',
                cursor: editMode ? 'pointer' : 'default',
                fontWeight: 700,
              }}
              title={editMode ? 'Klik untuk langsung mengubah Grade posisi ini' : ''}
            >
              Grade {node.grade} â€¢ {gradeStyle.label}
              {editMode && <span className="ml-1 opacity-75">âš¡</span>}
            </button>

            {node.department && (
              <span className="badge badge-light border text-muted font-11 weight-600 text-uppercase">
                {node.department}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="mt-1">
            <h5
              className="font-14 weight-700 text-dark mb-0 org-node-title"
              onClick={() => editMode && handleOpenEditNode(node)}
              title={editMode ? 'Klik untuk mengedit detail posisi' : ''}
              style={{ cursor: editMode ? 'pointer' : 'default' }}
            >
              {node.title}
            </h5>
            {node.division && (
              <small className="text-secondary font-11 d-block mt-1">
                Section: {node.division}
              </small>
            )}
          </div>

          {/* Pejabat Aktif Box */}
          <div
            onClick={() => editMode && handleOpenAssignPerson(node)}
            className={`org-occupant-box ${editMode ? 'org-occupant-hover' : ''}`}
            title={editMode ? 'Klik untuk mengganti pejabat posisi ini' : ''}
          >
            <div className="d-flex align-items-center">
              <div
                className="org-avatar mr-2"
                style={{
                  backgroundColor: node.employeeName ? gradeStyle.accentColor : '#e9ecef',
                  color: node.employeeName ? '#ffffff' : '#6c757d',
                }}
              >
                {node.employeeName
                  ? node.employeeName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                  : '?'}
              </div>
              <div className="text-truncate" style={{ maxWidth: '170px' }}>
                {node.employeeName ? (
                  <>
                    <div className="font-12 weight-600 text-dark text-truncate">
                      {node.employeeName}
                    </div>
                    <div className="font-11 text-muted">{node.employeeNrp}</div>
                  </>
                ) : (
                  <div className="font-11 text-muted font-italic">(Posisi Lowong)</div>
                )}
              </div>
            </div>

            {editMode && (
              <span className="font-10 text-primary weight-600 ml-auto">
                <i className="bi bi-pencil-square" />
              </span>
            )}
          </div>

          {/* Actions Bar (Mode Edit Aktif) */}
          {editMode && (
            <div className="org-action-bar d-flex align-items-center justify-content-between pt-2 mt-2 border-top">
              <span className="font-10 text-muted weight-600">
                {node.company || 'MBG'}
              </span>

              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  onClick={() => handleOpenQuickGrade(node)}
                  className="btn btn-outline-warning btn-xs px-2"
                  title="Ubah Grade Posisi"
                >
                  <i className="bi bi-lightning-charge" /> Grade
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditNode(node)}
                  className="btn btn-outline-primary btn-xs px-2"
                  title="Edit Detail Posisi"
                >
                  <i className="bi bi-pencil" /> Edit
                </button>
                {node.grade < 14 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(node)}
                    className="btn btn-outline-danger btn-xs px-2"
                    title="Hapus Posisi"
                  >
                    <i className="bi bi-trash" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Anchor Dot */}
          <div className="org-anchor-dot org-anchor-bottom" />

          {/* TOMBOL TAMBAH BAWAHAN (+) */}
          {editMode && (
            <button
              type="button"
              onClick={() => handleOpenCreateChild(node)}
              className="btn btn-primary rounded-circle org-add-child-btn shadow-sm"
              title={`Tambah bawahan langsung untuk: ${node.title}`}
            >
              <i className="bi bi-plus" style={{ fontSize: '14px', lineHeight: 1 }} />
            </button>
          )}

          {/* TOMBOL COLLAPSE / EXPAND BAWAHAN */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              className={`btn btn-light btn-xs border shadow-xs org-collapse-pill ${
                editMode ? 'org-collapse-with-add' : 'org-collapse-standalone'
              }`}
              title={isCollapsed ? 'Buka cabang bawahan' : 'Tutup cabang bawahan'}
            >
              {isCollapsed
                ? `â–¶ ${node.children!.length} Bawahan`
                : `â–¼ ${node.children!.length} Bawahan`}
            </button>
          )}
        </div>

        {/* RECURSIVE SUBORDINATES */}
        {hasChildren && !isCollapsed && (
          <ul>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div>
      {/* DESKAPP & BOOTSTRAP ORGANIGRAM CSS */}
      <style>{`
        /* Canvas Blueprint Styling with DeskApp Colors */
        .org-canvas-deskapp {
          background-color: #f8fafc;
          background-image: radial-gradient(#d4d4d4 1.2px, transparent 1.2px);
          background-size: 20px 20px;
          border-radius: 10px;
          border: 1px solid #e4e4e4;
          overflow: auto;
          min-height: 680px;
          position: relative;
        }

        /* Tree Root Container */
        .org-tree-wrapper {
          display: flex;
          justify-content: center;
          padding: 30px 40px 120px 40px;
          min-width: fit-content;
          transform-origin: top center;
          transition: transform 0.2s ease;
        }

        .org-chart-tree, .org-chart-tree ul {
          display: flex;
          justify-content: center;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        /* Vertical spacing between generations: exactly 42px */
        .org-chart-tree ul {
          padding-top: 42px;
          position: relative;
        }

        /* Each sibling item */
        .org-chart-tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 42px 14px 0 14px;
        }

        /* Connecting horizontal crossbar */
        .org-chart-tree li::before, .org-chart-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #6c757d;
          width: 50%;
          height: 42px;
        }
        .org-chart-tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #6c757d;
        }

        /* Outer smooth corners */
        .org-chart-tree li:first-child::before {
          border: none;
        }
        .org-chart-tree li:last-child::after {
          border: none;
        }
        .org-chart-tree li:first-child::after {
          border-radius: 8px 0 0 0;
        }
        .org-chart-tree li:last-child::before {
          border-right: 2px solid #6c757d;
          border-radius: 0 8px 0 0;
        }

        /* Single child: direct vertical line down, no horizontal line */
        .org-chart-tree li:only-child {
          padding-top: 42px;
        }
        .org-chart-tree li:only-child::before, .org-chart-tree li:only-child::after {
          display: none;
        }

        /* Vertical line from parent card down to children list */
        .org-chart-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #6c757d;
          width: 0;
          height: 42px;
          transform: translateX(-50%);
        }

        /* DeskApp Node Card */
        .org-node-card {
          width: 250px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid #d4d4d4;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          position: relative;
          z-index: 10;
          text-align: left;
          transition: all 0.2s ease;
        }
        .org-node-card:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          border-color: #1b00ff;
        }
        .org-node-dimmed {
          opacity: 0.25;
          border-style: dashed;
        }

        /* Occupant Box */
        .org-occupant-box {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.15s ease;
        }
        .org-occupant-hover:hover {
          background-color: #f0f4ff;
          cursor: pointer;
        }

        /* Avatar Circle */
        .org-avatar {
          width: 32px;
          height: 32px;
          border-radius: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 11px;
          flex-shrink: 0;
        }

        /* Connector Anchor Dots */
        .org-anchor-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6c757d;
          border: 2px solid #ffffff;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          z-index: 11;
        }
        .org-anchor-top {
          top: -4px;
        }
        .org-anchor-bottom {
          bottom: -4px;
        }

        /* Add Child Button (+) */
        .org-add-child-btn {
          position: absolute;
          bottom: -13px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 24px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          border: 2px solid #ffffff;
          font-size: 12px;
        }
        .org-add-child-btn:hover {
          transform: translateX(-50%) scale(1.15);
        }

        /* Collapse Pill Button */
        .org-collapse-pill {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          z-index: 19;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
        }
        .org-collapse-with-add {
          bottom: -36px;
        }
        .org-collapse-standalone {
          bottom: -15px;
        }

        /* Helper for micro buttons */
        .btn-xs {
          padding: 2px 6px;
          font-size: 11px;
          line-height: 1.5;
          border-radius: 4px;
        }
      `}</style>

      {/* TOAST ALERT */}
      {toastMsg && (
        <div
          className="alert alert-success alert-dismissible fade show position-fixed shadow-lg"
          style={{ top: '20px', right: '20px', zIndex: 9999, minWidth: '320px' }}
          role="alert"
        >
          <strong><i className="bi bi-check-circle mr-1" /> Berhasil:</strong> {toastMsg}
          <button
            type="button"
            className="close"
            onClick={() => setToastMsg('')}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong><i className="bi bi-exclamation-triangle mr-1" /> Peringatan:</strong> {error}
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

      {/* DESKAPP PAGE HEADER */}
      <div className="page-header">
        <div className="row align-items-center">
          <div className="col-md-7 col-sm-12">
            <div className="title">
              <h4>Struktur Organisasi & Manajemen Grade</h4>
            </div>
            <nav aria-label="breadcrumb" role="navigation">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/">Home</a>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Struktur Organisasi
                </li>
              </ol>
            </nav>
          </div>

          {/* Header Action Controls */}
          <div className="col-md-5 col-sm-12 text-right">
            <div className="d-flex align-items-center justify-content-end flex-wrap">
              {/* Mode Edit Toggle */}
              <div className="btn-group btn-group-sm mr-2 mb-1">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className={`btn ${!editMode ? 'btn-primary' : 'btn-light border'}`}
                >
                  <i className="bi bi-eye mr-1" /> Lihat Bagan
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className={`btn ${editMode ? 'btn-primary' : 'btn-light border'}`}
                >
                  <i className="bi bi-pencil-square mr-1" /> Edit Mode
                </button>
              </div>

              {/* Tambah Posisi Utama (Root) */}
              {editMode && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateChild(null)}
                  className="btn btn-primary btn-sm mr-2 mb-1"
                  title="Tambah Posisi Paling Atas (Direksi / Root)"
                >
                  <i className="bi bi-plus-circle mr-1" /> Tambah Posisi Utama
                </button>
              )}

              {/* Zoom controls */}
              <div className="btn-group btn-group-sm mr-2 mb-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                  className="btn btn-light border"
                  title="Perkecil (-10%)"
                >
                  <i className="bi bi-zoom-out" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="btn btn-light border font-weight-bold"
                  title="Reset 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                  className="btn btn-light border"
                  title="Perbesar (+10%)"
                >
                  <i className="bi bi-zoom-in" />
                </button>
              </div>

              {/* Refresh */}
              <button
                type="button"
                onClick={loadData}
                className="btn btn-outline-secondary btn-sm mb-1"
                title="Muat Ulang Struktur"
              >
                <i className="bi bi-arrow-clockwise" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGASI UTAMA TAMPILAN: PAPAN KELOLA GRADE vs BAGAN POHON */}
      <div className="card-box pd-10 mb-20 shadow-sm">
        <ul className="nav nav-pills customtab">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === 'kanban' ? 'active font-weight-bold' : ''}`}
              onClick={() => setActiveMainTab('kanban')}
            >
              <i className="bi bi-kanban mr-2" />
              Papan & Tabel Kelola Grade Jabatan
              <span className="badge badge-light ml-2">{masterJabatan.length} Jabatan</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === 'tree' ? 'active font-weight-bold' : ''}`}
              onClick={() => setActiveMainTab('tree')}
            >
              <i className="bi bi-diagram-3 mr-2" />
              Bagan Pohon Struktur Organisasi
              <span className="badge badge-secondary ml-2">{flatPositions.length} Terpasang</span>
            </button>
          </li>
        </ul>
      </div>

      {activeMainTab === 'kanban' ? (
        <GradeKanbanBoard
          masterJabatan={masterJabatan}
          grades={grades}
          gradeStyles={GRADE_STYLES}
          isSuperAdmin={isSuperAdmin}
          onMoveGrade={handleMoveMasterGrade}
          onBulkMoveGrade={handleBulkMoveMasterGrade}
          onApplyPreset={handleApplyMasterPreset}
          onRefresh={loadData}
        />
      ) : (
        <>
          {/* FILTER & SEARCH CARD (DESKAPP CARD-BOX) */}
      <div className="card-box pd-15 mb-20">
        <div className="row align-items-center">
          <div className="col-lg-8 col-md-12">
            <div className="form-inline flex-wrap">
              {/* Filter Perusahaan */}
              <div className="form-group mr-3 mb-2">
                <label className="font-12 weight-600 text-muted mr-2">PERUSAHAAN:</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="custom-select custom-select-sm"
                  style={{ width: 'auto' }}
                >
                  <option value="ALL">Semua Perusahaan</option>
                  <option value="PT. MB">PT. Mitra Barito (PT. MB)</option>
                  <option value="PT. SRI">PT. SRI</option>
                  <option value="PT. MBLE">PT. MBLE</option>
                  <option value="CV. BK">CV. Bunda Kandung</option>
                </select>
              </div>

              {/* Filter Departemen */}
              <div className="form-group mr-3 mb-2">
                <label className="font-12 weight-600 text-muted mr-2">DEPARTEMEN:</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="custom-select custom-select-sm"
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

              {/* Search Bar */}
              <div className="form-group mb-2">
                <div className="input-group input-group-sm mb-0">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-light border-right-0">
                      <i className="bi bi-search font-12" />
                    </span>
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari Jabatan / Karyawan / NRP..."
                    className="form-control form-control-sm border-left-0"
                    style={{ minWidth: '220px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branch Expand/Collapse */}
          <div className="col-lg-4 col-md-12 text-lg-right mt-2 mt-lg-0">
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                onClick={() => setCollapsedNodes(new Set())}
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-arrows-expand mr-1" /> Buka Cabang
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
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-arrows-collapse mr-1" /> Tutup Cabang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GRADE LEGEND PALETTE (DESKAPP CARD-BOX) */}
      <div className="card-box pd-15 mb-20">
        <div className="d-flex align-items-center justify-content-between flex-wrap">
          <div className="d-flex align-items-center mb-1">
            <span className="font-12 weight-700 text-dark mr-2">
              <i className="bi bi-lightning-charge-fill text-warning mr-1" /> Tingkatan Grade (G01â€“G19):
            </span>
            <small className="text-muted d-none d-md-inline">
              Klik <strong>âš¡ Grade</strong> pada kartu posisi untuk mengubah level wewenang:
            </small>
          </div>

          <div className="d-flex flex-wrap align-items-center mb-1">
            <span className="badge badge-pill text-warning mr-1 mb-1" style={{ backgroundColor: '#1a0533' }}>
              G17â€“G19: Komisaris / Owner
            </span>
            <span className="badge badge-pill text-white mr-1 mb-1" style={{ backgroundColor: '#582c87' }}>
              G15â€“G16: Direktur / GM
            </span>
            <span className="badge badge-pill badge-primary mr-1 mb-1" style={{ backgroundColor: '#1b00ff' }}>
              G12â€“G14: Manager / Kepala Divisi
            </span>
            <span className="badge badge-pill badge-info mr-1 mb-1" style={{ backgroundColor: '#0284c7' }}>
              G09â€“G11: PJO / KTT / Kepala Perusahaan
            </span>
            <span className="badge badge-pill badge-warning text-dark mr-1 mb-1" style={{ backgroundColor: '#d97706' }}>
              G05â€“G08: Dept / Superintendent / Staff PJO
            </span>
            <span className="badge badge-pill badge-success mr-1 mb-1" style={{ backgroundColor: '#65a30d' }}>
              G03â€“G04: Section / Supervisor
            </span>
            <span className="badge badge-pill badge-success mr-1 mb-1" style={{ backgroundColor: '#10b981' }}>
              G02: Group Leader
            </span>
            <span className="badge badge-pill badge-secondary mr-1 mb-1" style={{ backgroundColor: '#64748b' }}>
              G01: Karyawan / Pelaksana
            </span>
          </div>
        </div>
      </div>

      {/* TABEL JABATAN & MANAJEMEN GRADE (DI ATAS BAGAN POHON) */}
      <div className="card-box pd-20 mb-30 shadow-sm border">
        <div className="d-flex align-items-center justify-content-between flex-wrap pb-3 mb-3 border-bottom">
          <div className="d-flex align-items-center mb-2 mb-md-0">
            <div
              className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle mr-3 shadow-xs"
              style={{ width: '38px', height: '38px', fontSize: '18px' }}
            >
              <i className="bi bi-table" />
            </div>
            <div>
              <h4 className="h5 text-primary mb-0 weight-700">
                Tabel Jabatan & Manajemen Grade
              </h4>
              <p className="font-12 text-muted mb-0">
                Ubah tingkatan Grade (Level 1â€“15) secara langsung melalui dropdown atau kelola pejabat struktural
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center flex-wrap">
            <span className="badge badge-pill badge-info px-3 py-2 font-12 mr-2 mb-1">
              Menampilkan {filteredTablePositions.length} dari {flatPositions.length} Posisi
            </span>
            {editMode && (
              <button
                type="button"
                onClick={() => handleOpenCreateChild(null)}
                className="btn btn-sm btn-primary mr-2 mb-1"
                title="Tambah Jabatan / Posisi Baru"
              >
                <i className="bi bi-plus-circle mr-1" /> Tambah Posisi Baru
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              className="btn btn-sm btn-outline-secondary mb-1"
              title={showTable ? 'Lipat Tabel Jabatan' : 'Buka Tabel Jabatan'}
            >
              <i className={`bi ${showTable ? 'bi-chevron-up' : 'bi-chevron-down'} mr-1`} />
              {showTable ? 'Sembunyikan Tabel' : 'Tampilkan Tabel'}
            </button>
          </div>
        </div>

        {showTable && (
          <>
            {/* Filter Cepat Tabel */}
            <div className="row align-items-center mb-3">
              <div className="col-md-6 mb-2 mb-md-0">
                <div className="input-group input-group-sm">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-search font-12" />
                    </span>
                  </div>
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Cari cepat nama jabatan, pejabat, atau NRP di tabel..."
                    className="form-control form-control-sm"
                  />
                  {tableSearch && (
                    <div className="input-group-append">
                      <button
                        type="button"
                        onClick={() => setTableSearch('')}
                        className="btn btn-outline-secondary btn-sm"
                        title="Hapus pencarian"
                      >
                        âœ•
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-6 d-flex align-items-center justify-content-md-end flex-wrap">
                <div className="d-flex align-items-center mb-1">
                  <label className="font-12 weight-600 text-muted mr-2 mb-0">FILTER GRADE:</label>
                  <select
                    value={tableGradeFilter}
                    onChange={(e) => setTableGradeFilter(e.target.value)}
                    className="custom-select custom-select-sm"
                    style={{ width: 'auto', minWidth: '170px' }}
                  >
                    <option value="ALL">Semua Grade (1â€“15)</option>
                    {grades.map((g) => (
                      <option key={g.level} value={g.level}>
                        Grade {g.level} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table Element with Sticky Header */}
            <div
              className="table-responsive border rounded"
              style={{ maxHeight: '460px', overflowY: 'auto' }}
            >
              <table className="table table-striped table-hover table-sm table-bordered mb-0">
                <thead className="thead-light font-12 sticky-top" style={{ zIndex: 2 }}>
                  <tr>
                    <th style={{ width: '45px' }} className="text-center">#</th>
                    <th style={{ minWidth: '220px' }}>Nama Posisi / Jabatan</th>
                    <th style={{ minWidth: '150px' }}>Perusahaan & Dept</th>
                    <th style={{ minWidth: '170px' }}>Atasan Langsung</th>
                    <th style={{ minWidth: '270px' }}>Grade / Role Level (Ubah Langsung)</th>
                    <th style={{ minWidth: '210px' }}>Pejabat Aktif</th>
                    {editMode && <th style={{ width: '130px' }} className="text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="font-12">
                  {filteredTablePositions.length === 0 ? (
                    <tr>
                      <td colSpan={editMode ? 7 : 6} className="text-center py-4 text-muted">
                        <i className="bi bi-inbox font-24 d-block mb-1" />
                        Tidak ada posisi jabatan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTablePositions.map((pos, idx) => {
                      const parentNode = pos.parentId
                        ? flatPositions.find((item) => item.id === pos.parentId)
                        : null;
                      const gStyle = getGradeStyle(pos.grade, gradeNameMap.get(pos.grade));
                      const isBusy = inlineGradeBusy === pos.id;

                      return (
                        <tr key={pos.id} className={isBusy ? 'table-warning' : ''}>
                          <td className="text-center text-muted weight-600 align-middle">
                            {idx + 1}
                          </td>
                          <td className="align-middle">
                            <div className="font-13 weight-700 text-dark">
                              {pos.title}
                            </div>
                            {pos.division && (
                              <small className="text-muted d-block">
                                Section: {pos.division}
                              </small>
                            )}
                          </td>
                          <td className="align-middle">
                            <span className="badge badge-pill badge-secondary mr-1 font-10">
                              {pos.company || 'MBG'}
                            </span>
                            <span className="weight-600 text-dark font-11">
                              {pos.department || '-'}
                            </span>
                          </td>
                          <td className="align-middle">
                            {parentNode ? (
                              <div className="font-12 text-dark weight-600">
                                <i className="bi bi-arrow-return-right text-muted mr-1 font-11" />
                                {parentNode.title}
                              </div>
                            ) : (
                              <span className="badge badge-light border text-muted font-11">
                                ðŸ‘‘ Puncak (Top Level)
                              </span>
                            )}
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center flex-wrap">
                              <span
                                className="badge badge-pill font-11 px-2 py-1 mr-2 text-white shadow-xs"
                                style={gStyle.badgeStyle}
                              >
                                Level {pos.grade}
                              </span>

                              {editMode ? (
                                <div className="d-inline-flex align-items-center">
                                  <select
                                    value={pos.grade}
                                    disabled={isBusy}
                                    onChange={(e) =>
                                      handleInlineGradeChange(pos.id, Number(e.target.value))
                                    }
                                    className="custom-select custom-select-sm font-weight-bold"
                                    style={{
                                      width: '180px',
                                      fontSize: '11px',
                                      borderColor: gStyle.accentColor,
                                    }}
                                    title="Pilih untuk langsung mengubah Grade posisi ini"
                                  >
                                    {grades.map((g) => (
                                      <option key={g.level} value={g.level}>
                                        Grade {g.level} â€” {g.name}
                                      </option>
                                    ))}
                                  </select>
                                  {isBusy ? (
                                    <span className="spinner-border spinner-border-sm text-primary ml-2" />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickGrade(pos)}
                                      className="btn btn-outline-warning btn-xs ml-1"
                                      title="Detail Grade & Opsi Sinkronisasi Akun User"
                                    >
                                      <i className="bi bi-lightning-charge" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="font-12 weight-600 text-dark">
                                  {gStyle.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center text-truncate" style={{ maxWidth: '170px' }}>
                                <div
                                  className="org-avatar mr-2"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    fontSize: '10px',
                                    backgroundColor: pos.employeeName ? gStyle.accentColor : '#e9ecef',
                                    color: pos.employeeName ? '#ffffff' : '#6c757d',
                                  }}
                                >
                                  {pos.employeeName
                                    ? pos.employeeName.split(' ').map((n) => n[0]).slice(0, 2).join('')
                                    : '?'}
                                </div>
                                <div className="text-truncate">
                                  {pos.employeeName ? (
                                    <>
                                      <div className="font-12 weight-600 text-dark text-truncate">
                                        {pos.employeeName}
                                      </div>
                                      <div className="font-10 text-muted">{pos.employeeNrp}</div>
                                    </>
                                  ) : (
                                    <span className="font-11 text-muted font-italic">(Lowong)</span>
                                  )}
                                </div>
                              </div>
                              {editMode && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignPerson(pos)}
                                  className={`btn btn-xs ml-1 ${
                                    pos.employeeName ? 'btn-outline-primary' : 'btn-outline-success'
                                  }`}
                                  title={pos.employeeName ? 'Ganti Pejabat' : 'Tugaskan Karyawan'}
                                >
                                  <i className={`bi ${pos.employeeName ? 'bi-pencil' : 'bi-person-plus'}`} />
                                </button>
                              )}
                            </div>
                          </td>
                          {editMode && (
                            <td className="text-center align-middle">
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateChild(pos)}
                                  className="btn btn-outline-primary btn-xs px-2"
                                  title="Tambah Bawahan untuk Posisi Ini"
                                >
                                  <i className="bi bi-plus-lg" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditNode(pos)}
                                  className="btn btn-outline-secondary btn-xs px-2"
                                  title="Edit Detail Posisi"
                                >
                                  <i className="bi bi-pencil" />
                                </button>
                                {pos.grade < 14 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDelete(pos)}
                                    className="btn btn-outline-danger btn-xs px-2"
                                    title="Hapus Posisi"
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* THE PROPORTIONAL ORGANIGRAM TREE CANVAS */}
      <div className="org-canvas-deskapp card-box pd-20 mb-30">
        {/* Top Status Header */}
        <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
          <div className="d-flex align-items-center font-12 text-muted">
            <span
              className="badge badge-pill badge-success mr-2"
              style={{ width: '10px', height: '10px', padding: 0, display: 'inline-block' }}
            />
            <span>
              Total Posisi di Bagan: <strong>{flatPositions.length} Posisi Struktural</strong>
            </span>
          </div>
          <div>
            <span
              className={`badge badge-pill ${
                editMode ? 'badge-warning text-dark' : 'badge-light border text-muted'
              } font-11 px-3 py-1`}
            >
              {editMode
                ? 'ðŸ‘‘ Mode Edit Aktif: Klik Grade / Pejabat / Tombol [+] pada kartu'
                : 'ðŸ‘ï¸ Mode Lihat: Hanya-baca'}
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Memuat...</span>
            </div>
            <p className="font-12 weight-600 text-muted mt-2">
              Menyusun bagan pohon organisasi & garis hierarki...
            </p>
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
          /* Empty state */
          <div className="text-center py-5 text-muted">
            <div className="font-30 mb-2">ðŸŒ³</div>
            <p className="font-14 weight-600">
              Belum ada posisi pada bagan pohon yang sesuai dengan filter.
            </p>
            {editMode && (
              <button
                type="button"
                onClick={() => handleOpenCreateChild(null)}
                className="btn btn-primary btn-sm mt-2"
              >
                <i className="bi bi-plus-circle mr-1" /> Buat Posisi Utama (Root)
              </button>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* BOOTSTRAP / DESKAPP MODALS                                                */}
      {/* ========================================================================= */}

      {/* MODAL 1: QUICK GRADE PICKER */}
      {activeModal === 'quick-grade' && selectedNode && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-lightning-charge-fill text-warning mr-1" /> Tentukan Grade Posisi
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveQuickGrade}>
                <div className="modal-body">
                  <div className="form-group mb-2">
                    <label className="weight-600 font-12 text-muted">JABATAN:</label>
                    <div className="font-14 weight-700 text-dark mb-2">
                      {selectedNode.title}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="weight-600 font-12">
                      Pilih Tingkat Grade (Role Level 1â€“15):
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="custom-select custom-select-sm weight-700 text-primary"
                    >
                      {grades.length > 0 ? (
                        grades.map((g) => (
                          <option key={g.level} value={g.level}>
                            Grade {g.level}: {g.name}
                          </option>
                        ))
                      ) : (
                        Object.entries(GRADE_STYLES).map(([lvl, info]) => (
                          <option key={lvl} value={lvl}>
                            Grade {lvl}: {info.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="alert alert-info font-11 pd-10 mb-2">
                    <i className="bi bi-info-circle mr-1" /> Menentukan Grade ini otomatis menetapkan wewenang approval (cuti, izin, lembur) bagi pejabat posisi ini.
                  </div>

                  {selectedNode.employeeNrp && (
                    <div className="custom-control custom-checkbox mt-2">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="syncUserRoleCheck"
                        checked={syncUserRole}
                        onChange={(e) => setSyncUserRole(e.target.checked)}
                      />
                      <label className="custom-control-label font-12" htmlFor="syncUserRoleCheck">
                        Sinkronkan role login karyawan ({selectedNode.employeeName})
                      </label>
                    </div>
                  )}
                </div>

                <div className="modal-footer justify-content-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-sm"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm font-weight-bold"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : 'Simpan Grade'}
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
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-person-badge mr-1 text-primary" /> Tugaskan Pejabat Posisi
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <div className="font-12 text-muted">POSISI:</div>
                  <h5 className="font-15 weight-700 text-dark">
                    {selectedNode.title}{' '}
                    <span className="badge badge-pill badge-primary font-10">
                      Grade {selectedNode.grade}
                    </span>
                  </h5>
                </div>

                <div className="form-group mb-2">
                  <label className="weight-600 font-12">Cari Nama Karyawan atau NRP:</label>
                  <input
                    type="text"
                    value={empSearchQuery}
                    onChange={(e) => setEmpSearchQuery(e.target.value)}
                    placeholder="Ketik minimal 2 huruf nama atau NRP..."
                    className="form-control form-control-sm"
                  />
                </div>

                {/* Employee selection list */}
                <div
                  className="border rounded mb-3"
                  style={{ maxHeight: '250px', overflowY: 'auto' }}
                >
                  {/* Clear / Vacant button */}
                  <div
                    onClick={() => handleSaveAssignPerson(null)}
                    className="p-2 border-bottom d-flex align-items-center justify-content-between text-danger"
                    style={{ cursor: 'pointer', backgroundColor: '#fff5f5' }}
                  >
                    <span className="font-12 weight-600">
                      <i className="bi bi-slash-circle mr-1" /> Kosongkan Pejabat (Set Lowong)
                    </span>
                    <span className="badge badge-danger font-10">PILIH</span>
                  </div>

                  {filteredEmployees.map((emp) => {
                    const isCurrent = emp.nrp === selectedNode.employeeNrp;
                    return (
                      <div
                        key={emp.nrp}
                        onClick={() => handleSaveAssignPerson(emp.nrp)}
                        className={`p-2 border-bottom d-flex align-items-center justify-content-between ${
                          isCurrent ? 'bg-light font-weight-bold' : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle mr-2 d-flex align-items-center justify-content-center bg-primary text-white font-10 font-weight-bold"
                            style={{ width: '28px', height: '28px' }}
                          >
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-12 text-dark">{emp.name}</div>
                            <small className="text-muted font-11">{emp.nrp}</small>
                          </div>
                        </div>
                        <div>
                          {isCurrent ? (
                            <span className="badge badge-success font-10">SEDANG MENJABAT</span>
                          ) : (
                            <span className="badge badge-light border font-10">TUGASKAN</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="custom-control custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="syncRoleAssignCheck"
                    checked={syncUserRole}
                    onChange={(e) => setSyncUserRole(e.target.checked)}
                  />
                  <label className="custom-control-label font-12" htmlFor="syncRoleAssignCheck">
                    Sinkronkan role login akun user menjadi <strong>Grade {selectedNode.grade}</strong>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary btn-sm"
                  disabled={modalBusy}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH BAWAHAN PADA POHON */}
      {activeModal === 'create-child' && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-plus-circle text-primary mr-1" />
                  {selectedNode
                    ? `Tambah Bawahan untuk: ${selectedNode.title}`
                    : 'Tambah Posisi Utama (Root)'}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveCreateChild}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="weight-600 font-12">
                      Nama Posisi / Jabatan Baru <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Koordinator Pit / Foreman Hauling"
                      className="form-control form-control-sm font-weight-bold"
                      required
                      autoFocus
                    />
                  </div>

                  {selectedNode && (
                    <div className="alert alert-secondary font-12 py-2 mb-3">
                      <strong>Atasan Langsung:</strong> {selectedNode.title} (Grade {selectedNode.grade})
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label className="weight-600 font-12">Departemen</label>
                      <input
                        type="text"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value.toUpperCase())}
                        className="form-control form-control-sm"
                      />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="weight-600 font-12">Section <small className="text-muted font-10">(Opsional — mis. SECTION-A, HSE-SECTION)</small></label>
                      <input
                        type="text"
                        value={formDivision}
                        onChange={(e) => setFormDivision(e.target.value.toUpperCase())}
                        className="form-control form-control-sm"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="weight-600 font-12">
                      Tentukan Grade Posisi Baru (Level 1â€“15):
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="custom-select custom-select-sm weight-700 text-primary"
                    >
                      {grades.map((g) => (
                        <option key={g.level} value={g.level}>
                          Grade {g.level}: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="weight-600 font-12">Pejabat Pertama (Opsional):</label>
                    <select
                      value={targetEmployeeNrp}
                      onChange={(e) => setTargetEmployeeNrp(e.target.value)}
                      className="custom-select custom-select-sm"
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

                <div className="modal-footer justify-content-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-sm"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm font-weight-bold"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : 'Tambahkan ke Bagan'}
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
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-pencil mr-1 text-primary" /> Edit Detail Posisi & Hierarki
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveEditNode}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="weight-600 font-12">
                      Nama Posisi / Jabatan <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="form-control form-control-sm font-weight-bold"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="weight-600 font-12">
                      Atasan Langsung (Pindahkan Cabang / Reports To):
                    </label>
                    <select
                      value={formParentId ?? ''}
                      onChange={(e) =>
                        setFormParentId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="custom-select custom-select-sm"
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

                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label className="weight-600 font-12">Departemen</label>
                      <input
                        type="text"
                        value={formDept}
                        onChange={(e) => setFormDept(e.target.value.toUpperCase())}
                        className="form-control form-control-sm"
                      />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="weight-600 font-12">Section <small className="text-muted font-10">(mis. SECTION-A, HSE-SECTION)</small></label>
                      <input
                        type="text"
                        value={formDivision}
                        onChange={(e) => setFormDivision(e.target.value.toUpperCase())}
                        className="form-control form-control-sm"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="weight-600 font-12">
                      Grade Jabatan (Level 1â€“15):
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="custom-select custom-select-sm weight-700 text-primary"
                    >
                      {grades.map((g) => (
                        <option key={g.level} value={g.level}>
                          Grade {g.level}: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="weight-600 font-12">Pejabat yang Ditugaskan:</label>
                    <select
                      value={targetEmployeeNrp}
                      onChange={(e) => setTargetEmployeeNrp(e.target.value)}
                      className="custom-select custom-select-sm"
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

                <div className="modal-footer justify-content-between">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn btn-secondary btn-sm"
                    disabled={modalBusy}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm font-weight-bold"
                    disabled={modalBusy}
                  >
                    {modalBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM DELETE */}
      {activeModal === 'delete' && selectedNode && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title font-16 weight-700 text-white">
                  <i className="bi bi-trash mr-1" /> Hapus Posisi?
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setActiveModal(null)}
                  disabled={modalBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p className="font-13 text-dark mb-2">
                  Anda akan menghapus posisi <strong>{selectedNode.title}</strong> (Grade {selectedNode.grade}).
                </p>
                <small className="text-muted d-block">
                  Setiap bawahan langsung akan otomatis dihubungkan ke atasan di atasnya agar hierarki tidak putus.
                </small>
              </div>
              <div className="modal-footer justify-content-between">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary btn-sm"
                  disabled={modalBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="btn btn-danger btn-sm font-weight-bold"
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

