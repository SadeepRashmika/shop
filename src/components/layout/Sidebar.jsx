import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  FiHome, FiPackage, FiShoppingCart, FiUsers as FiUsersIcon, 
  FiBarChart2, FiUserCheck, FiSearch, FiShoppingBag, FiUser, FiStar
} from 'react-icons/fi';
import './Sidebar.css';

export default function Sidebar({ isOpen }) {
  const { t } = useTranslation();
  const { isOwner, isCashier, isCustomer } = useAuth();
  const location = useLocation();

  const ownerLinks = [
    { to: '/dashboard', icon: <FiHome />, label: t('nav.dashboard') },
    { to: '/users', icon: <FiUsersIcon />, label: t('nav.users') },
    { to: '/inventory', icon: <FiPackage />, label: t('nav.inventory') },
    { to: '/sales', icon: <FiShoppingCart />, label: t('nav.sales') },
    { to: '/debtors', icon: <FiUserCheck />, label: t('nav.debtors') },
    { to: '/reports', icon: <FiBarChart2 />, label: t('nav.reports') },
    { to: '/orders', icon: <FiShoppingBag />, label: t('nav.orders') },
    { to: '/ads', icon: <FiStar />, label: t('nav.ads') },
    { to: '/profile', icon: <FiUser />, label: 'My Profile' },
  ];

  const cashierLinks = [
    { to: '/dashboard', icon: <FiHome />, label: t('nav.dashboard') },
    { to: '/items', icon: <FiPackage />, label: t('nav.items') },
    { to: '/sales', icon: <FiShoppingCart />, label: t('nav.sales') },
    { to: '/debtors', icon: <FiUserCheck />, label: t('nav.debtors') },
    { to: '/reports', icon: <FiBarChart2 />, label: t('nav.reports') },
    { to: '/orders', icon: <FiShoppingBag />, label: t('nav.orders') },
    { to: '/profile', icon: <FiUser />, label: 'My Profile' },
  ];

  const customerLinks = [
    { to: '/dashboard', icon: <FiHome />, label: t('nav.dashboard') },
    { to: '/search', icon: <FiSearch />, label: t('nav.search') },
    { to: '/orders', icon: <FiShoppingBag />, label: t('nav.orders') },
    { to: '/profile', icon: <FiUser />, label: 'My Profile' },
  ];

  let links = [];
  if (isOwner) links = ownerLinks;
  else if (isCashier) links = cashierLinks;
  else if (isCustomer) links = customerLinks;

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`} id="main-sidebar">
      <div className="sidebar-content">
        <ul className="sidebar-nav">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                id={`sidebar-link-${link.to.replace('/', '')}`}
              >
                <span className="sidebar-link-icon">{link.icon}</span>
                <span className="sidebar-link-text">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
