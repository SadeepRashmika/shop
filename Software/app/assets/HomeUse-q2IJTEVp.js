import{r as e}from"./rolldown-runtime-Dw2cE7zH.js";import{p as t}from"./vendor-charts-Df5dl7RP.js";import{At as n,D as r,G as i,H as a,K as o,X as s,ct as c,dt as l,l as u,q as d,xt as f,yt as p}from"./vendor-react-s6yDqvTV.js";import{_ as m,a as h,d as g,m as _}from"./vendor-firebase-5cgFongs.js";import{n as v}from"./firebase-B22BFBT9.js";import{n as y}from"./AuthContext-Bv0LuVHk.js";import{t as b}from"./Card-B2L6C5m9.js";var x=e(t(),1),S=f();function C(){try{let e=localStorage.getItem(`smartpos_settings`);if(e){let t=JSON.parse(e);return{name:t.shopName||`සුමින්ද ස්ටෝර්ස්`,phone:t.shopPhone||`0777640334`,address:t.shopAddress||`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`,email:t.shopEmail||`sumindapradeep1111@gmail.com`}}}catch{}return{name:`සුමින්ද ස්ටෝර්ස්`,phone:`0777640334`,address:`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`,email:`sumindapradeep1111@gmail.com`}}function w(){let{t:e}=p(),t=n(),{userData:f,isOwner:w}=y(),[T,E]=(0,x.useState)([]),[D,O]=(0,x.useState)(!0),[k,A]=(0,x.useState)(``),[j,M]=(0,x.useState)(new Date().toISOString().split(`T`)[0]),[N,P]=(0,x.useState)(`day`);(0,x.useEffect)(()=>{F()},[]);let F=async()=>{O(!0);try{let e=[];try{(await h(g(m(v,`transactions`),_(`paymentMethod`,`==`,`home_use`)))).forEach(t=>{e.push({id:t.id,...t.data()})})}catch{(await h(m(v,`transactions`))).forEach(t=>{let n=t.data();n.paymentMethod===`home_use`&&e.push({id:t.id,...n})})}e.sort((e,t)=>{let n=e.timestamp?.toDate?e.timestamp.toDate().getTime():e.timestamp?.seconds?e.timestamp.seconds*1e3:new Date(e.date||0).getTime();return(t.timestamp?.toDate?t.timestamp.toDate().getTime():t.timestamp?.seconds?t.timestamp.seconds*1e3:new Date(t.date||0).getTime())-n}),E(e)}catch(e){console.error(`Error fetching home use records:`,e)}finally{O(!1)}},I=(0,x.useMemo)(()=>T.filter(e=>{let t=(e.timestamp?.toDate?e.timestamp.toDate():e.timestamp?.seconds?new Date(e.timestamp.seconds*1e3):new Date(e.date||Date.now())).toISOString().split(`T`)[0],n=t.substring(0,7);if(N===`day`&&t!==j||N===`month`&&n!==j.substring(0,7))return!1;if(k.trim()){let t=k.toLowerCase(),n=e.billNumber?String(e.billNumber):``,r=(e.cashierName||``).toLowerCase(),i=(e.items||[]).map(e=>(e.name||``).toLowerCase()).join(` `);return n.includes(t)||r.includes(t)||i.includes(t)}return!0}),[T,j,N,k]),L=(0,x.useMemo)(()=>{let e=new Date().toISOString().split(`T`)[0],t=e.substring(0,7),n=0,r=0,i=0,a=0;T.forEach(o=>{let s=Number(o.total)||0;i+=s;let c=(o.timestamp?.toDate?o.timestamp.toDate():o.timestamp?.seconds?new Date(o.timestamp.seconds*1e3):new Date(o.date||Date.now())).toISOString().split(`T`)[0];c===e&&(n+=s),c.startsWith(t)&&(r+=s),o.items&&o.items.forEach(e=>{a+=Number(e.quantity)||0})});let o=0,s=0;return I.forEach(e=>{o+=Number(e.total)||0,e.items&&e.items.forEach(e=>{s+=Number(e.quantity)||0})}),{todayTotal:n,thisMonthTotal:r,allTimeTotal:i,allTimeItems:a,filteredTotal:o,filteredItemsCount:s,filteredCount:I.length}},[T,I]),R=(e,t=0)=>{if(P(e),e===`all`)return;let n=new Date;n.setDate(n.getDate()-t),M(n.toISOString().split(`T`)[0])},z=e=>`Rs. ${Number(e||0).toFixed(2)}`,B=e=>e?(e.toDate?e.toDate():new Date(e.seconds?e.seconds*1e3:e)).toLocaleString(`en-LK`,{year:`numeric`,month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`}):`—`;return D?(0,S.jsxs)(`div`,{className:`loading-state`,children:[(0,S.jsx)(`div`,{className:`loading-spinner`}),(0,S.jsx)(`span`,{children:e(`common.loading`)})]}):(0,S.jsxs)(`div`,{className:`home-use-page fade-in`,children:[(0,S.jsxs)(`div`,{className:`hu-header`,children:[(0,S.jsxs)(`div`,{className:`hu-header-left`,children:[(0,S.jsxs)(`h1`,{className:`hu-title`,children:[(0,S.jsx)(r,{style:{color:`var(--accent-400)`}}),e(`homeUse.title`)]}),(0,S.jsx)(`p`,{className:`hu-subtitle`,children:e(`homeUse.subtitle`)})]}),(0,S.jsxs)(`div`,{className:`hu-header-actions`,children:[(0,S.jsxs)(`button`,{className:`hu-btn hu-btn-outline`,onClick:()=>{let e=C(),t=N===`day`?`දිනය: ${j}`:N===`month`?`මාසය: ${j.substring(0,7)}`:`සියලුම කාලපරිච්ඡේදය (All Time)`,n=`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>නිවසට ගත් භාණ්ඩ වාර්තාව - ${t}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      weight: 400;
      src: local('Noto Sans Sinhala'), local('Iskoola Pota'), local('Nirmala UI'), url('/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      weight: 700;
      src: local('Noto Sans Sinhala Bold'), local('Noto Sans Sinhala'), local('Iskoola Pota'), local('Nirmala UI'), url('/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      weight: 900;
      src: local('Noto Sans Sinhala Black'), local('Noto Sans Sinhala Bold'), url('/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700;800;900&display=swap');
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body { 
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', 'FMAbhaya', 'Segoe UI', Arial, sans-serif !important; 
      padding: 15mm 20mm; 
      color: #000; 
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
      -webkit-font-smoothing: antialiased;
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .shop-name { font-size: 24px; font-weight: 900; color: #000; margin-bottom: 4px; }
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
    <div class="report-meta">${t} • බිල්පත් ${I.length} ක් • මුද්‍රණය කළ දිනය: ${new Date().toLocaleString(`en-LK`)}</div>
  </div>

  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-lbl">තෝරාගත් කාලයේ මුළු එකතුව (Total Value)</div>
      <div class="stat-val" style="color:#10b981;">Rs. ${L.filteredTotal.toFixed(2)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-lbl">මුළු භාණ්ඩ ප්‍රමාණය (Items Qty)</div>
      <div class="stat-val">${L.filteredItemsCount}</div>
    </div>
    <div class="stat-box">
      <div class="stat-lbl">බිල්පත් ගණන (Bills Count)</div>
      <div class="stat-val">${L.filteredCount}</div>
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
      ${I.map(e=>{let t=e.timestamp?.toDate?e.timestamp.toDate():new Date(e.timestamp?.seconds?e.timestamp.seconds*1e3:e.date||Date.now());return`
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
    `,r=window.open(``,`_blank`,`width=850,height=900`);r?(r.document.write(n),r.document.close()):alert(`කරුණාකර Popup windows වලට අවසර ලබා දෙන්න (Please allow popups to download PDF).`)},id:`hu-print-btn`,children:[(0,S.jsx)(o,{}),` `,e(`homeUse.printReport`)]}),(0,S.jsxs)(`button`,{className:`hu-btn hu-btn-primary`,onClick:()=>{t(`/sales`,{state:{setPaymentMethod:`home_use`}})},id:`hu-new-sale-btn`,children:[(0,S.jsx)(i,{}),` `,e(`homeUse.newHomeUseSale`)]})]})]}),(0,S.jsxs)(`div`,{className:`milling-controls glass-card mb-6`,style:{padding:`12px 16px`,borderRadius:`16px`,display:`flex`,justifyContent:`space-between`,alignItems:`center`,flexWrap:`wrap`,gap:`12px`},children:[(0,S.jsxs)(`div`,{className:`quick-date-group`,style:{display:`flex`,gap:`6px`,flexWrap:`wrap`},children:[(0,S.jsx)(`button`,{className:`filter-btn ${N===`day`&&j===new Date().toISOString().split(`T`)[0]?`active`:``}`,onClick:()=>R(`day`,0),children:`📅 අද (Today)`}),(0,S.jsx)(`button`,{className:`filter-btn ${N===`day`&&j===new Date(Date.now()-864e5).toISOString().split(`T`)[0]?`active`:``}`,onClick:()=>R(`day`,1),children:`⏪ ඊයේ (Yesterday)`}),(0,S.jsx)(`button`,{className:`filter-btn ${N===`month`?`active`:``}`,onClick:()=>R(`month`),children:`📆 මාසිකව (Monthly)`}),(0,S.jsx)(`button`,{className:`filter-btn ${N===`all`?`active`:``}`,onClick:()=>R(`all`),children:`♾️ සියලුම දින (All Time)`})]}),(0,S.jsx)(`div`,{className:`date-picker-wrap`,style:{display:`flex`,alignItems:`center`,gap:`8px`},children:N===`month`?(0,S.jsx)(`input`,{type:`month`,value:j.substring(0,7),onChange:e=>{e.target.value&&(M(`${e.target.value}-01`),P(`month`))},className:`custom-date-input glass`,style:{padding:`6px 12px`,borderRadius:`10px`,border:`1px solid var(--border-color)`,background:`var(--bg-glass)`,color:`var(--text-primary)`,fontWeight:600}}):(0,S.jsx)(`input`,{type:`date`,value:j,onChange:e=>{e.target.value&&(M(e.target.value),P(`day`))},className:`custom-date-input glass`,style:{padding:`6px 12px`,borderRadius:`10px`,border:`1px solid var(--border-color)`,background:`var(--bg-glass)`,color:`var(--text-primary)`,fontWeight:600}})})]}),(0,S.jsxs)(`div`,{className:`hu-stats-grid`,children:[(0,S.jsxs)(b,{hover:!1,className:`hu-stat-card`,children:[(0,S.jsx)(`div`,{className:`hu-stat-icon cyan`,children:(0,S.jsx)(r,{})}),(0,S.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,S.jsx)(`span`,{className:`hu-stat-value`,children:z(N===`day`?L.filteredTotal:L.todayTotal)}),(0,S.jsx)(`span`,{className:`hu-stat-label`,children:N===`day`?`තෝරාගත් දින මුදල`:e(`homeUse.todayTotal`)})]})]}),(0,S.jsxs)(b,{hover:!1,className:`hu-stat-card`,children:[(0,S.jsx)(`div`,{className:`hu-stat-icon purple`,children:(0,S.jsx)(u,{})}),(0,S.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,S.jsx)(`span`,{className:`hu-stat-value`,children:z(N===`month`?L.filteredTotal:L.thisMonthTotal)}),(0,S.jsx)(`span`,{className:`hu-stat-label`,children:N===`month`?`තෝරාගත් මාසයේ මුදල`:e(`homeUse.monthTotal`)})]})]}),(0,S.jsxs)(b,{hover:!1,className:`hu-stat-card`,children:[(0,S.jsx)(`div`,{className:`hu-stat-icon green`,children:(0,S.jsx)(c,{})}),(0,S.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,S.jsx)(`span`,{className:`hu-stat-value`,style:{color:`var(--success-400)`},children:z(L.allTimeTotal)}),(0,S.jsx)(`span`,{className:`hu-stat-label`,children:e(`homeUse.allTimeTotal`)})]})]}),(0,S.jsxs)(b,{hover:!1,className:`hu-stat-card`,children:[(0,S.jsx)(`div`,{className:`hu-stat-icon orange`,children:(0,S.jsx)(a,{})}),(0,S.jsxs)(`div`,{className:`hu-stat-info`,children:[(0,S.jsxs)(`span`,{className:`hu-stat-value`,children:[L.filteredItemsCount,` (`,L.filteredCount,`)`]}),(0,S.jsx)(`span`,{className:`hu-stat-label`,children:`තෝරාගත් භාණ්ඩ (බිල්පත්)`})]})]})]}),(0,S.jsxs)(`div`,{className:`hu-history-section`,children:[(0,S.jsxs)(`div`,{className:`hu-filter-bar`,children:[(0,S.jsx)(`div`,{className:`hu-search-wrap`,children:(0,S.jsxs)(`div`,{className:`search-box glass`,style:{padding:`8px 16px`,borderRadius:`var(--radius-md)`},children:[(0,S.jsx)(s,{className:`search-icon`}),(0,S.jsx)(`input`,{type:`text`,placeholder:`බිල්පත් අංකය, භාණ්ඩ නම හෝ සටහන් කළ අය සොයන්න...`,value:k,onChange:e=>A(e.target.value),className:`search-input`,id:`hu-search-input`})]})}),(0,S.jsxs)(`button`,{onClick:F,className:`hu-btn hu-btn-outline`,style:{padding:`8px 14px`},title:`Refresh Data`,children:[(0,S.jsx)(d,{}),` Refresh`]})]}),(0,S.jsx)(b,{hover:!1,children:(0,S.jsx)(`div`,{className:`hu-table-container`,children:I.length>0?(0,S.jsxs)(`table`,{className:`hu-table`,children:[(0,S.jsx)(`thead`,{children:(0,S.jsxs)(`tr`,{children:[(0,S.jsx)(`th`,{children:e(`homeUse.date`)}),(0,S.jsx)(`th`,{children:e(`homeUse.billNo`)}),(0,S.jsx)(`th`,{children:e(`homeUse.items`)}),(0,S.jsx)(`th`,{children:e(`homeUse.totalValue`)}),(0,S.jsx)(`th`,{children:e(`homeUse.recordedBy`)})]})}),(0,S.jsx)(`tbody`,{children:I.map(e=>(0,S.jsxs)(`tr`,{children:[(0,S.jsx)(`td`,{style:{whiteSpace:`nowrap`},children:B(e.timestamp)}),(0,S.jsx)(`td`,{children:(0,S.jsxs)(`span`,{className:`hu-bill-badge`,children:[`#`,e.billNumber?String(e.billNumber).padStart(6,`0`):`—`]})}),(0,S.jsx)(`td`,{children:(0,S.jsx)(`div`,{className:`hu-items-list`,children:e.items?.map((e,t)=>(0,S.jsxs)(`span`,{className:`hu-item-tag`,children:[(0,S.jsx)(`span`,{children:e.name}),(0,S.jsxs)(`span`,{className:`hu-item-qty`,children:[`x`,e.quantity]}),(0,S.jsxs)(`span`,{style:{opacity:.7},children:[`(Rs. `,e.sellPrice,`)`]})]},t))})}),(0,S.jsx)(`td`,{children:(0,S.jsx)(`span`,{className:`hu-value-badge`,children:z(e.total)})}),(0,S.jsx)(`td`,{style:{fontWeight:500},children:(0,S.jsxs)(`span`,{style:{display:`inline-flex`,alignItems:`center`,gap:6},children:[(0,S.jsx)(l,{style:{opacity:.6}}),` `,e.cashierName||`Cashier`]})})]},e.id))})]}):(0,S.jsxs)(`div`,{className:`empty-state`,children:[(0,S.jsx)(`span`,{className:`empty-icon`,children:`🏡`}),(0,S.jsx)(`p`,{children:`තෝරාගත් කාලපරිච්ඡේදය සඳහා නිවසට ගත් භාණ්ඩ සටහන් වී නොමැත.`}),(N!==`all`||k)&&(0,S.jsx)(`button`,{className:`hu-btn hu-btn-outline mt-3`,onClick:()=>{P(`all`),A(``)},children:`සියලුම දින පෙන්වන්න (Show All Time)`})]})})})]})]})}export{w as default};