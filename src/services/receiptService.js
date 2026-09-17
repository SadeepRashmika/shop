import { getNow, formatSriLankaDateTime } from './timeService';

// Dynamic Shop information & Settings helper
export function getShopInfo() {
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

// Format bill quantity: < 1 kg displayed in grams (e.g. 500g, 250g), >= 1 kg in kg (e.g. 1.5 kg, 2 kg)
export function formatBillQty(item) {
  if (!item) return '1';
  const qty = Number(item.quantity);
  if (isNaN(qty)) return item.quantity || '1';

  const isWeighed = item.itemType === 'weighed' || item.isWeighed || (qty % 1 !== 0 && qty < 100);

  if (isWeighed) {
    if (qty < 1) {
      const grams = Math.round(qty * 1000);
      return `${grams}g`;
    } else {
      const formattedKg = qty % 1 === 0 ? qty : qty.toFixed(3).replace(/\.?0+$/, '');
      return `${formattedKg} kg`;
    }
  }

  if (item.isMilling) {
    if (qty < 1) {
      return `${Math.round(qty * 1000)}g`;
    }
    return `${qty} kg`;
  }

  return `${qty}`;
}

// Generate Bill Receipt - opens in print window (supports Sinhala text)
export function generateBillPDF(billData) {
  if (!billData) return;
  const shopInfo = getShopInfo();
  const billNum = billData.billNumber ? String(billData.billNumber).padStart(6, '0') : (billData.id ? billData.id.substring(0, 8) : '000000');
  const dateStr = formatSriLankaDateTime(billData.date || billData.timestamp || getNow());

  const items = billData.items || [];
  const totalItemTypes = items.length;

  const totalSavings = billData.paymentMethod === 'credit' ? 0 : items.reduce((sum, item) => {
    const mPrice = Number(item.markedPrice) || Number(item.sellPrice || item.price || 0);
    const sPrice = Number(item.sellPrice || item.price || 0);
    const qty = Number(item.quantity) || 1;
    return sum + Math.max(0, (mPrice - sPrice) * qty);
  }, 0);

  const itemsHTML = items.map(item => {
    const qtyNum = Number(item.quantity) || 0;
    const sPrice = Number(item.sellPrice ?? item.price ?? item.markedPrice ?? (qtyNum > 0 ? (Number(item.subtotal) / qtyNum) : 0)) || 0;
    const mPrice = Number(item.markedPrice) || sPrice;
    const subtotal = Number(item.subtotal ?? (sPrice * qtyNum)) || 0;
    const formattedQty = formatBillQty(item);
    return `
      <tr style="border-top: 1px solid #000;">
        <td colspan="4" style="font-weight: 800; padding: 5px 2px 2px 2px; font-size: 14px; color: #000;">${item.name || 'Item'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #000;">
        <td style="text-align:left; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${formattedQty}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${mPrice.toFixed(2)}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${sPrice.toFixed(2)}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 800; color: #000;">${subtotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const isCash = (billData.paymentMethod || '').toLowerCase() === 'cash';
  const isCredit = (billData.paymentMethod || '').toLowerCase() === 'credit';
  const isHomeUse = (billData.paymentMethod || '').toLowerCase() === 'home_use';

  const billTotal = Number(billData.total) || 0;
  const tendered = (billData.tenderedAmount !== undefined && billData.tenderedAmount !== null && Number(billData.tenderedAmount) > 0)
    ? Number(billData.tenderedAmount)
    : (isCash ? billTotal : 0);

  const change = Math.max(0, tendered - billTotal);
  const creditOwed = Math.max(0, billTotal - tendered);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill #${billNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Segoe UI', Arial, sans-serif;
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
    .shop-name { font-size: 22px; font-weight: 900; -webkit-text-stroke: 0.6px #000; margin-bottom: 4px; color: #000; letter-spacing: 0.5px; }
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
    <span>Cashier: ${billData.cashierName || 'Cashier'}</span>
  </div>
  ${billData.debtorName ? `<div class="meta-row"><span>Customer: ${billData.debtorName}</span></div>` : ''}

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
    <div class="total-row">
      <span>වර්ග ගණන (Types):</span>
      <span>${totalItemTypes}</span>
    </div>
    <div class="total-row grand-total">
      <span>මුළු එකතුව</span>
      <span>${billTotal.toFixed(2)}</span>
    </div>
    ${!isHomeUse ? `
    <div class="total-row">
      <span>ගෙවීම් :</span>
      <span>${tendered.toFixed(2)}</span>
    </div>
    ` : ''}
    ${isCash ? `
    <div class="total-row font-bold">
      <span>ඉතිරි:</span>
      <span>Rs. ${change.toFixed(2)}</span>
    </div>
    ` : ''}
    ${isCredit ? `
    <div class="total-row font-bold">
      <span>ණය මුදල (Owed):</span>
      <span>Rs. ${creditOwed.toFixed(2)}</span>
    </div>
    ` : ''}

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
    <span>Payment: ${(billData.paymentMethod || 'CASH').toUpperCase()}</span>
  </div>

  <div class="footer">
    <div class="thanks">ස්තූතියි! Thank You!</div>
    <div>Please visit again</div>
  </div>
</body>
</html>`;

  const oldIframe = document.getElementById('print-receipt-frame');
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'print-receipt-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  
  const frameDoc = iframe.contentWindow.document;
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error("Print failed: ", err);
    }
  };

  setTimeout(triggerPrint, 50);
}
