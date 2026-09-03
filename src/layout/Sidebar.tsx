import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { MENU } from './menu';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, access } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const role = user?.role ?? 1;
  const dynamicFeatures = access
    ? Object.values(access.features)
        .filter((feature) => feature.read && feature.route)
        .sort((a, b) => a.sort - b.sort)
    : [];

  function toggle(key: string) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  return (
    <div className={`left-side-bar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand-logo">
        <a href="/">
          <img src="/deskapp/images/logo-mbg.png" alt="Mitra Barito Group" className="dark-logo" />
          <img src="/deskapp/images/logo-mbg.png" alt="Mitra Barito Group" className="light-logo" />
        </a>
        <div className="close-sidebar" onClick={onClose}>
          <i className="ion-close-round"></i>
        </div>
      </div>

      <div className="menu-block customscroll">
        <div className="sidebar-menu">
          <ul id="accordion-menu">
            {MENU.map((item, index) => {
              if (item.minRole && role < item.minRole) return null;
              if (item.featureCode && !access?.features[item.featureCode]?.read) return null;

              if (item.cap) {
                return (
                  <li key={`cap-${item.label}-${index}`}>
                    <div className="sidebar-small-cap">{item.label}</div>
                  </li>
                );
              }

              if (item.children) {
                const key = `${item.label}-${index}`;
                const isOpen = expanded === key;
                return (
                  <li className={`dropdown ${isOpen ? 'show' : ''}`} key={key}>
                    <a
                      href="javascript:;"
                      className="dropdown-toggle"
                      onClick={() => toggle(key)}
                    >
                      <span className={`micon ${item.icon}`}></span>
                      <span className="mtext">{item.label}</span>
                    </a>
                    <ul className="submenu">
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <NavLink
                            to={child.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                              isActive ? 'active' : ''
                            }
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              return (
                <li key={`${item.label}-${index}`}>
                  <NavLink
                    to={item.path!}
                    end={item.path === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `dropdown-toggle no-arrow ${isActive ? 'active' : ''}`
                    }
                  >
                    <span className={`micon ${item.icon}`}></span>
                    <span className="mtext">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
            {dynamicFeatures.length > 0 && (
              <>
                <li><div className="dropdown-divider" /></li>
                <li><div className="sidebar-small-cap">Feature Aktif</div></li>
                {dynamicFeatures.map((feature) => (
                  <li key={`dynamic-${feature.code}`}>
                    <NavLink to={feature.route!} onClick={onClose} className={({ isActive }) => `dropdown-toggle no-arrow ${isActive ? 'active' : ''}`}>
                      <span className={`micon ${feature.icon ?? 'bi bi-grid'}`} />
                      <span className="mtext">{feature.name}</span>
                    </NavLink>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
