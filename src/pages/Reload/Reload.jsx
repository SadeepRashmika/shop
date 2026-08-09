import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import {
  FiZap, FiPhoneCall, FiDollarSign, FiCopy, FiCheck,
  FiPrinter, FiTrendingUp, FiCheckCircle, FiClock, FiUser, FiCreditCard, FiHome,
  FiSearch, FiCalendar, FiFilter, FiX
} from 'react-icons/fi';
import './Reload.css';

// Shop info for receipt
const SHOP_INFO = {
  name: 'සුමින්ද ස්ටෝර්ස්',
  phone: '07777640334',
  address: 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර'
};

// Generate Reload Receipt PDF
function generateReloadReceiptPDF(reloadRecord) {
  const billNum = reloadRecord.billNumber ? String(reloadRecord.billNumber).padStart(6, '0') : '000000';
  const dateStr = reloadRecord.date instanceof Date
    ? reloadRecord.date.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reload Receipt #${billNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Sinhala', 'Segoe UI', Arial, sans-serif;
      width: 80mm;
      margin: 0 auto;
      padding: 5mm;
      color: #000;
      font-size: 11px;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .shop-name { font-size: 16px; font-weight: 700; }
    .shop-info { font-size: 10px; color: #333; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .title { text-align: center; font-size: 14px; font-weight: 700; margin: 4px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin: 3px 0; }
    .amount-box { text-align: center; font-size: 16px; font-weight: 700; margin: 8px 0; padding: 6px; border: 1px solid #000; }
    .footer { text-align: center; margin-top: 10px; font-size: 11px; }
    @media print {
      body { width: 80mm; margin: 0; padding: 3mm; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${SHOP_INFO.name}</div>
    <div class="shop-info">${SHOP_INFO.address}</div>
    <div class="shop-info">Tel: ${SHOP_INFO.phone}</div>
  </div>

  <div class="divider"></div>

  <div class="title">RELOAD RECEIPT #${billNum}</div>

  <div class="meta-row">
    <span>Date: ${dateStr}</span>
    <span>Cashier: ${reloadRecord.cashierName || 'Cashier'}</span>
  </div>

  <div class="divider"></div>

  <div class="meta-row">
    <span>Network / ජාලය:</span>
    <span style="font-weight:700;text-transform:uppercase;">${reloadRecord.network}</span>
  </div>
  <div class="meta-row">
    <span>Phone Number / අංකය:</span>
    <span style="font-weight:700;">${reloadRecord.phone}</span>
  </div>

  <div class="amount-box">
    RELOAD: Rs. ${parseFloat(reloadRecord.amount).toFixed(2)}
  </div>

  <div class="meta-row" style="justify-content:center;">
    <span>Payment: ${reloadRecord.paymentMethod === 'cash' ? 'CASH' : reloadRecord.paymentMethod === 'credit' ? 'CREDIT' : 'HOME USE'}</span>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div style="font-weight:700;">ස්තූතියි! Thank You!</div>
    <div>SmartPOS Reload Service</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

const NETWORKS = [
  { id: 'dialog', name: 'Dialog', color: '#e11d48', ussdPrefix: '*123*' },
  { id: 'mobitel', name: 'Mobitel', color: '#2563eb', ussdPrefix: '*141*' },
  { id: 'hutch', name: 'Hutch', color: '#ea580c', ussdPrefix: '*144*' },
  { id: 'airtel', name: 'Airtel', color: '#dc2626', ussdPrefix: '*432*' },
  { id: 'slt', name: 'SLT / Broadband', color: '#0d9488', ussdPrefix: '*123*' }
];

export default function Reload() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();

  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState('dialog');
  const [amount, setAmount] = useState('');
  const [commissionRate, setCommissionRate] = useState('4.0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedDebtor, setSelectedDebtor] = useState(null);

  const [debtors, setDebtors] = useState([]);
  const [debtorSearch, setDebtorSearch] = useState('');
  const [reloadHistory, setReloadHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Search & Filter States for History
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterNetwork, setFilterNetwork] = useState('');

  // Fetch debtors and reload history
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Debtors
      const debtorSnap = await getDocs(collection(db, 'debtors'));
      setDebtors(debtorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Reloads history
      const reloadSnap = await getDocs(collection(db, 'reloads'));
      const history = reloadSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setReloadHistory(history);
    } catch (err) {
      console.error("Error fetching reload data:", err);
    }
  };

  // Auto detect network based on prefix
  const handlePhoneChange = (val) => {
    setPhone(val);
    const clean = val.trim();
    if (clean.startsWith('077') || clean.startsWith('076') || clean.startsWith('074')) {
      setNetwork('dialog');
    } else if (clean.startsWith('071') || clean.startsWith('070')) {
      setNetwork('mobitel');
    } else if (clean.startsWith('078') || clean.startsWith('072')) {
      setNetwork('hutch');
    } else if (clean.startsWith('075')) {
      setNetwork('airtel');
    }
  };

  const selectedNetObj = NETWORKS.find(n => n.id === network) || NETWORKS[0];
  const calculatedProfit = (parseFloat(amount) || 0) * ((parseFloat(commissionRate) || 0) / 100);
  const ussdCode = phone && amount ? `${selectedNetObj.ussdPrefix}${phone}*${amount}#` : '';

  const handleCopyUSSD = () => {
    if (!ussdCode) return;
    navigator.clipboard.writeText(ussdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit Reload Sale
  const handleSubmitReload = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!phone || phone.length < 9) {
      alert("කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න (Valid Phone Number).");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert("කරුණාකර නිවැරදි මුදලක් ඇතුළත් කරන්න (Valid Amount).");
      return;
    }
    if (paymentMethod === 'credit' && !selectedDebtor) {
      alert("ණයට රීලෝඩ් දීමට කරුණාකර ණයගැතියා තෝරන්න (Select Debtor).");
      return;
    }

    setLoading(true);

    try {
      // Counter for Bill Number
      const counterRef = doc(db, 'counters', 'billNumber');
      const counterSnap = await getDocs(collection(db, 'counters'));
      let billNumber = Date.now() % 1000000;

      const reloadId = `RLD${Date.now()}`;
      const reloadRecord = {
        billNumber,
        phone,
        network,
        amount: numAmount,
        commissionRate: parseFloat(commissionRate) || 0,
        profit: calculatedProfit,
        paymentMethod,
        cashierId: userData?.uid || 'unknown',
        cashierName: userData?.name || 'Cashier',
        timestamp: serverTimestamp(),
        date: new Date()
      };

      if (paymentMethod === 'credit') {
        reloadRecord.debtorId = selectedDebtor.id;
        reloadRecord.debtorName = selectedDebtor.name;

        // Update Debtor Balance
        await updateDoc(doc(db, 'debtors', selectedDebtor.id), {
          totalOwed: increment(numAmount)
        });
      }

      // Save to Reloads collection
      await setDoc(doc(db, 'reloads', reloadId), reloadRecord);

      // Also save to POS Transactions so it shows in main reports & sales
      const transactionData = {
        billNumber,
        items: [{
          id: `reload_${network}`,
          name: `${selectedNetObj.name} Reload (${phone})`,
          sellPrice: numAmount,
          quantity: 1,
          subtotal: numAmount,
          isReload: true
        }],
        total: numAmount,
        paymentMethod,
        cashierId: userData?.uid || 'unknown',
        cashierName: userData?.name || 'Cashier',
        timestamp: serverTimestamp(),
        status: 'completed',
        isReload: true,
        reloadPhone: phone,
        reloadNetwork: network
      };
      if (paymentMethod === 'credit') {
        transactionData.debtorId = selectedDebtor.id;
        transactionData.debtorName = selectedDebtor.name;
        transactionData.creditAmount = numAmount;
      }

      await setDoc(doc(db, 'transactions', `TXN_RLD_${Date.now()}`), transactionData);

      // Sync with Cash Manager if Cash
      if (paymentMethod === 'cash') {
        try {
          const qSession = query(
            collection(db, 'cashSessions'),
            where('status', '==', 'open')
          );
          const sessionSnap = await getDocs(qSession);
          if (!sessionSnap.empty) {
            const openDoc = sessionSnap.docs[0];
            const existingEntries = openDoc.data().entries || [];
            const saleEntry = {
              type: 'in',
              isSale: true,
              isReload: true,
              amount: numAmount,
              note: `${selectedNetObj.name} Reload #${phone}`,
              billNumber,
              time: new Date().toISOString()
            };
            await updateDoc(doc(db, 'cashSessions', openDoc.id), {
              entries: [...existingEntries, saleEntry]
            });
          }
        } catch (csErr) {
          console.warn("Could not sync reload to cash session:", csErr);
        }
      }

      // Print Receipt
      generateReloadReceiptPDF(reloadRecord);

      // Clear Form
      setPhone('');
      setAmount('');
      setSelectedDebtor(null);
      fetchData();
      alert("✅ රීලෝඩ් එක සාර්ථකව සටහන් විය!");
    } catch (err) {
      console.error(err);
      alert("Failed to process reload: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // All-time Stats
  const allTimeTotalAmount = reloadHistory.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const allTimeTotalProfit = reloadHistory.reduce((acc, r) => acc + (parseFloat(r.profit) || 0), 0);

  // Today Stats
  const todayStr = new Date().toDateString();
  const todayReloads = reloadHistory.filter(r => {
    const dateObj = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.date ? new Date(r.date) : null);
    if (!dateObj) return false;
    return dateObj.toDateString() === todayStr;
  });
  const todayTotalAmount = todayReloads.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const todayTotalProfit = todayReloads.reduce((acc, r) => acc + (parseFloat(r.profit) || 0), 0);

  // Filtering Reload History by Phone Number, Date, or Network
  const filteredHistory = reloadHistory.filter(r => {
    if (searchTerm.trim()) {
      const cleanSearch = searchTerm.trim().toLowerCase();
      const phoneMatch = r.phone && r.phone.toLowerCase().includes(cleanSearch);
      const billMatch = r.billNumber && String(r.billNumber).includes(cleanSearch);
      if (!phoneMatch && !billMatch) return false;
    }

    if (filterDate) {
      const dateObj = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.date ? new Date(r.date) : null);
      if (!dateObj) return false;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const itemDateStr = `${year}-${month}-${day}`;
      if (itemDateStr !== filterDate) return false;
    }

    if (filterNetwork) {
      if (r.network !== filterNetwork) return false;
    }

    return true;
  });

  const filteredTotalAmount = filteredHistory.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="reload-page fade-in">
      {/* Header */}
      <div className="reload-header">
        <div>
          <h1 className="reload-title gradient-text">
            <FiZap /> {t('reload.title')}
          </h1>
          <p className="reload-subtitle">{t('reload.subtitle')}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="reload-stats-grid">
        {/* All-Time Total Reload Card */}
        <div className="reload-stat-card glass-card">
          <div className="reload-stat-icon total" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <FiDollarSign />
          </div>
          <div>
            <div className="reload-stat-label">දැනට මුළු Reload එකතුව (All-Time)</div>
            <div className="reload-stat-value" style={{ color: '#60a5fa' }}>Rs. {allTimeTotalAmount.toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>මුළු Reloads {reloadHistory.length} ක්</div>
          </div>
        </div>

        {/* Today Total Card */}
        <div className="reload-stat-card glass-card">
          <div className="reload-stat-icon total">
            <FiZap />
          </div>
          <div>
            <div className="reload-stat-label">{t('reload.todayTotal')}</div>
            <div className="reload-stat-value">Rs. {todayTotalAmount.toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>අද Reloads {todayReloads.length} ක්</div>
          </div>
        </div>

        {/* Today Profit Card */}
        <div className="reload-stat-card glass-card">
          <div className="reload-stat-icon profit">
            <FiTrendingUp />
          </div>
          <div>
            <div className="reload-stat-label">{t('reload.todayProfit')}</div>
            <div className="reload-stat-value" style={{ color: 'var(--success-400)' }}>
              Rs. {todayTotalProfit.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>මුළු ලාභය: Rs. {allTimeTotalProfit.toFixed(2)}</div>
          </div>
        </div>

        {/* Filtered Total Card */}
        <div className="reload-stat-card glass-card">
          <div className="reload-stat-icon count">
            <FiPhoneCall />
          </div>
          <div>
            <div className="reload-stat-label">
              {(searchTerm || filterDate || filterNetwork) ? 'සොයාගත් Reload එකතුව' : 'මුළු Reload ගණන'}
            </div>
            <div className="reload-stat-value" style={{ color: (searchTerm || filterDate || filterNetwork) ? '#f59e0b' : 'var(--text-primary)' }}>
              Rs. {filteredTotalAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {(searchTerm || filterDate || filterNetwork) ? `ලැයිස්තුවේ Reloads ${filteredHistory.length} ක්` : `ලැයිස්තුවේ Reloads ${filteredHistory.length} ක්`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="reload-content-grid">
        {/* Reload Form */}
        <div className="reload-form-card glass-card">
          <h2 className="section-title mb-4" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiZap style={{ color: 'var(--primary-400)' }} /> {t('reload.quickReload')}
          </h2>

          <form onSubmit={handleSubmitReload}>
            {/* Phone Number Input */}
            <div className="mb-4">
              <label className="input-label mb-2 d-block">{t('reload.phoneNumber')}</label>
              <div className="search-box glass" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <FiPhoneCall className="search-icon" />
                <input
                  type="text"
                  placeholder="077XXXXXXX"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="search-input"
                  style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}
                  required
                />
              </div>
            </div>

            {/* Network Selector */}
            <div className="mb-4">
              <label className="input-label mb-2 d-block">{t('reload.selectNetwork')}</label>
              <div className="network-selector-grid">
                {NETWORKS.map(net => (
                  <button
                    key={net.id}
                    type="button"
                    className={`network-btn ${net.id} ${network === net.id ? 'active' : ''}`}
                    onClick={() => setNetwork(net.id)}
                  >
                    <span>{net.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reload Amount Input */}
            <div className="mb-4">
              <label className="input-label mb-2 d-block">{t('reload.amount')}</label>
              <div className="search-box glass" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <FiDollarSign className="search-icon" />
                <input
                  type="number"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="search-input"
                  style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success-400)' }}
                  required
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="quick-amounts">
                {[50, 100, 200, 350, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className="quick-amt-chip"
                    onClick={() => setAmount(amt.toString())}
                  >
                    Rs. {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Dealer Commission & Profit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="input-label mb-1 d-block">{t('reload.commission')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="search-input glass"
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', width: '100%', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label className="input-label mb-1 d-block">{t('reload.calculatedProfit')}</label>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-400)', fontWeight: 'bold', fontSize: '1rem' }}>
                  Rs. {calculatedProfit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* USSD Dial Helper Box */}
            {ussdCode && (
              <div className="ussd-box fade-in">
                <div className="ussd-header">
                  <span className="ussd-title">
                    <FiPhoneCall /> {t('reload.ussdCode')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('reload.dialInstructions')}</span>
                </div>
                <div className="ussd-code-display">
                  <span>{ussdCode}</span>
                  <button
                    type="button"
                    className="copy-ussd-btn"
                    onClick={handleCopyUSSD}
                  >
                    {copied ? <FiCheck /> : <FiCopy />}
                    <span>{copied ? t('reload.copied') : t('reload.copyUssd')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="input-label mb-2 d-block">{t('sales.paymentMethod')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1px solid var(--border-color)',
                    background: paymentMethod === 'cash' ? 'rgba(22, 163, 74, 0.15)' : 'var(--bg-glass)',
                    color: paymentMethod === 'cash' ? '#4ade80' : 'var(--text-secondary)',
                    fontWeight: paymentMethod === 'cash' ? '700' : '500',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <FiDollarSign /> {t('sales.cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: paymentMethod === 'credit' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    background: paymentMethod === 'credit' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-glass)',
                    color: paymentMethod === 'credit' ? '#fbbf24' : 'var(--text-secondary)',
                    fontWeight: paymentMethod === 'credit' ? '700' : '500',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <FiCreditCard /> {t('sales.credit')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('home_use')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: paymentMethod === 'home_use' ? '2px solid #06b6d4' : '1px solid var(--border-color)',
                    background: paymentMethod === 'home_use' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-glass)',
                    color: paymentMethod === 'home_use' ? '#22d3ee' : 'var(--text-secondary)',
                    fontWeight: paymentMethod === 'home_use' ? '700' : '500',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <FiHome /> {t('sales.homeUse')}
                </button>
              </div>
            </div>

            {/* Debtor Selector if Credit */}
            {paymentMethod === 'credit' && (
              <div className="debtor-selection mb-4">
                <label className="input-label mb-2 d-block">{t('sales.selectDebtor')}</label>
                <input
                  type="text"
                  placeholder="Search debtor..."
                  value={debtorSearch}
                  onChange={(e) => setDebtorSearch(e.target.value)}
                  className="search-input glass mb-2"
                  style={{ padding: '0.5rem', width: '100%', borderRadius: 'var(--radius-md)' }}
                />
                <div className="debtor-list-mini" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                  {debtors.filter(d => d.name.toLowerCase().includes(debtorSearch.toLowerCase())).map(d => (
                    <div
                      key={d.id}
                      className={`debtor-mini-item ${selectedDebtor?.id === d.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDebtor(d)}
                    >
                      <FiUser />
                      <div className="min-info">
                        <span>#{d.debtorNo || '-'} {d.name}</span>
                        <small>{d.phone}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              icon={<FiPrinter />}
              fullWidth
              style={{ height: '50px', fontSize: '1rem', fontWeight: 'bold' }}
            >
              {t('reload.processReload')}
            </Button>
          </form>
        </div>

        {/* Reload History */}
        <div className="reload-history-card glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <h2 className="section-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FiClock style={{ color: 'var(--accent-400)' }} /> {t('reload.history')} & Search
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {filteredHistory.length} records found
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div className="reload-filter-bar mb-3" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Phone Number Input Search */}
            <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
              <input
                type="text"
                placeholder="අංකය / Phone Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input glass"
                style={{ padding: '0.45rem 0.5rem 0.45rem 2.2rem', width: '100%', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
              />
              <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Date Filter Input */}
            <div style={{ minWidth: '140px', position: 'relative' }}>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="search-input glass"
                style={{ padding: '0.45rem 0.5rem', width: '100%', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                title="Filter by date"
              />
            </div>

            {/* Network Filter */}
            <select
              value={filterNetwork}
              onChange={(e) => setFilterNetwork(e.target.value)}
              className="search-input glass"
              style={{ padding: '0.45rem 0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-glass)' }}
            >
              <option value="">සියලු ජාල (All Networks)</option>
              <option value="dialog">Dialog</option>
              <option value="mobitel">Mobitel</option>
              <option value="hutch">Hutch</option>
              <option value="airtel">Airtel</option>
              <option value="slt">SLT</option>
            </select>

            {/* Clear Button */}
            {(searchTerm || filterDate || filterNetwork) && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterNetwork(''); }}
                style={{ padding: '0.45rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--error-400)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error-400)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Clear Filters"
              >
                <FiX /> Clear
              </button>
            )}
          </div>

          {/* Filter Status Summary Banner */}
          {(searchTerm || filterDate || filterNetwork) && (
            <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                🔍 සොයාගත් Reloads: <strong>{filteredHistory.length}</strong> | එකතුව: <strong>Rs. {filteredTotalAmount.toFixed(2)}</strong>
                {searchTerm && ` | අංකය: "${searchTerm}"`}
                {filterDate && ` | දිනය: "${filterDate}"`}
              </span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px' }}>
            {filteredHistory.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 4px' }}>{t('reload.date')}</th>
                    <th style={{ padding: '8px 4px' }}>{t('reload.network')}</th>
                    <th style={{ padding: '8px 4px' }}>{t('reload.phoneNumber')}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('reload.amount')}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>ක්‍රමය</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Print</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(item => {
                    const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : (item.date ? new Date(item.date) : new Date());
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {dateObj.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}<br />
                          <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                            {dateObj.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td style={{ padding: '8px 4px' }}>
                          <span className={`network-badge ${item.network}`} style={{ textTransform: 'capitalize' }}>
                            {item.network}
                          </span>
                        </td>
                        <td style={{ padding: '8px 4px', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {item.phone}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', color: 'var(--success-400)', fontSize: '0.95rem' }}>
                          Rs. {parseFloat(item.amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '10px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: item.paymentMethod === 'credit' ? 'rgba(245, 158, 11, 0.2)' : item.paymentMethod === 'home_use' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: item.paymentMethod === 'credit' ? '#fbbf24' : item.paymentMethod === 'home_use' ? '#22d3ee' : '#4ade80'
                          }}>
                            {item.paymentMethod === 'credit' ? 'CREDIT' : item.paymentMethod === 'home_use' ? 'HOME' : 'CASH'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => generateReloadReceiptPDF(item)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary-400)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                            title="Reprint Receipt"
                          >
                            <FiPrinter />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <FiZap style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>{t('reload.noHistory')}</p>
                {(searchTerm || filterDate || filterNetwork) && (
                  <small style={{ color: 'var(--primary-400)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterNetwork(''); }}>
                    සොයුම් ෆිල්ටර් ඉවත් කරන්න (Clear Filters)
                  </small>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
