import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { 
  getNow, 
  getTodayStart, 
  getTodayEnd, 
  getMonthStart, 
  getMonthEnd, 
  getTodayDateString, 
  getCurrentMonthString, 
  getCurrentYearString, 
  isToday, 
  isThisMonth, 
  isThisYear, 
  toDateObject, 
  calibrateFromTimestamp,
  subscribeTimeSync
} from '../../services/timeService';
import Button from '../../components/ui/Button';
import { 
  FiBarChart2, FiDollarSign, FiShoppingBag, FiTrendingUp, 
  FiActivity, FiArrowUpRight, FiArrowDownRight, FiDownload, FiPrinter, FiCalendar, FiSearch
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import './Reports.css';

export default function Reports() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    todayTxns: 0,
    totalItems: 0,
    lowStock: 0,
    monthSales: 0,
    monthProfit: 0,
    monthTxns: 0
  });
  const [recentTxns, setRecentTxns] = useState([]);
  const [allTxns, setAllTxns] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [dailyChartData, setDailyChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState({});
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'daily', 'monthly', 'yearly', 'item'
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedItemForChart, setSelectedItemForChart] = useState(null);
  const [itemChartData, setItemChartData] = useState([]);
  const [expandedTxnId, setExpandedTxnId] = useState(null);

  // Date selection states (calibrated to real synchronized network time)
  const [selectedDailyDate, setSelectedDailyDate] = useState(getTodayDateString());
  const [selectedMonthDate, setSelectedMonthDate] = useState(getCurrentMonthString());
  const [selectedYear, setSelectedYear] = useState(getCurrentYearString());

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // Fetch Inventory Stats FIRST to calculate profit accurately
        const itemSnapshot = await getDocs(collection(db, 'items'));
        let totalItems = 0;
        let lowStockCount = 0;
        const invMap = {};
        itemSnapshot.forEach(doc => {
          totalItems++;
          const data = doc.data();
          if (data.stock <= 5) lowStockCount++;
          invMap[doc.id] = data;
          if (data.name) invMap[data.name] = data;
        });
        setInventoryItems(invMap);

        // Fetch ALL Transactions
        const txnSnapshot = await getDocs(collection(db, 'transactions'));
        
        let todaySales = 0;
        let todayCount = 0;
        let monthSales = 0;
        let monthCount = 0;
        let todayProfit = 0;
        let monthProfit = 0;
        const itemFreq = {};
        const transactions = [];
        const dailySalesMap = {};

        txnSnapshot.forEach(doc => {
          const data = doc.data();
          const total = data.total || 0;
          
          if (data.timestamp?.seconds) {
            calibrateFromTimestamp(data.timestamp.seconds);
          }

          // Calculate Profit for this transaction
          let txnCost = 0;
          if (data.items) {
            data.items.forEach(item => {
              const invItem = invMap[item.id] || invMap[item.name];
              const unitCost = invItem ? (Number(invItem.purchasePrice) || 0) : 0;
              txnCost += (Number(item.quantity) || 0) * unitCost;
            });
          }
          const profit = total - txnCost;
          const txnData = { id: doc.id, profit: profit, ...data };
          transactions.push(txnData);
          
          const txnDate = toDateObject(data.timestamp || data.date);

          // Today's sales (calibrated real time check)
          if (isToday(data.timestamp || data.date)) {
            todaySales += total;
            todayProfit += profit;
            todayCount++;
          }

          // This month's sales (calibrated real time check)
          if (isThisMonth(data.timestamp || data.date)) {
            monthSales += total;
            monthProfit += profit;
            monthCount++;
          }

          // Count items for top selling
          data.items?.forEach(item => {
             itemFreq[item.name] = (itemFreq[item.name] || 0) + item.quantity;
          });

          // Daily sales chart (last 7 days)
          if (txnDate) {
            const dayKey = txnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailySalesMap[dayKey] = (dailySalesMap[dayKey] || 0) + total;
          }
        });

        // Format chart data
        const sortedItems = Object.entries(itemFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }));
        setChartData(sortedItems);

        // Daily sales chart data (last 7 days based on synced real time)
        const last7Days = [];
        const now = getNow();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          last7Days.push({ name: key, sales: dailySalesMap[key] || 0 });
        }
        setDailyChartData(last7Days);

        // Sort transactions
        transactions.sort((a, b) => {
          const tB = toDateObject(b.timestamp || b.date)?.getTime() || 0;
          const tA = toDateObject(a.timestamp || a.date)?.getTime() || 0;
          return tB - tA;
        });
        setAllTxns(transactions);
        setRecentTxns(transactions.slice(0, 10));

        setStats({
          todaySales,
          todayProfit,
          todayTxns: todayCount,
          totalItems,
          lowStock: lowStockCount,
          monthSales,
          monthProfit,
          monthTxns: monthCount
        });

      } catch (err) {
        console.error("Report fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ---- Excel/Download Helpers ----
  const generateExcel = (transactions, title) => {
    const headers = ['Bill No.', 'Transaction ID', 'Date', 'Items', 'Payment Method', 'Total (Rs.)', 'Profit (Rs.)'];
    
    let totalAmount = 0;
    let totalProfit = 0;

    const rows = transactions.map(txn => {
      let txnCost = 0;
      let txnTotal = Number(txn.total) || 0;

      if (txn.items) {
        txn.items.forEach(item => {
          const invItem = inventoryItems[item.id] || inventoryItems[item.name];
          const unitCost = invItem ? (Number(invItem.purchasePrice) || 0) : 0;
          txnCost += (Number(item.quantity) || 0) * unitCost;
        });
      }
      let txnProfit = txnTotal - txnCost;
      
      totalAmount += txnTotal;
      totalProfit += txnProfit;

      return [
        txn.billNumber ? String(txn.billNumber).padStart(6, '0') : 'N/A',
        txn.id,
        formatDate(txn.timestamp),
        txn.items?.map(i => `${i.name} x${i.quantity}`).join('; ') || '',
        txn.paymentMethod || 'cash',
        txnTotal.toFixed(2),
        txnProfit.toFixed(2)
      ];
    });

    rows.push(['', '', '', '', 'TOTAL', totalAmount.toFixed(2), totalProfit.toFixed(2)]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Item Sell Details Summary
    const itemMap = {};
    transactions.forEach(txn => {
      if (txn.items) {
        txn.items.forEach(item => {
          const key = item.id || item.name;
          if (!itemMap[key]) {
            itemMap[key] = { 
              name: item.name, 
              itemNo: item.itemNo, 
              quantity: 0, 
              revenue: 0, 
              cost: 0 
            };
          }
          itemMap[key].quantity += Number(item.quantity) || 0;
          let itemSubtotal = Number(item.subtotal) || ((Number(item.quantity) || 0) * (Number(item.sellPrice) || 0));
          itemMap[key].revenue += itemSubtotal;
          
          const invItem = inventoryItems[item.id] || inventoryItems[item.name];
          const unitCost = invItem ? (Number(invItem.purchasePrice) || 0) : 0;
          itemMap[key].cost += (Number(item.quantity) || 0) * unitCost;

          if (!itemMap[key].itemNo && invItem && invItem.itemNo) {
            itemMap[key].itemNo = invItem.itemNo;
          }
        });
      }
    });

    const itemHeaders = ['Item No.', 'Item Name', 'Quantity Sold', 'Get Price (Cost) Rs.', 'Total Sales (Rs.)', 'Profit (Rs.)'];
    const itemRows = Object.keys(itemMap).map(key => {
      const data = itemMap[key];
      const profit = data.revenue - data.cost;
      return [
        data.itemNo || '-',
        data.name,
        data.quantity,
        data.cost.toFixed(2),
        data.revenue.toFixed(2),
        profit.toFixed(2)
      ];
    });
    
    itemRows.sort((a, b) => b[2] - a[2]);
    
    const totalQty = Object.values(itemMap).reduce((sum, i) => sum + i.quantity, 0);
    const totalRev = Object.values(itemMap).reduce((sum, i) => sum + i.revenue, 0);
    const totalCost = Object.values(itemMap).reduce((sum, i) => sum + i.cost, 0);
    const totalItemProfit = totalRev - totalCost;
    itemRows.push(['', 'TOTAL', totalQty, totalCost.toFixed(2), totalRev.toFixed(2), totalItemProfit.toFixed(2)]);

    const itemWorksheet = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.utils.book_append_sheet(workbook, itemWorksheet, "Item Sell Details");
    
    XLSX.writeFile(workbook, `${title}_${getTodayDateString()}.xlsx`);
  };

  const downloadDailyReport = () => {
    const todayTxns = allTxns.filter(txn => isToday(txn.timestamp || txn.date));
    generateExcel(todayTxns, `Daily_Sales_Report_${getTodayDateString()}`);
  };

  const downloadMonthlyReport = () => {
    const monthTxns = allTxns.filter(txn => isThisMonth(txn.timestamp || txn.date));
    generateExcel(monthTxns, `Monthly_Sales_Report_${getCurrentMonthString()}`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleSelectItemGraph = (itemName) => {
    setItemSearchQuery(''); // clear query
    setSelectedItemForChart(itemName);
    
    // Generate data array for last 30 days based on synced real time
    const dailyMap = {};
    const now = getNow();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[key] = 0;
    }

    allTxns.forEach(txn => {
      const txnDate = toDateObject(txn.timestamp || txn.date);
      if (txnDate && txn.items) {
        const itemInTxn = txn.items.find(i => i.name === itemName);
        if (itemInTxn) {
          const key = txnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dailyMap[key] !== undefined) {
             dailyMap[key] += Number(itemInTxn.quantity);
          }
        }
      }
    });

    const dataArr = Object.entries(dailyMap).map(([date, qty]) => ({ date, qty }));
    setItemChartData(dataArr);
  };

  // Calculations for specific selected date in Daily tab
  const filteredDailyTxns = allTxns.filter(txn => {
    const d = toDateObject(txn.timestamp || txn.date);
    if (!d) return false;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    return dateStr === selectedDailyDate;
  });
  const dailyTotalSales = filteredDailyTxns.reduce((acc, t) => acc + (t.total || 0), 0);
  const dailyTotalProfit = filteredDailyTxns.reduce((acc, t) => acc + (t.profit || 0), 0);

  // Calculations for specific selected month in Monthly tab
  const filteredMonthlyTxns = allTxns.filter(txn => {
    const d = toDateObject(txn.timestamp || txn.date);
    if (!d) return false;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const monthStr = `${y}-${m}`;
    return monthStr === selectedMonthDate;
  });
  const monthlyTotalSales = filteredMonthlyTxns.reduce((acc, t) => acc + (t.total || 0), 0);
  const monthlyTotalProfit = filteredMonthlyTxns.reduce((acc, t) => acc + (t.profit || 0), 0);

  // Calculations for specific selected year in Yearly tab
  const filteredYearlyTxns = allTxns.filter(txn => {
    const d = toDateObject(txn.timestamp || txn.date);
    if (!d) return false;
    return String(d.getFullYear()) === selectedYear;
  });
  const yearlyTotalSales = filteredYearlyTxns.reduce((acc, t) => acc + (t.total || 0), 0);
  const yearlyTotalProfit = filteredYearlyTxns.reduce((acc, t) => acc + (t.profit || 0), 0);

  // Get unique years from transactions for dropdown
  const availableYears = [...new Set(allTxns.map(t => toDateObject(t.timestamp || t.date)?.getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  const currentYearNum = parseInt(getCurrentYearString(), 10);
  if (!availableYears.includes(currentYearNum)) availableYears.unshift(currentYearNum);

  // Helper to render transaction detail row
  const renderTxnDetailRow = (txn) => (
    <div key={txn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '2px' }}>
      <div 
        onClick={() => setExpandedTxnId(expandedTxnId === txn.id ? null : txn.id)}
        style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', cursor: 'pointer', borderRadius: '6px', transition: 'background 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: '#cbd5e1', fontSize: '14px' }}>#{txn.billNumber ? String(txn.billNumber).padStart(6,'0') : txn.id.substring(0,8)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{formatDate(txn.timestamp)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: txn.paymentMethod === 'CASH' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: txn.paymentMethod === 'CASH' ? '#10b981' : '#818cf8', fontSize: '10px', fontWeight: 600 }}>
              {txn.paymentMethod || 'N/A'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '15px' }}>Rs. {Number(txn.total || 0).toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#3b82f6' }}>ලාභය: Rs. {Number(txn.profit || 0).toFixed(2)}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{txn.items?.length || 0} භාණ්ඩ</div>
        </div>
      </div>
      {expandedTxnId === txn.id && txn.items && txn.items.length > 0 && (
        <div style={{ padding: '0 10px 12px 20px', animation: 'fadeIn 0.2s ease' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>භාණ්ඩය</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 600 }}>ප්‍රමාණය</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>මිල</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>එකතුව</th>
              </tr>
            </thead>
            <tbody>
              {txn.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '5px 8px', color: '#e2e8f0' }}>{item.name || 'N/A'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', color: '#94a3b8' }}>{item.quantity}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#94a3b8' }}>Rs. {Number(item.price || 0).toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>Rs. {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="reports-page fade-in">
      <div className="page-header">
         <div>
            <h1 className="page-title gradient-text">{t('nav.reports')}</h1>
            <p className="page-subtitle">{t('reports.subtitle')}</p>
         </div>
         <div className="report-actions-bar">
            <Button onClick={downloadDailyReport} variant="secondary" icon={<FiDownload />} size="sm">
              {t('reports.downloadDaily')}
            </Button>
            <Button onClick={downloadMonthlyReport} variant="secondary" icon={<FiDownload />} size="sm">
              {t('reports.downloadMonthly')}
            </Button>
            <Button onClick={handlePrintReport} variant="secondary" icon={<FiPrinter />} size="sm">
              {t('reports.print')}
            </Button>
         </div>
      </div>

      {/* Tab Navigation */}
      <div className="report-tabs glass-card">
        <button 
          className={`report-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiBarChart2 /> {t('reports.overview')}
        </button>
        <button 
          className={`report-tab ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <FiCalendar /> {t('reports.daily')}
        </button>
        <button 
          className={`report-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          <FiTrendingUp /> {t('reports.monthly')}
        </button>
        <button 
          className={`report-tab ${activeTab === 'yearly' ? 'active' : ''}`}
          onClick={() => setActiveTab('yearly')}
        >
          <FiBarChart2 /> වාර්ෂික
        </button>
        <button 
          className={`report-tab ${activeTab === 'item' ? 'active' : ''}`}
          onClick={() => setActiveTab('item')}
        >
          <FiSearch /> Item Analysis
        </button>
      </div>

      {loading ? (
        <div className="loading-state">{t('reports.generating')}</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card glass-card">
              <div className="stat-icon sales"><FiDollarSign /></div>
              <div className="stat-info">
                <span className="stat-label">{t('reports.todaySales')}</span>
                <h2 className="stat-value">Rs. {stats.todaySales.toFixed(2)}</h2>
                <span className="stat-trend positive" style={{ display: 'block', marginBottom: '4px' }}><FiArrowUpRight /> {stats.todayTxns} {t('reports.transactions')}</span>
                <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>
                  ලාභය: Rs. {stats.todayProfit.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon txns"><FiActivity /></div>
              <div className="stat-info">
                <span className="stat-label">{t('reports.monthSales')}</span>
                <h2 className="stat-value">Rs. {stats.monthSales.toFixed(2)}</h2>
                <span className="stat-trend neutral" style={{ display: 'block', marginBottom: '4px' }}>{stats.monthTxns} {t('reports.transactions')}</span>
                <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>
                  ලාභය: Rs. {stats.monthProfit.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon items"><FiShoppingBag /></div>
              <div className="stat-info">
                <span className="stat-label">{t('reports.totalInventory')}</span>
                <h2 className="stat-value">{stats.totalItems}</h2>
                <span className="stat-trend negative"><FiArrowDownRight /> {stats.lowStock} {t('reports.lowStock')}</span>
              </div>
            </div>
          </div>

          <div className="reports-row mt-6">
            {/* Chart Area */}
            <div className="report-main glass-card">
              <h3 className="section-title">
                <FiTrendingUp /> {activeTab === 'overview' ? t('reports.topSelling') : activeTab === 'item' ? 'Item Sales Trend' : activeTab === 'daily' ? '📅 දෛනික විකුණුම් විස්තර' : activeTab === 'monthly' ? '📅 මාසික විකුණුම් විස්තර' : activeTab === 'yearly' ? '📅 වාර්ෂික විකුණුම් විස්තර' : t('reports.salesTrend')}
              </h3>
              <div className="chart-container">
                {activeTab === 'item' ? (
                   <div className="item-analysis-section" style={{display:'flex', flexDirection:'column', height:'100%'}}>
                      <div className="search-box glass-card mb-4" style={{display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', background: 'var(--bg-glass)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)'}}>
                         <FiSearch style={{marginRight: 12, color: 'var(--primary-400)', fontSize: '1.1rem'}}/>
                         <input 
                           type="text"
                           placeholder="Search name, barcode or Item No to view graph..."
                           value={itemSearchQuery}
                           onChange={(e) => setItemSearchQuery(e.target.value)}
                           style={{background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: 600}}
                         />
                      </div>
                      
                      {itemSearchQuery && (
                         <div className="search-results-list" style={{background: 'var(--bg-card)', padding: '8px', borderRadius: '14px', zIndex: 10, marginBottom: '15px', border: '1.5px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'}}>
                            {Object.values(inventoryItems)
                               .filter(inv => {
                                 if (itemSearchQuery && inv.itemNo?.toString() === itemSearchQuery.trim()) return true;
                                 return inv.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                        inv.barcode?.toLowerCase().includes(itemSearchQuery.toLowerCase());
                               })
                               .slice(0, 5)
                               .map((inv, idx) => (
                                 <div 
                                    key={idx} 
                                    onClick={() => handleSelectItemGraph(inv.name)} 
                                    style={{padding: '10px 14px', cursor: 'pointer', borderRadius: '10px', marginBottom: '4px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.92rem', transition: 'all 0.15s ease'}}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.background = 'var(--primary-50, rgba(139, 92, 246, 0.12))';
                                      e.currentTarget.style.color = 'var(--primary-400)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                 >
                                    <span>{inv.name}</span>
                                    <span style={{fontSize: '0.82rem', color: 'var(--primary-400)', fontWeight: 700, background: 'rgba(139, 92, 246, 0.12)', padding: '2px 8px', borderRadius: '6px'}}>#{inv.itemNo || '-'}</span>
                                 </div>
                               ))
                            }
                         </div>
                      )}

                      {selectedItemForChart && itemChartData.length > 0 ? (
                        <>
                          <h4 style={{marginBottom: '15px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600}}>Sales (Qty) over last 30 days: <span style={{color: 'var(--primary-400)', fontWeight: 'bold'}}>{selectedItemForChart}</span></h4>
                          <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={itemChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                              <YAxis stroke="var(--text-secondary)" fontSize={12} allowDecimals={false} />
                              <Tooltip 
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '10px 14px' }}
                                labelStyle={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}
                                itemStyle={{ color: 'var(--primary-400)', fontWeight: '600', fontSize: '13px' }}
                                formatter={(value) => [
                                  `${typeof value === 'number' ? (Number.isInteger(value) ? value : Number(value).toFixed(2)) : value}`,
                                  'Quantity Sold'
                                ]}
                              />
                              <Line type="monotone" dataKey="qty" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </>
                      ) : selectedItemForChart ? (
                         <div className="empty-chart" style={{paddingTop: '40px'}}>No sales data found for {selectedItemForChart} in the last 30 days.</div>
                      ) : (
                         itemSearchQuery === '' && <div className="empty-chart" style={{paddingTop: '40px'}}><FiSearch style={{fontSize: 24, marginBottom: 8, opacity: 0.5}}/><br/>Search and select an item to view its sales graph</div>
                      )}
                   </div>
                ) : activeTab === 'overview' ? (
                  chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '10px 14px' }}
                          labelStyle={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}
                          itemStyle={{ color: 'var(--primary-400)', fontWeight: '600', fontSize: '13px' }}
                          formatter={(value) => [
                            typeof value === 'number' ? (Number.isInteger(value) ? value : Number(value).toFixed(2)) : value,
                            'Quantity Sold'
                          ]}
                        />
                        <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-chart">{t('reports.noSalesData')}</div>
                  )
                ) : activeTab === 'daily' ? (
                  <div className="daily-report-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                     <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          📅 දිනය තෝරන්න:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)', background: 'var(--bg-secondary, rgba(255,255,255,0.05))', flex: 1 }}>
                          <FiCalendar style={{ marginRight: 10, color: '#3b82f6', fontSize: '18px' }}/>
                          <input 
                            type="date"
                            value={selectedDailyDate}
                            onChange={(e) => setSelectedDailyDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary, #0f172a)', width: '100%', outline: 'none', fontSize: '15px', fontWeight: '500' }}
                          />
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                         <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>දෛනික විකුණුම්</div>
                         <div style={{ color: '#10b981', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>Rs. {dailyTotalSales.toFixed(2)}</div>
                       </div>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                         <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>දෛනික ලාභය</div>
                         <div style={{ color: '#3b82f6', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>Rs. {dailyTotalProfit.toFixed(2)}</div>
                       </div>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                         <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>ගනුදෙනු</div>
                         <div style={{ color: '#a855f7', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>{filteredDailyTxns.length}</div>
                       </div>
                     </div>
                     <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>ගනුදෙනු ලැයිස්තුව — ක්ලික් කර විස්තර බලන්න</div>
                     <div style={{ overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                       {filteredDailyTxns.length > 0 ? (
                         filteredDailyTxns.map(txn => renderTxnDetailRow(txn))
                       ) : (
                         <div className="empty-state-sm" style={{ padding: '40px 20px', textAlign: 'center' }}>මෙම දිනට ({selectedDailyDate}) ගනුදෙනු හමු නොවීය</div>
                       )}
                     </div>
                  </div>
                ) : activeTab === 'monthly' ? (
                  <div className="monthly-report-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                     <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          📅 මාසය තෝරන්න:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)', background: 'var(--bg-secondary, rgba(255,255,255,0.05))', flex: 1 }}>
                          <FiCalendar style={{ marginRight: 10, color: '#3b82f6', fontSize: '18px' }}/>
                          <input 
                            type="month"
                            value={selectedMonthDate}
                            onChange={(e) => setSelectedMonthDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary, #0f172a)', width: '100%', outline: 'none', fontSize: '15px', fontWeight: '500' }}
                          />
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                         <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>මාසික විකුණුම්</div>
                         <div style={{ color: '#10b981', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>Rs. {monthlyTotalSales.toFixed(2)}</div>
                       </div>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                         <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>මාසික ලාභය</div>
                         <div style={{ color: '#3b82f6', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>Rs. {monthlyTotalProfit.toFixed(2)}</div>
                       </div>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                         <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>ගනුදෙනු</div>
                         <div style={{ color: '#a855f7', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>{filteredMonthlyTxns.length}</div>
                       </div>
                     </div>
                     <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>ගනුදෙනු ලැයිස්තුව — ක්ලික් කර විස්තර බලන්න</div>
                     <div style={{ overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                       {filteredMonthlyTxns.length > 0 ? (
                         filteredMonthlyTxns.map(txn => renderTxnDetailRow(txn))
                       ) : (
                         <div className="empty-state-sm" style={{ padding: '40px 20px', textAlign: 'center' }}>මෙම මාසයට ({selectedMonthDate}) ගනුදෙනු හමු නොවීය</div>
                       )}
                     </div>
                  </div>
                ) : activeTab === 'yearly' ? (
                  <div className="yearly-report-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                     <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          📅 වර්ෂය තෝරන්න:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)', background: 'var(--bg-secondary, rgba(255,255,255,0.05))', flex: 1 }}>
                          <FiBarChart2 style={{ marginRight: 10, color: '#3b82f6', fontSize: '18px' }}/>
                          <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary, #0f172a)', width: '100%', outline: 'none', fontSize: '15px', fontWeight: '500' }}
                          >
                            {availableYears.map(yr => (
                              <option key={yr} value={String(yr)} style={{ background: 'var(--bg-card, #ffffff)', color: 'var(--text-primary, #0f172a)' }}>{yr} වර්ෂය</option>
                            ))}
                          </select>
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                         <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>වාර්ෂික විකුණුම්</div>
                         <div style={{ color: '#10b981', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>Rs. {yearlyTotalSales.toFixed(2)}</div>
                       </div>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                         <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>වාර්ෂික ලාභය</div>
                         <div style={{ color: '#3b82f6', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>Rs. {yearlyTotalProfit.toFixed(2)}</div>
                       </div>
                       <div style={{ flex: 1, minWidth: '140px', background: 'rgba(168, 85, 247, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                         <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ගනුදෙනු</div>
                         <div style={{ color: '#a855f7', fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>{filteredYearlyTxns.length}</div>
                       </div>
                     </div>
                     <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>ගනුදෙනු ලැයිස්තුව — ක්ලික් කර විස්තර බලන්න</div>
                     <div style={{ overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                       {filteredYearlyTxns.length > 0 ? (
                         filteredYearlyTxns.map(txn => renderTxnDetailRow(txn))
                       ) : (
                         <div className="empty-state-sm" style={{ padding: '40px 20px', textAlign: 'center' }}>මෙම වර්ෂයට ගනුදෙනු හමු නොවීය</div>
                       )}
                     </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Recent Sales */}
            <div className="report-sidebar glass-card">
              <h3 className="section-title">{t('reports.recentTransactions')}</h3>
              <div className="txn-list">
                {recentTxns.length > 0 ? (
                  recentTxns.map(txn => (
                    <div key={txn.id} className="mini-txn-item">
                      <div className="txn-desc">
                        <span className="txn-bill-no">
                          {txn.billNumber ? `#${String(txn.billNumber).padStart(6, '0')}` : txn.id.substring(0, 10)}
                        </span>
                        <span className="txn-method">{txn.paymentMethod}</span>
                      </div>
                      <div className="txn-amount">
                        Rs. {Number(txn.total).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-sm">{t('reports.noRecentTxns')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Full Transaction Table (printable) */}
          <div className="full-txn-section mt-6 glass-card printable-section">
            <h3 className="section-title"><FiActivity /> {t('reports.allTransactions')}</h3>
            <div className="table-container">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>{t('reports.billNo')}</th>
                    <th>{t('reports.txnId')}</th>
                    <th>{t('reports.date')}</th>
                    <th>{t('reports.items')}</th>
                    <th>{t('reports.payment')}</th>
                    <th>{t('reports.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxns.length > 0 ? (
                    recentTxns.map(txn => (
                      <tr key={txn.id}>
                        <td className="bill-no-cell">
                          {txn.billNumber 
                            ? <span className="bill-no-badge">#{String(txn.billNumber).padStart(6, '0')}</span>
                            : <span className="bill-no-na">N/A</span>
                          }
                        </td>
                        <td className="font-mono">{txn.id.substring(0, 12)}</td>
                        <td className="text-secondary">{formatDate(txn.timestamp)}</td>
                        <td>{txn.items?.map(i => `${i.name} ×${i.quantity}`).join(', ') || '-'}</td>
                        <td>
                          <span className={`payment-badge ${txn.paymentMethod}`}>
                            {txn.paymentMethod}
                          </span>
                        </td>
                        <td className="font-bold">Rs. {Number(txn.total).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">{t('reports.noRecentTxns')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
