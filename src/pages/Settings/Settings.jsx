import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  FiSettings, FiCheck, FiSave, FiShoppingBag, FiPhone, FiMail, FiMapPin,
  FiScissors, FiDollarSign, FiDatabase, FiDownload, FiUploadCloud,
  FiAlertTriangle, FiCheckCircle, FiFileText, FiRefreshCw, FiLock, FiKey, FiHash
} from 'react-icons/fi';
import {
  SUPPORTED_COLLECTIONS,
  exportDatabase,
  parseBackupFile,
  importDatabase
} from '../../services/dbBackupService';
import { syncLatestBillNumber } from '../../services/offlineHelper';
import './Settings.css';

const EXPORT_SECURITY_PASSWORD = '723412641';
const IMPORT_SECURITY_PASSWORD = '200221802060';

export default function Settings() {
  const { isOwner } = useAuth();

  // Shop Settings State
  const [shopName, setShopName] = useState('සුමින්ද ස්ටෝර්ස්');
  const [shopAddress, setShopAddress] = useState('සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර');
  const [shopPhone, setShopPhone] = useState('0777640334');
  const [shopEmail, setShopEmail] = useState('sumindapradeep1111@gmail.com');
  const [weeRate, setWeeRate] = useState('7');
  const [polRate, setPolRate] = useState('65');
  const [nextBillNumber, setNextBillNumber] = useState('1');
  const [syncingBill, setSyncingBill] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Database Backup / Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordError, setExportPasswordError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportSuccess, setExportSuccess] = useState('');

  // Database Restore / Import State
  const fileInputRef = useRef(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importPasswordError, setImportPasswordError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importSuccess, setImportSuccess] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
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

        const currentBill = await syncLatestBillNumber();
        setNextBillNumber(String((currentBill || 0) + 1));
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSyncBillNumber = async () => {
    setSyncingBill(true);
    try {
      const highest = await syncLatestBillNumber();
      setNextBillNumber(String((highest || 0) + 1));
      alert(`✅ Cloud දත්ත සමඟ සමමුහුර්ත විය! ඊළඟ බිල්පත් අංකය: #${String((highest || 0) + 1).padStart(6, '0')}`);
    } catch (e) {
      alert('සමමුහුර්ත කිරීම අසාර්ථකයි: ' + e.message);
    } finally {
      setSyncingBill(false);
    }
  };

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

      const parsedBill = parseInt(nextBillNumber, 10);
      if (!isNaN(parsedBill) && parsedBill > 0) {
        const lastNo = parsedBill - 1;
        localStorage.setItem('smartpos_last_bill_number', String(lastNo));
        await setDoc(doc(db, 'counters', 'billNumber'), { current: lastNo }, { merge: true }).catch(() => {});
      }

      setSuccessMsg('පද්ධති සැකසුම් (Settings) සාර්ථකව යාවත්කාලීන විය!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("සැකසුම් සුරැකීම අසාර්ථකයි: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Trigger Export Modal
  const openExportModal = () => {
    setExportPassword('');
    setExportPasswordError('');
    setShowExportModal(true);
  };

  // Perform Verified Export
  const handleConfirmExport = async (e) => {
    if (e) e.preventDefault();
    if (exportPassword.trim() !== EXPORT_SECURITY_PASSWORD) {
      setExportPasswordError('❌ Export මුරපදය (Password) වැරදියි! කරුණාකර නිවැරදි මුරපදය ඇතුළත් කරන්න.');
      return;
    }

    setShowExportModal(false);
    setExporting(true);
    setExportSuccess('');
    setExportProgress({ current: 0, total: SUPPORTED_COLLECTIONS.length, percentage: 0 });

    try {
      await exportDatabase(null, (progress) => {
        setExportProgress(progress);
      });
      setExportSuccess('දත්ත ගබඩාව (Database Backup) සාර්ථකව Download කරගන්නා ලදී!');
      setTimeout(() => setExportSuccess(''), 5000);
    } catch (err) {
      alert('Export කිරීමේදී දෝෂයක් සිදු විය: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Handle Backup File Selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');
    try {
      const parsed = await parseBackupFile(file);
      setParsedBackup(parsed);
    } catch (err) {
      setImportError(err.message || 'ගොනුව කියවීමට නොහැකි විය');
      setParsedBackup(null);
    }
  };

  // Trigger Import Modal
  const openImportModal = () => {
    if (!parsedBackup) return;
    setImportPassword('');
    setImportPasswordError('');
    setShowImportModal(true);
  };

  // Perform Verified Import / Restore
  const handleConfirmImport = async (e) => {
    if (e) e.preventDefault();
    if (importPassword.trim() !== IMPORT_SECURITY_PASSWORD) {
      setImportPasswordError('❌ Import මුරපදය (Password) වැරදියි! කරුණාකර නිවැරදි මුරපදය ඇතුළත් කරන්න.');
      return;
    }

    setShowImportModal(false);
    setImporting(true);
    setImportError('');
    setImportSuccess('');
    setImportProgress({ completed: 0, total: parsedBackup.totalRecords, percentage: 0 });

    try {
      const res = await importDatabase(parsedBackup, null, (progress) => {
        setImportProgress(progress);
      });
      setImportSuccess(`දත්ත ගොනු ${res.totalRestored} ක් සාර්ථකව පද්ධතියට Import කර පිහිටුවන ලදී!`);
      setParsedBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError('Import කිරීම අසාර්ථකයි: ' + err.message);
    } finally {
      setImporting(false);
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
          <FiSettings /> <span>පද්ධති සැකසුම් (System Settings & Data Management)</span>
        </h1>
        <p className="page-subtitle">
          කඩේ තොරතුරු, මිල ගණන් සහ මුළු Database එකම Password මගින් ආරක්ෂිතව Backup / Restore කිරීම මෙතැනින් කළ හැක
        </p>
      </div>

      {successMsg && (
        <div className="alert-box success mb-6">
          <FiCheck style={{ fontSize: '1.4rem' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. General & Milling Settings Form */}
      <form onSubmit={handleSaveSettings} className="mb-8">
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

            {/* Bill Number Counter Section */}
            <div className="form-group mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiHash /> <span>ඊළඟ බිල්පත් අංකය (Next Bill #)</span>
                </label>
                <button
                  type="button"
                  onClick={handleSyncBillNumber}
                  disabled={syncingBill}
                  style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#93c5fd', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FiRefreshCw className={syncingBill ? 'spin' : ''} /> {syncingBill ? 'සමමුහුර්ත වෙමින්...' : 'Sync Cloud'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  value={nextBillNumber}
                  onChange={(e) => setNextBillNumber(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px', fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}
                  required
                />
                <FiHash style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#60a5fa' }} />
              </div>
              <small style={{ display: 'block', marginTop: '6px', opacity: 0.8 }}>
                සියලුම උපකරණ වල බිල්පත් අංක නිවැරදිව පවත්වා ගැනීමට මෙම අංකය භාවිතා වේ.
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

      {/* 2. Password-Protected Database Backup & Restore Section (Owner Only) */}
      {isOwner && (
        <div className="database-management-section">
          <div className="section-title-wrap mb-4">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiDatabase style={{ color: '#3b82f6' }} />
              <span>ආරක්ෂිත දත්ත ගබඩා කළමනාකරණය (Password-Protected Database Backup & Restore)</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              දත්ත Download (Export) කිරීමට හෝ Restore (Import) කිරීමට නියමිත Security Password එක ඇතුළත් කිරීම අනිවාර්ය වේ.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            
            {/* Database Export Card */}
            <div className="glass-card db-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div className="db-card-header">
                <div className="db-icon-circle export">
                  <FiDownload />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>දත්ත ගබඩාව අපනයනය (Export Backup)</span>
                    <FiLock style={{ fontSize: '0.9rem', color: '#3b82f6' }} title="Password Protected" />
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    සියලුම Items, Bills, Debtors සහ Records එක ගොනුවකට (.json) ගන්න
                  </span>
                </div>
              </div>

              <div className="db-card-body">
                <div className="db-info-box">
                  <FiCheckCircle className="info-icon" />
                  <p>
                    මෙමගින් බඩු ලැයිස්තුව, ගනුදෙනු, ණය විස්තර සහ සැකසුම් ඇතුළු <strong>සියලුම දත්ත 100% ආරක්ෂිතව JSON ගොනුවක් ලෙස</strong> ඔබගේ පරිගණකයට සුරැකේ. (Export Password එක අවශ්‍ය වේ)
                  </p>
                </div>

                {exportProgress && (
                  <div className="db-progress-wrap">
                    <div className="db-progress-labels">
                      <span>{exportProgress.collectionName} සකසමින් පවතී...</span>
                      <span>{exportProgress.percentage}%</span>
                    </div>
                    <div className="db-progress-bar">
                      <div className="db-progress-fill" style={{ width: `${exportProgress.percentage}%` }}></div>
                    </div>
                  </div>
                )}

                {exportSuccess && (
                  <div className="alert-box success mt-3">
                    <FiCheckCircle /> <span>{exportSuccess}</span>
                  </div>
                )}
              </div>

              <div className="db-card-footer">
                <Button
                  variant="primary"
                  onClick={openExportModal}
                  disabled={exporting}
                  icon={exporting ? <FiRefreshCw className="spin" /> : <FiDownload />}
                  fullWidth
                  style={{ padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  {exporting ? 'Backup එක සකසමින් පවතී...' : '🔒 සම්පූර්ණ Database එකම Download කරන්න (Export)'}
                </Button>
              </div>
            </div>

            {/* Database Import Card */}
            <div className="glass-card db-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div className="db-card-header">
                <div className="db-icon-circle import">
                  <FiUploadCloud />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>දත්ත ගබඩාව ආනයනය (Import & Restore)</span>
                    <FiLock style={{ fontSize: '0.9rem', color: '#f59e0b' }} title="Password Protected" />
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    කලින් ගත් Backup ගොනුවක් මගින් දත්ත නැවත පද්ධතියට පිහිටුවන්න
                  </span>
                </div>
              </div>

              <div className="db-card-body">
                <div className="file-drop-area" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <FiUploadCloud style={{ fontSize: '2rem', color: '#3b82f6', marginBottom: '8px' }} />
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.92rem' }}>
                    Backup JSON ගොනුව තෝරන්න (Choose File)
                  </p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    .json ගොනු පමණක් ඇතුළත් කරන්න
                  </span>
                </div>

                {importError && (
                  <div className="alert-box error mt-3">
                    <FiAlertTriangle /> <span>{importError}</span>
                  </div>
                )}

                {parsedBackup && (
                  <div className="parsed-backup-preview mt-3">
                    <div className="preview-header">
                      <FiFileText />
                      <strong>ගොනුවේ තොරතුරු:</strong>
                    </div>
                    <div className="preview-stats-grid">
                      <div className="stat-badge">
                        <span>මුළු ගොනු සංඛ්‍යාව:</span>
                        <strong>{parsedBackup.totalRecords} Records</strong>
                      </div>
                      {parsedBackup.exportedAt && (
                        <div className="stat-badge">
                          <span>Export කළ දිනය:</span>
                          <strong>{new Date(parsedBackup.exportedAt).toLocaleDateString()}</strong>
                        </div>
                      )}
                    </div>

                    <div className="preview-collections-list">
                      {Object.entries(parsedBackup.counts).map(([key, count]) => (
                        <span key={key} className="collection-chip">
                          {key}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {importProgress && (
                  <div className="db-progress-wrap mt-3">
                    <div className="db-progress-labels">
                      <span>{importProgress.collectionName} Restore වෙමින් පවතී...</span>
                      <span>{importProgress.percentage}%</span>
                    </div>
                    <div className="db-progress-bar">
                      <div className="db-progress-fill import-fill" style={{ width: `${importProgress.percentage}%` }}></div>
                    </div>
                  </div>
                )}

                {importSuccess && (
                  <div className="alert-box success mt-3">
                    <FiCheckCircle /> <span>{importSuccess}</span>
                  </div>
                )}
              </div>

              <div className="db-card-footer">
                <Button
                  variant="warning"
                  onClick={openImportModal}
                  disabled={!parsedBackup || importing}
                  icon={importing ? <FiRefreshCw className="spin" /> : <FiUploadCloud />}
                  fullWidth
                  style={{ padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  {importing ? 'දත්ත පිහිටුවමින් පවතී...' : '🔒 දත්ත නැවත පිහිටුවන්න (Restore Database)'}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 1. Export Password Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="🔒 Export Security Password"
      >
        <form onSubmit={handleConfirmExport} style={{ padding: '1rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.6rem' }}>
              <FiKey />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px' }}>
              Export මුරපදය ඇතුළත් කරන්න
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              දත්ත ගබඩාවේ සම්පූර්ණ Backup එකක් ලබාගැනීමට ආරක්ෂක මුරපදය ඇතුළත් කරන්න.
            </p>
          </div>

          <div className="form-group mb-4">
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
              Export Password
            </label>
            <input
              type="password"
              value={exportPassword}
              onChange={(e) => {
                setExportPassword(e.target.value);
                setExportPasswordError('');
              }}
              placeholder="Export Password එක ඇතුළත් කරන්න"
              className="search-input"
              style={{ width: '100%', fontSize: '1.1rem', letterSpacing: '2px', textAlign: 'center' }}
              autoFocus
              required
            />
          </div>

          {exportPasswordError && (
            <div className="alert-box error mb-4">
              <FiAlertTriangle /> <span>{exportPasswordError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowExportModal(false)}>
              අවලංගු කරන්න (Cancel)
            </Button>
            <Button type="submit" variant="primary" icon={<FiDownload />}>
              තහවුරු කර Export කරන්න
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Import Password & Confirmation Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="🔒 Import / Restore Security Password"
      >
        <form onSubmit={handleConfirmImport} style={{ padding: '1rem 0' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            color: '#ef4444',
            display: 'flex',
            gap: '12px',
            marginBottom: '1.25rem'
          }}>
            <FiAlertTriangle style={{ fontSize: '2rem', flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>
                අවධානය යොමු කරන්න!
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>
                මෙම Backup ගොනුවේ ඇති දත්ත <strong>({parsedBackup?.totalRecords} Records)</strong> පද්ධතියට Restore කර යාවත්කාලීන කරනු ලැබේ.
              </p>
            </div>
          </div>

          <div className="form-group mb-4">
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
              Import Security Password ඇතුළත් කරන්න
            </label>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => {
                setImportPassword(e.target.value);
                setImportPasswordError('');
              }}
              placeholder="Import Password එක ඇතුළත් කරන්න"
              className="search-input"
              style={{ width: '100%', fontSize: '1.1rem', letterSpacing: '2px', textAlign: 'center' }}
              autoFocus
              required
            />
          </div>

          {importPasswordError && (
            <div className="alert-box error mb-4">
              <FiAlertTriangle /> <span>{importPasswordError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowImportModal(false)}>
              අවලංගු කරන්න (Cancel)
            </Button>
            <Button type="submit" variant="danger" icon={<FiUploadCloud />}>
              තහවුරු කර Restore කරන්න
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
