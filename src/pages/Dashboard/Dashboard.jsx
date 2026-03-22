import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { useReactToPrint } from 'react-to-print';
import { FiShoppingCart, FiPackage, FiUsers, FiTrendingUp, FiDollarSign, FiClock, FiAlertTriangle, FiPrinter } from 'react-icons/fi';
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

  const lowStockRef = useRef();
  const handlePrintLowStock = useReactToPrint({
    content: () => lowStockRef.current,
    documentTitle: 'Low_Stock_Report',
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Today's timestamp
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTS = Timestamp.fromDate(today);

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
            
            if (data.stock <= 5) {
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

            // Check if today
            if (data.timestamp && data.timestamp.seconds >= todayTS.seconds) {
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
        txns.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
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
  }, [isOwner, isCashier]);

  const handleClearTestingData = async () => {
    if (!window.confirm("🚨 ARE YOU SURE YOU WANT TO DELETE ALL TESTING DATA?\nThis will completely wipe all inventory items, debtors, orders, and sales transactions permanently!")) return;
    if (prompt("Please enter the Master Password to confirm:") !== "72341264123") {
        alert("Incorrect password. Operation cancelled.");
        return;
    }
    
    setLoading(true);
    try {
      const collectionsToClear = ['items', 'debtors', 'orders', 'transactions'];
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
      
      alert(`Testing data cleared successfully! (${deletedCount} items deleted).`);
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
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
              <div className="action-card glass-card" style={{ borderColor: 'var(--error-400)' }} onClick={handleClearTestingData}>
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
        onClose={() => setIsLowStockModalOpen(false)}
        title={<><FiAlertTriangle className="text-error" style={{ display: 'inline', marginRight: '8px' }} />{t('dashboard.lowStockItems')}</>}
      >
        <div className="section-header-flex">
          <h3 style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {lowStockItems.length} exact match(es) for low stock (≤ 5)
          </h3>
          <button className="icon-btn-text" onClick={handlePrintLowStock}>
            <FiPrinter /> {t('dashboard.printPdf')}
          </button>
        </div>
        
        <div ref={lowStockRef} className="print-container" style={{ marginTop: 'var(--space-4)', maxHeight: '60vh', overflowY: 'auto' }}>
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
          {lowStockItems.length > 0 ? (
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>{t('inventory.table.item')}</th>
                    <th>{t('inventory.table.category')}</th>
                    <th>{t('inventory.table.stock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map(item => (
                    <tr key={item.id}>
                      <td className="font-bold text-secondary">#{item.itemNo || '-'}</td>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.category}</td>
                      <td>
                        <span className="stock-badge low-stock">
                          {item.stock} {t('inventory.table.inStock')}
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
              <p>{t('inventory.table.empty')}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
