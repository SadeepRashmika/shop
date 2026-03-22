import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './Profile.css';

export default function Profile() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
      });
    }
  }, [userData]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (formData.phone && !/^(0\d{9}|\+94\d{9})$/.test(formData.phone.trim())) {
      setError("Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).");
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone
      });
      
      setMessage('Profile updated successfully! Refresh to see changes globally.');
    } catch (err) {
      console.error(err);
      setError('Failed to update profile. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await updatePassword(auth.currentUser, passwordData.newPassword);
      setMessage('Password updated successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError("For security, please log out and log back in before changing your password.");
      } else {
        setError('Failed to update password. ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <h1 className="page-title gradient-text">My Profile</h1>
        <p className="page-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="profile-container">
        {message && (
          <div className="alert-box success">
            <FiCheckCircle /> {message}
          </div>
        )}
        {error && (
          <div className="alert-box error">
            <FiAlertCircle /> {error}
          </div>
        )}

        <div className="profile-grid">
          {/* Profile Information */}
          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <FiUser className="header-icon" />
              <h2>Public Profile</h2>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <Input
                  label="Full Name"
                  placeholder="Enter your name"
                  icon={<FiUser />}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <Input
                  label="Email Address"
                  placeholder="Email"
                  icon={<FiMail />}
                  value={userData?.email || user?.email || ''}
                  disabled
                />
                <small className="form-help">Email cannot be changed directly.</small>
              </div>
              <div className="form-group">
                <Input
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  icon={<FiPhone />}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="input-label mb-2 d-block">Role</label>
                <div className="role-badge">
                  {userData?.role ? userData.role.toUpperCase() : 'UNKNOWN'}
                </div>
              </div>

              <div className="form-actions mt-6">
                <Button type="submit" loading={loading} icon={<FiSave />}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Security */}
          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <FiLock className="header-icon" />
              <h2>Security</h2>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="profile-form">
              <div className="form-group">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                  icon={<FiLock />}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  icon={<FiLock />}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                />
              </div>

              <div className="form-actions mt-6">
                <Button type="submit" variant="secondary" loading={loading} icon={<FiLock />}>
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
