import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { authApi, type NeedVerification } from '../api';

type Step = 'nrp' | 'credential' | 'wa';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(145deg, #0b132b 0%, #1c2541 50%, #1e3a8a 100%)',
        padding: '20px 16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ===== Card Login Mobile First ===== */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '36px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '92px',
              height: '92px',
              margin: '0 auto 14px',
              borderRadius: '50%',
              background: '#ffffff',
              padding: '6px',
              boxShadow: '0 8px 24px rgba(30, 58, 138, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #eff6ff',
            }}
          >
            <img
              src="/deskapp/images/logo-mbg.png"
              alt="Mitra Barito Group"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 4px',
              letterSpacing: '-0.3px',
            }}
          >
            MITRA BARITO GROUP
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              margin: 0,
              fontWeight: 500,
            }}
          >
            {step === 'wa'
              ? 'Verifikasi Akun Pengguna'
              : step === 'nrp'
              ? 'Sistem Informasi & Layanan Karyawan'
              : `Halo, ${name}`}
          </p>
        </div>

        {/* Subtitle / Step description */}
        <div
          style={{
            fontSize: '13px',
            color: '#475569',
            textAlign: 'center',
            marginBottom: '20px',
            background: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          {step === 'nrp' && 'Masukkan NRP untuk masuk ke akun Anda'}
          {step === 'credential' && (isPin ? 'Masukkan 6 digit PIN akun Anda' : 'Masukkan NIK KTP untuk verifikasi pertama')}
          {step === 'wa' && 'Akun baru memerlukan verifikasi admin via WhatsApp'}
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '13px',
              padding: '10px 14px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #fecaca',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Step: WA Verification */}
        {step === 'wa' && wa ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(34, 197, 94, 0.35)',
              }}
            >
              ✓
            </div>
            <p
              style={{
                fontSize: '13px',
                color: '#64748b',
                lineHeight: 1.6,
                marginBottom: '20px',
              }}
            >
              Demi keamanan akun, silakan kirim pesan otomatis ke WhatsApp admin melalui tombol di bawah.
            </p>
            <a
              href={waLink()}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 6px 18px rgba(34, 197, 94, 0.35)',
                boxSizing: 'border-box',
              }}
            >
              <span>💬</span>
              <span>Lanjutkan ke WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={back}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '16px',
                padding: '8px',
              }}
            >
              ← Kembali ke awal
            </button>
          </div>
        ) : (
          <form onSubmit={step === 'nrp' ? checkNrp : doLogin}>
            {step === 'nrp' ? (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  NRP Karyawan
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '16px',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                    }}
                  >
                    👤
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: MBG12345"
                    value={nrp}
                    onChange={(e) => setNrp(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 44px',
                      borderRadius: '14px',
                      border: '2px solid #e2e8f0',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            ) : isPin ? (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '10px',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  6 Digit PIN
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center',
                  }}
                >
                  {pin.map((d, i) => (
                    <input
                      key={i}
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      ref={(el) => {
                        pinRefs.current[i] = el;
                      }}
                      onChange={(e) => handlePinInput(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      autoFocus={i === 0}
                      style={{
                        width: '44px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#0f172a',
                        background: '#f8fafc',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.background = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.background = '#f8fafc';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  NIK KTP (Password Awal)
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '16px',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                    }}
                  >
                    🔒
                  </span>
                  <input
                    type="password"
                    placeholder="Masukkan NIK KTP Anda"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 44px',
                      borderRadius: '14px',
                      border: '2px solid #e2e8f0',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: loading
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading
                  ? 'none'
                  : '0 6px 20px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s',
                letterSpacing: '0.3px',
              }}
            >
              {loading
                ? 'Sedang Memproses...'
                : step === 'nrp'
                ? 'Lanjut →'
                : 'Masuk ke Akun'}
            </button>

            {step === 'credential' && (
              <button
                type="button"
                onClick={back}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px',
                  padding: '8px',
                  textAlign: 'center',
                }}
              >
                ← Ganti NRP
              </button>
            )}
          </form>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '28px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '16px',
          }}
        >
          © {new Date().getFullYear()} PT Mitra Barito Group
        </div>
      </div>
    </div>
  );
}
