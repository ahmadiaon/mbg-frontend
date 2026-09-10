import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PhotoProfileCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
}

// Deteksi wajah sederhana via Shape Detection API atau skin-tone centroid fallback di Canvas
async function detectFace(img: HTMLImageElement): Promise<FaceBox | null> {
  // 1. Coba browser native FaceDetector API (Chrome / Edge / Android)
  if ('FaceDetector' in window) {
    try {
      const FaceDetectorClass = (window as unknown as { FaceDetector: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (img: HTMLImageElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector;
      const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        return {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
      }
    } catch {
      // fallback jika FaceDetector dinonaktifkan atau gagal
    }
  }

  // 2. Heuristik analisis warna kulit (Skin Tone Detection) pada canvas resolusi rendah
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 200 / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, maxX = 0, minY = h, maxY = 0;
    let skinCount = 0;

    // Scan area 10% - 70% tinggi gambar (area kepala & wajah normal)
    const startY = Math.floor(h * 0.1);
    const endY = Math.floor(h * 0.7);

    for (let y = startY; y < endY; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Konversi RGB ke YCbCr untuk deteksi warna kulit manusia
        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        if (yVal > 60 && yVal < 235 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
          skinCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Jika ditemukan area kulit yang cukup signifikan
    if (skinCount > 150 && maxX > minX && maxY > minY) {
      const detectedW = (maxX - minX) / scale;
      const detectedH = (maxY - minY) / scale;
      if (detectedW > img.naturalWidth * 0.12 && detectedW < img.naturalWidth * 0.8) {
        return {
          x: Math.round(minX / scale),
          y: Math.round(minY / scale),
          width: Math.round(detectedW),
          height: Math.round(detectedH),
        };
      }
    }
  } catch {
    // fallback jika canvas error
  }

  // 3. Fallback cerdas: Default posisi sepertiga atas tengah
  const defaultW = img.naturalWidth * 0.4;
  const defaultH = defaultW * 1.1;
  return {
    x: Math.round((img.naturalWidth - defaultW) / 2),
    y: Math.round(img.naturalHeight * 0.15),
    width: Math.round(defaultW),
    height: Math.round(defaultH),
  };
}

export default function PhotoProfileCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onApplyCrop,
}: PhotoProfileCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Offset crop relatif terhadap gambar asli
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 300,
    height: 400,
  });

  // State untuk drag/geser
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; boxX: number; boxY: number }>({
    mouseX: 0,
    mouseY: 0,
    boxX: 0,
    boxY: 0,
  });

  // Inisialisasi crop & deteksi wajah saat gambar dibuka
  const initCrop = useCallback(async (img: HTMLImageElement) => {
    setLoading(true);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const detected = await detectFace(img);
    const hasFace = Boolean(detected);
    setFaceDetected(hasFace);

    // Rasio foto 3:4 (width / height = 0.75)
    const TARGET_RATIO = 3 / 4;

    // Hitung ukuran crop box 3:4 agar proporsional:
    // Wajah mengisi sekitar 35% tinggi frame 3x4
    // Menyisakan 15% ruang atas dan 50% ruang bawah (bahu & badan)
    let targetCropHeight: number;
    let targetCropWidth: number;

    if (detected) {
      targetCropHeight = Math.round(detected.height / 0.35);
      targetCropWidth = Math.round(targetCropHeight * TARGET_RATIO);
    } else {
      targetCropHeight = Math.round(nh * 0.8);
      targetCropWidth = Math.round(targetCropHeight * TARGET_RATIO);
    }

    // Pastikan tidak melebihi ukuran gambar
    if (targetCropHeight > nh || targetCropWidth > nw) {
      if (nw / nh > TARGET_RATIO) {
        targetCropHeight = nh;
        targetCropWidth = Math.round(nh * TARGET_RATIO);
      } else {
        targetCropWidth = nw;
        targetCropHeight = Math.round(nw / TARGET_RATIO);
      }
    }

    // Posisikan crop box: Wajah berada di atas-tengah agar badan terlihat di bawah
    let cx: number;
    let cy: number;

    if (detected) {
      cx = Math.round(detected.x + detected.width / 2 - targetCropWidth / 2);
      cy = Math.round(detected.y - targetCropHeight * 0.16);
    } else {
      cx = Math.round((nw - targetCropWidth) / 2);
      cy = Math.round((nh - targetCropHeight) * 0.2);
    }

    // Clamp batas gambar
    cx = Math.max(0, Math.min(nw - targetCropWidth, cx));
    cy = Math.max(0, Math.min(nh - targetCropHeight, cy));

    setCropBox({
      x: cx,
      y: cy,
      width: targetCropWidth,
      height: targetCropHeight,
    });
    setZoom(1);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      void initCrop(img);
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, initCrop]);

  // Penanganan Drag Crop Box
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: cropBox.x,
      boxY: cropBox.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !imgRef.current || !containerRef.current) return;
      const img = imgRef.current;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      // Hitung skala tampilan container
      const containerRect = containerRef.current.getBoundingClientRect();
      const scaleX = nw / containerRect.width;
      const scaleY = nh / containerRect.height;

      const deltaX = (e.clientX - dragStartRef.current.mouseX) * scaleX;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) * scaleY;

      let newX = Math.round(dragStartRef.current.boxX + deltaX);
      let newY = Math.round(dragStartRef.current.boxY + deltaY);

      newX = Math.max(0, Math.min(nw - cropBox.width, newX));
      newY = Math.max(0, Math.min(nh - cropBox.height, newY));

      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [isDragging, cropBox.width, cropBox.height],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Penanganan Zoom (Mengubah skala crop box)
  const handleZoomChange = (newZoom: number) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const TARGET_RATIO = 3 / 4;

    setZoom(newZoom);

    // Zoom memperbesar/memperkecil area crop
    const baseHeight = Math.round(nh * 0.75);
    let targetH = Math.round(baseHeight / newZoom);
    let targetW = Math.round(targetH * TARGET_RATIO);

    if (targetH > nh || targetW > nw) {
      if (nw / nh > TARGET_RATIO) {
        targetH = nh;
        targetW = Math.round(nh * TARGET_RATIO);
      } else {
        targetW = nw;
        targetH = Math.round(nw / TARGET_RATIO);
      }
    }

    // Pusat tetap sama
    const centerX = cropBox.x + cropBox.width / 2;
    const centerY = cropBox.y + cropBox.height / 2;

    let newX = Math.round(centerX - targetW / 2);
    let newY = Math.round(centerY - targetH / 2);

    newX = Math.max(0, Math.min(nw - targetW, newX));
    newY = Math.max(0, Math.min(nh - targetH, newY));

    setCropBox({
      x: newX,
      y: newY,
      width: targetW,
      height: targetH,
    });
  };

  // Render hasil crop ke canvas resolusi tinggi 3x4 (600x800 px)
  const handleApply = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    const outCanvas = document.createElement('canvas');
    // Standar 3:4 potret (tinggi lebih panjang) terkompresi ringan & tajam: 360 x 480 px (~20-35 KB)
    outCanvas.width = 360;
    outCanvas.height = 480;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
      0,
      0,
      360,
      480,
    );

    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.78);
    onApplyCrop(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  const nw = imgRef.current?.naturalWidth || 1;
  const nh = imgRef.current?.naturalHeight || 1;

  // Konversi koordinat crop box ke persentase tampilan
  const boxLeftPct = (cropBox.x / nw) * 100;
  const boxTopPct = (cropBox.y / nh) * 100;
  const boxWidthPct = (cropBox.width / nw) * 100;
  const boxHeightPct = (cropBox.height / nh) * 100;

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-dark text-white py-3">
            <h5 className="modal-title text-white font-16 d-flex align-items-center">
              <i className="bi bi-crop mr-2 text-primary"></i>
              Sesuaikan Foto 4 x 3 (Tinggi Lebih Panjang)
            </h5>
            <button
              type="button"
              className="close text-white"
              aria-label="Close"
              onClick={onClose}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body p-3 bg-light">
            {/* Status bar deteksi wajah */}
            <div className="d-flex justify-content-between align-items-center mb-2 px-1">
              <div>
                {faceDetected ? (
                  <span className="badge badge-success px-2 py-1 font-12">
                    <i className="bi bi-person-check-fill mr-1"></i> Wajah Terdeteksi Otomatis (4x3 Potret)
                  </span>
                ) : (
                  <span className="badge badge-secondary px-2 py-1 font-12">
                    <i className="bi bi-info-circle mr-1"></i> Mode Penyesuaian Manual (4x3 Potret)
                  </span>
                )}
              </div>
              <div className="font-12 text-muted">
                <i className="bi bi-hand-index-thumb mr-1"></i> Klik & seret kotak untuk menggeser
              </div>
            </div>

            {/* Area Kanvas Cropping */}
            <div
              className="position-relative mx-auto rounded overflow-hidden"
              style={{
                maxWidth: '520px',
                maxHeight: '440px',
                backgroundColor: '#1e293b',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                userSelect: 'none',
              }}
              ref={containerRef}
            >
              {loading ? (
                <div className="text-center py-5 text-white">
                  <div className="spinner-border text-primary" role="status" />
                  <div className="mt-2 font-13 text-light">Menganalisis wajah & proporsi 4x3...</div>
                </div>
              ) : (
                <>
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt="Source"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '440px',
                        display: 'block',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Darkened Mask di luar Crop Box */}
                  <div
                    className="position-absolute"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.55)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Interactive Crop Box 3:4 */}
                  <div
                    className="position-absolute"
                    onMouseDown={handleMouseDown}
                    style={{
                      left: `${boxLeftPct}%`,
                      top: `${boxTopPct}%`,
                      width: `${boxWidthPct}%`,
                      height: `${boxHeightPct}%`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                      border: '2px solid #3b82f6',
                      borderRadius: '4px',
                    }}
                  >
                    {/* Panduan Grid 3x3 */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gridTemplateRows: '1fr 1fr 1fr',
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ borderRight: '1px dashed rgba(255,255,255,0.4)', borderBottom: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255,255,255,0.4)', borderBottom: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255,255,255,0.4)', borderBottom: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255,255,255,0.4)', borderBottom: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255,255,255,0.4)' }} />
                      <div />
                    </div>

                    {/* Oval panduan posisi kepala/wajah di area atas */}
                    <div
                      className="position-absolute"
                      style={{
                        top: '12%',
                        left: '25%',
                        width: '50%',
                        height: '42%',
                        border: '1.5px dotted rgba(59, 130, 246, 0.7)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                      }}
                      title="Posisi kepala & wajah"
                    />

                    {/* Label rasio 4x3 Potret */}
                    <div
                      className="position-absolute font-11 weight-600 px-1 rounded text-white"
                      style={{
                        bottom: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(37, 99, 235, 0.85)',
                        pointerEvents: 'none',
                      }}
                    >
                      4 : 3 Potret
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Slider Kontrol Zoom */}
            <div className="mt-3 px-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span className="font-12 weight-600 text-dark">
                  <i className="bi bi-zoom-in mr-1 text-primary"></i> Skala Zoom Foto:
                </span>
                <span className="font-12 text-muted">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                className="form-control-range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="modal-footer bg-white">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary px-4"
              disabled={loading}
              onClick={handleApply}
            >
              <i className="bi bi-check-lg mr-1"></i> Terapkan Foto 4x3
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
