import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import {
  FiSearch, FiShoppingCart, FiPlus, FiMinus, FiTrash2,
  FiCreditCard, FiDollarSign, FiUser, FiMaximize, FiPrinter, FiCheckCircle,
  FiFileText, FiHash, FiHome, FiStar, FiEye, FiZap, FiPhoneCall, FiCopy, FiCheck, FiEdit3, FiSettings
} from 'react-icons/fi';

import './Sales.css';

// Dynamic Shop information & Settings helper
function getShopInfo() {
  try {
    const saved = localStorage.getItem('smartpos_settings');
    if (saved) {
      const data = JSON.parse(saved);
      return {
        name: data.shopName || 'සුමින්ද ස්ටෝර්ස්',
        phone: data.shopPhone || '0777640334',
        email: data.shopEmail || 'sumindapradeep1111@gmail.com',
        address: data.shopAddress || 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර'
      };
    }
  } catch { }
  return {
    name: 'සුමින්ද ස්ටෝර්ස්',
    phone: '0777640334',
    email: 'sumindapradeep1111@gmail.com',
    address: 'සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර'
  };
}

function getMillingRates() {
  try {
    const saved = localStorage.getItem('smartpos_settings');
    if (saved) {
      const data = JSON.parse(saved);
      return {
        weeRate: data.weeRate !== undefined ? Number(data.weeRate) : 7,
        polRate: data.polRate !== undefined ? Number(data.polRate) : 65
      };
    }
  } catch { }
  return { weeRate: 7, polRate: 65 };
}

// Networks
const NETWORKS = [
  { id: 'dialog', name: 'Dialog', color: '#e11d48', ussdPrefix: '*123*' },
  { id: 'mobitel', name: 'Mobitel', color: '#2563eb', ussdPrefix: '*141*' },
  { id: 'hutch', name: 'Hutch', color: '#ea580c', ussdPrefix: '*144*' },
  { id: 'airtel', name: 'Airtel', color: '#dc2626', ussdPrefix: '*432*' },
  { id: 'slt', name: 'SLT / Broadband', color: '#0d9488', ussdPrefix: '*123*' }
];

// Generate Reload Receipt PDF
function generateReloadReceiptPDF(reloadRecord) {
  const shopInfo = getShopInfo();
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
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Sinhala', 'Segoe UI', Arial, sans-serif;
      width: 80mm;
      margin: 0 auto;
      padding: 5mm;
      color: #000;
      font-size: 11px;
      font-weight: 700;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .shop-name { font-size: 18px; font-weight: 800; margin-bottom: 3px; color: #000; }
    .shop-info { font-size: 12px; font-weight: 700; color: #000; line-height: 1.4; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .title { text-align: center; font-size: 15px; font-weight: 800; margin: 4px 0; color: #000; }
    .meta-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin: 3px 0; color: #000; }
    .amount-box { text-align: center; font-size: 17px; font-weight: 800; margin: 8px 0; padding: 6px; border: 2px solid #000; color: #000; }
    .footer { text-align: center; margin-top: 10px; font-size: 12px; font-weight: 700; color: #000; }
    @media print {
      body { width: 80mm; margin: 0; padding: 3mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000; font-weight: 700; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${shopInfo.name}</div>
    <div class="shop-info">${shopInfo.address}</div>
    <div class="shop-info">Tel: ${shopInfo.phone}</div>
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
    <span style="font-weight:800;text-transform:uppercase;">${reloadRecord.network}</span>
  </div>
  <div class="meta-row">
    <span>Phone Number / අංකය:</span>
    <span style="font-weight:800;">${reloadRecord.phone}</span>
  </div>

  <div class="amount-box">
    RELOAD: Rs. ${parseFloat(reloadRecord.amount).toFixed(2)}
  </div>

  <div class="meta-row" style="justify-content:center;">
    <span>Payment: ${reloadRecord.paymentMethod === 'cash' ? 'CASH' : reloadRecord.paymentMethod === 'credit' ? 'CREDIT' : 'HOME USE'}</span>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div style="font-weight:800; font-size: 13px;">ස්තූතියි! Thank You!</div>
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

// Generate Bill Receipt - opens in print window (supports Sinhala text)
function generateBillPDF(billData) {
  const shopInfo = getShopInfo();
  const billNum = billData.billNumber ? String(billData.billNumber).padStart(6, '0') : '000000';
  const dateStr = billData.date instanceof Date
    ? billData.date.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });

  const totalSavings = billData.paymentMethod === 'credit' ? 0 : billData.items.reduce((sum, item) => {
    const mPrice = Number(item.markedPrice) || Number(item.sellPrice);
    const sPrice = Number(item.sellPrice);
    const qty = Number(item.quantity) || 1;
    return sum + Math.max(0, (mPrice - sPrice) * qty);
  }, 0);

  const itemsHTML = billData.items.map(item => {
    const mPrice = Number(item.markedPrice) || Number(item.sellPrice);
    const sPrice = Number(item.sellPrice);
    const subtotal = Number(item.subtotal || (sPrice * item.quantity));
    return `
      <tr style="border-top: 1px solid #000;">
        <td colspan="4" style="font-weight: 800; padding: 5px 2px 2px 2px; font-size: 14px; color: #000;">${item.name}</td>
      </tr>
      <tr style="border-bottom: 1px solid #000;">
        <td style="text-align:left; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${item.quantity}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${mPrice.toFixed(2)}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${sPrice.toFixed(2)}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 800; color: #000;">${subtotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill #${billNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Sinhala', 'Segoe UI', Arial, sans-serif;
      width: 80mm;
      margin: 0 auto;
      padding: 5mm;
      color: #000;
      font-size: 11px;
      font-weight: 700;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .shop-name { font-size: 18px; font-weight: 800; margin-bottom: 3px; color: #000; }
    .shop-info { font-size: 12px; font-weight: 700; color: #000; line-height: 1.4; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .bill-number { text-align: center; font-size: 15px; font-weight: 800; margin: 4px 0; color: #000; }
    .meta-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin: 2px 0; color: #000; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; color: #000; }
    thead tr {
      background-color: #000 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th {
      font-weight: 800;
      padding: 4px 2px;
      font-size: 11px;
      color: #fff !important;
      text-align: right;
      background-color: #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th:first-child { text-align: left; }
    .total-section { margin-top: 6px; }
    .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin: 3px 0; color: #000; }
    .grand-total { font-size: 16px; font-weight: 800; margin: 4px 0; color: #000; }
    .footer { text-align: center; margin-top: 10px; font-size: 12px; font-weight: 700; color: #000; }
    .footer .thanks { font-weight: 800; font-size: 13px; color: #000; }
    @media print {
      body { width: 80mm; margin: 0; padding: 3mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000; font-weight: 700; }
      @page { size: 80mm auto; margin: 0; }
      thead tr { background-color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      thead th { background-color: #000 !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${shopInfo.name}</div>
    <div class="shop-info">${shopInfo.address}</div>
    <div class="shop-info">Tel: ${shopInfo.phone}</div>
    <div class="shop-info">${shopInfo.email}</div>
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
        <th style="text-align:left;">ප්‍රමාණය</th>
        <th style="text-align:right;">සඳහන් මිල</th>
        <th style="text-align:right;">අපේ මිල</th>
        <th style="text-align:right;">එකතුව</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-section">
    <div class="total-row grand-total">
      <span>මුළු එකතුව</span>
      <span>${billData.total.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>ගෙවීම් :</span>
      <span>${(billData.tenderedAmount || 0).toFixed(2)}</span>
    </div>
    <div class="total-row font-bold">
      <span>ඉතිරි:</span>
      <span>Rs. ${(billData.tenderedAmount ? billData.tenderedAmount - billData.total : -billData.total).toFixed(2)}</span>
    </div>

    ${totalSavings > 0 ? `
    <div class="divider"></div>
    <div style="text-align:center; padding: 6px 0; color: #000;">
      <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">ඔබට ලැබුණු ලාභය</div>
      <div style="font-size: 17px; font-weight: 800; margin-top: 2px;">Rs. ${totalSavings.toFixed(2)}</div>
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
  const navigate = useNavigate();
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
  const [activeCartId, setActiveCartId] = useState(null);

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

  // Edit Bill
  const [editBillModal, setEditBillModal] = useState(false);
  const [editBillItems, setEditBillItems] = useState([]);
  const [editBillLoading, setEditBillLoading] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  // Barcode input focus
  const barcodeInputRef = useRef(null);
  const tenderedInputRef = useRef(null);

  // Weight entry for weighed items
  const [weightModal, setWeightModal] = useState(false);
  const [weightItem, setWeightItem] = useState(null);
  const [weightValue, setWeightValue] = useState('');

  // Custom Item Modal (නොමැති භාණ්ඩ)
  const [customItemModal, setCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemMarkedPrice, setCustomItemMarkedPrice] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const customItemPriceRef = useRef(null);

  const handleOpenQuickCustomItem = () => {
    setCustomItemName('වෙනත් භාණ්ඩ');
    setCustomItemMarkedPrice('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setCustomItemModal(true);
    setTimeout(() => {
      if (customItemPriceRef.current) {
        customItemPriceRef.current.focus();
        customItemPriceRef.current.select();
      }
    }, 100);
  };

  // Edit Cart Item Price/Discount Modal
  const [editCartItemModal, setEditCartItemModal] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editMarkedPrice, setEditMarkedPrice] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');

  // Milling Modal State (වී කෙටීම / පොල් කෙටීම)
  const [millingModal, setMillingModal] = useState(false);
  const [millingType, setMillingType] = useState('wee'); // 'wee' (Rs 7/kg) or 'pol' (Rs 65/kg)
  const [millingKg, setMillingKg] = useState('');
  const [millingRate, setMillingRate] = useState('7');
  const millingKgInputRef = useRef(null);

  const handleOpenMillingModal = (type = 'wee') => {
    const rates = getMillingRates();
    setMillingType(type);
    setMillingRate(type === 'wee' ? String(rates.weeRate) : String(rates.polRate));
    setMillingKg('');
    setMillingModal(true);
    setTimeout(() => {
      if (millingKgInputRef.current) {
        millingKgInputRef.current.focus();
      }
    }, 100);
  };

  const handleSelectMillingType = (type) => {
    const rates = getMillingRates();
    setMillingType(type);
    setMillingRate(type === 'wee' ? String(rates.weeRate) : String(rates.polRate));
    if (millingKgInputRef.current) {
      millingKgInputRef.current.focus();
    }
  };

  const handleAddMillingToCart = () => {
    const kg = parseFloat(millingKg);
    const rate = parseFloat(millingRate) || (millingType === 'wee' ? 7 : 65);
    if (!kg || kg <= 0) {
      alert('කරුණාකර නිවැරදි කිලෝග්‍රෑම් ගණනක් (Kg) ඇතුළත් කරන්න.');
      return;
    }

    const subtotal = kg * rate;
    const name = millingType === 'wee' ? `වී කෙටීම (${kg} Kg)` : `පොල් කෙටීම (${kg} Kg)`;
    const cartId = `milling_${millingType}_${Date.now()}`;

    const millingItem = {
      id: `milling_${millingType}_${Date.now()}`,
      cartId,
      name,
      markedPrice: rate,
      sellPrice: rate,
      quantity: kg,
      subtotal,
      stock: 999999,
      isMilling: true,
      millingType,
      unitRate: rate
    };

    setCart([millingItem, ...cart]);
    setActiveCartId(cartId);
    setMillingModal(false);
    setMillingKg('');
    setSearch('');
  };

  const handleOpenEditCartItem = (item) => {
    setEditingCartItem(item);
    setEditMarkedPrice(item.markedPrice ? String(item.markedPrice) : String(item.sellPrice));
    setEditSellPrice(String(item.sellPrice));
    setEditCartItemModal(true);
  };

  const handleSaveCartItemPrice = () => {
    if (!editingCartItem) return;
    const newSellPrice = parseFloat(editSellPrice);
    if (!newSellPrice || newSellPrice <= 0) {
      alert('කරුණාකර නිවැරදි විකුණුම් මිලක් ඇතුළත් කරන්න');
      return;
    }
    const newMarkedPrice = editMarkedPrice ? parseFloat(editMarkedPrice) : newSellPrice;

    setCart(cart.map(c => {
      const match = c.cartId ? c.cartId === editingCartItem.cartId : c.id === editingCartItem.id;
      if (match) {
        return {
          ...c,
          markedPrice: newMarkedPrice,
          sellPrice: newSellPrice
        };
      }
      return c;
    }));
    setEditCartItemModal(false);
    setEditingCartItem(null);
  };

  const handleAddCustomItem = () => {
    const name = customItemName.trim() || 'වෙනත් භාණ්ඩ';
    const price = parseFloat(customItemPrice);
    const qty = parseInt(customItemQty) || 1;
    const markedPrice = customItemMarkedPrice ? parseFloat(customItemMarkedPrice) : price;

    if (!price || price <= 0) {
      alert('කරුණාකර නිවැරදි මිලක් ඇතුළත් කරන්න (Enter valid price)');
      return;
    }

    const cartId = `custom_${Date.now()}`;
    const customItem = {
      id: cartId,
      cartId,
      name: name,
      markedPrice: markedPrice,
      sellPrice: price,
      quantity: qty,
      stock: 999999,
      isCustom: true
    };

    setCart([customItem, ...cart]);
    setActiveCartId(cartId);
    setCustomItemModal(false);
    setCustomItemName('');
    setCustomItemMarkedPrice('');
    setCustomItemPrice('');
    setCustomItemQty('1');
  };

  // Reload Modal State on Sales Page
  const [reloadModal, setReloadModal] = useState(false);
  const [reloadPhone, setReloadPhone] = useState('');
  const [reloadNetwork, setReloadNetwork] = useState('dialog');
  const [reloadAmount, setReloadAmount] = useState('');
  const [reloadCommissionRate, setReloadCommissionRate] = useState('4.0');
  const [reloadCopied, setReloadCopied] = useState(false);

  // Reload Search & History in Modal
  const [reloadTab, setReloadTab] = useState('new');
  const [reloadModalSearch, setReloadModalSearch] = useState('');
  const [reloadModalDate, setReloadModalDate] = useState('');
  const [reloadModalHistory, setReloadModalHistory] = useState([]);
  const [reloadModalLoading, setReloadModalLoading] = useState(false);

  const fetchReloadModalHistory = async () => {
    setReloadModalLoading(true);
    try {
      const reloadSnap = await getDocs(collection(db, 'reloads'));
      const history = reloadSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setReloadModalHistory(history);
    } catch (err) {
      console.error("Error fetching reload history for modal:", err);
    } finally {
      setReloadModalLoading(false);
    }
  };

  const handleOpenReloadModal = () => {
    setReloadModal(true);
    fetchReloadModalHistory();
  };

  const handleReloadPhoneChange = (val) => {
    setReloadPhone(val);
    const clean = val.trim();
    if (clean.startsWith('077') || clean.startsWith('076') || clean.startsWith('074')) {
      setReloadNetwork('dialog');
    } else if (clean.startsWith('071') || clean.startsWith('070')) {
      setReloadNetwork('mobitel');
    } else if (clean.startsWith('078') || clean.startsWith('072')) {
      setReloadNetwork('hutch');
    } else if (clean.startsWith('075')) {
      setReloadNetwork('airtel');
    }
  };

  const selectedNetObj = NETWORKS.find(n => n.id === reloadNetwork) || NETWORKS[0];
  const ussdCode = reloadPhone && reloadAmount ? `${selectedNetObj.ussdPrefix}${reloadPhone.trim()}*${reloadAmount.trim()}#` : '';

  const handleCopyUSSD = () => {
    if (!ussdCode) return;
    navigator.clipboard.writeText(ussdCode);
    setReloadCopied(true);
    setTimeout(() => setReloadCopied(false), 2000);
  };

  const handleAddReloadToCart = () => {
    const cleanPhone = reloadPhone.trim();
    const numAmount = parseFloat(reloadAmount);

    if (!cleanPhone || cleanPhone.length < 9) {
      alert("කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න (Valid Phone Number).");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert("කරුණාකර නිවැරදි මුදලක් ඇතුළත් කරන්න (Valid Amount).");
      return;
    }

    const selectedNet = NETWORKS.find(n => n.id === reloadNetwork) || NETWORKS[0];
    const cartId = `reload_${Date.now()}`;
    const reloadCartItem = {
      id: `reload_${reloadNetwork}_${Date.now()}`,
      cartId,
      name: `${selectedNet.name} Reload (${cleanPhone})`,
      sellPrice: numAmount,
      quantity: 1,
      subtotal: numAmount,
      isReload: true,
      phone: cleanPhone,
      network: reloadNetwork,
      amount: numAmount,
      commissionRate: parseFloat(reloadCommissionRate) || 4.0,
      profit: numAmount * ((parseFloat(reloadCommissionRate) || 4.0) / 100)
    };

    setCart([reloadCartItem, ...cart]);
    setActiveCartId(cartId);
    setReloadModal(false);
    setReloadPhone('');
    setReloadAmount('');
  };

  const handleDirectQuickReload = async () => {
    const cleanPhone = reloadPhone.trim();
    const numAmount = parseFloat(reloadAmount);

    if (!cleanPhone || cleanPhone.length < 9) {
      alert("කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න (Valid Phone Number).");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert("කරුණාකර නිවැරදි මුදලක් ඇතුළත් කරන්න (Valid Amount).");
      return;
    }

    try {
      setActionLoading(true);
      const billNumber = await getNextBillNumber();
      const reloadId = `RLD${Date.now()}`;
      const selectedNet = NETWORKS.find(n => n.id === reloadNetwork) || NETWORKS[0];
      const commRate = parseFloat(reloadCommissionRate) || 4.0;
      const profit = numAmount * (commRate / 100);

      const reloadRecord = {
        billNumber,
        phone: cleanPhone,
        network: reloadNetwork,
        amount: numAmount,
        commissionRate: commRate,
        profit,
        paymentMethod: 'cash',
        cashierId: userData?.uid || 'unknown',
        cashierName: userData?.name || 'Cashier',
        timestamp: serverTimestamp(),
        date: new Date()
      };

      await setDoc(doc(db, 'reloads', reloadId), reloadRecord);

      const transactionData = {
        billNumber,
        items: [{
          id: `reload_${reloadNetwork}`,
          name: `${selectedNet.name} Reload (${cleanPhone})`,
          sellPrice: numAmount,
          quantity: 1,
          subtotal: numAmount,
          isReload: true
        }],
        total: numAmount,
        paymentMethod: 'cash',
        cashierId: userData?.uid || 'unknown',
        cashierName: userData?.name || 'Cashier',
        timestamp: serverTimestamp(),
        status: 'completed',
        isReload: true,
        reloadPhone: cleanPhone,
        reloadNetwork: reloadNetwork
      };

      await setDoc(doc(db, 'transactions', `TXN_RLD_${Date.now()}`), transactionData);

      try {
        const qSession = query(collection(db, 'cashSessions'), where('status', '==', 'open'));
        const sessionSnap = await getDocs(qSession);
        if (!sessionSnap.empty) {
          const openDoc = sessionSnap.docs[0];
          const existingEntries = openDoc.data().entries || [];
          const saleEntry = {
            type: 'in',
            isSale: true,
            isReload: true,
            amount: numAmount,
            note: `${selectedNet.name} Reload #${cleanPhone}`,
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

      setReloadModal(false);
      setReloadPhone('');
      setReloadAmount('');
      generateReloadReceiptPDF(reloadRecord);
    } catch (err) {
      console.error("Failed quick reload:", err);
      alert("රීලෝඩ් එක සටහන් කිරීම අසාර්ථකයි: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };


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

        try {
          const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
          if (settingsSnap.exists()) {
            localStorage.setItem('smartpos_settings', JSON.stringify(settingsSnap.data()));
          }
        } catch (sErr) {
          console.warn("Could not sync settings in Sales:", sErr);
        }

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

  // F1 keyboard shortcut, Arrow Key navigation + Enter OK for Bill Preview / Checkout Modal
  // AND + / - keys to change cart item quantity
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isAnyModalOpen = previewModal || checkoutModal || weightModal || customItemModal || editCartItemModal || billSearchModal || billDetailModal || editBillModal || reloadModal || millingModal;

      // 1. If NO modal is open: handle + and - keys for active cart item quantity
      if (!isAnyModalOpen) {
        const isPlusKey = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd';
        const isMinusKey = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract';

        if (isPlusKey || isMinusKey) {
          const activeTag = document.activeElement?.tagName;
          const isSearchFocused = document.activeElement === barcodeInputRef.current;
          const isInputFocused = isSearchFocused || ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);

          // If user is inside search input AND search box is empty OR user is not in any input field:
          if ((isSearchFocused && search.trim() === '') || !isInputFocused) {
            e.preventDefault();
            if (cart.length === 0) return;

            // Find active item (or top item cart[0])
            const targetItem = cart.find(c => (c.cartId ? c.cartId === activeCartId : c.id === activeCartId)) || cart[0];
            if (!targetItem) return;

            if (isPlusKey) {
              updateQuantity(targetItem.id, 1, targetItem.cartId);
            } else if (isMinusKey) {
              updateQuantity(targetItem.id, -1, targetItem.cartId);
            }
            return;
          }
        }

        const isStarKey = e.key === '*' || e.code === 'NumpadMultiply';
        const isSlashKey = e.key === '/' || e.code === 'NumpadDivide';
        const isDotKey = e.key === '.' || e.code === 'NumpadDecimal';

        if (isStarKey || isSlashKey || isDotKey) {
          const activeTag = document.activeElement?.tagName;
          const isSearchFocused = document.activeElement === barcodeInputRef.current;
          const isInputFocused = isSearchFocused || ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);

          if ((isSearchFocused && search.trim() === '') || !isInputFocused) {
            e.preventDefault();
            if (isStarKey) {
              handleOpenMillingModal('wee');
            } else if (isSlashKey) {
              handleOpenMillingModal('pol');
            } else if (isDotKey) {
              handleOpenQuickCustomItem();
            }
            return;
          }
        }

        // Auto-focus search input when barcode scanner or user starts typing on main screen (if not in input)
        const activeTag = document.activeElement?.tagName;
        const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
        if (!isInputActive && barcodeInputRef.current) {
          if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key && e.key.length === 1 && e.key !== ' ' && e.key !== '*' && e.key !== '/' && e.key !== '.') {
            barcodeInputRef.current.focus();
          }
        }
      }

      const methods = ['cash', 'credit', 'home_use'];

      // Press F1 -> Toggle Bill Preview Modal (Open if closed & cart has items, Close if open)
      if (e.key === 'F1') {
        e.preventDefault();
        setPreviewModal(prev => {
          if (!prev) {
            if (cart.length > 0) return true;
            return false;
          }
          return false;
        });
        return;
      }

      // If Bill Preview Modal or Checkout Modal is open: handle Arrow keys & Enter key
      if (previewModal || checkoutModal) {
        // Arrow Right or Arrow Down -> Move selection to next bill type (Cash -> Credit -> Home Use)
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setPaymentMethod(prev => {
            const idx = methods.indexOf(prev);
            const nextIdx = (idx + 1) % methods.length;
            return methods[nextIdx];
          });
          return;
        }

        // Arrow Left or Arrow Up -> Move selection to previous bill type (Home Use -> Credit -> Cash)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setPaymentMethod(prev => {
            const idx = methods.indexOf(prev);
            const prevIdx = (idx - 1 + methods.length) % methods.length;
            return methods[prevIdx];
          });
          return;
        }

        // Enter Key -> OK / Confirm Selection
        if (e.key === 'Enter') {
          // If in preview modal: confirm bill type and open checkout modal, auto-focus tendered amount
          if (previewModal) {
            e.preventDefault();
            setPreviewModal(false);
            setCheckoutModal(true);
            // Auto-focus tendered amount input after modal renders
            setTimeout(() => {
              tenderedInputRef.current?.focus();
              tenderedInputRef.current?.select();
            }, 100);
            return;
          }
          // If in checkout modal: execute checkout (unless searching for debtor)
          if (checkoutModal) {
            const isSearchingDebtor = document.activeElement?.placeholder?.includes('Search by name');
            if (!isSearchingDebtor) {
              e.preventDefault();
              handleCheckout();
              return;
            }
          }
        }

        // Escape Key -> Close modal
        if (e.key === 'Escape') {
          e.preventDefault();
          setPreviewModal(false);
          setCheckoutModal(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, activeCartId, search, previewModal, checkoutModal, weightModal, customItemModal, editCartItemModal, billSearchModal, billDetailModal, editBillModal, reloadModal, paymentMethod, tenderedAmount, selectedDebtor]);

  const addToCart = (item) => {
    if (item.name?.includes('වී කෙටීම')) {
      handleOpenMillingModal('wee');
      return;
    }
    if (item.name?.includes('පොල් කෙටීම')) {
      handleOpenMillingModal('pol');
      return;
    }

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

    const markedPrice = item.markedPrice ? Number(item.markedPrice) : Number(item.sellPrice);

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(c => c.id === item.id);
      if (existingIndex !== -1) {
        const existingInCart = prevCart[existingIndex];
        if (existingInCart.quantity >= item.stock) {
          alert("Maximum stock reached!");
          return prevCart;
        }
        const updatedItem = { ...existingInCart, quantity: existingInCart.quantity + 1 };
        const newCart = [updatedItem, ...prevCart.filter((_, idx) => idx !== existingIndex)];
        setActiveCartId(updatedItem.cartId || updatedItem.id);
        return newCart;
      } else {
        const cartId = item.cartId || `cart_${item.id}_${Date.now()}`;
        const newItem = { ...item, markedPrice, quantity: 1, cartId };
        setActiveCartId(cartId);
        return [newItem, ...prevCart];
      }
    });

    setSearch('');
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 50);
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
    const markedPrice = weightItem.markedPrice ? Number(weightItem.markedPrice) : Number(weightItem.sellPrice);
    setCart([{ ...weightItem, markedPrice, quantity: weight, cartId }, ...cart]);
    setActiveCartId(cartId);
    setWeightModal(false);
    setWeightItem(null);
    setWeightValue('');
    setSearch('');
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  const removeFromCart = (itemId, cartId, itemName) => {
    const confirmMsg = itemName
      ? `"${itemName}" භාණ්ඩය කරත්තයෙන් ඉවත් කිරීමට අවශ්‍යද?`
      : 'මෙම භාණ්ඩය කරත්තයෙන් ඉවත් කිරීමට අවශ්‍යද?';
    if (window.confirm(confirmMsg)) {
      setCart(prevCart => {
        const filtered = prevCart.filter(item => cartId ? item.cartId !== cartId : item.id !== itemId);
        if (filtered.length > 0) {
          setActiveCartId(filtered[0].cartId || filtered[0].id);
        } else {
          setActiveCartId(null);
        }
        return filtered;
      });
    }
  };

  const updateQuantity = (itemId, delta, cartId) => {
    setCart(prevCart => {
      const targetIndex = prevCart.findIndex(item => cartId ? item.cartId === cartId : item.id === itemId);
      if (targetIndex === -1) return prevCart;

      const item = prevCart[targetIndex];
      const step = item.itemType === 'weighed' ? 0.1 : 1;
      const newQty = Math.round((item.quantity + (delta > 0 ? step : -step)) * 100) / 100;

      // Do NOT remove item when quantity is 1 and minus is pressed (make no change)
      const minQty = item.itemType === 'weighed' ? 0.01 : 1;
      if (newQty < minQty) {
        return prevCart;
      }

      if (newQty > item.stock) {
        alert("Maximum stock reached!");
        return prevCart;
      }

      const updated = [...prevCart];
      updated[targetIndex] = { ...item, quantity: newQty };
      setActiveCartId(item.cartId || item.id);
      return updated;
    });
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

  const updateMillingWeightDirectly = (cartId, newKg) => {
    const kg = parseFloat(newKg);
    if (isNaN(kg) || kg <= 0) return;
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const subtotal = kg * item.unitRate;
        const baseName = item.millingType === 'pol' ? 'පොල් කෙටීම' : 'වී කෙටීම';
        return {
          ...item,
          quantity: kg,
          subtotal,
          name: `${baseName} (${kg} Kg)`
        };
      }
      return item;
    }));
  };

  const isCreditMode = paymentMethod === 'credit';
  const subtotal = cart.reduce((acc, item) => {
    const mPrice = item.markedPrice ? Number(item.markedPrice) : Number(item.sellPrice);
    const effectivePrice = (isCreditMode && mPrice > Number(item.sellPrice)) ? mPrice : Number(item.sellPrice);
    return acc + (effectivePrice * item.quantity);
  }, 0);

  // Helper: get effective barcode for an item (stored barcode OR auto-generated ITM{itemNo})
  const getEffectiveBarcode = (item) => {
    if (item.barcode && item.barcode.trim()) return item.barcode.trim().toLowerCase();
    if (item.itemNo !== undefined && item.itemNo !== null) return `itm${item.itemNo}`;
    return null;
  };

  const filteredItems = search ? items.filter(item => {
    const s = search.toLowerCase().trim();
    const cleanS = s.replace('#', '').replace('itm', '').replace('item', '').replace('no', '').trim();
    const effectiveBarcode = getEffectiveBarcode(item);
    return (
      item.name?.toLowerCase().includes(s) ||
      (effectiveBarcode && (effectiveBarcode === s || effectiveBarcode.includes(s))) ||
      item.itemNo?.toString() === cleanS ||
      item.itemNo?.toString() === s ||
      item.category?.toLowerCase().includes(s)
    );
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
      const cleanS = s.replace('#', '').replace('itm', '').replace('item', '').replace('no', '').trim();
      const effectiveBarcode = getEffectiveBarcode(item);
      return (
        item.name?.toLowerCase().includes(s) ||
        (effectiveBarcode && effectiveBarcode.includes(s)) ||
        item.category?.toLowerCase().includes(s) ||
        item.itemNo?.toString() === cleanS ||
        item.itemNo?.toString().includes(cleanS)
      );
    }
    return true;
  });

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawSearch = search.trim();
      if (!rawSearch) return;

      const cleanSearch = rawSearch.toLowerCase();
      const cleanNumStr = cleanSearch.replace('#', '').replace('itm', '').replace('item', '').replace('no', '').trim();

      // 1. Exact Barcode Match (Scanned barcode)
      // Check stored barcode field OR fallback ITM{itemNo} auto-generated pattern
      const exactBarcodeMatch = items.find(item => {
        // Check stored barcode (exact)
        if (item.barcode && item.barcode.trim().toLowerCase() === cleanSearch) return true;
        // Check auto-generated ITM{itemNo} pattern (for items saved without explicit barcode)
        if (item.itemNo !== undefined && item.itemNo !== null) {
          const autoBarcode = `itm${item.itemNo}`;
          if (autoBarcode === cleanSearch) return true;
        }
        return false;
      });

      if (exactBarcodeMatch) {
        addToCart(exactBarcodeMatch);
        setSearch('');
        setTimeout(() => barcodeInputRef.current?.focus(), 50);
        return;
      }

      // 2. Exact Item Number Match (#1, 1, ITM1)
      const exactItemNoMatch = items.find(item =>
        item.itemNo !== undefined && (
          String(item.itemNo) === cleanNumStr ||
          String(item.itemNo) === rawSearch ||
          `itm${item.itemNo}` === cleanSearch
        )
      );

      if (exactItemNoMatch) {
        addToCart(exactItemNoMatch);
        setSearch('');
        setTimeout(() => barcodeInputRef.current?.focus(), 50);
        return;
      }

      // 3. Fallback: single result in filtered list
      if (filteredItems.length === 1) {
        addToCart(filteredItems[0]);
        setSearch('');
        setTimeout(() => barcodeInputRef.current?.focus(), 50);
        return;
      }
    }
  };


  const handleCheckout = async () => {
    if (editingBill) {
      return handleUpdateBill(true);
    }
    if (cart.length === 0) return;

    if (paymentMethod === 'cash') {
      const tendered = parseFloat(tenderedAmount) || 0;
      if (!tenderedAmount || Math.round(tendered * 100) < Math.round(subtotal * 100)) {
        alert(`මුදලින් ගෙවීමේදී දුන් මුදල අවම වශයෙන් මුළු මුදල (Rs. ${subtotal.toFixed(2)}) ට සමාන හෝ වැඩි විය යුතුය.`);
        return;
      }
    }

    setActionLoading(true);

    try {
      // Get next bill number
      const billNumber = await getNextBillNumber();

      const transactionId = `TXN${Date.now()}`;
      const isCreditMode = paymentMethod === 'credit';
      const cartItems = cart.map(item => {
        const mPrice = item.markedPrice ? Number(item.markedPrice) : Number(item.sellPrice);
        const effectivePrice = (isCreditMode && mPrice > Number(item.sellPrice)) ? mPrice : Number(item.sellPrice);
        return {
          id: item.id,
          itemNo: item.itemNo || null,
          name: item.name,
          markedPrice: mPrice,
          sellPrice: effectivePrice,
          quantity: Number(item.quantity),
          subtotal: effectivePrice * Number(item.quantity)
        };
      });

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

      // Update Stock for each item & handle Reload records
      for (const item of cart) {
        if (item.isReload) {
          const reloadId = `RLD${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const numAmount = item.sellPrice || item.amount;
          const commRate = item.commissionRate || 4.0;
          const profit = item.profit || (numAmount * (commRate / 100));

          const reloadRecord = {
            billNumber,
            phone: item.phone,
            network: item.network || 'dialog',
            amount: numAmount,
            commissionRate: commRate,
            profit,
            paymentMethod,
            cashierId: userData?.uid || 'unknown',
            cashierName: userData?.name || 'Cashier',
            timestamp: serverTimestamp(),
            date: new Date()
          };

          if (paymentMethod === 'credit' && selectedDebtor) {
            reloadRecord.debtorId = selectedDebtor.id;
            reloadRecord.debtorName = selectedDebtor.name;
          }

          await setDoc(doc(db, 'reloads', reloadId), reloadRecord);
        } else if (item.isMilling || (item.name && (item.name.includes('වී කෙටීම') || item.name.includes('පොල් කෙටීම')))) {
          const millingId = `MIL${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const millingType = item.millingType || (item.name?.includes('පොල්') ? 'pol' : 'wee');
          const millingRecord = {
            billNumber,
            millingType,
            name: item.name,
            kg: parseFloat(item.quantity) || 1,
            rate: parseFloat(item.sellPrice) || (millingType === 'pol' ? 65 : 7),
            total: (parseFloat(item.sellPrice) || 0) * (parseFloat(item.quantity) || 1),
            paymentMethod,
            cashierId: userData?.uid || 'unknown',
            cashierName: userData?.name || 'Cashier',
            timestamp: serverTimestamp(),
            date: new Date()
          };
          await setDoc(doc(db, 'millingRecords', millingId), millingRecord);
        } else if (item.id && !item.isCustom) {
          // Check if item document still exists before updating stock
          const itemRef = doc(db, 'items', item.id);
          const itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            await updateDoc(itemRef, {
              stock: increment(-item.quantity)
            });
          } else {
            console.warn(`Item ${item.id} (${item.name}) not found in database, skipping stock update.`);
          }
        }
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
      setCheckoutModal(false);
      setCart([]);
      setSelectedDebtor(null);
      setPaymentMethod('cash');
      setDebtorSearch('');
      setTenderedAmount('');

      // Auto-print receipt immediately after successful checkout
      generateBillPDF(billData);

      setIsSuccessModal(true);

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
  const handleBillSearch = async (overrideQuery) => {
    const queryToUse = (overrideQuery !== undefined ? overrideQuery : billSearchQuery).trim();
    setBillSearchLoading(true);
    try {
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      const allTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort all transactions descending by bill number (latest first)
      allTransactions.sort((a, b) => (b.billNumber || 0) - (a.billNumber || 0));

      const cleanQuery = queryToUse.toLowerCase();

      let results = [];
      if (!cleanQuery || cleanQuery === 'l' || cleanQuery === 'last' || cleanQuery === 'latest') {
        // 'L' / 'l' or empty query -> return all bills starting from the latest bill downwards
        results = allTransactions;
      } else {
        const searchNum = parseInt(cleanQuery);
        results = allTransactions.filter(txn => {
          // Exact bill number match
          if (!isNaN(searchNum) && txn.billNumber && txn.billNumber === searchNum) return true;
          // Padded bill number match (e.g. "000075" or "75")
          if (txn.billNumber && String(txn.billNumber).padStart(6, '0').includes(cleanQuery)) return true;
          // Customer / debtor name match
          if (txn.debtorName && txn.debtorName.toLowerCase().includes(cleanQuery)) return true;
          return false;
        });
      }

      setBillSearchResults(results);
    } catch (err) {
      console.error('Bill search error:', err);
      alert('Failed to search bills.');
    } finally {
      setBillSearchLoading(false);
    }
  };

  const handleOpenEditBill = (bill) => {
    setSelectedBill(bill);
    // Map bill items to cart format so they load directly into the main Cart UI
    const cartItems = (bill.items || []).map((bItem, idx) => {
      const matched = items.find(i => i.id === bItem.id || i.name === bItem.name || (i.itemNo && i.itemNo === bItem.itemNo));
      return {
        id: bItem.id || matched?.id || `EDIT_ITEM_${idx}_${Date.now()}`,
        cartId: `edit_${idx}_${Date.now()}`,
        name: bItem.name,
        markedPrice: bItem.markedPrice ? Number(bItem.markedPrice) : Number(bItem.sellPrice),
        sellPrice: Number(bItem.sellPrice) || 0,
        quantity: Number(bItem.quantity) || 1,
        stock: matched ? matched.stock : 999,
        itemNo: bItem.itemNo || matched?.itemNo || null,
        isCustom: bItem.isCustom || false,
        isReload: bItem.isReload || false
      };
    });

    setCart(cartItems);
    setEditingBill({
      id: bill.id,
      billNumber: bill.billNumber,
      originalItems: bill.items || [],
      originalTotal: bill.total || 0,
      paymentMethod: bill.paymentMethod || 'cash',
      cashierName: bill.cashierName || 'Cashier',
      debtorId: bill.debtorId || null,
      debtorName: bill.debtorName || null
    });
    setPaymentMethod(bill.paymentMethod || 'cash');

    // Close all search & detail modals so user lands on main screen with items in Cart
    setBillDetailModal(false);
    setBillSearchModal(false);
    setIsSuccessModal(false);
    setEditBillModal(false);
  };

  const handleCancelEditBill = () => {
    setEditingBill(null);
    setCart([]);
  };

  const handleUpdateBill = async (printAfter = true) => {
    if (!editingBill) return;
    if (cart.length === 0) {
      alert('Bill එකේ අවම වශයෙන් item 1ක් තිබිය යුතුය.');
      return;
    }

    setActionLoading(true);
    try {
      const originalItems = editingBill.originalItems || [];
      const isCreditMode = paymentMethod === 'credit';

      const updatedCartItems = cart.map(item => {
        const mPrice = item.markedPrice ? Number(item.markedPrice) : Number(item.sellPrice);
        const effectivePrice = (isCreditMode && mPrice > Number(item.sellPrice)) ? mPrice : Number(item.sellPrice);
        return {
          id: item.id,
          itemNo: item.itemNo || null,
          name: item.name,
          markedPrice: mPrice,
          sellPrice: effectivePrice,
          quantity: Number(item.quantity),
          subtotal: effectivePrice * Number(item.quantity)
        };
      });

      const newTotal = updatedCartItems.reduce((sum, item) => sum + item.subtotal, 0);
      const oldTotal = editingBill.originalTotal || 0;
      const totalDiff = newTotal - oldTotal;

      // 1. Stock Adjustments (compare originalItems vs current cart)
      for (const origItem of originalItems) {
        if (!origItem.id || origItem.isCustom || origItem.isReload) continue;
        const currentItem = updatedCartItems.find(ci => ci.id === origItem.id);
        const origQty = parseFloat(origItem.quantity) || 0;
        const newQty = currentItem ? (parseFloat(currentItem.quantity) || 0) : 0;
        const qtyDiff = origQty - newQty; // positive = quantity reduced -> add back to stock

        if (qtyDiff !== 0) {
          const itemRef = doc(db, 'items', origItem.id);
          const itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            await updateDoc(itemRef, { stock: increment(qtyDiff) });
          }
        }
      }

      // Handle brand new items added to cart during edit
      for (const newItem of updatedCartItems) {
        if (!newItem.id || newItem.isCustom || newItem.isReload) continue;
        const wasInOrig = originalItems.find(oi => oi.id === newItem.id);
        if (!wasInOrig) {
          const itemRef = doc(db, 'items', newItem.id);
          const itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            await updateDoc(itemRef, { stock: increment(-parseFloat(newItem.quantity)) });
          }
        }
      }

      // 2. Update Transaction document
      await updateDoc(doc(db, 'transactions', editingBill.id), {
        items: updatedCartItems,
        total: newTotal,
        paymentMethod,
        editedAt: serverTimestamp()
      });

      // 3. Cash Session Adjustment
      if (paymentMethod === 'cash' && Math.abs(totalDiff) > 0.001) {
        try {
          const qSession = query(collection(db, 'cashSessions'), where('status', '==', 'open'));
          const sessionSnap = await getDocs(qSession);
          if (!sessionSnap.empty) {
            const openDoc = sessionSnap.docs[0];
            const existingEntries = openDoc.data().entries || [];
            const billNoFormatted = String(editingBill.billNumber).padStart(6, '0');
            const adjustEntry = {
              type: totalDiff > 0 ? 'in' : 'out',
              isSale: true,
              isAdjustment: true,
              amount: Math.abs(totalDiff),
              note: `Bill #${billNoFormatted} Edit Adjustment`,
              billNumber: editingBill.billNumber,
              time: new Date().toISOString()
            };
            await updateDoc(doc(db, 'cashSessions', openDoc.id), {
              entries: [...existingEntries, adjustEntry]
            });
          }
        } catch (csErr) {
          console.warn('Could not sync cash session adjustment:', csErr);
        }
      }

      const billData = {
        billNumber: editingBill.billNumber,
        items: updatedCartItems,
        total: newTotal,
        paymentMethod,
        tenderedAmount: parseFloat(tenderedAmount) || newTotal,
        cashierName: editingBill.cashierName || userData?.name || 'Cashier',
        debtorName: paymentMethod === 'credit' ? (selectedDebtor?.name || editingBill.debtorName) : null,
        date: new Date()
      };

      generateBillPDF(billData);

      alert(`Bill #${String(editingBill.billNumber).padStart(6, '0')} සාර්ථකව Update කර Print කරන ලදී!`);

      // Refresh items to show updated stock
      const itemSnapshot = await getDocs(collection(db, 'items'));
      setItems(itemSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      setEditingBill(null);
      setCart([]);
      setCheckoutModal(false);
      setPreviewModal(false);
    } catch (err) {
      console.error('Update bill error:', err);
      alert('Bill update කිරීම අසාර්ථකයි: ' + err.message);
    } finally {
      setActionLoading(false);
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="bill-search-btn glass" onClick={() => handleOpenMillingModal('wee')} title="කෙටීමේ ගාස්තු (වී [*] / පොල් [/])" style={{ borderColor: '#eab308', color: '#eab308' }}>
                <FiSettings /> <span>කෙටීමේ ගාස්තු [* / /]</span>
              </button>
              <button className="bill-search-btn glass" onClick={handleOpenQuickCustomItem} title="නොමැති භාණ්ඩයක් එකතු කරන්න (.)" style={{ borderColor: 'var(--success-400)', color: 'var(--success-400)' }}>
                <FiEdit3 /> <span>නොමැති භාණ්ඩ [.]</span>
              </button>
              <button className="bill-search-btn glass" onClick={handleOpenReloadModal} title={t('reload.title')} style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-400)' }}>
                <FiZap /> <span>{t('reload.quickReload')}</span>
              </button>
              <button
                className="bill-search-btn glass"
                onClick={() => {
                  setBillSearchModal(true);
                  handleBillSearch('l');
                }}
                title={t('sales.searchBill')}
              >
                <FiFileText /> <span>{t('sales.searchBill')}</span>
              </button>
            </div>
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
                onKeyDown={handleSearchKeyDown}
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
                    if (cat === 'වී කෙටීම') {
                      handleOpenMillingModal('wee');
                    } else if (cat === 'පොල් කෙටීම') {
                      handleOpenMillingModal('pol');
                    } else {
                      setSearch('');
                      setSelectedCategory(selectedCategory === cat ? '' : cat);
                    }
                  }}
                >
                  {cat === 'වී කෙටීම' ? '🌾 වී කෙටීම [*]' : cat === 'පොල් කෙටීම' ? '🥥 පොල් කෙටීම [/]' : cat}
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
          {editingBill && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '10px 14px',
              margin: '0.75rem 1rem 0.25rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#92400e',
              fontWeight: '600',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(245,158,11,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit3 style={{ fontSize: '1.2rem', color: '#d97706' }} />
                <span>Editing Bill #{String(editingBill.billNumber).padStart(6, '0')}</span>
              </div>
              <button
                onClick={handleCancelEditBill}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel Edit
              </button>
            </div>
          )}

          <div className="cart-header">
            <h2 className="cart-title"><FiShoppingCart /> {t('sales.cart')}</h2>
            <div className="cart-header-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="add-custom-quick-btn"
                onClick={handleOpenQuickCustomItem}
                title="නොමැති භාණ්ඩයක් එකතු කරන්න (.)"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#22c55e',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiPlus style={{ fontSize: '1rem', fontWeight: 'bold' }} />
                <span>වෙනත් [.]</span>
              </button>
              {cart.length > 0 && (
                <button className="clear-cart-btn" onClick={() => { if (window.confirm('Clear entire cart?')) { setCart([]); setActiveCartId(null); } }} title="Clear Cart">
                  <FiTrash2 /> Clear
                </button>
              )}
              <span className="cart-count">{cart.length} items</span>
            </div>
          </div>

          <div className="cart-items">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div
                  key={item.cartId || item.id}
                  className="cart-item"
                  onClick={() => setActiveCartId(item.cartId || item.id)}
                >
                  <div className="cart-item-info">
                    <span className="cart-item-name">
                      {item.name}
                      {item.itemType === 'weighed' && <span className="weighed-tag"> ⚖️</span>}
                      {item.isReload && <span className="reload-tag" style={{ background: 'rgba(234, 88, 12, 0.2)', color: '#ea580c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '6px', fontWeight: 'bold' }}>⚡ Reload</span>}
                      {item.isCustom && <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '6px', fontWeight: 'bold' }}>✏️ Custom</span>}
                      {item.isMilling && <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '6px', fontWeight: 'bold' }}>⚙️ කෙටීම</span>}
                    </span>
                    <span className="cart-item-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      {item.markedPrice && Number(item.markedPrice) > Number(item.sellPrice) ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>
                          සඳහන්: Rs. {Number(item.markedPrice).toFixed(2)}
                        </span>
                      ) : null}
                      <span>Rs. {Number(item.sellPrice).toFixed(2)}{(item.itemType === 'weighed' || item.isMilling) ? '/kg' : ''}</span>
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    {!item.isReload && (
                      <button
                        className="edit-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditCartItem(item);
                        }}
                        title="🏷️ මිල / Discount වෙනස් කරන්න"
                        style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}
                      >
                        <FiEdit3 style={{ fontSize: '13px' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>මිල</span>
                      </button>
                    )}
                    {item.itemType === 'weighed' ? (
                      <div className="weight-input-inline" onClick={(e) => e.stopPropagation()}>
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
                    ) : item.isMilling ? (
                      <div className="weight-input-inline" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateMillingWeightDirectly(item.cartId, e.target.value)}
                          className="weight-input-field"
                          style={{ width: '65px' }}
                        />
                        <span className="weight-unit">kg</span>
                      </div>
                    ) : item.isReload ? (
                      <div className="qty-controls">
                        <span>1</span>
                      </div>
                    ) : item.isCustom ? (
                      <div className="qty-controls">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1, item.cartId);
                        }}><FiMinus /></button>
                        <span>{item.quantity}</span>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, 1, item.cartId);
                        }}><FiPlus /></button>
                      </div>
                    ) : (
                      <div className="qty-controls">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1, item.cartId);
                        }}><FiMinus /></button>
                        <span>{item.quantity}</span>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, 1, item.cartId);
                        }}><FiPlus /></button>
                      </div>
                    )}
                    <button className="remove-cart-btn" onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(item.id, item.cartId, item.name);
                    }} title="Remove Item"><FiTrash2 /></button>
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
            <div style={{ display: 'grid', gridTemplateColumns: editingBill ? '1fr 1.5fr' : '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
              <Button
                variant="secondary"
                onClick={() => setPreviewModal(true)}
                disabled={cart.length === 0}
                icon={<FiEye />}
                fullWidth
              >
                {t('sales.preview')}
              </Button>
              {editingBill ? (
                <Button
                  onClick={() => handleUpdateBill(true)}
                  disabled={cart.length === 0}
                  loading={actionLoading}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 'bold' }}
                  icon={<FiPrinter />}
                  fullWidth
                >
                  UPDATE &amp; PRINT
                </Button>
              ) : (
                <Button
                  onClick={() => setCheckoutModal(true)}
                  disabled={cart.length === 0}
                  className="checkout-btn"
                  icon={<FiCheckCircle />}
                  fullWidth
                >
                  {t('sales.checkout')}
                </Button>
              )}
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{getShopInfo().name}</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{getShopInfo().address}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Tel: {getShopInfo().phone}</p>
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

          {/* Bill Type Selector */}
          <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
              බිල්පත වර්ගය තෝරන්න / Select Bill Type:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '10px',
                  border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1px solid var(--border-color)',
                  background: paymentMethod === 'cash' ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(74,222,128,0.1))' : 'var(--bg-glass)',
                  color: paymentMethod === 'cash' ? '#16a34a' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: paymentMethod === 'cash' ? '700' : '500',
                  fontSize: '0.8rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  transition: 'all 0.2s',
                  boxShadow: paymentMethod === 'cash' ? '0 4px 12px rgba(22,163,74,0.2)' : 'none'
                }}
              >
                <FiDollarSign style={{ fontSize: '1.1rem' }} />
                <span>{t('sales.cash')}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('credit')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '10px',
                  border: paymentMethod === 'credit' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  background: paymentMethod === 'credit' ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))' : 'var(--bg-glass)',
                  color: paymentMethod === 'credit' ? '#f59e0b' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: paymentMethod === 'credit' ? '700' : '500',
                  fontSize: '0.8rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  transition: 'all 0.2s',
                  boxShadow: paymentMethod === 'credit' ? '0 4px 12px rgba(245,158,11,0.2)' : 'none'
                }}
              >
                <FiCreditCard style={{ fontSize: '1.1rem' }} />
                <span>{t('sales.credit')}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('home_use')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '10px',
                  border: paymentMethod === 'home_use' ? '2px solid #06b6d4' : '1px solid var(--border-color)',
                  background: paymentMethod === 'home_use' ? 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(34,211,238,0.1))' : 'var(--bg-glass)',
                  color: paymentMethod === 'home_use' ? '#06b6d4' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: paymentMethod === 'home_use' ? '700' : '500',
                  fontSize: '0.8rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  transition: 'all 0.2s',
                  boxShadow: paymentMethod === 'home_use' ? '0 4px 12px rgba(6,182,212,0.2)' : 'none'
                }}
              >
                <FiHome style={{ fontSize: '1.1rem' }} />
                <span>{t('sales.homeUse')}</span>
              </button>
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
                const isCredit = paymentMethod === 'credit';
                const previewBillData = {
                  billNumber: 'PREVIEW',
                  items: cart.map(i => {
                    const mPrice = i.markedPrice ? Number(i.markedPrice) : Number(i.sellPrice);
                    const effectivePrice = (isCredit && mPrice > Number(i.sellPrice)) ? mPrice : Number(i.sellPrice);
                    return {
                      ...i,
                      markedPrice: mPrice,
                      sellPrice: effectivePrice,
                      subtotal: effectivePrice * i.quantity
                    };
                  }),
                  total: subtotal,
                  paymentMethod: paymentMethod,
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
              className={paymentMethod === 'cash' ? 'active cash-active' : ''}
              onClick={() => setPaymentMethod('cash')}
            >
              <FiDollarSign /> {t('sales.cash')}
            </button>
            <button
              className={paymentMethod === 'credit' ? 'active credit-active' : ''}
              onClick={() => setPaymentMethod('credit')}
            >
              <FiCreditCard /> {t('sales.credit')}
            </button>
            <button
              className={paymentMethod === 'home_use' ? 'active homeuse-active' : ''}
              onClick={() => setPaymentMethod('home_use')}
            >
              <FiHome /> {t('sales.homeUse')}
            </button>
          </div>

          <div className="tendered-amount-section mt-4 mb-4">
            <label className="input-label mb-2 d-block">{t('sales.tenderedAmount')}</label>
            <div className="search-box glass" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <FiDollarSign className="search-icon" />
              <input
                ref={tenderedInputRef}
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
            {paymentMethod === 'cash' && (!tenderedAmount || Math.round((parseFloat(tenderedAmount) || 0) * 100) < Math.round(subtotal * 100)) && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ මුදලින් ගෙවීමේදී දුන් මුදල අවම වශයෙන් මුළු ගණන (Rs. {subtotal.toFixed(2)}) ට සමාන හෝ වැඩි විය යුතුය.
              </div>
            )}
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
            <Button
              onClick={handleCheckout}
              loading={actionLoading}
              disabled={paymentMethod === 'cash' && (!tenderedAmount || Math.round((parseFloat(tenderedAmount) || 0) * 100) < Math.round(subtotal * 100))}
              icon={<FiCheckCircle />}
            >
              {t('sales.confirmSale')}
            </Button>
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
            {isOwner && lastBillData && (
              <Button
                variant="secondary"
                icon={<FiEdit3 />}
                onClick={() => {
                  setIsSuccessModal(false);
                  handleOpenEditBill({
                    id: lastTransactionId,
                    ...lastBillData
                  });
                }}
              >
                Edit Bill
              </Button>
            )}
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
                placeholder="Bill No, Customer Name or 'L' for Latest Bills..."
                value={billSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setBillSearchQuery(val);
                  if (val.trim().toLowerCase() === 'l' || val.trim() === '') {
                    handleBillSearch(val);
                  }
                }}
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
                  const pw = prompt('Enter Owner Password to delete ALL bills:');
                  if (pw !== '723412641') {
                    if (pw !== null) alert('Incorrect password. Operation cancelled.');
                    return;
                  }
                  if (!window.confirm('⚠️ සියලුම බිල්පත් සහ ගනුදෙනු (All Bills & Transactions) ස්ථිරවම මකා දැමීමට ඔබට විශ්වාසද?')) return;
                  try {
                    let count = 0;
                    const collectionsToClear = ['transactions', 'reloads', 'millingRecords'];
                    for (const colName of collectionsToClear) {
                      const snap = await getDocs(collection(db, colName));
                      for (const document of snap.docs) {
                        await deleteDoc(doc(db, colName, document.id));
                        count++;
                      }
                    }

                    // Reset bill counter
                    const counterRef = doc(db, 'counters', 'billNumber');
                    await setDoc(counterRef, { current: 1 });

                    setBillSearchResults([]);
                    alert(`සියලුම බිල්පත් සාර්ථකව මකා දමන ලදී (${count} records deleted).`);
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
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setBillSearchModal(false);
                        handleOpenEditBill(bill);
                      }}
                      icon={<FiEdit3 />}
                    >
                      Edit
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
              <Button
                variant="secondary"
                onClick={() => {
                  setBillDetailModal(false);
                  handleOpenEditBill(selectedBill);
                }}
                icon={<FiEdit3 />}
              >
                Edit Bill
              </Button>
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

      {/* Quick Reload Modal */}
      <Modal isOpen={reloadModal} onClose={() => setReloadModal(false)} title="⚡ Reload කළමනාකරණය / Reload Management" size="lg">
        <div className="quick-reload-modal-content">
          {/* Modal Header Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setReloadTab('new')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: reloadTab === 'new' ? '2px solid var(--primary-400)' : '2px solid transparent',
                background: 'none',
                color: reloadTab === 'new' ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FiZap /> ⚡ නව Reload එකක්
            </button>
            <button
              type="button"
              onClick={() => { setReloadTab('history'); fetchReloadModalHistory(); }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: reloadTab === 'history' ? '2px solid var(--primary-400)' : '2px solid transparent',
                background: 'none',
                color: reloadTab === 'history' ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FiSearch /> 🔍 සොයන්න & History ({reloadModalHistory.length})
            </button>
          </div>

          {reloadTab === 'new' ? (
            <div>
              {/* Network Selection */}
              <div className="form-group mb-4">
                <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  {t('reload.selectNetwork')} / ජාලය තෝරන්න
                </label>
                <div className="network-selector-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
                  {NETWORKS.map(net => (
                    <button
                      key={net.id}
                      type="button"
                      className={`network-btn ${net.id} ${reloadNetwork === net.id ? 'active' : ''}`}
                      onClick={() => setReloadNetwork(net.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: reloadNetwork === net.id ? `2px solid ${net.color}` : '1px solid var(--border-color)',
                        background: reloadNetwork === net.id ? `${net.color}22` : 'var(--bg-glass)',
                        color: reloadNetwork === net.id ? net.color : 'var(--text-primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <FiZap style={{ fontSize: '16px', color: net.color }} />
                      <span>{net.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="form-group mb-4">
                <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('reload.phoneNumber')} / දුරකථන අංකය
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="077XXXXXXX"
                    value={reloadPhone}
                    onChange={(e) => handleReloadPhoneChange(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '40px', fontSize: '1.1rem', fontWeight: 600 }}
                    autoFocus
                  />
                  <FiPhoneCall style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-400)', fontSize: '18px' }} />
                </div>
              </div>

              {/* Amount Input & Preset Buttons */}
              <div className="form-group mb-4">
                <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('reload.amount')} / මුදල (රු.)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={reloadAmount}
                  onChange={(e) => setReloadAmount(e.target.value)}
                  className="search-input mb-2"
                  style={{ width: '100%', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-400)' }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[50, 100, 200, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReloadAmount(String(amt))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        background: reloadAmount === String(amt) ? 'var(--primary-500)' : 'rgba(255,255,255,0.05)',
                        color: reloadAmount === String(amt) ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Rs. {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* USSD Box Preview */}
              {ussdCode && (
                <div className="ussd-box-preview" style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>USSD Dial Code:</span>
                    <code style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '1px' }}>{ussdCode}</code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUSSD}
                    style={{ padding: '6px 12px', background: reloadCopied ? '#22c55e' : 'var(--primary-500)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {reloadCopied ? <FiCheck /> : <FiCopy />}
                    <span>{reloadCopied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions mt-6" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => setReloadModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleDirectQuickReload}
                  disabled={actionLoading}
                  variant="secondary"
                  icon={<FiZap />}
                  style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-400)' }}
                >
                  ⚡ වෙනම Reload කරන්න
                </Button>
                <Button
                  onClick={handleAddReloadToCart}
                  disabled={actionLoading}
                  icon={<FiShoppingCart />}
                >
                  🛒 කරත්තයට එකතු කරන්න
                </Button>
              </div>
            </div>
          ) : (
            /* History & Search Tab */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>දුරකථන අංකය සොයන්න (Phone)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="077XXXXXXX..."
                      value={reloadModalSearch}
                      onChange={(e) => setReloadModalSearch(e.target.value)}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '32px', fontSize: '0.9rem' }}
                    />
                    <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>දිනය තෝරන්න (Date)</label>
                  <input
                    type="date"
                    value={reloadModalDate}
                    onChange={(e) => setReloadModalDate(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Summary Bar */}
              {(() => {
                const filtered = reloadModalHistory.filter(r => {
                  if (reloadModalSearch.trim()) {
                    const cleanS = reloadModalSearch.trim().toLowerCase();
                    if (!r.phone?.toLowerCase().includes(cleanS) && !String(r.billNumber).includes(cleanS)) return false;
                  }
                  if (reloadModalDate) {
                    const dateObj = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : (r.date ? new Date(r.date) : null);
                    if (!dateObj) return false;
                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    if (`${y}-${m}-${d}` !== reloadModalDate) return false;
                  }
                  return true;
                });
                const tot = filtered.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);

                return (
                  <div>
                    <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#60a5fa', display: 'flex', justifyContent: 'space-between' }}>
                      <span>සොයාගත් Reloads: <strong>{filtered.length}</strong></span>
                      <span>එකතුව: <strong>Rs. {tot.toFixed(2)}</strong></span>
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {filtered.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '6px 4px' }}>දිනය / වේලාව</th>
                              <th style={{ padding: '6px 4px' }}>ජාලය</th>
                              <th style={{ padding: '6px 4px' }}>දුරකථන අංකය</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right' }}>මුදල</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right' }}>Print</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(item => {
                              const dObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : (item.date ? new Date(item.date) : new Date());
                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '6px 4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                                    {dObj.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })} {dObj.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td style={{ padding: '6px 4px', textTransform: 'capitalize', fontWeight: 600 }}>{item.network}</td>
                                  <td style={{ padding: '6px 4px', fontWeight: 'bold' }}>{item.phone}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', color: 'var(--success-400)' }}>Rs. {parseFloat(item.amount || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => generateReloadReceiptPDF(item)}
                                      style={{ background: 'none', border: 'none', color: 'var(--primary-400)', cursor: 'pointer' }}
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
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>තොරතුරු හමු නොවීය (No matching reload history).</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>

      {/* Milling Calculator Modal (වී කෙටීම / පොල් කෙටීම) */}
      <Modal
        isOpen={millingModal}
        onClose={() => setMillingModal(false)}
        title="🌾 🥥 කෙටීමේ ගාස්තු ගණකය (Milling Calculator)"
      >
        <div style={{ padding: '0.5rem 0' }}>
          {/* Service Type Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => handleSelectMillingType('wee')}
              style={{
                padding: '0.85rem 0.5rem',
                borderRadius: '12px',
                border: millingType === 'wee' ? '2px solid #eab308' : '1px solid var(--border-color)',
                background: millingType === 'wee' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-glass)',
                color: millingType === 'wee' ? '#eab308' : 'var(--text-primary)',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🌾</span>
              <span>වී කෙටීම</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Rs. 7.00 / kg</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMillingType('pol')}
              style={{
                padding: '0.85rem 0.5rem',
                borderRadius: '12px',
                border: millingType === 'pol' ? '2px solid #ea580c' : '1px solid var(--border-color)',
                background: millingType === 'pol' ? 'rgba(234, 88, 12, 0.15)' : 'var(--bg-glass)',
                color: millingType === 'pol' ? '#ea580c' : 'var(--text-primary)',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🥥</span>
              <span>පොල් කෙටීම</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Rs. 65.00 / kg</span>
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleAddMillingToCart(); }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                කෙටූ කිලෝග්‍රෑම් ගණන (Kg):
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={millingKgInputRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={millingKg}
                  onChange={(e) => setMillingKg(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    border: '2px solid var(--primary-400)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                />
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Kg
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', opacity: 0.8 }}>
                  1 Kg සඳහා ගාස්තුව (Rs):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={millingRate}
                  onChange={(e) => setMillingRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            {/* Live Amount Calculation Display Box */}
            <div style={{
              background: millingType === 'wee' ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.05))' : 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(234, 88, 12, 0.05))',
              border: `2px solid ${millingType === 'wee' ? '#eab308' : '#ea580c'}`,
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, marginBottom: '4px' }}>
                ගණනය කළ මුළු ගාස්තුව (Total):
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: millingType === 'wee' ? '#eab308' : '#ea580c' }}>
                Rs. {((parseFloat(millingKg) || 0) * (parseFloat(millingRate) || 0)).toFixed(2)}
              </div>
              {parseFloat(millingKg) > 0 && (
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>
                  ({parseFloat(millingKg)} Kg × Rs. {parseFloat(millingRate) || 0})
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMillingModal(false)}
                fullWidth
              >
                අවලංගු කරන්න
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!parseFloat(millingKg) || parseFloat(millingKg) <= 0}
                fullWidth
              >
                🛒 බිලට එක් කරන්න
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Custom Item Modal (නොමැති භාණ්ඩ) */}
      <Modal isOpen={customItemModal} onClose={() => setCustomItemModal(false)} title="✏️ නොමැති භාණ්ඩයක් බිලට එකතු කරන්න / Add Custom Item">
        <div className="custom-item-modal-content">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            පද්ධතියේ නොමැති භාණ්ඩයක් සෘජුවම බිලට එකතු කරන්න. (නම ඇතුළත් නොකළහොත් "වෙනත් භාණ්ඩ" ලෙස සටහන් වේ)
          </p>

          {/* Item Name */}
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              භාණ්ඩයේ නම / Item Name <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px' }}>(විකල්පයි / Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="වෙනත් භාණ්ඩ (උදා: බිස්කට්, පාන්...)"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="search-input"
                style={{ width: '100%', paddingLeft: '40px', fontSize: '1rem', fontWeight: 600 }}
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomItem()}
              />
              <FiEdit3 style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--success-400)', fontSize: '18px' }} />
            </div>
          </div>

          {/* Marked Price (Optional) */}
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              සඳහන් මිල / Marked Price (MRP) <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px' }}>(විකල්පයි / Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                placeholder={customItemPrice || "0.00"}
                value={customItemMarkedPrice}
                onChange={(e) => setCustomItemMarkedPrice(e.target.value)}
                className="search-input"
                style={{ width: '100%', paddingLeft: '40px', fontSize: '1rem', fontWeight: 600 }}
              />
              <FiDollarSign style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px' }} />
            </div>
          </div>

          {/* Item Price */}
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              අපේ මිල / Selling Price (Rs.)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={customItemPriceRef}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(e.target.value)}
                className="search-input"
                style={{ width: '100%', paddingLeft: '40px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--success-400)' }}
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomItem()}
              />
              <FiDollarSign style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--success-400)', fontSize: '18px' }} />
            </div>
          </div>

          {/* Item Quantity */}
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              ප්‍රමාණය / Quantity
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCustomItemQty(String(Math.max(1, (parseInt(customItemQty) || 1) - 1)))}
                style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FiMinus />
              </button>
              <input
                type="number"
                min="1"
                value={customItemQty}
                onChange={(e) => setCustomItemQty(e.target.value)}
                className="search-input"
                style={{ width: '80px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
              />
              <button
                type="button"
                onClick={() => setCustomItemQty(String((parseInt(customItemQty) || 1) + 1))}
                style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FiPlus />
              </button>
            </div>
          </div>

          {/* Total Preview */}
          {customItemPrice && parseFloat(customItemPrice) > 0 && (
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>එකතුව / Total</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>
                Rs. {(parseFloat(customItemPrice) * (parseInt(customItemQty) || 1)).toFixed(2)}
              </span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions mt-6" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCustomItemModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddCustomItem}
              icon={<FiShoppingCart />}
              style={{ background: 'var(--success-500)' }}
            >
              🛒 කරත්තයට එකතු කරන්න
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Cart Item Price/Discount Modal */}
      <Modal isOpen={editCartItemModal} onClose={() => setEditCartItemModal(false)} title="🏷️ මිල / Discount වෙනස් කිරීම">
        <div style={{ padding: '4px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            <strong>{editingCartItem?.name}</strong> සඳහා සඳහන් මිල හෝ අපේ විකුණුම් මිල වෙනස් කරන්න.
          </p>
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              සඳහන් මිල / Marked Price (MRP - Rs.) <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px' }}>(විකල්පයි)</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder={editSellPrice || "0.00"}
              value={editMarkedPrice}
              onChange={(e) => setEditMarkedPrice(e.target.value)}
              className="search-input"
              style={{ width: '100%', fontSize: '1rem', fontWeight: 600 }}
            />
          </div>
          <div className="form-group mb-4">
            <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              අපේ මිල / Selling Price (Rs.)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={editSellPrice}
              onChange={(e) => setEditSellPrice(e.target.value)}
              className="search-input"
              style={{ width: '100%', fontSize: '1.2rem', fontWeight: 700, color: 'var(--success-400)' }}
            />
          </div>
          {editMarkedPrice && editSellPrice && parseFloat(editMarkedPrice) > parseFloat(editSellPrice) && (
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#60a5fa', display: 'block' }}>පාරිභෝගිකයාට ලැබෙන ලාභය (Discount / Unit)</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                Rs. {(parseFloat(editMarkedPrice) - parseFloat(editSellPrice)).toFixed(2)}
              </span>
            </div>
          )}
          <div className="modal-actions mt-6" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditCartItemModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveCartItemPrice} style={{ background: 'var(--primary-500)' }}>
              💾 සුරකින්න (Save)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
