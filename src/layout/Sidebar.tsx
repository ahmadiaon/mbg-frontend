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
  const isSuperAdmin = role >= 14 || (access?.roleLevels?.some((l) => l >= 14) ?? false);

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
              if (item.department) {
                const isInDept = access?.statuses?.some(
                  (s) => s.department?.toUpperCase().includes(item.department!.toUpperCase())
                ) ?? false;
                if (!isSuperAdmin && !isInDept) return null;
              }

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
                      <span className="mtext">{item.label}{item.implemented === false && <span className="badge badge-warning ml-1" title="Fitur belum dibuat">!</span>}</span>
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
                            {child.label}{child.implemented === false && <span className="badge badge-warning ml-1" title="Fitur belum dibuat">!</span>}
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
                      <span className="mtext">{item.label}{item.implemented === false && <span className="badge badge-warning ml-1" title="Fitur belum dibuat">!</span>}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
