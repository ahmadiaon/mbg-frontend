import { type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import Authentication from './pages/Authentication';
import Layout from './layout/Layout';
import Home from './pages/Home';
import MySlip from './pages/MySlip';
import MbgLink from './pages/MbgLink';
import DatabaseForm from './pages/DatabaseForm';
import DatabaseData from './pages/DatabaseData';
import DatabaseUser from './pages/DatabaseUser';
import Authority from './pages/Authority';
import WaterLevel from './pages/WaterLevel';
import DynamicFeature from './pages/DynamicFeature';
import { EavProvider } from './context/EavContext';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <EavProvider>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/authentication/:token" element={<Authentication />} />
      <Route path="/mbg-link" element={<MbgLink />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/my-slip" element={<MySlip />} />
        <Route path="/database/form" element={<DatabaseForm />} />
        <Route path="/database/data" element={<DatabaseData />} />
        <Route path="/database/user" element={<DatabaseUser />} />
        <Route path="/authority" element={<Authority />} />
        <Route path="/feature/water-level" element={<WaterLevel />} />
        <Route path="*" element={<DynamicFeature />} />
      </Route>
    </Routes>
    </EavProvider>
  );
}
