import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

export default function DynamicFeature() {
  const { access } = useAuth();
  const location = useLocation();
  const feature = Object.values(access?.features ?? {}).find((item) => item.route === location.pathname);

  return (
    <div>
      <div className="title pb-20">
        <h2 className="h3 mb-0">{feature?.name ?? 'Feature'}</h2>
        <p className="text-secondary font-14 mb-0">Feature sudah terdaftar dan memiliki akses.</p>
      </div>
      <div className="card-box pd-20">
        <p className="mb-0">Modul ini belum memiliki halaman khusus di frontend.</p>
        <p className="text-secondary font-12 mb-0">Route: {location.pathname}</p>
      </div>
    </div>
  );
}
