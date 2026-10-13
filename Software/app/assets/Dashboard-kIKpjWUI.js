import{r as e}from"./rolldown-runtime-Dw2cE7zH.js";import{p as t}from"./vendor-charts-Df5dl7RP.js";import{$ as n,At as r,H as i,K as a,S as o,X as s,ct as c,m as l,pt as u,r as d,v as f,xt as p,yt as m}from"./vendor-react-s6yDqvTV.js";import{_ as h,a as g,c as _,d as v,f as y,g as b,m as ee,o as x,r as S,v as C}from"./vendor-firebase-5cgFongs.js";import{n as w}from"./firebase-B22BFBT9.js";import{n as te}from"./AuthContext-Bv0LuVHk.js";import{c as ne,d as T,i as E,p as D,t as O}from"./index-Bk3TjK6T.js";import"./Button-cq_0_lAa.js";import{t as k}from"./Modal-Daw7mFIa.js";import{t as A}from"./Card-B2L6C5m9.js";import"./receiptService-CC9PYkfD.js";import{t as j}from"./BillModal-Mogyam81.js";var M=e(t(),1),N=p();function P(){let{t:e}=m(),t=r(),{userData:p,isOwner:P,isCashier:F,isCustomer:re}=te(),[I,ie]=(0,M.useState)({todaySales:0,todayProfit:0,totalItems:0,totalUsers:0,totalSales:0,totalDebtors:0,lowStockCount:0}),[L,R]=(0,M.useState)([]),[z,B]=(0,M.useState)([]),[V,H]=(0,M.useState)(!0),[U,W]=(0,M.useState)(!1),[G,K]=(0,M.useState)(``),[q,J]=(0,M.useState)(`සියල්ල`),[Y,ae]=(0,M.useState)(`stock-asc`),[X,oe]=(0,M.useState)(5),[Z,Q]=(0,M.useState)(null),se=(0,M.useRef)(),ce=(e,t)=>{let n=`සුමින්ද ස්ටෝර්ස්`,r=`0777640334`,i=`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`;try{let e=localStorage.getItem(`smartpos_settings`);if(e){let t=JSON.parse(e);n=t.shopName||n,r=t.shopPhone||r,i=t.shopAddress||i}}catch{}let a=new Date().toLocaleString(`en-LK`),o=e.map((e,t)=>{let n=Number(e.stock)||0,r=n<=0,i=r?`0 (ඉවරයි)`:`${n%1==0?n:n.toFixed(2)} ${e.itemType===`weighed`?`kg`:``}`;return`
  <div class="row">
    <span class="row-num">${String(t+1).padStart(2,`0`)}.</span>
    <div class="row-info">
      <div class="row-name">${e.name||``}</div>
      ${e.category?`<div class="row-cat">[${e.category}]</div>`:``}
    </div>
    <span class="row-stock ${r?`zero`:``}">${i}</span>
  </div>`}).join(``),s=`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Low Stock Bill - 80mm</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      src: local('Noto Sans Sinhala'), local('Iskoola Pota'), local('Nirmala UI'), url('/fonts/NotoSansSinhala-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      src: local('Noto Sans Sinhala Bold'), local('Noto Sans Sinhala'), local('Iskoola Pota'), local('Nirmala UI'), url('/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 900;
      src: local('Noto Sans Sinhala Black'), local('Noto Sans Sinhala Bold'), url('/fonts/NotoSansSinhala-Bold.ttf') format('truetype');
    }
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800;900&display=swap');
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    body {
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', 'FMAbhaya', 'Segoe UI', Arial, sans-serif !important;
      font-size: 14px;
      font-weight: 800;
      color: #000000;
      background: #ffffff;
      width: 78mm;
      padding: 3mm 2mm;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .shop-name { 
      font-size: 20px; 
      font-weight: 900; 
      text-align: center; 
      margin-bottom: 3px; 
      color: #000000;
    }
    .shop-sub { 
      font-size: 12.5px; 
      font-weight: 700; 
      text-align: center; 
      color: #000000; 
      line-height: 1.35;
    }
    .divider { 
      border: none; 
      border-top: 2px dashed #000000; 
      margin: 7px 0; 
    }
    .title { 
      font-size: 15px; 
      font-weight: 900; 
      text-align: center; 
      margin: 5px 0; 
      color: #000000;
    }
    .info-box { 
      font-size: 13.5px; 
      font-weight: 800; 
      color: #000000; 
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
    }
    .table-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-weight: 900;
      font-size: 15px;
      color: #000000;
      border-bottom: 2px dashed #000000;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 0;
      border-bottom: 1.5px dashed #000000;
      gap: 6px;
      color: #000000;
    }
    .row-num { 
      width: 26px; 
      font-size: 14.5px; 
      font-weight: 900; 
      flex-shrink: 0; 
      color: #000000; 
    }
    .row-info {
      flex: 1;
      min-width: 0;
    }
    .row-name { 
      font-size: 15.5px; 
      font-weight: 900; 
      word-break: break-word; 
      line-height: 1.3;
      color: #000000;
    }
    .row-cat {
      font-size: 12.5px;
      font-weight: 800;
      color: #000000;
      margin-top: 2px;
    }
    .row-stock {
      width: 75px;
      text-align: right;
      font-size: 15.5px;
      font-weight: 900;
      flex-shrink: 0;
      color: #000000;
    }
    .row-stock.zero {
      font-weight: 900;
      color: #000000;
      text-decoration: underline;
    }
    .footer { 
      text-align: center; 
      margin-top: 10px; 
      font-size: 14px; 
      font-weight: 900; 
      color: #000000; 
    }
    @media print {
      body { width: 78mm; padding: 1mm 1mm; }
      @page { margin: 1mm; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="shop-name">${n}</div>
  <div class="shop-sub">${i}</div>
  <div class="shop-sub">දුරකථන: ${r}</div>
  <hr class="divider">
  <div class="title">⚠ අඩු තොග වාර්තාව (LOW STOCK)</div>
  <hr class="divider">
  <div class="info-box">
    <span>දිනය: ${a}</span>
  </div>
  <div class="info-box">
    <span>සීමාව: ≤ ${t}</span>
    <span>භාණ්ඩ ගණන: ${e.length}</span>
  </div>
  <hr class="divider">
  <div class="table-head">
    <span style="width: 26px;">No.</span>
    <span style="flex: 1;">භාණ්ඩය</span>
    <span style="width: 75px; text-align: right;">තොගය</span>
  </div>
  ${o}
  <hr class="divider">
  <div class="footer">මුළු අඩු තොග භාණ්ඩ: ${e.length}</div>
  <div class="footer" style="font-size: 12px; margin-top: 3px;">SmartPOS - ස්තුතියි!</div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`,c=window.open(``,`_blank`,`width=380,height=600`);c?(c.document.write(s),c.document.close()):alert(`Please allow popups for this site to print.`)};(0,M.useEffect)(()=>{P||F?(async()=>{H(!0);try{let e=0,t=0,n=[],r={};try{let i=await g(h(w,`items`));e=i.size,i.forEach(e=>{let i=e.data();r[e.id]=i,i.name&&(r[i.name]=i),i.stock<=50&&(t++,n.push({id:e.id,...i}))}),n.sort((e,t)=>e.stock-t.stock),B(n)}catch(e){console.warn(`Could not fetch items:`,e)}let i=0,a=0,o=[];try{let e=ne(),t=b.fromMillis(e.startMs),n=[];try{n=(await g(v(h(w,`transactions`),ee(`timestamp`,`>=`,t)))).docs.map(e=>({id:e.id,...e.data()}))}catch(e){console.warn(`Targeted today query failed, trying recent limit fallback:`,e),n=(await g(v(h(w,`transactions`),_(`timestamp`,`desc`),x(100)))).docs.map(e=>({id:e.id,...e.data()})).filter(e=>T(e.timestamp||e.date))}n.forEach(e=>{let t=Number(e.total)||0;if(e.timestamp?.seconds&&O(e.timestamp.seconds),T(e.timestamp||e.date)){i+=t;let n=0;e.items&&Array.isArray(e.items)&&e.items.forEach(e=>{let t=r[e.id]||r[e.name],i=t&&Number(t.purchasePrice)||0;n+=(Number(e.quantity)||0)*i}),a+=t-n}});try{o=(await g(v(h(w,`transactions`),_(`timestamp`,`desc`),x(5)))).docs.map(e=>({id:e.id,...e.data()}))}catch{o=[...n].sort((e,t)=>(D(t.timestamp||t.date)?.getTime()||0)-(D(e.timestamp||e.date)?.getTime()||0)).slice(0,5)}}catch(e){console.warn(`Could not fetch transactions:`,e)}R(o);let s=0,c=0;try{s=(await g(h(w,`users`))).size}catch(e){console.warn(`Could not fetch users:`,e)}try{c=(await g(h(w,`debtors`))).size}catch(e){console.warn(`Could not fetch debtors:`,e)}ie({todaySales:i,todayProfit:a,totalItems:e,totalUsers:s,totalSales:i,totalDebtors:c,lowStockCount:t})}catch(e){console.error(`Dashboard data error:`,e)}finally{H(!1)}})():H(!1)},[P,F]);let le=async()=>{if(window.confirm(`⚠️ ඔබට සියලුම බිල්පත් සහ විකුණුම් ගනුදෙනු පමණක් (Bills & Transactions only) මකා දැමීමට අවශ්‍යද?

භාණ්ඩ ලැයිස්තුව (Inventory) හෝ ණයගැතියන් (Debtors) මකා නොදැමේ.`)){if(prompt(`කරුණාකර Master Password එක ඇතුළත් කරන්න:`)!==`723412641`){alert(`වැරදි මුරපදයක් (Incorrect password). ක්‍රියාවලිය අවලංගු විය.`);return}H(!0);try{let e=[`transactions`,`reloads`,`millingRecords`,`cashSessions`],t=0;for(let n of e){let e=await g(h(w,n));for(let r of e.docs)await S(C(w,n,r.id)),t++}await y(C(w,`counters`,`billNumber`),{current:1}),alert(`බිල්පත් සහ ගනුදෙනු සියල්ල සාර්ථකව මකා දමන ලදී! (${t} records deleted). බිල් අංකය #000001 ලෙස Reset විය.`),window.location.reload()}catch(e){console.error(e),alert(`Failed to clear bills: `+e.message)}finally{H(!1)}}},$=async()=>{if(window.confirm(`🚨 ARE YOU SURE YOU WANT TO DELETE ALL TESTING DATA?
This will completely wipe all inventory items, debtors, orders, and sales transactions permanently!`)){if(prompt(`Please enter the Master Password to confirm:`)!==`7334126411`){alert(`Incorrect password. Operation cancelled.`);return}H(!0);try{let e=[`items`,`debtors`,`orders`,`transactions`,`reloads`,`millingRecords`,`cashSessions`],t=0;for(let n of e){let e=await g(h(w,n));for(let r of e.docs)await S(C(w,n,r.id)),t++}await y(C(w,`counters`,`billNumber`),{current:1}),alert(`All testing data cleared successfully! (${t} items deleted).`),window.location.reload()}catch(e){console.error(e),alert(`Failed to clear data: `+e.message)}finally{H(!1)}}},ue=[{icon:(0,N.jsx)(n,{}),label:e(`dashboard.todaySales`),value:`Rs. ${I.todaySales.toFixed(2)}`,color:`purple`},{icon:(0,N.jsx)(c,{}),label:`Today's Profit`,value:`Rs. ${I.todayProfit.toFixed(2)}`,color:`green`},{icon:(0,N.jsx)(i,{}),label:e(`dashboard.totalItems`),value:String(I.totalItems),color:`cyan`},{icon:(0,N.jsx)(u,{}),label:e(`dashboard.totalUsers`),value:String(I.totalUsers),color:`green`},{icon:(0,N.jsx)(d,{}),label:e(`reports.lowStock`),value:String(I.lowStockCount),color:`red`,onClick:()=>W(!0)}],de=[{icon:(0,N.jsx)(n,{}),label:e(`dashboard.todaySales`),value:`Rs. ${I.todaySales.toFixed(2)}`,color:`purple`},{icon:(0,N.jsx)(c,{}),label:`Today's Profit`,value:`Rs. ${I.todayProfit.toFixed(2)}`,color:`green`},{icon:(0,N.jsx)(i,{}),label:e(`dashboard.totalItems`),value:String(I.totalItems),color:`cyan`},{icon:(0,N.jsx)(u,{}),label:e(`dashboard.totalDebtors`),value:String(I.totalDebtors),color:`green`},{icon:(0,N.jsx)(d,{}),label:e(`reports.lowStock`),value:String(I.lowStockCount),color:`red`,onClick:()=>W(!0)}],fe=P?ue:de,pe=e=>E(e);return(0,N.jsxs)(`div`,{className:`dashboard-page fade-in`,children:[(0,N.jsxs)(`div`,{className:`dashboard-header`,children:[(0,N.jsx)(`h1`,{className:`dashboard-title`,children:e(`dashboard.welcome`,{name:p?.name||`User`})}),(0,N.jsx)(`p`,{className:`dashboard-role-badge`,children:p?.role?e(`auth.${p.role}`):``})]}),(P||F)&&(0,N.jsx)(`div`,{className:`stats-grid`,children:fe.map((e,t)=>(0,N.jsxs)(A,{className:`stat-card stat-${e.color}`,onClick:e.onClick,style:{cursor:e.onClick?`pointer`:`default`},children:[(0,N.jsx)(`div`,{className:`stat-icon`,children:e.icon}),(0,N.jsxs)(`div`,{className:`stat-info`,children:[(0,N.jsx)(`p`,{className:`stat-value`,children:V?`...`:e.value}),(0,N.jsx)(`p`,{className:`stat-label`,children:e.label})]})]},t))}),(0,N.jsxs)(`div`,{className:`dashboard-section`,children:[(0,N.jsx)(`h2`,{className:`section-heading`,children:e(`dashboard.quickActions`)}),(0,N.jsxs)(`div`,{className:`quick-actions-grid`,children:[F&&(0,N.jsxs)(N.Fragment,{children:[(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/sales`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🛒`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`sales.newSale`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/items`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`📦`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`items.addItem`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/reports`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`📊`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`sales.dailyReport`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/debtors`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`👤`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`debtors.addDebtor`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/orders`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🛍️`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`nav.orders`)})]})]}),P&&(0,N.jsxs)(N.Fragment,{children:[(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/users`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`👥`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`users.addUser`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/inventory`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`📦`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`nav.inventory`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/reports`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`📈`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`nav.reports`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/sales`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🛒`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`sales.newSale`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/orders`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🛍️`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`nav.orders`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,style:{borderColor:`#f59e0b`},onClick:le,title:`බිල්පත් සහ විකුණුම් ගනුදෙනු පමණක් මකන්න`,children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🧾`}),(0,N.jsx)(`span`,{className:`action-label`,style:{color:`#d97706`,fontWeight:700},children:`Clear Bills Only`})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,style:{borderColor:`var(--error-400)`},onClick:$,title:`සියලුම දත්ත මකන්න`,children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🚨`}),(0,N.jsx)(`span`,{className:`action-label text-error`,children:`Clear All Data`})]})]}),re&&(0,N.jsxs)(N.Fragment,{children:[(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/search`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🔍`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`nav.search`)})]}),(0,N.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/orders`),children:[(0,N.jsx)(`span`,{className:`action-emoji`,children:`🛍️`}),(0,N.jsx)(`span`,{className:`action-label`,children:e(`nav.orders`)})]})]})]})]}),(P||F)&&(0,N.jsxs)(`div`,{className:`dashboard-section`,children:[(0,N.jsx)(`h2`,{className:`section-heading`,children:e(`dashboard.recentSales`)}),(0,N.jsx)(A,{hover:!1,className:`recent-sales-card`,children:L.length>0?(0,N.jsx)(`div`,{className:`recent-txn-list`,children:L.map(e=>(0,N.jsxs)(`div`,{className:`recent-txn-item`,children:[(0,N.jsx)(`div`,{className:`txn-icon-wrap`,children:(0,N.jsx)(f,{})}),(0,N.jsxs)(`div`,{className:`txn-details`,children:[(0,N.jsx)(`span`,{className:`txn-items-text`,children:e.items?.map(e=>e.name).join(`, `)||`Transaction`}),(0,N.jsxs)(`span`,{className:`txn-time`,children:[(0,N.jsx)(l,{}),` `,pe(e.timestamp)]})]}),(0,N.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`},children:[(0,N.jsxs)(`div`,{className:`txn-amount-badge`,children:[`Rs. `,Number(e.total||0).toFixed(2)]}),(0,N.jsxs)(`button`,{type:`button`,onClick:()=>Q(e),title:`බිල්පත බලන්න (View Bill)`,style:{display:`inline-flex`,alignItems:`center`,gap:`4px`,padding:`4px 8px`,fontSize:`11.5px`,fontWeight:700,borderRadius:`6px`,border:`1px solid rgba(139, 92, 246, 0.35)`,background:`rgba(139, 92, 246, 0.12)`,color:`#8b5cf6`,cursor:`pointer`,whiteSpace:`nowrap`},children:[(0,N.jsx)(o,{}),` Bill`]})]})]},e.id))}):(0,N.jsxs)(`div`,{className:`empty-state`,children:[(0,N.jsx)(`span`,{className:`empty-icon`,children:`📋`}),(0,N.jsx)(`p`,{children:e(`common.noData`)})]})})]}),(0,N.jsx)(k,{isOpen:U,onClose:()=>{W(!1),K(``),J(`සියල්ල`)},title:(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(d,{className:`text-error`,style:{display:`inline`,marginRight:`8px`}}),e(`dashboard.lowStockItems`)]}),children:(()=>{let t=z.filter(e=>e.stock<=X),n=[`සියල්ල`,...Array.from(new Set(t.map(e=>e.category).filter(Boolean))).sort()],r=t.filter(e=>{let t=q===`සියල්ල`||e.category===q,n=G.trim().toLowerCase(),r=!n||e.name?.toLowerCase().includes(n)||e.category?.toLowerCase().includes(n);return t&&r});return Y===`stock-asc`?r=[...r].sort((e,t)=>e.stock-t.stock):Y===`stock-desc`?r=[...r].sort((e,t)=>t.stock-e.stock):Y===`name`?r=[...r].sort((e,t)=>(e.name||``).localeCompare(t.name||``)):Y===`category`&&(r=[...r].sort((e,t)=>(e.category||``).localeCompare(t.category||``))),(0,N.jsxs)(N.Fragment,{children:[(0,N.jsxs)(`div`,{className:`low-stock-modal-header`,children:[(0,N.jsxs)(`div`,{className:`low-stock-top-row`,children:[(0,N.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8,flexWrap:`wrap`},children:[(0,N.jsxs)(`h3`,{style:{margin:0,fontSize:`var(--fs-sm)`,color:`var(--text-secondary)`,fontWeight:500},children:[r.length,` / `,z.length,` items`]}),(0,N.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:6,fontSize:`var(--fs-xs)`,color:`var(--text-muted)`,background:`var(--bg-surface)`,border:`1px solid var(--border-color)`,borderRadius:`var(--radius-md)`,padding:`4px 10px`},children:[`Stock ≤`,(0,N.jsx)(`input`,{type:`number`,min:0,max:200,value:X,onChange:e=>oe(Number(e.target.value)||0),style:{width:42,background:`transparent`,border:`none`,outline:`none`,color:`var(--primary-400)`,fontWeight:700,fontSize:13,textAlign:`center`}})]})]}),(0,N.jsxs)(`div`,{style:{display:`flex`,gap:8,alignItems:`center`,flexWrap:`wrap`},children:[(0,N.jsxs)(`div`,{className:`low-stock-search-wrapper`,children:[(0,N.jsx)(s,{className:`low-stock-search-icon`}),(0,N.jsx)(`input`,{className:`low-stock-search-input`,type:`text`,placeholder:`භාණ්ඩය සොයන්න...`,value:G,onChange:e=>K(e.target.value)})]}),(0,N.jsxs)(`select`,{className:`low-stock-sort-select`,value:Y,onChange:e=>ae(e.target.value),children:[(0,N.jsx)(`option`,{value:`stock-asc`,children:`Stock: අඩු → වැඩි`}),(0,N.jsx)(`option`,{value:`stock-desc`,children:`Stock: වැඩි → අඩු`}),(0,N.jsx)(`option`,{value:`name`,children:`නම (A-Z)`}),(0,N.jsx)(`option`,{value:`category`,children:`කාණ්ඩය`})]}),(0,N.jsxs)(`button`,{className:`icon-btn-text`,onClick:()=>ce(r,X),title:`80mm Printer ලෙස Print කරන්න`,children:[(0,N.jsx)(a,{}),` Print Bill`]})]})]}),(0,N.jsx)(`div`,{className:`low-stock-category-bar`,children:n.map(e=>{let n=e===`සියල්ල`?t.length:t.filter(t=>t.category===e).length;return(0,N.jsxs)(`button`,{className:`category-pill${q===e?` active`:``}`,onClick:()=>J(e),children:[e,(0,N.jsx)(`span`,{className:`category-pill-count`,children:n})]},e)})})]}),(0,N.jsxs)(`div`,{ref:se,className:`print-container`,style:{maxHeight:`52vh`,overflowY:`auto`},children:[(0,N.jsx)(`style`,{type:`text/css`,media:`print`,children:`
                    @page { size: auto; margin: 20mm; }
                    .print-header { display: block !important; margin-bottom: 20px; }
                    .print-header h2 { font-size: 24px; margin-bottom: 5px; color: #000; }
                    .print-header p { font-size: 14px; color: #666; }
                    .dashboard-table { width: 100%; border-collapse: collapse; }
                    .dashboard-table th, .dashboard-table td { border: 1px solid #ddd; padding: 12px; text-align: left; color: #000; }
                    .dashboard-table th { background-color: #f5f5f5; font-weight: bold; }
                    .stock-badge { color: #d32f2f; font-weight: bold; }
                  `}),(0,N.jsxs)(`div`,{className:`print-header`,style:{display:`none`},children:[(0,N.jsxs)(`h2`,{children:[e(`dashboard.lowStockItems`),` Report`]}),(0,N.jsxs)(`p`,{children:[`Generated on `,new Date().toLocaleString()]})]}),r.length>0?(0,N.jsx)(`div`,{className:`table-responsive`,children:(0,N.jsxs)(`table`,{className:`dashboard-table`,children:[(0,N.jsx)(`thead`,{children:(0,N.jsxs)(`tr`,{children:[(0,N.jsx)(`th`,{style:{width:55},children:`No.`}),(0,N.jsx)(`th`,{children:e(`inventory.table.item`)}),(0,N.jsx)(`th`,{children:e(`inventory.table.category`)}),(0,N.jsx)(`th`,{style:{textAlign:`right`},children:e(`inventory.table.stock`)})]})}),(0,N.jsx)(`tbody`,{children:r.map(e=>(0,N.jsxs)(`tr`,{style:e.stock===0?{background:`rgba(239,68,68,0.04)`}:{},children:[(0,N.jsxs)(`td`,{className:`font-bold text-secondary`,style:{fontSize:13},children:[`#`,e.itemNo||`-`]}),(0,N.jsx)(`td`,{className:`font-medium`,children:e.name}),(0,N.jsx)(`td`,{style:{color:`var(--text-muted)`,fontSize:12},children:e.category||`—`}),(0,N.jsx)(`td`,{style:{textAlign:`right`},children:(0,N.jsx)(`span`,{className:`stock-badge low-stock${e.stock===0?` sold-badge hot`:``}`,children:e.stock===0?`🚫 0 ඉතිරි නෑ`:`${e.stock} ඉතිරිව ඇත`})})]},e.id))})]})}):(0,N.jsxs)(`div`,{className:`empty-state`,children:[(0,N.jsx)(`span`,{className:`empty-icon`,children:`📦`}),(0,N.jsx)(`p`,{children:`ගැළපෙන භාණ්ඩ නෑ`})]})]})]})})()}),(0,N.jsx)(j,{isOpen:!!Z,onClose:()=>Q(null),billData:Z})]})}export{P as default};