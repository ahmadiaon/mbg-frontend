import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  waterLevelApi,
  type WaterLevelItem,
  type WaterLevelSummary,
} from '../api';

const ASSETS_BASE = 'https://assets.mitrabaritogroup.com';

function resolvePhotoUrl(
  folder: 'water_level/panorama' | 'water_level/draft_meter',
  filename: string | null,
): string | null {
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  if (filename.startsWith('/assets/')) {
    return filename;
  }
  return `${ASSETS_BASE}/uploads/${folder}/${encodeURIComponent(filename)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
}

function getStatusBadge(val: number) {
  if (val >= 120) {
    return {
      text: 'Tinggi',
      badgeClass: 'badge badge-danger text-white',
      color: '#dc2626',
    };
  }
  if (val >= 100) {
    return {
      text: 'Normal',
      badgeClass: 'badge badge-primary text-white',
      color: '#2563eb',
    };
  }
  return {
    text: 'Rendah',
    badgeClass: 'badge badge-success text-white',
    color: '#16a34a',
  };
}

export default function WaterLevel() {
  const { user, access } = useAuth();

  const [waterData, setWaterData] = useState<WaterLevelItem[]>([]);
  const [summary, setSummary] = useState<WaterLevelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dashboardLocation, setDashboardLocation] = useState<'ALL' | 'PT. MB' | 'PT. SRI'>('ALL');
  const [tableLocation, setTableLocation] = useState<'ALL' | 'PT. MB' | 'PT. SRI'>('ALL');

  // Modals
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ url: string; title: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  // Form state
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formTanggal, setFormTanggal] = useState(todayStr);
  const [formJam, setFormJam] = useState(timeStr);
  const [formLokasi, setFormLokasi] = useState<'PT. MB' | 'PT. SRI'>('PT. MB');
  const [formTinggi, setFormTinggi] = useState('');
  const [formPanorama, setFormPanorama] = useState<File | null>(null);
  const [formDraftMeter, setFormDraftMeter] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Privileges
  const userRole = user?.role ?? 1;
  const isSuperAdmin = userRole >= 14 || (access?.roleLevels?.some((l) => l >= 14) ?? false);
  const featurePerm = access?.features?.['WATER-LEVEL'];
  const canRead = featurePerm?.read ?? true;
  const canWrite = Boolean(isSuperAdmin || featurePerm?.write);
  const canDelete = Boolean(isSuperAdmin || featurePerm?.delete);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dataRes, summaryRes] = await Promise.all([
        waterLevelApi.data(),
        waterLevelApi.summary(),
      ]);
      setWaterData(dataRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (err: any) {
      console.error('Failed to load water level data:', err);
      setError(err.message || 'Gagal memuat data water level');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      showToast('error', 'Akses ditolak: Anda tidak memiliki izin input.');
      return;
    }
    if (!formTanggal || !formJam || !formLokasi || !formTinggi) {
      showToast('error', 'Harap isi semua kolom yang wajib.');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('tanggal', formTanggal);
      fd.append('jam', formJam);
      fd.append('lokasi', formLokasi);
      fd.append('tinggi', formTinggi);
      if (formPanorama) fd.append('foto_panorama', formPanorama);
      if (formDraftMeter) fd.append('foto_draft_meter', formDraftMeter);

      await waterLevelApi.store(fd);
      showToast('success', 'Data pengukuran water level berhasil disimpan!');
      setInputModalOpen(false);
      setFormTinggi('');
      setFormPanorama(null);
      setFormDraftMeter(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      showToast('error', 'Akses ditolak: Anda tidak memiliki izin menghapus data.');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus data pengukuran ini?')) {
      return;
    }

    try {
      setDeletingId(id);
      await waterLevelApi.delete(id);
      showToast('success', 'Data pengukuran berhasil dihapus.');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus data.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenShare = (locationToShare?: 'PT. MB' | 'PT. SRI') => {
    const loc = locationToShare || (dashboardLocation === 'ALL' ? 'PT. MB' : dashboardLocation);
    const locSummary = loc === 'PT. MB' ? summary?.mb : summary?.sri;

    if (!locSummary?.latest) {
      showToast('error', `Belum ada data pengukuran untuk ${loc}`);
      return;
    }

    const latest = locSummary.latest;
    const yesterday = locSummary.yesterday;

    let ket = 'Tidak ada data kemarin';
    if (yesterday) {
      const diff = Number((latest.tinggi - yesterday.tinggi).toFixed(2));
      if (diff > 0) ket = `Naik ${diff} cm`;
      else if (diff < 0) ket = `Turun ${Math.abs(diff)} cm`;
      else ket = 'Tetap 0 cm';
    }

    const text = [
      '*WATER LEVEL MONITORING*',
      '',
      `Lokasi : ${loc}`,
      `Tanggal : ${formatDate(latest.tanggal)} (${latest.jam})`,
      '',
      `Tinggi Air Hari ini : ${latest.tinggi} cm`,
      `Tinggi Air Kemarin : ${yesterday ? `${yesterday.tinggi} cm` : 'Tidak ada data'}`,
      `Keterangan : ${ket}`,
    ].join('\n');

    setShareText(text);
    setShareCopied(false);
    setShareModalOpen(true);
  };

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
      showToast('success', 'Keterangan berhasil disalin ke clipboard!');
    } catch {
      showToast('error', 'Gagal menyalin otomatis. Silakan salin manual.');
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Filtered table data
  const filteredTableData = useMemo(() => {
    if (tableLocation === 'ALL') return waterData;
    return waterData.filter((r) => r.lokasi === tableLocation);
  }, [waterData, tableLocation]);

  // Chart data calculation
  const chartData = useMemo(() => {
    if (!summary?.trend || summary.trend.length === 0) return null;
    const trend = summary.trend;
    const validMb = trend.filter((t) => t.mb !== null).map((t) => t.mb as number);
    const validSri = trend.filter((t) => t.sri !== null).map((t) => t.sri as number);
    const allVals = [...validMb, ...validSri];
    const minVal = allVals.length > 0 ? Math.max(0, Math.floor(Math.min(...allVals) - 15)) : 50;
    const maxVal = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 20) : 220;

    return {
      trend,
      minVal,
      maxVal,
    };
  }, [summary]);

  return (
    <div className="main-container">
      <div className="pd-ltr-20 xs-pd-20-10">
        <div className="min-height-200px">
          {/* Breadcrumb & Header */}
          <div className="page-header mb-20">
            <div className="row align-items-center justify-content-between">
              <div className="col-md-6 col-sm-12">
                <div className="title">
                  <h4 className="text-blue font-24 mb-1">
                    <i className="bi bi-droplet mr-2 text-primary" /> Water Level Monitoring
                  </h4>
                  <p className="text-muted font-13 mb-0">
                    Monitoring ketinggian air sungai PT. SRI & PT. MB secara real-time
                  </p>
                </div>
              </div>
              <div className="col-md-6 col-sm-12 text-md-right mt-2 mt-md-0">
                <div className="btn-group mr-2">
                  <select
                    className="form-control form-control-sm font-13"
                    style={{ width: 'auto', display: 'inline-block' }}
                    value={dashboardLocation}
                    onChange={(e) => setDashboardLocation(e.target.value as any)}
                  >
                    <option value="ALL">Semua Lokasi</option>
                    <option value="PT. MB">PT. MB</option>
                    <option value="PT. SRI">PT. SRI</option>
                  </select>
                </div>

                {canWrite && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mr-2"
                    onClick={() => handleOpenShare()}
                    title="Bagikan Laporan ke WhatsApp"
                  >
                    <i className="bi bi-share mr-1" /> Bagikan Laporan
                  </button>
                )}

                {canWrite && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setInputModalOpen(true)}
                  >
                    <i className="bi bi-plus-circle mr-1" /> Input Water Level
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Privilege Status Banner */}
          <div
            className={`card-box pd-15 mb-20 border-left-4 ${
              canWrite ? 'border-primary' : 'border-warning'
            }`}
            style={{
              borderLeft: `4px solid ${canWrite ? '#2563eb' : '#f59e0b'}`,
              background: '#ffffff',
            }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <span
                  className={`badge p-2 mr-3 font-13 ${
                    canWrite ? 'badge-primary' : 'badge-warning text-dark'
                  }`}
                >
                  <i className={`bi ${canWrite ? 'bi-shield-check' : 'bi-shield-lock'} mr-1`} />
                  {canWrite ? 'Akses Input Aktif' : 'Akses Hanya Pantau (Read-Only)'}
                </span>
                <span className="font-13 text-secondary">
                  <strong>Pengguna:</strong> {user?.name || user?.nrp} &nbsp;|&nbsp;
                  <strong>Role:</strong> {user?.role ?? 1} &nbsp;|&nbsp;
                  <strong>Izin:</strong> [ 👁️ Baca:{' '}
                  <span className={canRead ? 'text-success font-weight-bold' : 'text-danger font-weight-bold'}>
                    {canRead ? 'Aktif' : 'Nonaktif'}
                  </span>{' '}
                  ] [ ✏️ Input:{' '}
                  <span className={canWrite ? 'text-success font-weight-bold' : 'text-muted'}>
                    {canWrite ? 'Aktif' : 'Nonaktif'}
                  </span>{' '}
                  ] [ 🗑️ Hapus:{' '}
                  <span className={canDelete ? 'text-danger font-weight-bold' : 'text-muted'}>
                    {canDelete ? 'Aktif' : 'Nonaktif'}
                  </span>{' '}
                  ]
                </span>
              </div>
              <div className="mt-2 mt-sm-0">
                {isSuperAdmin && (
                  <Link
                    to="/authority"
                    className="btn btn-outline-secondary btn-sm font-12"
                    title="Atur wewenang khusus user untuk Water Level"
                  >
                    <i className="bi bi-gear mr-1" /> Manajemen Otoritas Karyawan
                  </Link>
                )}
              </div>
            </div>
            {!canWrite && (
              <div className="mt-2 text-muted font-12">
                <i className="bi bi-info-circle mr-1 text-warning" />
                Sebagai crew standar, Anda dapat melihat monitoring dan grafik. Hak input hanya
                diberikan kepada personil lapangan tertentu via penugasan otoritas khusus.
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show mb-20" role="alert">
              <strong>Error:</strong> {error}
              <button
                type="button"
                className="close"
                onClick={() => setError(null)}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div
              className={`alert ${
                toast.type === 'success' ? 'alert-success' : 'alert-danger'
              } alert-dismissible fade show mb-20`}
              role="alert"
            >
              <strong>{toast.type === 'success' ? 'Berhasil!' : 'Peringatan:'}</strong>{' '}
              {toast.message}
              <button
                type="button"
                className="close"
                onClick={() => setToast(null)}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          )}

          {/* Top Location Cards */}
          <div className="row mb-25">
            {/* CARD 1 */}
            <div className="col-lg-6 col-md-12 mb-20">
              <div className="card-box h-100 overflow-hidden shadow-sm border">
                {dashboardLocation === 'ALL' ? (
                  // PT. MB Panorama
                  <LocationCardItem
                    title="PT. MB"
                    label="Panorama Sungai"
                    locData={summary?.mb}
                    photoType="panorama"
                    onPhotoClick={(url) => setPhotoModal({ url, title: 'Panorama Sungai PT. MB' })}
                  />
                ) : (
                  // Single Location Panorama
                  <LocationCardItem
                    title={dashboardLocation}
                    label="Panorama Sungai"
                    locData={dashboardLocation === 'PT. MB' ? summary?.mb : summary?.sri}
                    photoType="panorama"
                    onPhotoClick={(url) =>
                      setPhotoModal({ url, title: `Panorama Sungai ${dashboardLocation}` })
                    }
                  />
                )}
              </div>
            </div>

            {/* CARD 2 */}
            <div className="col-lg-6 col-md-12 mb-20">
              <div className="card-box h-100 overflow-hidden shadow-sm border">
                {dashboardLocation === 'ALL' ? (
                  // PT. SRI Panorama
                  <LocationCardItem
                    title="PT. SRI"
                    label="Panorama Sungai"
                    locData={summary?.sri}
                    photoType="panorama"
                    onPhotoClick={(url) => setPhotoModal({ url, title: 'Panorama Sungai PT. SRI' })}
                  />
                ) : (
                  // Single Location Draft Meter
                  <LocationCardItem
                    title={dashboardLocation}
                    label="Draft Meter"
                    locData={dashboardLocation === 'PT. MB' ? summary?.mb : summary?.sri}
                    photoType="draft_meter"
                    onPhotoClick={(url) =>
                      setPhotoModal({ url, title: `Draft Meter ${dashboardLocation}` })
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* 7-Day Trend Chart */}
          <div className="card-box pd-20 mb-30 shadow-sm border">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-15">
              <div>
                <h5 className="h5 text-blue mb-1">
                  <i className="bi bi-graph-up mr-2 text-primary" /> Grafik Ketinggian Air (7 Hari Terakhir)
                </h5>
                <p className="text-muted font-12 mb-0">
                  {dashboardLocation === 'ALL'
                    ? 'Perbandingan tren ketinggian air PT. MB vs PT. SRI'
                    : `Tren ketinggian air ${dashboardLocation}`}
                </p>
              </div>
              <div className="d-flex align-items-center font-12 mt-2 mt-sm-0">
                {(dashboardLocation === 'ALL' || dashboardLocation === 'PT. MB') && (
                  <span className="mr-3 d-flex align-items-center">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#16a34a',
                        marginRight: 5,
                      }}
                    />
                    <strong>PT. MB</strong>
                  </span>
                )}
                {(dashboardLocation === 'ALL' || dashboardLocation === 'PT. SRI') && (
                  <span className="d-flex align-items-center">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        marginRight: 5,
                      }}
                    />
                    <strong>PT. SRI</strong>
                  </span>
                )}
              </div>
            </div>

            {chartData ? (
              <TrendChartSvg
                data={chartData.trend}
                minVal={chartData.minVal}
                maxVal={chartData.maxVal}
                selectedLocation={dashboardLocation}
              />
            ) : (
              <div className="text-center py-5 text-muted">
                {loading ? 'Memuat grafik...' : 'Belum ada data grafik 7 hari terakhir.'}
              </div>
            )}
          </div>

          {/* Data Measurements Table */}
          <div className="card-box pd-20 mb-30 shadow-sm border">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-20">
              <div>
                <h5 className="h5 text-blue mb-1">
                  <i className="bi bi-table mr-2 text-primary" /> Riwayat Pengukuran Water Level
                </h5>
                <p className="text-muted font-12 mb-0">
                  Daftar seluruh pengukuran ketinggian air yang tercatat di database
                </p>
              </div>
              <div className="d-flex align-items-center mt-2 mt-sm-0">
                <label className="mr-2 font-12 text-muted mb-0">Filter Lokasi:</label>
                <select
                  className="form-control form-control-sm font-12"
                  style={{ width: 140 }}
                  value={tableLocation}
                  onChange={(e) => setTableLocation(e.target.value as any)}
                >
                  <option value="ALL">Semua Lokasi</option>
                  <option value="PT. MB">PT. MB</option>
                  <option value="PT. SRI">PT. SRI</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover table-striped">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: '13%' }}>Tanggal</th>
                    <th style={{ width: '10%' }}>Jam</th>
                    <th style={{ width: '12%' }}>Lokasi</th>
                    <th style={{ width: '14%' }}>Tinggi Air</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '15%' }}>Panorama</th>
                    <th style={{ width: '15%' }}>Draft Meter</th>
                    {canDelete && <th style={{ width: '9%' }} className="text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 8 : 7} className="text-center py-4 text-muted">
                        {loading ? 'Mengambil data...' : 'Tidak ada riwayat pengukuran.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTableData.map((row) => {
                      const status = getStatusBadge(row.tinggi);
                      const panoramaUrl = resolvePhotoUrl('water_level/panorama', row.foto_panorama);
                      const draftUrl = resolvePhotoUrl('water_level/draft_meter', row.foto_draft_meter);

                      return (
                        <tr key={row.id}>
                          <td className="font-weight-bold">{formatDate(row.tanggal)}</td>
                          <td>
                            <span className="badge badge-light border font-12">
                              <i className="bi bi-clock mr-1" />
                              {row.jam}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                row.lokasi === 'PT. MB' ? 'badge-success' : 'badge-primary'
                              } px-2 py-1`}
                            >
                              {row.lokasi}
                            </span>
                          </td>
                          <td>
                            <strong className="font-16">{row.tinggi}</strong>{' '}
                            <span className="text-muted font-12">cm</span>
                          </td>
                          <td>
                            <span className={status.badgeClass}>{status.text}</span>
                          </td>
                          <td>
                            {panoramaUrl ? (
                              <img
                                src={panoramaUrl}
                                alt="Panorama"
                                className="img-thumbnail"
                                style={{ width: 70, height: 45, objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() =>
                                  setPhotoModal({
                                    url: panoramaUrl,
                                    title: `Panorama ${row.lokasi} - ${formatDate(row.tanggal)}`,
                                  })
                                }
                                title="Klik untuk memperbesar"
                              />
                            ) : (
                              <span className="text-muted font-11">-</span>
                            )}
                          </td>
                          <td>
                            {draftUrl ? (
                              <img
                                src={draftUrl}
                                alt="Draft Meter"
                                className="img-thumbnail"
                                style={{ width: 70, height: 45, objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() =>
                                  setPhotoModal({
                                    url: draftUrl,
                                    title: `Draft Meter ${row.lokasi} - ${formatDate(row.tanggal)}`,
                                  })
                                }
                                title="Klik untuk memperbesar"
                              />
                            ) : (
                              <span className="text-muted font-11">-</span>
                            )}
                          </td>
                          {canDelete && (
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm p-1"
                                style={{ lineHeight: 1 }}
                                disabled={deletingId === row.id}
                                onClick={() => handleDelete(row.id)}
                                title="Hapus Data Pengukuran"
                              >
                                {deletingId === row.id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  <i className="bi bi-trash" />
                                )}
                              </button>
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
        </div>
      </div>

      {/* MODAL 1: Input Water Level */}
      {inputModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title font-weight-bold">
                  <i className="bi bi-file-earmark-plus mr-2 text-primary" /> Input Data Water Level
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setInputModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">
                        Tanggal <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formTanggal}
                        onChange={(e) => setFormTanggal(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">
                        Jam <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time"
                        className="form-control"
                        value={formJam}
                        onChange={(e) => setFormJam(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">
                        Lokasi <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formLokasi}
                        onChange={(e) => setFormLokasi(e.target.value as any)}
                        required
                      >
                        <option value="PT. MB">PT. MB</option>
                        <option value="PT. SRI">PT. SRI</option>
                      </select>
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">
                        Ketinggian Air (cm) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Contoh: 155.5"
                        className="form-control"
                        value={formTinggi}
                        onChange={(e) => setFormTinggi(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">Foto Panorama Sungai</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="form-control-file"
                        onChange={(e) => setFormPanorama(e.target.files?.[0] || null)}
                      />
                      <small className="text-muted font-11">Opsional, format JPG, PNG, WEBP</small>
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">Foto Draft Meter</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="form-control-file"
                        onChange={(e) => setFormDraftMeter(e.target.files?.[0] || null)}
                      />
                      <small className="text-muted font-11">Opsional, format JPG, PNG, WEBP</small>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setInputModalOpen(false)}
                    disabled={submitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-1" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle mr-1" /> Simpan Pengukuran
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Photo Viewer */}
      {photoModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title font-16 text-white">{photoModal.title}</h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setPhotoModal(null)}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body text-center p-2">
                <img
                  src={photoModal.url}
                  alt={photoModal.title}
                  className="img-fluid rounded"
                  style={{ maxHeight: '78vh', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Share Report */}
      {shareModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title font-weight-bold">
                  <i className="bi bi-whatsapp mr-2 text-success" /> Bagikan Laporan Water Level
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShareModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <label className="font-weight-bold font-13 text-secondary mb-2">
                  Format Laporan WhatsApp:
                </label>
                <textarea
                  className="form-control font-13 font-monospace"
                  rows={8}
                  value={shareText}
                  readOnly
                  style={{ backgroundColor: '#f8fafc' }}
                />
                {shareCopied && (
                  <div className="alert alert-success font-12 py-2 mt-2 mb-0">
                    <i className="bi bi-check-circle mr-1" /> Teks laporan berhasil disalin!
                  </div>
                )}
              </div>
              <div className="modal-footer justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShareModalOpen(false)}
                >
                  Tutup
                </button>
                <div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mr-2"
                    onClick={handleCopyShare}
                  >
                    <i className="bi bi-clipboard mr-1" /> Salin Teks
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleOpenWhatsApp}
                  >
                    <i className="bi bi-whatsapp mr-1" /> Buka WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Card Item for Top Monitoring
function LocationCardItem({
  title,
  label,
  locData,
  photoType,
  onPhotoClick,
}: {
  title: string;
  label: string;
  locData?: {
    latest: WaterLevelItem | null;
    yesterday: WaterLevelItem | null;
    diff: number;
    text: string;
    status: 'up' | 'down' | 'neutral';
  } | null;
  photoType: 'panorama' | 'draft_meter';
  onPhotoClick: (url: string) => void;
}) {
  const latest = locData?.latest;
  const photoField = photoType === 'panorama' ? latest?.foto_panorama : latest?.foto_draft_meter;
  const photoFolder = photoType === 'panorama' ? 'water_level/panorama' : 'water_level/draft_meter';
  const photoUrl = resolvePhotoUrl(photoFolder, photoField || null);

  const status = locData?.status || 'neutral';
  const statusColor =
    status === 'up' ? '#2563eb' : status === 'down' ? '#2563eb' : '#6b7280';
  const statusIcon = status === 'up' ? '↑' : status === 'down' ? '↓' : '→';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
        <span className="font-weight-bold text-dark font-15">{title}</span>
        <span className="text-muted font-11">{label}</span>
      </div>

      {/* Image box with 16:9 ratio */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#f3f4f6',
          position: 'relative',
          cursor: photoUrl ? 'pointer' : 'default',
          overflow: 'hidden',
        }}
        onClick={() => photoUrl && onPhotoClick(photoUrl)}
      >
        {photoUrl ? (
          <>
            <img
              src={photoUrl}
              alt={`${label} ${title}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '30px 14px 10px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                color: '#fff',
                fontSize: 12,
              }}
            >
              <i className="bi bi-arrows-fullscreen mr-1" /> Klik untuk melihat foto
            </div>
          </>
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
            <i
              className={`bi ${photoType === 'panorama' ? 'bi-image' : 'bi-rulers'} mb-2`}
              style={{ fontSize: 32 }}
            />
            <span className="font-12">Belum ada foto {label.toLowerCase()}</span>
          </div>
        )}
      </div>

      {/* Info values */}
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <span className="font-weight-bold font-30 text-dark">
              {latest ? latest.tinggi : '-'}
            </span>
            <span className="text-muted font-13 ml-1">cm</span>
          </div>
          <div className="font-13 font-weight-bold" style={{ color: statusColor }}>
            <span className="mr-1" style={{ fontSize: 18 }}>
              {statusIcon}
            </span>
            <span>{locData?.text || 'Belum ada data'}</span>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-2 text-muted font-11">
          <span>
            <i className="bi bi-calendar3 mr-1" />
            {latest ? formatDate(latest.tanggal) : '-'}
          </span>
          <span>
            <i className="bi bi-clock mr-1" />
            {latest ? `${latest.jam} WIB` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Pure React SVG Line Chart
function TrendChartSvg({
  data,
  minVal,
  maxVal,
  selectedLocation,
}: {
  data: Array<{
    date: string;
    mb: number | null;
    mbTime: string | null;
    sri: number | null;
    sriTime: string | null;
  }>;
  minVal: number;
  maxVal: number;
  selectedLocation: 'ALL' | 'PT. MB' | 'PT. SRI';
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const count = data.length;
  const xStep = chartW / Math.max(1, count - 1);

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    const norm = (val - minVal) / range;
    return padding.top + chartH - norm * chartH;
  };

  const showMb = selectedLocation === 'ALL' || selectedLocation === 'PT. MB';
  const showSri = selectedLocation === 'ALL' || selectedLocation === 'PT. SRI';

  // Build points
  const mbPoints: { x: number; y: number; val: number; time: string | null }[] = [];
  const sriPoints: { x: number; y: number; val: number; time: string | null }[] = [];

  data.forEach((d, idx) => {
    const x = padding.left + idx * xStep;
    if (d.mb !== null) mbPoints.push({ x, y: getY(d.mb), val: d.mb, time: d.mbTime });
    if (d.sri !== null) sriPoints.push({ x, y: getY(d.sri), val: d.sri, time: d.sriTime });
  });

  const makePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
  };

  const mbPath = makePath(mbPoints);
  const sriPath = makePath(sriPoints);

  // Y-axis ticks
  const yTicksCount = 5;
  const yTicks = Array.from({ length: yTicksCount }, (_, i) => {
    const val = Math.round(minVal + ((maxVal - minVal) / (yTicksCount - 1)) * i);
    return { val, y: getY(val) };
  });

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="mbGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="sriGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeDasharray={i === 0 ? 'none' : '3,3'}
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="end"
            >
              {tick.val} cm
            </text>
          </g>
        ))}

        {/* X labels & vertical guide lines */}
        {data.map((d, i) => {
          const x = padding.left + i * xStep;
          return (
            <g key={i}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke={hoverIndex === i ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth={hoverIndex === i ? 2 : 1}
              />
              <text
                x={x}
                y={height - padding.bottom + 18}
                fontSize="11"
                fill="#6b7280"
                textAnchor="middle"
              >
                {formatShortDate(d.date)}
              </text>
            </g>
          );
        })}

        {/* Areas */}
        {showMb && mbPoints.length > 1 && (
          <path
            d={`${mbPath} L ${mbPoints[mbPoints.length - 1].x},${height - padding.bottom} L ${mbPoints[0].x},${height - padding.bottom} Z`}
            fill="url(#mbGradient)"
          />
        )}
        {showSri && sriPoints.length > 1 && (
          <path
            d={`${sriPath} L ${sriPoints[sriPoints.length - 1].x},${height - padding.bottom} L ${sriPoints[0].x},${height - padding.bottom} Z`}
            fill="url(#sriGradient)"
          />
        )}

        {/* Lines */}
        {showMb && mbPath && (
          <path d={mbPath} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
        )}
        {showSri && sriPath && (
          <path d={sriPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Points for PT. MB */}
        {showMb &&
          mbPoints.map((pt, idx) => (
            <circle
              key={`mb-pt-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === idx ? 6 : 4}
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth="2"
              style={{ transition: 'all 0.2s' }}
            />
          ))}

        {/* Points for PT. SRI */}
        {showSri &&
          sriPoints.map((pt, idx) => (
            <circle
              key={`sri-pt-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === idx ? 6 : 4}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2"
              style={{ transition: 'all 0.2s' }}
            />
          ))}

        {/* Hover interaction zones */}
        {data.map((_, idx) => {
          const x = padding.left + idx * xStep - xStep / 2;
          return (
            <rect
              key={`hover-zone-${idx}`}
              x={Math.max(padding.left, x)}
              y={padding.top}
              width={xStep}
              height={chartH}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && (
        <div
          className="shadow-sm border rounded p-2"
          style={{
            position: 'absolute',
            top: 10,
            left: Math.min(
              padding.left + hoverIndex * xStep + 10,
              width - 160,
            ),
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            fontSize: 12,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div className="font-weight-bold text-dark border-bottom pb-1 mb-1">
            {formatDate(data[hoverIndex].date)}
          </div>
          {showMb && (
            <div className="d-flex justify-content-between align-items-center text-success">
              <span>PT. MB:</span>
              <strong className="ml-2">
                {data[hoverIndex].mb !== null ? `${data[hoverIndex].mb} cm` : '-'}
              </strong>
            </div>
          )}
          {showSri && (
            <div className="d-flex justify-content-between align-items-center text-primary">
              <span>PT. SRI:</span>
              <strong className="ml-2">
                {data[hoverIndex].sri !== null ? `${data[hoverIndex].sri} cm` : '-'}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
