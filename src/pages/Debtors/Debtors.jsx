import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment, writeBatch } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser, FiPhone, FiCreditCard, FiDownload, FiDollarSign, FiList, FiUsers, FiAlertTriangle, FiX, FiClock } from 'react-icons/fi';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';
import './Debtors.css';

export default function Debtors() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('no_asc'); // Default to 'no_asc' (By Debtor No. 1, 2, 3...)
  const [filterType, setFilterType] = useState('all'); // 'all', 'with_debt', 'no_debt'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Transaction Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDebtor, setPaymentDebtor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [transactionType, setTransactionType] = useState('payment'); // 'payment' or 'loan'

  // Ledger State
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerDebtor, setLedgerDebtor] = useState(null);
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Delete Transaction Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Delete Debtor Modal State
  const [isDeleteDebtorModalOpen, setIsDeleteDebtorModalOpen] = useState(false);
  const [debtorToDelete, setDebtorToDelete] = useState(null);
  const [debtorDeletePassword, setDebtorDeletePassword] = useState('');
  const [debtorDeleteLoading, setDebtorDeleteLoading] = useState(false);
  const [debtorDeleteError, setDebtorDeleteError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    address: '',
    barcode: '',
    totalOwed: 0,
    isEdit: false
  });

  // Overdue debtors alert state
  const [overdueDebtors, setOverdueDebtors] = useState([]);
  const [overdueAlertDismissed, setOverdueAlertDismissed] = useState(false);
  const OVERDUE_DAYS = 30;

  const fetchDebtors = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'debtors'));
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDebtors(list);
    } catch (error) {
      console.error("Error fetching debtors:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkOverdueDebtors = useCallback(async (debtorsList) => {
    try {
      const activeDebtors = debtorsList.filter(d => (Number(d.totalOwed) || 0) > 0);
      if (activeDebtors.length === 0) {
        setOverdueDebtors([]);
        return;
      }

      const paySnapshot = await getDocs(collection(db, 'debtor_payments'));
      const txnSnapshot = await getDocs(collection(db, 'transactions'));

      const getTimestampMs = (ts) => {
        if (!ts) return 0;
        if (ts.seconds) return ts.seconds * 1000;
        if (ts.toDate) return ts.toDate().getTime();
        if (typeof ts === 'number') return ts;
        return new Date(ts).getTime();
      };

      // Build map of debtorId -> last payment timestamp (ms)
      const lastPaymentMap = {};

      paySnapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.type !== 'payment') return; // Only count actual payments, not loans/opening
        const debtorId = d.debtorId;
        if (!debtorId) return;
        const tsMs = getTimestampMs(d.timestamp || d.date);
        if (tsMs > (lastPaymentMap[debtorId] || 0)) {
          lastPaymentMap[debtorId] = tsMs;
        }
      });

      // Also check credit transactions for last activity
      const lastActivityMap = {};
      txnSnapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.paymentMethod !== 'credit') return;
        const debtorId = d.debtorId;
        if (!debtorId) return;
        const tsMs = getTimestampMs(d.timestamp || d.date);
        if (tsMs > (lastActivityMap[debtorId] || 0)) {
          lastActivityMap[debtorId] = tsMs;
        }
      });

      const now = Date.now();
      const thresholdMs = OVERDUE_DAYS * 24 * 60 * 60 * 1000;

      const overdue = activeDebtors.map(debtor => {
        const lastPay = lastPaymentMap[debtor.id] || 0;
        const lastAct = lastActivityMap[debtor.id] || 0;
        const createdMs = getTimestampMs(debtor.createdAt) || 0;
        // Use last payment if exists, otherwise use creation date
        const referenceDate = lastPay > 0 ? lastPay : (createdMs > 0 ? createdMs : 0);
        
        if (referenceDate === 0) {
          // No date info at all, consider overdue
          return { ...debtor, daysSincePayment: 999, lastPaymentDate: null, lastActivityDate: lastAct > 0 ? new Date(lastAct) : null };
        }

        const daysSince = Math.floor((now - referenceDate) / (24 * 60 * 60 * 1000));
        if (daysSince >= OVERDUE_DAYS) {
          return { ...debtor, daysSincePayment: daysSince, lastPaymentDate: lastPay > 0 ? new Date(lastPay) : null, lastActivityDate: lastAct > 0 ? new Date(lastAct) : null };
        }
        return null;
      }).filter(Boolean).sort((a, b) => b.daysSincePayment - a.daysSincePayment);

      setOverdueDebtors(overdue);
    } catch (err) {
      console.error('Error checking overdue debtors:', err);
    }
  }, []);

  useEffect(() => {
    fetchDebtors();
  }, []);

  // Check overdue whenever debtors list changes
  useEffect(() => {
    if (debtors.length > 0) {
      checkOverdueDebtors(debtors);
    }
  }, [debtors, checkOverdueDebtors]);

  const handleOpenAdd = () => {
    let maxNo = 0;
    debtors.forEach(d => {
      if (d.debtorNo > maxNo) maxNo = d.debtorNo;
    });
    const nextNo = maxNo + 1;

    setFormData({ 
      id: '', debtorNo: nextNo, name: '', phone: '', address: '',
      barcode: `DBT${nextNo}`, totalOwed: 0, isEdit: false 
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (debtor) => {
    setFormData({ 
      ...debtor,
      isEdit: true 
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenTransaction = (debtor, type = 'payment') => {
    setPaymentDebtor(debtor);
    setPaymentAmount('');
    setPaymentNote('');
    setTransactionType(type);
    setModalError('');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    setActionLoading(true);
    setModalError('');
    try {
      // 1. Save payment/loan record
      const paymentRef = doc(collection(db, 'debtor_payments'));
      await setDoc(paymentRef, {
        debtorId: paymentDebtor.id,
        debtorName: paymentDebtor.name,
        amount: Number(paymentAmount),
        note: paymentNote.trim() || (transactionType === 'payment' ? 'ණය ගෙවීම (Debt Payment)' : 'අතින් එකතු කළ ණය (Manual Loan)'),
        cashierId: userData?.uid || 'unknown',
        cashierName: userData?.name || 'Unknown',
        timestamp: serverTimestamp(),
        type: transactionType
      });
      
      // 2. Reduce or Increase debtor total Owed
      const amountChange = transactionType === 'payment' ? -Number(paymentAmount) : Number(paymentAmount);
      await updateDoc(doc(db, 'debtors', paymentDebtor.id), {
        totalOwed: increment(amountChange)
      });

      setIsPaymentModalOpen(false);
      setPaymentNote('');
      fetchDebtors(); // refresh data
    } catch (err) {
      console.error(err);
      setModalError('Failed to process payment');
    } finally {
      setActionLoading(false);
    }
  };

  const getTransactionCreditAmount = (h) => {
    const billTot = Number(h.total) || 0;
    const upfront = Number(h.paidAmount !== undefined ? h.paidAmount : (h.tenderedAmount || 0));
    if (h.creditAmount !== undefined && h.creditAmount !== null) {
      return Number(h.creditAmount);
    } else if (h.paymentMethod === 'credit') {
      return upfront > 0 ? Math.max(0, billTot - upfront) : (billTot || Number(h.amount) || 0);
    } else {
      return Number(h.amount || h.total || 0);
    }
  };

  const handleOpenLedger = async (debtor) => {
     setLedgerDebtor(debtor);
     setIsLedgerOpen(true);
     setLedgerHistory([]);
     setLedgerLoading(true);
     
     try {
       const debtorIdClean = debtor.id;
       const debtorNameClean = (debtor.name || '').trim().toLowerCase();

       const isDebtorMatch = (record) => {
         if (record.debtorId) {
           return record.debtorId === debtorIdClean;
         }
         if (record.debtorName && debtorNameClean) {
           return record.debtorName.trim().toLowerCase() === debtorNameClean;
         }
         return false;
       };

       const txnSnapshot = await getDocs(collection(db, 'transactions'));
       const loans = txnSnapshot.docs
          .map(d => ({ id: d.id, ...d.data(), _source: 'transactions' }))
          .filter(t => t.paymentMethod === 'credit' && isDebtorMatch(t));
          
       const paySnapshot = await getDocs(collection(db, 'debtor_payments'));
       const payments = paySnapshot.docs
          .map(d => ({ id: d.id, ...d.data(), _source: 'debtor_payments' }))
          .filter(p => isDebtorMatch(p));

       const reloadSnapshot = await getDocs(collection(db, 'reloads'));
       const creditReloads = reloadSnapshot.docs
          .map(d => ({ id: d.id, ...d.data(), isReload: true, _source: 'reloads' }))
          .filter(r => r.paymentMethod === 'credit' && isDebtorMatch(r));

       // Avoid duplicate reloads if they are already recorded as a transaction bill
       const txnBillNumbers = new Set(loans.map(l => l.billNumber).filter(Boolean));
       const standaloneReloads = creditReloads.filter(r => !r.billNumber || !txnBillNumbers.has(r.billNumber));

       const getTimestampMs = (ts) => {
         if (!ts) return 0;
         if (ts.seconds) return ts.seconds * 1000;
         if (ts.toDate) return ts.toDate().getTime();
         if (typeof ts === 'number') return ts;
         return new Date(ts).getTime();
       };

       const rawHistory = [...loans, ...payments, ...standaloneReloads].sort((a,b) => {
         const tA = getTimestampMs(a.timestamp || a.date);
         const tB = getTimestampMs(b.timestamp || b.date);
         return tB - tA;
       });

       // Deduplicate by ID
       const seenIds = new Set();
       let history = [];
       for (const item of rawHistory) {
         if (!seenIds.has(item.id)) {
           seenIds.add(item.id);
           history.push(item);
         }
       }

       // Calculate true total from history
       let calculatedDebt = 0;
       if (history.length > 0) {
         let running = 0;
         for (const h of history) {
           const a = getTransactionCreditAmount(h);
           if (h.type === 'payment') {
             running -= a;
           } else {
             running += a;
           }
         }
         calculatedDebt = Math.max(0, running);
       } else if (Number(debtor.totalOwed) > 0) {
         calculatedDebt = Number(debtor.totalOwed);
         history = [{
           id: '__opening__',
           type: 'opening',
           amount: calculatedDebt,
           debtorId: debtor.id,
           debtorName: debtor.name,
           cashierName: 'System',
           note: 'Opening Balance (set at registration)',
           timestamp: debtor.createdAt || null,
           _source: 'opening_virtual'
         }];
       }

       // Automatically sync debtor document totalOwed with the exact sum of transactions
       const currentStored = Number(debtor.totalOwed) || 0;
       if (Math.abs(currentStored - calculatedDebt) > 0.01) {
         updateDoc(doc(db, 'debtors', debtor.id), {
           totalOwed: calculatedDebt,
           updatedAt: serverTimestamp()
         }).catch(e => console.warn('Sync total debt error:', e));

         debtor.totalOwed = calculatedDebt;
         setDebtors(prev => prev.map(d => d.id === debtor.id ? { ...d, totalOwed: calculatedDebt } : d));
       }

       setLedgerDebtor({ ...debtor, totalOwed: calculatedDebt });
       setLedgerHistory(history);
     } catch (err) {
       console.error("Error loading debtor ledger:", err);
     } finally {
       setLedgerLoading(false);
     }
  };

  const handleRequestDeleteTransaction = (item, calculatedAmount, label) => {
    setItemToDelete({
      ...item,
      calculatedAmount,
      label
    });
    setOwnerPassword('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteTransaction = async (e) => {
    e.preventDefault();
    if (!itemToDelete) return;

    if (ownerPassword.trim() !== '723412641') {
      setDeleteError('වැරදි මුරපදයකි! කරුණාකර නිවැරදි Owner Password එක ඇතුළත් කරන්න.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const item = itemToDelete;

      // 1. Delete document from respective Firestore collection
      if (item._source === 'transactions') {
        const batch = writeBatch(db);
        if (item.items && Array.isArray(item.items)) {
          for (const it of item.items) {
            if (it.id && !it.isCustom && !it.isReload && !it.isMilling) {
              const qty = parseFloat(it.quantity) || 0;
              if (qty > 0) {
                batch.update(doc(db, 'items', it.id), {
                  stock: increment(qty)
                });
              }
            }
          }
        }
        batch.delete(doc(db, 'transactions', item.id));
        await batch.commit();
      } else if (item._source === 'reloads') {
        await deleteDoc(doc(db, 'reloads', item.id));
      } else if (item._source === 'debtor_payments') {
        await deleteDoc(doc(db, 'debtor_payments', item.id));
      }

      // 2. Compute new history and recalculate exact total
      const updatedHistory = ledgerHistory.filter(h => h.id !== item.id);
      let newTotal = 0;
      for (const h of updatedHistory) {
        const a = getTransactionCreditAmount(h);
        if (h.type === 'payment') {
          newTotal -= a;
        } else {
          newTotal += a;
        }
      }
      newTotal = Math.max(0, newTotal);

      if (ledgerDebtor?.id) {
        await updateDoc(doc(db, 'debtors', ledgerDebtor.id), {
          totalOwed: newTotal,
          updatedAt: serverTimestamp()
        });
      }

      // 3. Update local state
      setLedgerHistory(updatedHistory);
      setLedgerDebtor(prev => prev ? { ...prev, totalOwed: newTotal } : null);
      setDebtors(prev => prev.map(d => d.id === ledgerDebtor?.id ? { ...d, totalOwed: newTotal } : d));

      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setOwnerPassword('');

      // Refresh debtors list in background
      fetchDebtors();
    } catch (err) {
      console.error("Error deleting debtor transaction:", err);
      setDeleteError('ගනුදෙනුව මැකීමට නොහැකි විය: ' + (err.message || 'Error occurred'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRequestDeleteDebtor = (debtor) => {
    setDebtorToDelete(debtor);
    setDebtorDeletePassword('');
    setDebtorDeleteError('');
    setIsDeleteDebtorModalOpen(true);
  };

  const handleConfirmDeleteDebtor = async (e) => {
    e.preventDefault();
    if (!debtorToDelete) return;

    if (debtorDeletePassword.trim() !== '723412641') {
      setDebtorDeleteError('වැරදි මුරපදයකි! කරුණාකර නිවැරදි Owner Password එක ඇතුළත් කරන්න.');
      return;
    }

    setDebtorDeleteLoading(true);
    setDebtorDeleteError('');

    try {
      await deleteDoc(doc(db, 'debtors', debtorToDelete.id));
      setDebtors(prev => prev.filter(d => d.id !== debtorToDelete.id));
      setIsDeleteDebtorModalOpen(false);
      setDebtorToDelete(null);
      setDebtorDeletePassword('');
    } catch (error) {
      console.error("Error deleting debtor:", error);
      setDebtorDeleteError('ණයහිමියා මැකීමට නොහැකි විය: ' + (error.message || 'Error occurred'));
    } finally {
      setDebtorDeleteLoading(false);
    }
  };

  const downloadReport = async (type) => {
    try {
      const headers = type === 'monthly' 
        ? ['බිල්පත් අංකය (Bill No)', 'දිනය සහ වේලාව (Date & Time)', 'ගනුදෙනු වර්ගය (Type)', 'ණයහිමියා (Debtor)', 'එකතු වූ ණය (Debt Added +)', 'ගෙවූ මුදල (Payment Paid -)', 'මුළු බිල (Total Bill)', 'අත්පිට මුදල (Paid Upfront)', 'විස්තරය (Details / Note)', 'අයකැමි (Cashier)']
        : ['Debtor No', 'Name', 'Phone', 'Address', 'Total Owed (Rs.)'];
      
      let rows = [];

      if (type === 'all') {
        rows = debtors.map(d => [
          d.debtorNo ? `#${d.debtorNo}` : '', d.name, d.phone || '', d.address || '', Number(d.totalOwed).toFixed(2)
        ]);
      } else if (type === 'monthly') {
        const now = new Date();
        const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const getTimestampMs = (ts) => {
          if (!ts) return 0;
          if (ts.seconds) return ts.seconds * 1000;
          if (ts.toDate) return ts.toDate().getTime();
          if (typeof ts === 'number') return ts;
          return new Date(ts).getTime();
        };

        const formatDate = (ts) => {
          const ms = getTimestampMs(ts);
          return ms ? new Date(ms).toLocaleString('si-LK', { dateStyle: 'medium', timeStyle: 'short' }) || new Date(ms).toLocaleString() : 'Unknown';
        };

        const paySnapshot = await getDocs(collection(db, 'debtor_payments'));
        const txnSnapshot = await getDocs(collection(db, 'transactions'));
        const reloadSnapshot = await getDocs(collection(db, 'reloads'));
        
        const allActs = [];

        // Payments & manual loans from debtor_payments collection
        paySnapshot.forEach(docSnap => {
          const d = docSnap.data();
          const tsMs = getTimestampMs(d.timestamp || d.date);
          if (tsMs >= startOfMonthMs) {
            const isPayment = d.type === 'payment';
            const actType = isPayment ? 'ණය ගෙවීම (Payment Received)' : (d.type === 'opening' ? 'ආරම්භක ණය (Opening Balance)' : 'අතින් එකතු කළ ණය (Manual Loan)');
            allActs.push({ 
              billNo: '-',
              _date: formatDate(d.timestamp || d.date),
              actType, 
              debtorName: d.debtorName || 'Unknown',
              debtAdded: !isPayment ? Number(d.amount || 0).toFixed(2) : '-',
              paymentPaid: isPayment ? Number(d.amount || 0).toFixed(2) : '-',
              totalBill: '-',
              paidUpfront: isPayment ? Number(d.amount || 0).toFixed(2) : '-',
              details: d.note || (isPayment ? 'ණය පියවීම' : 'අතින් එකතු කළ ණය'),
              cashierName: d.cashierName || 'Unknown',
              _tsMs: tsMs
            });
          }
        });

        // Credit sales from transactions collection
        txnSnapshot.forEach(docSnap => {
          const d = docSnap.data();
          const tsMs = getTimestampMs(d.timestamp || d.date);
          if (d.paymentMethod === 'credit' && tsMs >= startOfMonthMs) {
            const billTot = Number(d.total) || 0;
            const upfront = Number(d.paidAmount !== undefined ? d.paidAmount : (d.tenderedAmount || 0));
            const credAmt = d.creditAmount !== undefined ? Number(d.creditAmount) : Math.max(0, billTot - upfront);
            const formattedBillNo = d.billNumber ? `#${String(d.billNumber).padStart(6, '0')}` : '-';

            allActs.push({
              billNo: formattedBillNo,
              _date: formatDate(d.timestamp || d.date),
              actType: upfront > 0 ? 'ණයට බිල්පත (අර්ධ ගෙවීම්)' : 'ණයට බිල්පත (Credit Sale)',
              debtorName: d.debtorName || 'Unknown',
              debtAdded: Number(credAmt > 0 ? credAmt : billTot).toFixed(2),
              paymentPaid: '-',
              totalBill: billTot > 0 ? billTot.toFixed(2) : '-',
              paidUpfront: upfront > 0 ? upfront.toFixed(2) : '-',
              details: upfront > 0 ? `බිල් මුදල Rs.${billTot.toFixed(2)} න් Rs.${upfront.toFixed(2)} ගෙවා ඉතිරිය ණයට එකතු විය` : 'සම්පූර්ණ බිල්පත ණයට',
              cashierName: d.cashierName || 'Unknown',
              _tsMs: tsMs
            });
          }
        });

        // Credit reloads (skip if already in transactions bills)
        const txnBillNumbers = new Set();
        txnSnapshot.forEach(docSnap => {
          const d = docSnap.data();
          if (d.billNumber) txnBillNumbers.add(d.billNumber);
        });

        reloadSnapshot.forEach(docSnap => {
          const d = docSnap.data();
          const tsMs = getTimestampMs(d.timestamp || d.date);
          if (d.paymentMethod === 'credit' && tsMs >= startOfMonthMs) {
            if (d.billNumber && txnBillNumbers.has(d.billNumber)) return;
            const formattedBillNo = d.billNumber ? `#${String(d.billNumber).padStart(6, '0')}` : '-';
            allActs.push({
              billNo: formattedBillNo,
              _date: formatDate(d.timestamp || d.date),
              actType: 'Reload ණය (Credit Reload)',
              debtorName: d.debtorName || 'Unknown',
              debtAdded: Number(d.amount || 0).toFixed(2),
              paymentPaid: '-',
              totalBill: Number(d.amount || 0).toFixed(2),
              paidUpfront: '-',
              details: `Reload #${d.phone || ''} (${d.network || ''})`,
              cashierName: d.cashierName || 'Unknown',
              _tsMs: tsMs
            });
          }
        });

        allActs.sort((a, b) => b._tsMs - a._tsMs);

        rows = allActs.map(a => [
          a.billNo,
          a._date,
          a.actType,
          a.debtorName,
          a.debtAdded !== '-' ? `+ Rs. ${a.debtAdded}` : '-',
          a.paymentPaid !== '-' ? `- Rs. ${a.paymentPaid}` : '-',
          a.totalBill,
          a.paidUpfront,
          a.details || '-',
          a.cashierName
        ]);
      }

      if (rows.length === 0) {
        alert(type === 'monthly' ? 'No transactions found for this month.' : 'No debtor data found.');
        return;
      }

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 45 }, { wch: 18 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, `Debtor_Report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('downloadReport error:', e);
      alert("Failed to generate report: " + e.message);
    }
  };

  const downloadSingleLedger = () => {
     if (!ledgerDebtor) return;
     if (ledgerHistory.length === 0) {
       alert('No transaction history to export for this debtor.');
       return;
     }

     const getTimestampMs = (ts) => {
       if (!ts) return 0;
       if (ts.seconds) return ts.seconds * 1000;
       if (ts.toDate) return ts.toDate().getTime();
       if (typeof ts === 'number') return ts;
       return new Date(ts).getTime();
     };

     // Sort oldest to newest to calculate running balance chronologically
     const sortedAsc = [...ledgerHistory].sort((a, b) => {
       const tA = getTimestampMs(a.timestamp || a.date);
       const tB = getTimestampMs(b.timestamp || b.date);
       return tA - tB;
     });

     let runningDebt = 0;
     const itemsWithBalance = sortedAsc.map(h => {
       const isPayment = h.type === 'payment';
       const isOpening = h.type === 'opening';
       const isLoan = h.type === 'loan';
       const isReload = h.isReload;
       
       let actType = 'ණයට බිල්පත (Credit Sale)';
       if (isPayment) actType = 'ණය ගෙවීම (Payment Received)';
       else if (isOpening) actType = 'ආරම්භක ණය (Opening Balance)';
       else if (isLoan) actType = 'අතින් එකතු කළ ණය (Manual Loan)';
       else if (isReload) actType = 'Reload ණය (Credit Reload)';

       const billTot = Number(h.total) || 0;
       const upfront = Number(h.paidAmount !== undefined ? h.paidAmount : (h.tenderedAmount || 0));
       const amt = getTransactionCreditAmount(h);

       if (isPayment) {
         runningDebt -= amt;
       } else {
         runningDebt += amt;
       }

       let formattedBillNo = '-';
       let note = '-';
       if (h.billNumber) {
         formattedBillNo = `#${String(h.billNumber).padStart(6, '0')}`;
         if (upfront > 0 && billTot > 0) {
           note = `බිල් මුදල Rs. ${billTot.toFixed(2)} න් මුදලින් Rs. ${upfront.toFixed(2)} ගෙවා ඉතිරිය ණයට එකතු විය`;
           actType = 'ණයට බිල්පත (අර්ධ ගෙවීම්)';
         } else {
           note = `සම්පූර්ණ බිල්පත ණයට (Rs. ${billTot.toFixed(2)})`;
         }
       } else if (h.phone) {
         note = `Reload #${h.phone} (${h.network || ''})`;
       } else if (h.note) {
         note = h.note;
       } else if (isPayment) {
         note = 'පාරිභෝගිකයා විසින් ණය පියවීම';
       } else if (isLoan) {
         note = 'අතින් එකතු කළ ණය';
       } else if (isOpening) {
         note = 'ලියාපදිංචියේදී තිබූ ආරම්භක ණය';
       }

       const tsMs = getTimestampMs(h.timestamp || h.date);
       const date = tsMs ? new Date(tsMs).toLocaleString('si-LK', { dateStyle: 'medium', timeStyle: 'short' }) || new Date(tsMs).toLocaleString() : 'N/A';

       return {
         billNo: formattedBillNo,
         date,
         actType,
         debtAdded: !isPayment ? Number(amt).toFixed(2) : '-',
         paymentPaid: isPayment ? Number(amt).toFixed(2) : '-',
         runningBalance: Math.max(0, runningDebt).toFixed(2),
         note,
         cashier: h.cashierName || 'Unknown',
         _ts: tsMs
       };
     });

     // Reverse back to newest first for presentation
     const rows = itemsWithBalance.reverse().map(item => [
       item.billNo,
       item.date,
       item.actType,
       item.debtAdded !== '-' ? `+ Rs. ${item.debtAdded}` : '-',
       item.paymentPaid !== '-' ? `- Rs. ${item.paymentPaid}` : '-',
       `Rs. ${item.runningBalance}`,
       item.note,
       item.cashier
     ]);

     const headers = [
       'බිල්පත් අංකය (Bill No)',
       'දිනය සහ වේලාව (Date & Time)',
       'ගනුදෙනු වර්ගය (Transaction Type)',
       'එකතු වූ ණය (Debt Added +)',
       'ගෙවූ මුදල (Payment -)',
       'ඉතිරි ණය ශේෂය (Running Balance)',
       'විස්තරය / Note',
       'අයකැමි (Cashier)'
     ];

     // Summary row
     const totalOwed = Number(ledgerDebtor.totalOwed || 0).toFixed(2);
     rows.push([]);
     rows.push(['', '', '', '', 'මුළු ණය ශේෂය (Total Debt):', `Rs. ${totalOwed}`, '', '']);
     
     const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
     worksheet['!cols'] = [
       { wch: 16 }, 
       { wch: 22 }, 
       { wch: 28 }, 
       { wch: 20 }, 
       { wch: 20 }, 
       { wch: 24 }, 
       { wch: 45 }, 
       { wch: 18 }
     ];
     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
     XLSX.writeFile(workbook, `Ledger_${ledgerDebtor.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadBarcode = (barcode, name) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, { format: "CODE128" });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = url;
    link.download = `debtor_${name}_${barcode}.png`;
    link.click();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this debtor?")) {
      try {
        await deleteDoc(doc(db, 'debtors', id));
        setDebtors(debtors.filter(d => d.id !== id));
      } catch (error) {
        console.error("Error deleting debtor:", error);
        alert("Failed to delete debtor.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);

    if (formData.phone && !/^(0\d{9}|\+94\d{9})$/.test(formData.phone.trim())) {
      setModalError("Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).");
      setActionLoading(false);
      return;
    }

    try {
      const debtorData = {
        debtorNo: formData.debtorNo || 1,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        barcode: formData.barcode,
        totalOwed: Number(formData.totalOwed) || 0,
        updatedAt: serverTimestamp()
      };

      if (formData.isEdit) {
        await updateDoc(doc(db, 'debtors', formData.id), debtorData);
      } else {
        const docId = `debtor_${Date.now()}`;
        debtorData.createdAt = serverTimestamp();
        await setDoc(doc(db, 'debtors', docId), debtorData);

        // If initial debt is set, save an opening balance record so it appears in transaction history
        const initialOwed = Number(formData.totalOwed) || 0;
        if (initialOwed > 0) {
          const openingRef = doc(collection(db, 'debtor_payments'));
          await setDoc(openingRef, {
            debtorId: docId,
            debtorName: formData.name,
            amount: initialOwed,
            cashierId: userData?.uid || 'unknown',
            cashierName: userData?.name || 'Unknown',
            timestamp: serverTimestamp(),
            type: 'opening',
            note: 'Opening Balance'
          });
        }
      }

      setIsModalOpen(false);
      fetchDebtors();
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalDebt = debtors.reduce((acc, d) => acc + (Number(d.totalOwed) || 0), 0);
  const activeDebtorsCount = debtors.filter(d => (Number(d.totalOwed) || 0) > 0).length;

  const filteredDebtors = debtors.filter(d => {
    const s = search.toLowerCase().trim();
    const matchesSearch = !s ||
      d.name.toLowerCase().includes(s) || 
      d.phone?.includes(s) ||
      d.barcode?.toLowerCase().includes(s) ||
      d.debtorNo?.toString() === s.replace('#', '').replace('no', '').trim() ||
      d.debtorNo?.toString().includes(s.replace('#', '').replace('no', '').trim());

    if (!matchesSearch) return false;

    const owed = Number(d.totalOwed) || 0;
    if (filterType === 'with_debt') return owed > 0;
    if (filterType === 'no_debt') return owed <= 0;
    return true;
  }).sort((a, b) => {
    const owedA = Number(a.totalOwed) || 0;
    const owedB = Number(b.totalOwed) || 0;
    const noA = Number(a.debtorNo) || 0;
    const noB = Number(b.debtorNo) || 0;

    if (sortBy === 'debt_desc') {
      if (owedB !== owedA) return owedB - owedA; // Highest debt first
      return noA - noB;
    }
    if (sortBy === 'debt_asc') {
      if (owedA !== owedB) return owedA - owedB; // Lowest debt first
      return noA - noB;
    }
    if (sortBy === 'no_desc') return noB - noA;
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    return noA - noB; // Default 'no_asc'
  });

  return (
    <div className="debtors-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">{t('debtors.title')}</h1>
          <p className="page-subtitle">Manage customer credit and payment tracking</p>
        </div>
        <div className="action-row">
          <Button onClick={() => downloadReport('monthly')} variant="secondary" icon={<FiDownload />} size="sm">Monthly Report</Button>
          <Button onClick={() => downloadReport('all')} variant="secondary" icon={<FiDownload />} size="sm">All Debtors</Button>
          <Button onClick={handleOpenAdd} icon={<FiPlus />}>{t('debtors.addDebtor')}</Button>
        </div>
      </div>

      {/* Overdue Debtors Alert Banner */}
      {overdueDebtors.length > 0 && !overdueAlertDismissed && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(234, 88, 12, 0.10) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '1.25rem',
          position: 'relative',
          animation: 'fadeIn 0.4s ease'
        }}>
          {/* Dismiss button */}
          <button
            onClick={() => setOverdueAlertDismissed(true)}
            style={{ position: 'absolute', top: '10px', right: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
            title="වසන්න"
          >
            <FiX style={{ fontSize: '14px' }} />
          </button>

          {/* Alert Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiAlertTriangle style={{ fontSize: '20px', color: '#ef4444' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ef4444' }}>
                ⚠️ දින {OVERDUE_DAYS}+ ගෙවීමක් නොකළ ණයගැතියන් ({overdueDebtors.length} දෙනෙක්)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                පහත පාරිභෝගිකයින් බොහෝ කලයක් ණය ගෙවීමක් කර නැත. කරුණාකර ඔවුන් හා සම්බන්ධ වන්න.
              </p>
            </div>
          </div>

          {/* Overdue Debtors List */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {overdueDebtors.map(od => (
              <div
                key={od.id}
                onClick={() => handleOpenLedger(od)}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '200px',
                  flex: '1 1 220px',
                  maxWidth: '320px'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                title={`${od.name} - Ledger බලන්න`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                    #{od.debtorNo} {od.name}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#ef4444' }}>
                    Rs. {Number(od.totalOwed).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiClock style={{ fontSize: '12px', color: '#f59e0b' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#f59e0b' }}>
                    {od.daysSincePayment >= 999 ? 'කිසිදා ගෙවීමක් කර නැත' : `දින ${od.daysSincePayment}ක් ගෙවීමක් නැත`}
                  </span>
                </div>
                {od.lastPaymentDate && (
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>
                    අවසන් ගෙවීම: {od.lastPaymentDate.toLocaleDateString('si-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Total Debt Card */}
        <div 
          className="glass-card cursor-pointer" 
          onClick={() => { setFilterType('with_debt'); setSortBy('debt_desc'); }}
          title="ණය ඇති අය වැඩිම ණය සිට පිළිවෙළට පෙරන්න"
          style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #ef4444', transition: 'transform 0.2s ease', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📝 මුළු ණය එකතුව (Total Debt)
            </span>
            <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '6px', borderRadius: '10px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiDollarSign />
            </span>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', margin: '10px 0 4px 0' }}>
            Rs. {totalDebt.toFixed(2)}
          </h2>
          <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600, color: 'var(--text-muted)' }}>
            පාරිභෝගිකයින්ගෙන් අයවීමට ඇති මුළු ශේෂය
          </div>
        </div>

        {/* Total Debtors Count */}
        <div 
          className="glass-card cursor-pointer" 
          onClick={() => { setFilterType('all'); }}
          title="සියලු ණයගැතියන් පෙන්වන්න"
          style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #3b82f6', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              👥 ලියාපදිංචි ණයගැතියන්
            </span>
            <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '6px', borderRadius: '10px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiUsers />
            </span>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '10px 0 4px 0' }}>
            {debtors.length}
          </h2>
          <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600, color: 'var(--text-muted)' }}>
            මුළු ලියාපදිංචි පාරිභෝගිකයින් ගණන
          </div>
        </div>

        {/* Active Debtors (With Debt > 0) */}
        <div 
          className="glass-card cursor-pointer" 
          onClick={() => { setFilterType('with_debt'); setSortBy('debt_desc'); }}
          title="ණය ගෙවීමට ඇති අය පමණක් වැඩිම ණය සිට පෙරන්න"
          style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #f59e0b', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚠️ ණය ගෙවීමට ඇති අය
            </span>
            <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '6px', borderRadius: '10px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCreditCard />
            </span>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', margin: '10px 0 4px 0' }}>
            {activeDebtorsCount}
          </h2>
          <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600, color: 'var(--text-muted)' }}>
            දැනට ණය ශේෂයක් ඇති පාරිභෝගිකයින්
          </div>
        </div>

      </div>

      <div className="debtors-toolbar glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="search-box" style={{ flex: '1 1 250px', minWidth: '220px' }}>
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search name, phone or No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-glass, rgba(255,255,255,0.05))', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'all' ? 'var(--primary-500, #3b82f6)' : 'transparent',
                color: filterType === 'all' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              සියල්ල ({debtors.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('with_debt')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'with_debt' ? '#f59e0b' : 'transparent',
                color: filterType === 'with_debt' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⚠️ ණය ඇති අය ({activeDebtorsCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>පිළිවෙළ:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="search-input"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-glass, rgba(255, 255, 255, 0.05))',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="debt_desc" style={{ background: '#1e293b', color: '#fff' }}>📉 ණය වැඩිම සිට අඩුම (Highest Debt First)</option>
              <option value="debt_asc" style={{ background: '#1e293b', color: '#fff' }}>📈 ණය අඩුම සිට වැඩිම (Lowest Debt First)</option>
              <option value="no_asc" style={{ background: '#1e293b', color: '#fff' }}>🔢 අංකය (1, 2, 3...)</option>
              <option value="no_desc" style={{ background: '#1e293b', color: '#fff' }}>🔢 අංකය (අවසානය මුලට)</option>
              <option value="name_asc" style={{ background: '#1e293b', color: '#fff' }}>🔤 නම (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t('common.loading')}</div>
      ) : (
        <div className="table-container glass-card">
          <table className="debtors-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>{t('debtors.name')}</th>
                <th>{t('debtors.phone')}</th>
                <th 
                  onClick={() => setSortBy(prev => prev === 'debt_desc' ? 'debt_asc' : 'debt_desc')} 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="ණය අනුව පෙළගස්වන්න (Sort by debt)"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{t('debtors.totalOwed')}</span>
                    {sortBy === 'debt_desc' && <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 800 }}>▼ (වැඩිම)</span>}
                    {sortBy === 'debt_asc' && <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 800 }}>▲ (අඩුම)</span>}
                    {sortBy !== 'debt_desc' && sortBy !== 'debt_asc' && <span style={{ opacity: 0.4, fontSize: '11px' }}>⇅</span>}
                  </div>
                </th>
                <th>{t('debtors.barcode')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.length > 0 ? (
                filteredDebtors.map(debtor => (
                  <tr key={debtor.id} className="cursor-pointer" onClick={() => handleOpenLedger(debtor)}>
                    <td className="font-bold text-secondary">#{debtor.debtorNo || '-'}</td>
                    <td>
                        <div className="debtor-name-cell">
                          <div className="debtor-avatar">{debtor.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <span className="font-medium d-block">{debtor.name}</span>
                            <span className="text-secondary text-sm">{debtor.address}</span>
                          </div>
                        </div>
                    </td>
                    <td>{debtor.phone}</td>
                    <td className="font-bold text-error">Rs. {Number(debtor.totalOwed).toFixed(2)}</td>
                    <td>
                        <div className="barcode-cell" onClick={(e) => { e.stopPropagation(); downloadBarcode(debtor.barcode, debtor.name); }}>
                          <span className="barcode-text">{debtor.barcode}</span>
                          <FiDownload className="download-icon-sm" />
                        </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn action-btn bg-success-dim text-success" onClick={(e) => { e.stopPropagation(); handleOpenTransaction(debtor, 'payment'); }} title="Add Payment">
                          <FiDollarSign /> Pay
                        </button>
                        <button className="icon-btn action-btn" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}} onClick={(e) => { e.stopPropagation(); handleOpenTransaction(debtor, 'loan'); }} title="Add Loan">
                          <FiPlus /> Loan
                        </button>
                        <button className="icon-btn action-btn bg-primary-dim text-primary" onClick={(e) => { e.stopPropagation(); handleOpenLedger(debtor); }} title="View Ledger">
                          <FiList /> Hx
                        </button>
                        <button className="icon-btn edit-btn" onClick={(e) => { e.stopPropagation(); handleOpenEdit(debtor); }} title={t('common.edit')}>
                          <FiEdit2 />
                        </button>
                        <button className="icon-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleRequestDeleteDebtor(debtor); }} title={t('common.delete')}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No debtors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={formData.isEdit ? "Edit Debtor" : t('debtors.addDebtor')}
      >
        <form onSubmit={handleSubmit} className="debtor-form">
          {modalError && <div className="modal-error">{modalError}</div>}
          
          <Input
            label={t('debtors.name')}
            icon={<FiUser/>}
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
            placeholder="Customer Name"
          />
          
          <div className="form-row">
            <Input
              label={t('debtors.phone')}
              icon={<FiPhone/>}
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="0XXXXXXXXX (optional)"
            />
            <Input
              label={t('debtors.totalOwed')}
              icon={<FiCreditCard/>}
              type="number"
              step="0.01"
              value={formData.totalOwed}
              onChange={e => setFormData({...formData, totalOwed: e.target.value})}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Home / Shop Address"
            icon={<FiSearch/>}
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            placeholder="Address details"
          />

          <Input
            label="Debtor Barcode"
            icon={<FiCreditCard/>}
            value={formData.barcode}
            onChange={e => setFormData({...formData, barcode: e.target.value})}
            readOnly
            placeholder="Auto-generated"
          />

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={actionLoading}>{formData.isEdit ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        title={`${transactionType === 'payment' ? 'Receive Payment' : 'Add New Loan'}: ${paymentDebtor?.name}`}
      >
        <form onSubmit={handlePaymentSubmit} className="payment-form">
          {modalError && <div className="modal-error">{modalError}</div>}
          <div className="mb-4">
             <p className="text-secondary pb-2">Current Debt Amount:</p>
             <h2 className="text-error font-bold text-2xl">Rs. {Number(paymentDebtor?.totalOwed || 0).toFixed(2)}</h2>
          </div>
          <Input
            label={transactionType === 'payment' ? "Payment Amount Received (Rs.)" : "New Loan Amount (Rs.)"}
            icon={<FiDollarSign/>}
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={e => setPaymentAmount(e.target.value)}
            required
            placeholder="Enter amount"
          />
          <Input
            label="Note / හේතුව හෝ විස්තරය (Optional)"
            icon={<FiEdit2/>}
            value={paymentNote}
            onChange={e => setPaymentNote(e.target.value)}
            placeholder="උදා: භාණ්ඩ සඳහා / අත්තිකාරම්"
          />
          <div className="modal-actions mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={actionLoading}>Confirm {transactionType === 'payment' ? 'Payment' : 'Loan'}</Button>
          </div>
        </form>
      </Modal>

      {/* Debtor Profile / Ledger Modal */}
      <Modal 
        isOpen={isLedgerOpen} 
        onClose={() => setIsLedgerOpen(false)}
        title={`Debtor Profile`}
      >
        <div className="ledger-container">
           <div className="flex flex-wrap justify-between items-start mb-6" style={{ background: 'rgba(0,0,0,0.04)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)' }}>
               <div>
                 <h2 className="text-xl font-bold mb-2" style={{ color: '#0f172a', fontWeight: 800 }}>
                   {ledgerDebtor?.name} <span style={{ fontSize: '12px', color: '#475569', background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px', fontWeight: 700 }}>#{ledgerDebtor?.debtorNo || '-'}</span>
                 </h2>
                 <p className="text-sm mb-1" style={{ color: '#334155', fontWeight: 600 }}><FiPhone className="inline mr-2"/>{ledgerDebtor?.phone}</p>
                 <p className="text-sm mb-1" style={{ color: '#334155', fontWeight: 600 }}><FiUser className="inline mr-2"/>{ledgerDebtor?.address || 'No Address Provided'}</p>
                 <p className="text-sm" style={{ color: '#334155', fontWeight: 600 }}><FiCreditCard className="inline mr-2"/>{ledgerDebtor?.barcode}</p>
               </div>
               <div className="text-right">
                 <p className="text-sm mb-1" style={{ color: '#475569', fontWeight: 700 }}>Total Outstanding Debt</p>
                 <h3 className="text-error font-bold text-3xl" style={{ color: '#dc2626', fontWeight: 800 }}>Rs. {Number(ledgerDebtor?.totalOwed || 0).toFixed(2)}</h3>
               </div>
           </div>
           
           <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-lg" style={{ color: '#0f172a', fontWeight: 800 }}>Transaction Ledger</h3>
             <Button onClick={downloadSingleLedger} variant="secondary" icon={<FiDownload />} size="sm">
               Export Excel
             </Button>
           </div>
           
           {ledgerLoading ? (
             <div className="text-center p-4" style={{ color: '#475569', fontWeight: 600 }}>Loading history...</div>
           ) : (
             <div className="ledger-list mt-4" style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)' }}>
                 {(() => {
                   const getTimestampMs = (ts) => {
                     if (!ts) return 0;
                     if (ts.seconds) return ts.seconds * 1000;
                     if (ts.toDate) return ts.toDate().getTime();
                     if (typeof ts === 'number') return ts;
                     return new Date(ts).getTime();
                   };

                   const sortedAsc = [...ledgerHistory].sort((a, b) => {
                     const tA = getTimestampMs(a.timestamp || a.date);
                     const tB = getTimestampMs(b.timestamp || b.date);
                     return tA - tB;
                   });

                   let runningDebt = 0;
                   const itemsWithBalance = sortedAsc.map(h => {
                     const isPayment = h.type === 'payment';
                     const amt = getTransactionCreditAmount(h);
                     if (isPayment) {
                       runningDebt -= amt;
                     } else {
                       runningDebt += amt;
                     }
                     return {
                       ...h,
                       calculatedAmt: amt,
                       runningBalance: Math.max(0, runningDebt)
                     };
                   });

                   const displayItems = itemsWithBalance.reverse();

                   return displayItems.length > 0 ? displayItems.map(h => {
                     const isPayment = h.type === 'payment';
                     const isOpening = h.type === 'opening';
                     const isLoan = h.type === 'loan';
                     const isReload = h.isReload;

                     const billTot = Number(h.total) || 0;
                     const upfront = Number(h.paidAmount !== undefined ? h.paidAmount : (h.tenderedAmount || 0));
                     const amt = h.calculatedAmt;

                     const tsMs = getTimestampMs(h.timestamp || h.date);
                     const date = tsMs ? new Date(tsMs).toLocaleString() : (isOpening ? 'At Registration' : 'Just now');

                     let label = '';
                     let color = '#dc2626';
                     let prefix = '+';
                     let subDetails = '';

                     if (isPayment) {
                       label = 'ණය ගෙවීම (Payment Received)';
                       color = '#16a34a';
                       prefix = '–';
                     } else if (isOpening) {
                       label = (h.note && h.note.trim()) ? h.note.trim() : 'ආරම්භක ණය (Opening Balance)';
                       color = '#d97706';
                       prefix = '+';
                     } else if (isReload) {
                       label = `Reload ණය — #${h.phone || ''} (${h.network || ''})`;
                       color = '#dc2626';
                       prefix = '+';
                     } else if (isLoan) {
                       label = (h.note && h.note.trim()) ? h.note.trim() : 'අතින් එකතු කළ ණය (Manual Loan)';
                       color = '#dc2626';
                       prefix = '+';
                     } else {
                       if (h.billNumber) {
                         label = `ණයට බිල්පත — Bill #${String(h.billNumber).padStart(6,'0')}`;
                       } else if (h.note && h.note.trim()) {
                         label = h.note.trim();
                       } else {
                         label = 'ණයට බිල්පත (Credit Sale)';
                       }
                       color = '#dc2626';
                       prefix = '+';
                       if (upfront > 0 && billTot > 0) {
                         subDetails = ` • Bill: Rs. ${billTot.toFixed(2)} | මුදලින් ගෙවූ: Rs. ${upfront.toFixed(2)}`;
                       }
                     }

                     return (
                       <div key={h.id} className="ledger-item flex items-center justify-between p-3" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)', padding: '12px 8px' }}>
                         <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <p className="font-bold text-sm" style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '14px' }}>{label}</p>
                              {h.note && !isOpening && (
                                <span style={{ fontSize: '11px', background: 'rgba(15, 23, 42, 0.08)', padding: '2px 8px', borderRadius: '6px', color: '#0f172a', fontWeight: 700, border: '1px solid rgba(15, 23, 42, 0.12)' }}>
                                  {h.note}
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600, fontSize: '12px' }}>
                              {date} • By: {h.cashierName || 'Cashier'}{subDetails}
                            </p>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ textAlign: 'right' }}>
                             <div className="font-bold" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', color, fontWeight: 800 }}>
                                {prefix} Rs. {Number(amt).toFixed(2)}
                             </div>
                             <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>
                               ශේෂය: Rs. {Number(h.runningBalance).toFixed(2)}
                             </div>
                           </div>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleRequestDeleteTransaction(h, amt, label);
                             }}
                             className="icon-btn"
                             title="ගනුදෙනුව මකන්න (Owner Only)"
                             style={{
                               padding: '6px 8px',
                               borderRadius: '8px',
                               background: 'rgba(239, 68, 68, 0.12)',
                               color: '#ef4444',
                               border: '1px solid rgba(239, 68, 68, 0.25)',
                               cursor: 'pointer',
                               display: 'inline-flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               transition: 'all 0.2s ease'
                             }}
                           >
                             <FiTrash2 size={14} />
                           </button>
                         </div>
                       </div>
                     );
                   }) : (
                     <p className="text-center p-4" style={{ color: '#475569', fontWeight: 600 }}>No transaction history found.</p>
                   );
                 })()}
             </div>
          )}
          <div className="modal-actions mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsLedgerOpen(false)}>Close</Button>
          </div>
       </div>
     </Modal>

      {/* Owner Confirmation Modal for Deleting Ledger Transaction */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            setOwnerPassword('');
            setDeleteError('');
          }
        }}
        title="🔐 Owner Authorization (ගනුදෙනුව මැකීම)"
      >
        <form onSubmit={handleConfirmDeleteTransaction} className="debtor-form">
          {deleteError && (
            <div className="modal-error" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '10px', borderRadius: '8px', border: '1px solid #ef4444', marginBottom: '10px' }}>
              {deleteError}
            </div>
          )}

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>මැකීමට තෝරාගත් ගනුදෙනුව:</p>
            <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{itemToDelete?.label}</p>
            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: itemToDelete?.type === 'payment' ? '#10b981' : '#ef4444', marginTop: '4px' }}>
              {itemToDelete?.type === 'payment' ? '+' : '–'} Rs. {Number(itemToDelete?.calculatedAmount || itemToDelete?.amount || 0).toFixed(2)}
            </p>
            <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '6px' }}>
              ⚠️ මෙම ගනුදෙනුව මැකූ පසු පාරිභෝගිකයාගේ මුළු ණය ශේෂය ස්වයංක්‍රීයව වෙනස් වේ.
            </p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Owner Password එක ඇතුළත් කරන්න:
            </label>
            <input
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Enter Owner Password"
              autoFocus
              required
              className="search-input"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-glass, rgba(0, 0, 0, 0.2))',
                color: 'var(--text-primary)',
                fontSize: '15px'
              }}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
                setOwnerPassword('');
                setDeleteError('');
              }}
              disabled={deleteLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={deleteLoading}
              style={{ background: '#ef4444', color: '#fff', border: 'none' }}
            >
              <FiTrash2 style={{ marginRight: '6px' }} /> ගනුදෙනුව මකන්න (Delete)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Owner Confirmation Modal for Deleting Entire Debtor */}
      <Modal
        isOpen={isDeleteDebtorModalOpen}
        onClose={() => {
          if (!debtorDeleteLoading) {
            setIsDeleteDebtorModalOpen(false);
            setDebtorToDelete(null);
            setDebtorDeletePassword('');
            setDebtorDeleteError('');
          }
        }}
        title="🔐 Owner Authorization (ණයහිමියා මැකීම)"
      >
        <form onSubmit={handleConfirmDeleteDebtor} className="debtor-form">
          {debtorDeleteError && (
            <div className="modal-error" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '10px', borderRadius: '8px', border: '1px solid #ef4444', marginBottom: '10px' }}>
              {debtorDeleteError}
            </div>
          )}

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>මැකීමට තෝරාගත් ණයහිමියා (Debtor Details):</p>
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
              {debtorToDelete?.name} <span style={{ fontSize: '12px', opacity: 0.7 }}>#{debtorToDelete?.debtorNo || '-'}</span>
            </p>
            {debtorToDelete?.phone && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                📞 {debtorToDelete.phone}
              </p>
            )}
            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ef4444', marginTop: '6px' }}>
              මුළු ණය ශේෂය: Rs. {Number(debtorToDelete?.totalOwed || 0).toFixed(2)}
            </p>
            <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px' }}>
              ⚠️ මෙම ණයහිමියා සම්පූර්ණයෙන්ම පද්ධතියෙන් ඉවත් වේ. මෙම ක්‍රියාව නැවත ආපසු හැරවිය නොහැක.
            </p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Owner Password එක ඇතුළත් කරන්න:
            </label>
            <input
              type="password"
              value={debtorDeletePassword}
              onChange={(e) => setDebtorDeletePassword(e.target.value)}
              placeholder="Enter Owner Password"
              autoFocus
              required
              className="search-input"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-glass, rgba(0, 0, 0, 0.2))',
                color: 'var(--text-primary)',
                fontSize: '15px'
              }}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteDebtorModalOpen(false);
                setDebtorToDelete(null);
                setDebtorDeletePassword('');
                setDebtorDeleteError('');
              }}
              disabled={debtorDeleteLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={debtorDeleteLoading}
              style={{ background: '#ef4444', color: '#fff', border: 'none' }}
            >
              <FiTrash2 style={{ marginRight: '6px' }} /> ණයහිමියා මකන්න (Delete Debtor)
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
