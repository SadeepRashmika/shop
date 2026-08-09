import { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import {
  FiDollarSign, FiLogIn, FiLogOut, FiPlus,
  FiArrowUpCircle, FiArrowDownCircle, FiClock,
  FiTrendingUp, FiTrendingDown, FiCheckCircle, FiShoppingCart, FiFileText
} from 'react-icons/fi';
import './CashManager.css';

export default function CashManager() {
  const { t } = useTranslation();
  const { user, userData, isOwner } = useAuth();

  // Active session state
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  // Form fields
  const [startAmount, setStartAmount] = useState('');
  const [countedAmount, setCountedAmount] = useState('');
  const [entryType, setEntryType] = useState('in');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---- Real-time Firestore Listener ----
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'cashSessions'),
      orderBy('checkInTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(allSessions);

      // Find current user's open session, or any open session
      const currentUid = user?.uid || userData?.uid;
      const open = allSessions.find(
        s => s.status === 'open' && (s.cashierId === currentUid || isOwner)
      ) || allSessions.find(s => s.status === 'open');

      setActiveSession(open || null);
      setLoading(false);
    }, (err) => {
      console.error('Real-time cashSessions listener error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userData, isOwner]);

  // ---- Calculate Breakdown & Balance ----
  const getCashSales = (session) => {
    if (!session) return 0;
    return (session.entries || [])
      .filter(e => e.type === 'in' && e.isSale)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const getOtherCashIn = (session) => {
    if (!session) return 0;
    return (session.entries || [])
      .filter(e => e.type === 'in' && !e.isSale)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const getTotalIn = (session) => {
    if (!session) return 0;
    return (session.entries || [])
      .filter(e => e.type === 'in')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const getTotalOut = (session) => {
    if (!session) return 0;
    return (session.entries || [])
      .filter(e => e.type === 'out')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const calculateBalance = (session) => {
    if (!session) return 0;
    const start = Number(session.startAmount) || 0;
    return start + getTotalIn(session) - getTotalOut(session);
  };

  const getShiftDuration = (session) => {
    if (!session || !session.checkInTime) return '—';
    const start = session.checkInTime.toDate
      ? session.checkInTime.toDate()
      : new Date(session.checkInTime.seconds * 1000);
    const now = new Date();
    const diff = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // ---- Check In ----
  const handleCheckIn = async () => {
    const amount = parseFloat(startAmount);
    if (isNaN(amount) || amount < 0) return;

    try {
      const currentUid = user?.uid || userData?.uid;
      const sessionData = {
        cashierId: currentUid,
        cashierName: userData?.name || user?.email || 'Cashier',
        startAmount: amount,
        endAmount: null,
        expectedAmount: null,
        difference: null,
        status: 'open',
        checkInTime: serverTimestamp(),
        checkOutTime: null,
        entries: [],
      };
      await addDoc(collection(db, 'cashSessions'), sessionData);
      setShowCheckIn(false);
      setStartAmount('');
      showToast(t('cashManager.sessionStarted'));
    } catch (err) {
      console.error('Check-in error:', err);
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ---- Open Add/Take Cash Modal ----
  const handleOpenAddCash = () => {
    setEntryType('in');
    setEntryAmount('');
    setEntryNote('');
    setShowAddEntry(true);
  };

  const handleOpenTakeCash = () => {
    setEntryType('out');
    setEntryAmount('');
    setEntryNote('');
    setShowAddEntry(true);
  };

  // ---- Add Entry ----
  const handleAddEntry = async () => {
    const amount = parseFloat(entryAmount);
    if (!activeSession || isNaN(amount) || amount <= 0) return;

    try {
      const newEntry = {
        type: entryType,
        isSale: false,
        amount,
        note: entryNote.trim() || (entryType === 'in' ? 'Cash deposit' : 'Cash withdrawal'),
        time: new Date().toISOString(),
      };

      const updatedEntries = [...(activeSession.entries || []), newEntry];
      await updateDoc(doc(db, 'cashSessions', activeSession.id), {
        entries: updatedEntries,
      });

      setShowAddEntry(false);
      setEntryAmount('');
      setEntryNote('');
      setEntryType('in');
      showToast(t('cashManager.entryAdded'));
    } catch (err) {
      console.error('Add entry error:', err);
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ---- Check Out ----
  const handleCheckOut = async () => {
    const counted = parseFloat(countedAmount);
    if (!activeSession || isNaN(counted) || counted < 0) return;

    try {
      const expected = calculateBalance(activeSession);
      const diff = counted - expected;

      await updateDoc(doc(db, 'cashSessions', activeSession.id), {
        endAmount: counted,
        expectedAmount: expected,
        difference: diff,
        status: 'closed',
        checkOutTime: serverTimestamp(),
      });

      setShowCheckOut(false);
      setCountedAmount('');
      showToast(t('cashManager.sessionClosed'));
    } catch (err) {
      console.error('Check-out error:', err);
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ---- Formatting helpers ----
  const formatCurrency = (val) => `Rs. ${Number(val || 0).toFixed(2)}`;

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const currentBalance = calculateBalance(activeSession);
  const closedSessions = sessions.filter(s => s.status === 'closed');

  // Checkout expected calculation
  const checkoutExpected = activeSession ? calculateBalance(activeSession) : 0;
  const checkoutCounted = parseFloat(countedAmount) || 0;
  const checkoutDiff = checkoutCounted - checkoutExpected;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="cash-manager-page fade-in">
      {/* Header */}
      <div className="cm-header">
        <div className="cm-header-left">
          <h1 className="cm-title">{t('cashManager.title')}</h1>
          <p className="cm-subtitle">{t('cashManager.subtitle')}</p>
        </div>
        <div className="cm-header-actions">
          {!activeSession ? (
            <button
              className="cm-btn cm-btn-success"
              onClick={() => setShowCheckIn(true)}
              id="cm-check-in-btn"
            >
              <FiLogIn /> {t('cashManager.checkIn')}
            </button>
          ) : (
            <>
              <button
                className="cm-btn cm-btn-success"
                onClick={handleOpenAddCash}
                id="cm-add-cash-btn"
              >
                <FiArrowUpCircle /> {t('cashManager.addCash')}
              </button>
              <button
                className="cm-btn cm-btn-warning"
                onClick={handleOpenTakeCash}
                id="cm-take-cash-btn"
              >
                <FiArrowDownCircle /> {t('cashManager.takeCash')}
              </button>
              <button
                className="cm-btn cm-btn-danger"
                onClick={() => setShowCheckOut(true)}
                id="cm-check-out-btn"
              >
                <FiLogOut /> {t('cashManager.checkOut')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Balance Hero / No Session */}
      {!activeSession ? (
        <Card hover={false} className="no-session-state">
          <span className="no-session-icon">💰</span>
          <h2 className="no-session-title">{t('cashManager.noActiveSession')}</h2>
          <p className="no-session-desc">{t('cashManager.noActiveSessionDesc')}</p>
          <button
            className="cm-btn cm-btn-success"
            onClick={() => setShowCheckIn(true)}
            style={{ marginTop: '12px' }}
          >
            <FiLogIn /> {t('cashManager.checkIn')}
          </button>
        </Card>
      ) : (
        <>
          {/* Balance Card */}
          <div className="balance-hero">
            <p className="balance-label">{t('cashManager.currentBalance')}</p>
            <h2 className="balance-amount">{formatCurrency(currentBalance)}</h2>
            <div className="balance-session-info">
              <div className="balance-meta">
                <span className="balance-meta-label">{t('cashManager.startingAmount')}</span>
                <span className="balance-meta-value cyan">
                  {formatCurrency(activeSession.startAmount)}
                </span>
              </div>
              <div className="balance-meta">
                <span className="balance-meta-label">{t('cashManager.cashSales')}</span>
                <span className="balance-meta-value green">
                  +{formatCurrency(getCashSales(activeSession))}
                </span>
              </div>
              <div className="balance-meta">
                <span className="balance-meta-label">{t('cashManager.otherCashIn')}</span>
                <span className="balance-meta-value green">
                  +{formatCurrency(getOtherCashIn(activeSession))}
                </span>
              </div>
              <div className="balance-meta">
                <span className="balance-meta-label">{t('cashManager.totalCashOut')}</span>
                <span className="balance-meta-value red">
                  -{formatCurrency(getTotalOut(activeSession))}
                </span>
              </div>
              <div className="balance-meta">
                <span className="balance-meta-label">{t('cashManager.shiftDuration')}</span>
                <span className="balance-meta-value">{getShiftDuration(activeSession)}</span>
              </div>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="cm-stats-row">
            <Card hover={false} className="cm-stat-card">
              <div className="cm-stat-icon purple"><FiDollarSign /></div>
              <div className="cm-stat-info">
                <span className="cm-stat-value">{formatCurrency(activeSession.startAmount)}</span>
                <span className="cm-stat-label">{t('cashManager.startingAmount')}</span>
              </div>
            </Card>
            <Card hover={false} className="cm-stat-card">
              <div className="cm-stat-icon green"><FiShoppingCart /></div>
              <div className="cm-stat-info">
                <span className="cm-stat-value">{formatCurrency(getCashSales(activeSession))}</span>
                <span className="cm-stat-label">{t('cashManager.cashSales')}</span>
              </div>
            </Card>
            <Card hover={false} className="cm-stat-card">
              <div className="cm-stat-icon green"><FiTrendingUp /></div>
              <div className="cm-stat-info">
                <span className="cm-stat-value">{formatCurrency(getOtherCashIn(activeSession))}</span>
                <span className="cm-stat-label">{t('cashManager.otherCashIn')}</span>
              </div>
            </Card>
            <Card hover={false} className="cm-stat-card">
              <div className="cm-stat-icon red"><FiTrendingDown /></div>
              <div className="cm-stat-info">
                <span className="cm-stat-value">{formatCurrency(getTotalOut(activeSession))}</span>
                <span className="cm-stat-label">{t('cashManager.totalCashOut')}</span>
              </div>
            </Card>
          </div>

          {/* Cash Entries */}
          <div className="cm-entries-section">
            <h2 className="cm-section-heading">
              <FiDollarSign /> {t('cashManager.cashEntries')}
            </h2>
            <Card hover={false}>
              {(activeSession.entries || []).length > 0 ? (
                <div className="cm-entries-list">
                  {[...(activeSession.entries || [])].reverse().map((entry, idx) => (
                    <div key={idx} className="cm-entry-item">
                      <div className={`cm-entry-icon ${entry.type}`}>
                        {entry.isSale ? (
                          <FiShoppingCart style={{ color: 'var(--accent-400)' }} />
                        ) : entry.type === 'in' ? (
                          <FiArrowUpCircle />
                        ) : (
                          <FiArrowDownCircle />
                        )}
                      </div>
                      <div className="cm-entry-details">
                        <span className="cm-entry-note">{entry.note || '—'}</span>
                        <span className="cm-entry-time">
                          <FiClock /> {formatTime(entry.time)}
                        </span>
                      </div>
                      <span className={`cm-entry-type-badge ${entry.isSale ? 'in' : entry.type}`} style={entry.isSale ? { background: 'rgba(34, 211, 238, 0.15)', color: 'var(--accent-400)', borderColor: 'rgba(34, 211, 238, 0.3)' } : {}}>
                        {entry.isSale ? 'Sale Bill' : entry.type === 'in' ? t('cashManager.cashIn') : t('cashManager.cashOut')}
                      </span>
                      <span className={`cm-entry-amount ${entry.type}`}>
                        {entry.type === 'in' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  <p>{t('cashManager.noEntries')}</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Session History */}
      <div className="cm-history-section">
        <h2 className="cm-section-heading">
          <FiClock /> {t('cashManager.sessionHistory')}
        </h2>
        <Card hover={false}>
          {closedSessions.length > 0 ? (
            <div className="table-responsive">
              <table className="cm-history-table">
                <thead>
                  <tr>
                    <th>{t('cashManager.date')}</th>
                    <th>{t('cashManager.cashier')}</th>
                    <th>{t('cashManager.startingAmount')}</th>
                    <th>{t('cashManager.endingAmount')}</th>
                    <th>{t('cashManager.difference')}</th>
                    <th>{t('cashManager.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {closedSessions.map(s => {
                    const diff = s.difference || 0;
                    const diffType = diff > 0 ? 'surplus' : diff < 0 ? 'shortage' : 'exact';
                    return (
                      <tr key={s.id}>
                        <td>{formatDateTime(s.checkInTime)}</td>
                        <td style={{ fontWeight: 500 }}>{s.cashierName}</td>
                        <td>{formatCurrency(s.startAmount)}</td>
                        <td>{formatCurrency(s.endAmount)}</td>
                        <td>
                          <span className={`cm-diff-badge ${diffType}`}>
                            {diffType === 'surplus' && <FiTrendingUp />}
                            {diffType === 'shortage' && <FiTrendingDown />}
                            {diffType === 'exact' && <FiCheckCircle />}
                            {diff > 0 ? '+' : ''}{formatCurrency(Math.abs(diff))}
                          </span>
                        </td>
                        <td>
                          <span className={`cm-status-badge ${s.status}`}>
                            {t(`cashManager.${s.status}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <p>{t('cashManager.noHistory')}</p>
            </div>
          )}
        </Card>
      </div>

      {/* ======== MODALS ======== */}

      {/* Check-In Modal */}
      <Modal
        isOpen={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        title={<><FiLogIn style={{ display: 'inline', marginRight: 8 }} />{t('cashManager.checkInTitle')}</>}
      >
        <p className="cm-modal-desc">{t('cashManager.checkInDesc')}</p>
        <div className="cm-modal-form">
          <div className="form-group">
            <label className="input-label">{t('cashManager.startAmount')}</label>
            <input
              type="number"
              className="ui-input"
              value={startAmount}
              onChange={(e) => setStartAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
              id="cm-start-amount-input"
            />
          </div>
          <div className="modal-actions">
            <button
              className="cm-btn cm-btn-outline"
              onClick={() => setShowCheckIn(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              className="cm-btn cm-btn-success"
              onClick={handleCheckIn}
              disabled={!startAmount || parseFloat(startAmount) < 0}
              id="cm-start-session-btn"
            >
              <FiLogIn /> {t('cashManager.startSession')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Entry Modal */}
      <Modal
        isOpen={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        title={<><FiPlus style={{ display: 'inline', marginRight: 8 }} />{t('cashManager.addCashEntry')}</>}
      >
        <div className="cm-modal-form">
          <div className="form-group">
            <label className="input-label">{t('cashManager.cashIn')} / {t('cashManager.cashOut')}</label>
            <div className="cm-type-toggle">
              <button
                className={`cm-type-btn ${entryType === 'in' ? 'active-in' : ''}`}
                onClick={() => setEntryType('in')}
                type="button"
              >
                <FiArrowUpCircle /> {t('cashManager.cashIn')}
              </button>
              <button
                className={`cm-type-btn ${entryType === 'out' ? 'active-out' : ''}`}
                onClick={() => setEntryType('out')}
                type="button"
              >
                <FiArrowDownCircle /> {t('cashManager.cashOut')}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="input-label">{t('cashManager.amount')}</label>
            <input
              type="number"
              className="ui-input"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              autoFocus
              id="cm-entry-amount-input"
            />
          </div>
          <div className="form-group">
            <label className="input-label">{t('cashManager.note')}</label>
            <input
              type="text"
              className="ui-input"
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              placeholder={entryType === 'in' ? 'e.g. Cash deposit, Refund return...' : 'e.g. Expense, Change given...'}
              id="cm-entry-note-input"
            />
          </div>
          <div className="modal-actions">
            <button
              className="cm-btn cm-btn-outline"
              onClick={() => setShowAddEntry(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              className={`cm-btn ${entryType === 'in' ? 'cm-btn-success' : 'cm-btn-danger'}`}
              onClick={handleAddEntry}
              disabled={!entryAmount || parseFloat(entryAmount) <= 0}
              id="cm-submit-entry-btn"
            >
              {entryType === 'in' ? <FiArrowUpCircle /> : <FiArrowDownCircle />}
              {t('cashManager.addEntry')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Check-Out Modal */}
      <Modal
        isOpen={showCheckOut}
        onClose={() => setShowCheckOut(false)}
        title={<><FiLogOut style={{ display: 'inline', marginRight: 8 }} />{t('cashManager.checkOutTitle')}</>}
      >
        <p className="cm-modal-desc">{t('cashManager.checkOutDesc')}</p>
        <div className="cm-modal-form">
          <div className="cm-checkout-summary">
            <div className="cm-checkout-row">
              <span className="cm-checkout-row-label">{t('cashManager.startingAmount')}</span>
              <span className="cm-checkout-row-value">{formatCurrency(activeSession?.startAmount)}</span>
            </div>
            <div className="cm-checkout-row">
              <span className="cm-checkout-row-label">{t('cashManager.cashSales')}</span>
              <span className="cm-checkout-row-value" style={{ color: 'var(--success-400)' }}>
                +{formatCurrency(getCashSales(activeSession))}
              </span>
            </div>
            <div className="cm-checkout-row">
              <span className="cm-checkout-row-label">{t('cashManager.otherCashIn')}</span>
              <span className="cm-checkout-row-value" style={{ color: 'var(--success-400)' }}>
                +{formatCurrency(getOtherCashIn(activeSession))}
              </span>
            </div>
            <div className="cm-checkout-row">
              <span className="cm-checkout-row-label">{t('cashManager.totalCashOut')}</span>
              <span className="cm-checkout-row-value" style={{ color: 'var(--error-400)' }}>
                -{formatCurrency(getTotalOut(activeSession))}
              </span>
            </div>
            <div className="cm-checkout-divider" />
            <div className="cm-checkout-row">
              <span className="cm-checkout-row-label" style={{ fontWeight: 700 }}>
                {t('cashManager.expectedAmount')}
              </span>
              <span className="cm-checkout-row-value" style={{ fontSize: 'var(--fs-lg)' }}>
                {formatCurrency(checkoutExpected)}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">{t('cashManager.countedAmount')}</label>
            <input
              type="number"
              className="ui-input"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
              id="cm-counted-amount-input"
            />
          </div>

          {countedAmount && (
            <div className="cm-checkout-summary">
              <div className="cm-checkout-row">
                <span className="cm-checkout-row-label">{t('cashManager.difference')}</span>
                <span className={`cm-checkout-row-value ${
                  checkoutDiff > 0 ? 'surplus' : checkoutDiff < 0 ? 'shortage' : 'exact'
                }`}>
                  {checkoutDiff > 0 ? '+' : ''}{formatCurrency(checkoutDiff)}
                  {' '}
                  ({checkoutDiff > 0
                    ? t('cashManager.surplus')
                    : checkoutDiff < 0
                      ? t('cashManager.shortage')
                      : t('cashManager.exact')
                  })
                </span>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              className="cm-btn cm-btn-outline"
              onClick={() => setShowCheckOut(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              className="cm-btn cm-btn-danger"
              onClick={handleCheckOut}
              disabled={!countedAmount || parseFloat(countedAmount) < 0}
              id="cm-close-session-btn"
            >
              <FiLogOut /> {t('cashManager.closeSession')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className={`cm-toast ${toast.type}`} id="cm-toast">
          {toast.message}
        </div>
      )}
    </div>
  );
}
