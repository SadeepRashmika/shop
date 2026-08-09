import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import Card from '../../components/ui/Card';
import { useReactToPrint } from 'react-to-print';
import {
  FiHome, FiPlus, FiPrinter, FiSearch, FiShoppingBag,
  FiDollarSign, FiClock, FiUser, FiPackage, FiCalendar, FiTrendingUp
} from 'react-icons/fi';
import './HomeUse.css';

export default function HomeUse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userData, isOwner } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    todayTotal: 0,
    monthTotal: 0,
    allTimeTotal: 0,
    totalRecords: 0,
    totalItemsCount: 0,
  });

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Home_Use_Items_Report',
  });

  useEffect(() => {
    fetchHomeUseRecords();
  }, []);

  const fetchHomeUseRecords = async () => {
    setLoading(true);
    try {
      // Query transactions with paymentMethod == 'home_use'
      const snap = await getDocs(collection(db, 'transactions'));
      const homeTxns = [];
      let todayTotal = 0;
      let monthTotal = 0;
      let allTimeTotal = 0;
      let totalItemsCount = 0;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      snap.forEach(doc => {
        const data = doc.data();
        if (data.paymentMethod === 'home_use') {
          const txn = { id: doc.id, ...data };
          homeTxns.push(txn);

          const total = Number(data.total) || 0;
          allTimeTotal += total;

          const tsDate = data.timestamp?.toDate
            ? data.timestamp.toDate()
            : data.timestamp?.seconds
              ? new Date(data.timestamp.seconds * 1000)
              : new Date();
          const tsTime = tsDate.getTime();

          if (tsTime >= todayStart) {
            todayTotal += total;
          }
          if (tsTime >= monthStart) {
            monthTotal += total;
          }

          if (data.items) {
            data.items.forEach(i => {
              totalItemsCount += Number(i.quantity) || 0;
            });
          }
        }
      });

      // Sort descending by timestamp
      homeTxns.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });

      setRecords(homeTxns);
      setStats({
        todayTotal,
        monthTotal,
        allTimeTotal,
        totalRecords: homeTxns.length,
        totalItemsCount,
      });
    } catch (err) {
      console.error('Error fetching home use records:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = search
    ? records.filter(r => {
        const q = search.toLowerCase();
        const billStr = r.billNumber ? String(r.billNumber) : '';
        const cashierStr = (r.cashierName || '').toLowerCase();
        const itemsStr = (r.items || []).map(i => i.name.toLowerCase()).join(' ');
        return billStr.includes(q) || cashierStr.includes(q) || itemsStr.includes(q);
      })
    : records;

  const formatCurrency = (val) => `Rs. ${Number(val || 0).toFixed(2)}`;

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleStartHomeUseSale = () => {
    navigate('/sales', { state: { setPaymentMethod: 'home_use' } });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="home-use-page fade-in">
      {/* Header */}
      <div className="hu-header">
        <div className="hu-header-left">
          <h1 className="hu-title">
            <FiHome style={{ color: 'var(--accent-400)' }} />
            {t('homeUse.title')}
          </h1>
          <p className="hu-subtitle">{t('homeUse.subtitle')}</p>
        </div>
        <div className="hu-header-actions">
          <button
            className="hu-btn hu-btn-outline"
            onClick={handlePrint}
            id="hu-print-btn"
          >
            <FiPrinter /> {t('homeUse.printReport')}
          </button>
          <button
            className="hu-btn hu-btn-primary"
            onClick={handleStartHomeUseSale}
            id="hu-new-sale-btn"
          >
            <FiPlus /> {t('homeUse.newHomeUseSale')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="hu-stats-grid">
        <Card hover={false} className="hu-stat-card">
          <div className="hu-stat-icon cyan"><FiHome /></div>
          <div className="hu-stat-info">
            <span className="hu-stat-value">{formatCurrency(stats.todayTotal)}</span>
            <span className="hu-stat-label">{t('homeUse.todayTotal')}</span>
          </div>
        </Card>
        <Card hover={false} className="hu-stat-card">
          <div className="hu-stat-icon purple"><FiCalendar /></div>
          <div className="hu-stat-info">
            <span className="hu-stat-value">{formatCurrency(stats.monthTotal)}</span>
            <span className="hu-stat-label">{t('homeUse.monthTotal')}</span>
          </div>
        </Card>
        <Card hover={false} className="hu-stat-card">
          <div className="hu-stat-icon green"><FiTrendingUp /></div>
          <div className="hu-stat-info">
            <span className="hu-stat-value" style={{ color: 'var(--success-400)' }}>
              {formatCurrency(stats.allTimeTotal)}
            </span>
            <span className="hu-stat-label">{t('homeUse.allTimeTotal')}</span>
          </div>
        </Card>
        <Card hover={false} className="hu-stat-card">
          <div className="hu-stat-icon orange"><FiPackage /></div>
          <div className="hu-stat-info">
            <span className="hu-stat-value">{stats.totalItemsCount} ({stats.totalRecords})</span>
            <span className="hu-stat-label">{t('homeUse.totalItemsTaken')}</span>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <div className="hu-history-section">
        <div className="hu-filter-bar">
          <div className="hu-search-wrap">
            <div className="search-box glass" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder={t('homeUse.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                id="hu-search-input"
              />
            </div>
          </div>
        </div>

        <Card hover={false}>
          <div ref={printRef} className="hu-table-container">
            <style type="text/css" media="print">
              {`
                @page { size: auto; margin: 20mm; }
                .print-header { display: block !important; margin-bottom: 20px; }
                .print-header h2 { font-size: 22px; color: #000; }
                .print-header p { font-size: 13px; color: #666; }
                .hu-table { width: 100%; border-collapse: collapse; }
                .hu-table th, .hu-table td { border: 1px solid #ddd; padding: 10px; text-align: left; color: #000; }
                .hu-table th { background-color: #f5f5f5; font-weight: bold; }
              `}
            </style>
            <div className="print-header" style={{ display: 'none' }}>
              <h2>{t('homeUse.title')}</h2>
              <p>Printed on {new Date().toLocaleString()}</p>
            </div>

            {filteredRecords.length > 0 ? (
              <table className="hu-table">
                <thead>
                  <tr>
                    <th>{t('homeUse.date')}</th>
                    <th>{t('homeUse.billNo')}</th>
                    <th>{t('homeUse.items')}</th>
                    <th>{t('homeUse.totalValue')}</th>
                    <th>{t('homeUse.recordedBy')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.timestamp)}</td>
                      <td>
                        <span className="hu-bill-badge">
                          #{r.billNumber ? String(r.billNumber).padStart(6, '0') : '—'}
                        </span>
                      </td>
                      <td>
                        <div className="hu-items-list">
                          {r.items?.map((item, idx) => (
                            <span key={idx} className="hu-item-tag">
                              <span>{item.name}</span>
                              <span className="hu-item-qty">x{item.quantity}</span>
                              <span style={{ opacity: 0.7 }}>(Rs. {item.sellPrice})</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="hu-value-badge">
                          {formatCurrency(r.total)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <FiUser style={{ opacity: 0.6 }} /> {r.cashierName || 'Cashier'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🏡</span>
                <p>{t('homeUse.noRecords')}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
