import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, query, where, Timestamp, orderBy, limit, serverTimestamp, increment } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { isToday, toDateObject, calibrateFromTimestamp, subscribeTimeSync, formatSriLankaTime, getSriLankaTodayBounds, getTodayDateString, getCurrentMonthString, toSriLankaDateString, toSriLankaMonthString, getSriLankaDateParts, getTrueUtcMs } from '../../services/timeService';
import { safeCommit } from '../../services/offlineHelper';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import BillModal from '../../components/common/BillModal';
import { FiShoppingCart, FiPackage, FiUsers, FiTrendingUp, FiDollarSign, FiClock, FiAlertTriangle, FiPrinter, FiSearch, FiEye, FiCreditCard, FiCalendar, FiCheckCircle, FiRotateCcw, FiRefreshCw } from 'react-icons/fi';
import { generateBillPDF } from '../../services/receiptService';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userData, isOwner, isCashier, isCustomer } = useAuth();

  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    todayCreditSales: 0,
    todayCreditCount: 0,
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
  const [viewingBillTxn, setViewingBillTxn] = useState(null);

  // Credit Bills Management States (Any Date / Month & Settle Tracker)
  const [isCreditBillsModalOpen, setIsCreditBillsModalOpen] = useState(false);
  const [todayCreditBills, setTodayCreditBills] = useState([]);
  const [allCreditBills, setAllCreditBills] = useState([]);
  const [creditBillsLoading, setCreditBillsLoading] = useState(false);
  const [creditFilterPeriod, setCreditFilterPeriod] = useState('daily'); // 'daily', 'monthly', 'all_unpaid'
  const [selectedCreditDate, setSelectedCreditDate] = useState(() => getTodayDateString());
  const [selectedCreditMonth, setSelectedCreditMonth] = useState(() => getCurrentMonthString());
  const [creditStatusTab, setCreditStatusTab] = useState('unpaid'); // 'unpaid', 'settled', 'all'
  const [creditBillSearch, setCreditBillSearch] = useState('');
  const [actionCreditId, setActionCreditId] = useState(null);

  // Sales Bills Management States (Any Date / Month & Bill Explorer)
  const [isSalesBillsModalOpen, setIsSalesBillsModalOpen] = useState(false);
  const [allSalesBills, setAllSalesBills] = useState([]);
  const [salesBillsLoading, setSalesBillsLoading] = useState(false);
  const [salesFilterPeriod, setSalesFilterPeriod] = useState('daily'); // 'daily', 'monthly'
  const [selectedSalesDate, setSelectedSalesDate] = useState(() => getTodayDateString());
  const [selectedSalesMonth, setSelectedSalesMonth] = useState(() => getCurrentMonthString());
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('all'); // 'all', 'cash', 'credit', 'card'
  const [salesBillSearch, setSalesBillSearch] = useState('');

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
    const rows = filteredItems.map((item, idx) => {
      const stockNum = Number(item.stock) || 0;
      const isZero = stockNum <= 0;
      const stockDisplay = isZero 
        ? '0 (ඉවරයි)' 
        : `${stockNum % 1 === 0 ? stockNum : stockNum.toFixed(2)} ${item.itemType === 'weighed' ? 'kg' : ''}`;
      
      return `
  <div class="row">
    <span class="row-num">${String(idx + 1).padStart(2, '0')}.</span>
    <div class="row-info">
      <div class="row-name">${item.name || ''}</div>
      ${item.category ? `<div class="row-cat">[${item.category}]</div>` : ''}
    </div>
    <span class="row-stock ${isZero ? 'zero' : ''}">${stockDisplay}</span>
  </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Low Stock Bill - 80mm</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      src: local('Noto Sans Sinhala'), local('Iskoola Pota'), local('Nirmala UI'), url('/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      src: local('Noto Sans Sinhala Bold'), local('Noto Sans Sinhala'), local('Iskoola Pota'), local('Nirmala UI'), url('/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 900;
      src: local('Noto Sans Sinhala Black'), local('Noto Sans Sinhala Bold'), url('/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800;900&display=swap');
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body {
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', 'FMAbhaya', 'Segoe UI', Arial, sans-serif !important;
      font-size: 14px;
      font-weight: 800;
      color: #000000;
      background: #ffffff;
      width: 78mm;
      padding: 3mm 2mm;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .shop-name { 
      font-size: 20px; 
      font-weight: 900; 
      text-align: center; 
      margin-bottom: 3px; 
      color: #000000;
    }
    .shop-sub { 
      font-size: 12.5px; 
      font-weight: 700; 
      text-align: center; 
      color: #000000; 
      line-height: 1.35;
    }
    .divider { 
      border: none; 
      border-top: 2px dashed #000000; 
      margin: 7px 0; 
    }
    .title { 
      font-size: 15px; 
      font-weight: 900; 
      text-align: center; 
      margin: 5px 0; 
      color: #000000;
    }
    .info-box { 
      font-size: 13.5px; 
      font-weight: 800; 
      color: #000000; 
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
    }
    .table-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-weight: 900;
      font-size: 15px;
      color: #000000;
      border-bottom: 2px dashed #000000;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 0;
      border-bottom: 1.5px dashed #000000;
      gap: 6px;
      color: #000000;
    }
    .row-num { 
      width: 26px; 
      font-size: 14.5px; 
      font-weight: 900; 
      flex-shrink: 0; 
      color: #000000; 
    }
    .row-info {
      flex: 1;
      min-width: 0;
    }
    .row-name { 
      font-size: 15.5px; 
      font-weight: 900; 
      word-break: break-word; 
      line-height: 1.3;
      color: #000000;
    }
    .row-cat {
      font-size: 12.5px;
      font-weight: 800;
      color: #000000;
      margin-top: 2px;
    }
    .row-stock {
      width: 75px;
      text-align: right;
      font-size: 15.5px;
      font-weight: 900;
      flex-shrink: 0;
      color: #000000;
    }
    .row-stock.zero {
      font-weight: 900;
      color: #000000;
      text-decoration: underline;
    }
    .footer { 
      text-align: center; 
      margin-top: 10px; 
      font-size: 14px; 
      font-weight: 900; 
      color: #000000; 
    }
    @media print {
      body { width: 78mm; padding: 1mm 1mm; }
      @page { margin: 1mm; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="shop-name">${shopName}</div>
  <div class="shop-sub">${shopAddress}</div>
  <div class="shop-sub">දුරකථන: ${shopPhone}</div>
  <hr class="divider">
  <div class="title">⚠ අඩු තොග වාර්තාව (LOW STOCK)</div>
  <hr class="divider">
  <div class="info-box">
    <span>දිනය: ${dateStr}</span>
  </div>
  <div class="info-box">
    <span>සීමාව: ≤ ${threshold}</span>
    <span>භාණ්ඩ ගණන: ${filteredItems.length}</span>
  </div>
  <hr class="divider">
  <div class="table-head">
    <span style="width: 26px;">No.</span>
    <span style="flex: 1;">භාණ්ඩය</span>
    <span style="width: 75px; text-align: right;">තොගය</span>
  </div>
  ${rows}
  <hr class="divider">
  <div class="footer">මුළු අඩු තොග භාණ්ඩ: ${filteredItems.length}</div>
  <div class="footer" style="font-size: 12px; margin-top: 3px;">SmartPOS - ස්තුතියි!</div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=380,height=600');
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

        // Fetch transactions for Today and Recent
        let todaySales = 0;
        let todayProfit = 0;
        let todayCreditSales = 0;
        let todayCreditBillsList = [];
        let recentTxnsList = [];

        try {
          const todayBounds = getSriLankaTodayBounds();
          const startTimestamp = Timestamp.fromMillis(todayBounds.startMs);

          // 1. Query today's transactions only (drastically reduces network & memory overhead)
          let todayDocs = [];
          try {
            const qToday = query(
              collection(db, 'transactions'),
              where('timestamp', '>=', startTimestamp)
            );
            const todaySnap = await getDocs(qToday);
            todayDocs = todaySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (e) {
            console.warn("Targeted today query failed, trying recent limit fallback:", e);
            const qFallback = query(
              collection(db, 'transactions'),
              orderBy('timestamp', 'desc'),
              limit(100)
            );
            const fallbackSnap = await getDocs(qFallback);
            todayDocs = fallbackSnap.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(d => isToday(d.timestamp || d.date));
          }

          todayDocs.forEach(data => {
            const total = Number(data.total) || 0;
            if (data.timestamp?.seconds) {
              calibrateFromTimestamp(data.timestamp.seconds);
            }

            if (isToday(data.timestamp || data.date)) {
              todaySales += total;

              // Calculate credit sales for today
              const pMethod = (data.paymentMethod || '').toLowerCase();
              if (pMethod === 'credit') {
                const upfront = Number(data.paidAmount !== undefined ? data.paidAmount : (data.tenderedAmount || 0));
                let credAmt = 0;
                if (data.creditAmount !== undefined && data.creditAmount !== null && Number(data.creditAmount) > 0) {
                  credAmt = Number(data.creditAmount);
                } else if (total > upfront) {
                  credAmt = Math.max(0, total - upfront);
                }
                if (credAmt > 0) {
                  todayCreditSales += credAmt;
                  todayCreditBillsList.push({ ...data, effectiveCredit: credAmt });
                }
              }

              // Calculate cost and profit for today's transactions
              let txnCost = 0;
              if (data.items && Array.isArray(data.items)) {
                data.items.forEach(item => {
                  const invItem = itemsMap[item.id] || itemsMap[item.name];
                  const unitCost = (item.purchasePrice !== undefined && item.purchasePrice !== null && !isNaN(Number(item.purchasePrice)))
                    ? Number(item.purchasePrice)
                    : (invItem ? (Number(invItem.purchasePrice) || 0) : 0);
                  txnCost += (Number(item.quantity) || 0) * unitCost;
                });
              }
              todayProfit += (total - txnCost);
            }
          });

          // Sort today's credit bills descending by time
          todayCreditBillsList.sort((a, b) => {
            const tB = toDateObject(b.timestamp || b.date)?.getTime() || 0;
            const tA = toDateObject(a.timestamp || a.date)?.getTime() || 0;
            return tB - tA;
          });
          setTodayCreditBills(todayCreditBillsList);

          // 2. Fetch Recent 5 transactions
          try {
            const qRecent = query(
              collection(db, 'transactions'),
              orderBy('timestamp', 'desc'),
              limit(5)
            );
            const recentSnap = await getDocs(qRecent);
            recentTxnsList = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (e) {
            recentTxnsList = [...todayDocs].sort((a, b) => {
              const tB = toDateObject(b.timestamp || b.date)?.getTime() || 0;
              const tA = toDateObject(a.timestamp || a.date)?.getTime() || 0;
              return tB - tA;
            }).slice(0, 5);
          }
        } catch (e) {
          console.warn("Could not fetch transactions:", e);
        }

        setRecentTxns(recentTxnsList);

        // Fetch users / debtors count
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
          todayCreditSales,
          todayCreditCount: todayCreditBillsList.length,
          totalItems,
          totalUsers,
          totalSales: todaySales,
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

  // Fetch all credit transactions for Date / Month filtering & settlement tracker
  const fetchAllCreditBills = async () => {
    setCreditBillsLoading(true);
    try {
      let docs = [];
      try {
        const qCredit = query(
          collection(db, 'transactions'),
          where('paymentMethod', '==', 'credit')
        );
        const snap = await getDocs(qCredit);
        docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (qErr) {
        console.warn("Targeted credit query failed, scanning transactions as fallback:", qErr);
        const snap = await getDocs(collection(db, 'transactions'));
        docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => (d.paymentMethod || '').toLowerCase() === 'credit' || Number(d.creditAmount || 0) > 0);
      }

      const list = docs
        .map(d => {
          const total = Number(d.total || 0);
          const upfront = Number(d.paidAmount !== undefined ? d.paidAmount : (d.tenderedAmount || 0));
          let credAmt = 0;
          if (d.creditAmount !== undefined && d.creditAmount !== null && Number(d.creditAmount) > 0) {
            credAmt = Number(d.creditAmount);
          } else if (total > upfront && (d.paymentMethod || '').toLowerCase() === 'credit') {
            credAmt = Math.max(0, total - upfront);
          }
          return {
            ...d,
            effectiveCredit: credAmt,
            effectivePaid: upfront,
            isSettled: Boolean(d.creditSettled) || credAmt <= 0
          };
        })
        .filter(d => d.effectiveCredit > 0);

      list.sort((a, b) => {
        const tB = toDateObject(b.timestamp || b.date)?.getTime() || 0;
        const tA = toDateObject(a.timestamp || a.date)?.getTime() || 0;
        return tB - tA;
      });

      setAllCreditBills(list);
    } catch (err) {
      console.error("Error fetching credit bills:", err);
    } finally {
      setCreditBillsLoading(false);
    }
  };

  // Auto-refresh credit bills when modal opens
  useEffect(() => {
    if (isCreditBillsModalOpen) {
      fetchAllCreditBills();
    }
  }, [isCreditBillsModalOpen]);

  // Mark credit bill as settled (Customer paid)
  const handleMarkCreditSettled = async (bill) => {
    const credAmt = Number(bill.effectiveCredit || bill.creditAmount || bill.total || 0);
    const billNo = bill.billNumber ? `#${bill.billNumber}` : bill.id.substring(0, 8);
    const debtorName = bill.debtorName || 'පාරිභෝගිකයා';

    const confirmMsg = `මෙම ණය බිල්පත (${billNo} - ${debtorName}) සඳහා රු. ${credAmt.toFixed(2)} ක මුදල පාරිභෝගිකයා විසින් ගෙවා ඇති බව සටහන් කර නොගෙවූ ලැයිස්තුවෙන් ඉවත් කිරීමට අවශ්‍යද?`;
    if (!window.confirm(confirmMsg)) return;

    setActionCreditId(bill.id);
    try {
      // 1. Update transaction document in Firestore
      const txnRef = doc(db, 'transactions', bill.id);
      await updateDoc(txnRef, {
        creditSettled: true,
        creditSettledAt: serverTimestamp(),
        creditSettledBy: userData?.name || 'Cashier',
        creditSettledAmount: credAmt
      });

      // 2. Sync with Debtor account if linked
      if (bill.debtorId) {
        try {
          await updateDoc(doc(db, 'debtors', bill.debtorId), {
            totalOwed: increment(-credAmt),
            lastPaymentDate: serverTimestamp()
          });

          await setDoc(doc(collection(db, 'debtor_payments')), {
            debtorId: bill.debtorId,
            debtorName: bill.debtorName || 'නොදන්නා',
            amount: credAmt,
            type: 'payment',
            note: `බිල්පත් අංක ${billNo} සඳහා ණය පියවීම`,
            billId: bill.id,
            billNumber: bill.billNumber || null,
            cashierName: userData?.name || 'Cashier',
            createdAt: serverTimestamp()
          });
        } catch (debErr) {
          console.warn("Could not sync debtor balance:", debErr);
        }
      }

      // 3. Update local state immediately so it disappears from the active/unpaid view
      setAllCreditBills(prev => prev.map(b => (b.id === bill.id ? { ...b, creditSettled: true, isSettled: true } : b)));
      setTodayCreditBills(prev => prev.map(b => (b.id === bill.id ? { ...b, creditSettled: true, isSettled: true } : b)));
    } catch (err) {
      console.error("Error settling credit bill:", err);
      alert("ණය පියවීම සටහන් කිරීමේදී දෝෂයක් සිදු විය: " + err.message);
    } finally {
      setActionCreditId(null);
    }
  };

  // Revert settled credit bill back to unpaid (in case of mistake)
  const handleUnmarkCreditSettled = async (bill) => {
    const credAmt = Number(bill.effectiveCredit || bill.creditAmount || bill.total || 0);
    const billNo = bill.billNumber ? `#${bill.billNumber}` : bill.id.substring(0, 8);

    if (!window.confirm(`මෙම බිල්පත (${billNo}) නැවත නොගෙවූ ණය ලැයිස්තුවට ඇතුළත් කිරීමට අවශ්‍යද?`)) return;

    setActionCreditId(bill.id);
    try {
      const txnRef = doc(db, 'transactions', bill.id);
      await updateDoc(txnRef, {
        creditSettled: false,
        creditSettledAt: null,
        creditSettledBy: null
      });

      if (bill.debtorId) {
        try {
          await updateDoc(doc(db, 'debtors', bill.debtorId), {
            totalOwed: increment(credAmt)
          });
        } catch (debErr) {
          console.warn("Could not revert debtor balance:", debErr);
        }
      }

      setAllCreditBills(prev => prev.map(b => (b.id === bill.id ? { ...b, creditSettled: false, isSettled: false } : b)));
      setTodayCreditBills(prev => prev.map(b => (b.id === bill.id ? { ...b, creditSettled: false, isSettled: false } : b)));
    } catch (err) {
      console.error("Error unmarking settled bill:", err);
      alert("දෝෂය: " + err.message);
    } finally {
      setActionCreditId(null);
    }
  };

  // Fetch all sales transactions for Date / Month explorer
  const fetchAllSalesBills = async () => {
    setSalesBillsLoading(true);
    try {
      let docs = [];
      try {
        const qSales = query(
          collection(db, 'transactions'),
          orderBy('timestamp', 'desc'),
          limit(1500)
        );
        const snap = await getDocs(qSales);
        docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (qErr) {
        console.warn("Targeted sales query failed, scanning transactions as fallback:", qErr);
        const snap = await getDocs(collection(db, 'transactions'));
        docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      const list = docs.map(d => {
        const total = Number(d.total || 0);
        const upfront = Number(d.paidAmount !== undefined ? d.paidAmount : (d.tenderedAmount || 0));
        const credAmt = d.creditAmount !== undefined && d.creditAmount !== null
          ? Number(d.creditAmount)
          : Math.max(0, total - upfront);
        return {
          ...d,
          effectiveCredit: credAmt,
          effectivePaid: upfront
        };
      });

      list.sort((a, b) => {
        const tB = toDateObject(b.timestamp || b.date)?.getTime() || 0;
        const tA = toDateObject(a.timestamp || a.date)?.getTime() || 0;
        return tB - tA;
      });

      setAllSalesBills(list);
    } catch (err) {
      console.error("Error fetching sales bills:", err);
    } finally {
      setSalesBillsLoading(false);
    }
  };

  // Auto-refresh sales bills when sales modal opens
  useEffect(() => {
    if (isSalesBillsModalOpen) {
      fetchAllSalesBills();
    }
  }, [isSalesBillsModalOpen]);

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
    if (inputPass !== "7334126411") {
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
    { 
      icon: <FiShoppingCart />, 
      label: t('dashboard.todaySales'), 
      value: `Rs. ${stats.todaySales.toFixed(2)}`, 
      color: 'purple',
      onClick: () => {
        setSelectedSalesDate(getTodayDateString());
        setSalesFilterPeriod('daily');
        setIsSalesBillsModalOpen(true);
      }
    },
    { icon: <FiCreditCard />, label: t('dashboard.todayCreditSales') || 'අද ණය විකුණුම්', value: `Rs. ${(stats.todayCreditSales || 0).toFixed(2)}`, color: 'orange', onClick: () => setIsCreditBillsModalOpen(true) },
    { icon: <FiTrendingUp />, label: "Today's Profit", value: `Rs. ${stats.todayProfit.toFixed(2)}`, color: 'green' },
    { icon: <FiPackage />, label: t('dashboard.totalItems'), value: String(stats.totalItems), color: 'cyan' },
    { icon: <FiUsers />, label: t('dashboard.totalUsers'), value: String(stats.totalUsers), color: 'green' },
    { icon: <FiAlertTriangle />, label: t('reports.lowStock'), value: String(stats.lowStockCount), color: 'red', onClick: () => setIsLowStockModalOpen(true) },
  ];

  const cashierStats = [
    { 
      icon: <FiShoppingCart />, 
      label: t('dashboard.todaySales'), 
      value: `Rs. ${stats.todaySales.toFixed(2)}`, 
      color: 'purple',
      onClick: () => {
        setSelectedSalesDate(getTodayDateString());
        setSalesFilterPeriod('daily');
        setIsSalesBillsModalOpen(true);
      }
    },
    { icon: <FiCreditCard />, label: t('dashboard.todayCreditSales') || 'අද ණය විකුණුම්', value: `Rs. ${(stats.todayCreditSales || 0).toFixed(2)}`, color: 'orange', onClick: () => setIsCreditBillsModalOpen(true) },
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="txn-amount-badge">
                        Rs. {Number(txn.total || 0).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingBillTxn(txn)}
                        title="බිල්පත බලන්න (View Bill)"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.35)',
                          background: 'rgba(139, 92, 246, 0.12)',
                          color: '#8b5cf6',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiEye /> Bill
                      </button>
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

      {/* CREDIT BILLS & SETTLEMENT MODAL */}
      <Modal
        isOpen={isCreditBillsModalOpen}
        onClose={() => {
          setIsCreditBillsModalOpen(false);
          setCreditBillSearch('');
        }}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCreditCard style={{ color: '#f59e0b', fontSize: '20px' }} />
            <span>ණය විකුණුම් හා නොගෙවූ බිල්පත් (Credit Sales & Debts)</span>
          </span>
        }
        maxWidth="820px"
      >
        <div className="credit-bills-modal-content">
          {/* Controls: Period Switcher & Date/Month Pickers */}
          <div className="credit-control-box">
            <div className="credit-period-segmented">
              <button
                type="button"
                className={`credit-period-btn ${creditFilterPeriod === 'daily' ? 'active' : ''}`}
                onClick={() => setCreditFilterPeriod('daily')}
              >
                <FiCalendar /> දින අනුව (Daily)
              </button>
              <button
                type="button"
                className={`credit-period-btn ${creditFilterPeriod === 'monthly' ? 'active' : ''}`}
                onClick={() => setCreditFilterPeriod('monthly')}
              >
                🗓️ මාස අනුව (Monthly)
              </button>
              <button
                type="button"
                className={`credit-period-btn ${creditFilterPeriod === 'all_unpaid' ? 'active' : ''}`}
                onClick={() => {
                  setCreditFilterPeriod('all_unpaid');
                  setCreditStatusTab('unpaid');
                }}
              >
                ⏳ නොගෙවූ සියල්ල (All Unpaid)
              </button>
            </div>

            {/* Daily Picker Controls */}
            {creditFilterPeriod === 'daily' && (
              <div className="credit-picker-row">
                <div className="credit-input-group">
                  <FiCalendar style={{ color: '#8b5cf6' }} />
                  <input
                    type="date"
                    className="credit-date-input"
                    value={selectedCreditDate}
                    onChange={(e) => setSelectedCreditDate(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`credit-quick-btn ${selectedCreditDate === getTodayDateString() ? 'active' : ''}`}
                  onClick={() => setSelectedCreditDate(getTodayDateString())}
                >
                  අද (Today)
                </button>
                <button
                  type="button"
                  className={`credit-quick-btn ${(() => {
                    const yParts = getSriLankaDateParts(getTrueUtcMs() - 86400000);
                    const yStr = `${yParts.year}-${String(yParts.month + 1).padStart(2, '0')}-${String(yParts.date).padStart(2, '0')}`;
                    return selectedCreditDate === yStr ? 'active' : '';
                  })()}`}
                  onClick={() => {
                    const yParts = getSriLankaDateParts(getTrueUtcMs() - 86400000);
                    const yStr = `${yParts.year}-${String(yParts.month + 1).padStart(2, '0')}-${String(yParts.date).padStart(2, '0')}`;
                    setSelectedCreditDate(yStr);
                  }}
                >
                  ඊයේ (Yesterday)
                </button>
                <button
                  type="button"
                  className="credit-quick-btn"
                  onClick={fetchAllCreditBills}
                  disabled={creditBillsLoading}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="නැවත ලබාගන්න (Refresh)"
                >
                  <FiRefreshCw style={{ animation: creditBillsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {creditBillsLoading ? 'යාවත්කාලීන වේ...' : 'Refresh'}
                </button>
              </div>
            )}

            {/* Monthly Picker Controls */}
            {creditFilterPeriod === 'monthly' && (
              <div className="credit-picker-row">
                <div className="credit-input-group">
                  <span>🗓️</span>
                  <input
                    type="month"
                    className="credit-date-input"
                    value={selectedCreditMonth}
                    onChange={(e) => setSelectedCreditMonth(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`credit-quick-btn ${selectedCreditMonth === getCurrentMonthString() ? 'active' : ''}`}
                  onClick={() => setSelectedCreditMonth(getCurrentMonthString())}
                >
                  මෙම මාසය (This Month)
                </button>
                <button
                  type="button"
                  className="credit-quick-btn"
                  onClick={fetchAllCreditBills}
                  disabled={creditBillsLoading}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="නැවත ලබාගන්න (Refresh)"
                >
                  <FiRefreshCw style={{ animation: creditBillsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {creditBillsLoading ? 'යාවත්කාලීන වේ...' : 'Refresh'}
                </button>
              </div>
            )}

            {/* All Unpaid Info */}
            {creditFilterPeriod === 'all_unpaid' && (
              <div className="credit-picker-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  📌 දිනය නොසලකා මේ දක්වා පාරිභෝගිකයින් විසින් ගෙවා නොමැති සියලුම ණය බිල්පත් මෙහි පෙන්වයි.
                </span>
                <button
                  type="button"
                  className="credit-quick-btn"
                  onClick={fetchAllCreditBills}
                  disabled={creditBillsLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="නැවත ලබාගන්න (Refresh)"
                >
                  <FiRefreshCw style={{ animation: creditBillsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {creditBillsLoading ? 'යාවත්කාලීන වේ...' : 'Refresh'}
                </button>
              </div>
            )}
          </div>

          {(() => {
            // Filter list by selected period
            const periodBills = allCreditBills.filter(b => {
              if (Number(b.effectiveCredit || 0) <= 0) return false;
              if (creditFilterPeriod === 'daily') {
                return toSriLankaDateString(b.timestamp || b.date) === selectedCreditDate;
              }
              if (creditFilterPeriod === 'monthly') {
                return toSriLankaMonthString(b.timestamp || b.date) === selectedCreditMonth;
              }
              // 'all_unpaid'
              return !b.isSettled;
            });

            // Calculate Period Financial Totals
            const totalCreditSum = periodBills.reduce((acc, b) => acc + (b.effectiveCredit || 0), 0);
            const unpaidBillsList = periodBills.filter(b => !b.isSettled);
            const unpaidCreditSum = unpaidBillsList.reduce((acc, b) => acc + (b.effectiveCredit || 0), 0);
            const settledBillsList = periodBills.filter(b => b.isSettled);
            const settledCreditSum = settledBillsList.reduce((acc, b) => acc + (b.effectiveCredit || 0), 0);

            // Filter by Status Tab
            let statusFiltered = periodBills;
            if (creditStatusTab === 'unpaid') {
              statusFiltered = unpaidBillsList;
            } else if (creditStatusTab === 'settled') {
              statusFiltered = settledBillsList;
            }

            // Filter by Search Input
            const q = creditBillSearch.toLowerCase().trim();
            const displayedBills = statusFiltered.filter(b => {
              if (!q) return true;
              const billNoStr = b.billNumber ? String(b.billNumber) : '';
              const customerStr = (b.debtorName || '').toLowerCase();
              const phoneStr = (b.debtorPhone || '').toLowerCase();
              return billNoStr.includes(q.replace('#', '')) ||
                customerStr.includes(q) ||
                phoneStr.includes(q);
            });

            return (
              <>
                {/* Summary KPI Cards */}
                <div className="credit-kpi-grid">
                  <div className="credit-kpi-card total">
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>
                      මුළු ණය (Total Credit)
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706' }}>
                      Rs. {totalCreditSum.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      බිල්පත් {periodBills.length} ක්
                    </span>
                  </div>

                  <div className="credit-kpi-card unpaid">
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
                      නොගෙවූ ණය (Pending)
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>
                      Rs. {unpaidCreditSum.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      නොගෙවූ බිල්පත් {unpaidBillsList.length} ක්
                    </span>
                  </div>

                  <div className="credit-kpi-card settled">
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                      ගෙවා අවසන් (Settled)
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                      Rs. {settledCreditSum.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      පියවූ බිල්පත් {settledBillsList.length} ක්
                    </span>
                  </div>
                </div>

                {/* Status Tabs Navigation */}
                {creditFilterPeriod !== 'all_unpaid' && (
                  <div className="credit-status-nav">
                    <button
                      type="button"
                      className={`credit-status-tab ${creditStatusTab === 'unpaid' ? 'active-unpaid' : ''}`}
                      onClick={() => setCreditStatusTab('unpaid')}
                    >
                      🔴 නොගෙවූ ණය <span className="credit-tab-badge">{unpaidBillsList.length}</span>
                    </button>
                    <button
                      type="button"
                      className={`credit-status-tab ${creditStatusTab === 'settled' ? 'active-settled' : ''}`}
                      onClick={() => setCreditStatusTab('settled')}
                    >
                      🟢 ගෙවා අවසන් <span className="credit-tab-badge">{settledBillsList.length}</span>
                    </button>
                    <button
                      type="button"
                      className={`credit-status-tab ${creditStatusTab === 'all' ? 'active-all' : ''}`}
                      onClick={() => setCreditStatusTab('all')}
                    >
                      📋 සියල්ල <span className="credit-tab-badge">{periodBills.length}</span>
                    </button>
                  </div>
                )}

                {/* Search Box */}
                <div className="search-box glass-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <FiSearch style={{ color: 'var(--text-secondary)', fontSize: '18px' }} />
                  <input
                    type="text"
                    placeholder="බිල් අංකය (#), ණයගැතියාගේ නම හෝ දුරකථන අංකය සොයන්න..."
                    value={creditBillSearch}
                    onChange={(e) => setCreditBillSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      fontWeight: 600
                    }}
                  />
                  {creditBillSearch && (
                    <button
                      type="button"
                      onClick={() => setCreditBillSearch('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Bills List */}
                <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {creditBillsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                      <FiRefreshCw style={{ fontSize: '30px', animation: 'spin 1s linear infinite', marginBottom: '8px', color: 'var(--primary-400)' }} />
                      <p style={{ fontWeight: 700 }}>ණය බිල්පත් ලබාගනිමින් පවතී...</p>
                    </div>
                  ) : displayedBills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>💳</div>
                      <p style={{ fontWeight: 700, fontSize: '15px' }}>
                        {creditBillSearch 
                          ? 'සෙවීමට ගැළපෙන ණය බිල්පත් හමු නොවීය.'
                          : creditStatusTab === 'unpaid'
                            ? 'තෝරාගත් කාල සීමාව තුළ නොගෙවූ ණය කිසිවක් නොමැත.'
                            : 'තෝරාගත් කාල සීමාව තුළ ණය බිල්පත් හමු නොවීය.'}
                      </p>
                    </div>
                  ) : (
                    displayedBills.map(bill => {
                      const billNo = bill.billNumber ? `#${String(bill.billNumber).padStart(6, '0')}` : bill.id.substring(0, 8);
                      const timeStr = formatSriLankaTime(bill.timestamp || bill.date);
                      const dateStr = toSriLankaDateString(bill.timestamp || bill.date);
                      const credAmt = bill.effectiveCredit !== undefined ? Number(bill.effectiveCredit) : Number(bill.creditAmount || bill.total || 0);
                      const totalAmt = Number(bill.total || 0);
                      const upfront = Number(bill.effectivePaid !== undefined ? bill.effectivePaid : (bill.paidAmount || bill.tenderedAmount || 0));
                      const isSettled = Boolean(bill.isSettled);

                      return (
                        <div
                          key={bill.id}
                          className={`credit-bill-item ${isSettled ? 'settled-item' : 'unpaid-item'}`}
                        >
                          {/* Left: Bill info & Customer */}
                          <div style={{ flex: '1 1 230px', minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: isSettled ? 'rgba(16, 185, 129, 0.15)' : '#fef3c7',
                                color: isSettled ? '#10b981' : '#b45309',
                                fontWeight: 800,
                                fontSize: '13px',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {billNo}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <FiCalendar style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                {dateStr}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <FiClock style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                {timeStr}
                              </span>
                            </div>

                            <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '3px' }}>
                              👤 {bill.debtorName || 'වෙනත් ණය'}
                              {bill.debtorPhone && (
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '6px' }}>
                                  ({bill.debtorPhone})
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {bill.items?.length || 0} භාණ්ඩ • අයකැමි: {bill.cashierName || 'Cashier'}
                            </div>

                            {isSettled && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                                <FiCheckCircle /> මුදල් ගෙවා අවසන් {bill.creditSettledBy ? `(${bill.creditSettledBy})` : ''}
                              </div>
                            )}
                          </div>

                          {/* Center: Financial amounts */}
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              මුළු එකතුව: Rs. {totalAmt.toFixed(2)}
                            </div>
                            {upfront > 0 && (
                              <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 700 }}>
                                මුදලින් ගෙවූ: Rs. {upfront.toFixed(2)}
                              </div>
                            )}
                            <div style={{ fontSize: '16.5px', fontWeight: 900, color: isSettled ? '#10b981' : '#dc2626' }}>
                              ණය මුදල: Rs. {credAmt.toFixed(2)}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Settlement Action Button */}
                            {!isSettled ? (
                              <button
                                type="button"
                                className="btn-mark-settled"
                                onClick={() => handleMarkCreditSettled(bill)}
                                disabled={actionCreditId === bill.id}
                                title="පාරිභෝගිකයා මුදල් ගෙවා ඇති බව සටහන් කර නොගෙවූ ලැයිස්තුවෙන් ඉවත් කරන්න"
                              >
                                <FiCheckCircle />
                                {actionCreditId === bill.id ? 'සුරකිමින්...' : '✓ මුදල් ගෙවා ඇත'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUnmarkCreditSettled(bill)}
                                disabled={actionCreditId === bill.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  cursor: 'pointer'
                                }}
                                title="නැවත නොගෙවූ ලෙස සලකන්න (Undo)"
                              >
                                <FiRotateCcw /> Undo
                              </button>
                            )}

                            {/* View Bill */}
                            <button
                              type="button"
                              onClick={() => setViewingBillTxn(bill)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#6366f1',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                cursor: 'pointer'
                              }}
                              title="බිල්පත බලන්න (View Bill)"
                            >
                              <FiEye /> බිල්පත
                            </button>

                            {/* Print Bill */}
                            <button
                              type="button"
                              onClick={() => generateBillPDF(bill)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer'
                              }}
                              title="මුද්‍රණය කරන්න (Print Receipt)"
                            >
                              <FiPrinter /> Print
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* SALES BILLS EXPLORER MODAL */}
      <Modal
        isOpen={isSalesBillsModalOpen}
        onClose={() => {
          setIsSalesBillsModalOpen(false);
          setSalesBillSearch('');
        }}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiShoppingCart style={{ color: '#8b5cf6', fontSize: '20px' }} />
            <span>විකුණුම් බිල්පත් පරීක්ෂාව (Sales Bills Explorer)</span>
          </span>
        }
        maxWidth="840px"
      >
        <div className="credit-bills-modal-content">
          {/* Controls: Period Switcher & Date/Month Pickers */}
          <div className="credit-control-box">
            <div className="credit-period-segmented">
              <button
                type="button"
                className={`credit-period-btn ${salesFilterPeriod === 'daily' ? 'active' : ''}`}
                onClick={() => setSalesFilterPeriod('daily')}
              >
                <FiCalendar /> දින අනුව (Daily)
              </button>
              <button
                type="button"
                className={`credit-period-btn ${salesFilterPeriod === 'monthly' ? 'active' : ''}`}
                onClick={() => setSalesFilterPeriod('monthly')}
              >
                🗓️ මාස අනුව (Monthly)
              </button>
            </div>

            {/* Daily Picker Controls */}
            {salesFilterPeriod === 'daily' && (
              <div className="credit-picker-row">
                <div className="credit-input-group">
                  <FiCalendar style={{ color: '#8b5cf6' }} />
                  <input
                    type="date"
                    className="credit-date-input"
                    value={selectedSalesDate}
                    onChange={(e) => setSelectedSalesDate(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`credit-quick-btn ${selectedSalesDate === getTodayDateString() ? 'active' : ''}`}
                  onClick={() => setSelectedSalesDate(getTodayDateString())}
                >
                  අද (Today)
                </button>
                <button
                  type="button"
                  className={`credit-quick-btn ${(() => {
                    const yParts = getSriLankaDateParts(getTrueUtcMs() - 86400000);
                    const yStr = `${yParts.year}-${String(yParts.month + 1).padStart(2, '0')}-${String(yParts.date).padStart(2, '0')}`;
                    return selectedSalesDate === yStr ? 'active' : '';
                  })()}`}
                  onClick={() => {
                    const yParts = getSriLankaDateParts(getTrueUtcMs() - 86400000);
                    const yStr = `${yParts.year}-${String(yParts.month + 1).padStart(2, '0')}-${String(yParts.date).padStart(2, '0')}`;
                    setSelectedSalesDate(yStr);
                  }}
                >
                  ඊයේ (Yesterday)
                </button>
                <button
                  type="button"
                  className="credit-quick-btn"
                  onClick={fetchAllSalesBills}
                  disabled={salesBillsLoading}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="නැවත ලබාගන්න (Refresh)"
                >
                  <FiRefreshCw style={{ animation: salesBillsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {salesBillsLoading ? 'යාවත්කාලීන වේ...' : 'Refresh'}
                </button>
              </div>
            )}

            {/* Monthly Picker Controls */}
            {salesFilterPeriod === 'monthly' && (
              <div className="credit-picker-row">
                <div className="credit-input-group">
                  <span>🗓️</span>
                  <input
                    type="month"
                    className="credit-date-input"
                    value={selectedSalesMonth}
                    onChange={(e) => setSelectedSalesMonth(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`credit-quick-btn ${selectedSalesMonth === getCurrentMonthString() ? 'active' : ''}`}
                  onClick={() => setSelectedSalesMonth(getCurrentMonthString())}
                >
                  මෙම මාසය (This Month)
                </button>
                <button
                  type="button"
                  className="credit-quick-btn"
                  onClick={fetchAllSalesBills}
                  disabled={salesBillsLoading}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="නැවත ලබාගන්න (Refresh)"
                >
                  <FiRefreshCw style={{ animation: salesBillsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {salesBillsLoading ? 'යාවත්කාලීන වේ...' : 'Refresh'}
                </button>
              </div>
            )}
          </div>

          {(() => {
            // Filter by Period (Daily / Monthly)
            const periodSalesBills = allSalesBills.filter(b => {
              if (salesFilterPeriod === 'daily') {
                return toSriLankaDateString(b.timestamp || b.date) === selectedSalesDate;
              }
              return toSriLankaMonthString(b.timestamp || b.date) === selectedSalesMonth;
            });

            // Financial Breakdown
            const totalSalesSum = periodSalesBills.reduce((acc, b) => acc + Number(b.total || 0), 0);
            
            const cashBills = periodSalesBills.filter(b => {
              const m = (b.paymentMethod || '').toLowerCase();
              return m === 'cash' || (!m && !b.creditAmount);
            });
            const cashSalesSum = cashBills.reduce((acc, b) => acc + Number(b.total || 0), 0);

            const creditBills = periodSalesBills.filter(b => {
              const m = (b.paymentMethod || '').toLowerCase();
              return m === 'credit' || Number(b.creditAmount || 0) > 0;
            });
            const creditSalesSum = creditBills.reduce((acc, b) => acc + Number(b.effectiveCredit || b.creditAmount || b.total || 0), 0);

            const cardBills = periodSalesBills.filter(b => (b.paymentMethod || '').toLowerCase() === 'card');
            const cardSalesSum = cardBills.reduce((acc, b) => acc + Number(b.total || 0), 0);

            // Filter by Payment Method Tab
            let paymentFiltered = periodSalesBills;
            if (salesPaymentFilter === 'cash') paymentFiltered = cashBills;
            else if (salesPaymentFilter === 'credit') paymentFiltered = creditBills;
            else if (salesPaymentFilter === 'card') paymentFiltered = cardBills;

            // Filter by Search Query
            const q = salesBillSearch.toLowerCase().trim();
            const displayedBills = paymentFiltered.filter(b => {
              if (!q) return true;
              const billNoStr = b.billNumber ? String(b.billNumber) : '';
              const customerStr = (b.debtorName || b.customerName || '').toLowerCase();
              const phoneStr = (b.debtorPhone || b.customerPhone || '').toLowerCase();
              const cashierStr = (b.cashierName || '').toLowerCase();
              const payMethodStr = (b.paymentMethod || '').toLowerCase();
              return billNoStr.includes(q.replace('#', '')) ||
                customerStr.includes(q) ||
                phoneStr.includes(q) ||
                cashierStr.includes(q) ||
                payMethodStr.includes(q);
            });

            return (
              <>
                {/* Summary KPI Cards */}
                <div className="credit-kpi-grid">
                  <div className="credit-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(109, 40, 217, 0.06))', border: '1.5px solid #8b5cf6' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>
                      මුළු විකුණුම් (Total Sales)
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8b5cf6' }}>
                      Rs. {totalSalesSum.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      මුළු බිල්පත් {periodSalesBills.length} ක්
                    </span>
                  </div>

                  <div className="credit-kpi-card settled">
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                      මුදලින් (Cash)
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                      Rs. {cashSalesSum.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      බිල්පත් {cashBills.length} ක්
                    </span>
                  </div>

                  <div className="credit-kpi-card total">
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>
                      ණයට (Credit)
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706' }}>
                      Rs. {creditSalesSum.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      බිල්පත් {creditBills.length} ක්
                    </span>
                  </div>

                  {cardSalesSum > 0 && (
                    <div className="credit-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.06))', border: '1.5px solid #06b6d4' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase' }}>
                        කාඩ්පත් (Card)
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#06b6d4' }}>
                        Rs. {cardSalesSum.toFixed(2)}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        බිල්පත් {cardBills.length} ක්
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Method Filter Tabs */}
                <div className="credit-status-nav">
                  <button
                    type="button"
                    className={`credit-status-tab ${salesPaymentFilter === 'all' ? 'active-all' : ''}`}
                    onClick={() => setSalesPaymentFilter('all')}
                  >
                    📋 සියල්ල <span className="credit-tab-badge">{periodSalesBills.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`credit-status-tab ${salesPaymentFilter === 'cash' ? 'active-settled' : ''}`}
                    onClick={() => setSalesPaymentFilter('cash')}
                  >
                    💵 මුදල් (Cash) <span className="credit-tab-badge">{cashBills.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`credit-status-tab ${salesPaymentFilter === 'credit' ? 'active-unpaid' : ''}`}
                    onClick={() => setSalesPaymentFilter('credit')}
                  >
                    💳 ණය (Credit) <span className="credit-tab-badge">{creditBills.length}</span>
                  </button>
                  {cardBills.length > 0 && (
                    <button
                      type="button"
                      className={`credit-status-tab ${salesPaymentFilter === 'card' ? 'active-all' : ''}`}
                      onClick={() => setSalesPaymentFilter('card')}
                    >
                      💳 කාඩ්පත් <span className="credit-tab-badge">{cardBills.length}</span>
                    </button>
                  )}
                </div>

                {/* Search Box */}
                <div className="search-box glass-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <FiSearch style={{ color: 'var(--text-secondary)', fontSize: '18px' }} />
                  <input
                    type="text"
                    placeholder="බිල් අංකය (#), පාරිභෝගිකයා, දුරකථන අංකය හෝ අයකැමි සොයන්න..."
                    value={salesBillSearch}
                    onChange={(e) => setSalesBillSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      fontWeight: 600
                    }}
                  />
                  {salesBillSearch && (
                    <button
                      type="button"
                      onClick={() => setSalesBillSearch('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Bills List */}
                <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {salesBillsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                      <FiRefreshCw style={{ fontSize: '30px', animation: 'spin 1s linear infinite', marginBottom: '8px', color: 'var(--primary-400)' }} />
                      <p style={{ fontWeight: 700 }}>විකුණුම් බිල්පත් ලබාගනිමින් පවතී...</p>
                    </div>
                  ) : displayedBills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>🧾</div>
                      <p style={{ fontWeight: 700, fontSize: '15px' }}>
                        {salesBillSearch ? 'සෙවීමට ගැළපෙන බිල්පත් හමු නොවීය.' : 'තෝරාගත් කාල සීමාව තුළ කිසිදු විකුණුම් බිල්පතක් නොමැත.'}
                      </p>
                    </div>
                  ) : (
                    displayedBills.map(bill => {
                      const billNo = bill.billNumber ? `#${String(bill.billNumber).padStart(6, '0')}` : bill.id.substring(0, 8);
                      const timeStr = formatSriLankaTime(bill.timestamp || bill.date);
                      const dateStr = toSriLankaDateString(bill.timestamp || bill.date);
                      const totalAmt = Number(bill.total || 0);
                      const pMethod = (bill.paymentMethod || 'cash').toLowerCase();
                      const credAmt = Number(bill.effectiveCredit || bill.creditAmount || 0);
                      const upfront = Number(bill.effectivePaid !== undefined ? bill.effectivePaid : (bill.paidAmount || bill.tenderedAmount || 0));

                      return (
                        <div
                          key={bill.id}
                          className="credit-bill-item"
                          style={{
                            borderLeft: pMethod === 'credit' ? '4px solid #f59e0b' : pMethod === 'card' ? '4px solid #6366f1' : '4px solid #10b981'
                          }}
                        >
                          {/* Left: Bill Info */}
                          <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: '#a78bfa',
                                fontWeight: 800,
                                fontSize: '13px',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {billNo}
                              </span>

                              {/* Payment badge */}
                              {pMethod === 'credit' ? (
                                <span className="payment-badge credit">💳 ණය</span>
                              ) : pMethod === 'card' ? (
                                <span className="payment-badge card">💳 කාඩ්</span>
                              ) : (
                                <span className="payment-badge cash">💵 මුදලින්</span>
                              )}

                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <FiCalendar style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                {dateStr}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <FiClock style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                {timeStr}
                              </span>
                            </div>

                            {(bill.debtorName || bill.customerName) && (
                              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                👤 {bill.debtorName || bill.customerName}
                                {(bill.debtorPhone || bill.customerPhone) && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '6px' }}>
                                    ({bill.debtorPhone || bill.customerPhone})
                                  </span>
                                )}
                              </div>
                            )}

                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {bill.items?.length || 0} භාණ්ඩ • අයකැමි: {bill.cashierName || 'Cashier'}
                            </div>
                          </div>

                          {/* Center: Financial amounts */}
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <div style={{ fontSize: '16.5px', fontWeight: 900, color: 'var(--text-primary)' }}>
                              Rs. {totalAmt.toFixed(2)}
                            </div>
                            {pMethod === 'credit' && (
                              <>
                                {upfront > 0 && (
                                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                    මුදලින්: Rs. {upfront.toFixed(2)}
                                  </div>
                                )}
                                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 800 }}>
                                  ණය: Rs. {credAmt.toFixed(2)}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setViewingBillTxn(bill)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#6366f1',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                cursor: 'pointer'
                              }}
                              title="බිල්පත බලන්න (View Bill)"
                            >
                              <FiEye /> බිල්පත
                            </button>
                            <button
                              type="button"
                              onClick={() => generateBillPDF(bill)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer'
                              }}
                              title="මුද්‍රණය කරන්න (Print Receipt)"
                            >
                              <FiPrinter /> Print
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* VIEW BILL MODAL */}
      <BillModal
        isOpen={!!viewingBillTxn}
        onClose={() => setViewingBillTxn(null)}
        billData={viewingBillTxn}
      />
    </div>
  );
}
