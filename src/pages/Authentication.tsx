import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authApi } from '../api';

export default function Authentication() {
  const { token = '' } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [name, setName] = useState('');
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    authApi
      .validate(token)
      .then((res) => {
        if (res.found) {
          setName(res.name);
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  function handlePinInput(i: number, val: string) {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[i] = v;
    setPin(next);
    if (v && i < 5) pinRefs.current[i + 1]?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const pinValue = pin.join('');
    if (pinValue.length !== 6) {
      setError('PIN harus 6 digit');
      return;
    }
    setLoading(true);
    try {
      await authApi.setPin(token, pinValue);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan PIN');
    } finally {
      setLoading(false);
    }
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
                  <h2 className="text-center text-primary">Buat PIN</h2>
                </div>

                {status === 'loading' && (
                  <div className="text-center">
                    <div className="spinner"></div>
                    <p className="font-14 text-secondary">Memverifikasi token…</p>
                  </div>
                )}

                {status === 'invalid' && (
                  <div className="text-center">
                    <p className="font-14 text-secondary">
                      Link validasi tidak ditemukan atau sudah digunakan. Hubungi HR
                      untuk meminta link baru.
                    </p>
                    <a className="btn btn-primary" href="/login">
                      Kembali ke Login
                    </a>
                  </div>
                )}

                {status === 'valid' && (
                  <form onSubmit={handleSubmit}>
                    <p className="text-center text-secondary font-14">
                      Halo, {name}. Buat PIN 6 digit untuk login Anda.
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

                    {error && <div className="error text-center">{error}</div>}

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-block w-100 mt-2"
                      disabled={loading}
                    >
                      {loading ? 'Menyimpan…' : 'Simpan PIN'}
                    </button>
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
