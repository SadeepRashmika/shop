import{r as e,s as t}from"./index-Blad7rBt.js";function n(){try{let e=localStorage.getItem(`smartpos_settings`);if(e){let t=JSON.parse(e);return{name:t.shopName||`සුමින්ද ස්ටෝර්ස්`,phone:t.shopPhone||`0777640334`,email:t.shopEmail||`sumindapradeep1111@gmail.com`,address:t.shopAddress||`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`}}}catch{}return{name:`සුමින්ද ස්ටෝර්ස්`,phone:`0777640334`,email:`sumindapradeep1111@gmail.com`,address:`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`}}function r(e){if(!e)return`1`;let t=Number(e.quantity);return isNaN(t)?e.quantity||`1`:e.itemType===`weighed`||e.isWeighed||t%1!=0&&t<100?t<1?`${Math.round(t*1e3)}g`:`${t%1==0?t:t.toFixed(3).replace(/\.?0+$/,``)} kg`:e.isMilling?t<1?`${Math.round(t*1e3)}g`:`${t} kg`:`${t}`}function i(i){if(!i)return;let a=n(),o=i.billNumber?String(i.billNumber).padStart(6,`0`):i.id?i.id.substring(0,8):`000000`,s=e(i.date||i.timestamp||t()),c=i.items||[],l=c.length,u=i.paymentMethod===`credit`?0:c.reduce((e,t)=>{let n=Number(t.markedPrice)||Number(t.sellPrice||t.price||0),r=Number(t.sellPrice||t.price||0),i=Number(t.quantity)||1;return e+Math.max(0,(n-r)*i)},0),d=c.map(e=>{let t=Number(e.quantity)||0,n=Number(e.sellPrice??e.price??e.markedPrice??(t>0?Number(e.subtotal)/t:0))||0,i=Number(e.markedPrice)||n,a=Number(e.subtotal??n*t)||0,o=r(e);return`
      <tr style="border-top: 1px solid #000;">
        <td colspan="4" style="font-weight: 800; padding: 5px 2px 2px 2px; font-size: 14px; color: #000;">${e.name||`Item`}</td>
      </tr>
      <tr style="border-bottom: 1px solid #000;">
        <td style="text-align:left; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${o}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${i.toFixed(2)}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 700; color: #000;">${n.toFixed(2)}</td>
        <td style="text-align:right; padding: 2px 2px 5px 2px; font-size: 11px; font-weight: 800; color: #000;">${a.toFixed(2)}</td>
      </tr>
    `}).join(``),f=(i.paymentMethod||``).toLowerCase()===`cash`,p=(i.paymentMethod||``).toLowerCase()===`credit`,m=(i.paymentMethod||``).toLowerCase()===`home_use`,h=Number(i.total)||0,g=i.tenderedAmount!==void 0&&i.tenderedAmount!==null&&Number(i.tenderedAmount)>0?Number(i.tenderedAmount):f?h:0,_=Math.max(0,g-h),v=Math.max(0,h-g),y=`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill #${o}</title>
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
    <div class="shop-name">${a.name}</div>
    <div class="shop-info">${a.address}</div>
    <div class="shop-info">Tel: ${a.phone}</div>
    <div class="shop-info">${a.email}</div>
  </div>

  <div class="divider"></div>

  <div class="bill-number">BILL #${o}</div>

  <div class="meta-row">
    <span>Date: ${s}</span>
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
      ${d}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-section">
    <div class="total-row">
      <span>වර්ග ගණන (Types):</span>
      <span>${l}</span>
    </div>
    <div class="total-row grand-total">
      <span>මුළු එකතුව</span>
      <span>${h.toFixed(2)}</span>
    </div>
    ${m?``:`
    <div class="total-row">
      <span>ගෙවීම් :</span>
      <span>${g.toFixed(2)}</span>
    </div>
    `}
    ${f?`
    <div class="total-row font-bold">
      <span>ඉතිරි:</span>
      <span>Rs. ${_.toFixed(2)}</span>
    </div>
    `:``}
    ${p?`
    <div class="total-row font-bold">
      <span>ණය මුදල (Owed):</span>
      <span>Rs. ${v.toFixed(2)}</span>
    </div>
    `:``}

    ${u>0?`
    <div class="divider"></div>
    <div style="text-align:center; padding: 6px 0; color: #000;">
      <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">ඔබට ලැබුණු ලාභය</div>
      <div style="font-size: 17px; font-weight: 800; margin-top: 2px;">Rs. ${u.toFixed(2)}</div>
    </div>
    `:``}
  </div>

  <div class="divider"></div>

  <div class="meta-row" style="justify-content:center;">
    <span>Payment: ${(i.paymentMethod||`CASH`).toUpperCase()}</span>
  </div>

  <div class="footer">
    <div class="thanks">ස්තූතියි! Thank You!</div>
    <div>Please visit again</div>
  </div>
</body>
</html>`,b=document.getElementById(`print-receipt-frame`);b&&b.remove();let x=document.createElement(`iframe`);x.id=`print-receipt-frame`,x.style.position=`fixed`,x.style.right=`0`,x.style.bottom=`0`,x.style.width=`0px`,x.style.height=`0px`,x.style.border=`none`,x.style.visibility=`hidden`,document.body.appendChild(x);let S=x.contentWindow.document;S.open(),S.write(y),S.close(),setTimeout(()=>{try{x.contentWindow.focus(),x.contentWindow.print()}catch(e){console.error(`Print failed: `,e)}},50)}export{i as n,n as r,r as t};