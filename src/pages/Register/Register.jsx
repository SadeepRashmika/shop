import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import './Auth.css';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name, 'customer');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <h1 className="auth-title gradient-text">{t('auth.registerTitle')}</h1>
            <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} id="register-form">
            {error && <div className="auth-error">{error}</div>}

            <Input
              id="register-name"
              label={t('auth.name')}
              type="text"
              placeholder="John Doe"
              icon={<FiUser />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              id="register-email"
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              icon={<FiMail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="register-password"
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              icon={<FiLock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              id="register-confirm-password"
              label={t('auth.confirmPassword')}
              type="password"
              placeholder="••••••••"
              icon={<FiLock />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />



            <Button type="submit" fullWidth loading={loading} id="register-submit-btn">
              {t('auth.register')}
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="auth-link">{t('auth.login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
