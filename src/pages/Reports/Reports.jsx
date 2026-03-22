import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
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
    todayTxns: 0,
    totalItems: 0,
    lowStock: 0,
    monthSales: 0,
    monthTxns: 0
  });
  const [recentTxns, setRecentTxns] = useState([]);
  const [allTxns, setAllTxns] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [dailyChartData, setDailyChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState({});
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'daily', 'monthly', 'item'
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedItemForChart, setSelectedItemForChart] = useState(null);
  const [itemChartData, setItemChartData] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // Get today's start and month start
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayTimestamp = Timestamp.fromDate(today);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0,0,0,0);
        const monthTimestamp = Timestamp.fromDate(monthStart);

        // Fetch ALL Transactions
        const txnSnapshot = await getDocs(collection(db, 'transactions'));
        
        let todaySales = 0;
        let todayCount = 0;
        let monthSales = 0;
        let monthCount = 0;
        const itemFreq = {};
        const transactions = [];
        const dailySalesMap = {};

        txnSnapshot.forEach(doc => {
          const data = doc.data();
          const total = data.total || 0;
          transactions.push({ id: doc.id, ...data });
          
          const txnDate = data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : null;

          // Today's sales
          if (data.timestamp && data.timestamp.seconds >= todayTimestamp.seconds) {
            todaySales += total;
            todayCount++;
          }

          // This month's sales
          if (data.timestamp && data.timestamp.seconds >= monthTimestamp.seconds) {
            monthSales += total;
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

        // Daily sales chart data (last 7 days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          last7Days.push({ name: key, sales: dailySalesMap[key] || 0 });
        }
        setDailyChartData(last7Days);

        // Sort transactions
        transactions.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setAllTxns(transactions);
        setRecentTxns(transactions.slice(0, 10));

        // Fetch Inventory Stats
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

        setStats({
          todaySales,
          todayTxns: todayCount,
          totalItems,
          lowStock: lowStockCount,
          monthSales,
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
    
    XLSX.writeFile(workbook, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadDailyReport = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTxns = allTxns.filter(txn => {
      const txnTime = txn.timestamp?.seconds || 0;
      return txnTime >= today.getTime() / 1000;
    });
    generateExcel(todayTxns, 'Daily_Sales_Report');
  };

  const downloadMonthlyReport = () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0,0,0,0);
    const monthTxns = allTxns.filter(txn => {
      const txnTime = txn.timestamp?.seconds || 0;
      return txnTime >= monthStart.getTime() / 1000;
    });
    generateExcel(monthTxns, 'Monthly_Sales_Report');
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleSelectItemGraph = (itemName) => {
    setItemSearchQuery(''); // clear query
    setSelectedItemForChart(itemName);
    
    // Generate data array for last 30 days
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[key] = 0;
    }

    allTxns.forEach(txn => {
      const txnDate = txn.timestamp?.seconds ? new Date(txn.timestamp.seconds * 1000) : null;
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
                <span className="stat-trend positive"><FiArrowUpRight /> {stats.todayTxns} {t('reports.transactions')}</span>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon txns"><FiActivity /></div>
              <div className="stat-info">
                <span className="stat-label">{t('reports.monthSales')}</span>
                <h2 className="stat-value">Rs. {stats.monthSales.toFixed(2)}</h2>
                <span className="stat-trend neutral">{stats.monthTxns} {t('reports.transactions')}</span>
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
                <FiTrendingUp /> {activeTab === 'overview' ? t('reports.topSelling') : activeTab === 'item' ? 'Item Sales Trend' : t('reports.salesTrend')}
              </h3>
              <div className="chart-container">
                {activeTab === 'item' ? (
                   <div className="item-analysis-section" style={{display:'flex', flexDirection:'column', height:'100%'}}>
                      <div className="search-box glass-card mb-4" style={{display: 'flex', alignItems: 'center', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                         <FiSearch style={{marginRight: 10, color: '#94a3b8'}}/>
                         <input 
                           type="text"
                           placeholder="Search name, barcode or Item No to view graph..."
                           value={itemSearchQuery}
                           onChange={(e) => setItemSearchQuery(e.target.value)}
                           style={{background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none'}}
                         />
                      </div>
                      
                      {itemSearchQuery && (
                         <div className="search-results-list" style={{background: '#1e293b', padding: '10px', borderRadius: '8px', zIndex: 10, marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)'}}>
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
                                    style={{padding: '8px', cursor: 'pointer', borderBottom: '1px solid #334155'}}
                                    onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                                 >
                                    {inv.name} <span style={{fontSize: '0.8em', color: '#94a3b8', marginLeft: '8px'}}>#{inv.itemNo || '-'}</span>
                                 </div>
                               ))
                            }
                         </div>
                      )}

                      {selectedItemForChart && itemChartData.length > 0 ? (
                        <>
                          <h4 style={{marginBottom: '15px', color: '#cbd5e1', fontSize: '14px'}}>Sales (Qty) over last 30 days: <span style={{color: '#8b5cf6', fontWeight: 'bold'}}>{selectedItemForChart}</span></h4>
                          <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={itemChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} allowDecimals={false} />
                              <Tooltip 
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => [`${value} items`, 'Sold']}
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
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
                ) : (
                  dailyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value) => [`Rs. ${value.toFixed(2)}`, 'Sales']}
                        />
                        <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-chart">{t('reports.noSalesData')}</div>
                  )
                )}
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
