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
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
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
        <td colspan="4" style="font-weight: 900; padding: 6px 2px 2px 2px; font-size: 15px; color: #000;">${item.name || 'Item'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #000;">
        <td style="text-align:left; padding: 3px 2px 6px 2px; font-size: 13px; font-weight: 800; color: #000;">${formattedQty}</td>
        <td style="text-align:right; padding: 3px 2px 6px 2px; font-size: 13px; font-weight: 700; color: #000;">${mPrice.toFixed(2)}</td>
        <td style="text-align:right; padding: 3px 2px 6px 2px; font-size: 13px; font-weight: 700; color: #000;">${sPrice.toFixed(2)}</td>
        <td style="text-align:right; padding: 3px 2px 6px 2px; font-size: 14px; font-weight: 900; color: #000;">${subtotal.toFixed(2)}</td>
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
<html lang="si">
<head>
  <meta charset="UTF-8">
  <base href="${origin}/">
  <title>Bill #${billNum}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      src: local('Noto Sans Sinhala'), url('${origin}/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 600;
      src: local('Noto Sans Sinhala SemiBold'), url('${origin}/fonts/NotoSansSinhala-SemiBold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      src: local('Noto Sans Sinhala Bold'), url('${origin}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 800;
      src: local('Noto Sans Sinhala ExtraBold'), local('Noto Sans Sinhala Bold'), url('${origin}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 900;
      src: local('Noto Sans Sinhala Black'), local('Noto Sans Sinhala Bold'), url('${origin}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body {
      font-family: 'Noto Sans Sinhala', 'Nirmala UI', 'Iskoola Pota', 'FMAbhaya', 'Segoe UI', Arial, sans-serif !important;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      color: #000;
      font-size: 13px;
      font-weight: 700;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .shop-name { 
      font-size: 22px; 
      font-weight: 900; 
      margin-bottom: 4px; 
      color: #000; 
      line-height: 1.2;
    }
    .shop-info { font-size: 12px; font-weight: 700; color: #000; line-height: 1.4; }
    .divider { border-top: 1.5px dashed #000; margin: 6px 0; }
    .bill-number { text-align: center; font-size: 16px; font-weight: 900; margin: 4px 0; color: #000; }
    .meta-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin: 3px 0; color: #000; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; color: #000; }
    thead tr {
      background-color: #000 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th {
      font-weight: 800;
      padding: 5px 3px;
      font-size: 13px;
      color: #fff !important;
      text-align: right;
      background-color: #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th:first-child { text-align: left; }
    .total-section { margin-top: 6px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin: 4px 0; color: #000; }
    .grand-total { 
      font-size: 21px; 
      font-weight: 900; 
      margin: 6px 0; 
      padding: 3px 0; 
      border-top: 1px dashed #000; 
      border-bottom: 1px dashed #000; 
      color: #000; 
    }
    .footer { text-align: center; margin-top: 10px; font-size: 12px; font-weight: 700; color: #000; }
    .footer .thanks { font-weight: 900; font-size: 15px; color: #000; margin-bottom: 3px; }
    @media print {
      body { width: 80mm; margin: 0; padding: 2mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000; font-weight: 700; }
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
      <span style="font-weight: 800;">${totalItemTypes}</span>
    </div>
    <div class="total-row grand-total">
      <span>මුළු එකතුව</span>
      <span>${billTotal.toFixed(2)}</span>
    </div>
    ${!isHomeUse ? `
    <div class="total-row">
      <span>ගෙවීම් :</span>
      <span style="font-weight: 800;">${tendered.toFixed(2)}</span>
    </div>
    ` : ''}
    ${isCash ? `
    <div class="total-row" style="font-size: 16px; font-weight: 900; margin: 4px 0;">
      <span>ඉතිරි:</span>
      <span>Rs. ${change.toFixed(2)}</span>
    </div>
    ` : ''}
    ${isCredit ? `
    <div class="total-row" style="font-size: 16px; font-weight: 900; margin: 4px 0;">
      <span>ණය මුදල (Owed):</span>
      <span>Rs. ${creditOwed.toFixed(2)}</span>
    </div>
    ` : ''}

    ${totalSavings > 0 ? `
    <div class="divider"></div>
    <div style="text-align:center; padding: 6px 0; color: #000;">
      <div style="font-size: 14px; font-weight: 800;">ඔබට ලැබුණු ලාභය</div>
      <div style="font-size: 18px; font-weight: 900; margin-top: 2px;">Rs. ${totalSavings.toFixed(2)}</div>
    </div>
    ` : ''}
  </div>

  <div class="divider"></div>

  <div class="meta-row" style="justify-content:center; font-size: 13px;">
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

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error("Print failed: ", err);
    }
  };

  try {
    if (iframe.contentWindow.document.fonts && iframe.contentWindow.document.fonts.status === 'loaded') {
      setTimeout(triggerPrint, 10);
    } else if (iframe.contentWindow.document.fonts && iframe.contentWindow.document.fonts.ready) {
      iframe.contentWindow.document.fonts.ready.then(() => {
        setTimeout(triggerPrint, 15);
      }).catch(() => {
        setTimeout(triggerPrint, 25);
      });
      setTimeout(triggerPrint, 80);
    } else {
      setTimeout(triggerPrint, 15);
    }
  } catch {
    setTimeout(triggerPrint, 15);
  }
}

// Generate Reload Receipt - supports Sinhala Unicode text cleanly on all browsers
export function generateReloadReceiptPDF(reloadRecord) {
  if (!reloadRecord) return;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shopInfo = getShopInfo();
  const billNum = reloadRecord.billNumber ? String(reloadRecord.billNumber).padStart(6, '0') : '000000';
  const dateStr = formatSriLankaDateTime(reloadRecord.date || reloadRecord.timestamp || getNow());

  const html = `
<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8">
  <base href="${origin}/">
  <title>Reload Receipt #${billNum}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      src: local('Noto Sans Sinhala'), url('${origin}/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 600;
      src: local('Noto Sans Sinhala SemiBold'), url('${origin}/fonts/NotoSansSinhala-SemiBold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      src: local('Noto Sans Sinhala Bold'), url('${origin}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 800;
      src: local('Noto Sans Sinhala ExtraBold'), local('Noto Sans Sinhala Bold'), url('${origin}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 900;
      src: local('Noto Sans Sinhala Black'), local('Noto Sans Sinhala Bold'), url('${origin}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body {
      font-family: 'Noto Sans Sinhala', 'Nirmala UI', 'Iskoola Pota', 'FMAbhaya', 'Segoe UI', Arial, sans-serif !important;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      color: #000;
      background: #fff;
      font-size: 13px;
      font-weight: 700;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header { text-align: center; margin-bottom: 8px; border-bottom: 1.5px dashed #000; padding-bottom: 6px; }
    .shop-name { 
      font-size: 22px; 
      font-weight: 900; 
      margin-bottom: 3px; 
      color: #000; 
      line-height: 1.2;
    }
    .shop-info { font-size: 12px; font-weight: 700; color: #000; margin-bottom: 2px; }
    .badge { display: inline-block; border: 1.5px solid #000; padding: 3px 8px; font-size: 11px; font-weight: 900; border-radius: 4px; margin: 4px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin: 3px 0; color: #000; }
    .divider { border-top: 1.5px dashed #000; margin: 6px 0; }
    .amount-box { text-align: center; border: 2px solid #000; border-radius: 6px; padding: 10px 4px; margin: 8px 0; }
    .amount-label { font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .amount-val { font-size: 24px; font-weight: 900; margin-top: 2px; }
    .footer { text-align: center; font-size: 12px; font-weight: 700; margin-top: 8px; border-top: 1.5px dashed #000; padding-top: 6px; color: #000; }
    .footer .thanks { font-weight: 900; font-size: 14px; margin-bottom: 2px; }
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { width: 80mm; margin: 0; padding: 2mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${shopInfo.name}</div>
    <div class="shop-info">${shopInfo.address}</div>
    <div class="shop-info">Tel: ${shopInfo.phone}</div>
    <div><span class="badge">RELOAD RECEIPT</span></div>
  </div>

  <div class="meta-row">
    <span>Bill No: <strong>#${billNum}</strong></span>
    <span>Date: ${dateStr}</span>
  </div>
  <div class="meta-row">
    <span>Cashier: ${reloadRecord.cashierName || 'Cashier'}</span>
    <span>Method: ${reloadRecord.paymentMethod ? reloadRecord.paymentMethod.toUpperCase() : 'CASH'}</span>
  </div>
  ${reloadRecord.debtorName ? `<div class="meta-row"><span>Debtor: <strong>${reloadRecord.debtorName}</strong></span></div>` : ''}

  <div class="divider"></div>

  <div class="meta-row" style="font-size: 12px;">
    <span>Network:</span>
    <strong style="text-transform: uppercase;">${reloadRecord.network}</strong>
  </div>
  <div class="meta-row" style="font-size: 13px; margin: 4px 0;">
    <span>Phone:</span>
    <strong>${reloadRecord.phone}</strong>
  </div>

  <div class="amount-box">
    <div class="amount-label">Reload Amount</div>
    <div class="amount-val">Rs. ${parseFloat(reloadRecord.amount || 0).toFixed(2)}</div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div class="thanks">ස්තූතියි! Thank You!</div>
    <div>SmartPOS Reload Service</div>
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

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error("Print failed: ", err);
    }
  };

  try {
    if (iframe.contentWindow.document.fonts && iframe.contentWindow.document.fonts.status === 'loaded') {
      setTimeout(triggerPrint, 10);
    } else if (iframe.contentWindow.document.fonts && iframe.contentWindow.document.fonts.ready) {
      iframe.contentWindow.document.fonts.ready.then(() => {
        setTimeout(triggerPrint, 15);
      }).catch(() => {
        setTimeout(triggerPrint, 25);
      });
      setTimeout(triggerPrint, 80);
    } else {
      setTimeout(triggerPrint, 15);
    }
  } catch {
    setTimeout(triggerPrint, 15);
  }
}
