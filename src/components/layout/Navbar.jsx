import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { FiMenu, FiLogOut, FiUser } from 'react-icons/fi';
import './Navbar.css';

export default function Navbar({ onToggleSidebar }) {
  const { t } = useTranslation();
  const { user, userData, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar glass" id="main-navbar">
      <div className="navbar-left">
        {isAuthenticated && (
          <button className="navbar-toggle" onClick={onToggleSidebar} id="sidebar-toggle">
            <FiMenu />
          </button>
        )}
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">◆</span>
          <span className="brand-text gradient-text">SmartPOS</span>
        </Link>
      </div>

      <div className="navbar-right">
        <LanguageSwitcher />
        
        {isAuthenticated ? (
          <div className="navbar-user">
            <Link to="/profile" className="user-info" style={{textDecoration: 'none', color: 'inherit', cursor: 'pointer'}} title="View Profile">
              <FiUser />
              <span className="user-name">{userData?.name || 'User'}</span>
              <span className="user-role">{userData?.role}</span>
            </Link>
            <button className="navbar-btn logout-btn" onClick={handleLogout} id="logout-btn">
              <FiLogOut />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="navbar-btn" id="nav-login-btn">
              {t('nav.login')}
            </Link>
            <Link to="/register" className="navbar-btn navbar-btn-primary" id="nav-register-btn">
              {t('nav.register')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
