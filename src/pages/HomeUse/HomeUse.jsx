import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import Card from '../../components/ui/Card';
import {
  FiHome, FiPlus, FiPrinter, FiSearch, FiShoppingBag,
  FiDollarSign, FiClock, FiUser, FiPackage, FiCalendar, FiTrendingUp, FiFilter, FiRefreshCw
} from 'react-icons/fi';
import './HomeUse.css';

// Dynamic Shop information helper
function getShopInfo() {
  try {
    const saved = localStorage.getItem('smartpos_settings');
    if (saved) {
      const data = JSON.parse(saved);
      return {
        name: data.shopName || 'සුමින්ද ස්ටෝර්ස්',
        phone: data.shopPhone || '0777640334',
        address: data.shopAddress || 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර',
        email: data.shopEmail || 'sumindapradeep1111@gmail.com'
      };
    }
  } catch {}
  return {
    name: 'සුමින්ද ස්ටෝර්ස්',
    phone: '0777640334',
    address: 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර',
    email: 'sumindapradeep1111@gmail.com'
  };
}

export default function HomeUse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userData, isOwner } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Date & Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [dateMode, setDateMode] = useState('day'); // 'day', 'month', 'all'

  useEffect(() => {
    fetchHomeUseRecords();
  }, []);

  const fetchHomeUseRecords = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'transactions'));
      const homeTxns = [];

      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.paymentMethod === 'home_use') {
          homeTxns.push({ id: docSnap.id, ...data });
        }
      });

      // Sort descending by timestamp
      homeTxns.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.date || 0).getTime());
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.date || 0).getTime());
        return timeB - timeA;
      });

      setRecords(homeTxns);
    } catch (err) {
      console.error('Error fetching home use records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on Date Mode, Selected Date, and Search Query
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const tsDate = r.timestamp?.toDate 
        ? r.timestamp.toDate() 
        : (r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : new Date(r.date || Date.now()));
      
      const recDateStr = tsDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const recMonthStr = recDateStr.substring(0, 7); // YYYY-MM

      if (dateMode === 'day' && recDateStr !== selectedDate) return false;
      if (dateMode === 'month' && recMonthStr !== selectedDate.substring(0, 7)) return false;

      // Search query filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const billStr = r.billNumber ? String(r.billNumber) : '';
        const cashierStr = (r.cashierName || '').toLowerCase();
        const itemsStr = (r.items || []).map(i => (i.name || '').toLowerCase()).join(' ');
        return billStr.includes(q) || cashierStr.includes(q) || itemsStr.includes(q);
      }

      return true;
    });
  }, [records, selectedDate, dateMode, search]);

  // Dynamic Statistics based on All Records & Filtered Records
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);

    let todayTotal = 0;
    let thisMonthTotal = 0;
    let allTimeTotal = 0;
    let allTimeItems = 0;

    records.forEach(r => {
      const tot = Number(r.total) || 0;
      allTimeTotal += tot;

      const tsDate = r.timestamp?.toDate 
        ? r.timestamp.toDate() 
        : (r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : new Date(r.date || Date.now()));
      const dStr = tsDate.toISOString().split('T')[0];

      if (dStr === todayStr) todayTotal += tot;
      if (dStr.startsWith(thisMonthStr)) thisMonthTotal += tot;

      if (r.items) {
        r.items.forEach(i => {
          allTimeItems += Number(i.quantity) || 0;
        });
      }
    });

    // Filtered Period Stats
    let filteredTotal = 0;
    let filteredItemsCount = 0;
    filteredRecords.forEach(r => {
      filteredTotal += Number(r.total) || 0;
      if (r.items) {
        r.items.forEach(i => {
          filteredItemsCount += Number(i.quantity) || 0;
        });
      }
    });

    return {
      todayTotal,
      thisMonthTotal,
      allTimeTotal,
      allTimeItems,
      filteredTotal,
      filteredItemsCount,
      filteredCount: filteredRecords.length
    };
  }, [records, filteredRecords]);

  // Quick Date Selectors
  const handleSetQuickDate = (mode, offsetDays = 0) => {
    setDateMode(mode);
    if (mode === 'all') return;

    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatCurrency = (val) => `Rs. ${Number(val || 0).toFixed(2)}`;

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return date.toLocaleString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleStartHomeUseSale = () => {
    navigate('/sales', { state: { setPaymentMethod: 'home_use' } });
  };

  // Robust PDF / Print Report Generator
  const handlePrintReport = () => {
    const shopInfo = getShopInfo();
    const periodTitle = dateMode === 'day' 
      ? `දිනය: ${selectedDate}` 
      : dateMode === 'month' 
      ? `මාසය: ${selectedDate.substring(0, 7)}` 
      : 'සියලුම කාලපරිච්ඡේදය (All Time)';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>නිවසට ගත් භාණ්ඩ වාර්තාව - ${periodTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Sinhala', 'Segoe UI', Arial, sans-serif; padding: 15mm 20mm; color: #000; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .shop-name { font-size: 24px; font-weight: 900; -webkit-text-stroke: 0.6px #000; color: #000; margin-bottom: 4px; }
    .shop-info { font-size: 13px; font-weight: 700; color: #333; }
    .report-title { font-size: 19px; font-weight: 800; margin-top: 10px; color: #000; }
    .report-meta { font-size: 13px; font-weight: 700; margin-top: 4px; color: #555; }
    
    .stats-row { display: flex; justify-content: space-around; background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
    .stat-box { text-align: center; }
    .stat-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .stat-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #0f172a; color: #fff; font-weight: 800; font-size: 12px; }
    .text-right { text-align: right; }
    .item-tag { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 6px; border-radius: 4px; margin: 2px; font-size: 11px; font-weight: 600; }
    .footer { margin-top: 25px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
    @media print {
      body { padding: 10mm; }
      @page { size: auto; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${shopInfo.name}</div>
    <div class="shop-info">${shopInfo.address} | Tel: ${shopInfo.phone}</div>
    <div class="report-title">🏡 නිවසට ගත් භාණ්ඩ වාර්තාව (Home Use Items Report)</div>
    <div class="report-meta">${periodTitle} • බිල්පත් ${filteredRecords.length} ක් • මුද්‍රණය කළ දිනය: ${new Date().toLocaleString('en-LK')}</div>
  </div>

  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-lbl">තෝරාගත් කාලයේ මුළු එකතුව (Total Value)</div>
      <div class="stat-val" style="color:#10b981;">Rs. ${stats.filteredTotal.toFixed(2)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-lbl">මුළු භාණ්ඩ ප්‍රමාණය (Items Qty)</div>
      <div class="stat-val">${stats.filteredItemsCount}</div>
    </div>
    <div class="stat-box">
      <div class="stat-lbl">බිල්පත් ගණන (Bills Count)</div>
      <div class="stat-val">${stats.filteredCount}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>දිනය සහ වේලාව</th>
        <th>බිල්පත් අංකය</th>
        <th>ලබාගත් භාණ්ඩ (Items)</th>
        <th class="text-right">මුළු වටිනාකම (Rs.)</th>
        <th>සටහන් කළේ</th>
      </tr>
    </thead>
    <tbody>
      ${filteredRecords.map(r => {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp?.seconds ? r.timestamp.seconds * 1000 : r.date || Date.now());
        const dateStr = d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
        return `
          <tr>
            <td style="white-space:nowrap;">${dateStr}<br/><small style="color:#64748b;">${timeStr}</small></td>
            <td style="font-weight:800; color:#3b82f6;">#${r.billNumber ? String(r.billNumber).padStart(6, '0') : '-'}</td>
            <td>
              ${(r.items || []).map(i => `<span class="item-tag">${i.name} <strong>x${i.quantity}</strong> (Rs. ${Number(i.sellPrice || 0).toFixed(2)})</span>`).join('')}
            </td>
            <td class="text-right" style="font-weight:800; color:#10b981;">Rs. ${Number(r.total || 0).toFixed(2)}</td>
            <td>${r.cashierName || 'Cashier'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    SmartPOS System • Generated by ${userData?.name || 'Owner'}
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
    `;

    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    } else {
      alert("කරුණාකර Popup windows වලට අවසර ලබා දෙන්න (Please allow popups to download PDF).");
    }
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
            onClick={handlePrintReport}
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

      {/* Date Filter & Range Selector Bar */}
      <div className="milling-controls glass-card mb-6" style={{ padding: '12px 16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="quick-date-group" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`filter-btn ${dateMode === 'day' && selectedDate === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
            onClick={() => handleSetQuickDate('day', 0)}
          >
            📅 අද (Today)
          </button>
          <button
            className={`filter-btn ${dateMode === 'day' && selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'active' : ''}`}
            onClick={() => handleSetQuickDate('day', 1)}
          >
            ⏪ ඊයේ (Yesterday)
          </button>
          <button
            className={`filter-btn ${dateMode === 'month' ? 'active' : ''}`}
            onClick={() => handleSetQuickDate('month')}
          >
            📆 මාසිකව (Monthly)
          </button>
          <button
            className={`filter-btn ${dateMode === 'all' ? 'active' : ''}`}
            onClick={() => handleSetQuickDate('all')}
          >
            ♾️ සියලුම දින (All Time)
          </button>
        </div>

        <div className="date-picker-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {dateMode === 'month' ? (
            <input
              type="month"
              value={selectedDate.substring(0, 7)}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(`${e.target.value}-01`);
                  setDateMode('month');
                }
              }}
              className="custom-date-input glass"
              style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontWeight: 600 }}
            />
          ) : (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setDateMode('day');
                }
              }}
              className="custom-date-input glass"
              style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontWeight: 600 }}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="hu-stats-grid">
        <Card hover={false} className="hu-stat-card">
          <div className="hu-stat-icon cyan"><FiHome /></div>
          <div className="hu-stat-info">
            <span className="hu-stat-value">{formatCurrency(dateMode === 'day' ? stats.filteredTotal : stats.todayTotal)}</span>
            <span className="hu-stat-label">{dateMode === 'day' ? 'තෝරාගත් දින මුදල' : t('homeUse.todayTotal')}</span>
          </div>
        </Card>
        <Card hover={false} className="hu-stat-card">
          <div className="hu-stat-icon purple"><FiCalendar /></div>
          <div className="hu-stat-info">
            <span className="hu-stat-value">{formatCurrency(dateMode === 'month' ? stats.filteredTotal : stats.thisMonthTotal)}</span>
            <span className="hu-stat-label">{dateMode === 'month' ? 'තෝරාගත් මාසයේ මුදල' : t('homeUse.monthTotal')}</span>
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
            <span className="hu-stat-value">{stats.filteredItemsCount} ({stats.filteredCount})</span>
            <span className="hu-stat-label">තෝරාගත් භාණ්ඩ (බිල්පත්)</span>
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
                placeholder="බිල්පත් අංකය, භාණ්ඩ නම හෝ සටහන් කළ අය සොයන්න..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                id="hu-search-input"
              />
            </div>
          </div>
          <button 
            onClick={fetchHomeUseRecords}
            className="hu-btn hu-btn-outline" 
            style={{ padding: '8px 14px' }}
            title="Refresh Data"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        <Card hover={false}>
          <div className="hu-table-container">
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
                <p>තෝරාගත් කාලපරිච්ඡේදය සඳහා නිවසට ගත් භාණ්ඩ සටහන් වී නොමැත.</p>
                {(dateMode !== 'all' || search) && (
                  <button 
                    className="hu-btn hu-btn-outline mt-3"
                    onClick={() => { setDateMode('all'); setSearch(''); }}
                  >
                    සියලුම දින පෙන්වන්න (Show All Time)
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
