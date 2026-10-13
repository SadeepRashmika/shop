import{r as e,s as t}from"./index-DrRlfxSX.js";function n(){try{let e=localStorage.getItem(`smartpos_settings`);if(e){let t=JSON.parse(e);return{name:t.shopName||`සුමින්ද ස්ටෝර්ස්`,phone:t.shopPhone||`0777640334`,email:t.shopEmail||`sumindapradeep1111@gmail.com`,address:t.shopAddress||`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`}}}catch{}return{name:`සුමින්ද ස්ටෝර්ස්`,phone:`0777640334`,email:`sumindapradeep1111@gmail.com`,address:`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`}}function r(e){if(!e)return`1`;let t=Number(e.quantity);return isNaN(t)?e.quantity||`1`:e.itemType===`weighed`||e.isWeighed||t%1!=0&&t<100?t<1?`${Math.round(t*1e3)}g`:`${t%1==0?t:t.toFixed(3).replace(/\.?0+$/,``)} kg`:e.isMilling?t<1?`${Math.round(t*1e3)}g`:`${t} kg`:`${t}`}function i(i){if(!i)return;let a=typeof window<`u`?window.location.origin:``,o=n(),s=i.billNumber?String(i.billNumber).padStart(6,`0`):i.id?i.id.substring(0,8):`000000`,c=e(i.date||i.timestamp||t()),l=i.items||[],u=l.length,d=i.paymentMethod===`credit`?0:l.reduce((e,t)=>{let n=Number(t.markedPrice)||Number(t.sellPrice||t.price||0),r=Number(t.sellPrice||t.price||0),i=Number(t.quantity)||1;return e+Math.max(0,(n-r)*i)},0),f=l.map(e=>{let t=Number(e.quantity)||0,n=Number(e.sellPrice??e.price??e.markedPrice??(t>0?Number(e.subtotal)/t:0))||0,i=Number(e.markedPrice)||n,a=Number(e.subtotal??n*t)||0,o=r(e);return`
      <tr style="border-top: 1px solid #000;">
        <td colspan="4" style="font-weight: 900; padding: 6px 2px 2px 2px; font-size: 15px; color: #000;">${e.name||`Item`}</td>
      </tr>
      <tr style="border-bottom: 1px solid #000;">
        <td style="text-align:left; padding: 3px 2px 6px 2px; font-size: 13px; font-weight: 800; color: #000;">${o}</td>
        <td style="text-align:right; padding: 3px 2px 6px 2px; font-size: 13px; font-weight: 700; color: #000;">${i.toFixed(2)}</td>
        <td style="text-align:right; padding: 3px 2px 6px 2px; font-size: 13px; font-weight: 700; color: #000;">${n.toFixed(2)}</td>
        <td style="text-align:right; padding: 3px 2px 6px 2px; font-size: 14px; font-weight: 900; color: #000;">${a.toFixed(2)}</td>
      </tr>
    `}).join(``),p=(i.paymentMethod||``).toLowerCase()===`cash`,m=(i.paymentMethod||``).toLowerCase()===`credit`,h=(i.paymentMethod||``).toLowerCase()===`home_use`,g=Number(i.total)||0,_=i.tenderedAmount!==void 0&&i.tenderedAmount!==null&&Number(i.tenderedAmount)>0?Number(i.tenderedAmount):p?g:0,v=Math.max(0,_-g),y=Math.max(0,g-_),b=`
<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8">
  <base href="${a}/">
  <title>Bill #${s}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      src: local('Noto Sans Sinhala'), local('Nirmala UI'), url('${a}/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      src: local('Noto Sans Sinhala Bold'), local('Nirmala UI Bold'), url('${a}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body {
      font-family: 'Nirmala UI', 'Noto Sans Sinhala', 'Iskoola Pota', Arial, sans-serif !important;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      color: #000;
      font-size: 13px;
      font-weight: 700;
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
  ${!h&&(p||_>0||Number(i.tenderedAmount)>0)?`<div style="font-family: 'FontControl', 'Font Control', monospace; font-size: 10pt; line-height: 0; height: 0; color: #fff; margin: 0; padding: 0; overflow: hidden;">A</div>`:``}
  <div class="header">
    <div class="shop-name">${o.name}</div>
    <div class="shop-info">${o.address}</div>
    <div class="shop-info">Tel: ${o.phone}</div>
    <div class="shop-info">${o.email}</div>
  </div>

  <div class="divider"></div>

  <div class="bill-number">BILL #${s}</div>

  <div class="meta-row">
    <span>Date: ${c}</span>
    <span>Cashier: ${i.cashierName||`Cashier`}</span>
  </div>
  ${i.debtorName?`<div class="meta-row"><span>Customer: ${i.debtorName}</span></div>`:``}

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
      ${f}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-section">
    <div class="total-row">
      <span>වර්ග ගණන (Types):</span>
      <span style="font-weight: 800;">${u}</span>
    </div>
    <div class="total-row grand-total">
      <span>මුළු එකතුව</span>
      <span>${g.toFixed(2)}</span>
    </div>
    ${h?``:`
    <div class="total-row">
      <span>ගෙවීම් :</span>
      <span style="font-weight: 800;">${_.toFixed(2)}</span>
    </div>
    `}
    ${p?`
    <div class="total-row" style="font-size: 16px; font-weight: 900; margin: 4px 0;">
      <span>ඉතිරි:</span>
      <span>Rs. ${v.toFixed(2)}</span>
    </div>
    `:``}
    ${m?`
    <div class="total-row" style="font-size: 16px; font-weight: 900; margin: 4px 0;">
      <span>ණය මුදල (Owed):</span>
      <span>Rs. ${y.toFixed(2)}</span>
    </div>
    `:``}

    ${d>0?`
    <div class="divider"></div>
    <div style="text-align:center; padding: 6px 0; color: #000;">
      <div style="font-size: 14px; font-weight: 800;">ඔබට ලැබුණු ලාභය</div>
      <div style="font-size: 18px; font-weight: 900; margin-top: 2px;">Rs. ${d.toFixed(2)}</div>
    </div>
    `:``}
  </div>

  <div class="divider"></div>

  <div class="meta-row" style="justify-content:center; font-size: 13px;">
    <span>Payment: ${(i.paymentMethod||`CASH`).toUpperCase()}</span>
  </div>

  <div class="footer">
    <div class="thanks">ස්තූතියි! Thank You!</div>
    <div>Please visit again</div>
  </div>
</body>
</html>`,x=document.getElementById(`print-receipt-frame`);x&&x.remove();let S=document.createElement(`iframe`);S.id=`print-receipt-frame`,S.style.position=`fixed`,S.style.right=`0`,S.style.bottom=`0`,S.style.width=`0px`,S.style.height=`0px`,S.style.border=`none`,S.style.visibility=`hidden`,document.body.appendChild(S);let C=S.contentWindow.document;C.open(),C.write(b),C.close();let w=!1;setTimeout(()=>{if(!w){w=!0;try{S.contentWindow.focus(),S.contentWindow.print()}catch(e){console.error(`Print failed: `,e)}}},5)}function a(r){if(!r)return;let i=typeof window<`u`?window.location.origin:``,a=n(),o=r.billNumber?String(r.billNumber).padStart(6,`0`):`000000`,s=e(r.date||r.timestamp||t()),c=`
<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8">
  <base href="${i}/">
  <title>Reload Receipt #${o}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      src: local('Noto Sans Sinhala'), local('Nirmala UI'), url('${i}/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      src: local('Noto Sans Sinhala Bold'), local('Nirmala UI Bold'), url('${i}/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body {
      font-family: 'Nirmala UI', 'Noto Sans Sinhala', 'Iskoola Pota', Arial, sans-serif !important;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      color: #000;
      background: #fff;
      font-size: 13px;
      font-weight: 700;
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
  ${(r.paymentMethod||`cash`).toLowerCase()===`cash`?`<div style="font-family: 'FontControl', 'Font Control', monospace; font-size: 10pt; line-height: 0; height: 0; color: #fff; margin: 0; padding: 0; overflow: hidden;">A</div>`:``}
  <div class="header">
    <div class="shop-name">${a.name}</div>
    <div class="shop-info">${a.address}</div>
    <div class="shop-info">Tel: ${a.phone}</div>
    <div><span class="badge">RELOAD RECEIPT</span></div>
  </div>

  <div class="meta-row">
    <span>Bill No: <strong>#${o}</strong></span>
    <span>Date: ${s}</span>
  </div>
  <div class="meta-row">
    <span>Cashier: ${r.cashierName||`Cashier`}</span>
    <span>Method: ${r.paymentMethod?r.paymentMethod.toUpperCase():`CASH`}</span>
  </div>
  ${r.debtorName?`<div class="meta-row"><span>Debtor: <strong>${r.debtorName}</strong></span></div>`:``}

  <div class="divider"></div>

  <div class="meta-row" style="font-size: 12px;">
    <span>Network:</span>
    <strong style="text-transform: uppercase;">${r.network}</strong>
  </div>
  <div class="meta-row" style="font-size: 13px; margin: 4px 0;">
    <span>Phone:</span>
    <strong>${r.phone}</strong>
  </div>

  <div class="amount-box">
    <div class="amount-label">Reload Amount</div>
    <div class="amount-val">Rs. ${parseFloat(r.amount||0).toFixed(2)}</div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div class="thanks">ස්තූතියි! Thank You!</div>
    <div>SmartPOS Reload Service</div>
  </div>
</body>
</html>`,l=document.getElementById(`print-receipt-frame`);l&&l.remove();let u=document.createElement(`iframe`);u.id=`print-receipt-frame`,u.style.position=`fixed`,u.style.right=`0`,u.style.bottom=`0`,u.style.width=`0px`,u.style.height=`0px`,u.style.border=`none`,u.style.visibility=`hidden`,document.body.appendChild(u);let d=u.contentWindow.document;d.open(),d.write(c),d.close();let f=!1;setTimeout(()=>{if(!f){f=!0;try{u.contentWindow.focus(),u.contentWindow.print()}catch(e){console.error(`Print failed: `,e)}}},5)}export{n as i,i as n,a as r,r as t};