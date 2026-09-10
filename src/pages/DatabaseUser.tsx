import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  authorityAdminApi,
  type UserManagementItem,
  type UnregisteredEmployeeItem,
} from '../api';
import { EmployeeAvatar } from '../components/EmployeeCard';

export default function DatabaseUser() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [unregistered, setUnregistered] = useState<UnregisteredEmployeeItem[]>([]);
  const [activeTab, setActiveTab] = useState<'registered' | 'unregistered'>('registered');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [pinFilter, setPinFilter] = useState<'ALL' | 'HAS_PIN' | 'NO_PIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Reveal NIK state: Set of user IDs whose NIK is revealed, or global toggle
  const [revealedNiks, setRevealedNiks] = useState<Set<number>>(new Set());
  const [revealAll, setRevealAll] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modals & Selected items
  const [resetModalUser, setResetModalUser] = useState<UserManagementItem | null>(null);
  const [customNikInput, setCustomNikInput] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const [pinModalUser, setPinModalUser] = useState<UserManagementItem | null>(null);
  const [manualPin, setManualPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  const [editModalUser, setEditModalUser] = useState<UserManagementItem | null>(null);
  const [editRole, setEditRole] = useState(1);
  const [editActive, setEditActive] = useState(true);
  const [editBusy, setEditBusy] = useState(false);

  const [registeringNrp, setRegisteringNrp] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [uData, unregData] = await Promise.all([
        authorityAdminApi.usersManagement(),
        authorityAdminApi.unregisteredEmployees().catch(() => []),
      ]);
      setUsers(uData);
      setUnregistered(unregData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered registered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesNrp = u.nrp.toLowerCase().includes(q);
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesNik = u.nikKtp?.toLowerCase().includes(q);
        const matchesJabatan = u.jabatan?.toLowerCase().includes(q);
        const matchesPerusahaan = u.perusahaan?.toLowerCase().includes(q);
        if (!matchesNrp && !matchesName && !matchesNik && !matchesJabatan && !matchesPerusahaan) {
          return false;
        }
      }
      // Role
      if (roleFilter !== 'ALL') {
        if (String(u.role) !== roleFilter) return false;
      }
      // PIN
      if (pinFilter === 'HAS_PIN' && !u.hasPin) return false;
      if (pinFilter === 'NO_PIN' && u.hasPin) return false;
      // Status
      if (statusFilter === 'ACTIVE' && !u.active) return false;
      if (statusFilter === 'INACTIVE' && u.active) return false;

      return true;
    });
  }, [users, search, roleFilter, pinFilter, statusFilter]);

  // Pagination slice
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const withPin = users.filter((u) => u.hasPin).length;
    const withoutPin = total - withPin;
    return { total, active, withPin, withoutPin };
  }, [users]);

  // Toggle reveal NIK
  function toggleNik(id: number) {
    setRevealedNiks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Copy to clipboard
  async function copyToClipboard(text: string, id: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  // Handle Reset PIN ke KTP
  async function handleConfirmResetPin() {
    if (!resetModalUser) return;
    setResetBusy(true);
    setError('');
    try {
      const res = await authorityAdminApi.resetUserPin(
        resetModalUser.id,
        customNikInput.trim() || undefined,
      );
      setSuccessMsg(res.message);
      setResetModalUser(null);
      setCustomNikInput('');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mereset PIN');
    } finally {
      setResetBusy(false);
    }
  }

  // Handle Set PIN Manual
  async function handleConfirmSetPin() {
    if (!pinModalUser) return;
    if (!manualPin.trim() || manualPin.trim().length < 4) {
      alert('PIN harus terdiri dari minimal 4 sampai 8 digit');
      return;
    }
    setPinBusy(true);
    setError('');
    try {
      const res = await authorityAdminApi.setUserPin(pinModalUser.id, manualPin.trim());
      setSuccessMsg(res.message);
      setPinModalUser(null);
      setManualPin('');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyetel PIN');
    } finally {
      setPinBusy(false);
    }
  }

  // Handle Edit User
  async function handleConfirmEdit() {
    if (!editModalUser) return;
    setEditBusy(true);
    setError('');
    try {
      await authorityAdminApi.updateUserManagement(editModalUser.id, {
        role: editRole,
        active: editActive,
      });
      setSuccessMsg(`Data user ${editModalUser.nrp} berhasil diperbarui.`);
      setEditModalUser(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memperbarui user');
    } finally {
      setEditBusy(false);
    }
  }

  // Handle Register Employee
  async function handleRegisterEmployee(emp: UnregisteredEmployeeItem) {
    if (!window.confirm(`Daftarkan akun login untuk ${emp.nama} (${emp.nrp})?`)) return;
    setRegisteringNrp(emp.nrp);
    setError('');
    try {
      await authorityAdminApi.registerEmployeeUser({
        nrp: emp.nrp,
        role: 1,
        nik: emp.nikKtp || undefined,
      });
      setSuccessMsg(`Akun untuk karyawan ${emp.nama} (${emp.nrp}) berhasil didaftarkan! Password default adalah NIK KTP.`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mendaftarkan karyawan');
    } finally {
      setRegisteringNrp(null);
    }
  }

  const roleLabel = (role: number) => {
    switch (role) {
      case 15:
        return { label: 'Super User', badge: 'badge-danger' };
      case 5:
        return { label: 'Admin / Level 5', badge: 'badge-primary' };
      case 4:
        return { label: 'Manager / Level 4', badge: 'badge-info' };
      case 3:
        return { label: 'Supervisor / Level 3', badge: 'badge-warning' };
      case 2:
        return { label: 'Leader / Level 2', badge: 'badge-secondary' };
      case 1:
      default:
        return { label: 'Crew / Level 1', badge: 'badge-light text-dark' };
    }
  };

  return (
    <div>
      {/* Header Halaman */}
      <div className="title pb-20">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h2 className="h3 mb-1">Manajemen User &amp; Kredensial</h2>
            <p className="text-secondary font-14 mb-0">
              Kelola akun login karyawan, nomor NIK / KTP, reset PIN ke KTP jika lupa password, dan kontrol hak akses.
            </p>
          </div>
          {/* Navigasi Cepat Tab Database */}
          <div className="btn-group shadow-sm">
            <Link to="/database/form" className="btn btn-sm btn-outline-primary">
              <i className="bi bi-file-earmark-diff mr-1"></i> Form
            </Link>
            <Link to="/database/data" className="btn btn-sm btn-outline-primary">
              <i className="bi bi-table mr-1"></i> Data
            </Link>
            <Link to="/database/user" className="btn btn-sm btn-primary">
              <i className="bi bi-person-gear mr-1"></i> User
            </Link>
            <Link to="/authority" className="btn btn-sm btn-outline-primary">
              <i className="bi bi-shield-lock mr-1"></i> Otoritas
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
          <i className="bi bi-exclamation-octagon-fill mr-2"></i>
          <strong>Error: </strong> {error}
          <button type="button" className="close" onClick={() => setError('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill mr-2"></i>
          {successMsg}
          <button type="button" className="close" onClick={() => setSuccessMsg('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="row mb-25">
        <div className="col-xl-3 col-sm-6 mb-20">
          <div className="card-box pd-20 height-100-p border-left border-primary shadow-sm" style={{ borderLeftWidth: '4px' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary font-13 weight-600 mb-1">TOTAL USER TERDAFTAR</div>
                <div className="h4 mb-0 text-primary weight-700">{stats.total}</div>
              </div>
              <div className="font-30 text-primary opacity-50">
                <i className="bi bi-people-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 mb-20">
          <div className="card-box pd-20 height-100-p border-left border-success shadow-sm" style={{ borderLeftWidth: '4px' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary font-13 weight-600 mb-1">USER AKTIF</div>
                <div className="h4 mb-0 text-success weight-700">{stats.active}</div>
              </div>
              <div className="font-30 text-success opacity-50">
                <i className="bi bi-check-circle-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 mb-20">
          <div className="card-box pd-20 height-100-p border-left border-info shadow-sm" style={{ borderLeftWidth: '4px' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary font-13 weight-600 mb-1">SUDAH SET PIN</div>
                <div className="h4 mb-0 text-info weight-700">{stats.withPin}</div>
              </div>
              <div className="font-30 text-info opacity-50">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 mb-20">
          <div className="card-box pd-20 height-100-p border-left border-warning shadow-sm" style={{ borderLeftWidth: '4px' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary font-13 weight-600 mb-1">LOGIN VIA NIK KTP</div>
                <div className="h4 mb-0 text-warning weight-700">{stats.withoutPin}</div>
              </div>
              <div className="font-30 text-warning opacity-50">
                <i className="bi bi-person-badge-fill"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card Box */}
      <div className="card-box mb-30 shadow-sm">
        {/* Nav Tabs */}
        <div className="pd-20 pb-0 border-bottom">
          <ul className="nav nav-tabs customtab" role="tablist">
            <li className="nav-item">
              <a
                className={`nav-link ${activeTab === 'registered' ? 'active font-weight-bold' : ''}`}
                href="#registered"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('registered');
                }}
              >
                <i className="bi bi-people mr-1"></i> User Terdaftar Sistem ({users.length})
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${activeTab === 'unregistered' ? 'active font-weight-bold' : ''}`}
                href="#unregistered"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('unregistered');
                }}
              >
                <i className="bi bi-person-plus mr-1"></i> Karyawan Belum Punya Akun ({unregistered.length})
              </a>
            </li>
          </ul>
        </div>

        {/* Tab 1: User Terdaftar */}
        {activeTab === 'registered' && (
          <div className="pd-20">
            {/* Filter & Toolbar */}
            <div className="row align-items-center mb-3">
              <div className="col-lg-4 col-md-6 mb-2">
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-white border-right-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control border-left-0"
                    placeholder="Cari Nama, NRP, NIK, Jabatan..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                  {search && (
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setPage(1);
                        }}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-lg-2 col-md-3 col-sm-6 mb-2">
                <select
                  className="form-control"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua Role</option>
                  <option value="1">Crew (Level 1)</option>
                  <option value="2">Leader (Level 2)</option>
                  <option value="3">Supervisor (Level 3)</option>
                  <option value="4">Manager (Level 4)</option>
                  <option value="5">Admin (Level 5)</option>
                  <option value="15">Super User (Level 15)</option>
                </select>
              </div>

              <div className="col-lg-2 col-md-3 col-sm-6 mb-2">
                <select
                  className="form-control"
                  value={pinFilter}
                  onChange={(e) => {
                    setPinFilter(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua Status PIN</option>
                  <option value="HAS_PIN">Sudah Set PIN</option>
                  <option value="NO_PIN">Belum Set PIN (Login KTP)</option>
                </select>
              </div>

              <div className="col-lg-2 col-md-6 col-sm-6 mb-2">
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua Status Akun</option>
                  <option value="ACTIVE">Hanya Aktif</option>
                  <option value="INACTIVE">Hanya Nonaktif</option>
                </select>
              </div>

              <div className="col-lg-2 col-md-6 col-sm-6 mb-2 text-right">
                <button
                  type="button"
                  className={`btn btn-sm ${revealAll ? 'btn-primary' : 'btn-outline-secondary'} btn-block`}
                  onClick={() => setRevealAll(!revealAll)}
                  title="Tampilkan / sembunyikan semua nomor NIK KTP di tabel"
                >
                  <i className={`bi ${revealAll ? 'bi-eye-slash' : 'bi-eye'} mr-1`}></i>
                  {revealAll ? 'Tutup NIK' : 'Lihat Semua NIK'}
                </button>
              </div>
            </div>

            {/* Helper Info Alert */}
            <div className="alert alert-info py-2 px-3 mb-3 font-13 d-flex align-items-center justify-content-between">
              <div>
                <i className="bi bi-info-circle-fill mr-2 text-info"></i>
                <strong>Fitur Bantuan User: </strong>
                Nomor NIK KTP dapat dilihat langsung dengan tombol mata 👁️. Jika karyawan lupa PIN, gunakan tombol <strong>Reset PIN ke KTP</strong> agar karyawan dapat langsung login kembali menggunakan nomor NIK KTP mereka.
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light ml-2 border"
                onClick={loadData}
                disabled={loading}
                title="Muat ulang data"
              >
                <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i> Refresh
              </button>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 font-13 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: '45px' }}>#</th>
                    <th>Karyawan / User</th>
                    <th style={{ minWidth: '220px' }}>
                      NIK / KTP (Default Password)
                      <span className="text-muted font-11 d-block font-weight-normal">Digunakan saat lupa PIN</span>
                    </th>
                    <th>Role &amp; Level</th>
                    <th>Status Autentikasi</th>
                    <th>Status Akun</th>
                    <th className="text-center" style={{ minWidth: '180px' }}>Aksi Bantuan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="spinner-border text-primary mr-2" role="status"></div>
                        <span className="text-muted">Memuat data user &amp; NIK KTP…</span>
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        <i className="bi bi-search font-24 d-block mb-2 text-secondary"></i>
                        Tidak ada data user yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, idx) => {
                      const isRevealed = revealAll || revealedNiks.has(u.id);
                      const roleMeta = roleLabel(u.role);
                      const rowNum = (page - 1) * pageSize + idx + 1;

                      return (
                        <tr key={u.id}>
                          <td className="text-muted font-12 align-middle">{rowNum}</td>

                          {/* Karyawan / User Card Preview */}
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <div className="mr-2 flex-shrink-0">
                                <EmployeeAvatar nama={u.name} size={38} />
                              </div>
                              <div className="overflow-hidden" style={{ lineHeight: '1.3' }}>
                                <div className="weight-700 text-dark font-14 text-truncate">{u.name}</div>
                                <div className="font-12 text-primary weight-600">
                                  {u.nrp}
                                  {u.jabatan && (
                                    <span className="text-secondary font-weight-normal ml-1">
                                      • {u.jabatan.replace(/-/g, ' ')}
                                    </span>
                                  )}
                                </div>
                                {u.perusahaan && (
                                  <div className="font-11 text-muted text-truncate">
                                    {u.perusahaan.replace(/-/g, ' ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* NIK / KTP */}
                          <td className="align-middle">
                            {u.nikKtp ? (
                              <div className="d-flex align-items-center">
                                <span
                                  className={`badge ${isRevealed ? 'badge-dark' : 'badge-light border'} px-2 py-1 mr-2 font-13 weight-600`}
                                  style={{ letterSpacing: isRevealed ? '0.5px' : '2px', fontFamily: 'monospace' }}
                                >
                                  {isRevealed ? u.nikKtp : '••••••••••••••••'}
                                </span>
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                    onClick={() => toggleNik(u.id)}
                                    title={isRevealed ? 'Sembunyikan NIK' : 'Lihat Nomor NIK KTP'}
                                  >
                                    <i className={`bi ${isRevealed ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                    onClick={() => copyToClipboard(u.nikKtp!, u.id)}
                                    title="Salin Nomor NIK KTP"
                                  >
                                    <i
                                      className={`bi ${copiedId === u.id ? 'bi-check text-success' : 'bi-clipboard'}`}
                                    ></i>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="badge badge-warning font-11">
                                <i className="bi bi-exclamation-circle mr-1"></i> Belum terisi di master
                              </span>
                            )}
                          </td>

                          {/* Role & Level */}
                          <td className="align-middle">
                            <span className={`badge ${roleMeta.badge} font-12 py-1 px-2`}>
                              {roleMeta.label}
                            </span>
                          </td>

                          {/* Status Autentikasi */}
                          <td className="align-middle">
                            {u.hasPin ? (
                              <span className="badge badge-success font-11 py-1 px-2" title="User login menggunakan 6-digit PIN">
                                <i className="bi bi-shield-check mr-1"></i> PIN Aktif
                              </span>
                            ) : (
                              <span className="badge badge-warning font-11 py-1 px-2" title="User login menggunakan nomor NIK KTP">
                                <i className="bi bi-person-badge mr-1"></i> Login via NIK KTP
                              </span>
                            )}
                          </td>

                          {/* Status Akun */}
                          <td className="align-middle">
                            {u.active ? (
                              <span className="badge badge-pill badge-outline-success text-success font-11">
                                <i className="bi bi-dot font-16"></i> Aktif
                              </span>
                            ) : (
                              <span className="badge badge-pill badge-outline-danger text-danger font-11">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          {/* Tombol Aksi Bantuan */}
                          <td className="align-middle text-center">
                            <div className="btn-group btn-group-sm">
                              {/* Reset PIN ke KTP */}
                              <button
                                type="button"
                                className="btn btn-warning btn-sm"
                                onClick={() => {
                                  setResetModalUser(u);
                                  setCustomNikInput(u.nikKtp || '');
                                }}
                                title="Reset PIN ke NIK KTP kembali (jika karyawan lupa password/PIN)"
                              >
                                <i className="bi bi-arrow-counterclockwise mr-1"></i> Reset ke KTP
                              </button>

                              {/* Set PIN Manual */}
                              <button
                                type="button"
                                className="btn btn-outline-info btn-sm"
                                onClick={() => {
                                  setPinModalUser(u);
                                  setManualPin('');
                                }}
                                title="Bantu set PIN 6 angka langsung"
                              >
                                <i className="bi bi-key"></i>
                              </button>

                              {/* Edit Role & Status */}
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                  setEditModalUser(u);
                                  setEditRole(u.role);
                                  setEditActive(u.active);
                                }}
                                title="Ubah Role Level & Status Aktif"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Info */}
            <div className="d-flex justify-content-between align-items-center flex-wrap mt-3 pt-2 border-top">
              <div className="text-muted font-12 mb-2">
                Menampilkan {paginatedUsers.length} dari {filteredUsers.length} user (Halaman {page} dari {totalPages})
              </div>
              {totalPages > 1 && (
                <div className="btn-group btn-group-sm mb-2">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    &laquo; Pertama
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    &lsaquo; Prev
                  </button>
                  <span className="btn btn-light disabled text-dark px-3 font-weight-bold">
                    {page}
                  </span>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next &rsaquo;
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    Terakhir &raquo;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Karyawan Belum Punya Akun */}
        {activeTab === 'unregistered' && (
          <div className="pd-20">
            {unregistered.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-success font-45 mb-2">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <h5 className="text-dark weight-700">Semua Karyawan Sudah Memiliki Akun Login!</h5>
                <p className="text-muted font-13 max-width-500 mx-auto">
                  Seluruh data personil yang terdaftar di master HRD (KARYAWAN) saat ini sudah memiliki akun login di tabel User sistem.
                </p>
              </div>
            ) : (
              <div>
                <div className="alert alert-warning py-2 px-3 mb-3 font-13">
                  <i className="bi bi-exclamation-triangle-fill mr-2 text-warning"></i>
                  Ditemukan <strong>{unregistered.length} karyawan</strong> di master HRD yang belum memiliki akun login di tabel User. Anda dapat mendaftarkan akun mereka dengan 1 klik (password login default adalah NIK KTP).
                </div>

                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0 font-13 align-middle">
                    <thead className="thead-light">
                      <tr>
                        <th>#</th>
                        <th>NRP</th>
                        <th>Nama Karyawan</th>
                        <th>Nomor NIK KTP</th>
                        <th>Jabatan</th>
                        <th>Perusahaan</th>
                        <th className="text-center">Aksi Pendaftaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unregistered.map((emp, i) => (
                        <tr key={emp.nrp}>
                          <td className="text-muted font-12">{i + 1}</td>
                          <td className="weight-700 text-primary">{emp.nrp}</td>
                          <td className="weight-600 text-dark">{emp.nama}</td>
                          <td>
                            {emp.nikKtp ? (
                              <span className="badge badge-dark px-2 py-1 font-12">{emp.nikKtp}</span>
                            ) : (
                              <span className="badge badge-warning">Belum diisi di master</span>
                            )}
                          </td>
                          <td>{emp.jabatan ? emp.jabatan.replace(/-/g, ' ') : '-'}</td>
                          <td>{emp.perusahaan ? emp.perusahaan.replace(/-/g, ' ') : '-'}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleRegisterEmployee(emp)}
                              disabled={registeringNrp === emp.nrp}
                            >
                              {registeringNrp === emp.nrp ? (
                                <>
                                  <span className="spinner-border spinner-border-sm mr-1"></span> Mendaftarkan…
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-person-plus-fill mr-1"></i> Daftarkan Akun User
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal 1: Konfirmasi Reset PIN ke KTP */}
      {resetModalUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-arrow-counterclockwise mr-2"></i> Reset PIN ke NIK KTP
                </h5>
                <button
                  type="button"
                  className="close text-dark"
                  onClick={() => setResetModalUser(null)}
                  disabled={resetBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body font-14">
                <p className="mb-2">
                  Apakah Anda ingin mereset kredensial login untuk karyawan berikut?
                </p>

                <div className="card-box p-3 bg-light border mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <EmployeeAvatar nama={resetModalUser.name} size={42} />
                    <div className="ml-3">
                      <div className="weight-700 font-15 text-dark">{resetModalUser.name}</div>
                      <div className="text-primary weight-600 font-13">{resetModalUser.nrp}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-top font-13">
                    <span className="text-muted">Nomor NIK KTP: </span>
                    <strong className="text-dark font-14 ml-1">
                      {resetModalUser.nikKtp || customNikInput || '(Belum terisi)'}
                    </strong>
                  </div>
                </div>

                {!resetModalUser.nikKtp && (
                  <div className="form-group mb-3">
                    <label className="font-13 weight-600 text-danger">
                      Masukkan Nomor NIK KTP (karena tidak ditemukan di master HRD):
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Masukkan 16-digit nomor NIK KTP"
                      value={customNikInput}
                      onChange={(e) => setCustomNikInput(e.target.value)}
                    />
                  </div>
                )}

                <div className="alert alert-warning py-2 px-3 font-13 mb-0">
                  <i className="bi bi-shield-exclamation mr-1"></i>
                  <strong>Konsekuensi Reset:</strong>
                  <ul className="mb-0 pl-3 mt-1 font-12">
                    <li>PIN 6-digit saat ini akan <strong>dihapus</strong>.</li>
                    <li>Password login dikembalikan ke nomor <strong>NIK KTP</strong> di atas.</li>
                    <li>Karyawan dapat langsung login kembali ke aplikasi menggunakan <strong>NRP &amp; NIK KTP</strong>.</li>
                  </ul>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetModalUser(null)}
                  disabled={resetBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-warning weight-600"
                  onClick={handleConfirmResetPin}
                  disabled={resetBusy || (!resetModalUser.nikKtp && !customNikInput.trim())}
                >
                  {resetBusy ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1"></span> Mereset…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle mr-1"></i> Ya, Reset PIN ke KTP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Set PIN Manual */}
      {pinModalUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-key mr-2"></i> Set PIN Manual
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setPinModalUser(null)}
                  disabled={pinBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body font-14">
                <div className="mb-2">
                  Karyawan: <strong>{pinModalUser.name}</strong> ({pinModalUser.nrp})
                </div>
                <div className="form-group mb-0">
                  <label className="font-13 weight-600">PIN Baru (4-8 digit angka):</label>
                  <input
                    type="password"
                    maxLength={8}
                    className="form-control text-center font-18 weight-700"
                    placeholder="••••••"
                    value={manualPin}
                    onChange={(e) => setManualPin(e.target.value.replace(/\D/g, ''))}
                  />
                  <small className="text-muted">Hanya angka digit.</small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPinModalUser(null)}
                  disabled={pinBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-info weight-600"
                  onClick={handleConfirmSetPin}
                  disabled={pinBusy || manualPin.length < 4}
                >
                  {pinBusy ? 'Menyimpan…' : 'Simpan PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Role & Status */}
      {editModalUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-16 weight-700">
                  <i className="bi bi-pencil-square mr-2"></i> Edit User: {editModalUser.nrp}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setEditModalUser(null)}
                  disabled={editBusy}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body font-14">
                <div className="form-group mb-3">
                  <label className="font-13 weight-600">Nama Akun:</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={editModalUser.name}
                    disabled
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="font-13 weight-600">Role Level Pengguna:</label>
                  <select
                    className="form-control"
                    value={editRole}
                    onChange={(e) => setEditRole(Number(e.target.value))}
                  >
                    <option value={1}>Level 1 - Crew</option>
                    <option value={2}>Level 2 - Leader</option>
                    <option value={3}>Level 3 - Supervisor</option>
                    <option value={4}>Level 4 - Manager</option>
                    <option value={5}>Level 5 - Admin</option>
                    <option value={15}>Level 15 - Super User (Semua Akses)</option>
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="font-13 weight-600">Status Akun:</label>
                  <div className="custom-control custom-switch">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="activeToggle"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    <label className="custom-control-label" htmlFor="activeToggle">
                      {editActive ? (
                        <span className="text-success weight-600">Akun Aktif (Dapat Login)</span>
                      ) : (
                        <span className="text-danger weight-600">Akun Nonaktif (Diblokir)</span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditModalUser(null)}
                  disabled={editBusy}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmEdit}
                  disabled={editBusy}
                >
                  {editBusy ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
