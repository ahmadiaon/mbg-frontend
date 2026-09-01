import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { payslipApi, type SlipItem } from '../api';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function MySlip() {
  const [slips, setSlips] = useState<SlipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<pdfjsLib.PDFPageProxy | null>(null);

  const selected = useMemo(
    () => slips.find((s) => s.year === year && s.month === month),
    [slips, year, month],
  );

  useEffect(() => {
    payslipApi
      .list()
      .then((data) => {
        setSlips(data);
        if (data.length > 0) {
          const y = data[0].year;
          setYear(y);
          setMonth(data.find((s) => s.year === y)?.month ?? null);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat slip'))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(
    () => [...new Set(slips.map((s) => s.year))].sort((a, b) => b - a),
    [slips],
  );

  const months = useMemo(
    () =>
      slips
        .filter((s) => s.year === year)
        .map((s) => s.month)
        .sort((a, b) => b - a),
    [slips, year],
  );

  async function renderAtScale(s: number) {
    const page = pageRef.current;
    const canvas = canvasRef.current;
    if (!page || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: s * dpr });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
    await page.render({ canvas, viewport }).promise;
    setScale(s);
  }

  async function renderFitWidth() {
    const page = pageRef.current;
    const container = containerRef.current;
    if (!page || !container) return;
    const vp = page.getViewport({ scale: 1 });
    const width = container.clientWidth || 600;
    const s = width / vp.width;
    await renderAtScale(s);
  }

  useEffect(() => {
    if (!selected) {
      pageRef.current = null;
      setPdfError('');
      return;
    }
    setPdfLoading(true);
    setPdfError('');
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('mbg_token');
        const res = await fetch(`/api/payslips/${selected.id}/file`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Gagal memuat');
        const data = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        pageRef.current = page;
        await renderFitWidth();
      } catch {
        if (!cancelled) setPdfError('Gagal memuat PDF slip');
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function zoomIn() {
    renderAtScale(scale + 0.25);
  }

  function zoomOut() {
    if (scale > 0.4) renderAtScale(scale - 0.25);
  }

  async function download() {
    if (!selected) return;
    try {
      const token = localStorage.getItem('mbg_token');
      const res = await fetch(`/api/payslips/${selected.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Gagal mengunduh');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SLIP-${selected.year}-${String(selected.month).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Gagal mengunduh slip');
    }
  }

  return (
    <div>
      <div className="title pb-20">
        <h2 className="h3 mb-0">
          <i className="bi bi-file-earmark-pdf text-danger mr-2"></i> Slip Gaji
        </h2>
        <p className="text-secondary font-14 mb-0">
          Pilih periode untuk melihat slip gaji Anda
        </p>
      </div>

      {loading && <p className="text-secondary">Memuat…</p>}
      {error && <div className="error">{error}</div>}

      {!loading && slips.length === 0 && (
        <div className="card-box pd-20">
          <div className="empty-state">
            <i className="bi bi-inbox"></i>
            <p>Belum ada slip gaji yang tersedia.</p>
          </div>
        </div>
      )}

      {slips.length > 0 && (
        <>
          <div className="card-box pd-20 mb-20">
            <div className="font-14 weight-600 mb-2">Tahun</div>
            <div className="chips">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`chip ${y === year ? 'active' : ''}`}
                  onClick={() => {
                    setYear(y);
                    const m = slips.find((s) => s.year === y)?.month ?? null;
                    setMonth(m);
                  }}
                >
                  {y}
                </button>
              ))}
            </div>

            <div className="font-14 weight-600 mb-2 mt-3">Bulan</div>
            <div className="chips">
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip ${m === month ? 'active' : ''}`}
                  onClick={() => setMonth(m)}
                >
                  {MONTHS[m - 1]}
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="card-box pd-20">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                <span className="weight-600 font-16">
                  Slip {MONTHS[selected.month - 1]} {selected.year}
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={zoomOut}
                    title="Perkecil"
                  >
                    <i className="bi bi-zoom-out"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={renderFitWidth}
                    title="Sesuaikan Lebar"
                  >
                    <i className="bi bi-arrows-fullscreen"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={zoomIn}
                    title="Perbesar"
                  >
                    <i className="bi bi-zoom-in"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={download}
                  >
                    <i className="bi bi-download"></i> Unduh
                  </button>
                </div>
              </div>

              {pdfLoading && (
                <div className="text-center py-4">
                  <div className="spinner"></div>
                </div>
              )}
              {pdfError && (
                <div className="empty-state">
                  <i className="bi bi-file-earmark-x"></i>
                  <p>{pdfError}</p>
                </div>
              )}

              <div
                ref={containerRef}
                className="slip-canvas-wrap"
                style={{ display: pdfLoading || pdfError ? 'none' : 'block' }}
              >
                <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />
              </div>
            </div>
          ) : (
            <div className="card-box pd-20">
              <div className="empty-state">
                <i className="bi bi-file-earmark-x"></i>
                <p>File slip untuk periode ini belum tersedia.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
