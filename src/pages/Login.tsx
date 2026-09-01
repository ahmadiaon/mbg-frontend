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
        setError('NRP tidak ditemukan atau nonaktif');
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
    <div className="login-page-wrapper">
      <div className="login-header box-shadow">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="brand-logo">
            <a href="/login">
              <img src="/deskapp/images/logo-mbg.png" alt="Mitra Barito Group" />
            </a>
          </div>
        </div>
      </div>

      <div className="login-wrap d-flex align-items-center flex-wrap justify-content-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
              <div className="login-box bg-white box-shadow border-radius-10">
                <div className="login-title">
                  <h2 className="text-center text-primary">
                    {step === 'wa' ? 'Verifikasi' : 'Login'}
                  </h2>
                </div>

                {step === 'wa' && wa ? (
                  <div className="text-center">
                    <div className="check">✓</div>
                    <p className="font-14 text-secondary">
                      Demi keamanan akun, admin perlu memvalidasi identitas Anda.
                      Kirim pesan otomatis ke WhatsApp admin melalui tombol di bawah.
                    </p>
                    <a className="wa-btn" href={waLink()} target="_blank" rel="noreferrer">
                      Lanjutkan ke WhatsApp
                    </a>
                    <div>
                      <button type="button" className="btn btn-link" onClick={back}>
                        ← Kembali
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={step === 'nrp' ? checkNrp : doLogin}>
                    {step === 'nrp' ? (
                      <div className="input-group custom mb-3">
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          placeholder="Nomor Induk Karyawan (NRP)"
                          value={nrp}
                          onChange={(e) => setNrp(e.target.value)}
                          autoFocus
                        />
                        <div className="input-group-append custom">
                          <span className="input-group-text">
                            <i className="icon-copy dw dw-user1"></i>
                          </span>
                        </div>
                      </div>
                    ) : isPin ? (
                      <>
                        <p className="text-center text-secondary font-14">
                          Halo, {name}. Masukkan PIN 6 digit.
                        </p>
                        <div className="pin-row">
                          {pin.map((d, i) => (
                            <input
                              key={i}
                              className="pin-box"
                              inputMode="numeric"
                              maxLength={1}
                              value={d}
                              ref={(el) => {
                                pinRefs.current[i] = el;
                              }}
                              onChange={(e) => handlePinInput(i, e.target.value)}
                              autoFocus={i === 0}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="input-group custom mb-3">
                        <input
                          type="password"
                          className="form-control form-control-lg"
                          placeholder="NIK KTP"
                          value={nik}
                          onChange={(e) => setNik(e.target.value)}
                          autoFocus
                        />
                        <div className="input-group-append custom">
                          <span className="input-group-text">
                            <i className="icon-copy dw dw-padlock1"></i>
                          </span>
                        </div>
                      </div>
                    )}

                    {error && <div className="error text-center">{error}</div>}

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-block w-100 mt-2"
                      disabled={loading}
                    >
                      {loading
                        ? 'Memproses…'
                        : step === 'nrp'
                          ? 'Lanjut'
                          : 'Masuk'}
                    </button>

                    {step === 'credential' && (
                      <button type="button" className="btn btn-link w-100" onClick={back}>
                        ← Ganti NRP
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
