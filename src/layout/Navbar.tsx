import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

interface NavbarProps {
  onToggle: () => void;
}

export default function Navbar({ onToggle }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="header">
      <div className="header-left">
        <div className="menu-icon bi bi-list" onClick={onToggle}></div>
      </div>

      <div className="header-right">
        <div className="user-notification">
          <div className="dropdown">
            <a className="dropdown-toggle no-arrow" href="#" role="button">
              <i className="icon-copy dw dw-notification"></i>
            </a>
          </div>
        </div>

        <div className="user-info-dropdown">
          <div className="dropdown">
            <a
              className="dropdown-toggle"
              href="#"
              role="button"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((o) => !o);
              }}
            >
              <span className="user-icon">
                <img src="/deskapp/images/photo1.jpg" alt="" />
              </span>
              <span className="user-name">{user?.name ?? 'User'}</span>
            </a>
            <div
              className={`dropdown-menu dropdown-menu-right dropdown-menu-icon-list ${
                menuOpen ? 'show' : ''
              }`}
            >
              <a
                className="dropdown-item"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  navigate('/profile');
                }}
              >
                <i className="dw dw-user1"></i> Profile
              </a>
              <a
                className="dropdown-item"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  handleLogout();
                }}
              >
                <i className="dw dw-logout"></i> Log Out
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
