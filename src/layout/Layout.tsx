import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('sidebar-shrink', collapsed);
    return () => document.body.classList.remove('sidebar-shrink');
  }, [collapsed]);

  function toggle() {
    if (window.innerWidth >= 1200) {
      setCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  }

  return (
    <>
      <Navbar onToggle={toggle} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div
        className={`mobile-menu-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      <div className="main-container">
        <div className="xs-pd-20-10 pd-ltr-20">
          <Outlet />

          <div className="footer-wrap pd-20 mb-20 card-box">
            MBG Application by{' '}
            <a href="#" target="_blank" rel="noreferrer">
              ahma.id
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
