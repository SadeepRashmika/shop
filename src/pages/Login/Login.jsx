import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { FiMail, FiLock } from 'react-icons/fi';
import './Auth.css';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
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
            <h1 className="auth-title gradient-text">{t('auth.loginTitle')}</h1>
            <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>
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

            <Input
              id="login-password"
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              icon={<FiLock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth loading={loading} id="login-submit-btn">
              {t('auth.login')}
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="auth-link">{t('auth.register')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
