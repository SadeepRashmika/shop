import{r as e}from"./rolldown-runtime-Dw2cE7zH.js";import{p as t}from"./vendor-charts-Df5dl7RP.js";import{H as n,K as r,R as i,Y as a,b as o,g as s,ht as c,p as l,pt as ee,r as u,rt as d,st as f,wt as p}from"./vendor-react-D-Mox_yD.js";import{a as m,d as h,g,h as _,r as v}from"./vendor-firebase-CBVw67uI.js";import{n as y}from"./firebase-DfSrwm7h.js";import{n as b}from"./AuthContext-uKQVM9ap.js";import{d as x,f as S,i as C,t as w,u as T}from"./index-DUDeRMM-.js";import"./Button-uYfzPKMR.js";import{t as E}from"./Modal-CBRcU_Fz.js";import{t as D}from"./Card-DS06MGzg.js";import"./receiptService-BPwdP-BS.js";import{t as O}from"./BillModal-DJJpF-cp.js";var k=e(t(),1),A=c();function j(){let{t:e}=ee(),t=p(),{userData:c,isOwner:j,isCashier:M,isCustomer:N}=b(),[P,F]=(0,k.useState)({todaySales:0,todayProfit:0,totalItems:0,totalUsers:0,totalSales:0,totalDebtors:0,lowStockCount:0}),[I,L]=(0,k.useState)([]),[R,z]=(0,k.useState)([]),[B,V]=(0,k.useState)(!0),[H,U]=(0,k.useState)(!1),[W,G]=(0,k.useState)(``),[K,q]=(0,k.useState)(`සියල්ල`),[J,Y]=(0,k.useState)(`stock-asc`),[X,Z]=(0,k.useState)(5),[Q,$]=(0,k.useState)(null),te=(0,k.useRef)(),ne=(e,t)=>{let n=`සුමින්ද ස්ටෝර්ස්`,r=`0777640334`,i=`සුමින්ද ස්ටෝර්ස්, තලහගම, මාකදුර`;try{let e=localStorage.getItem(`smartpos_settings`);if(e){let t=JSON.parse(e);n=t.shopName||n,r=t.shopPhone||r,i=t.shopAddress||i}}catch{}let a=new Date().toLocaleString(`en-LK`),o=e.map((e,t)=>{let n=Number(e.stock)||0,r=n<=0,i=r?`0 (ඉවරයි)`:`${n%1==0?n:n.toFixed(2)} ${e.itemType===`weighed`?`kg`:``}`;return`
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 15px;
      font-weight: 800;
      color: #000000;
      background: #ffffff;
      width: 78mm;
      padding: 3mm 2mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .shop-name { 
      font-size: 21px; 
      font-weight: 900; 
      text-align: center; 
      margin-bottom: 3px; 
      color: #000000;
      letter-spacing: 0.5px;
    }
    .shop-sub { 
      font-size: 13.5px; 
      font-weight: 800; 
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
      font-size: 16px; 
      font-weight: 900; 
      text-align: center; 
      margin: 5px 0; 
      letter-spacing: 0.5px;
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
</html>`,c=window.open(``,`_blank`,`width=380,height=600`);c?(c.document.write(s),c.document.close()):alert(`Please allow popups for this site to print.`)};(0,k.useEffect)(()=>{let e=async()=>{V(!0);try{let e=0,t=0,n=[],r={};try{let i=await m(_(y,`items`));e=i.size,i.forEach(e=>{let i=e.data();r[e.id]=i,i.name&&(r[i.name]=i),i.stock<=50&&(t++,n.push({id:e.id,...i}))}),n.sort((e,t)=>e.stock-t.stock),z(n)}catch(e){console.warn(`Could not fetch items:`,e)}let i=0,a=0,o=0,s=[];try{(await m(_(y,`transactions`))).forEach(e=>{let t=e.data(),n=t.total||0;if(o+=n,s.push({id:e.id,...t}),t.timestamp?.seconds&&w(t.timestamp.seconds),T(t.timestamp||t.date)){i+=n;let e=0;t.items&&t.items.forEach(t=>{let n=r[t.id]||r[t.name],i=n&&Number(n.purchasePrice)||0;e+=(Number(t.quantity)||0)*i}),a+=n-e}})}catch(e){console.warn(`Could not fetch transactions:`,e)}s.sort((e,t)=>(S(t.timestamp||t.date)?.getTime()||0)-(S(e.timestamp||e.date)?.getTime()||0)),L(s.slice(0,5));let c=0,l=0;try{c=(await m(_(y,`users`))).size}catch(e){console.warn(`Could not fetch users:`,e)}try{l=(await m(_(y,`debtors`))).size}catch(e){console.warn(`Could not fetch debtors:`,e)}F({todaySales:i,todayProfit:a,totalItems:e,totalUsers:c,totalSales:o,totalDebtors:l,lowStockCount:t})}catch(e){console.error(`Dashboard data error:`,e)}finally{V(!1)}};return j||M?e():V(!1),x(()=>{(j||M)&&e()})},[j,M]);let re=async()=>{if(window.confirm(`⚠️ ඔබට සියලුම බිල්පත් සහ විකුණුම් ගනුදෙනු පමණක් (Bills & Transactions only) මකා දැමීමට අවශ්‍යද?

භාණ්ඩ ලැයිස්තුව (Inventory) හෝ ණයගැතියන් (Debtors) මකා නොදැමේ.`)){if(prompt(`කරුණාකර Master Password එක ඇතුළත් කරන්න:`)!==`723412641`){alert(`වැරදි මුරපදයක් (Incorrect password). ක්‍රියාවලිය අවලංගු විය.`);return}V(!0);try{let e=[`transactions`,`reloads`,`millingRecords`,`cashSessions`],t=0;for(let n of e){let e=await m(_(y,n));for(let r of e.docs)await v(g(y,n,r.id)),t++}await h(g(y,`counters`,`billNumber`),{current:1}),alert(`බිල්පත් සහ ගනුදෙනු සියල්ල සාර්ථකව මකා දමන ලදී! (${t} records deleted). බිල් අංකය #000001 ලෙස Reset විය.`),window.location.reload()}catch(e){console.error(e),alert(`Failed to clear bills: `+e.message)}finally{V(!1)}}},ie=async()=>{if(window.confirm(`🚨 ARE YOU SURE YOU WANT TO DELETE ALL TESTING DATA?
This will completely wipe all inventory items, debtors, orders, and sales transactions permanently!`)){if(prompt(`Please enter the Master Password to confirm:`)!==`7334126411`){alert(`Incorrect password. Operation cancelled.`);return}V(!0);try{let e=[`items`,`debtors`,`orders`,`transactions`,`reloads`,`millingRecords`,`cashSessions`],t=0;for(let n of e){let e=await m(_(y,n));for(let r of e.docs)await v(g(y,n,r.id)),t++}await h(g(y,`counters`,`billNumber`),{current:1}),alert(`All testing data cleared successfully! (${t} items deleted).`),window.location.reload()}catch(e){console.error(e),alert(`Failed to clear data: `+e.message)}finally{V(!1)}}},ae=[{icon:(0,A.jsx)(a,{}),label:e(`dashboard.todaySales`),value:`Rs. ${P.todaySales.toFixed(2)}`,color:`purple`},{icon:(0,A.jsx)(d,{}),label:`Today's Profit`,value:`Rs. ${P.todayProfit.toFixed(2)}`,color:`green`},{icon:(0,A.jsx)(i,{}),label:e(`dashboard.totalItems`),value:String(P.totalItems),color:`cyan`},{icon:(0,A.jsx)(f,{}),label:e(`dashboard.totalUsers`),value:String(P.totalUsers),color:`green`},{icon:(0,A.jsx)(u,{}),label:e(`reports.lowStock`),value:String(P.lowStockCount),color:`red`,onClick:()=>U(!0)}],oe=[{icon:(0,A.jsx)(a,{}),label:e(`dashboard.todaySales`),value:`Rs. ${P.todaySales.toFixed(2)}`,color:`purple`},{icon:(0,A.jsx)(d,{}),label:`Today's Profit`,value:`Rs. ${P.todayProfit.toFixed(2)}`,color:`green`},{icon:(0,A.jsx)(i,{}),label:e(`dashboard.totalItems`),value:String(P.totalItems),color:`cyan`},{icon:(0,A.jsx)(f,{}),label:e(`dashboard.totalDebtors`),value:String(P.totalDebtors),color:`green`},{icon:(0,A.jsx)(u,{}),label:e(`reports.lowStock`),value:String(P.lowStockCount),color:`red`,onClick:()=>U(!0)}],se=j?ae:oe,ce=e=>C(e);return(0,A.jsxs)(`div`,{className:`dashboard-page fade-in`,children:[(0,A.jsxs)(`div`,{className:`dashboard-header`,children:[(0,A.jsx)(`h1`,{className:`dashboard-title`,children:e(`dashboard.welcome`,{name:c?.name||`User`})}),(0,A.jsx)(`p`,{className:`dashboard-role-badge`,children:c?.role?e(`auth.${c.role}`):``})]}),(j||M)&&(0,A.jsx)(`div`,{className:`stats-grid`,children:se.map((e,t)=>(0,A.jsxs)(D,{className:`stat-card stat-${e.color}`,onClick:e.onClick,style:{cursor:e.onClick?`pointer`:`default`},children:[(0,A.jsx)(`div`,{className:`stat-icon`,children:e.icon}),(0,A.jsxs)(`div`,{className:`stat-info`,children:[(0,A.jsx)(`p`,{className:`stat-value`,children:B?`...`:e.value}),(0,A.jsx)(`p`,{className:`stat-label`,children:e.label})]})]},t))}),(0,A.jsxs)(`div`,{className:`dashboard-section`,children:[(0,A.jsx)(`h2`,{className:`section-heading`,children:e(`dashboard.quickActions`)}),(0,A.jsxs)(`div`,{className:`quick-actions-grid`,children:[M&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/sales`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🛒`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`sales.newSale`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/items`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`📦`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`items.addItem`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/reports`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`📊`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`sales.dailyReport`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/debtors`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`👤`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`debtors.addDebtor`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/orders`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🛍️`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`nav.orders`)})]})]}),j&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/users`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`👥`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`users.addUser`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/inventory`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`📦`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`nav.inventory`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/reports`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`📈`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`nav.reports`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/sales`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🛒`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`sales.newSale`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/orders`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🛍️`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`nav.orders`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,style:{borderColor:`#f59e0b`},onClick:re,title:`බිල්පත් සහ විකුණුම් ගනුදෙනු පමණක් මකන්න`,children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🧾`}),(0,A.jsx)(`span`,{className:`action-label`,style:{color:`#d97706`,fontWeight:700},children:`Clear Bills Only`})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,style:{borderColor:`var(--error-400)`},onClick:ie,title:`සියලුම දත්ත මකන්න`,children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🚨`}),(0,A.jsx)(`span`,{className:`action-label text-error`,children:`Clear All Data`})]})]}),N&&(0,A.jsxs)(A.Fragment,{children:[(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/search`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🔍`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`nav.search`)})]}),(0,A.jsxs)(`div`,{className:`action-card glass-card`,onClick:()=>t(`/orders`),children:[(0,A.jsx)(`span`,{className:`action-emoji`,children:`🛍️`}),(0,A.jsx)(`span`,{className:`action-label`,children:e(`nav.orders`)})]})]})]})]}),(j||M)&&(0,A.jsxs)(`div`,{className:`dashboard-section`,children:[(0,A.jsx)(`h2`,{className:`section-heading`,children:e(`dashboard.recentSales`)}),(0,A.jsx)(D,{hover:!1,className:`recent-sales-card`,children:I.length>0?(0,A.jsx)(`div`,{className:`recent-txn-list`,children:I.map(e=>(0,A.jsxs)(`div`,{className:`recent-txn-item`,children:[(0,A.jsx)(`div`,{className:`txn-icon-wrap`,children:(0,A.jsx)(s,{})}),(0,A.jsxs)(`div`,{className:`txn-details`,children:[(0,A.jsx)(`span`,{className:`txn-items-text`,children:e.items?.map(e=>e.name).join(`, `)||`Transaction`}),(0,A.jsxs)(`span`,{className:`txn-time`,children:[(0,A.jsx)(l,{}),` `,ce(e.timestamp)]})]}),(0,A.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`},children:[(0,A.jsxs)(`div`,{className:`txn-amount-badge`,children:[`Rs. `,Number(e.total||0).toFixed(2)]}),(0,A.jsxs)(`button`,{type:`button`,onClick:()=>$(e),title:`බිල්පත බලන්න (View Bill)`,style:{display:`inline-flex`,alignItems:`center`,gap:`4px`,padding:`4px 8px`,fontSize:`11.5px`,fontWeight:700,borderRadius:`6px`,border:`1px solid rgba(139, 92, 246, 0.35)`,background:`rgba(139, 92, 246, 0.12)`,color:`#8b5cf6`,cursor:`pointer`,whiteSpace:`nowrap`},children:[(0,A.jsx)(o,{}),` Bill`]})]})]},e.id))}):(0,A.jsxs)(`div`,{className:`empty-state`,children:[(0,A.jsx)(`span`,{className:`empty-icon`,children:`📋`}),(0,A.jsx)(`p`,{children:e(`common.noData`)})]})})]}),(0,A.jsx)(E,{isOpen:H,onClose:()=>{U(!1),G(``),q(`සියල්ල`)},title:(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)(u,{className:`text-error`,style:{display:`inline`,marginRight:`8px`}}),e(`dashboard.lowStockItems`)]}),children:(()=>{let t=R.filter(e=>e.stock<=X),i=[`සියල්ල`,...Array.from(new Set(t.map(e=>e.category).filter(Boolean))).sort()],a=t.filter(e=>{let t=K===`සියල්ල`||e.category===K,n=W.trim().toLowerCase(),r=!n||e.name?.toLowerCase().includes(n)||e.category?.toLowerCase().includes(n);return t&&r});return J===`stock-asc`?a=[...a].sort((e,t)=>e.stock-t.stock):J===`stock-desc`?a=[...a].sort((e,t)=>t.stock-e.stock):J===`name`?a=[...a].sort((e,t)=>(e.name||``).localeCompare(t.name||``)):J===`category`&&(a=[...a].sort((e,t)=>(e.category||``).localeCompare(t.category||``))),(0,A.jsxs)(A.Fragment,{children:[(0,A.jsxs)(`div`,{className:`low-stock-modal-header`,children:[(0,A.jsxs)(`div`,{className:`low-stock-top-row`,children:[(0,A.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8,flexWrap:`wrap`},children:[(0,A.jsxs)(`h3`,{style:{margin:0,fontSize:`var(--fs-sm)`,color:`var(--text-secondary)`,fontWeight:500},children:[a.length,` / `,R.length,` items`]}),(0,A.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:6,fontSize:`var(--fs-xs)`,color:`var(--text-muted)`,background:`var(--bg-surface)`,border:`1px solid var(--border-color)`,borderRadius:`var(--radius-md)`,padding:`4px 10px`},children:[`Stock ≤`,(0,A.jsx)(`input`,{type:`number`,min:0,max:200,value:X,onChange:e=>Z(Number(e.target.value)||0),style:{width:42,background:`transparent`,border:`none`,outline:`none`,color:`var(--primary-400)`,fontWeight:700,fontSize:13,textAlign:`center`}})]})]}),(0,A.jsxs)(`div`,{style:{display:`flex`,gap:8,alignItems:`center`,flexWrap:`wrap`},children:[(0,A.jsxs)(`div`,{className:`low-stock-search-wrapper`,children:[(0,A.jsx)(r,{className:`low-stock-search-icon`}),(0,A.jsx)(`input`,{className:`low-stock-search-input`,type:`text`,placeholder:`භාණ්ඩය සොයන්න...`,value:W,onChange:e=>G(e.target.value)})]}),(0,A.jsxs)(`select`,{className:`low-stock-sort-select`,value:J,onChange:e=>Y(e.target.value),children:[(0,A.jsx)(`option`,{value:`stock-asc`,children:`Stock: අඩු → වැඩි`}),(0,A.jsx)(`option`,{value:`stock-desc`,children:`Stock: වැඩි → අඩු`}),(0,A.jsx)(`option`,{value:`name`,children:`නම (A-Z)`}),(0,A.jsx)(`option`,{value:`category`,children:`කාණ්ඩය`})]}),(0,A.jsxs)(`button`,{className:`icon-btn-text`,onClick:()=>ne(a,X),title:`80mm Printer ලෙස Print කරන්න`,children:[(0,A.jsx)(n,{}),` Print Bill`]})]})]}),(0,A.jsx)(`div`,{className:`low-stock-category-bar`,children:i.map(e=>{let n=e===`සියල්ල`?t.length:t.filter(t=>t.category===e).length;return(0,A.jsxs)(`button`,{className:`category-pill${K===e?` active`:``}`,onClick:()=>q(e),children:[e,(0,A.jsx)(`span`,{className:`category-pill-count`,children:n})]},e)})})]}),(0,A.jsxs)(`div`,{ref:te,className:`print-container`,style:{maxHeight:`52vh`,overflowY:`auto`},children:[(0,A.jsx)(`style`,{type:`text/css`,media:`print`,children:`
                    @page { size: auto; margin: 20mm; }
                    .print-header { display: block !important; margin-bottom: 20px; }
                    .print-header h2 { font-size: 24px; margin-bottom: 5px; color: #000; }
                    .print-header p { font-size: 14px; color: #666; }
                    .dashboard-table { width: 100%; border-collapse: collapse; }
                    .dashboard-table th, .dashboard-table td { border: 1px solid #ddd; padding: 12px; text-align: left; color: #000; }
                    .dashboard-table th { background-color: #f5f5f5; font-weight: bold; }
                    .stock-badge { color: #d32f2f; font-weight: bold; }
                  `}),(0,A.jsxs)(`div`,{className:`print-header`,style:{display:`none`},children:[(0,A.jsxs)(`h2`,{children:[e(`dashboard.lowStockItems`),` Report`]}),(0,A.jsxs)(`p`,{children:[`Generated on `,new Date().toLocaleString()]})]}),a.length>0?(0,A.jsx)(`div`,{className:`table-responsive`,children:(0,A.jsxs)(`table`,{className:`dashboard-table`,children:[(0,A.jsx)(`thead`,{children:(0,A.jsxs)(`tr`,{children:[(0,A.jsx)(`th`,{style:{width:55},children:`No.`}),(0,A.jsx)(`th`,{children:e(`inventory.table.item`)}),(0,A.jsx)(`th`,{children:e(`inventory.table.category`)}),(0,A.jsx)(`th`,{style:{textAlign:`right`},children:e(`inventory.table.stock`)})]})}),(0,A.jsx)(`tbody`,{children:a.map(e=>(0,A.jsxs)(`tr`,{style:e.stock===0?{background:`rgba(239,68,68,0.04)`}:{},children:[(0,A.jsxs)(`td`,{className:`font-bold text-secondary`,style:{fontSize:13},children:[`#`,e.itemNo||`-`]}),(0,A.jsx)(`td`,{className:`font-medium`,children:e.name}),(0,A.jsx)(`td`,{style:{color:`var(--text-muted)`,fontSize:12},children:e.category||`—`}),(0,A.jsx)(`td`,{style:{textAlign:`right`},children:(0,A.jsx)(`span`,{className:`stock-badge low-stock${e.stock===0?` sold-badge hot`:``}`,children:e.stock===0?`🚫 0 ඉතිරි නෑ`:`${e.stock} ඉතිරිව ඇත`})})]},e.id))})]})}):(0,A.jsxs)(`div`,{className:`empty-state`,children:[(0,A.jsx)(`span`,{className:`empty-icon`,children:`📦`}),(0,A.jsx)(`p`,{children:`ගැළපෙන භාණ්ඩ නෑ`})]})]})]})})()}),(0,A.jsx)(O,{isOpen:!!Q,onClose:()=>$(null),billData:Q})]})}export{j as default};