import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { isToday, toDateObject, calibrateFromTimestamp, subscribeTimeSync, formatSriLankaTime } from '../../services/timeService';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { FiShoppingCart, FiPackage, FiUsers, FiTrendingUp, FiDollarSign, FiClock, FiAlertTriangle, FiPrinter, FiSearch } from 'react-icons/fi';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userData, isOwner, isCashier, isCustomer } = useAuth();

  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    totalItems: 0,
    totalUsers: 0,
    totalSales: 0,
    totalDebtors: 0,
    lowStockCount: 0,
  });
  const [recentTxns, setRecentTxns] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [lowStockSearch, setLowStockSearch] = useState('');
  const [lowStockCategory, setLowStockCategory] = useState('සියල්ල');
  const [lowStockSort, setLowStockSort] = useState('stock-asc');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const lowStockRef = useRef();

  const printLowStockReceipt = (filteredItems, threshold) => {
    // Get shop info from localStorage (same as Sales.jsx)
    let shopName = 'සුමින්ද ස්ටෝර්ස්';
    let shopPhone = '0777640334';
    let shopAddress = 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර';
    try {
      const saved = localStorage.getItem('smartpos_settings');
      if (saved) {
        const d = JSON.parse(saved);
        shopName = d.shopName || shopName;
        shopPhone = d.shopPhone || shopPhone;
        shopAddress = d.shopAddress || shopAddress;
      }
    } catch {}

    const dateStr = new Date().toLocaleString('en-LK');
    const rows = filteredItems.map((item, idx) => `
  <div class="row">
    <span class="row-num">${String(idx + 1).padStart(2, '0')}.</span>
    <span class="row-name">${item.name || ''}</span>
    <span class="row-stock ${item.stock === 0 ? 'zero' : 'low'}">${item.stock === 0 ? 'OUT' : item.stock}</span>
  </div>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Low Stock Bill</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #000;
      width: 78mm;
      padding: 4mm 3mm;
    }
    .center { text-align: center; }
    .shop-name { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .shop-sub { font-size: 10px; text-align: center; color: #333; }
    .divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .title { font-size: 12px; font-weight: bold; text-align: center; margin: 4px 0; letter-spacing: 1px; }
    .info { font-size: 10px; color: #333; margin-bottom: 3px; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      border-bottom: 1px dotted #ccc;
      gap: 4px;
    }
    .row-num { width: 20px; flex-shrink: 0; color: #555; }
    .row-name { flex: 1; word-break: break-word; }
    .row-stock {
      width: 30px;
      text-align: right;
      font-weight: bold;
      flex-shrink: 0;
    }
    .row-stock.zero { color: #d00; }
    .row-stock.low { color: #c60; }
    .footer { text-align: center; margin-top: 6px; font-size: 10px; color: #444; }
    @media print {
      body { width: 80mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="shop-name">${shopName}</div>
  <div class="shop-sub">${shopAddress}</div>
  <div class="shop-sub">${shopPhone}</div>
  <hr class="divider">
  <div class="title">⚠ LOW STOCK LIST</div>
  <div class="info">දිනය: ${dateStr}</div>
  <div class="info">Stock සීමාව: ≤ ${threshold} | Items: ${filteredItems.length}</div>
  <hr class="divider">
  <div style="display:flex;justify-content:space-between;padding:2px 0;font-weight:bold;font-size:10px;">
    <span style="width:20px;">No.</span>
    <span style="flex:1;">භාණ්ඩය</span>
    <span style="width:30px;text-align:right;">Stock</span>
  </div>
  <hr class="divider">
  ${rows}
  <hr class="divider">
  <div class="footer">Total: ${filteredItems.length} items | SmartPOS</div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=340,height=600');
    if (w) { w.document.write(html); w.document.close(); }
    else alert('Please allow popups for this site to print.');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch items count and low stock first to calculate profit
        let totalItems = 0;
        let lowStockCount = 0;
        const lowStockArr = [];
        const itemsMap = {};
        try {
          const itemSnapshot = await getDocs(collection(db, 'items'));
          totalItems = itemSnapshot.size;
          itemSnapshot.forEach(doc => {
            const data = doc.data();
            itemsMap[doc.id] = data;
            if (data.name) itemsMap[data.name] = data;
            // Store ALL items with stock <= max possible threshold (50) so user can filter dynamically
            if (data.stock <= 50) {
              lowStockCount++;
              lowStockArr.push({ id: doc.id, ...data });
            }
          });
          lowStockArr.sort((a, b) => a.stock - b.stock);
          setLowStockItems(lowStockArr);
        } catch (e) {
          console.warn("Could not fetch items:", e);
        }

        // Fetch transactions
        let todaySales = 0;
        let todayProfit = 0;
        let totalSales = 0;
        const txns = [];

        try {
          const txnSnapshot = await getDocs(collection(db, 'transactions'));
          txnSnapshot.forEach(doc => {
            const data = doc.data();
            const total = data.total || 0;
            totalSales += total;
            txns.push({ id: doc.id, ...data });

            if (data.timestamp?.seconds) {
              calibrateFromTimestamp(data.timestamp.seconds);
            }

            // Check if today (calibrated real time)
            if (isToday(data.timestamp || data.date)) {
              todaySales += total;
              
              // Calculate cost and profit for today's transactions
              let txnCost = 0;
              if (data.items) {
                data.items.forEach(item => {
                  const invItem = itemsMap[item.id] || itemsMap[item.name];
                  const unitCost = invItem ? (Number(invItem.purchasePrice) || 0) : 0;
                  txnCost += (Number(item.quantity) || 0) * unitCost;
                });
              }
              todayProfit += (total - txnCost);
            }
          });
        } catch (e) {
          console.warn("Could not fetch transactions:", e);
        }

        // Sort by timestamp descending
        txns.sort((a, b) => {
          const tB = toDateObject(b.timestamp || b.date)?.getTime() || 0;
          const tA = toDateObject(a.timestamp || a.date)?.getTime() || 0;
          return tB - tA;
        });
        setRecentTxns(txns.slice(0, 5));

        // Fetch users / debtors
        let totalUsers = 0;
        let totalDebtors = 0;
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          totalUsers = usersSnapshot.size;
        } catch (e) {
          console.warn("Could not fetch users:", e);
        }
        try {
          const debtorsSnapshot = await getDocs(collection(db, 'debtors'));
          totalDebtors = debtorsSnapshot.size;
        } catch (e) {
          console.warn("Could not fetch debtors:", e);
        }

        setStats({
          todaySales,
          todayProfit,
          totalItems,
          totalUsers,
          totalSales,
          totalDebtors,
          lowStockCount,
        });
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isOwner || isCashier) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }

    const unsubscribe = subscribeTimeSync(() => {
      if (isOwner || isCashier) {
        fetchDashboardData();
      }
    });

    return unsubscribe;
  }, [isOwner, isCashier]);

  const handleClearBillsOnly = async () => {
    if (!window.confirm("⚠️ ඔබට සියලුම බිල්පත් සහ විකුණුම් ගනුදෙනු පමණක් (Bills & Transactions only) මකා දැමීමට අවශ්‍යද?\n\nභාණ්ඩ ලැයිස්තුව (Inventory) හෝ ණයගැතියන් (Debtors) මකා නොදැමේ.")) return;
    const inputPass = prompt("කරුණාකර Master Password එක ඇතුළත් කරන්න:");
    if (inputPass !== "723412641") {
      alert("වැරදි මුරපදයක් (Incorrect password). ක්‍රියාවලිය අවලංගු විය.");
      return;
    }

    setLoading(true);
    try {
      const collectionsToClear = ['transactions', 'reloads', 'millingRecords', 'cashSessions'];
      let deletedCount = 0;

      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        for (const document of snap.docs) {
          await deleteDoc(doc(db, colName, document.id));
          deletedCount++;
        }
      }

      // Reset bill counter
      const counterRef = doc(db, 'counters', 'billNumber');
      await setDoc(counterRef, { current: 1 });

      alert(`බිල්පත් සහ ගනුදෙනු සියල්ල සාර්ථකව මකා දමන ලදී! (${deletedCount} records deleted). බිල් අංකය #000001 ලෙස Reset විය.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to clear bills: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearTestingData = async () => {
    if (!window.confirm("🚨 ARE YOU SURE YOU WANT TO DELETE ALL TESTING DATA?\nThis will completely wipe all inventory items, debtors, orders, and sales transactions permanently!")) return;
    const inputPass = prompt("Please enter the Master Password to confirm:");
    if (inputPass !== "723412641") {
      alert("Incorrect password. Operation cancelled.");
      return;
    }
    
    setLoading(true);
    try {
      const collectionsToClear = ['items', 'debtors', 'orders', 'transactions', 'reloads', 'millingRecords', 'cashSessions'];
      let deletedCount = 0;
      
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        for (const document of snap.docs) {
          await deleteDoc(doc(db, colName, document.id));
          deletedCount++;
        }
      }
      
      // Reset bill counter
      const counterRef = doc(db, 'counters', 'billNumber');
      await setDoc(counterRef, { current: 1 });
      
      alert(`All testing data cleared successfully! (${deletedCount} items deleted).`);
      window.location.reload();
    } catch(err) {
      console.error(err);
      alert("Failed to clear data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const ownerStats = [
    { icon: <FiShoppingCart />, label: t('dashboard.todaySales'), value: `Rs. ${stats.todaySales.toFixed(2)}`, color: 'purple' },
    { icon: <FiTrendingUp />, label: "Today's Profit", value: `Rs. ${stats.todayProfit.toFixed(2)}`, color: 'green' },
    { icon: <FiPackage />, label: t('dashboard.totalItems'), value: String(stats.totalItems), color: 'cyan' },
    { icon: <FiUsers />, label: t('dashboard.totalUsers'), value: String(stats.totalUsers), color: 'green' },
    { icon: <FiAlertTriangle />, label: t('reports.lowStock'), value: String(stats.lowStockCount), color: 'red', onClick: () => setIsLowStockModalOpen(true) },
  ];

  const cashierStats = [
    { icon: <FiShoppingCart />, label: t('dashboard.todaySales'), value: `Rs. ${stats.todaySales.toFixed(2)}`, color: 'purple' },
    { icon: <FiTrendingUp />, label: "Today's Profit", value: `Rs. ${stats.todayProfit.toFixed(2)}`, color: 'green' },
    { icon: <FiPackage />, label: t('dashboard.totalItems'), value: String(stats.totalItems), color: 'cyan' },
    { icon: <FiUsers />, label: t('dashboard.totalDebtors'), value: String(stats.totalDebtors), color: 'green' },
    { icon: <FiAlertTriangle />, label: t('reports.lowStock'), value: String(stats.lowStockCount), color: 'red', onClick: () => setIsLowStockModalOpen(true) },
  ];

  const displayStats = isOwner ? ownerStats : cashierStats;

  const formatTime = (timestamp) => {
    return formatSriLankaTime(timestamp);
  };

  return (
    <div className="dashboard-page fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          {t('dashboard.welcome', { name: userData?.name || 'User' })}
        </h1>
        <p className="dashboard-role-badge">{userData?.role ? t(`auth.${userData.role}`) : ''}</p>
      </div>

      {/* Stats Cards */}
      {(isOwner || isCashier) && (
        <div className="stats-grid">
          {displayStats.map((stat, i) => (
            <Card 
              key={i} 
              className={`stat-card stat-${stat.color}`}
              onClick={stat.onClick}
              style={{ cursor: stat.onClick ? 'pointer' : 'default' }}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <p className="stat-value">{loading ? '...' : stat.value}</p>
                <p className="stat-label">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2 className="section-heading">{t('dashboard.quickActions')}</h2>
        <div className="quick-actions-grid">
          {isCashier && (
            <>
              <div className="action-card glass-card" onClick={() => navigate('/sales')}>
                <span className="action-emoji">🛒</span>
                <span className="action-label">{t('sales.newSale')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/items')}>
                <span className="action-emoji">📦</span>
                <span className="action-label">{t('items.addItem')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/reports')}>
                <span className="action-emoji">📊</span>
                <span className="action-label">{t('sales.dailyReport')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/debtors')}>
                <span className="action-emoji">👤</span>
                <span className="action-label">{t('debtors.addDebtor')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/orders')}>
                <span className="action-emoji">🛍️</span>
                <span className="action-label">{t('nav.orders')}</span>
              </div>
            </>
          )}
          {isOwner && (
            <>
              <div className="action-card glass-card" onClick={() => navigate('/users')}>
                <span className="action-emoji">👥</span>
                <span className="action-label">{t('users.addUser')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/inventory')}>
                <span className="action-emoji">📦</span>
                <span className="action-label">{t('nav.inventory')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/reports')}>
                <span className="action-emoji">📈</span>
                <span className="action-label">{t('nav.reports')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/sales')}>
                <span className="action-emoji">🛒</span>
                <span className="action-label">{t('sales.newSale')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/orders')}>
                <span className="action-emoji">🛍️</span>
                <span className="action-label">{t('nav.orders')}</span>
              </div>
              <div className="action-card glass-card" style={{ borderColor: '#f59e0b' }} onClick={handleClearBillsOnly} title="බිල්පත් සහ විකුණුම් ගනුදෙනු පමණක් මකන්න">
                <span className="action-emoji">🧾</span>
                <span className="action-label" style={{ color: '#d97706', fontWeight: 700 }}>Clear Bills Only</span>
              </div>
              <div className="action-card glass-card" style={{ borderColor: 'var(--error-400)' }} onClick={handleClearTestingData} title="සියලුම දත්ත මකන්න">
                <span className="action-emoji">🚨</span>
                <span className="action-label text-error">Clear All Data</span>
              </div>
            </>
          )}
          {isCustomer && (
            <>
              <div className="action-card glass-card" onClick={() => navigate('/search')}>
                <span className="action-emoji">🔍</span>
                <span className="action-label">{t('nav.search')}</span>
              </div>
              <div className="action-card glass-card" onClick={() => navigate('/orders')}>
                <span className="action-emoji">🛍️</span>
                <span className="action-label">{t('nav.orders')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Sales View (Moved back to full width) */}
      {(isOwner || isCashier) && (
        <div className="dashboard-section">
          <h2 className="section-heading">{t('dashboard.recentSales')}</h2>
          <Card hover={false} className="recent-sales-card">
            {recentTxns.length > 0 ? (
              <div className="recent-txn-list">
                {recentTxns.map(txn => (
                  <div key={txn.id} className="recent-txn-item">
                    <div className="txn-icon-wrap">
                      <FiDollarSign />
                    </div>
                    <div className="txn-details">
                      <span className="txn-items-text">
                        {txn.items?.map(i => i.name).join(', ') || 'Transaction'}
                      </span>
                      <span className="txn-time">
                        <FiClock /> {formatTime(txn.timestamp)}
                      </span>
                    </div>
                    <div className="txn-amount-badge">
                      Rs. {Number(txn.total || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>{t('common.noData')}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Low Stock Modal */}
      <Modal
        isOpen={isLowStockModalOpen}
        onClose={() => { setIsLowStockModalOpen(false); setLowStockSearch(''); setLowStockCategory('සියල්ල'); }}
        title={<><FiAlertTriangle className="text-error" style={{ display: 'inline', marginRight: '8px' }} />{t('dashboard.lowStockItems')}</>}
      >
        {(() => {
          // Derive categories from items filtered by threshold
          const thresholdFiltered = lowStockItems.filter(i => i.stock <= lowStockThreshold);
          const categories = ['සියල්ල', ...Array.from(new Set(thresholdFiltered.map(i => i.category).filter(Boolean))).sort()];

          // Filter by category + search
          let filtered = thresholdFiltered.filter(item => {
            const matchCat = lowStockCategory === 'සියල්ල' || item.category === lowStockCategory;
            const s = lowStockSearch.trim().toLowerCase();
            const matchSearch = !s || item.name?.toLowerCase().includes(s) || item.category?.toLowerCase().includes(s);
            return matchCat && matchSearch;
          });

          // Sort
          if (lowStockSort === 'stock-asc') filtered = [...filtered].sort((a, b) => a.stock - b.stock);
          else if (lowStockSort === 'stock-desc') filtered = [...filtered].sort((a, b) => b.stock - a.stock);
          else if (lowStockSort === 'name') filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          else if (lowStockSort === 'category') filtered = [...filtered].sort((a, b) => (a.category || '').localeCompare(b.category || ''));

          return (
            <>
              <div className="low-stock-modal-header">
                {/* Top row: info + search + sort + print */}
                <div className="low-stock-top-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {filtered.length} / {lowStockItems.length} items
                    </h3>
                    {/* Threshold input */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px 10px' }}>
                      Stock ≤
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={lowStockThreshold}
                        onChange={e => setLowStockThreshold(Number(e.target.value) || 0)}
                        style={{ width: 42, background: 'transparent', border: 'none', outline: 'none', color: 'var(--primary-400)', fontWeight: 700, fontSize: 13, textAlign: 'center' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="low-stock-search-wrapper">
                      <FiSearch className="low-stock-search-icon" />
                      <input
                        className="low-stock-search-input"
                        type="text"
                        placeholder="භාණ්ඩය සොයන්න..."
                        value={lowStockSearch}
                        onChange={e => setLowStockSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="low-stock-sort-select"
                      value={lowStockSort}
                      onChange={e => setLowStockSort(e.target.value)}
                    >
                      <option value="stock-asc">Stock: අඩු → වැඩි</option>
                      <option value="stock-desc">Stock: වැඩි → අඩු</option>
                      <option value="name">නම (A-Z)</option>
                      <option value="category">කාණ්ඩය</option>
                    </select>
                    <button className="icon-btn-text" onClick={() => printLowStockReceipt(filtered, lowStockThreshold)}
                      title="80mm Printer ලෙස Print කරන්න">
                      <FiPrinter /> Print Bill
                    </button>
                  </div>
                </div>

                {/* Category pill filter bar - based on threshold-filtered items */}
                <div className="low-stock-category-bar">
                  {categories.map(cat => {
                    const count = cat === 'සියල්ල'
                      ? thresholdFiltered.length
                      : thresholdFiltered.filter(i => i.category === cat).length;
                    return (
                      <button
                        key={cat}
                        className={`category-pill${lowStockCategory === cat ? ' active' : ''}`}
                        onClick={() => setLowStockCategory(cat)}
                      >
                        {cat}
                        <span className="category-pill-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div ref={lowStockRef} className="print-container" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
                <style type="text/css" media="print">
                  {`
                    @page { size: auto; margin: 20mm; }
                    .print-header { display: block !important; margin-bottom: 20px; }
                    .print-header h2 { font-size: 24px; margin-bottom: 5px; color: #000; }
                    .print-header p { font-size: 14px; color: #666; }
                    .dashboard-table { width: 100%; border-collapse: collapse; }
                    .dashboard-table th, .dashboard-table td { border: 1px solid #ddd; padding: 12px; text-align: left; color: #000; }
                    .dashboard-table th { background-color: #f5f5f5; font-weight: bold; }
                    .stock-badge { color: #d32f2f; font-weight: bold; }
                  `}
                </style>
                <div className="print-header" style={{ display: 'none' }}>
                  <h2>{t('dashboard.lowStockItems')} Report</h2>
                  <p>Generated on {new Date().toLocaleString()}</p>
                </div>

                {filtered.length > 0 ? (
                  <div className="table-responsive">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th style={{ width: 55 }}>No.</th>
                          <th>{t('inventory.table.item')}</th>
                          <th>{t('inventory.table.category')}</th>
                          <th style={{ textAlign: 'right' }}>{t('inventory.table.stock')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(item => (
                          <tr key={item.id} style={item.stock === 0 ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                            <td className="font-bold text-secondary" style={{ fontSize: 13 }}>#{item.itemNo || '-'}</td>
                            <td className="font-medium">{item.name}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.category || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <span className={`stock-badge low-stock${item.stock === 0 ? ' sold-badge hot' : ''}`}>
                                {item.stock === 0 ? '🚫 0 ඉතිරි නෑ' : `${item.stock} ඉතිරිව ඇත`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <p>ගැළපෙන භාණ්ඩ නෑ</p>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
