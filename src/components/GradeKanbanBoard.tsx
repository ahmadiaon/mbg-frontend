import React, { useMemo, useState } from 'react';
import type { MasterJabatanItem, OrgGradeItem } from '../api';

interface GradeStyle {
  accentColor: string;
  badgeClass: string;
  badgeStyle: React.CSSProperties;
  label: string;
}

interface GradeKanbanBoardProps {
  masterJabatan: MasterJabatanItem[];
  grades: OrgGradeItem[];
  gradeStyles: Record<number, GradeStyle>;
  isSuperAdmin: boolean;
  onMoveGrade: (item: MasterJabatanItem, targetGrade: number) => Promise<void>;
  onBulkMoveGrade: (items: Array<{ recordCode: string; grade: number }>) => Promise<void>;
  onApplyPreset: () => Promise<void>;
  onRefresh: () => void;
}

export default function GradeKanbanBoard({
  masterJabatan,
  grades,
  gradeStyles,
  isSuperAdmin,
  onMoveGrade,
  onBulkMoveGrade,
  onApplyPreset,
  onRefresh,
}: GradeKanbanBoardProps) {
  // Mode Tampilan: Papan Kanban vs Tabel Master
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filter states
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'EKSEKUTIF' | 'SITE' | 'PENGAWAS' | 'PELAKSANA'>('ALL');

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<MasterJabatanItem | null>(null);
  const [dragOverGrade, setDragOverGrade] = useState<number | null>(null);

  // Bulk Selection state (untuk tabel)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState<number>(1);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Preset Modal
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

  // Daftar unik departemen
  const departments = useMemo(() => {
    const set = new Set<string>();
    masterJabatan.forEach((j) => {
      if (j.department) set.add(j.department);
    });
    return Array.from(set).sort();
  }, [masterJabatan]);

  // Filter items
  const filteredJabatan = useMemo(() => {
    return masterJabatan.filter((j) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchCode = j.recordCode.toLowerCase().includes(q);
        const matchDept = j.department.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchDept) return false;
      }

      // Dept filter
      if (deptFilter !== 'ALL' && j.department !== deptFilter) {
        return false;
      }

      // Tier filter
      if (tierFilter === 'EKSEKUTIF' && j.grade < 13) return false;
      if (tierFilter === 'SITE' && (j.grade < 6 || j.grade > 12)) return false;
      if (tierFilter === 'PENGAWAS' && (j.grade < 3 || j.grade > 5)) return false;
      if (tierFilter === 'PELAKSANA' && j.grade > 2) return false;

      return true;
    });
  }, [masterJabatan, search, deptFilter, tierFilter]);

  // Kelompokkan jabatan per Grade
  const groupedByGrade = useMemo(() => {
    const map: Record<number, MasterJabatanItem[]> = {};
    for (let i = 1; i <= 19; i++) map[i] = [];
    filteredJabatan.forEach((item) => {
      if (!map[item.grade]) map[item.grade] = [];
      map[item.grade].push(item);
    });
    return map;
  }, [filteredJabatan]);

  // Filter grade columns yang akan ditampilkan di Kanban
  const visibleGrades = useMemo(() => {
    let list = [...grades].sort((a, b) => b.level - a.level); // Descending G19 -> G01
    if (tierFilter === 'EKSEKUTIF') list = list.filter((g) => g.level >= 13);
    else if (tierFilter === 'SITE') list = list.filter((g) => g.level >= 6 && g.level <= 12);
    else if (tierFilter === 'PENGAWAS') list = list.filter((g) => g.level >= 3 && g.level <= 5);
    else if (tierFilter === 'PELAKSANA') list = list.filter((g) => g.level <= 2);
    return list;
  }, [grades, tierFilter]);

  // Drag & Drop handlers
  function handleDragStart(item: MasterJabatanItem) {
    setDraggedItem(item);
  }

  function handleDragEnd() {
    setDraggedItem(null);
    setDragOverGrade(null);
  }

  async function handleDrop(targetGrade: number) {
    if (!draggedItem || draggedItem.grade === targetGrade) {
      setDraggedItem(null);
      setDragOverGrade(null);
      return;
    }
    const itemToMove = draggedItem;
    setDraggedItem(null);
    setDragOverGrade(null);
    await onMoveGrade(itemToMove, targetGrade);
  }

  // Bulk actions handlers
  function toggleSelectAll() {
    if (selectedCodes.size === filteredJabatan.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredJabatan.map((j) => j.recordCode)));
    }
  }

  function toggleSelectOne(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleExecuteBulkMove() {
    if (selectedCodes.size === 0) return;
    setIsBulkSubmitting(true);
    try {
      const updates = Array.from(selectedCodes).map((recordCode) => ({
        recordCode,
        grade: Number(bulkGrade),
      }));
      await onBulkMoveGrade(updates);
      setSelectedCodes(new Set());
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  // Preset execution
  async function handleConfirmPreset() {
    setIsApplyingPreset(true);
    try {
      await onApplyPreset();
      setShowPresetModal(false);
    } finally {
      setIsApplyingPreset(false);
    }
  }

  return (
    <div className="grade-kanban-wrapper">
      {/* TOOLBAR KONTROL ATAS (DESKAPP CARD-BOX) */}
      <div className="card-box pd-20 mb-20 shadow-sm">
        <div className="row align-items-center mb-3">
          <div className="col-md-7 col-sm-12 mb-2 mb-md-0">
            <h4 className="font-18 weight-700 text-dark mb-1">
              <i className="bi bi-diagram-3-fill text-primary mr-2" />
              Kelola & Pindah Grade Jabatan
            </h4>
            <p className="font-12 text-muted mb-0">
              Geser kartu jabatan antar kolom grade untuk memindahkan wewenang, atau gunakan tombol pindah cepat.
            </p>
          </div>

          <div className="col-md-5 col-sm-12 text-md-right">
            {/* Switch Mode: Kanban vs Tabel */}
            <div className="btn-group btn-group-sm mr-2 mb-1">
              <button
                type="button"
                className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-light border'}`}
                onClick={() => setViewMode('kanban')}
                title="Tampilan Kolom Papan Grade"
              >
                <i className="bi bi-kanban mr-1" /> Papan Grade
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-light border'}`}
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel & Centang Massal"
              >
                <i className="bi bi-table mr-1" /> Tabel Master ({filteredJabatan.length})
              </button>
            </div>

            {/* Tombol Rekomendasi Pintar (Auto-Map PRD) */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowPresetModal(true)}
                className="btn btn-warning btn-sm mr-2 mb-1 weight-600 shadow-sm"
                title="Petakan otomatis seluruh 285 jabatan sesuai standar pertambangan PRD v2.0"
              >
                <i className="bi bi-magic mr-1" /> Rekomendasi Pintar PRD
              </button>
            )}

            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-outline-secondary btn-sm mb-1"
              title="Muat ulang data"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
          </div>
        </div>

        {/* ROW FILTER: Search + Tier + Dept */}
        <div className="row pt-2 border-top">
          {/* Search Box */}
          <div className="col-lg-4 col-md-6 mb-2">
            <div className="input-group input-group-sm">
              <div className="input-group-prepend">
                <span className="input-group-text bg-light border-right-0">
                  <i className="bi bi-search text-muted" />
                </span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Jabatan / Kode / Departemen..."
                className="form-control form-control-sm border-left-0"
              />
              {search && (
                <div className="input-group-append">
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="btn btn-outline-secondary"
                  >
                    <i className="bi bi-x" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Klaster Departemen */}
          <div className="col-lg-4 col-md-6 mb-2">
            <div className="d-flex align-items-center">
              <label className="font-12 weight-600 text-muted mr-2 mb-0 text-nowrap">BIDANG:</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="custom-select custom-select-sm"
              >
                <option value="ALL">Semua Bidang ({masterJabatan.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Tingkatan (Tier) Grade */}
          <div className="col-lg-4 col-md-12 mb-2 text-lg-right">
            <div className="btn-group btn-group-sm flex-wrap">
              <button
                type="button"
                className={`btn ${tierFilter === 'ALL' ? 'btn-dark' : 'btn-light border'} font-11`}
                onClick={() => setTierFilter('ALL')}
              >
                Semua G01–G19
              </button>
              <button
                type="button"
                className={`btn ${tierFilter === 'EKSEKUTIF' ? 'btn-dark' : 'btn-light border'} font-11`}
                onClick={() => setTierFilter('EKSEKUTIF')}
                title="G13 - G19: Direksi & Manager"
              >
                G13–G19
              </button>
              <button
                type="button"
                className={`btn ${tierFilter === 'SITE' ? 'btn-dark' : 'btn-light border'} font-11`}
                onClick={() => setTierFilter('SITE')}
                title="G06 - G12: Site & Superintendent"
              >
                G06–G12
              </button>
              <button
                type="button"
                className={`btn ${tierFilter === 'PENGAWAS' ? 'btn-dark' : 'btn-light border'} font-11`}
                onClick={() => setTierFilter('PENGAWAS')}
                title="G03 - G05: Supervisor & Section"
              >
                G03–G05
              </button>
              <button
                type="button"
                className={`btn ${tierFilter === 'PELAKSANA' ? 'btn-dark' : 'btn-light border'} font-11`}
                onClick={() => setTierFilter('PELAKSANA')}
                title="G01 - G02: Operator & Crew"
              >
                G01–G02
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN 1: PAPAN KANBAN GRADE (DRAG & DROP)                             */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' && (
        <div
          className="kanban-scroll-area pb-4"
          style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            alignItems: 'flex-start',
            minHeight: '620px',
            paddingBottom: '20px',
          }}
        >
          {visibleGrades.map((g) => {
            const items = groupedByGrade[g.level] || [];
            const isOver = dragOverGrade === g.level;
            const isUserLevel = g.level === 15;
            const gStyle = gradeStyles[g.level] || {
              accentColor: '#6c757d',
              badgeClass: 'badge badge-secondary',
              badgeStyle: { backgroundColor: '#6c757d', color: '#fff' },
              label: `Grade ${g.level}`,
            };

            return (
              <div
                key={g.level}
                className="kanban-column card-box shadow-sm"
                style={{
                  flex: '0 0 290px',
                  minWidth: '290px',
                  maxWidth: '290px',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: isOver ? '#f0fdf4' : isUserLevel ? '#fffdf0' : '#ffffff',
                  border: isOver
                    ? '2px dashed #10b981'
                    : isUserLevel
                    ? '2px solid #f59e0b'
                    : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverGrade !== g.level) setDragOverGrade(g.level);
                }}
                onDragLeave={() => {
                  if (dragOverGrade === g.level) setDragOverGrade(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(g.level);
                }}
              >
                {/* Header Kolom Grade */}
                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                  <div className="d-flex align-items-center text-truncate mr-2">
                    <span
                      className="badge badge-pill font-11 mr-2 px-2 py-1 weight-700"
                      style={gStyle.badgeStyle}
                    >
                      {g.code}
                    </span>
                    <span
                      className="font-13 weight-700 text-dark text-truncate"
                      title={`${g.code} · ${g.name}`}
                    >
                      {g.name}
                    </span>
                  </div>
                  <span
                    className={`badge badge-pill ${
                      items.length > 0 ? 'badge-secondary' : 'badge-light border text-muted'
                    } font-11`}
                    title={`Total ${items.length} jabatan`}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Banner Posisi Anda untuk G15 */}
                {isUserLevel && (
                  <div
                    className="alert alert-warning py-1 px-2 mb-2 font-11 weight-600 text-center rounded"
                    style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }}
                  >
                    ⭐ Posisi Anda (General Manager)
                  </div>
                )}

                {/* Container Kartu (Drop Zone) */}
                <div
                  className="kanban-cards-container customscroll"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: '650px',
                    minHeight: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '4px',
                  }}
                >
                  {items.length === 0 ? (
                    <div
                      className="d-flex flex-column align-items-center justify-content-center text-muted font-12 py-5"
                      style={{
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        minHeight: '160px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <i className="bi bi-box-arrow-in-down font-24 mb-1 text-muted opacity-50" />
                      <span>Kosong (0 Jabatan)</span>
                      <small className="text-muted font-10">Tarik kartu jabatan ke sini</small>
                    </div>
                  ) : (
                    items.map((item) => {
                      const isItemUser =
                        item.title.toUpperCase().includes('GENERAL MANAGER') ||
                        item.title.toUpperCase().includes('ALL SITE MANAGER');

                      return (
                        <div
                          key={item.recordCode}
                          draggable={isSuperAdmin}
                          onDragStart={() => handleDragStart(item)}
                          onDragEnd={handleDragEnd}
                          className="kanban-item-card p-2 bg-white rounded shadow-sm border"
                          style={{
                            cursor: isSuperAdmin ? 'grab' : 'default',
                            borderLeft: `4px solid ${gStyle.accentColor} !important`,
                            backgroundColor: isItemUser ? '#fffbeb' : '#ffffff',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Top Tag Departemen & Jumlah Orang */}
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span
                              className="badge badge-light border text-muted font-10 text-truncate"
                              style={{ maxWidth: '170px' }}
                              title={item.department}
                            >
                              {item.department}
                            </span>
                            {item.employeeCount > 0 ? (
                              <span
                                className="badge badge-pill badge-primary font-10"
                                title={`${item.employeeCount} karyawan terdaftar pada jabatan ini`}
                              >
                                <i className="bi bi-person-fill mr-1" />
                                {item.employeeCount}
                              </span>
                            ) : (
                              <span className="text-muted font-10" title="Belum ada orang">
                                0
                              </span>
                            )}
                          </div>

                          {/* Judul Jabatan */}
                          <div className="weight-700 font-13 text-dark mb-2 line-height-14">
                            {item.title}
                            {isItemUser && (
                              <span className="badge badge-warning ml-1 font-9 text-dark">
                                ⭐ Anda
                              </span>
                            )}
                          </div>

                          {/* Dropdown Quick Move (Bisa pindah klik tanpa drag) */}
                          {isSuperAdmin && (
                            <div className="d-flex align-items-center justify-content-between pt-1 border-top mt-1">
                              <span className="text-muted font-10">
                                <i className="bi bi-arrows-move mr-1" /> Pindah:
                              </span>
                              <select
                                value={item.grade}
                                onChange={(e) => onMoveGrade(item, Number(e.target.value))}
                                className="custom-select custom-select-sm py-0 px-1 font-11"
                                style={{ height: '24px', width: '120px' }}
                              >
                                {grades.map((gr) => (
                                  <option key={gr.level} value={gr.level}>
                                    {gr.code} · {gr.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 2: TABEL MASTER JABATAN (BULK SELECTION & INLINE MOVE)           */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="card-box pd-20 mb-20 shadow-sm">
          {/* BAR BULK ACTION JIKA ADA YANG DICENTANG */}
          {selectedCodes.size > 0 && isSuperAdmin && (
            <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap shadow-sm">
              <div className="d-flex align-items-center mb-1 mb-md-0">
                <i className="bi bi-check2-circle font-20 mr-2 text-info" />
                <span className="weight-700 font-14">
                  {selectedCodes.size} jabatan terpilih
                </span>
              </div>

              <div className="form-inline flex-wrap">
                <label className="font-12 weight-600 mr-2 text-dark">
                  Pindahkan Semua ke Grade:
                </label>
                <select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(Number(e.target.value))}
                  className="custom-select custom-select-sm mr-2 mb-1"
                  style={{ minWidth: '180px' }}
                >
                  {grades.map((gr) => (
                    <option key={gr.level} value={gr.level}>
                      {gr.code} · {gr.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExecuteBulkMove}
                  disabled={isBulkSubmitting}
                  className="btn btn-primary btn-sm mb-1 weight-600"
                >
                  {isBulkSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1" />
                      Memindahkan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-right-circle mr-1" />
                      Terapkan Pemindahan
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCodes(new Set())}
                  className="btn btn-light btn-sm mb-1 ml-2 border"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* TABLE DATA */}
          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0 font-13">
              <thead className="thead-light">
                <tr>
                  {isSuperAdmin && (
                    <th style={{ width: '40px' }} className="text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredJabatan.length > 0 &&
                          selectedCodes.size === filteredJabatan.length
                        }
                        onChange={toggleSelectAll}
                        title="Pilih Semua"
                      />
                    </th>
                  )}
                  <th style={{ width: '50px' }} className="text-center">
                    No
                  </th>
                  <th>Nama Jabatan</th>
                  <th>Bidang / Departemen</th>
                  <th style={{ width: '120px' }} className="text-center">
                    Karyawan
                  </th>
                  <th style={{ width: '180px' }}>Grade Saat Ini</th>
                  {isSuperAdmin && <th style={{ width: '180px' }}>Ubah Grade Cepat</th>}
                </tr>
              </thead>
              <tbody>
                {filteredJabatan.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isSuperAdmin ? 7 : 5}
                      className="text-center text-muted py-5"
                    >
                      <i className="bi bi-inbox font-24 d-block mb-1" />
                      Tidak ada jabatan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredJabatan.map((item, idx) => {
                    const isSelected = selectedCodes.has(item.recordCode);
                    const isItemUser =
                      item.title.toUpperCase().includes('GENERAL MANAGER') ||
                      item.title.toUpperCase().includes('ALL SITE MANAGER');
                    const gStyle = gradeStyles[item.grade] || {
                      accentColor: '#6c757d',
                      badgeClass: 'badge badge-secondary',
                      badgeStyle: { backgroundColor: '#6c757d', color: '#fff' },
                      label: `Grade ${item.grade}`,
                    };

                    return (
                      <tr
                        key={item.recordCode}
                        className={isSelected ? 'table-info' : isItemUser ? 'table-warning' : ''}
                      >
                        {isSuperAdmin && (
                          <td className="text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.recordCode)}
                            />
                          </td>
                        )}
                        <td className="text-center text-muted align-middle weight-600">
                          {idx + 1}
                        </td>
                        <td className="align-middle">
                          <div className="weight-700 text-dark">
                            {item.title}
                            {isItemUser && (
                              <span className="badge badge-warning ml-2 font-10 text-dark">
                                ⭐ Posisi Anda
                              </span>
                            )}
                          </div>
                          <small className="text-muted font-11">{item.recordCode}</small>
                        </td>
                        <td className="align-middle">
                          <span className="badge badge-light border text-muted font-11">
                            {item.department}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          {item.employeeCount > 0 ? (
                            <span className="badge badge-pill badge-primary font-11">
                              <i className="bi bi-people-fill mr-1" />
                              {item.employeeCount} orang
                            </span>
                          ) : (
                            <span className="text-muted font-11">—</span>
                          )}
                        </td>
                        <td className="align-middle">
                          <span
                            className="badge badge-pill font-11 px-2 py-1 weight-700"
                            style={gStyle.badgeStyle}
                          >
                            {gStyle.label}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="align-middle">
                            <select
                              value={item.grade}
                              onChange={(e) => onMoveGrade(item, Number(e.target.value))}
                              className="custom-select custom-select-sm font-12"
                            >
                              {grades.map((gr) => (
                                <option key={gr.level} value={gr.level}>
                                  {gr.code} · {gr.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI REKOMENDASI PINTAR PRD                                   */}
      {/* ========================================================================= */}
      {showPresetModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-warning text-dark py-3">
                <h5 className="modal-title weight-700 font-16">
                  <i className="bi bi-magic mr-2" />
                  Terapkan Rekomendasi Pintar PRD v2.0
                </h5>
                <button
                  type="button"
                  className="close text-dark"
                  onClick={() => setShowPresetModal(false)}
                  disabled={isApplyingPreset}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body p-4 font-13">
                <p className="mb-2 weight-700 text-dark">
                  Apakah Anda ingin mengalibrasi otomatis seluruh 285 jabatan ke Grade PRD v2.0?
                </p>
                <div className="p-3 bg-light rounded border mb-3 font-12">
                  <div className="mb-1">
                    <strong>G17:</strong> Direktur Utama, Direktur PT MBLE
                  </div>
                  <div className="mb-1 text-primary">
                    <strong>G15:</strong> ⭐ General Manager, All Site Manager (Posisi Anda)
                  </div>
                  <div className="mb-1">
                    <strong>G14:</strong> Project Manager, Plant Manager, Engineering Manager
                  </div>
                  <div className="mb-1">
                    <strong>G09:</strong> Kepala Teknik Tambang (KTT), PJO Site TOP/KBU/GBM
                  </div>
                  <div className="mb-1">
                    <strong>G07:</strong> Superintendent (HRD, Plant, Scheduller)
                  </div>
                  <div className="mb-1">
                    <strong>G04:</strong> Supervisor & Foreman (Hauling, Pit, Crusher, Nahkoda)
                  </div>
                  <div className="mb-1">
                    <strong>G03:</strong> Section Admin, Weighbridge, Timekeeper, Paramedic
                  </div>
                  <div className="mb-1">
                    <strong>G01:</strong> Driver Dump Truck, Operator Alat Berat, Mekanik, ABK
                  </div>
                </div>
                <small className="text-muted d-block">
                  Catatan: Anda tetap dapat mengubah kembali grade jabatan apa pun kapan saja setelah proses ini selesai.
                </small>
              </div>

              <div className="modal-footer py-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm border"
                  onClick={() => setShowPresetModal(false)}
                  disabled={isApplyingPreset}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-warning btn-sm weight-700"
                  onClick={handleConfirmPreset}
                  disabled={isApplyingPreset}
                >
                  {isApplyingPreset ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1" />
                      Sedang Mengalibrasi...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill mr-1" />
                      Ya, Terapkan Sekarang
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
