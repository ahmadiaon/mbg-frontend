import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { authApi, type NeedVerification } from '../api';

type Step = 'nrp' | 'credential' | 'wa';

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  container: {
    display: 'flex',
    width: '100%',
    maxWidth: '1100px',
    minHeight: '620px',
    margin: 'auto',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  } as React.CSSProperties,
  leftPanel: {
    flex: '1 1 50%',
    background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 48px',
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,
  leftOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'radial-gradient(circle at 30% 70%, rgba(59,130,246,0.3) 0%, transparent 60%)',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,
  leftContent: {
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
    color: '#fff',
  } as React.CSSProperties,
  leftLogo: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'contain' as const,
    background: 'rgba(255,255,255,0.15)',
    padding: '10px',
    marginBottom: '28px',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255,255,255,0.2)',
  } as React.CSSProperties,
  leftTitle: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    marginBottom: '8px',
    lineHeight: 1.2,
  } as React.CSSProperties,
  leftSubtitle: {
    fontSize: '15px',
    opacity: 0.8,
    fontWeight: 400,
    marginBottom: '36px',
    lineHeight: 1.6,
  } as React.CSSProperties,
  features: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
    textAlign: 'left' as const,
    width: '100%',
    maxWidth: '300px',
  } as React.CSSProperties,
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    opacity: 0.9,
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(4px)',
  } as React.CSSProperties,
  featureIcon: {
    fontSize: '18px',
    flexShrink: 0,
  } as React.CSSProperties,
  rightPanel: {
    flex: '1 1 50%',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    padding: '60px 48px',
  } as React.CSSProperties,
  formLogo: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'contain' as const,
    margin: '0 auto 20px',
    display: 'block',
    boxShadow: '0 4px 20px rgba(30,58,138,0.15)',
  } as React.CSSProperties,
  formTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center' as const,
    marginBottom: '6px',
  } as React.CSSProperties,
  formSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center' as const,
    marginBottom: '32px',
  } as React.CSSProperties,
  inputLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
    display: 'block',
  } as React.CSSProperties,
  inputGroup: {
    position: 'relative' as const,
    marginBottom: '20px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '14px 16px 14px 44px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '15px',
    color: '#1e293b',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    background: '#f8fafc',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  inputIcon: {
    position: 'absolute' as const,
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#94a3b8',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,
  btn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.2s',
    boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
    marginTop: '8px',
    letterSpacing: '0.3px',
  } as React.CSSProperties,
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none',
  } as React.CSSProperties,
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 0',
    marginTop: '8px',
    display: 'block',
    width: '100%',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    fontSize: '13px',
    padding: '10px 14px',
    borderRadius: '10px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  pinRow: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '20px',
  } as React.CSSProperties,
  pinBox: {
    width: '48px',
    height: '56px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    textAlign: 'center' as const,
    fontSize: '22px',
    fontWeight: 700,
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  greeting: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center' as const,
    marginBottom: '20px',
    lineHeight: 1.5,
  } as React.CSSProperties,
  waCard: {
    textAlign: 'center' as const,
    padding: '20px 0',
  } as React.CSSProperties,
  waIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '32px',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
  } as React.CSSProperties,
  waBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 32px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
    transition: 'transform 0.15s',
  } as React.CSSProperties,
  footer: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center' as const,
    marginTop: '32px',
  } as React.CSSProperties,
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nrp, setNrp] = useState('');
  const [step, setStep] = useState<Step>('nrp');
  const [isPin, setIsPin] = useState(false);
  const [name, setName] = useState('');
  const [nik, setNik] = useState('');
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [wa, setWa] = useState<NeedVerification | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function checkNrp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.check(nrp.trim());
      if (!res.found) {
        setError('NRP tidak ditemukan atau akun nonaktif');
        return;
      }
      setName(res.name);
      setIsPin(res.isPin);
      setStep('credential');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memeriksa NRP');
    } finally {
      setLoading(false);
    }
  }

  function handlePinInput(i: number, val: string) {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[i] = v;
    setPin(next);
    if (v && i < 5) pinRefs.current[i + 1]?.focus();
  }

  function handlePinKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      pinRefs.current[i - 1]?.focus();
    }
  }

  async function doLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    const credential = isPin ? pin.join('') : nik.trim();
    if (isPin && credential.length < 6) {
      setError('PIN harus 6 digit');
      return;
    }
    if (!isPin && !credential) {
      setError('NIK wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const res = await login(nrp.trim(), credential);
      if (res.status === 'success') {
        navigate('/');
      } else {
        setWa(res);
        setStep('wa');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  function back() {
    setStep('nrp');
    setNik('');
    setPin(Array(6).fill(''));
    setError('');
  }

  function waLink() {
    const pesan = `Hallo saya ${wa?.name} | NRP ${wa?.nrp} | Meminta validasi login ke APP Mitrabarito. Mohon bantuannya. Terima kasih.`;
    return `https://wa.me/${wa?.waNumber}?text=${encodeURIComponent(pesan)}`;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* ===== Left Panel ===== */}
        <div style={styles.leftPanel} className="d-none d-md-flex">
          <div style={styles.leftOverlay} />
          <div style={styles.leftContent}>
            <img
              src="/deskapp/images/logo-mbg.png"
              alt="MBG"
              style={styles.leftLogo}
            />
            <div style={styles.leftTitle}>Mitra Barito Group</div>
            <div style={styles.leftSubtitle}>
              Enterprise Resource Planning
              <br />
              Sistem Informasi Terintegrasi
            </div>
            <div style={styles.features}>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>📊</span>
                <span>Kelola data karyawan secara dinamis</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>📋</span>
                <span>Form builder tanpa coding</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>✅</span>
                <span>Alur persetujuan bertingkat</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🔒</span>
                <span>Keamanan berlapis (PIN + WA)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Right Panel (Form) ===== */}
        <div style={styles.rightPanel}>
          <img
            src="/deskapp/images/logo-mbg.png"
            alt="Mitra Barito Group"
            style={styles.formLogo}
          />

          {step === 'wa' && wa ? (
            <div style={styles.waCard}>
              <div style={styles.waIcon}>✓</div>
              <div style={styles.formTitle}>Verifikasi Diperlukan</div>
              <p style={styles.greeting}>
                Demi keamanan akun Anda, admin perlu memvalidasi identitas Anda.
                <br />
                Kirim pesan otomatis ke WhatsApp admin.
              </p>
              <a style={styles.waBtn} href={waLink()} target="_blank" rel="noreferrer">
                💬 Lanjutkan ke WhatsApp
              </a>
              <button type="button" style={styles.linkBtn} onClick={back}>
                ← Kembali
              </button>
            </div>
          ) : (
            <>
              <div style={styles.formTitle}>
                {step === 'nrp' ? 'Selamat Datang' : `Halo, ${name}`}
              </div>
              <div style={styles.formSubtitle}>
                {step === 'nrp'
                  ? 'Masukkan NRP untuk melanjutkan'
                  : isPin
                    ? 'Masukkan PIN 6 digit Anda'
                    : 'Masukkan NIK KTP untuk verifikasi awal'}
              </div>

              {error && <div style={styles.error}>⚠️ {error}</div>}

              <form onSubmit={step === 'nrp' ? checkNrp : doLogin}>
                {step === 'nrp' ? (
                  <div style={styles.inputGroup}>
                    <span style={styles.inputIcon}>👤</span>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Nomor Registrasi Pegawai"
                      value={nrp}
                      onChange={(e) => setNrp(e.target.value)}
                      autoFocus
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)';
                        e.target.style.background = '#fff';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = '#f8fafc';
                      }}
                    />
                  </div>
                ) : isPin ? (
                  <div style={styles.pinRow}>
                    {pin.map((d, i) => (
                      <input
                        key={i}
                        style={styles.pinBox}
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        ref={(el) => {
                          pinRefs.current[i] = el;
                        }}
                        onChange={(e) => handlePinInput(i, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(i, e)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#2563eb';
                          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.boxShadow = 'none';
                        }}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={styles.inputGroup}>
                    <span style={styles.inputIcon}>🔒</span>
                    <input
                      type="password"
                      style={styles.input}
                      placeholder="Nomor Induk Kependudukan (NIK)"
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      autoFocus
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)';
                        e.target.style.background = '#fff';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = '#f8fafc';
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    ...styles.btn,
                    ...(loading ? styles.btnDisabled : {}),
                  }}
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(37,99,235,0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.transform = 'none';
                    (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(37,99,235,0.4)';
                  }}
                >
                  {loading
                    ? '⏳ Memproses…'
                    : step === 'nrp'
                      ? 'Lanjut →'
                      : '🔑 Masuk'}
                </button>

                {step === 'credential' && (
                  <button type="button" style={styles.linkBtn} onClick={back}>
                    ← Ganti NRP
                  </button>
                )}
              </form>
            </>
          )}

          <div style={styles.footer}>
            © {new Date().getFullYear()} Mitra Barito Group · v2.0
          </div>
        </div>
      </div>
    </div>
  );
}
