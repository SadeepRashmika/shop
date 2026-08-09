import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import {
  FiSearch, FiShoppingCart, FiPlus, FiMinus, FiTrash2,
  FiCreditCard, FiDollarSign, FiUser, FiMaximize, FiPrinter, FiCheckCircle,
  FiFileText, FiHash, FiHome, FiStar, FiEye
} from 'react-icons/fi';

import './Sales.css';

// Shop information
const SHOP_INFO = {
  name: 'සුමින්ද ස්ටෝර්ස්',
  phone: '07777640334',
  email: 'sumindapradeep1111@gmail.com',
  address: 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර'
};

// Generate Bill Receipt - opens in print window (supports Sinhala text)
function generateBillPDF(billData) {
  const billNum = billData.billNumber ? String(billData.billNumber).padStart(6, '0') : '000000';
  const dateStr = billData.date instanceof Date
    ? billData.date.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });

  const itemsHTML = billData.items.map(item => `
    <tr>
      <td style="text-align:left;padding:4px 0;">${item.name}</td>
      <td style="text-align:center;padding:4px 0;">${item.quantity}</td>
      <td style="text-align:right;padding:4px 0;">${item.sellPrice.toFixed(2)}</td>
      <td style="text-align:right;padding:4px 0;">${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill #${billNum}</title>
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
    .shop-name { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .shop-info { font-size: 10px; color: #333; line-height: 1.5; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .bill-number { text-align: center; font-size: 14px; font-weight: 700; margin: 4px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th { font-weight: 700; padding: 4px 0; border-bottom: 1px solid #000; font-size: 10px; }
    .total-section { margin-top: 6px; }
    .total-row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
    .grand-total { font-size: 14px; font-weight: 700; margin: 4px 0; }
    .footer { text-align: center; margin-top: 10px; font-size: 11px; }
    .footer .thanks { font-weight: 700; font-size: 12px; }
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
    <div class="shop-info">${SHOP_INFO.email}</div>
  </div>

  <div class="divider"></div>

  <div class="bill-number">BILL #${billNum}</div>

  <div class="meta-row">
    <span>Date: ${dateStr}</span>
    <span>Cashier: ${billData.cashierName || 'N/A'}</span>
  </div>
  ${billData.paymentMethod === 'credit' && billData.debtorName ? `<div class="meta-row"><span>Customer: ${billData.debtorName}</span></div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-section">
    <div class="total-row">
      <span>Subtotal</span>
      <span>Rs. ${billData.total.toFixed(2)}</span>
    </div>
    <div class="total-row grand-total">
      <span>TOTAL</span>
      <span>Rs. ${billData.total.toFixed(2)}</span>
    </div>
    ${billData.tenderedAmount > 0 ? `
    <div class="divider"></div>
    <div class="total-row">
      <span>Tendered (දුන් මුදල)</span>
      <span>Rs. ${billData.tenderedAmount.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>${billData.tenderedAmount >= billData.total ? 'Balance (ඉතිරි මුදල)' : 'Due (ණය)'}</span>
      <span>Rs. ${Math.abs(billData.tenderedAmount - billData.total).toFixed(2)}</span>
    </div>
    ` : ''}
  </div>

  <div class="divider"></div>

  <div class="meta-row" style="justify-content:center;">
    <span>Payment: ${billData.paymentMethod === 'cash' ? 'CASH' : billData.paymentMethod === 'credit' ? 'CREDIT' : 'HOME USE (නිවසට ගත්)'}</span>
  </div>

  <div class="footer">
    <div class="thanks">ස්තූතියි! Thank You!</div>
    <div>Please visit again</div>
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
  } else {
    alert('Please allow popup windows for this site to print receipts.');
  }
}

// Get next bill number from Firestore
async function getNextBillNumber() {
  const counterRef = doc(db, 'counters', 'billNumber');
  const counterSnap = await getDoc(counterRef);

  if (counterSnap.exists()) {
    const current = counterSnap.data().current || 0;
    const next = current + 1;
    if (next > 1000000) {
      throw new Error('Bill number limit reached (1,000,000)');
    }
    await updateDoc(counterRef, { current: next });
    return next;
  } else {
    // Initialize counter
    await setDoc(counterRef, { current: 1 });
    return 1;
  }
}

export default function Sales() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, userData, isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('smartpos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [debtorSearch, setDebtorSearch] = useState('');
  const [favoriteItemIds, setFavoriteItemIds] = useState(() => {
    try {
      const saved = localStorage.getItem('smartpos_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggleFavorite = async (item) => {
    const itemId = item.id;
    const isFav = favoriteItemIds.includes(itemId) || item.isFavorite;
    let updatedFavs;
    if (isFav) {
      updatedFavs = favoriteItemIds.filter(id => id !== itemId);
    } else {
      updatedFavs = [...favoriteItemIds, itemId];
    }
    setFavoriteItemIds(updatedFavs);
    localStorage.setItem('smartpos_favorites', JSON.stringify(updatedFavs));

    setItems(prevItems =>
      prevItems.map(i => (i.id === itemId ? { ...i, isFavorite: !isFav } : i))
    );

    try {
      await updateDoc(doc(db, 'items', itemId), {
        isFavorite: !isFav
      });
    } catch (err) {
      console.warn("Could not sync favorite to Firestore:", err);
    }
  };

  // Checkout Multi-step
  const [previewModal, setPreviewModal] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState('');
  const [lastBillNumber, setLastBillNumber] = useState(null);
  const [lastBillData, setLastBillData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tenderedAmount, setTenderedAmount] = useState('');

  // Bill Search
  const [billSearchModal, setBillSearchModal] = useState(false);
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [billSearchResults, setBillSearchResults] = useState([]);
  const [billSearchLoading, setBillSearchLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetailModal, setBillDetailModal] = useState(false);

  // Barcode input focus
  const barcodeInputRef = useRef(null);

  // Weight entry for weighed items
  const [weightModal, setWeightModal] = useState(false);
  const [weightItem, setWeightItem] = useState(null);
  const [weightValue, setWeightValue] = useState('');

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('smartpos_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const itemSnapshot = await getDocs(collection(db, 'items'));
        const loadedItems = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(loadedItems);

        const debtorSnapshot = await getDocs(collection(db, 'debtors'));
        setDebtors(debtorSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Initialize from orders page if navigating from 'Bill It'
        if (location.state?.orderItems) {
          const initialCart = location.state.orderItems.map(orderItem => {
            const matchedItem = loadedItems.find(i => i.id === orderItem.id);
            return {
              ...orderItem,
              sellPrice: orderItem.price || orderItem.sellPrice || 0,
              stock: matchedItem ? matchedItem.stock : 999,
              itemNo: matchedItem ? matchedItem.itemNo : null
            };
          });
          setCart(initialCart);

          // Clear location state to prevent reload loops
          window.history.replaceState({}, document.title);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Keyboard shortcut for focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToCart = (item) => {
    if (item.stock <= 0) {
      alert("Item out of stock!");
      return;
    }

    // Weighed items need weight input
    if (item.itemType === 'weighed') {
      setWeightItem(item);
      setWeightValue('');
      setWeightModal(true);
      return;
    }

    const existingInCart = cart.find(c => c.id === item.id);
    if (existingInCart) {
      if (existingInCart.quantity >= item.stock) {
        alert("Maximum stock reached!");
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([{ ...item, quantity: 1 }, ...cart]);
    }
    setSearch('');
  };

  const addWeighedToCart = () => {
    const weight = parseFloat(weightValue);
    if (!weight || weight <= 0) {
      alert('Please enter a valid weight.');
      return;
    }
    if (weight > weightItem.stock) {
      alert(`Only ${weightItem.stock} kg available in stock!`);
      return;
    }

    // Always add as new line with unique cartId — at the TOP
    const cartId = `${weightItem.id}_${Date.now()}`;
    setCart([{ ...weightItem, quantity: weight, cartId }, ...cart]);
    setWeightModal(false);
    setWeightItem(null);
    setWeightValue('');
    setSearch('');
  };

  const removeFromCart = (itemId, cartId) => {
    if (cartId) {
      setCart(cart.filter(item => item.cartId !== cartId));
    } else {
      setCart(cart.filter(item => item.id !== itemId));
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        // For weighed items, delta is ±0.1 kg
        const step = item.itemType === 'weighed' ? 0.1 : 1;
        const newQty = Math.round((item.quantity + (delta > 0 ? step : -step)) * 100) / 100;
        if (newQty <= 0) return item;
        if (newQty > item.stock) {
          alert("Maximum stock reached!");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateWeightDirectly = (cartId, newWeight) => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 0) return;
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        if (weight > item.stock) return item;
        return { ...item, quantity: weight };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);

  const filteredItems = search ? items.filter(item => {
    if (search && item.itemNo?.toString() === search.trim()) return true;
    return item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(search.toLowerCase());
  }) : [];

  const gridDisplayItems = items.filter(item => {
    const isFav = favoriteItemIds.includes(item.id) || item.isFavorite;
    if (selectedCategory === 'favorites') {
      return isFav;
    }
    if (selectedCategory) {
      return item.category === selectedCategory;
    }
    if (search) {
      const s = search.toLowerCase().trim();
      const cleanS = s.replace('#', '').replace('no', '').trim();
      return (
        item.name?.toLowerCase().includes(s) ||
        item.barcode?.toLowerCase().includes(s) ||
        item.category?.toLowerCase().includes(s) ||
        item.itemNo?.toString() === cleanS ||
        item.itemNo?.toString().includes(cleanS)
      );
    }
    return true;
  });

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && filteredItems.length === 1) {
      addToCart(filteredItems[0]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setActionLoading(true);

    try {
      // Get next bill number
      const billNumber = await getNextBillNumber();

      const transactionId = `TXN${Date.now()}`;
      const cartItems = cart.map(item => ({
        id: item.id,
        itemNo: item.itemNo || null,
        name: item.name,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
        subtotal: item.sellPrice * item.quantity
      }));

      const transactionData = {
        billNumber,
        items: cartItems,
        total: subtotal,
        paymentMethod,
        cashierId: userData?.uid || 'unknown',
        cashierName: userData?.name || 'Unknown',
        timestamp: serverTimestamp(),
        status: 'completed'
      };

      if (paymentMethod === 'credit') {
        if (!selectedDebtor) throw new Error("Please select a debtor for credit sale.");
        transactionData.debtorId = selectedDebtor.id;
        transactionData.debtorName = selectedDebtor.name;

        // Calculate actual credit/loan amount: total amount minus any upfront payment made (tenderedAmount)
        const upfrontPayment = parseFloat(tenderedAmount) || 0;
        const creditAmount = Math.max(0, subtotal - upfrontPayment);
        transactionData.creditAmount = creditAmount;
        transactionData.upfrontPayment = upfrontPayment;

        // Update debtor totalOwed with only the unpaid balance
        await updateDoc(doc(db, 'debtors', selectedDebtor.id), {
          totalOwed: increment(creditAmount)
        });
      }

      // Update Stock for each item
      for (const item of cart) {
        await updateDoc(doc(db, 'items', item.id), {
          stock: increment(-item.quantity)
        });
      }

      // Save Transaction
      await setDoc(doc(db, 'transactions', transactionId), transactionData);

      // Automatically update active cash session for real-time balance update in Cash Manager
      if (paymentMethod === 'cash') {
        try {
          const currentUid = user?.uid || userData?.uid;
          const qSession = query(
            collection(db, 'cashSessions'),
            where('status', '==', 'open')
          );
          const sessionSnap = await getDocs(qSession);
          if (!sessionSnap.empty) {
            const openDoc = sessionSnap.docs.find(d => d.data().cashierId === currentUid) || sessionSnap.docs[0];
            const sessData = openDoc.data();
            const existingEntries = sessData.entries || [];
            const formattedBillNo = String(billNumber).padStart(6, '0');
            const saleEntry = {
              type: 'in',
              isSale: true,
              amount: subtotal,
              note: `Bill #${formattedBillNo}`,
              billNumber: billNumber,
              time: new Date().toISOString()
            };
            await updateDoc(doc(db, 'cashSessions', openDoc.id), {
              entries: [...existingEntries, saleEntry]
            });
          }
        } catch (csErr) {
          console.warn("Could not sync sale with active cash session:", csErr);
        }
      }

      // if billing from an order, mark it completed
      if (location.state?.orderId) {
        await updateDoc(doc(db, 'orders', location.state.orderId), {
          status: 'completed'
        });
      }

      // Store bill data for receipt
      const billData = {
        billNumber,
        items: cartItems,
        total: subtotal,
        paymentMethod,
        tenderedAmount: parseFloat(tenderedAmount) || 0,
        cashierName: userData?.name || 'Unknown',
        debtorName: paymentMethod === 'credit' ? selectedDebtor?.name : null,
        date: new Date()
      };

      setLastTransactionId(transactionId);
      setLastBillNumber(billNumber);
      setLastBillData(billData);
      setIsSuccessModal(true);
      setCheckoutModal(false);
      setCart([]);
      setSelectedDebtor(null);
      setPaymentMethod('cash');
      setDebtorSearch('');
      setTenderedAmount('');

      // Refresh data to reflect stock changes
      const itemSnapshot = await getDocs(collection(db, 'items'));
      setItems(itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to process transaction.");
    } finally {
      setActionLoading(false);
    }
  };

  // Print receipt as PDF
  const handlePrintReceipt = () => {
    if (lastBillData) {
      generateBillPDF(lastBillData);
    }
  };

  // Bill Search Functions
  const handleBillSearch = async () => {
    if (!billSearchQuery.trim()) return;
    setBillSearchLoading(true);
    try {
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      const allTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const cleanQuery = billSearchQuery.trim();
      const searchNum = parseInt(cleanQuery);
      const results = allTransactions.filter(txn => {
        // Search by exact bill number
        if (txn.billNumber && txn.billNumber === searchNum) return true;
        // Search by padded bill number string match
        if (txn.billNumber && String(txn.billNumber).padStart(6, '0').includes(cleanQuery)) return true;
        // Search by transaction ID
        if (txn.id && txn.id.toLowerCase().includes(cleanQuery.toLowerCase())) return true;
        return false;
      });

      setBillSearchResults(results);
    } catch (err) {
      console.error('Bill search error:', err);
      alert('Failed to search bills.');
    } finally {
      setBillSearchLoading(false);
    }
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setBillDetailModal(true);
  };

  const handleReprintBill = (bill) => {
    const billData = {
      billNumber: bill.billNumber,
      items: bill.items,
      total: bill.total,
      paymentMethod: bill.paymentMethod,
      cashierName: bill.cashierName || 'N/A',
      debtorName: bill.debtorName || null,
      date: bill.timestamp?.toDate ? bill.timestamp.toDate() : new Date()
    };
    generateBillPDF(billData);
  };

  return (
    <div className="sales-page fade-in">
      <div className="sales-container">
        {/* Left Side: Items Selection */}
        <div className="sales-left">
          <div className="page-header mb-4">
            <h1 className="page-title gradient-text">{t('sales.title')}</h1>
            <button className="bill-search-btn glass" onClick={() => setBillSearchModal(true)} title={t('sales.searchBill')}>
              <FiFileText /> <span>{t('sales.searchBill')}</span>
            </button>
          </div>

          <div className="search-section glass-card">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Search name, barcode or Item No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="search-input"
                autoFocus
              />
              <button className="scan-btn" title="Scan Barcode"><FiMaximize /></button>
            </div>

            {search && (
              <div className="search-results">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <div key={item.id} className="search-result-item" onClick={() => addToCart(item)}>
                      <div className="result-img">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <FiSearch />}
                      </div>
                      <div className="result-info">
                        <span className="result-name">{item.name}</span>
                        <span className="result-stock">{item.stock} in stock</span>
                      </div>
                      <div className="result-price">
                        Rs. {item.sellPrice.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">No items found.</div>
                )}
              </div>
            )}
          </div>

          <div className="quick-categories mt-4">
            <h3 className="section-title text-sm mb-2">Popular Categories</h3>
            <div className="category-chips">
              <button 
                className={`cat-chip fav-chip ${selectedCategory === 'favorites' ? 'active' : ''}`}
                onClick={() => {
                  setSearch('');
                  setSelectedCategory(selectedCategory === 'favorites' ? '' : 'favorites');
                }}
              >
                <FiStar style={{ color: '#f59e0b', fontSize: '14px' }} />
                <span>{t('sales.favorites')}</span>
                <span className="fav-count-badge">
                  {items.filter(i => favoriteItemIds.includes(i.id) || i.isFavorite).length}
                </span>
              </button>
              {['වී කෙටීම', 'පොල් කෙටීම', 'සහල්', 'පොල්තෙල්', 'හාඩ්වයාර්', 'බිස්කට්', 'සබන්', 'කුළුබඩු', 'ඉලෙක්ට්රනික බඩු', 'වෙනත් භාණ්ඩ'].map(cat => (
                <button 
                  key={cat} 
                  className={`cat-chip ${selectedCategory === cat && !search ? 'active' : ''}`} 
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory(selectedCategory === cat ? '' : cat);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="items-grid mt-4">
            {gridDisplayItems.length > 0 ? (
              gridDisplayItems.slice(0, 36).map(item => {
                const isFav = favoriteItemIds.includes(item.id) || item.isFavorite;
                return (
                  <div key={item.id} className={`pos-item-card glass-card ${isFav ? 'favorite-active' : ''}`} onClick={() => addToCart(item)}>
                    <button
                      type="button"
                      className={`favorite-star-btn ${isFav ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item);
                      }}
                      title={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                      <FiStar />
                    </button>
                    <div className="pos-item-img">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <FiSearch />}
                    </div>
                    <div className="pos-item-info">
                      <span className="pos-item-name">{item.name}</span>
                      <span className="pos-item-price">Rs. {item.sellPrice.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-items-grid" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {selectedCategory === 'favorites' ? (
                  <div>
                    <FiStar style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '0.5rem' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ප්‍රියතම ලැයිස්තුව හිස්ය / No favorite items yet.</p>
                    <small style={{ opacity: 0.8 }}>ඕනෑම භාණ්ඩයක ⭐ තරුව ක්ලික් කර එය ප්‍රියතම ලැයිස්තුවට එක් කරගන්න!</small>
                  </div>
                ) : (
                  <p>No items found.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="sales-right glass-card">
          <div className="cart-header">
            <h2 className="cart-title"><FiShoppingCart /> {t('sales.cart')}</h2>
            <div className="cart-header-right">
              {cart.length > 0 && (
                <button className="clear-cart-btn" onClick={() => { if (window.confirm('Clear entire cart?')) setCart([]); }} title="Clear Cart">
                  <FiTrash2 /> Clear
                </button>
              )}
              <span className="cart-count">{cart.length} items</span>
            </div>
          </div>

          <div className="cart-items">
            {cart.length > 0 ? (
              cart.map(item => (
                <div key={item.cartId || item.id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">
                      {item.name}
                      {item.itemType === 'weighed' && <span className="weighed-tag"> ⚖️</span>}
                    </span>
                    <span className="cart-item-price">
                      Rs. {item.sellPrice.toFixed(2)}{item.itemType === 'weighed' ? '/kg' : ''}
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    {item.itemType === 'weighed' ? (
                      <div className="weight-input-inline">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateWeightDirectly(item.cartId, e.target.value)}
                          className="weight-input-field"
                        />
                        <span className="weight-unit">kg</span>
                      </div>
                    ) : (
                      <div className="qty-controls">
                        <button onClick={() => updateQuantity(item.id, -1)}><FiMinus /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}><FiPlus /></button>
                      </div>
                    )}
                    <button className="remove-cart-btn" onClick={() => removeFromCart(item.id, item.cartId)}><FiTrash2 /></button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-cart">
                <FiShoppingCart className="empty-icon" />
                <p>{t('sales.emptyCart')}</p>
              </div>
            )}
          </div>

          <div className="cart-footer">
            <div className="cart-total-row">
              <span>{t('sales.subtotal')}</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-total-row main">
              <span>{t('sales.total')}</span>
              <span className="total-amount">Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
              <Button
                variant="secondary"
                onClick={() => setPreviewModal(true)}
                disabled={cart.length === 0}
                icon={<FiEye />}
                fullWidth
              >
                {t('sales.preview')}
              </Button>
              <Button
                onClick={() => setCheckoutModal(true)}
                disabled={cart.length === 0}
                className="checkout-btn"
                icon={<FiCheckCircle />}
                fullWidth
              >
                {t('sales.checkout')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Preview Modal */}
      <Modal
        isOpen={previewModal}
        onClose={() => setPreviewModal(false)}
        title={t('sales.preview') + " / Bill Preview"}
        size="md"
      >
        <div className="bill-preview-content" style={{ padding: '0.25rem' }}>
          {/* Thermal Receipt Mockup */}
          <div className="receipt-mockup" style={{
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #cbd5e1',
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{SHOP_INFO.name}</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{SHOP_INFO.address}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Tel: {SHOP_INFO.phone}</p>
              <div style={{ marginTop: '0.5rem', display: 'inline-block', background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                BILL PREVIEW (DRAFT)
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Date: {new Date().toLocaleDateString('en-LK', { dateStyle: 'medium' })}</span>
              <span>Time: {new Date().toLocaleTimeString('en-LK', { timeStyle: 'short' })}</span>
            </div>

            <table style={{ width: '100%', fontSize: '0.825rem', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569', fontSize: '0.75rem' }}>
                  <th style={{ padding: '4px 0' }}>ITEM</th>
                  <th style={{ padding: '4px 0', textAlign: 'center' }}>QTY</th>
                  <th style={{ padding: '4px 0', textAlign: 'right' }}>PRICE</th>
                  <th style={{ padding: '4px 0', textAlign: 'right' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 0', fontWeight: '600', color: '#0f172a' }}>{item.name}</td>
                    <td style={{ padding: '6px 0', textAlign: 'center', color: '#475569' }}>
                      {typeof item.quantity === 'number' && item.quantity % 1 !== 0 ? item.quantity.toFixed(2) : item.quantity}
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#475569' }}>Rs. {item.sellPrice.toFixed(2)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                      Rs. {(item.sellPrice * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '2px dashed #94a3b8', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569' }}>TOTAL AMOUNT</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a' }}>
                Rs. {subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setPreviewModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="secondary"
              icon={<FiPrinter />}
              onClick={() => {
                const previewBillData = {
                  billNumber: 'PREVIEW',
                  items: cart.map(i => ({ ...i, subtotal: i.sellPrice * i.quantity })),
                  total: subtotal,
                  paymentMethod: 'draft',
                  cashierName: userData?.name || 'Cashier',
                  date: new Date()
                };
                generateBillPDF(previewBillData);
              }}
            >
              මුද්‍රණය (PDF)
            </Button>
            <Button
              onClick={() => {
                setPreviewModal(false);
                setCheckoutModal(true);
              }}
              icon={<FiCheckCircle />}
            >
              {t('sales.checkout')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        isOpen={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title={t('sales.checkout')}
      >
        <div className="checkout-form">
          <div className="total-banner">
            <span>{t('sales.payableAmount')}</span>
            <h1>Rs. {subtotal.toFixed(2)}</h1>
          </div>

          <div className="payment-method-toggle">
            <button
              className={paymentMethod === 'cash' ? 'active' : ''}
              onClick={() => setPaymentMethod('cash')}
            >
              <FiDollarSign /> {t('sales.cash')}
            </button>
            <button
              className={paymentMethod === 'credit' ? 'active' : ''}
              onClick={() => setPaymentMethod('credit')}
            >
              <FiCreditCard /> {t('sales.credit')}
            </button>
            <button
              className={paymentMethod === 'home_use' ? 'active' : ''}
              onClick={() => setPaymentMethod('home_use')}
              style={paymentMethod === 'home_use' ? { background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white' } : {}}
            >
              <FiHome /> {t('sales.homeUse')}
            </button>
          </div>

          <div className="tendered-amount-section mt-4 mb-4">
            <label className="input-label mb-2 d-block">{t('sales.tenderedAmount')}</label>
            <div className="search-box glass" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <FiDollarSign className="search-icon" />
              <input
                type="number"
                placeholder="0.00"
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(e.target.value)}
                className="search-input"
                style={{ fontSize: '1.25rem', fontWeight: 'bold', backgroundColor: 'transparent', outline: 'none', border: 'none', color: 'var(--text-primary)', width: '100%' }}
              />
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
              <span className="text-secondary font-medium">{t('sales.balanceOrDue')}</span>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: (parseFloat(tenderedAmount) || 0) >= subtotal ? 'var(--success-500)' : 'var(--error-500)'
              }}>
                Rs. {Math.abs((parseFloat(tenderedAmount) || 0) - subtotal).toFixed(2)}
              </span>
            </div>
          </div>

          {paymentMethod === 'credit' && (
            <div className="debtor-selection">
              <label className="input-label mb-2 d-block">{t('sales.selectDebtor')}</label>
              <div className="search-box mb-2">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, phone or No..."
                  value={debtorSearch}
                  onChange={(e) => setDebtorSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="debtor-list-mini">
                {debtors.filter(d => {
                  const s = debtorSearch.toLowerCase().trim();
                  if (!s) return true;
                  const cleanS = s.replace('#', '').replace('no', '').trim();
                  return d.name.toLowerCase().includes(s) ||
                    d.phone.includes(s) ||
                    d.debtorNo?.toString() === cleanS ||
                    d.debtorNo?.toString().includes(cleanS);
                }).map(d => (
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

          <div className="modal-actions mt-6">
            <Button variant="secondary" onClick={() => setCheckoutModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCheckout} loading={actionLoading} icon={<FiCheckCircle />}>{t('sales.confirmSale')}</Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal / Receipt */}
      <Modal isOpen={isSuccessModal} onClose={() => setIsSuccessModal(false)} title={t('sales.saleSuccessful')}>
        <div className="success-content">
          <div className="success-icon-wrapper">
            <FiCheckCircle className="success-check" />
          </div>
          <h3>{t('sales.transactionComplete')}</h3>
          <p className="txn-id-text">ID: {lastTransactionId}</p>
          {lastBillNumber && (
            <div className="bill-number-badge">
              <FiHash />
              <span>Bill #{String(lastBillNumber).padStart(6, '0')}</span>
            </div>
          )}

          <div className="receipt-actions mt-6">
            <Button onClick={handlePrintReceipt} variant="secondary" icon={<FiPrinter />}>{t('sales.printReceipt')}</Button>
            <Button onClick={() => setIsSuccessModal(false)}>{t('sales.newSale')}</Button>
          </div>
        </div>
      </Modal>

      {/* Bill Search Modal */}
      <Modal isOpen={billSearchModal} onClose={() => setBillSearchModal(false)} title={t('sales.searchBill')} size="lg">
        <div className="bill-search-content">
          <div className="bill-search-input-row">
            <div className="search-box glass-card">
              <FiHash className="search-icon" />
              <input
                type="text"
                placeholder={t('sales.searchBillPlaceholder')}
                value={billSearchQuery}
                onChange={(e) => setBillSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBillSearch()}
                className="search-input"
                autoFocus
              />
            </div>
            <Button onClick={handleBillSearch} loading={billSearchLoading} icon={<FiSearch />}>
              {t('common.search')}
            </Button>
            {isOwner && (
              <Button
                variant="secondary"
                icon={<FiTrash2 />}
                style={{ color: 'var(--error-400)', borderColor: 'var(--error-400)' }}
                onClick={async () => {
                  const pw = prompt('Enter owner password to delete ALL bills:');
                  if (pw !== '1972341264123') {
                    if (pw !== null) alert('Incorrect password. Operation cancelled.');
                    return;
                  }
                  if (!window.confirm('⚠️ This will permanently delete ALL transaction records. Are you absolutely sure?')) return;
                  try {
                    const snap = await getDocs(collection(db, 'transactions'));
                    let count = 0;
                    for (const document of snap.docs) {
                      await deleteDoc(doc(db, 'transactions', document.id));
                      count++;
                    }
                    setBillSearchResults([]);
                    alert(`All ${count} bills deleted successfully.`);
                  } catch (err) {
                    console.error(err);
                    alert('Failed to delete bills: ' + err.message);
                  }
                }}
              >
                Delete All
              </Button>
            )}
          </div>

          <div className="bill-results-list">
            {billSearchResults.length > 0 ? (
              billSearchResults.map(bill => (
                <div key={bill.id} className="bill-result-card glass-card">
                  <div className="bill-result-header">
                    <div className="bill-result-number">
                      <FiFileText />
                      <span>Bill #{bill.billNumber ? String(bill.billNumber).padStart(6, '0') : 'N/A'}</span>
                    </div>
                    <span className={`bill-payment-badge ${bill.paymentMethod}`}>
                      {bill.paymentMethod === 'cash' ? '💵 Cash' : '💳 Credit'}
                    </span>
                  </div>
                  <div className="bill-result-info">
                    <div className="bill-info-row">
                      <span className="bill-info-label">{t('reports.date')}:</span>
                      <span>{bill.timestamp?.toDate ? bill.timestamp.toDate().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</span>
                    </div>
                    <div className="bill-info-row">
                      <span className="bill-info-label">{t('reports.items')}:</span>
                      <span>{bill.items?.length || 0} items</span>
                    </div>
                    <div className="bill-info-row">
                      <span className="bill-info-label">{t('reports.amount')}:</span>
                      <span className="bill-total-amount">Rs. {bill.total?.toFixed(2)}</span>
                    </div>
                    {bill.debtorName && (
                      <div className="bill-info-row">
                        <span className="bill-info-label">Customer:</span>
                        <span>{bill.debtorName}</span>
                      </div>
                    )}
                  </div>
                  <div className="bill-result-actions">
                    <Button variant="secondary" onClick={() => handleViewBill(bill)} icon={<FiSearch />}>
                      {t('sales.viewBill')}
                    </Button>
                    <Button onClick={() => handleReprintBill(bill)} icon={<FiPrinter />}>
                      {t('sales.reprintBill')}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              billSearchQuery && !billSearchLoading && (
                <div className="no-bills-found">
                  <FiFileText className="no-bills-icon" />
                  <p>{t('sales.noBillsFound')}</p>
                </div>
              )
            )}
          </div>
        </div>
      </Modal>

      {/* Bill Detail Modal */}
      <Modal isOpen={billDetailModal} onClose={() => setBillDetailModal(false)} title={`Bill #${selectedBill?.billNumber ? String(selectedBill.billNumber).padStart(6, '0') : 'N/A'}`}>
        {selectedBill && (
          <div className="bill-detail-content">
            <div className="bill-detail-header-banner">
              <h2>Bill #{selectedBill.billNumber ? String(selectedBill.billNumber).padStart(6, '0') : 'N/A'}</h2>
              <span className="bill-detail-date">
                {selectedBill.timestamp?.toDate
                  ? selectedBill.timestamp.toDate().toLocaleString('en-LK', { dateStyle: 'long', timeStyle: 'short' })
                  : 'N/A'}
              </span>
            </div>

            <div className="bill-detail-meta">
              <div className="bill-meta-item">
                <span className="meta-label">Cashier</span>
                <span className="meta-value">{selectedBill.cashierName || 'N/A'}</span>
              </div>
              <div className="bill-meta-item">
                <span className="meta-label">Payment</span>
                <span className={`bill-payment-badge ${selectedBill.paymentMethod}`}>
                  {selectedBill.paymentMethod === 'cash' ? '💵 Cash' : '💳 Credit'}
                </span>
              </div>
              {selectedBill.debtorName && (
                <div className="bill-meta-item">
                  <span className="meta-label">Customer</span>
                  <span className="meta-value">{selectedBill.debtorName}</span>
                </div>
              )}
            </div>

            <div className="bill-items-table">
              <div className="bill-table-header">
                <span>No.</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
              {selectedBill.items?.map((item, idx) => (
                <div key={idx} className="bill-table-row">
                  <span className="font-bold text-secondary">#{item.itemNo || '-'}</span>
                  <span className="bill-item-name">{item.name}</span>
                  <span>{item.quantity}</span>
                  <span>Rs. {item.sellPrice?.toFixed(2)}</span>
                  <span>Rs. {item.subtotal?.toFixed(2)}</span>
                </div>
              ))}
              <div className="bill-table-total">
                <span>Total</span>
                <span></span>
                <span></span>
                <span></span>
                <span className="total-amount-big">Rs. {selectedBill.total?.toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-actions mt-6">
              <Button variant="secondary" onClick={() => setBillDetailModal(false)}>{t('common.back')}</Button>
              {isOwner && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const pw = prompt('Enter owner password to delete this bill:');
                    if (pw !== '1972341264123') {
                      if (pw !== null) alert('Incorrect password. Deletion cancelled.');
                      return;
                    }
                    try {
                      await deleteDoc(doc(db, 'transactions', selectedBill.id));
                      setBillDetailModal(false);
                      setBillSearchResults(billSearchResults.filter(b => b.id !== selectedBill.id));
                      setSelectedBill(null);
                      alert('Bill deleted successfully.');
                    } catch (err) {
                      console.error(err);
                      alert('Failed to delete bill: ' + err.message);
                    }
                  }}
                  icon={<FiTrash2 />}
                  style={{ color: 'var(--error-400)', borderColor: 'var(--error-400)' }}
                >
                  Delete Bill
                </Button>
              )}
              <Button onClick={() => handleReprintBill(selectedBill)} icon={<FiPrinter />}>{t('sales.reprintBill')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Weight Entry Modal for Weighed Items */}
      <Modal isOpen={weightModal} onClose={() => setWeightModal(false)} title="⚖️ බර ඇතුලත් කරන්න / Enter Weight">
        {weightItem && (
          <div className="weight-entry-content">
            <div className="weight-item-banner">
              <h3>{weightItem.name}</h3>
              <span className="weight-price-per-kg">Rs. {weightItem.sellPrice.toFixed(2)} / kg</span>
              <span className="weight-stock-info">{weightItem.stock} kg available</span>
            </div>

            <div className="weight-input-group">
              <label className="input-label">Weight (kg)</label>
              <div className="weight-input-row">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={weightItem.stock}
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addWeighedToCart()}
                  className="weight-number-input"
                  placeholder="0.00"
                  autoFocus
                />
                <span className="weight-kg-label">kg</span>
              </div>

              <div className="weight-quick-btns">
                {[0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000].map(w => (
                  <button
                    key={w}
                    type="button"
                    className="weight-quick-btn"
                    onClick={() => setWeightValue(String(w))}
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>

            {weightValue && parseFloat(weightValue) > 0 && (
              <div className="weight-total-preview">
                <span>Total Price:</span>
                <h2>Rs. {(weightItem.sellPrice * parseFloat(weightValue)).toFixed(2)}</h2>
              </div>
            )}

            <div className="modal-actions mt-6">
              <Button variant="secondary" onClick={() => setWeightModal(false)}>Cancel</Button>
              <Button onClick={addWeighedToCart} icon={<FiPlus />}>Add to Cart</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
