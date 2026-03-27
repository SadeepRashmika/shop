import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { FiMenu, FiLogOut, FiUser, FiSun, FiMoon } from 'react-icons/fi';
import './Navbar.css';

export default function Navbar({ onToggleSidebar }) {
  const { t } = useTranslation();
  const { user, userData, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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

        {/* Theme Toggle Button */}
        <button
          className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'}`}
          onClick={toggleTheme}
          id="theme-toggle-btn"
          title={isDark ? t('nav.lightMode', 'Light Mode') : t('nav.darkMode', 'Dark Mode')}
          aria-label="Toggle theme"
        >
          <span className="theme-icon-wrapper">
            {isDark ? <FiSun className="theme-icon" /> : <FiMoon className="theme-icon" />}
          </span>
        </button>
        
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
