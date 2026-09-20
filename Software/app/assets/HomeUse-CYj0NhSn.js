import{r as e}from"./rolldown-runtime-Dw2cE7zH.js";import{p as t}from"./vendor-charts-Df5dl7RP.js";import{At as n,D as r,G as i,H as a,K as o,X as s,ct as c,dt as l,l as u,q as d,xt as f,yt as p}from"./vendor-react-s6yDqvTV.js";import{a as m,g as h}from"./vendor-firebase-Dmr82m4h.js";import{n as g}from"./firebase-DsJrkmZs.js";import{n as _}from"./AuthContext-CJEzVawX.js";import{t as v}from"./Card-B2L6C5m9.js";var y=e(t(),1),b=f();function x(){try{let e=localStorage.getItem(`smartpos_settings`);if(e){let t=JSON.parse(e);return{name:t.shopName||`සුමින්ද ස්ටෝර්ස්`,phone:t.shopPhone||`0777640334`,address:t.shopAddress||`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`,email:t.shopEmail||`sumindapradeep1111@gmail.com`}}}catch{}return{name:`සුමින්ද ස්ටෝර්ස්`,phone:`0777640334`,address:`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`,email:`sumindapradeep1111@gmail.com`}}function S(){let{t:e}=p(),t=n(),{userData:f,isOwner:S}=_(),[C,w]=(0,y.useState)([]),[T,E]=(0,y.useState)(!0),[D,O]=(0,y.useState)(``),[k,A]=(0,y.useState)(new Date().toISOString().split(`T`)[0]),[j,M]=(0,y.useState)(`day`);(0,y.useEffect)(()=>{N()},[]);let N=async()=>{E(!0);try{let e=await m(h(g,`transactions`)),t=[];e.forEach(e=>{let n=e.data();n.paymentMethod===`home_use`&&t.push({id:e.id,...n})}),t.sort((e,t)=>{let n=e.timestamp?.toDate?e.timestamp.toDate().getTime():e.timestamp?.seconds?e.timestamp.seconds*1e3:new Date(e.date||0).getTime();return(t.timestamp?.toDate?t.timestamp.toDate().getTime():t.timestamp?.seconds?t.timestamp.seconds*1e3:new Date(t.date||0).getTime())-n}),w(t)}catch(e){console.error(`Error fetching home use records:`,e)}finally{E(!1)}},P=(0,y.useMemo)(()=>C.filter(e=>{let t=(e.timestamp?.toDate?e.timestamp.toDate():e.timestamp?.seconds?new Date(e.timestamp.seconds*1e3):new Date(e.date||Date.now())).toISOString().split(`T`)[0],n=t.substring(0,7);if(j===`day`&&t!==k||j===`month`&&n!==k.substring(0,7))return!1;if(D.trim()){let t=D.toLowerCase(),n=e.billNumber?String(e.billNumber):``,r=(e.cashierName||``).toLowerCase(),i=(e.items||[]).map(e=>(e.name||``).toLowerCase()).join(` `);return n.includes(t)||r.includes(t)||i.includes(t)}return!0}),[C,k,j,D]),F=(0,y.useMemo)(()=>{let e=new Date().toISOString().split(`T`)[0],t=e.substring(0,7),n=0,r=0,i=0,a=0;C.forEach(o=>{let s=Number(o.total)||0;i+=s;let c=(o.timestamp?.toDate?o.timestamp.toDate():o.timestamp?.seconds?new Date(o.timestamp.seconds*1e3):new Date(o.date||Date.now())).toISOString().split(`T`)[0];c===e&&(n+=s),c.startsWith(t)&&(r+=s),o.items&&o.items.forEach(e=>{a+=Number(e.quantity)||0})});let o=0,s=0;return P.forEach(e=>{o+=Number(e.total)||0,e.items&&e.items.forEach(e=>{s+=Number(e.quantity)||0})}),{todayTotal:n,thisMonthTotal:r,allTimeTotal:i,allTimeItems:a,filteredTotal:o,filteredItemsCount:s,filteredCount:P.length}},[C,P]),I=(e,t=0)=>{if(M(e),e===`all`)return;let n=new Date;n.setDate(n.getDate()-t),A(n.toISOString().split(`T`)[0])},L=e=>`Rs. ${Number(e||0).toFixed(2)}`,R=e=>e?(e.toDate?e.toDate():new Date(e.seconds?e.seconds*1e3:e)).toLocaleString(`en-LK`,{year:`numeric`,month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`}):`—`;return T?(0,b.jsxs)(`div`,{className:`loading-state`,children:[(0,b.jsx)(`div`,{className:`loading-spinner`}),(0,b.jsx)(`span`,{children:e(`common.loading`)})]}):(0,b.jsxs)(`div`,{className:`home-use-page fade-in`,children:[(0,b.jsxs)(`div`,{className:`hu-header`,children:[(0,b.jsxs)(`div`,{className:`hu-header-left`,children:[(0,b.jsxs)(`h1`,{className:`hu-title`,children:[(0,b.jsx)(r,{style:{color:`var(--accent-400)`}}),e(`homeUse.title`)]}),(0,b.jsx)(`p`,{className:`hu-subtitle`,children:e(`homeUse.subtitle`)})]}),(0,b.jsxs)(`div`,{className:`hu-header-actions`,children:[(0,b.jsxs)(`button`,{className:`hu-btn hu-btn-outline`,onClick:()=>{let e=x(),t=j===`day`?`දිනය: ${k}`:j===`month`?`මාසය: ${k.substring(0,7)}`:`සියලුම කාලපරිච්ඡේදය (All Time)`,n=`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>නිවසට ගත් භාණ්ඩ වාර්තාව - ${t}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Sinhala', 'Segoe UI', Arial, sans-serif; padding: 15mm 20mm; color: #000; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .shop-name { font-size: 24px; font-weight: 900; -webkit-text-stroke: 0.6px #000; color: #000; margin-bottom: 4px; }
    .shop-info { font-size: 13px; font-weight: 700; color: #333; }
    .report-title { font-size: 19px; font-weight: 800; margin-top: 10px; color: #000; }
    .report-meta { font-size: 13px; font-weight: 700; margin-top: 4px; color: #555; }
    
    .stats-row { display: flex; justify-content: space-around; background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
    .stat-box { text-align: center; }
    .stat-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .stat-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #0f172a; color: #fff; font-weight: 800; font-size: 12px; }
    .text-right { text-align: right; }
    .item-tag { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 6px; border-radius: 4px; margin: 2px; font-size: 11px; font-weight: 600; }
    .footer { margin-top: 25px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
    @media print {
      body { padding: 10mm; }
      @page { size: auto; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${e.name}</div>
    <div class="shop-info">${e.address} | Tel: ${e.phone}</div>
    <div class="report-title">🏡 නිවසට ගත් භාණ්ඩ වාර්තාව (Home Use Items Report)</div>
    <div class="report-meta">${t} • බිල්පත් ${P.length} ක් • මුද්‍රණය කළ දිනය: ${new Date().toLocaleString(`en-LK`)}</div>
  </div>

  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-lbl">තෝරාගත් කාලයේ මුළු එකතුව (Total Value)</div>
      <div class="stat-val" style="color:#10b981;">Rs. ${F.filteredTotal.toFixed(2)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-lbl">මුළු භාණ්ඩ ප්‍රමාණය (Items Qty)</div>
      <div class="stat-val">${F.filteredItemsCount}</div>
    </div>
    <div class="stat-box">
      <div class="stat-lbl">බිල්පත් ගණන (Bills Count)</div>
      <div class="stat-val">${F.filteredCount}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>දිනය සහ වේලාව</th>
        <th>බිල්පත් අංකය</th>
        <th>ලබාගත් භාණ්ඩ (Items)</th>
        <th class="text-right">මුළු වටිනාකම (Rs.)</th>
        <th>සටහන් කළේ</th>
      </tr>
    </thead>
    <tbody>
      ${P.map(e=>{let t=e.timestamp?.toDate?e.timestamp.toDate():new Date(e.timestamp?.seconds?e.timestamp.seconds*1e3:e.date||Date.now());return`
          <tr>
            <td style="white-space:nowrap;">${t.toLocaleDateString(`en-LK`,{year:`numeric`,month:`short`,day:`numeric`})}<br/><small style="color:#64748b;">${t.toLocaleTimeString(`en-LK`,{hour:`2-digit`,minute:`2-digit`})}</small></td>
            <td style="font-weight:800; color:#3b82f6;">#${e.billNumber?String(e.billNumber).padStart(6,`0`):`-`}</td>
            <td>
              ${(e.items||[]).map(e=>`<span class="item-tag">${e.name} <strong>x${e.quantity}</strong> (Rs. ${Number(e.sellPrice||0).toFixed(2)})</span>`).join(``)}
            </td>
            <td class="text-right" style="font-weight:800; color:#10b981;">Rs. ${Number(e.total||0).toFixed(2)}</td>
            <td>${e.cashierName||`Cashier`}</td>
          </tr>
        `}).join(``)}
    </tbody>
  </table>

  <div class="footer">
    SmartPOS System • Generated by ${f?.name||`Owner`}
  </div>

  <script>
    window.onload = function() { window.print(); };
  <\/script>
</body>
</html>
    `,r=window.open(``,`_blank`,`width=850,height=900`);r?(r.document.write(n),r.document.close()):alert(`කරුණාකර Popup windows වලට අවසර ලබා දෙන්න (Please allow popups to download PDF).`)},id:`hu-print-btn`,children:[(0,b.jsx)(o,{}),` `,e(`homeUse.printReport`)]}),(0,b.jsxs)(`button`,{className:`hu-btn hu-btn-primary`,onClick:()=>{t(`/sales`,{state:{setPaymentMethod:`home_use`}})},id:`hu-new-sale-btn`,children:[(0,b.jsx)(i,{}),` `,e(`homeUse.newHomeUseSale`)]})]})]}),(0,b.jsxs)(`div`,{className:`milling-controls glass-card mb-6`,style:{padding:`12px 16px`,borderRadius:`16px`,display:`flex`,justifyContent:`space-between`,alignItems:`center`,flexWrap:`wrap`,gap:`12px`},children:[(0,b.jsxs)(`div`,{className:`quick-date-group`,style:{display:`flex`,gap:`6px`,flexWrap:`wrap`},children:[(0,b.jsx)(`button`,{className:`filter-btn ${j===`day`&&k===new Date().toISOString().split(`T`)[0]?`active`:``}`,onClick:()=>I(`day`,0),children:`📅 අද (Today)`}),(0,b.jsx)(`button`,{className:`filter-btn ${j===`day`&&k===new Date(Date.now()-864e5).toISOString().split(`T`)[0]?`active`:``}`,onClick:()=>I(`day`,1),children:`⏪ ඊයේ (Yesterday)`}),(0,b.jsx)(`button`,{className:`filter-btn ${j===`month`?`active`:``}`,onClick:()=>I(`month`),children:`📆 මාසිකව (Monthly)`}),(0,b.jsx)(`button`,{className:`filter-btn ${j===`all`?`active`:``}`,onClick:()=>I(`all`),children:`♾️ සියලුම දින (All Time)`})]}),(0,b.jsx)(`div`,{className:`date-picker-wrap`,style:{display:`flex`,alignItems:`center`,gap:`8px`},children:j===`month`?(0,b.jsx)(`input`,{type:`month`,value:k.substring(0,7),onChange:e=>{e.target.value&&(A(`${e.target.value}-01`),M(`month`))},className:`custom-date-input glass`,style:{padding:`6px 12px`,borderRadius:`10px`,border:`1px solid var(--border-color)`,background:`var(--bg-glass)`,color:`var(--text-primary)`,fontWeight:600}}):(0,b.jsx)(`input`,{type:`date`,value:k,onChange:e=>{e.target.value&&(A(e.target.value),M(`day`))},className:`custom-date-input glass`,style:{padding:`6px 12px`,borderRadius:`10px`,border:`1px solid var(--border-color)`,background:`var(--bg-glass)`,color:`var(--text-primary)`,fontWeight:600}})})]}),(0,b.jsxs)(`div`,{className:`hu-stats-grid`,children:[(0,b.jsxs)(v,{hover:!1,className:`hu-stat-card`,children:[(0,b.jsx)(`div`,{className:`hu-stat-icon cyan`,children:(0,b.jsx)(r,{})}),(0,b.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,b.jsx)(`span`,{className:`hu-stat-value`,children:L(j===`day`?F.filteredTotal:F.todayTotal)}),(0,b.jsx)(`span`,{className:`hu-stat-label`,children:j===`day`?`තෝරාගත් දින මුදල`:e(`homeUse.todayTotal`)})]})]}),(0,b.jsxs)(v,{hover:!1,className:`hu-stat-card`,children:[(0,b.jsx)(`div`,{className:`hu-stat-icon purple`,children:(0,b.jsx)(u,{})}),(0,b.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,b.jsx)(`span`,{className:`hu-stat-value`,children:L(j===`month`?F.filteredTotal:F.thisMonthTotal)}),(0,b.jsx)(`span`,{className:`hu-stat-label`,children:j===`month`?`තෝරාගත් මාසයේ මුදල`:e(`homeUse.monthTotal`)})]})]}),(0,b.jsxs)(v,{hover:!1,className:`hu-stat-card`,children:[(0,b.jsx)(`div`,{className:`hu-stat-icon green`,children:(0,b.jsx)(c,{})}),(0,b.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,b.jsx)(`span`,{className:`hu-stat-value`,style:{color:`var(--success-400)`},children:L(F.allTimeTotal)}),(0,b.jsx)(`span`,{className:`hu-stat-label`,children:e(`homeUse.allTimeTotal`)})]})]}),(0,b.jsxs)(v,{hover:!1,className:`hu-stat-card`,children:[(0,b.jsx)(`div`,{className:`hu-stat-icon orange`,children:(0,b.jsx)(a,{})}),(0,b.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,b.jsxs)(`span`,{className:`hu-stat-value`,children:[F.filteredItemsCount,` (`,F.filteredCount,`)`]}),(0,b.jsx)(`span`,{className:`hu-stat-label`,children:`තෝරාගත් භාණ්ඩ (බිල්පත්)`})]})]})]}),(0,b.jsxs)(`div`,{className:`hu-history-section`,children:[(0,b.jsxs)(`div`,{className:`hu-filter-bar`,children:[(0,b.jsx)(`div`,{className:`hu-search-wrap`,children:(0,b.jsxs)(`div`,{className:`search-box glass`,style:{padding:`8px 16px`,borderRadius:`var(--radius-md)`},children:[(0,b.jsx)(s,{className:`search-icon`}),(0,b.jsx)(`input`,{type:`text`,placeholder:`බිල්පත් අංකය, භාණ්ඩ නම හෝ සටහන් කළ අය සොයන්න...`,value:D,onChange:e=>O(e.target.value),className:`search-input`,id:`hu-search-input`})]})}),(0,b.jsxs)(`button`,{onClick:N,className:`hu-btn hu-btn-outline`,style:{padding:`8px 14px`},title:`Refresh Data`,children:[(0,b.jsx)(d,{}),` Refresh`]})]}),(0,b.jsx)(v,{hover:!1,children:(0,b.jsx)(`div`,{className:`hu-table-container`,children:P.length>0?(0,b.jsxs)(`table`,{className:`hu-table`,children:[(0,b.jsx)(`thead`,{children:(0,b.jsxs)(`tr`,{children:[(0,b.jsx)(`th`,{children:e(`homeUse.date`)}),(0,b.jsx)(`th`,{children:e(`homeUse.billNo`)}),(0,b.jsx)(`th`,{children:e(`homeUse.items`)}),(0,b.jsx)(`th`,{children:e(`homeUse.totalValue`)}),(0,b.jsx)(`th`,{children:e(`homeUse.recordedBy`)})]})}),(0,b.jsx)(`tbody`,{children:P.map(e=>(0,b.jsxs)(`tr`,{children:[(0,b.jsx)(`td`,{style:{whiteSpace:`nowrap`},children:R(e.timestamp)}),(0,b.jsx)(`td`,{children:(0,b.jsxs)(`span`,{className:`hu-bill-badge`,children:[`#`,e.billNumber?String(e.billNumber).padStart(6,`0`):`—`]})}),(0,b.jsx)(`td`,{children:(0,b.jsx)(`div`,{className:`hu-items-list`,children:e.items?.map((e,t)=>(0,b.jsxs)(`span`,{className:`hu-item-tag`,children:[(0,b.jsx)(`span`,{children:e.name}),(0,b.jsxs)(`span`,{className:`hu-item-qty`,children:[`x`,e.quantity]}),(0,b.jsxs)(`span`,{style:{opacity:.7},children:[`(Rs. `,e.sellPrice,`)`]})]},t))})}),(0,b.jsx)(`td`,{children:(0,b.jsx)(`span`,{className:`hu-value-badge`,children:L(e.total)})}),(0,b.jsx)(`td`,{style:{fontWeight:500},children:(0,b.jsxs)(`span`,{style:{display:`inline-flex`,alignItems:`center`,gap:6},children:[(0,b.jsx)(l,{style:{opacity:.6}}),` `,e.cashierName||`Cashier`]})})]},e.id))})]}):(0,b.jsxs)(`div`,{className:`empty-state`,children:[(0,b.jsx)(`span`,{className:`empty-icon`,children:`🏡`}),(0,b.jsx)(`p`,{children:`තෝරාගත් කාලපරිච්ඡේදය සඳහා නිවසට ගත් භාණ්ඩ සටහන් වී නොමැත.`}),(j!==`all`||D)&&(0,b.jsx)(`button`,{className:`hu-btn hu-btn-outline mt-3`,onClick:()=>{M(`all`),O(``)},children:`සියලුම දින පෙන්වන්න (Show All Time)`})]})})})]})]})}export{S as default};