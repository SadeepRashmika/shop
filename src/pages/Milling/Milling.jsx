import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Button from '../../components/ui/Button';
import { 
  FiSettings, FiCalendar, FiFilter, FiPrinter, FiSearch, 
  FiRefreshCw, FiDollarSign, FiAward, FiFileText, FiCheckCircle
} from 'react-icons/fi';
import './Milling.css';

export default function Milling() {
  const [millingRecords, setMillingRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [filterType, setFilterType] = useState('all'); // 'all', 'wee', 'pol'
  const [dateMode, setDateMode] = useState('day'); // 'day', 'month', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMillingData = async () => {
    setLoading(true);
    try {
      const records = [];

      // 1. Fetch from millingRecords collection
      try {
        const qMilling = query(collection(db, 'millingRecords'), orderBy('timestamp', 'desc'));
        const snapMilling = await getDocs(qMilling);
        snapMilling.docs.forEach(docSnap => {
          records.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (err) {
        console.warn("Could not query millingRecords:", err);
      }

      // 2. Also extract milling items from transactions collection (for existing bills)
      try {
        const snapTxns = await getDocs(collection(db, 'transactions'));
        snapTxns.docs.forEach(docSnap => {
          const txn = docSnap.data();
          if (txn.items && Array.isArray(txn.items)) {
            txn.items.forEach((item, idx) => {
              const isMillingItem = item.isMilling || 
                (item.name && (item.name.includes('වී කෙටීම') || item.name.includes('පොල් කෙටීම')));
              
              if (isMillingItem) {
                const millingType = item.millingType || (item.name.includes('පොල්') ? 'pol' : 'wee');
                const recId = `txn_mil_${docSnap.id}_${idx}`;
                
                // Avoid duplicates if already in millingRecords
                const exists = records.some(r => r.billNumber === txn.billNumber && r.millingType === millingType && r.kg === (parseFloat(item.quantity) || 1));
                if (!exists) {
                  let recDate = txn.timestamp ? (txn.timestamp.toDate ? txn.timestamp.toDate() : new Date(txn.timestamp)) : new Date();
                  records.push({
                    id: recId,
                    billNumber: txn.billNumber,
                    millingType,
                    name: item.name,
                    kg: parseFloat(item.quantity) || 1,
                    rate: parseFloat(item.sellPrice) || (millingType === 'pol' ? 65 : 7),
                    total: parseFloat(item.subtotal) || ((parseFloat(item.sellPrice) || 0) * (parseFloat(item.quantity) || 1)),
                    paymentMethod: txn.paymentMethod || 'cash',
                    cashierName: txn.cashierName || 'Cashier',
                    timestamp: recDate,
                    date: recDate
                  });
                }
              }
            });
          }
        });
      } catch (err) {
        console.warn("Could not extract milling from transactions:", err);
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
      if (filterType === 'wee' && rec.millingType !== 'wee') return false;
      if (filterType === 'pol' && rec.millingType !== 'pol') return false;

      // Date filter
      const recDate = rec.timestamp ? (rec.timestamp.toDate ? rec.timestamp.toDate() : new Date(rec.timestamp)) : new Date(rec.date);
      const recDateStr = recDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const recMonthStr = recDateStr.substring(0, 7); // YYYY-MM

      if (dateMode === 'day' && recDateStr !== selectedDate) return false;
      if (dateMode === 'month' && recMonthStr !== selectedDate.substring(0, 7)) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const billStr = rec.billNumber ? String(rec.billNumber) : '';
        const nameStr = rec.name ? rec.name.toLowerCase() : '';
        const cashierStr = rec.cashierName ? rec.cashierName.toLowerCase() : '';
        return billStr.includes(q) || nameStr.includes(q) || cashierStr.includes(q);
      }

      return true;
    });
  }, [millingRecords, selectedDate, filterType, dateMode, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalIncome = 0;
    let weeKg = 0;
    let weeIncome = 0;
    let polKg = 0;
    let polIncome = 0;

    filteredRecords.forEach(rec => {
      const tot = parseFloat(rec.total) || 0;
      const kg = parseFloat(rec.kg) || 0;
      totalIncome += tot;

      if (rec.millingType === 'pol' || rec.name?.includes('පොල්')) {
        polKg += kg;
        polIncome += tot;
      } else {
        weeKg += kg;
        weeIncome += tot;
      }
    });

    return {
      totalIncome,
      count: filteredRecords.length,
      weeKg,
      weeIncome,
      polKg,
      polIncome
    };
  }, [filteredRecords]);

  // Set quick date shortcuts
  const handleSetQuickDate = (mode, offsetDays = 0) => {
    setDateMode(mode);
    if (mode === 'all') return;

    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
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
    .summary-box { display: flex; justify-content: space-around; background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #cbd5e1; }
    .stat-item { text-align: center; }
    .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background-color: #0f172a; color: #fff; font-weight: 700; }
    .text-right { text-align: right; }
    .badge-wee { background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
    .badge-pol { background: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>🌾 🥥 වී සහ පොල් කෙටීමේ වාර්තාව (Milling Report)</h1>
  <div class="subtitle">${titleDate} | මුළු ගනුදෙනු ගණන: ${stats.count}</div>

  <div class="summary-box">
    <div class="stat-item">
      <div>🌾 වී කෙටූ ප්‍රමාණය</div>
      <div class="stat-val">${stats.weeKg.toFixed(1)} Kg (Rs. ${stats.weeIncome.toFixed(2)})</div>
    </div>
    <div class="stat-item">
      <div>🥥 පොල් කෙටූ ප්‍රමාණය</div>
      <div class="stat-val">${stats.polKg.toFixed(1)} Kg (Rs. ${stats.polIncome.toFixed(2)})</div>
    </div>
    <div class="stat-item">
      <div>💰 මුළු කෙටීමේ ආදායම</div>
      <div class="stat-val" style="color:#10b981;">Rs. ${stats.totalIncome.toFixed(2)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>වේලාව</th>
        <th>බිල් #</th>
        <th>වර්ගය</th>
        <th class="text-right">බර (Kg)</th>
        <th class="text-right">1 Kg ගාස්තුව</th>
        <th class="text-right">එකතුව (Rs.)</th>
        <th>කැෂියර්</th>
      </tr>
    </thead>
    <tbody>
      ${filteredRecords.map(r => {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp || r.date);
        const timeStr = d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
        const dateStr = d.toLocaleDateString('en-LK');
        const isPol = r.millingType === 'pol' || r.name?.includes('පොල්');
        return `
          <tr>
            <td>${dateStr} ${timeStr}</td>
            <td>#${r.billNumber ? String(r.billNumber).padStart(6, '0') : '-'}</td>
            <td><span class="${isPol ? 'badge-pol' : 'badge-wee'}">${isPol ? '🥥 පොල් කෙටීම' : '🌾 වී කෙටීම'}</span></td>
            <td class="text-right">${parseFloat(r.kg).toFixed(1)} Kg</td>
            <td class="text-right">Rs. ${parseFloat(r.rate).toFixed(2)}</td>
            <td class="text-right" style="font-weight:700;">Rs. ${parseFloat(r.total).toFixed(2)}</td>
            <td>${r.cashierName || 'Cashier'}</td>
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={<FiRefreshCw />} onClick={fetchMillingData}>
            නැවුම් කරන්න
          </Button>
          <Button variant="primary" icon={<FiPrinter />} onClick={handlePrintReport} disabled={filteredRecords.length === 0}>
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
              className={`filter-btn ${dateMode === 'day' && selectedDate === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
            >
              📅 අද (Today)
            </button>
            <button
              onClick={() => handleSetQuickDate('day', 1)}
              className={`filter-btn ${dateMode === 'day' && selectedDate !== new Date().toISOString().split('T')[0] ? 'active' : ''}`}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
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
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '8px 0 2px 0' }}>
            Rs. {stats.totalIncome.toFixed(2)}
          </h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>
            {stats.count} වාරයක් කෙටීම සිදුකර ඇත
          </span>
        </div>

        {/* Paddy Milling Stats */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eab308', textTransform: 'uppercase' }}>
              🌾 වී කෙටීම (Rs 7/kg)
            </span>
            <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
              {stats.weeKg.toFixed(1)} Kg
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px 0' }}>
            Rs. {stats.weeIncome.toFixed(2)}
          </h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>
            එකතු වූ වී කෙටීමේ මුළු ගාස්තුව
          </span>
        </div>

        {/* Coconut Milling Stats */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #ea580c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              🥥 පොල් කෙටීම (Rs 65/kg)
            </span>
            <span style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
              {stats.polKg.toFixed(1)} Kg
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px 0' }}>
            Rs. {stats.polIncome.toFixed(2)}
          </h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>
            එකතු වූ පොල් කෙටීමේ මුළු ගාස්තුව
          </span>
        </div>

      </div>

      {/* Search Input Bar */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="බිල් අංකය හෝ කැෂියර් නම අනුව සෙවීම..."
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
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>බිල් අංකය</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>කෙටීමේ වර්ගය</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>බර (Kg)</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>1 Kg ගාස්තුව</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>එකතුව (Rs.)</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ගෙවීම් ක්‍රමය</th>
                  <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>කැෂියර්</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date(rec.timestamp || rec.date);
                  const dateStr = d.toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
                  const isPol = rec.millingType === 'pol' || rec.name?.includes('පොල්');

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px', fontWeight: 600, fontSize: '0.9rem' }}>
                        <div>{dateStr}</div>
                        <small style={{ opacity: 0.7, fontWeight: 500 }}>{timeStr}</small>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-400)' }}>
                        #{rec.billNumber ? String(rec.billNumber).padStart(6, '0') : '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
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
                          {isPol ? '🥥 පොල් කෙටීම' : '🌾 වී කෙටීම'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {parseFloat(rec.kg).toFixed(1)} Kg
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Rs. {parseFloat(rec.rate).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                        Rs. {parseFloat(rec.total).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        {rec.paymentMethod === 'cash' ? '💵 Cash' : rec.paymentMethod === 'credit' ? '📝 Credit' : '🏠 Home Use'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {rec.cashierName || 'Cashier'}
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
    </div>
  );
}
