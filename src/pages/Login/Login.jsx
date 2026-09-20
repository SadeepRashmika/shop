import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheckSquare, FiSquare } from 'react-icons/fi';
import './Auth.css';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load saved credentials on startup
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('smartpos_remember_me');
      const savedUser = localStorage.getItem('smartpos_saved_username');
      const savedPass = localStorage.getItem('smartpos_saved_password');

      if (savedRemember === 'true' || savedRemember === null) {
        setRememberMe(true);
        if (savedUser) setEmail(savedUser);
        if (savedPass) setPassword(savedPass);
      } else {
        setRememberMe(false);
      }
    } catch (e) {
      console.warn('Could not read saved credentials:', e);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Save or remove credentials based on Remember Me checkbox
      try {
        if (rememberMe) {
          localStorage.setItem('smartpos_remember_me', 'true');
          localStorage.setItem('smartpos_saved_username', email.trim());
          localStorage.setItem('smartpos_saved_password', password);
        } else {
          localStorage.removeItem('smartpos_remember_me');
          localStorage.removeItem('smartpos_saved_username');
          localStorage.removeItem('smartpos_saved_password');
        }
      } catch (e) {}

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1"></div>
        <div className="auth-orb auth-orb-2"></div>
      </div>

      <div className="auth-container fade-in">
        <div className="auth-card glass">
          <div className="auth-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <img 
                src="./pos_banner.jpg" 
                alt="SmartPOS Logo" 
                style={{ 
                  width: '82px', 
                  height: '82px', 
                  borderRadius: '20px', 
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.45)', 
                  border: '2px solid rgba(59, 130, 246, 0.5)',
                  objectFit: 'cover'
                }} 
              />
            </div>
            <h1 className="auth-title gradient-text">{t('auth.loginTitle', 'SmartPOS Login')}</h1>
            <p className="auth-subtitle">{t('auth.loginSubtitle', 'පද්ධතියට ඇතුළු වීමට ඔබගේ තොරතුරු ලබාදෙන්න')}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} id="login-form">
            {error && <div className="auth-error">{error}</div>}

            <Input
              id="login-email"
              label="Email / Username"
              type="text"
              placeholder="suminda or you@example.com"
              icon={<FiMail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div style={{ position: 'relative' }}>
              <Input
                id="login-password"
                label={t('auth.password', 'Password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<FiLock />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '38px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Remember Me / Save Password Option */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer', 
                userSelect: 'none',
                marginTop: '-4px'
              }}
              onClick={() => setRememberMe(!rememberMe)}
            >
              <span style={{ color: rememberMe ? '#3b82f6' : 'var(--text-muted)', fontSize: '1.15rem', display: 'flex', alignItems: 'center' }}>
                {rememberMe ? <FiCheckSquare /> : <FiSquare />}
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                මුරපදය මතක තබා ගන්න (Remember / Save Password)
              </span>
            </div>

            <Button type="submit" fullWidth loading={loading} id="login-submit-btn">
              {t('auth.login', 'ඇතුළු වන්න (Login)')}
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              {t('auth.noAccount', 'ගිණුමක් නොමැතිද?')}{' '}
              <Link to="/register" className="auth-link">{t('auth.register', 'ලියාපදිංචි වන්න')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

