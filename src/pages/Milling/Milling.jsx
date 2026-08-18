import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { getNow, toDateObject, getTodayDateString } from '../../services/timeService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { 
  FiCalendar, FiPrinter, FiSearch, 
  FiRefreshCw, FiDollarSign, FiFileText, FiTrash2,
  FiPlus, FiEdit3
} from 'react-icons/fi';
import './Milling.css';

export default function Milling() {
  const { user, userData } = useAuth();
  const [millingRecords, setMillingRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(getTodayDateString()); // YYYY-MM-DD
  const [filterType, setFilterType] = useState('all'); // 'all', 'wee', 'pol'
  const [dateMode, setDateMode] = useState('day'); // 'day', 'month', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Entry Modal state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [manualDate, setManualDate] = useState(getTodayDateString());
  const [manualWeeKg, setManualWeeKg] = useState('');
  const [manualWeeRate, setManualWeeRate] = useState('7');
  const [manualWeeTotal, setManualWeeTotal] = useState('');
  const [manualHaalKudu, setManualHaalKudu] = useState('');
  const [manualPolKg, setManualPolKg] = useState('');
  const [manualPolRate, setManualPolRate] = useState('65');
  const [manualPolTotal, setManualPolTotal] = useState('');
  const [manualPunnakku, setManualPunnakku] = useState('');
  const [manualPolthel, setManualPolthel] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const fetchMillingData = async () => {
    setLoading(true);
    try {
      const records = [];
      const activeBillNumbers = new Set();

      // 1. Fetch active transactions first (Source of Truth for POS Bills)
      try {
        const snapTxns = await getDocs(collection(db, 'transactions'));
        snapTxns.docs.forEach(docSnap => {
          const txn = docSnap.data();
          if (txn.billNumber) activeBillNumbers.add(txn.billNumber);

          if (txn.items && Array.isArray(txn.items)) {
            txn.items.forEach((item, idx) => {
              const isMillingItem = item.isMilling || 
                (item.name && (item.name.includes('වී කෙටීම') || item.name.includes('පොල් කෙටීම')));
              
              if (isMillingItem) {
                const millingType = item.millingType || (item.name.includes('පොල්') ? 'pol' : 'wee');
                const recId = `txn_mil_${docSnap.id}_${idx}`;
                let recDate = txn.timestamp ? (txn.timestamp.toDate ? txn.timestamp.toDate() : new Date(txn.timestamp)) : new Date(txn.date || Date.now());
                const kg = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.sellPrice) || (millingType === 'pol' ? 65 : 7);
                const total = parseFloat(item.subtotal) || (rate * kg);
                
                records.push({
                  id: recId,
                  txnDocId: docSnap.id,
                  billNumber: txn.billNumber,
                  isManual: false,
                  millingType,
                  name: item.name,
                  kg,
                  rate,
                  weeKg: millingType === 'wee' ? kg : 0,
                  weeRate: millingType === 'wee' ? rate : 7,
                  weeTotal: millingType === 'wee' ? total : 0,
                  haalKuduIncome: 0,
                  polKg: millingType === 'pol' ? kg : 0,
                  polRate: millingType === 'pol' ? rate : 65,
                  polTotal: millingType === 'pol' ? total : 0,
                  punnakkuIncome: 0,
                  polthelIncome: 0,
                  total,
                  paymentMethod: txn.paymentMethod || 'cash',
                  cashierName: txn.cashierName || 'Cashier',
                  timestamp: recDate,
                  date: recDate
                });
              }
            });
          }
        });
      } catch (err) {
        console.warn("Could not extract milling from transactions:", err);
      }

      // 2. Fetch millingRecords collection (Manual entries & standalone records)
      try {
        const snapMilling = await getDocs(collection(db, 'millingRecords'));
        for (const docSnap of snapMilling.docs) {
          const data = docSnap.data();
          // If bill was deleted from transactions, delete orphaned millingRecord
          if (data.billNumber && !activeBillNumbers.has(data.billNumber)) {
            await deleteDoc(doc(db, 'millingRecords', docSnap.id));
          } else if (data.isManual || !data.billNumber || !records.some(r => r.billNumber === data.billNumber)) {
            let recDate = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(data.date || Date.now());
            
            const weeKg = parseFloat(data.weeKg) || (data.millingType !== 'pol' ? parseFloat(data.kg) || 0 : 0);
            const weeRate = parseFloat(data.weeRate) || (data.rate || 7);
            const weeTotal = parseFloat(data.weeTotal) || (data.millingType !== 'pol' ? parseFloat(data.total) || 0 : 0);
            const haalKuduIncome = parseFloat(data.haalKuduIncome) || 0;

            const polKg = parseFloat(data.polKg) || (data.millingType === 'pol' ? parseFloat(data.kg) || 0 : 0);
            const polRate = parseFloat(data.polRate) || (data.rate || 65);
            const polTotal = parseFloat(data.polTotal) || (data.millingType === 'pol' ? parseFloat(data.total) || 0 : 0);
            const punnakkuIncome = parseFloat(data.punnakkuIncome) || 0;
            const polthelIncome = parseFloat(data.polthelIncome) || 0;

            const total = parseFloat(data.total) || (weeTotal + haalKuduIncome + polTotal + punnakkuIncome + polthelIncome);

            records.push({
              id: docSnap.id,
              millingDocId: docSnap.id,
              isManual: !!data.isManual,
              billNumber: data.billNumber || null,
              dateStr: data.dateStr || null,
              millingType: data.millingType || (polKg > 0 && weeKg === 0 ? 'pol' : weeKg > 0 && polKg === 0 ? 'wee' : 'mixed'),
              name: data.name || (data.isManual ? 'දිනපතා කෙටීමේ වාර්තාව' : (data.millingType === 'pol' ? 'පොල් කෙටීම' : 'වී කෙටීම')),
              kg: parseFloat(data.kg) || (weeKg + polKg),
              rate: parseFloat(data.rate) || 7,
              weeKg,
              weeRate,
              weeTotal,
              haalKuduIncome,
              polKg,
              polRate,
              polTotal,
              punnakkuIncome,
              polthelIncome,
              total,
              paymentMethod: data.paymentMethod || 'cash',
              cashierName: data.cashierName || 'Cashier',
              notes: data.notes || '',
              timestamp: recDate,
              date: recDate
            });
          }
        }
      } catch (err) {
        console.warn("Could not query millingRecords:", err);
      }

      // Sort by date desc
      records.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || a.date).getTime();
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || b.date).getTime();
        return timeB - timeA;
      });

      setMillingRecords(records);
    } catch (err) {
      console.error("Error fetching milling records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMillingData();
  }, []);

  // Filter logic by date & type
  const filteredRecords = useMemo(() => {
    return millingRecords.filter(rec => {
      // Type filter
      if (filterType === 'wee' && rec.millingType === 'pol' && !(rec.weeKg > 0 || rec.haalKuduIncome > 0)) return false;
      if (filterType === 'pol' && rec.millingType === 'wee' && !(rec.polKg > 0 || rec.punnakkuIncome > 0 || rec.polthelIncome > 0)) return false;

      // Date filter
      const recDate = toDateObject(rec.timestamp || rec.date);
      let recDateStr = rec.dateStr;
      if (!recDateStr && recDate) {
        const y = recDate.getFullYear();
        const m = String(recDate.getMonth() + 1).padStart(2, '0');
        const d = String(recDate.getDate()).padStart(2, '0');
        recDateStr = `${y}-${m}-${d}`;
      }
      if (!recDateStr) return false;
      const recMonthStr = recDateStr.substring(0, 7);

      if (dateMode === 'day' && recDateStr !== selectedDate) return false;
      if (dateMode === 'month' && recMonthStr !== selectedDate.substring(0, 7)) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const billStr = rec.billNumber ? String(rec.billNumber) : '';
        const nameStr = rec.name ? rec.name.toLowerCase() : '';
        const cashierStr = rec.cashierName ? rec.cashierName.toLowerCase() : '';
        const notesStr = rec.notes ? rec.notes.toLowerCase() : '';
        return billStr.includes(q) || nameStr.includes(q) || cashierStr.includes(q) || notesStr.includes(q);
      }

      return true;
    });
  }, [millingRecords, selectedDate, filterType, dateMode, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalIncome = 0;
    let weeKg = 0;
    let weeTotal = 0;
    let haalKuduIncome = 0;

    let polKg = 0;
    let polTotal = 0;
    let punnakkuIncome = 0;
    let polthelIncome = 0;

    filteredRecords.forEach(rec => {
      const tot = parseFloat(rec.total) || 0;
      totalIncome += tot;

      weeKg += parseFloat(rec.weeKg) || 0;
      weeTotal += parseFloat(rec.weeTotal) || 0;
      haalKuduIncome += parseFloat(rec.haalKuduIncome) || 0;

      polKg += parseFloat(rec.polKg) || 0;
      polTotal += parseFloat(rec.polTotal) || 0;
      punnakkuIncome += parseFloat(rec.punnakkuIncome) || 0;
      polthelIncome += parseFloat(rec.polthelIncome) || 0;
    });

    const weeSubtotal = weeTotal + haalKuduIncome;
    const polSubtotal = polTotal + punnakkuIncome + polthelIncome;

    return {
      totalIncome,
      count: filteredRecords.length,
      weeKg,
      weeTotal,
      haalKuduIncome,
      weeSubtotal,
      polKg,
      polTotal,
      punnakkuIncome,
      polthelIncome,
      polSubtotal
    };
  }, [filteredRecords]);

  // Set quick date shortcuts
  const handleSetQuickDate = (mode, offsetDays = 0) => {
    setDateMode(mode);
    if (mode === 'all') return;

    const now = getNow();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  // Manual Record Modal Handlers
  const resetManualForm = () => {
    setEditingRecordId(null);
    setManualDate(selectedDate || getTodayDateString());
    setManualWeeKg('');
    setManualWeeRate('7');
    setManualWeeTotal('');
    setManualHaalKudu('');
    setManualPolKg('');
    setManualPolRate('65');
    setManualPolTotal('');
    setManualPunnakku('');
    setManualPolthel('');
    setManualNotes('');
  };

  const handleOpenAddManualModal = () => {
    resetManualForm();
    setManualModalOpen(true);
  };

  const handleOpenEditManualModal = (rec) => {
    setEditingRecordId(rec.id);
    const d = toDateObject(rec.timestamp || rec.date);
    let dateStr = getTodayDateString();
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${day}`;
    }
    setManualDate(rec.dateStr || dateStr);
    setManualWeeKg(rec.weeKg ? String(rec.weeKg) : '');
    setManualWeeRate(rec.weeRate ? String(rec.weeRate) : '7');
    setManualWeeTotal(rec.weeTotal ? String(rec.weeTotal) : '');
    setManualHaalKudu(rec.haalKuduIncome ? String(rec.haalKuduIncome) : '');

    setManualPolKg(rec.polKg ? String(rec.polKg) : '');
    setManualPolRate(rec.polRate ? String(rec.polRate) : '65');
    setManualPolTotal(rec.polTotal ? String(rec.polTotal) : '');
    setManualPunnakku(rec.punnakkuIncome ? String(rec.punnakkuIncome) : '');
    setManualPolthel(rec.polthelIncome ? String(rec.polthelIncome) : '');
    setManualNotes(rec.notes || '');

    setManualModalOpen(true);
  };

  const handleSaveManualRecord = async () => {
    if (!manualDate) {
      alert("කරුණාකර දිනයක් තෝරන්න.");
      return;
    }

    const weeKgNum = parseFloat(manualWeeKg) || 0;
    const weeRateNum = parseFloat(manualWeeRate) || 7;
    const weeTotalNum = manualWeeTotal !== '' ? (parseFloat(manualWeeTotal) || 0) : (weeKgNum * weeRateNum);
    const haalKuduNum = parseFloat(manualHaalKudu) || 0;

    const polKgNum = parseFloat(manualPolKg) || 0;
    const polRateNum = parseFloat(manualPolRate) || 65;
    const polTotalNum = manualPolTotal !== '' ? (parseFloat(manualPolTotal) || 0) : (polKgNum * polRateNum);
    const punnakkuNum = parseFloat(manualPunnakku) || 0;
    const polthelNum = parseFloat(manualPolthel) || 0;

    const totalIncome = weeTotalNum + haalKuduNum + polTotalNum + punnakkuNum + polthelNum;

    if (totalIncome <= 0 && weeKgNum <= 0 && polKgNum <= 0) {
      alert("කරුණාකර අවම වශයෙන් එක ආදායමක් හෝ බර ප්‍රමාණයක් ඇතුළත් කරන්න.");
      return;
    }

    const [y, m, d] = manualDate.split('-').map(Number);
    const recordDate = new Date(y, m - 1, d, 12, 0, 0);

    const payload = {
      isManual: true,
      dateStr: manualDate,
      date: recordDate.toISOString(),
      timestamp: recordDate,
      weeKg: weeKgNum,
      weeRate: weeRateNum,
      weeTotal: weeTotalNum,
      haalKuduIncome: haalKuduNum,
      polKg: polKgNum,
      polRate: polRateNum,
      polTotal: polTotalNum,
      punnakkuIncome: punnakkuNum,
      polthelIncome: polthelNum,
      total: totalIncome,
      notes: manualNotes.trim(),
      cashierName: userData?.name || user?.email?.split('@')[0] || 'Cashier',
      updatedAt: new Date()
    };

    try {
      if (editingRecordId) {
        await setDoc(doc(db, 'millingRecords', editingRecordId), payload, { merge: true });
      } else {
        const newId = `manual_milling_${manualDate}_${Date.now()}`;
        await setDoc(doc(db, 'millingRecords', newId), payload);
      }

      setManualModalOpen(false);
      resetManualForm();
      fetchMillingData();
    } catch (err) {
      console.error("Error saving manual milling record:", err);
      alert("වාර්තාව සුරැකීමට අපොහොසත් විය: " + err.message);
    }
  };

  const handleDeleteManualRecord = async (recId) => {
    if (window.confirm("මෙම කෙටීමේ වාර්තාව මකා දැමීමට අවශ්‍යද?")) {
      try {
        await deleteDoc(doc(db, 'millingRecords', recId));
        fetchMillingData();
      } catch (err) {
        console.error("Error deleting record:", err);
        alert("මකා දැමීම අසාර්ථක විය: " + err.message);
      }
    }
  };

  // Print Report PDF
  const handlePrintReport = () => {
    const titleDate = dateMode === 'day' 
      ? `දිනය: ${selectedDate}` 
      : dateMode === 'month' 
      ? `මාසය: ${selectedDate.substring(0, 7)}` 
      : 'සියලුම කාලපරිච්ඡේදය';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>කෙටීමේ වාර්තාව - ${titleDate}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800&display=swap');
    body { font-family: 'Noto Sans Sinhala', sans-serif; padding: 20px; color: #000; }
    h1 { text-align: center; margin-bottom: 4px; font-size: 22px; }
    .subtitle { text-align: center; font-weight: 700; margin-bottom: 20px; color: #333; }
    .summary-box { display: grid; grid-template-columns: repeat(3, 1fr); background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #cbd5e1; gap: 10px; }
    .stat-item { text-align: center; }
    .stat-title { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .stat-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background-color: #0f172a; color: #fff; font-weight: 700; }
    .text-right { text-align: right; }
    .badge-wee { background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
    .badge-pol { background: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
    .badge-manual { background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
  </style>
</head>
<body>
  <h1>🌾 🥥 වී සහ පොල් කෙටීමේ වාර්තාව (Milling Report)</h1>
  <div class="subtitle">${titleDate} | මුළු වාර්තා ගණන: ${stats.count}</div>

  <div class="summary-box">
    <div class="stat-item">
      <div class="stat-title">🌾 වී කෙටුම් ආදායම</div>
      <div class="stat-val">Rs. ${stats.weeSubtotal.toFixed(2)}</div>
      <div class="stat-sub">වී කෙටීම (${stats.weeKg.toFixed(1)} Kg): Rs. ${stats.weeTotal.toFixed(2)} | හාල් කුඩු: Rs. ${stats.haalKuduIncome.toFixed(2)}</div>
    </div>
    <div class="stat-item">
      <div class="stat-title">🥥 පොල් කෙටුම් ආදායම</div>
      <div class="stat-val">Rs. ${stats.polSubtotal.toFixed(2)}</div>
      <div class="stat-sub">පොල් (${stats.polKg.toFixed(1)} Kg): Rs. ${stats.polTotal.toFixed(2)} | පුන්නක්කු: Rs. ${stats.punnakkuIncome.toFixed(2)} | තෙල්: Rs. ${stats.polthelIncome.toFixed(2)}</div>
    </div>
    <div class="stat-item">
      <div class="stat-title">💰 මුළු කෙටීමේ ආදායම</div>
      <div class="stat-val" style="color:#10b981;">Rs. ${stats.totalIncome.toFixed(2)}</div>
      <div class="stat-sub">සියලුම ගාස්තු සහ අතුරු ආදායම් එකතුව</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>දිනය</th>
        <th>වාර්තා අංකය / වර්ගය</th>
        <th>ආදායම් විස්තරය</th>
        <th class="text-right">එකතුව (Rs.)</th>
        <th>කැෂියර් / සටහන්</th>
      </tr>
    </thead>
    <tbody>
      ${filteredRecords.map(r => {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp || r.date);
        const timeStr = d ? d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '';
        const dateStr = r.dateStr || (d ? d.toLocaleDateString('en-LK') : '-');
        
        let detailsText = '';
        if (r.isManual) {
          const parts = [];
          if (r.weeKg > 0 || r.weeTotal > 0) parts.push(`🌾 වී කෙටීම: ${r.weeKg} Kg (Rs. ${r.weeTotal.toFixed(2)})`);
          if (r.haalKuduIncome > 0) parts.push(`🍚 හාල් කුඩු: Rs. ${r.haalKuduIncome.toFixed(2)}`);
          if (r.polKg > 0 || r.polTotal > 0) parts.push(`🥥 පොල් කෙටීම: ${r.polKg} Kg (Rs. ${r.polTotal.toFixed(2)})`);
          if (r.punnakkuIncome > 0) parts.push(`🥥 පුන්නක්කු: Rs. ${r.punnakkuIncome.toFixed(2)}`);
          if (r.polthelIncome > 0) parts.push(`🛢️ පොල්තෙල්: Rs. ${r.polthelIncome.toFixed(2)}`);
          detailsText = parts.join(' | ');
        } else {
          detailsText = `${r.name} (${r.kg} Kg x Rs. ${r.rate})`;
        }

        return `
          <tr>
            <td>${dateStr} ${r.isManual ? '' : timeStr}</td>
            <td>
              <span class="${r.isManual ? 'badge-manual' : (r.millingType === 'pol' ? 'badge-pol' : 'badge-wee')}">
                ${r.isManual ? '📝 දිනපතා වාර්තාව' : `#${r.billNumber ? String(r.billNumber).padStart(6, '0') : '-'}`}
              </span>
            </td>
            <td>${detailsText}</td>
            <td class="text-right" style="font-weight:700;">Rs. ${parseFloat(r.total).toFixed(2)}</td>
            <td>${r.cashierName || 'Cashier'} ${r.notes ? `(${r.notes})` : ''}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  return (
    <div className="milling-page fade-in">
      <div className="page-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            🌾 🥥 කෙටීමේ වාර්තා (Milling Records)
          </h1>
          <p className="page-subtitle">
            දවසින් දවස වෙන වෙනම වී කෙටීමේ සහ පොල් කෙටීමේ සියලුම විස්තර හා ආදායම් වාර්තා
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="primary" icon={<FiPlus />} onClick={handleOpenAddManualModal} style={{ background: '#10b981', borderColor: '#10b981' }}>
            ➕ කෙටීමේ වාර්තාවක් ඇතුළත් කරන්න
          </Button>
          <Button variant="secondary" icon={<FiRefreshCw />} onClick={fetchMillingData}>
            නැවුම් කරන්න
          </Button>
          <Button variant="secondary" icon={<FiPrinter />} onClick={handlePrintReport} disabled={filteredRecords.length === 0}>
            🖨️ වාර්තාව Print කරන්න
          </Button>
        </div>
      </div>

      {/* Date & Filter Control Bar */}
      <div className="glass-card mb-6" style={{ padding: '1.25rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Quick Date Shortcuts */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSetQuickDate('day', 0)}
              className={`filter-btn ${dateMode === 'day' && selectedDate === getTodayDateString() ? 'active' : ''}`}
            >
              📅 අද (Today)
            </button>
            <button
              onClick={() => handleSetQuickDate('day', 1)}
              className={`filter-btn ${dateMode === 'day' && selectedDate !== getTodayDateString() ? 'active' : ''}`}
            >
              ⏪ ඊයේ (Yesterday)
            </button>
            <button
              onClick={() => setDateMode('month')}
              className={`filter-btn ${dateMode === 'month' ? 'active' : ''}`}
            >
              📆 මාසිකව (Monthly)
            </button>
            <button
              onClick={() => setDateMode('all')}
              className={`filter-btn ${dateMode === 'all' ? 'active' : ''}`}
            >
              ♾️ සියලුම දින (All Time)
            </button>
          </div>

          {/* Date Picker Input */}
          {dateMode !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <FiCalendar style={{ color: 'var(--primary-400)', fontSize: '1.1rem' }} />
              <input
                type={dateMode === 'month' ? 'month' : 'date'}
                value={dateMode === 'month' ? selectedDate.substring(0, 7) : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
          )}

          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-glass)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'all' ? 'var(--primary-500)' : 'transparent',
                color: filterType === 'all' ? '#fff' : 'var(--text-primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              සියල්ල
            </button>
            <button
              onClick={() => setFilterType('wee')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'wee' ? '#eab308' : 'transparent',
                color: filterType === 'wee' ? '#000' : 'var(--text-primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              🌾 වී කෙටීම
            </button>
            <button
              onClick={() => setFilterType('pol')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'pol' ? '#ea580c' : 'transparent',
                color: filterType === 'pol' ? '#fff' : 'var(--text-primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              🥥 පොල් කෙටීම
            </button>
          </div>

        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Total Income */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              මුළු කෙටීමේ ආදායම
            </span>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px', borderRadius: '10px', fontSize: '1.2rem' }}>
              <FiDollarSign />
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '8px 0 4px 0' }}>
            Rs. {stats.totalIncome.toFixed(2)}
          </h2>
          <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600 }}>
            {stats.count} වාර්තාවක් / ගනුදෙනු ඇතුළත් කර ඇත
          </div>
        </div>

        {/* Paddy Milling Stats */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eab308', textTransform: 'uppercase' }}>
              🌾 වී කෙටීම සහ හාල් කුඩු
            </span>
            <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
              {stats.weeKg.toFixed(1)} Kg
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 6px 0' }}>
            Rs. {stats.weeSubtotal.toFixed(2)}
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: 600 }}>
            <span style={{ background: 'rgba(234, 179, 8, 0.12)', padding: '2px 6px', borderRadius: '6px', color: '#eab308' }}>
              ගාස්තු: Rs. {stats.weeTotal.toFixed(2)}
            </span>
            <span style={{ background: 'rgba(34, 197, 94, 0.12)', padding: '2px 6px', borderRadius: '6px', color: '#22c55e' }}>
              හාල් කුඩු: Rs. {stats.haalKuduIncome.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Coconut Milling Stats */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #ea580c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              🥥 පොල්, පුන්නක්කු සහ තෙල්
            </span>
            <span style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
              {stats.polKg.toFixed(1)} Kg
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 6px 0' }}>
            Rs. {stats.polSubtotal.toFixed(2)}
          </h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ background: 'rgba(234, 88, 12, 0.12)', padding: '2px 6px', borderRadius: '6px', color: '#ea580c' }}>
              ගාස්තු: Rs. {stats.polTotal.toFixed(2)}
            </span>
            <span style={{ background: 'rgba(168, 85, 247, 0.12)', padding: '2px 6px', borderRadius: '6px', color: '#a855f7' }}>
              පුන්නක්කු: Rs. {stats.punnakkuIncome.toFixed(2)}
            </span>
            <span style={{ background: 'rgba(59, 130, 246, 0.12)', padding: '2px 6px', borderRadius: '6px', color: '#3b82f6' }}>
              තෙල්: Rs. {stats.polthelIncome.toFixed(2)}
            </span>
          </div>
        </div>

      </div>

      {/* Search Input Bar */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="බිල් අංකය, විස්තර හෝ සටහන් අනුව සෙවීම..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          style={{ width: '100%', paddingLeft: '40px', fontSize: '0.95rem', fontWeight: 600 }}
        />
        <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.1rem' }} />
      </div>

      {/* Milling Transactions Table */}
      <div className="glass-card" style={{ padding: '1rem', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            කෙටීමේ වාර්තා පූරණය වෙමින් පවතී...
          </div>
        ) : filteredRecords.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="milling-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>දිනය සහ වේලාව</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>වාර්තා / බිල් අංකය</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ආදායම් විස්තරය</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>එකතුව (Rs.)</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>කැෂියර් / සටහන්</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>ක්‍රියාකාරකම්</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date(rec.timestamp || rec.date);
                  const dateStr = rec.dateStr || (d ? d.toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' }) : '-');
                  const timeStr = d ? d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '';
                  const isPol = rec.millingType === 'pol';

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px', fontWeight: 600, fontSize: '0.9rem' }}>
                        <div>{dateStr}</div>
                        {!rec.isManual && <small style={{ opacity: 0.7, fontWeight: 500 }}>{timeStr}</small>}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, fontSize: '0.95rem' }}>
                        {rec.isManual ? (
                          <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '4px 10px', borderRadius: '8px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            📝 දිනපතා වාර්තාව
                          </span>
                        ) : (
                          <span style={{ color: 'var(--primary-400)' }}>
                            #{rec.billNumber ? String(rec.billNumber).padStart(6, '0') : '-'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {rec.isManual ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {(rec.weeKg > 0 || rec.weeTotal > 0) && (
                              <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                                🌾 වී: {rec.weeKg} Kg (Rs. {rec.weeTotal.toFixed(2)})
                              </span>
                            )}
                            {rec.haalKuduIncome > 0 && (
                              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                                🍚 හාල් කුඩු: Rs. {rec.haalKuduIncome.toFixed(2)}
                              </span>
                            )}
                            {(rec.polKg > 0 || rec.polTotal > 0) && (
                              <span style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                                🥥 පොල්: {rec.polKg} Kg (Rs. {rec.polTotal.toFixed(2)})
                              </span>
                            )}
                            {rec.punnakkuIncome > 0 && (
                              <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                                🥥 පුන්නක්කු: Rs. {rec.punnakkuIncome.toFixed(2)}
                              </span>
                            )}
                            {rec.polthelIncome > 0 && (
                              <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                                🛢️ පොල්තෙල්: Rs. {rec.polthelIncome.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            background: isPol ? 'rgba(234, 88, 12, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: isPol ? '#ea580c' : '#eab308',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isPol ? `🥥 පොල් කෙටීම (${rec.kg} Kg)` : `🌾 වී කෙටීම (${rec.kg} Kg)`}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                        Rs. {parseFloat(rec.total).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        <div>{rec.cashierName || 'Cashier'}</div>
                        {rec.notes && <small style={{ color: 'var(--primary-400)', display: 'block' }}>{rec.notes}</small>}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {rec.isManual ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditManualModal(rec)}
                              style={{ border: 'none', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="සංශෝධනය කරන්න"
                            >
                              <FiEdit3 /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteManualRecord(rec.id)}
                              style={{ border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="මකා දමන්න"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', opacity: 0.6, fontWeight: 600 }}>POS බිල්පත</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FiFileText style={{ fontSize: '2.5rem', marginBottom: '10px', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>තෝරාගත් කාලපරිච්ඡේදයට ({selectedDate}) කෙටීමේ වාර්තා හමු නොවීය.</p>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title={editingRecordId ? "✏️ කෙටීමේ වාර්තාව සංශෝධනය කරන්න" : "🌾 🥥 කෙටීමේ වාර්තාවක් ඇතුළත් කරන්න"}
        size="lg"
      >
        <div style={{ padding: '6px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            මෙතැනින් ඇතුළත් කරන දිනපතා වී/පොල් කෙටීමේ වාර්තා <strong>කෙටීමේ වාර්තා පිටුවේ පමණක්</strong> සටහන් වන අතර සාමාන්‍ය POS විකුණුම් බිල්පත් වලට එකතු නොවේ.
          </p>

          {/* Date Picker Field */}
          <div className="form-group mb-5">
            <label className="input-label" style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              📅 වාර්තාගත දිනය (Record Date)
            </label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="search-input"
              style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
            />
          </div>

          {/* 🌾 Section 1: Paddy Milling & Rice Bran */}
          <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1.5px solid rgba(234, 179, 8, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#eab308', fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌾 වී කෙටීම සහ හාල් කුඩු ආදායම
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  වී කෙටූ බර (Kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={manualWeeKg}
                  onChange={(e) => {
                    setManualWeeKg(e.target.value);
                    const kg = parseFloat(e.target.value);
                    if (!isNaN(kg) && kg >= 0) {
                      const rate = parseFloat(manualWeeRate) || 7;
                      setManualWeeTotal((kg * rate).toFixed(2));
                    }
                  }}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  1 Kg ගාස්තුව (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="7.00"
                  value={manualWeeRate}
                  onChange={(e) => {
                    setManualWeeRate(e.target.value);
                    const kg = parseFloat(manualWeeKg);
                    const rate = parseFloat(e.target.value) || 0;
                    if (!isNaN(kg) && kg >= 0) {
                      setManualWeeTotal((kg * rate).toFixed(2));
                    }
                  }}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  වී කෙටුම් ගාස්තුව (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualWeeTotal}
                  onChange={(e) => setManualWeeTotal(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 800, color: '#eab308' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  🌾 හාල් කුඩු ආදායම (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualHaalKudu}
                  onChange={(e) => setManualHaalKudu(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 800, color: '#22c55e' }}
                />
              </div>
            </div>
          </div>

          {/* 🥥 Section 2: Coconut Milling, Poonac & Oil */}
          <div style={{ background: 'rgba(234, 88, 12, 0.08)', border: '1.5px solid rgba(234, 88, 12, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#ea580c', fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🥥 පොල් කෙටීම, පුන්නක්කු සහ පොල්තෙල් ආදායම
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  පොල් කෙටූ බර (Kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={manualPolKg}
                  onChange={(e) => {
                    setManualPolKg(e.target.value);
                    const kg = parseFloat(e.target.value);
                    if (!isNaN(kg) && kg >= 0) {
                      const rate = parseFloat(manualPolRate) || 65;
                      setManualPolTotal((kg * rate).toFixed(2));
                    }
                  }}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  1 Kg ගාස්තුව (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="65.00"
                  value={manualPolRate}
                  onChange={(e) => {
                    setManualPolRate(e.target.value);
                    const kg = parseFloat(manualPolKg);
                    const rate = parseFloat(e.target.value) || 0;
                    if (!isNaN(kg) && kg >= 0) {
                      setManualPolTotal((kg * rate).toFixed(2));
                    }
                  }}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  පොල් කෙටුම් ගාස්තුව (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualPolTotal}
                  onChange={(e) => setManualPolTotal(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 800, color: '#ea580c' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  🥥 පුන්නක්කු ආදායම (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualPunnakku}
                  onChange={(e) => setManualPunnakku(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 800, color: '#a855f7' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  🛢️ පොල්තෙල් විකිණීම (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualPolthel}
                  onChange={(e) => setManualPolthel(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', fontWeight: 800, color: '#3b82f6' }}
                />
              </div>
            </div>
          </div>

          {/* Notes Field */}
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              📝 වෙනත් සටහන් (Notes / Remarks - optional)
            </label>
            <input
              type="text"
              placeholder="උදා: හවස කෙටූ ප්‍රමාණය, අමතර විස්තර..."
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Grand Total Preview */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
              මුළු ආදායම් එකතුව (Total Milling Income)
            </span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
              Rs. {(
                (manualWeeTotal !== '' ? (parseFloat(manualWeeTotal) || 0) : ((parseFloat(manualWeeKg) || 0) * (parseFloat(manualWeeRate) || 7))) +
                (parseFloat(manualHaalKudu) || 0) +
                (manualPolTotal !== '' ? (parseFloat(manualPolTotal) || 0) : ((parseFloat(manualPolKg) || 0) * (parseFloat(manualPolRate) || 65))) +
                (parseFloat(manualPunnakku) || 0) +
                (parseFloat(manualPolthel) || 0)
              ).toFixed(2)}
            </span>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setManualModalOpen(false)}>
              අවලංගු කරන්න
            </Button>
            <Button
              onClick={handleSaveManualRecord}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              💾 වාර්තාව සුරකින්න
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
