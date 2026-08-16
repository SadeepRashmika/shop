import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { FiSettings, FiCheck, FiSave, FiShoppingBag, FiPhone, FiMail, FiMapPin, FiScissors, FiDollarSign } from 'react-icons/fi';
import './Settings.css';

export default function Settings() {
  const { isOwner } = useAuth();

  const [shopName, setShopName] = useState('සුමින්ද ස්ටෝර්ස්');
  const [shopAddress, setShopAddress] = useState('සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර');
  const [shopPhone, setShopPhone] = useState('0777640334');
  const [shopEmail, setShopEmail] = useState('sumindapradeep1111@gmail.com');
  const [weeRate, setWeeRate] = useState('7');
  const [polRate, setPolRate] = useState('65');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // First check localStorage for instant load
        const local = localStorage.getItem('smartpos_settings');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.shopName) setShopName(parsed.shopName);
          if (parsed.shopAddress) setShopAddress(parsed.shopAddress);
          if (parsed.shopPhone) setShopPhone(parsed.shopPhone);
          if (parsed.shopEmail) setShopEmail(parsed.shopEmail);
          if (parsed.weeRate !== undefined) setWeeRate(String(parsed.weeRate));
          if (parsed.polRate !== undefined) setPolRate(String(parsed.polRate));
        }

        // Fetch from Firestore
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.shopName) setShopName(data.shopName);
          if (data.shopAddress) setShopAddress(data.shopAddress);
          if (data.shopPhone) setShopPhone(data.shopPhone);
          if (data.shopEmail) setShopEmail(data.shopEmail);
          if (data.weeRate !== undefined) setWeeRate(String(data.weeRate));
          if (data.polRate !== undefined) setPolRate(String(data.polRate));

          localStorage.setItem('smartpos_settings', JSON.stringify(data));
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    const newSettings = {
      shopName: shopName.trim() || 'සුමින්ද ස්ටෝර්ස්',
      shopAddress: shopAddress.trim() || 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර',
      shopPhone: shopPhone.trim() || '0777640334',
      shopEmail: shopEmail.trim() || 'sumindapradeep1111@gmail.com',
      weeRate: parseFloat(weeRate) || 7,
      polRate: parseFloat(polRate) || 65,
      updatedAt: new Date()
    };

    try {
      await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });
      localStorage.setItem('smartpos_settings', JSON.stringify(newSettings));
      setSuccessMsg('පද්ධති සැකසුම් (Settings) සාර්ථකව යාවත්කාලීන විය!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("සැකසුම් සුරැකීම අසාර්ථකයි: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>සැකසුම් තොරතුරු පූරණය වෙමින් පවතී...</p>
      </div>
    );
  }

  return (
    <div className="settings-page fade-in">
      <div className="page-header mb-6">
        <h1 className="page-title gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiSettings /> <span>පද්ධති සැකසුම් (System Settings)</span>
        </h1>
        <p className="page-subtitle">
          බිල්පතේ මුද්‍රණය වන කඩේ විස්තර සහ වී/පොල් කෙටීමේ ගාස්තු මෙතැනින් වෙනස් කරන්න
        </p>
      </div>

      {successMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1.5px solid #22c55e',
          color: '#22c55e',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: 700,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <FiCheck style={{ fontSize: '1.4rem' }} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Shop Information Section */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiShoppingBag style={{ color: 'var(--primary-400)' }} />
              <span>බිල්පතේ මුද්‍රණය වන විස්තර (Shop Info)</span>
            </h2>

            <div className="form-group mb-4">
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>
                ආයතනයේ / කඩේ නම (Shop Name)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '0.95rem', fontWeight: 600 }}
                  required
                />
                <FiShoppingBag style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group mb-4">
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>
                ලිපිනය (Address)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '0.95rem', fontWeight: 600 }}
                  required
                />
                <FiMapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group mb-4">
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>
                දුරකථන අංකය (Phone Number)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '0.95rem', fontWeight: 600 }}
                  required
                />
                <FiPhone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group mb-4">
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>
                විද්‍යුත් තැපෑල (Email Address)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '0.95rem', fontWeight: 600 }}
                />
                <FiMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Milling Rates Section */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiScissors style={{ color: '#eab308' }} />
              <span>කෙටීමේ ගාස්තු (Milling Rates)</span>
            </h2>

            <div className="form-group mb-4" style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px', color: '#eab308' }}>
                🌾 වී කෙටීමේ 1 Kg ගාස්තුව (Rs / Kg)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={weeRate}
                  onChange={(e) => setWeeRate(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '1.2rem', fontWeight: 700 }}
                  required
                />
                <FiDollarSign style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#eab308' }} />
              </div>
              <small style={{ display: 'block', marginTop: '6px', opacity: 0.8 }}>
                වී කෙටීමේ ගාස්තුව ගණනය වීමට භාවිතා වන 1 Kg මිල
              </small>
            </div>

            <div className="form-group mb-4" style={{ background: 'rgba(234, 88, 12, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px', color: '#ea580c' }}>
                🥥 පොල් කෙටීමේ 1 Kg ගාස්තුව (Rs / Kg)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={polRate}
                  onChange={(e) => setPolRate(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '1.2rem', fontWeight: 700 }}
                  required
                />
                <FiDollarSign style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ea580c' }} />
              </div>
              <small style={{ display: 'block', marginTop: '6px', opacity: 0.8 }}>
                පොල් කෙටීමේ ගාස්තුව ගණනය වීමට භාවිතා වන 1 Kg මිල
              </small>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                icon={<FiSave />}
                fullWidth
                style={{ padding: '0.85rem', fontSize: '1rem' }}
              >
                {saving ? 'සුරකිමින් පවතී...' : '💾 සැකසුම් සුරකින්න (Save Settings)'}
              </Button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
