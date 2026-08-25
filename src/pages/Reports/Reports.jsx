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
  toUtcSeconds,
  formatSriLankaDate,
  formatSriLankaTime,
  formatSriLankaDateTime,
  calibrateFromTimestamp,
  subscribeTimeSync
} from '../../services/timeService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { 
  FiBarChart2, FiDollarSign, FiShoppingBag, FiTrendingUp, 
  FiActivity, FiArrowUpRight, FiArrowDownRight, FiDownload, FiPrinter, FiCalendar, FiSearch, FiFileText, FiLayers
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

  // Full System Report Modal States
  const [isReportGenModalOpen, setIsReportGenModalOpen] = useState(false);
  const [genPeriod, setGenPeriod] = useState('daily'); // 'daily', 'monthly', 'yearly'
  const [genDailyDate, setGenDailyDate] = useState(getTodayDateString());
  const [genMonthDate, setGenMonthDate] = useState(getCurrentMonthString());
  const [genYear, setGenYear] = useState(getCurrentYearString());
  const [genLoading, setGenLoading] = useState(false);

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
        const itemRevenue = {};
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
             itemRevenue[item.name] = (itemRevenue[item.name] || 0) + (Number(item.subtotal) || (Number(item.sellPrice) * Number(item.quantity)) || 0);
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
          .map(([name, qty]) => ({
            name,
            qty,
            revenue: itemRevenue[name] || 0,
            itemNo: invMap[name]?.itemNo || invMap[name]?.itemno || '—'
          }));
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

    // Re-calculate automatically as soon as time synchronizes
    const unsubscribe = subscribeTimeSync(() => {
      fetchReports();
      setSelectedDailyDate(getTodayDateString());
      setSelectedMonthDate(getCurrentMonthString());
      setSelectedYear(getCurrentYearString());
    });

    return unsubscribe;
  }, []);

  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return formatSriLankaDateTime(timestamp);
  };

  // ---- Comprehensive Full System Excel Generator ----
  const generateFullSystemExcel = async (periodType, targetDateStr) => {
    setGenLoading(true);
    try {
      // 1. Fetch collections in parallel
      const [txnSnap, reloadSnap, millingSnap, debtorPaySnap] = await Promise.all([
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'reloads')),
        getDocs(collection(db, 'millingRecords')),
        getDocs(collection(db, 'debtor_payments'))
      ]);

      const filterByPeriod = (ts) => {
        const d = toDateObject(ts);
        if (!d) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        if (periodType === 'daily') {
          return `${y}-${m}-${day}` === targetDateStr;
        } else if (periodType === 'monthly') {
          return `${y}-${m}` === targetDateStr;
        } else if (periodType === 'yearly') {
          return String(y) === String(targetDateStr);
        }
        return false;
      };

      // 2. Process Transactions
      const txns = [];
      let totalPosSales = 0;
      let totalPosCost = 0;
      let totalPosProfit = 0;
      const itemMap = {};

      txnSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (filterByPeriod(data.timestamp || data.date)) {
          let txnCost = 0;
          let txnTotal = Number(data.total) || 0;
          if (data.items) {
            data.items.forEach(item => {
              const invItem = inventoryItems[item.id] || inventoryItems[item.name];
              const unitCost = invItem ? (Number(invItem.purchasePrice) || 0) : 0;
              const itemCost = (Number(item.quantity) || 0) * unitCost;
              txnCost += itemCost;

              const key = item.id || item.name;
              if (!itemMap[key]) {
                itemMap[key] = {
                  name: item.name,
                  itemNo: item.itemNo || invItem?.itemNo || '-',
                  quantity: 0,
                  revenue: 0,
                  cost: 0
                };
              }
              itemMap[key].quantity += Number(item.quantity) || 0;
              itemMap[key].revenue += Number(item.subtotal) || ((Number(item.quantity) || 0) * (Number(item.sellPrice) || 0));
              itemMap[key].cost += itemCost;
            });
          }
          const profit = txnTotal - txnCost;
          totalPosSales += txnTotal;
          totalPosCost += txnCost;
          totalPosProfit += profit;
          txns.push({ id: docSnap.id, ...data, profit, cost: txnCost });
        }
      });

      // 3. Process Reloads
      const reloads = [];
      let totalReloadAmt = 0;
      reloadSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (filterByPeriod(data.timestamp || data.date)) {
          const amt = Number(data.amount) || 0;
          totalReloadAmt += amt;
          reloads.push({ id: docSnap.id, ...data, amount: amt });
        }
      });

      // 4. Process Milling
      const millings = [];
      let totalMillingFee = 0;
      millingSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (filterByPeriod(data.timestamp || data.date)) {
          const fee = Number(data.totalFee || data.amount) || 0;
          totalMillingFee += fee;
          millings.push({ id: docSnap.id, ...data, fee });
        }
      });

      // 5. Process Debtor Payments & Credits
      const debtorActs = [];
      let totalDebtorPayments = 0;
      let totalDebtorLoans = 0;
      debtorPaySnap.forEach(docSnap => {
        const data = docSnap.data();
        if (filterByPeriod(data.timestamp || data.date)) {
          const amt = Number(data.amount) || 0;
          if (data.type === 'payment') totalDebtorPayments += amt;
          else totalDebtorLoans += amt;
          debtorActs.push({ id: docSnap.id, ...data, amount: amt });
        }
      });

      // Build Multi-sheet Workbook
      const workbook = XLSX.utils.book_new();

      // SHEET 1: Executive Summary
      const summaryPeriodName = periodType === 'daily' 
        ? `දිනපතා වාර්තාව (${targetDateStr})` 
        : periodType === 'monthly' 
          ? `මාසික වාර්තාව (${targetDateStr})` 
          : `වාර්ෂික වාර්තාව (${targetDateStr})`;

      const summaryRows = [
        ['SMART POS - SYSTEM FULL REPORT / සම්පූර්ණ පද්ධති වාර්තාව'],
        ['වාර්තා වර්ගය (Report Type):', summaryPeriodName],
        ['ජනනය කළ දිනය (Generated On):', new Date().toLocaleString()],
        [],
        ['=== 1. මුල්‍ය සාරාංශය (FINANCIAL SUMMARY) ===', ''],
        ['මුළු POS විකුණුම් ආදායම (POS Sales Revenue):', `Rs. ${totalPosSales.toFixed(2)}`],
        ['මුළු භාණ්ඩ පිරිවැය (Cost of Goods Sold):', `Rs. ${totalPosCost.toFixed(2)}`],
        ['විකුණුම් ශුද්ධ ලාභය (POS Sales Net Profit):', `Rs. ${totalPosProfit.toFixed(2)}`],
        ['රීලෝඩ් මුළු ආදායම (Reloads Revenue):', `Rs. ${totalReloadAmt.toFixed(2)}`],
        ['කෙටුම් මුළු ආදායම (Milling Revenue):', `Rs. ${totalMillingFee.toFixed(2)}`],
        ['ලැබුණු ණය පියවීම් (Debtor Payments Collected):', `Rs. ${totalDebtorPayments.toFixed(2)}`],
        [],
        ['=== 2. මුළු එකතුව (GRAND TOTALS) ===', ''],
        ['සම්පූර්ණ මුදල් ආදායම (Grand Total Turnover):', `Rs. ${(totalPosSales + totalReloadAmt + totalMillingFee + totalDebtorPayments).toFixed(2)}`],
        ['සම්පූර්ණ ශුද්ධ ලාභය (Grand Net Profit):', `Rs. ${(totalPosProfit + totalMillingFee).toFixed(2)}`],
        [],
        ['=== 3. ගනුදෙනු සංඛ්‍යා ලේඛන (TRANSACTION COUNTS) ===', ''],
        ['මුළු POS බිල්පත් ගණන (Total POS Bills):', txns.length],
        ['අලෙවි වූ විවිධ භාණ්ඩ ගණන (Items Sold Varieties):', Object.keys(itemMap).length],
        ['රීලෝඩ් ගනුදෙනු ගණන (Reloads Count):', reloads.length],
        ['කෙටුම් වාර්තා ගණන (Milling Count):', millings.length],
        ['ණය පියවීම් ගණන (Debtor Payments Count):', debtorActs.length],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
      summaryWs['!cols'] = [{ wch: 45 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summaryWs, "Executive Summary");

      // SHEET 2: POS Sales Transactions
      const txnHeaders = ['බිල්පත් අංකය (Bill No)', 'දිනය සහ වේලාව (Date & Time)', 'ගෙවීම් ක්‍රමය (Payment)', 'භාණ්ඩ විස්තරය (Items)', 'අයකැමි (Cashier)', 'බිල් මුදල (Total Rs.)', 'ලාභය (Profit Rs.)'];
      const txnRows = txns.map(t => [
        t.billNumber ? `#${String(t.billNumber).padStart(6, '0')}` : t.id.substring(0, 10),
        formatDate(t.timestamp || t.date),
        t.paymentMethod || 'cash',
        t.items?.map(i => `${i.name} ×${i.quantity}`).join(', ') || '',
        t.cashierName || 'Cashier',
        (Number(t.total) || 0).toFixed(2),
        (t.profit || 0).toFixed(2)
      ]);
      txnRows.push(['', '', '', '', 'TOTAL', totalPosSales.toFixed(2), totalPosProfit.toFixed(2)]);
      const txnWs = XLSX.utils.aoa_to_sheet([txnHeaders, ...txnRows]);
      txnWs['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, txnWs, "POS Sales");

      // SHEET 3: Item Sales Breakdown
      const itemHeaders = ['අංකය (Item No)', 'භාණ්ඩයේ නම (Item Name)', 'අලෙවි වූ ප්‍රමාණය (Qty Sold)', 'මුළු පිරිවැය (Total Cost Rs.)', 'මුළු විකුණුම් (Total Revenue Rs.)', 'ශුද්ධ ලාභය (Net Profit Rs.)'];
      const itemRows = Object.values(itemMap).map(data => {
        const p = data.revenue - data.cost;
        return [
          data.itemNo || '-',
          data.name,
          data.quantity,
          data.cost.toFixed(2),
          data.revenue.toFixed(2),
          p.toFixed(2)
        ];
      });
      itemRows.sort((a, b) => b[4] - a[4]); // Sort by revenue desc
      itemRows.push(['', 'TOTAL', Object.values(itemMap).reduce((s, i) => s + i.quantity, 0), totalPosCost.toFixed(2), totalPosSales.toFixed(2), totalPosProfit.toFixed(2)]);
      const itemWs = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
      itemWs['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(workbook, itemWs, "Item Breakdown");

      // SHEET 4: Reloads
      if (reloads.length > 0) {
        const reloadHeaders = ['දිනය සහ වේලාව (Date)', 'දුරකථන අංකය (Phone)', 'ජාලය (Network)', 'මුදල (Amount Rs.)', 'ගෙවීම් ක්‍රමය (Method)', 'අයකැමි (Cashier)'];
        const reloadRows = reloads.map(r => [
          formatDate(r.timestamp || r.date),
          r.phone || '-',
          r.network || '-',
          (r.amount || 0).toFixed(2),
          r.paymentMethod || 'cash',
          r.cashierName || 'Cashier'
        ]);
        reloadRows.push(['', '', 'TOTAL', totalReloadAmt.toFixed(2), '', '']);
        const reloadWs = XLSX.utils.aoa_to_sheet([reloadHeaders, ...reloadRows]);
        reloadWs['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(workbook, reloadWs, "Reloads");
      }

      // SHEET 5: Milling
      if (millings.length > 0) {
        const millHeaders = ['දිනය සහ වේලාව (Date)', 'පාරිභෝගිකයා (Customer)', 'වර්ගය (Type)', 'බර (Weight kg)', 'ගාස්තුව (Fee Rs.)', 'අයකැමි (Cashier)'];
        const millRows = millings.map(m => [
          formatDate(m.timestamp || m.date),
          m.customerName || m.customer || 'Customer',
          m.type || 'Paddy/Coconut',
          m.weight ? `${m.weight} kg` : '-',
          (m.fee || 0).toFixed(2),
          m.cashierName || 'Cashier'
        ]);
        millRows.push(['', '', '', 'TOTAL', totalMillingFee.toFixed(2), '']);
        const millWs = XLSX.utils.aoa_to_sheet([millHeaders, ...millRows]);
        millWs['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(workbook, millWs, "Milling");
      }

      // SHEET 6: Debtors
      if (debtorActs.length > 0) {
        const debtorHeaders = ['දිනය සහ වේලාව (Date)', 'ණයහිමියා (Debtor)', 'ගනුදෙනු වර්ගය (Type)', 'මුදල (Amount Rs.)', 'අයකැමි (Cashier)', 'විස්තරය (Note)'];
        const debtorRows = debtorActs.map(d => [
          formatDate(d.timestamp || d.date),
          d.debtorName || 'Unknown',
          d.type === 'payment' ? 'ණය ගෙවීම (Payment)' : 'ණය එකතු කිරීම (Loan)',
          (d.amount || 0).toFixed(2),
          d.cashierName || 'Cashier',
          d.note || '-'
        ]);
        const debtorWs = XLSX.utils.aoa_to_sheet([debtorHeaders, ...debtorRows]);
        debtorWs['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(workbook, debtorWs, "Debtor Transactions");
      }

      const fileName = `System_Full_Report_${periodType.toUpperCase()}_${targetDateStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (e) {
      console.error('generateFullSystemExcel error:', e);
      alert('වාර්තාව ජනනය කිරීමේදී දෝෂයක් සිදු විය: ' + e.message);
    } finally {
      setGenLoading(false);
    }
  };

  const downloadDailyReport = () => {
    generateFullSystemExcel('daily', selectedDailyDate || getTodayDateString());
  };

  const downloadMonthlyReport = () => {
    generateFullSystemExcel('monthly', selectedMonthDate || getCurrentMonthString());
  };

  const downloadYearlyReport = () => {
    generateFullSystemExcel('yearly', selectedYear || getCurrentYearString());
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
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: txn.paymentMethod === 'CASH' || txn.paymentMethod === 'cash' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: txn.paymentMethod === 'CASH' || txn.paymentMethod === 'cash' ? '#10b981' : '#818cf8', fontSize: '10px', fontWeight: 600 }}>
              {txn.paymentMethod || 'N/A'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '15px' }}>Rs. {Number(txn.total || 0).toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#3b82f6' }}>ලාභය: Rs. {Number(txn.profit || 0).toFixed(2)}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{txn.items?.length || 0} භාණ්ඩ</div>
        </div>
      </div>
      {expandedTxnId === txn.id && txn.items && txn.items.length > 0 && (
        <div style={{ padding: '0 10px 12px 20px', animation: 'fadeIn 0.2s ease' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary, #475569)', borderBottom: '1.5px solid var(--border-color, rgba(0,0,0,0.1))' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>භාණ්ඩය</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}>ප්‍රමාණය</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>මිල</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>එකතුව</th>
              </tr>
            </thead>
            <tbody>
              {txn.items.map((item, idx) => {
                const qtyNum = Number(item.quantity) || 0;
                const isWeighed = item.itemType === 'weighed' || (qtyNum % 1 !== 0 && qtyNum < 100);
                const displayQty = isWeighed
                  ? (qtyNum < 1 ? `${Math.round(qtyNum * 1000)}g` : `${qtyNum % 1 === 0 ? qtyNum : qtyNum.toFixed(3).replace(/\.?0+$/, '')} kg`)
                  : item.quantity;

                const itemPrice = Number(item.sellPrice ?? item.price ?? item.markedPrice ?? (qtyNum > 0 ? (Number(item.subtotal) / qtyNum) : 0)) || 0;
                const itemSubtotal = Number(item.subtotal ?? (itemPrice * qtyNum)) || 0;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>{item.name || 'N/A'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>{displayQty}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>Rs. {itemPrice.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444', fontWeight: 800 }}>Rs. {itemSubtotal.toFixed(2)}</td>
                  </tr>
                );
              })}
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
         <div className="report-actions-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button 
              onClick={() => setIsReportGenModalOpen(true)} 
              variant="primary" 
              icon={<FiLayers />} 
              size="sm"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', fontWeight: 700, boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)' }}
            >
              📊 සම්පූර්ණ වාර්තා (Generate Full Report)
            </Button>
            <Button onClick={downloadDailyReport} variant="secondary" icon={<FiDownload />} size="sm" disabled={genLoading}>
              දෛනික වාර්තාව (Daily)
            </Button>
            <Button onClick={downloadMonthlyReport} variant="secondary" icon={<FiDownload />} size="sm" disabled={genLoading}>
              මාසික වාර්තාව (Monthly)
            </Button>
            <Button onClick={downloadYearlyReport} variant="secondary" icon={<FiDownload />} size="sm" disabled={genLoading}>
              වාර්ෂික වාර්තාව (Yearly)
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
          <FiBarChart2 /> වාර්ෂික (Yearly)
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
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              const qty = d.qty;
                              const qtyDisplay = typeof qty === 'number' ? (Number.isInteger(qty) ? qty : qty.toFixed(3)) : qty;
                              return (
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '10px 14px', minWidth: '180px' }}>
                                  <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>{label}</div>
                                  {d.itemNo && d.itemNo !== '—' && <div style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '12px', marginBottom: '4px' }}>Item No: <span style={{ color: 'var(--primary-400)', fontWeight: '700' }}>#{d.itemNo}</span></div>}
                                  <div style={{ color: 'var(--primary-400)', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>ප්‍රමාණය : {qtyDisplay}</div>
                                  {d.revenue > 0 && <div style={{ color: '#10b981', fontWeight: '700', fontSize: '13px' }}>ආදායම : Rs. {Number(d.revenue).toFixed(2)}</div>}
                                </div>
                              );
                            }
                            return null;
                          }}
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
                     <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          📅 දිනය තෝරන්න:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)', background: 'var(--bg-secondary, rgba(255,255,255,0.05))', flex: 1, minWidth: '180px' }}>
                          <FiCalendar style={{ marginRight: 10, color: '#3b82f6', fontSize: '18px' }}/>
                          <input 
                            type="date"
                            value={selectedDailyDate}
                            onChange={(e) => setSelectedDailyDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary, #0f172a)', width: '100%', outline: 'none', fontSize: '15px', fontWeight: '500' }}
                          />
                        </div>
                        <Button 
                          onClick={() => generateFullSystemExcel('daily', selectedDailyDate)} 
                          variant="secondary" 
                          icon={<FiDownload />} 
                          size="sm"
                          disabled={genLoading}
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', fontWeight: 700 }}
                        >
                          {genLoading ? 'ජනනය වෙමින්...' : '📥 මෙම දිනට Excel ලබාගන්න'}
                        </Button>
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
                     <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          📅 මාසය තෝරන්න:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)', background: 'var(--bg-secondary, rgba(255,255,255,0.05))', flex: 1, minWidth: '180px' }}>
                          <FiCalendar style={{ marginRight: 10, color: '#3b82f6', fontSize: '18px' }}/>
                          <input 
                            type="month"
                            value={selectedMonthDate}
                            onChange={(e) => setSelectedMonthDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary, #0f172a)', width: '100%', outline: 'none', fontSize: '15px', fontWeight: '500' }}
                          />
                        </div>
                        <Button 
                          onClick={() => generateFullSystemExcel('monthly', selectedMonthDate)} 
                          variant="secondary" 
                          icon={<FiDownload />} 
                          size="sm"
                          disabled={genLoading}
                          style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)', fontWeight: 700 }}
                        >
                          {genLoading ? 'ජනනය වෙමින්...' : '📥 මෙම මාසයට Excel ලබාගන්න'}
                        </Button>
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
                     <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          📅 වර්ෂය තෝරන්න:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)', background: 'var(--bg-secondary, rgba(255,255,255,0.05))', flex: 1, minWidth: '180px' }}>
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
                        <Button 
                          onClick={() => generateFullSystemExcel('yearly', selectedYear)} 
                          variant="secondary" 
                          icon={<FiDownload />} 
                          size="sm"
                          disabled={genLoading}
                          style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)', fontWeight: 700 }}
                        >
                          {genLoading ? 'ජනනය වෙමින්...' : '📥 මෙම වර්ෂයට Excel ලබාගන්න'}
                        </Button>
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

      {/* FULL SYSTEM REPORT GENERATOR MODAL */}
      <Modal
        isOpen={isReportGenModalOpen}
        onClose={() => setIsReportGenModalOpen(false)}
        title="📊 සම්පූර්ණ පද්ධති වාර්තා උත්පාදනය (System Full Report Generator)"
        maxWidth="650px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5 }}>
            ඔබට අවශ්‍ය කාල සීමාව (දිනපතා, මාස්පතා, හෝ වාර්ෂිකව) තෝරා සම්පූර්ණ POS විකුණුම්, භාණ්ඩ ලාභ, රීලෝඩ්, වී/පොල් කෙටීම්, සහ ණය ගනුදෙනු ඇතුළත් <strong>Multi-Sheet Excel වාර්තාවක්</strong> ක්ෂණිකව ලබාගත හැක.
          </p>

          {/* Period Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setGenPeriod('daily')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: genPeriod === 'daily' ? 'var(--primary-500, #8b5cf6)' : 'transparent',
                color: genPeriod === 'daily' ? '#ffffff' : 'var(--text-primary)'
              }}
            >
              📅 දිනපතා (Daily)
            </button>
            <button
              type="button"
              onClick={() => setGenPeriod('monthly')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: genPeriod === 'monthly' ? 'var(--primary-500, #8b5cf6)' : 'transparent',
                color: genPeriod === 'monthly' ? '#ffffff' : 'var(--text-primary)'
              }}
            >
              📅 මාස්පතා (Monthly)
            </button>
            <button
              type="button"
              onClick={() => setGenPeriod('yearly')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: genPeriod === 'yearly' ? 'var(--primary-500, #8b5cf6)' : 'transparent',
                color: genPeriod === 'yearly' ? '#ffffff' : 'var(--text-primary)'
              }}
            >
              📅 වාර්ෂිකව (Yearly)
            </button>
          </div>

          {/* Date Picker Section */}
          <div style={{ background: 'var(--bg-secondary, rgba(255,255,255,0.05))', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {genPeriod === 'daily' && (
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  දිනය තෝරන්න (Select Date):
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={genDailyDate}
                    onChange={(e) => setGenDailyDate(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setGenDailyDate(getTodayDateString())}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    අද (Today)
                  </button>
                </div>
              </div>
            )}

            {genPeriod === 'monthly' && (
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  මාසය තෝරන්න (Select Month):
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="month"
                    value={genMonthDate}
                    onChange={(e) => setGenMonthDate(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setGenMonthDate(getCurrentMonthString())}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    මෙම මාසය
                  </button>
                </div>
              </div>
            )}

            {genPeriod === 'yearly' && (
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  වර්ෂය තෝරන්න (Select Year):
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={genYear}
                    onChange={(e) => setGenYear(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, outline: 'none' }}
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={String(yr)}>{yr} වර්ෂය</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setGenYear(getCurrentYearString())}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    මෙම වසර
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Included Features Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600 }}>
              ✓ Executive Summary (මුල්‍ය සාරාංශය)
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: 600 }}>
              ✓ POS Bills & Payment Breakdown
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', color: '#a855f7', fontWeight: 600 }}>
              ✓ Item Sales & Net Profit Ranking
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#d97706', fontWeight: 600 }}>
              ✓ Reloads, Milling & Debtors
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReportGenModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={<FiDownload />}
              disabled={genLoading}
              onClick={() => {
                const targetVal = genPeriod === 'daily' ? genDailyDate : genPeriod === 'monthly' ? genMonthDate : genYear;
                generateFullSystemExcel(genPeriod, targetVal);
              }}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 700, padding: '10px 20px' }}
            >
              {genLoading ? 'වාර්තාව සකස් වෙමින්...' : '📥 සම්පූර්ණ Excel වාර්තාව ලබාගන්න (Download)'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
