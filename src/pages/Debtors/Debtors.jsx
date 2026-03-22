import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser, FiPhone, FiCreditCard, FiDownload, FiDollarSign, FiList } from 'react-icons/fi';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';
import './Debtors.css';

export default function Debtors() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Transaction Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDebtor, setPaymentDebtor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [transactionType, setTransactionType] = useState('payment'); // 'payment' or 'loan'

  // Ledger State
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerDebtor, setLedgerDebtor] = useState(null);
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

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

  useEffect(() => {
    fetchDebtors();
  }, []);

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
      fetchDebtors(); // refresh data
    } catch (err) {
      console.error(err);
      setModalError('Failed to process payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenLedger = async (debtor) => {
     setLedgerDebtor(debtor);
     setIsLedgerOpen(true);
     setLedgerHistory([]);
     setLedgerLoading(true);
     
     try {
       const txnSnapshot = await getDocs(collection(db, 'transactions'));
       const loans = txnSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.debtorId === debtor.id && t.paymentMethod === 'credit');
          
       const paySnapshot = await getDocs(collection(db, 'debtor_payments'));
       const payments = paySnapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.debtorId === debtor.id);

       const history = [...loans, ...payments].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
       setLedgerHistory(history);
     } catch (err) {
       console.error(err);
     } finally {
       setLedgerLoading(false);
     }
  };

  const downloadReport = async (type) => {
    try {
      const headers = type === 'monthly' 
        ? ['Date', 'Type', 'Debtor Name', 'Amount (Rs.)', 'Cashier']
        : ['Debtor No', 'Name', 'Phone', 'Total Owed (Rs.)'];
      
      let rows = [];

      if (type === 'all') {
        rows = debtors.map(d => [
          d.debtorNo || '', d.name, d.phone, Number(d.totalOwed).toFixed(2)
        ]);
      } else if (type === 'monthly') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
        
        const paySnapshot = await getDocs(collection(db, 'debtor_payments'));
        const transactions = await getDocs(collection(db, 'transactions'));
        
        const allActs = [];
        paySnapshot.forEach(doc => {
          const d = doc.data();
          if (d.timestamp?.seconds >= startOfMonth) allActs.push({ ...d, actType: 'Payment' });
        });
        
        transactions.forEach(doc => {
          const d = doc.data();
          if (d.paymentMethod === 'credit' && d.timestamp?.seconds >= startOfMonth) {
            allActs.push({ ...d, amount: d.total, actType: 'Loan (Sale)' });
          }
        });

        allActs.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        rows = allActs.map(a => [
          new Date(a.timestamp.seconds * 1000).toLocaleDateString(),
          a.actType,
          a.debtorName || 'Unknown',
          Number(a.amount).toFixed(2),
          a.cashierName || 'Unknown'
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, `Debtor_Report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate report.");
    }
  };

  const downloadSingleLedger = () => {
     if (!ledgerDebtor) return;
     const headers = ['Date', 'Type', 'Amount (Rs.)', 'Cashier'];
     const rows = ledgerHistory.map(h => {
        const isPayment = h.type === 'payment';
        const actType = isPayment ? 'Payment Received' : 'New Loan/Credit Sale';
        const amt = isPayment ? h.amount : (h.total || h.amount);
        const date = h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleString() : 'Just now';
        return [date, actType, Number(amt).toFixed(2), h.cashierName || 'Unknown'];
     });
     
     const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
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

  const filteredDebtors = debtors.filter(d => {
    const s = search.toLowerCase().trim();
    if (!s) return true;
    const cleanS = s.replace('#', '').replace('no', '').trim();
    return d.name.toLowerCase().includes(s) || 
           d.phone.includes(s) ||
           d.barcode?.toLowerCase().includes(s) ||
           d.debtorNo?.toString() === cleanS ||
           d.debtorNo?.toString().includes(cleanS);
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

      <div className="debtors-toolbar glass-card">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search name, phone or No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
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
                <th>{t('debtors.totalOwed')}</th>
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
                        <button className="icon-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(debtor.id); }} title={t('common.delete')}>
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
              required
              placeholder="0XXXXXXXXX"
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
           <div className="flex flex-wrap justify-between items-start mb-6 bg-[rgba(0,0,0,0.2)] p-4 rounded-lg border border-[rgba(255,255,255,0.05)]">
               <div>
                 <h2 className="text-xl font-bold mb-2 text-white">{ledgerDebtor?.name} <span className="text-xs text-secondary bg-[rgba(255,255,255,0.1)] px-2 py-1 rounded ml-2">#{ledgerDebtor?.debtorNo || '-'}</span></h2>
                 <p className="text-sm text-secondary mb-1"><FiPhone className="inline mr-2"/>{ledgerDebtor?.phone}</p>
                 <p className="text-sm text-secondary mb-1"><FiUser className="inline mr-2"/>{ledgerDebtor?.address || 'No Address Provided'}</p>
                 <p className="text-sm text-secondary"><FiCreditCard className="inline mr-2"/>{ledgerDebtor?.barcode}</p>
               </div>
               <div className="text-right">
                 <p className="text-secondary text-sm mb-1">Total Outstanding Debt</p>
                 <h3 className="text-error font-bold text-3xl">Rs. {Number(ledgerDebtor?.totalOwed || 0).toFixed(2)}</h3>
               </div>
           </div>
           
           <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-lg">Transaction Ledger</h3>
             <Button onClick={downloadSingleLedger} variant="secondary" icon={<FiDownload />} size="sm">
               Export Excel
             </Button>
           </div>
           
           {ledgerLoading ? (
             <div className="text-center p-4">Loading history...</div>
           ) : (
             <div className="ledger-list mt-4" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {ledgerHistory.length > 0 ? ledgerHistory.map(h => {
                   const isPayment = h.type === 'payment';
                   const amt = isPayment ? h.amount : (h.total || h.amount);
                   const date = h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleString() : 'Just now';
                   return (
                     <div key={h.id} className="ledger-item flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.05)]">
                       <div>
                          <p className="font-bold text-sm">{isPayment ? 'Payment Received' : 'New Loan/Credit Sale'}</p>
                          <p className="text-xs text-secondary">{date} • By: {h.cashierName || 'Cashier'}</p>
                       </div>
                       <div className={`font-bold ${isPayment ? 'text-success' : 'text-error'}`}>
                          {isPayment ? '+' : '-'} Rs. {Number(amt).toFixed(2)}
                       </div>
                     </div>
                   );
                }) : (
                  <p className="text-secondary text-center p-4">No transaction history found.</p>
                )}
             </div>
           )}
           <div className="modal-actions mt-6">
             <Button type="button" variant="secondary" onClick={() => setIsLedgerOpen(false)}>Close</Button>
           </div>
        </div>
      </Modal>

    </div>
  );
}
