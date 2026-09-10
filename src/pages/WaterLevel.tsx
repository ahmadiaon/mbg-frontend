import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useAuth } from '../auth';
import {
  eavApi,
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
  return `/assets/${folder}/${encodeURIComponent(filename)}`;
}

function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  folder: 'water_level/panorama' | 'water_level/draft_meter',
  filename: string | null,
) {
  const target = e.currentTarget;
  if (!target.dataset.triedFallback && filename) {
    target.dataset.triedFallback = 'true';
    target.src = `${ASSETS_BASE}/uploads/${folder}/${encodeURIComponent(filename)}`;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yearShort = parts[0].slice(-2);
    return `${parts[2]}/${parts[1]}/${yearShort}`;
  }
  return dateStr;
}

function formatDecimal(val: number | null | undefined): string {
  if (val === null || val === undefined) return '-';
  return Number(val).toFixed(1).replace('.', ',');
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

  // Table Search, Sort & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'tanggal' | 'jam' | 'lokasi' | 'cuaca' | 'tinggi' | 'status'>('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ url: string; title: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLocation, setShareLocation] = useState<'PT. MB' | 'PT. SRI'>('PT. SRI');
  const [shareCopied, setShareCopied] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);

  const reportCardRef = useRef<HTMLDivElement>(null);

  // Cuaca options from master DATABASE-CUACA
  const [cuacaOptions, setCuacaOptions] = useState<string[]>(['Cerah', 'Mendung']);

  // Form state
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formTanggal, setFormTanggal] = useState(todayStr);
  const [formJam, setFormJam] = useState(timeStr);
  const [formLokasi, setFormLokasi] = useState<'PT. MB' | 'PT. SRI'>('PT. MB');
  const [formCuaca, setFormCuaca] = useState('Cerah');
  const [formTinggi, setFormTinggi] = useState('');
  const [formPanorama, setFormPanorama] = useState<File | null>(null);
  const [formDraftMeter, setFormDraftMeter] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WaterLevelItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Privileges
  const userRole = user?.role ?? 1;
  const isSuperAdmin = userRole >= 14 || (access?.roleLevels?.some((l) => l >= 14) ?? false);
  const featurePerm = access?.features?.['WATER-LEVEL'];
  const canRead = featurePerm?.read ?? true;
  const canWrite = Boolean(isSuperAdmin || featurePerm?.write);
  const canDelete = Boolean(isSuperAdmin || featurePerm?.delete || featurePerm?.write);

  const loadData = async (loc?: string) => {
    try {
      setLoading(true);
      setError(null);
      const [dataRes, summaryRes] = await Promise.all([
        waterLevelApi.data(),
        waterLevelApi.summary(loc),
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
    loadData(dashboardLocation);
  }, [dashboardLocation]);

  useEffect(() => {
    const fetchCuaca = async () => {
      try {
        const recs = await eavApi.records('DATABASE-CUACA');
        const list = recs
          .map((r) => r.values?.['CUACA'] || r.recordCode)
          .filter(Boolean);
        if (list.length > 0) {
          setCuacaOptions(list);
          setFormCuaca((curr) => (list.includes(curr) ? curr : list[0]));
        }
      } catch (err) {
        console.warn('Gagal memuat cuaca dari DATABASE-CUACA:', err);
      }
    };
    fetchCuaca();
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
      if (formCuaca) fd.append('cuaca', formCuaca);
      if (formPanorama) fd.append('foto_panorama', formPanorama);
      if (formDraftMeter) fd.append('foto_draft_meter', formDraftMeter);

      await waterLevelApi.store(fd);
      showToast('success', 'Data pengukuran water level berhasil disimpan!');
      setInputModalOpen(false);
      setFormTinggi('');
      setFormPanorama(null);
      setFormDraftMeter(null);
      loadData(dashboardLocation);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteConfirm = (row: WaterLevelItem) => {
    if (!canDelete) {
      showToast('error', 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus data water level.');
      return;
    }
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await waterLevelApi.delete(deleteTarget.id);
      showToast(
        'success',
        `Data pengukuran ${deleteTarget.lokasi} (${formatDate(deleteTarget.tanggal)} ${deleteTarget.jam}) berhasil dihapus!`,
      );
      setDeleteTarget(null);
      loadData(dashboardLocation);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus data.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenShare = (locationToShare?: 'PT. MB' | 'PT. SRI') => {
    const loc = locationToShare || (dashboardLocation === 'ALL' ? 'PT. SRI' : dashboardLocation);
    setShareLocation(loc);
    setShareCopied(false);
    setShareModalOpen(true);
  };

  // Build WhatsApp share text based on selected shareLocation
  const shareData = useMemo(() => {
    const locSummary = shareLocation === 'PT. MB' ? summary?.mb : summary?.sri;
    const latest = locSummary?.latest;
    const yesterday = locSummary?.yesterday;

    let ket = 'Tidak ada data kemarin';
    let diff = 0;
    if (latest && yesterday) {
      diff = Number((latest.tinggi - yesterday.tinggi).toFixed(2));
      if (diff > 0) ket = `Naik ${diff} cm`;
      else if (diff < 0) ket = `Turun ${Math.abs(diff)} cm`;
      else ket = 'Tetap 0 cm';
    }

    const cuacaVal = latest?.cuaca || 'Cerah';
    const text = [
      '*WATER LEVEL MONITORING*',
      '',
      'Lokasi Jetty :',
      shareLocation,
      `Cuaca : ${cuacaVal}`,
      `Tanggal : ${latest ? formatDate(latest.tanggal) : '-'} (${latest ? latest.jam : '-'})`,
      '',
      `Tinggi Air Hari ini : ${latest ? latest.tinggi : '-'} cm`,
      `Tinggi Air Kemarin : ${yesterday ? `${yesterday.tinggi} cm` : 'Tidak ada data'}`,
      `Keterangan : ${ket}`,
    ].join('\n');

    return {
      location: shareLocation,
      cuaca: cuacaVal,
      latest,
      yesterday,
      diff,
      keteranganText: ket,
      statusLabel: diff > 0 ? 'NAIK' : diff < 0 ? 'TURUN' : 'TETAP',
      statusColor: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#2563eb',
      text,
    };
  }, [shareLocation, summary]);

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareData.text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
      showToast('success', 'Keterangan laporan berhasil disalin ke clipboard!');
    } catch {
      showToast('error', 'Gagal menyalin otomatis. Silakan salin manual.');
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(shareData.text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleDownloadReportImage = async () => {
    if (!reportCardRef.current) return;
    try {
      setDownloadingImage(true);
      const canvas = await html2canvas(reportCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `water-level-${shareLocation.replace(/\s+/g, '-')}-${shareData.latest?.tanggal || 'report'}.png`;
      link.href = dataUrl;
      link.click();
      showToast('success', 'Gambar laporan berhasil diunduh!');
    } catch (err: any) {
      console.error('Failed to generate report image:', err);
      showToast('error', 'Gagal membuat gambar laporan: ' + err.message);
    } finally {
      setDownloadingImage(false);
    }
  };

  // Table filtering, sorting, and pagination
  const processedTableData = useMemo(() => {
    let list = [...waterData];

    if (tableLocation !== 'ALL') {
      list = list.filter((r) => r.lokasi === tableLocation);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.tanggal.toLowerCase().includes(q) ||
          r.jam.toLowerCase().includes(q) ||
          r.lokasi.toLowerCase().includes(q) ||
          (r.cuaca && r.cuaca.toLowerCase().includes(q)) ||
          String(r.tinggi).includes(q),
      );
    }

    list.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'tanggal') {
        aVal = `${a.tanggal} ${a.jam}`;
        bVal = `${b.tanggal} ${b.jam}`;
      } else if (sortField === 'jam') {
        aVal = a.jam;
        bVal = b.jam;
      } else if (sortField === 'lokasi') {
        aVal = a.lokasi;
        bVal = b.lokasi;
      } else if (sortField === 'cuaca') {
        aVal = a.cuaca || '';
        bVal = b.cuaca || '';
      } else if (sortField === 'tinggi') {
        aVal = a.tinggi;
        bVal = b.tinggi;
      } else {
        aVal = a.tinggi;
        bVal = b.tinggi;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [waterData, tableLocation, searchTerm, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(processedTableData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedTableData.slice(start, start + pageSize);
  }, [processedTableData, currentPage, pageSize]);

  const handleSort = (
    field: 'tanggal' | 'jam' | 'lokasi' | 'cuaca' | 'tinggi' | 'status',
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Chart data calculation
  const chartData = useMemo(() => {
    if (!summary?.trend || summary.trend.length === 0) return null;
    const trend = summary.trend;
    const validMb = trend.filter((t) => t.mb !== null).map((t) => t.mb as number);
    const validSri = trend.filter((t) => t.sri !== null).map((t) => t.sri as number);
    const allVals = [...validMb, ...validSri];
    const minVal = allVals.length > 0 ? Math.max(0, Math.floor(Math.min(...allVals) - 10)) : 50;
    const maxVal = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 10) : 200;

    return {
      trend,
      minVal,
      maxVal,
    };
  }, [summary]);

  return (
    <div className="pb-30">
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
              <LocationCardItem
                title="PT. MB"
                label="Panorama Sungai"
                locData={summary?.mb}
                photoType="panorama"
                onPhotoClick={(url) => setPhotoModal({ url, title: 'Panorama Sungai PT. MB' })}
              />
            ) : (
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
              <LocationCardItem
                title="PT. SRI"
                label="Panorama Sungai"
                locData={summary?.sri}
                photoType="panorama"
                onPhotoClick={(url) => setPhotoModal({ url, title: 'Panorama Sungai PT. SRI' })}
              />
            ) : (
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
                ? 'Perkembangan pengukuran PT. MB dan PT. SRI • 7 hari terakhir'
                : `Perkembangan ${dashboardLocation} • 7 hari terakhir`}
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

      {/* Data Measurements Table with Search, Sorting, and Pagination */}
      <div className="card-box pd-20 mb-30 shadow-sm border">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-20">
          <div>
            <h5 className="h5 text-blue mb-1">
              <i className="bi bi-table mr-2 text-primary" /> Data Pengukuran
            </h5>
            <p className="text-muted font-12 mb-0">
              Riwayat pengukuran water level
            </p>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-sm-0">
            {/* Search Input */}
            <div className="input-group input-group-sm mr-2" style={{ width: 200 }}>
              <div className="input-group-prepend">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Cari pengukuran..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Location Filter */}
            <div className="d-flex align-items-center">
              <select
                className="form-control form-control-sm font-12 mr-2"
                style={{ width: 130 }}
                value={tableLocation}
                onChange={(e) => {
                  setTableLocation(e.target.value as any);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Semua Lokasi</option>
                <option value="PT. MB">PT. MB</option>
                <option value="PT. SRI">PT. SRI</option>
              </select>

              {/* Page size selector */}
              <select
                className="form-control form-control-sm font-12"
                style={{ width: 80 }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="5">5 baris</option>
                <option value="10">10 baris</option>
                <option value="25">25 baris</option>
                <option value="50">50 baris</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="thead-light">
              <tr>
                <th
                  style={{ width: '15%', cursor: 'pointer' }}
                  onClick={() => handleSort('tanggal')}
                  title="Klik untuk mengurutkan tanggal"
                >
                  Tanggal{' '}
                  <i
                    className={`bi font-11 ml-1 ${
                      sortField === 'tanggal'
                        ? sortDirection === 'asc'
                          ? 'bi-sort-numeric-down text-primary'
                          : 'bi-sort-numeric-up-alt text-primary'
                        : 'bi-arrow-down-up text-muted'
                    }`}
                  />
                </th>
                <th
                  style={{ width: '10%', cursor: 'pointer' }}
                  onClick={() => handleSort('jam')}
                  title="Klik untuk mengurutkan jam"
                >
                  Jam{' '}
                  <i
                    className={`bi font-11 ml-1 ${
                      sortField === 'jam'
                        ? sortDirection === 'asc'
                          ? 'bi-sort-down text-primary'
                          : 'bi-sort-up text-primary'
                        : 'bi-arrow-down-up text-muted'
                    }`}
                  />
                </th>
                <th
                  style={{ width: '13%', cursor: 'pointer' }}
                  onClick={() => handleSort('lokasi')}
                  title="Klik untuk mengurutkan lokasi"
                >
                  Lokasi Jetty{' '}
                  <i
                    className={`bi font-11 ml-1 ${
                      sortField === 'lokasi'
                        ? sortDirection === 'asc'
                          ? 'bi-sort-alpha-down text-primary'
                          : 'bi-sort-alpha-up text-primary'
                        : 'bi-arrow-down-up text-muted'
                    }`}
                  />
                </th>
                <th
                  style={{ width: '10%', cursor: 'pointer' }}
                  onClick={() => handleSort('cuaca')}
                  title="Klik untuk mengurutkan cuaca"
                >
                  Cuaca{' '}
                  <i
                    className={`bi font-11 ml-1 ${
                      sortField === 'cuaca'
                        ? sortDirection === 'asc'
                          ? 'bi-sort-alpha-down text-primary'
                          : 'bi-sort-alpha-up text-primary'
                        : 'bi-arrow-down-up text-muted'
                    }`}
                  />
                </th>
                <th
                  style={{ width: '12%', cursor: 'pointer' }}
                  onClick={() => handleSort('tinggi')}
                  title="Klik untuk mengurutkan ketinggian air"
                >
                  Tinggi{' '}
                  <i
                    className={`bi font-11 ml-1 ${
                      sortField === 'tinggi'
                        ? sortDirection === 'asc'
                          ? 'bi-sort-numeric-down text-primary'
                          : 'bi-sort-numeric-up-alt text-primary'
                        : 'bi-arrow-down-up text-muted'
                    }`}
                  />
                </th>
                <th
                  style={{ width: '11%', cursor: 'pointer' }}
                  onClick={() => handleSort('status')}
                  title="Klik untuk mengurutkan status"
                >
                  Status{' '}
                  <i
                    className={`bi font-11 ml-1 ${
                      sortField === 'status'
                        ? 'bi-arrow-down text-primary'
                        : 'bi-arrow-down-up text-muted'
                    }`}
                  />
                </th>
                <th style={{ width: '12%' }}>Panorama</th>
                <th style={{ width: '12%' }}>Draft Meter</th>
                <th style={{ width: '10%' }} className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    {loading ? 'Mengambil data...' : 'Tidak ada riwayat pengukuran.'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
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
                        <div className="font-10 text-muted font-weight-bold text-uppercase" style={{ letterSpacing: 0.5 }}>
                          Lokasi Jetty
                        </div>
                        <span
                          className={`badge ${
                            row.lokasi === 'PT. MB' ? 'badge-success' : 'badge-primary'
                          } px-2 py-1 font-12 mt-1`}
                        >
                          {row.lokasi}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-light border px-2 py-1 font-12 d-inline-flex align-items-center">
                          <i className="bi bi-cloud-sun mr-1 text-warning" />
                          {row.cuaca || '-'}
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
                            style={{ width: 65, height: 43, objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() =>
                              setPhotoModal({
                                url: panoramaUrl,
                                title: `Panorama ${row.lokasi} - ${formatDate(row.tanggal)}`,
                              })
                            }
                            onError={(e) => handleImageError(e, 'water_level/panorama', row.foto_panorama)}
                            title="Klik untuk memperbesar foto"
                          />
                        ) : (
                          <span className="text-muted font-11">Tidak ada</span>
                        )}
                      </td>
                      <td>
                        {draftUrl ? (
                          <img
                            src={draftUrl}
                            alt="Draft Meter"
                            className="img-thumbnail"
                            style={{ width: 65, height: 43, objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() =>
                              setPhotoModal({
                                url: draftUrl,
                                title: `Draft Meter ${row.lokasi} - ${formatDate(row.tanggal)}`,
                              })
                            }
                            onError={(e) => handleImageError(e, 'water_level/draft_meter', row.foto_draft_meter)}
                            title="Klik untuk memperbesar foto"
                          />
                        ) : (
                          <span className="text-muted font-11">Tidak ada</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm px-2 py-1 font-12"
                          style={{ borderRadius: 6 }}
                          disabled={deletingId === row.id}
                          onClick={() => openDeleteConfirm(row)}
                          title="Hapus Data Pengukuran Ini"
                        >
                          {deletingId === row.id ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <>
                              <i className="bi bi-trash mr-1" />
                              Hapus
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 font-13 text-muted">
          <div>
            Menampilkan{' '}
            <strong>
              {processedTableData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            sampai{' '}
            <strong>
              {Math.min(currentPage * pageSize, processedTableData.length)}
            </strong>{' '}
            dari <strong>{processedTableData.length}</strong> data
          </div>

          <div className="btn-group btn-group-sm mt-2 mt-sm-0">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              title="Halaman Pertama"
            >
              &laquo;
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1,
              )
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <button type="button" className="btn btn-outline-secondary" disabled>
                      ...
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn ${
                      p === currentPage ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Selanjutnya
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Halaman Terakhir"
            >
              &raquo;
            </button>
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
                  <i className="bi bi-file-earmark-plus mr-2 text-primary" /> Input Water Level
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
                        Lokasi Jetty (PT) <span className="text-danger">*</span>
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
                        Cuaca <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formCuaca}
                        onChange={(e) => setFormCuaca(e.target.value)}
                        required
                      >
                        {cuacaOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <small className="text-muted font-11">
                        Sumber opsi: Database Cuaca (EAV)
                      </small>
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="font-weight-bold font-13">
                        Tinggi Air (cm) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Contoh: 105"
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
                        <i className="bi bi-check-circle mr-1" /> Simpan
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
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.triedFallback && target.src.includes('/assets/water_level/')) {
                      target.dataset.triedFallback = 'true';
                      const parts = target.src.split('/assets/');
                      if (parts[1]) {
                        target.src = `${ASSETS_BASE}/uploads/${parts[1]}`;
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Share Report (Desain Sesuai Gambar / Mockup Asli) */}
      {shareModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 760 }}>
            <div className="modal-content">
              <div className="modal-header py-2">
                <div className="d-flex align-items-center">
                  <h5 className="modal-title font-weight-bold font-16">
                    <i className="bi bi-share mr-2 text-primary" /> Bagikan Laporan Water Level
                  </h5>
                  <div className="ml-3">
                    <select
                      className="form-control form-control-sm font-12"
                      value={shareLocation}
                      onChange={(e) => setShareLocation(e.target.value as any)}
                    >
                      <option value="PT. SRI">PT. SRI</option>
                      <option value="PT. MB">PT. MB</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShareModalOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div
                className="modal-body p-3"
                style={{ backgroundColor: '#f1f5f9', maxHeight: '76vh', overflowY: 'auto' }}
              >
                {/* Visual Report Card that exactly replicates the mockup */}
                <div
                  ref={reportCardRef}
                  style={{
                    maxWidth: 680,
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {/* Deep Blue Header */}
                  <div
                    style={{
                      backgroundColor: '#0a53be',
                      color: '#ffffff',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0a53be',
                        fontSize: 24,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        marginRight: 14,
                        flexShrink: 0,
                      }}
                    >
                      <i className="bi bi-droplet-half" />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', paddingRight: 46 }}>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 24,
                          fontWeight: 800,
                          letterSpacing: 1.2,
                          color: '#ffffff',
                        }}
                      >
                        WATER LEVEL MONITORING
                      </h2>
                    </div>
                  </div>

                  <div style={{ padding: '18px 20px' }}>
                    {/* Location and Date Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <i
                          className="bi bi-geo-alt-fill"
                          style={{ fontSize: 26, color: '#0a53be', marginRight: 10 }}
                        />
                        <div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            LOKASI JETTY
                          </div>
                          <div style={{ fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
                            {shareLocation}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <i
                          className="bi bi-cloud-sun-fill"
                          style={{ fontSize: 26, color: '#f59e0b', marginRight: 10 }}
                        />
                        <div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            CUACA
                          </div>
                          <div style={{ fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
                            {shareData.latest?.cuaca || 'Cerah'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <i
                          className="bi bi-calendar-check-fill"
                          style={{ fontSize: 26, color: '#0a53be', marginRight: 10 }}
                        />
                        <div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            TANGGAL
                          </div>
                          <div style={{ fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
                            {shareData.latest ? formatDate(shareData.latest.tanggal) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2 Photo Cards: Panorama & Draft Meter */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 14,
                        marginBottom: 16,
                      }}
                    >
                      {/* Panorama Card */}
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#0a53be',
                            color: '#ffffff',
                            textAlign: 'center',
                            padding: '6px 10px',
                            fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          }}
                        >
                          PANORAMA SUNGAI
                        </div>
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            backgroundColor: '#f1f5f9',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {shareData.latest?.foto_panorama ? (
                            <img
                              src={resolvePhotoUrl('water_level/panorama', shareData.latest.foto_panorama) || ''}
                              alt="Panorama"
                              crossOrigin="anonymous"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => handleImageError(e, 'water_level/panorama', shareData.latest?.foto_panorama || null)}
                            />
                          ) : (
                            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                              <i className="bi bi-image" style={{ fontSize: 28 }} />
                              <span style={{ fontSize: 11 }}>Foto Panorama</span>
                            </div>
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              left: 8,
                              bottom: 8,
                              padding: '4px 8px',
                              backgroundColor: 'rgba(15,23,42,0.75)',
                              color: '#ffffff',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            <i className="bi bi-camera mr-1" /> Lihat Foto Panorama
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            padding: '10px 12px',
                            textAlign: 'center',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                              {shareData.latest ? `${shareData.latest.tinggi} cm` : '-'}
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                              TINGGI AIR HARI INI
                            </div>
                          </div>
                          <div style={{ borderLeft: '1px solid #e2e8f0' }}>
                            <div
                              style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: shareData.diff > 0 ? '#16a34a' : shareData.diff < 0 ? '#dc2626' : '#0a53be',
                              }}
                            >
                              {shareData.diff > 0 ? `+${shareData.diff}` : shareData.diff} cm
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                              DARI KEMARIN
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Draft Meter Card */}
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#0a53be',
                            color: '#ffffff',
                            textAlign: 'center',
                            padding: '6px 10px',
                            fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          }}
                        >
                          DRAFT METER
                        </div>
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            backgroundColor: '#f1f5f9',
                            position: 'relative',
                            overflow: 'hidden',
                            flex: 1,
                          }}
                        >
                          {shareData.latest?.foto_draft_meter ? (
                            <img
                              src={resolvePhotoUrl('water_level/draft_meter', shareData.latest.foto_draft_meter) || ''}
                              alt="Draft Meter"
                              crossOrigin="anonymous"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => handleImageError(e, 'water_level/draft_meter', shareData.latest?.foto_draft_meter || null)}
                            />
                          ) : (
                            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                              <i className="bi bi-rulers" style={{ fontSize: 28 }} />
                              <span style={{ fontSize: 11 }}>Foto Draft Meter</span>
                            </div>
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              left: 8,
                              bottom: 8,
                              padding: '4px 8px',
                              backgroundColor: 'rgba(15,23,42,0.75)',
                              color: '#ffffff',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            <i className="bi bi-camera mr-1" /> Lihat Draft Meter
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4 KPI Metrics Bar */}
                    <div
                      style={{
                        backgroundColor: '#f0f7ff',
                        borderRadius: 12,
                        border: '1px solid #dbeafe',
                        padding: '12px 14px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        marginBottom: 16,
                      }}
                    >
                      {/* 1. Hari Ini */}
                      <div style={{ textAlign: 'center' }}>
                        <i className="bi bi-droplet-fill" style={{ fontSize: 22, color: '#0a53be' }} />
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                          {shareData.latest ? `${shareData.latest.tinggi} cm` : '-'}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                          TINGGI AIR HARI INI
                        </div>
                      </div>

                      {/* 2. Kemarin */}
                      <div style={{ textAlign: 'center', borderLeft: '1px solid #dbeafe' }}>
                        <i className="bi bi-droplet-fill" style={{ fontSize: 22, color: '#94a3b8' }} />
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                          {shareData.yesterday ? `${shareData.yesterday.tinggi} cm` : '-'}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                          TINGGI AIR KEMARIN
                        </div>
                      </div>

                      {/* 3. Perubahan */}
                      <div style={{ textAlign: 'center', borderLeft: '1px solid #dbeafe' }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          =
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                          {shareData.diff > 0 ? `+${shareData.diff}` : shareData.diff} cm
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                          PERUBAHAN
                        </div>
                      </div>

                      {/* 4. Keterangan */}
                      <div style={{ textAlign: 'center', borderLeft: '1px solid #dbeafe' }}>
                        <i
                          className="bi bi-shield-fill-check"
                          style={{ fontSize: 22, color: shareData.statusColor }}
                        />
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: shareData.statusColor,
                            marginTop: 2,
                          }}
                        >
                          {shareData.statusLabel}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                          KETERANGAN
                        </div>
                      </div>
                    </div>

                    {/* Chart Box */}
                    <div
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '14px 16px 10px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div
                        style={{
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: 14,
                          color: '#0f172a',
                          marginBottom: 8,
                        }}
                      >
                        GRAFIK TINGGI AIR (cm)
                      </div>

                      {chartData ? (
                        <ShareReportSvgChart
                          data={chartData.trend}
                          location={shareLocation}
                          minVal={chartData.minVal}
                          maxVal={chartData.maxVal}
                        />
                      ) : null}

                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 10,
                          fontStyle: 'italic',
                          color: '#64748b',
                          marginTop: 10,
                        }}
                      >
                        Catatan: Data ketinggian air dalam satuan centimeter (cm)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="modal-footer justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShareModalOpen(false)}
                >
                  Tutup
                </button>
                <div className="d-flex align-items-center">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mr-2"
                    onClick={handleCopyShare}
                  >
                    <i className="bi bi-clipboard mr-1" />
                    {shareCopied ? 'Tersalin!' : 'Copy Keterangan'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm mr-2"
                    onClick={handleOpenWhatsApp}
                  >
                    <i className="bi bi-whatsapp mr-1" /> Buka WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={downloadingImage}
                    onClick={handleDownloadReportImage}
                  >
                    {downloadingImage ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-1" /> Mengunduh...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-download mr-1" /> Simpan Gambar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Konfirmasi Hapus Data Pengukuran */}
      {deleteTarget && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}
          onClick={() => deletingId === null && setDeleteTarget(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 14, overflow: 'hidden' }}>
              <div className="modal-header bg-danger text-white py-3">
                <h5 className="modal-title font-16 font-weight-bold text-white d-flex align-items-center mb-0">
                  <i className="bi bi-exclamation-triangle-fill mr-2 font-18" />
                  Konfirmasi Hapus Data
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingId !== null}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body p-4 text-center">
                <div
                  className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontSize: 28,
                  }}
                >
                  <i className="bi bi-trash" />
                </div>
                <h5 className="font-weight-bold text-dark mb-2">Hapus Pengukuran Ini?</h5>
                <p className="text-muted font-13 mb-3">
                  Tindakan ini akan menghapus data pengukuran water level secara permanen dari database.
                </p>

                <div
                  className="text-left p-3 rounded mb-4"
                  style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}
                >
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Lokasi Jetty:</span>
                    <strong className="text-dark">{deleteTarget.lokasi}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Cuaca:</span>
                    <strong className="text-dark">{deleteTarget.cuaca || '-'}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Tanggal:</span>
                    <strong className="text-dark">{formatDate(deleteTarget.tanggal)}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Jam:</span>
                    <strong className="text-dark">{deleteTarget.jam}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Tinggi Air:</span>
                    <strong className="text-primary font-15">{deleteTarget.tinggi} cm</strong>
                  </div>
                </div>

                <div className="d-flex justify-content-end" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-light px-3 font-13 font-weight-600"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deletingId !== null}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4 font-13 font-weight-600"
                    onClick={handleConfirmDelete}
                    disabled={deletingId !== null}
                  >
                    {deletingId !== null ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-1" />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash mr-1" />
                        Ya, Hapus Data
                      </>
                    )}
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
        <div>
          <div className="font-11 text-muted text-uppercase font-weight-bold" style={{ letterSpacing: 0.5 }}>
            <i className="bi bi-geo-alt-fill text-danger mr-1" />Lokasi Jetty
          </div>
          <div className="font-weight-bold text-dark font-16">{title}</div>
        </div>
        <div className="text-right">
          <span className="badge badge-info px-2 py-1 font-12 font-weight-600 mb-1 d-inline-flex align-items-center">
            <i className="bi bi-cloud-sun mr-1 font-13" />
            {latest?.cuaca || 'Cerah'}
          </span>
          <div className="text-muted font-11">{label}</div>
        </div>
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
              onError={(e) => handleImageError(e, photoFolder, photoField || null)}
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

// Subcomponent: SVG Line Chart for the Dashboard
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
  const padding = { top: 35, right: 30, bottom: 40, left: 55 };

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
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="sriGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
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
              stroke="#e2e8f0"
              strokeDasharray={i === 0 ? 'none' : '3,3'}
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              fontSize="10"
              fill="#64748b"
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
                fill="#64748b"
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
            <g key={`mb-pt-${idx}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === idx ? 6 : 4}
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y - 10}
                fontSize="10"
                fontWeight="700"
                fill="#16a34a"
                textAnchor="middle"
              >
                {formatDecimal(pt.val)}
              </text>
            </g>
          ))}

        {/* Points for PT. SRI */}
        {showSri &&
          sriPoints.map((pt, idx) => (
            <g key={`sri-pt-${idx}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === idx ? 6 : 4}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y - 10}
                fontSize="10"
                fontWeight="700"
                fill="#2563eb"
                textAnchor="middle"
              >
                {formatDecimal(pt.val)}
              </text>
            </g>
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
            left: Math.min(padding.left + hoverIndex * xStep + 10, width - 160),
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

// Subcomponent: Pixel-Perfect SVG Line Chart for the Share Report Modal
function ShareReportSvgChart({
  data,
  location,
  minVal,
  maxVal,
}: {
  data: Array<{
    date: string;
    mb: number | null;
    sri: number | null;
  }>;
  location: 'PT. MB' | 'PT. SRI';
  minVal: number;
  maxVal: number;
}) {
  const width = 600;
  const height = 240;
  const padding = { top: 30, right: 25, bottom: 45, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const count = data.length;
  const xStep = chartW / Math.max(1, count - 1);

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    const norm = (val - minVal) / range;
    return padding.top + chartH - norm * chartH;
  };

  const points: { x: number; y: number; val: number; date: string }[] = [];
  data.forEach((d, idx) => {
    const val = location === 'PT. MB' ? d.mb : d.sri;
    const x = padding.left + idx * xStep;
    if (val !== null) {
      points.push({ x, y: getY(val), val, date: d.date });
    }
  });

  const pathStr = points.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`,
    '',
  );

  const yTicksCount = 6;
  const yTicks = Array.from({ length: yTicksCount }, (_, i) => {
    const val = Number(minVal + ((maxVal - minVal) / (yTicksCount - 1)) * i);
    return { val, y: getY(val) };
  });

  const themeColor = location === 'PT. MB' ? '#16a34a' : '#2563eb';

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Axis Title */}
        <text
          x={-height / 2 + 10}
          y={14}
          transform="rotate(-90)"
          fontSize="10"
          fill="#64748b"
          textAnchor="middle"
          fontWeight="600"
        >
          Tinggi Air (cm)
        </text>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#f1f5f9"
            />
            <text
              x={padding.left - 8}
              y={tick.y + 4}
              fontSize="9"
              fill="#64748b"
              textAnchor="end"
            >
              {formatDecimal(tick.val)}
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
                stroke="#f8fafc"
              />
              <text
                x={x}
                y={height - padding.bottom + 16}
                fontSize="9"
                fill="#64748b"
                textAnchor="middle"
              >
                {formatShortDate(d.date)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {points.length > 1 && (
          <path
            d={`${pathStr} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`}
            fill="url(#reportGrad)"
          />
        )}

        {/* Main line */}
        {pathStr && (
          <path d={pathStr} fill="none" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Dots and Value Labels on top of dots */}
        {points.map((pt, idx) => (
          <g key={idx}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill={themeColor}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={pt.x}
              y={pt.y - 8}
              fontSize="9.5"
              fontWeight="700"
              fill="#0f172a"
              textAnchor="middle"
            >
              {formatDecimal(pt.val)}
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${width / 2 - 35}, ${height - 8})`}>
          <line x1={0} y1={0} x2={20} y2={0} stroke={themeColor} strokeWidth="3" />
          <text x={26} y={3} fontSize="10" fontWeight="700" fill="#0f172a">
            {location}
          </text>
        </g>
      </svg>
    </div>
  );
}
