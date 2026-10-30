import {renderAppearancePanel,FONT_FAMILIES} from './appearance-v7.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY),root=document.getElementById('app');
let session=null,profile=null,tab='Dashboard',cache={},modal=null,store='Yogurt Studio';
let mobileMenuOpen=false, modalOpener=null, menuOpener=null, closingModal=false;
const tabs=['Dashboard','Inventory','Production','Products','Orders','Calendar','Customers','Expenses','Reports','Settings'];
let reportMonth='all', reportData=null, reportError=null;
const ORDER_PAGE_SIZE=120;let hasOlderOrders=false;
const baseStickerItems=[{id:'mascot',name:'Yogurt ghost',image:'/mascot-transparent.png'},{id:'strawberry',name:'Strawberry',emoji:'🍓'},{id:'blueberry',name:'Blueberry',emoji:'🫐'},{id:'yogurt',name:'Yogurt',emoji:'🥣'},{id:'honey',name:'Honey',emoji:'🍯'}];
let sharedStickerItems=[],sharedNote='',appearanceCloud=false,sharedTemplates=[];
const localTemplates=()=>{try{return JSON.parse(localStorage.getItem('yg_templates_v7')||'[]')}catch{return []}};
let savedThemes=localTemplates(),rotationTimer=null,rotationIndex=0,themeSaveTimer=null;
const fromStorage=(key,fallback)=>{try{let v=localStorage.getItem('yg_'+key);return v===null?fallback:JSON.parse(v)}catch{return fallback}};
const defaultDecor=()=>({visible:false,rotate:false,arrange:false,showNote:false,size:88,opacity:100,interval:12,hidden:[],positions:{}});
const allStickerItems=()=>[...baseStickerItems,...sharedStickerItems];
const themeColors=()=>[...(ui.custom||palettes[ui.palette]||palettes.pistachio)];
const isOwner=()=>profile?.role==='owner';
const randomId=()=>globalThis.crypto?.randomUUID?.()||[1e7,1e3,4e3,8e3,1e11].join('-').replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));

const palettes={
 pistachio:['#56745a','#ecf0e7','#f7f8f4','#ffffff','#303a31','#c78e9b'],
 berry:['#956f7e','#f4e6e9','#fbf7f8','#ffffff','#392d34','#d89eab'],
 blueberry:['#7385aa','#e9ecf5','#f8f9fc','#ffffff','#30364a','#a6b8d7'],
 peach:['#b77e72','#f8e9e2','#fff9f5','#ffffff','#45352f','#e5a48c'],
 matcha:['#667c52','#e8eddd','#f6f8f0','#ffffff','#293b2c','#a5b88a'],
 coffee:['#806654','#eee6df','#faf7f3','#ffffff','#3a302b','#bf9c82'],
 neutral:['#59676a','#edf0f0','#f8f9f9','#ffffff','#293235','#a3b5b4'],
 strawberry:['#bc667c','#f7e8ec','#fff8fa','#ffffff','#442b34','#e9a4b1'],
 mint:['#5f8b80','#e1f0eb','#f6faf8','#ffffff','#253f39','#a7cfc5'],
 lavender:['#8278ab','#eeeafa','#faf9fe','#ffffff','#38334d','#bbafe6']
};

let ui={
 lang:localStorage.getItem('yg_lang')||'en',palette:localStorage.getItem('yg_palette')||'pistachio',
 mode:localStorage.getItem('yg_mode')||'light',font:localStorage.getItem('yg_font')||'system',
 scale:Number(localStorage.getItem('yg_scale')||100),custom:fromStorage('custom',null),
 density:localStorage.getItem('yg_density')||'comfortable',radius:Number(localStorage.getItem('yg_radius')||18),
 shadow:Number(localStorage.getItem('yg_shadow')||35),motion:Number(localStorage.getItem('yg_motion')||100),
 decor:{...defaultDecor(),...fromStorage('decor',{})}
};

const tr={Dashboard:'แดชบอร์ด',Inventory:'วัตถุดิบและสต็อก',Production:'การผลิต',Products:'สินค้าและเมนู',Orders:'คำสั่งซื้อ',Calendar:'ปฏิทิน',Customers:'ลูกค้า',Expenses:'ค่าใช้จ่าย',Reports:'รายงาน',Settings:'ตั้งค่า','Sign out':'ออกจากระบบ','Store preferences':'ข้อมูลร้าน','Appearance & language':'รูปลักษณ์และภาษา','Theme presets':'ชุดสีสำเร็จรูป','Custom colors':'สีที่กำหนดเอง','Light':'โหมดสว่าง','Dark':'โหมดมืด','Save appearance':'บันทึกรูปลักษณ์','Language':'ภาษา','Font':'แบบอักษร','Text size':'ขนาดตัวอักษร','Delete':'ลบ','Cancel order':'ยกเลิกคำสั่งซื้อ','Restore order':'คืนค่าคำสั่งซื้อ','Pistachio Cream':'พิสตาชิโอครีม','Berry Yogurt':'เบอร์รีโยเกิร์ต','Blueberry Milk':'บลูเบอร์รีมิลค์','Peach Blossom':'พีชบลอสซัม','Matcha Latte':'มัทฉะลาเต้','Coffee Cream':'คอฟฟี่ครีม','Neutral':'โทนกลาง'};
const L=x=>ui.lang==='th'?(tr[x]||x):x;
function applyUI(){
 const c=themeColors(),r=document.documentElement;
 ['primary','sidebar','page','card','ink','accent'].forEach((name,i)=>{
  if(/^#[\da-f]{6}$/i.test(c[i]||''))r.style.setProperty('--base-'+name,c[i]);
 });
 const dark=ui.mode==='dark'||(ui.mode==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
 r.dataset.mode=dark?'dark':'light';r.lang=ui.lang;
 r.dataset.density=ui.density==='compact'?'compact':'comfortable';
 document.body.dataset.arranging=ui.decor.arrange?'yes':'no';
 r.style.fontSize=Math.max(85,Math.min(125,ui.scale))+'%';
 r.style.setProperty('--ui-font',FONT_FAMILIES[ui.font]||FONT_FAMILIES.system);
 r.style.setProperty('--radius',Math.max(8,Math.min(28,ui.radius))+'px');
 r.style.setProperty('--shadow-strength',(Math.max(0,Math.min(100,ui.shadow))/100).toFixed(2));
 r.style.setProperty('--shadow-alpha',(Math.max(0,Math.min(100,ui.shadow))*0.0016).toFixed(3));
 r.style.setProperty('--type-scale',(Math.max(85,Math.min(125,ui.scale))/100).toFixed(2));
 r.style.setProperty('--motion-factor',(Math.max(0,Math.min(150,ui.motion))/100).toFixed(2));
 r.style.setProperty('--motion-duration',Math.round(240*Math.max(0,Math.min(150,ui.motion))/100)+'ms');
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#171f1b':c[2]);
 renderFloating();
}
function saveUI(){
 for(let k of ['lang','palette','mode','font','scale','custom','density','radius','shadow','motion','decor']){
  localStorage.setItem('yg_'+k,typeof ui[k]==='object'?JSON.stringify(ui[k]):String(ui[k]));
 }
 applyUI();
}
function floatItems(){return allStickerItems().filter(s=>!ui.decor.hidden.includes(s.id))}
function renderFloating(){
 const layer=document.getElementById('floating-layer');if(!layer)return;
 const shown=ui.decor.visible?floatItems():[];
 const isPhone=window.innerWidth<=760;
 const displaying=(ui.decor.rotate||isPhone&&!ui.decor.arrange)?shown.slice(rotationIndex%Math.max(1,shown.length),(rotationIndex%Math.max(1,shown.length))+1):shown;
 layer.innerHTML=displaying.map((s,i)=>{
   const at=ui.decor.positions[s.id]||{x:isPhone?72:Math.max(3,80-i*8),y:isPhone?75:Math.max(10,67-i*10)};
   const style=`left:${Math.max(1,Math.min(93,Number(at.x)||3))}%;top:${Math.max(3,Math.min(86,Number(at.y)||3))}%;width:${ui.decor.size}px;opacity:${ui.decor.opacity/100}`;
   return `<div class="floating-item" data-float="${esc(s.id)}" style="${style}" tabindex="0" role="img" aria-label="Drag ${esc(s.name)} to reposition">${s.image?`<img draggable="false" src="${esc(s.image)}" alt="${esc(s.name)}">`:`<span>${esc(s.emoji)}</span>`}</div>`
 }).join('')+(ui.decor.visible&&ui.decor.showNote&&sharedNote?`<div class="floating-note">${esc(sharedNote)}</div>`:'');
 clearInterval(rotationTimer);rotationTimer=null;
 if(ui.decor.visible&&ui.decor.rotate&&shown.length>1)rotationTimer=setInterval(()=>{rotationIndex=(rotationIndex+1)%shown.length;renderFloating()},Math.max(4,ui.decor.interval)*1000);
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(ui.mode==='auto')applyUI()});

applyUI();
const money=n=>'฿'+Number(n||0).toLocaleString('en-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const dt=s=>s?new Date(s).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const thaiDay=s=>{if(!s)return '';const z=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(s)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${z.year}-${z.month}-${z.day}`};
const today=()=>thaiDay(new Date());
const val=id=>document.getElementById(id)?.value?.trim()||'';
function toast(s){let e=document.createElement('div');e.className='toast';e.textContent=s;document.body.append(e);setTimeout(()=>e.remove(),4200)}
function fail(e){console.error(e);toast(e?.message||String(e))}
async function query(table,select='*'){
 let q=db.from(table).select(select);
 if(table==='orders')q=q.order('created_at',{ascending:false}).range(0,ORDER_PAGE_SIZE-1);
 if(['order_items','payments','refunds'].includes(table) && loadedTables.has('orders')){
  const ids=cache.orders.map(o=>o.id);
  if(!ids.length)return [];
  q=q.in('order_id',ids);
 }
 const {data,error}=await q;if(error)throw error;
 if(table==='orders')hasOlderOrders=(data||[]).length===ORDER_PAGE_SIZE;
 return data||[];
}
const allTables=['products','customers','orders','order_items','payments','expenses','ingredients','production_batches','inventory_movements','profiles','store_settings','product_cost_items','refunds'];
const updateGroups={product:['products','product_cost_items'],customer:['customers'],ingredient:['ingredients'],batch:['production_batches'],expense:['expenses'],order:['orders','order_items'],payment:['payments','refunds'],adjust:['ingredients','inventory_movements'],'add-item':['order_items'],settings:['store_settings']};
const essentialTables=['profiles','store_settings','orders','order_items','payments','refunds','ingredients'];
const tabTables={Dashboard:['orders','order_items','payments','refunds','ingredients'],Inventory:['ingredients','inventory_movements'],Production:['production_batches','products'],Products:['products','product_cost_items'],Orders:['orders','order_items','payments','refunds','products','customers'],Calendar:['orders','order_items','payments','customers'],Customers:['customers'],Expenses:['expenses'],Reports:[],Settings:['profiles','store_settings']};
const loadedTables=new Set();
for(const table of allTables)cache[table]=[];
async function loadTables(tables=allTables,force=true){
 const unique=[...new Set(tables)].filter(t=>force||!loadedTables.has(t));
 if(!unique.length)return;
 // Fetch order page first, so related rows are bounded to visible orders.
 let errors=[];
 if(unique.includes('orders')){
  try{cache.orders=await query('orders');loadedTables.add('orders');}
  catch(e){errors.push('orders: '+e.message)}
 }
 const rest=unique.filter(t=>t!=='orders');
 const results=await Promise.allSettled(rest.map(x=>query(x)));
 results.forEach((res,i)=>{if(res.status==='fulfilled'){
  cache[rest[i]]=res.value;loadedTables.add(rest[i]);
 }else errors.push(rest[i]+': '+(res.reason?.message||res.reason))});
 store=cache.store_settings?.[0]?.store_name||'Yogurt Studio';
 if(errors.length)throw Error('Could not load '+errors.join('; '));
}
async function loadOlderOrders(){
 if(!hasOlderOrders)return;
 const offset=cache.orders.length;
 const {data,error}=await db.from('orders').select('*').order('created_at',{ascending:false}).range(offset,offset+ORDER_PAGE_SIZE-1);
 if(error)throw error;
 const older=data||[];hasOlderOrders=older.length===ORDER_PAGE_SIZE;
 const ids=older.map(o=>o.id);
 if(!ids.length){render();return}
 const detail=await Promise.all(['order_items','payments','refunds'].map(t=>db.from(t).select('*').in('order_id',ids)));
 for(let i=0;i<detail.length;i++)if(detail[i].error)throw detail[i].error;
 cache.orders.push(...older);
 ['order_items','payments','refunds'].forEach((t,i)=>cache[t].push(...detail[i].data));
 render();
}
async function load(){await loadTables(essentialTables,false)}
async function refresh(tables=allTables){
 await loadTables(tables,true);profile=cache.profiles?.find(p=>p.id===session?.user?.id)||profile||null;render();
}
async function openTab(next){
 await closeDialog(true);closeMobileMenu();
 if(next!==tab){
  const missing=(tabTables[next]||[]).filter(x=>!loadedTables.has(x));
  if(missing.length){
    const region=root.querySelector('.main');
    if(region)region.setAttribute('aria-busy','true');
    try{await loadTables(missing,false)}catch(e){if(region)region.removeAttribute('aria-busy');fail(e);return}
  }
  if(next==='Reports'){try{await fetchReport()}catch(e){reportError=e.message;fail(e)}}
  ui.decor.arrange=false;saveUI();tab=next;render();window.scrollTo({top:0,behavior:'instant'});
 }
}
async function openStore(){
 await load();profile=cache.profiles.find(p=>p.id===session?.user?.id)||null;
 render(); // Dashboard is immediately usable; other tabs load on demand.
 loadAppearanceCloud().catch(e=>console.info('Appearance sync not ready:',e.message));
}

function bootShell(){
 if(root.querySelector('.boot-shell'))return;
 root.innerHTML=`<div class="boot-shell" role="status" aria-label="Opening Yogurt Studio"><aside class="boot-side"><div class="boot-brand"><img src="/mascot-transparent.png" alt=""><b>Yogurt Studio</b></div><div class="boot-skeleton"></div><div class="boot-skeleton"></div><div class="boot-skeleton"></div></aside><main class="boot-main"><div class="boot-eyebrow">STORE MANAGEMENT</div><h1>Welcome back.</h1><p>Preparing your workspace</p><div class="boot-placeholder"><div class="boot-skeleton wide"></div><div class="boot-skeleton wide"></div></div></main></div>`;
}

function showBootError(error){console.error(error);root.innerHTML='<div class="auth"><div class="auth-box"><h2>Unable to load store data</h2><p>'+esc(error?.message||String(error))+'</p><p class="sub">Check your internet connection and Supabase permissions. Your data has not been changed.</p><button class="btn" data-action="retry-load">Retry</button></div></div>'}

function total(o){return Math.max(0,cache.order_items.filter(i=>i.order_id===o.id).reduce((a,i)=>a+Number(i.quantity)*Number(i.unit_price),0)-Number(o.discount||0))}
function paid(o){return cache.payments.filter(p=>p.order_id===o.id).reduce((a,p)=>a+Number(p.amount),0)}
function refunded(o){return (cache.refunds||[]).filter(p=>p.order_id===o.id).reduce((a,p)=>a+Number(p.amount),0)}
function netPaid(o){return paid(o)-refunded(o)}
async function fetchReport(){const {data,error}=await db.rpc('store_finance_summary',{p_month:reportMonth==='all'?null:reportMonth});if(error)throw error;reportData=data;reportError=null}
function cogs(o){return cache.order_items.filter(i=>i.order_id===o.id).reduce((a,i)=>a+Number(i.quantity)*Number(i.unit_cost),0)}
function btn(label,action='new',id=''){return `<button class="btn ${action==='secondary'?'secondary':''}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(label)}</button>`}
function field(label,id,type='text',value='',options=null,wide=false){return `<div class="field ${wide?'wide':''}"><label for="${id}">${esc(label)}</label>${options?`<select id="${id}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="${id}">${esc(value)}</textarea>`:`<input id="${id}" type="${type}" value="${esc(value)}" ${type==='number'?'step="any"':''}>`}</div>`}
const options=(arr,empty=false)=>[...(empty?[['','— None —']]:[]),...arr.map(x=>[x.id,x.name])];
function table(head,rows){return `<div class="table-wrap"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${head.length}" class="empty">No records yet</td></tr>`}</tbody></table></div>`}
function action(label,cmd,id='',cls='secondary'){return `<button class="btn ${cls} small" data-action="${cmd}" data-id="${esc(id)}">${esc(label)}</button>`}
function status(s){return `<span class="pill ${esc(s)}">${esc(s)}</span>`}
const mobilePaths={dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',orders:'<path d="M4 7h16l-1.4 14H5.4L4 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',products:'<path d="M4 7h16v14H4zM3 7l3-4h12l3 4M12 7v14"/>',reports:'<path d="M4 20V12m5 8V5m5 15v-9m5 9V8"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
function mobileIcon(name){return '<svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(mobilePaths[name]||mobilePaths.menu)+'</svg>'}
function annotateMobileTables(){root.querySelectorAll('.table-wrap table').forEach(table=>{const labels=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());table.querySelectorAll('tbody tr').forEach(tr=>{[...tr.children].forEach((cell,i)=>{if(cell.tagName==='TD'&&!cell.classList.contains('empty'))cell.dataset.label=labels[i]||''})})})}
function showMobileMenu(){if(modal)return;const target=root.querySelector('#mobile-drawer-root');if(!target)return;if(mobileMenuOpen){closeMobileMenu();return}menuOpener=document.activeElement;mobileMenuOpen=true;target.innerHTML=`<div class="mobile-drawer-back"><aside class="mobile-drawer" role="dialog" aria-modal="true" aria-label="Store navigation"><div class="drawer-head"><div><strong>${esc(store)}</strong><span>${ui.lang==='th'?'เลือกหน้า':'Choose a page'}</span></div><button class="drawer-close" data-action="toggle-menu" aria-label="Close menu">&times;</button></div><div class="drawer-list">${tabs.map(t=>`<button class="drawer-link ${t===tab?'active':''}" data-tab="${t}"><span>${esc(L(t))}</span>${t===tab?'<span aria-hidden="true">✓</span>':''}</button>`).join('')}</div><div class="drawer-foot"><div class="sub">${esc(profile?.email||'')}</div><button class="btn secondary" data-action="logout">${esc(L('Sign out'))}</button></div></aside></div>`;document.body.classList.add('menu-open');target.querySelector('.drawer-close')?.focus({preventScroll:true})}
function closeMobileMenu(){mobileMenuOpen=false;document.body.classList.remove('menu-open');const target=root.querySelector('#mobile-drawer-root');if(target)target.innerHTML='';if(menuOpener?.isConnected)menuOpener.focus({preventScroll:true});menuOpener=null}
function mountDialog(){const target=root.querySelector('#overlay-root');if(!target||!modal)return;closingModal=false;closeMobileMenu();modalOpener=document.activeElement;target.innerHTML=modal;document.body.classList.add('overlay-open');requestAnimationFrame(()=>{target.querySelector('.dialog-back')?.classList.add('is-visible')});target.querySelector('.dialog')?.focus({preventScroll:true})}
function closeDialog(immediate=false){const target=root.querySelector('#overlay-root'),back=target?.querySelector('.dialog-back');if(!back){modal=null;document.body.classList.remove('overlay-open');return Promise.resolve()}if(closingModal)return Promise.resolve();closingModal=true;const finish=()=>{modal=null;target.innerHTML='';document.body.classList.remove('overlay-open');closingModal=false;if(modalOpener?.isConnected)modalOpener.focus({preventScroll:true});modalOpener=null};if(immediate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return Promise.resolve()}back.classList.remove('is-visible');back.classList.add('is-closing');return new Promise(resolve=>{let done=false;const end=()=>{if(done)return;done=true;finish();resolve()};back.addEventListener('animationend',event=>{if(event.target===back)end()},{once:true});setTimeout(end,230)})}
function render(){if(!session){auth();return}if(!profile){root.innerHTML='<div class="auth"><div class="auth-box"><h2>Account pending setup</h2><p>Your login exists, but this account has not been granted store access. Ask the owner to configure the staff profile in Supabase.</p><button class="btn" data-action="logout">Sign out</button></div></div>';return}
root.innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand"><img src="/icon-192.png" alt="Store icon"><span>${esc(store)}</span></div><nav class="nav">${tabs.map(t=>`<button class="${t===tab?'active':''}" data-tab="${t}">${esc(L(t))}</button>`).join('')}</nav><div class="sub" style="margin:30px 12px">${esc(profile.email)}<br>${esc(profile.role)}</div><button class="btn secondary" data-action="logout">${esc(L('Sign out'))}</button></aside><div class="mobile-top"><div class="mobile-brand"><img src="/mascot-transparent.png" alt=""><span><strong>${esc(store)}</strong><small>${esc(L(tab))}</small></span></div><button class="mobile-menu-trigger" type="button" data-action="toggle-menu" aria-label="Open menu" aria-expanded="false">${mobileIcon('menu')}</button></div><main class="main"><header class="top"><div><div class="sub">STORE MANAGEMENT</div><h1>${esc(L(tab))}</h1></div><div class="sub">${date(new Date())}</div></header>${content()}</main><nav class="mobile-nav" aria-label="Primary navigation">${['Dashboard','Orders','Products','Reports'].map(t=>`<button type="button" class="mobile-nav-item ${t===tab?'active':''}" data-tab="${t}" ${t===tab?'aria-current="page"':''}>${mobileIcon(t.toLowerCase())}<span>${esc(L(t))}</span></button>`).join('')}<button type="button" class="mobile-nav-item ${!['Dashboard','Orders','Products','Reports'].includes(tab)?'active':''}" data-action="toggle-menu" aria-label="More pages">${mobileIcon('menu')}<span>${ui.lang==='th'?'เพิ่มเติม':'More'}</span></button></nav><div id="mobile-drawer-root"></div><div id="overlay-root"></div></div>`;annotateMobileTables();document.body.classList.remove('overlay-open');mobileMenuOpen=false;modal=null;}
function auth(){root.innerHTML=`<div class="auth"><form class="auth-box" id="login"><img src="/icon-192.png"><h1>Yogurt Studio</h1><p class="muted">Private store management</p>${field('Email','email','email')}${field('Password','password','password')}<button class="btn" type="submit">Sign in</button><p class="sub">Accounts must be created by the store administrator in Supabase Authentication.</p></form></div>`}
function content(){switch(tab){case'Dashboard':return dashboard();case'Orders':return orders();case'Calendar':return calendar();case'Products':return products();case'Inventory':return inventory();case'Production':return production();case'Customers':return customers();case'Expenses':return expenses();case'Reports':return reports();case'Settings':return settings()}}
function dashboard(){const active=cache.orders.filter(o=>o.status!=='cancelled'),completed=active.filter(o=>o.status==='completed'),todayOrders=active.filter(o=>thaiDay(o.created_at)===today()),todayPaid=cache.payments.filter(p=>thaiDay(p.created_at)===today()).reduce((a,p)=>a+Number(p.amount),0)-(cache.refunds||[]).filter(p=>thaiDay(p.created_at)===today()).reduce((a,p)=>a+Number(p.amount),0),low=cache.ingredients.filter(i=>i.active!==false&&Number(i.quantity)<=Number(i.reorder_level)),open=active.filter(o=>o.status!=='completed');return `<div class="cards">${[['Today’s net receipts',money(todayPaid)],['Recent orders created today',todayOrders.length],['Open orders in recent page',open.length],['Low-stock items',low.length]].map(([k,v])=>`<div class="card"><div class="muted">${k}</div><div class="value">${v}</div></div>`).join('')}</div><div class="mini-grid"><section class="panel"><div class="toolbar"><h2>Recent orders needing attention</h2>${btn('New order')}</div>${table(['Order','Channel','Status','Total',''],open.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,8).map(o=>`<tr><td>#${o.order_no}</td><td>${esc(o.channel)}</td><td>${status(o.status)}</td><td>${money(total(o))}</td><td>${action('Open','edit-order',o.id)}</td></tr>`))}</section><section class="panel"><h2>Stock alerts</h2>${table(['Ingredient','Remaining','Reorder at'],low.map(i=>`<tr><td>${esc(i.name)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${esc(i.reorder_level)} ${esc(i.unit)}</td></tr>`))}<div class="note">Sales, receipts, and gross profit are different measures. See Reports for details.</div></section></div>`}
function orders(){return `<section class="panel"><div class="toolbar"><div class="muted">Walk-in, preorders, and delivery platforms</div>${btn('+ New order')}</div>${table(['Order','Created','Customer','Channel','Fulfillment','Status','Total / Paid',''],[...cache.orders].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(o=>`<tr><td><b>#${o.order_no}</b></td><td>${date(o.created_at)}</td><td>${esc(cache.customers.find(c=>c.id===o.customer_id)?.name||'Walk-in')}</td><td>${esc(o.channel)}</td><td>${dt(o.fulfillment_at)}</td><td>${status(o.status)}</td><td>${money(total(o))}<div class="sub">Net paid ${money(netPaid(o))}</div></td><td>${action('Manage','edit-order',o.id)} ${action(o.status==='cancelled'?L('Restore order'):L('Cancel order'),o.status==='cancelled'?'restore-order':'cancel-order',o.id)}</td></tr>`))}${hasOlderOrders?'<div class="older-orders"><button class="btn secondary" data-action="load-older-orders">Load older orders</button></div>':''}</section>`}
function calendar(){const items=cache.orders.filter(o=>o.fulfillment_at&&o.status!=='cancelled').sort((a,b)=>a.fulfillment_at.localeCompare(b.fulfillment_at));return `<section class="panel"><div class="toolbar"><p class="muted">Scheduled pickups and deliveries (local time)</p>${btn('+ New order')}</div>${table(['Scheduled','Order','Channel','Status',''],items.map(o=>`<tr><td>${dt(o.fulfillment_at)}</td><td>#${o.order_no}</td><td>${esc(o.channel)}</td><td>${status(o.status)}</td><td>${action('Open','edit-order',o.id)}</td></tr>`))}</section>`}
function products(){return `<section class="panel"><div class="toolbar"><p class="muted">Prices and estimated unit costs</p>${btn('+ Add product','new-product')}</div>${table(['Product','Category','Selling price','Unit cost','Gross margin','Status',''],cache.products.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${money(p.unit_cost)}</td><td>${Number(p.price)?((Number(p.price)-Number(p.unit_cost))/Number(p.price)*100).toFixed(1)+'%':'—'}</td><td>${p.active?'Active':'Inactive'}</td><td>${action('Edit','edit-product',p.id)} ${p.active?(isOwner()?action('Archive','archive-product',p.id):''):'<span class="sub">Archived</span>'}</td></tr>`))}</section>`}
function inventory(){return `<section class="panel"><div class="toolbar"><p class="muted">Adjustments are recorded in the stock ledger</p>${btn('+ Add ingredient','new-ingredient')}</div>${table(['Ingredient','Quantity','Reorder level','Unit cost','Alert',''],cache.ingredients.map(i=>`<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${esc(i.reorder_level)} ${esc(i.unit)}</td><td>${money(i.unit_cost)} / ${esc(i.unit)}</td><td>${Number(i.quantity)<=Number(i.reorder_level)?'<span class="warn">Low</span>':'OK'}</td><td>${action('Adjust','adjust',i.id)} ${action('Edit','edit-ingredient',i.id)} ${i.active===false?'<span class="sub">Archived</span>':isOwner()?action('Archive','archive-ingredient',i.id):''}</td></tr>`))}</section><section class="panel"><h2>Recent stock movements</h2>${table(['Date','Ingredient','Change','Reason'],[...cache.inventory_movements].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,20).map(m=>`<tr><td>${dt(m.created_at)}</td><td>${esc(cache.ingredients.find(i=>i.id===m.ingredient_id)?.name)}</td><td>${Number(m.delta)>0?'+':''}${esc(m.delta)}</td><td>${esc(m.reason)}</td></tr>`))}</section>`}
function production(){return `<section class="panel"><div class="toolbar"><p class="muted">Track batches, yield, and expiry</p>${btn('+ New batch','new-batch')}</div>${table(['Batch','Product','Produced','Remaining','Production','Expiry',''],[...cache.production_batches].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(b=>`<tr><td>${esc(b.batch_code)}</td><td>${esc(cache.products.find(p=>p.id===b.product_id)?.name||'—')}</td><td>${esc(b.produced_qty)} ${esc(b.unit)}</td><td>${esc(b.remaining_qty)} ${esc(b.unit)}</td><td>${esc(b.produced_at)}</td><td>${esc(b.expires_at||'—')}</td><td>${b.voided_at?'':action('Edit','edit-batch',b.id)} ${b.voided_at?'<span class="sub">Voided</span>':isOwner()?action('Void','archive-batch',b.id):''}</td></tr>`))}<div class="note">Batch balances are entered manually in this first version. Order sales do not automatically deduct batch quantities.</div></section>`}
function customers(){return `<section class="panel"><div class="toolbar"><p class="muted">Customer directory</p>${btn('+ Add customer','new-customer')}</div>${table(['Name','Phone','Notes','Orders',''],cache.customers.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}</td><td>${esc(c.notes)}</td><td>${cache.orders.filter(o=>o.customer_id===c.id).length}</td><td>${action('Edit','edit-customer',c.id)} ${c.active===false?'<span class="sub">Archived</span>':isOwner()?action('Archive','archive-customer',c.id):''}</td></tr>`))}</section>`}
function expenses(){return `<section class="panel"><div class="toolbar"><p class="muted">Operating expenses (not product unit costs)</p>${btn('+ Add expense','new-expense')}</div>${table(['Date','Category','Description','Amount',''],[...cache.expenses].sort((a,b)=>b.expense_date.localeCompare(a.expense_date)).map(e=>`<tr><td>${esc(e.expense_date)}</td><td>${esc(e.category)}</td><td>${esc(e.description)}</td><td>${e.voided_at?'<s>'+money(e.amount)+'</s>':money(e.amount)}</td><td>${e.voided_at?'':action('Edit','edit-expense',e.id)} ${e.voided_at?'<span class="sub">Voided</span>':isOwner()?action('Void','void-expense',e.id):''}</td></tr>`))}</section>`}
function reports(){
 if(reportError)return `<section class="panel"><h2>Reports unavailable</h2><p>${esc(reportError)}</p>${action('Try again','refresh-report')}</section>`;
 if(!reportData)return '<section class="panel"><h2>Financial reports</h2><p class="muted">Retrieving verified totals from Supabase…</p></section>';
 const d=reportData, rev=Number(d.revenue||0),cost=Number(d.cost||0),expense=Number(d.expenses||0),receipts=Number(d.receipts||0),refunds=Number(d.refunds||0);
 const months=d.months||[],points=d.points||[],channels=d.channels||[],max=Math.max(1,...points.map(p=>Number(p.amount||0)));
 return `<section class="panel"><div class="toolbar"><div><h2>Financial overview</h2><p class="muted">Server-calculated figures · Asia/Bangkok accounting dates</p></div><label class="month-filter">Period <select id="report-month"><option value="all" ${reportMonth==='all'?'selected':''}>All time</option>${months.map(m=>`<option value="${esc(m)}" ${reportMonth===m?'selected':''}>${esc(m)}</option>`).join('')}</select></label></div></section>
 <div class="cards">${[['Completed sales',money(rev)],['Units sold',Number(d.units||0).toLocaleString()],['Gross receipts',money(receipts)],['Refunds',money(refunds)],['Net receipts',money(receipts-refunds)],['Gross profit',money(rev-cost)],['Operating expenses',money(expense)],['Operating contribution',money(rev-cost-expense)],['Lifetime sales',money(d.lifetime_revenue)],['Lifetime units',Number(d.lifetime_units||0).toLocaleString()]].map(([k,v])=>`<div class="card"><div class="muted">${k}</div><div class="value">${v}</div></div>`).join('')}</div>
 <section class="panel"><h2>Completed sales ${reportMonth==='all'?'by month':'by day'}</h2><div class="bar-chart">${points.length?points.map(p=>`<div class="bar-col" title="${esc(p.key)}: ${money(p.amount)}"><span class="bar-num">${p.amount?Math.round(p.amount).toLocaleString():''}</span><div class="bar-track"><div class="bar-fill" style="height:${Math.max(0,Number(p.amount))/max*100}%"></div></div><span class="bar-label">${reportMonth==='all'?esc(String(p.key).slice(2)):esc(String(p.key).slice(-2))}</span></div>`).join(''):'<p class="muted">No sales yet</p>'}</div></section>
 <div class="mini-grid"><section class="panel"><h2>Profit &amp; loss · management estimate</h2>${table(['Line item','THB'],[['Completed sales',rev],['Estimated cost of goods sold',-cost],['Gross profit',rev-cost],['Operating expenses',-expense],['Operating contribution',rev-cost-expense]].map(([k,v])=>`<tr><td>${k}</td><td>${money(v)}</td></tr>`))}</section>
 <section class="panel"><h2>Sales by channel</h2>${table(['Channel','Sales'],channels.map(c=>`<tr><td>${esc(c.channel)}</td><td>${money(c.amount)}</td></tr>`))}</section></div>
 <section class="panel"><h2>Cash movements</h2><p>Collected ${money(receipts)} − refunded ${money(refunds)} = <b>${money(receipts-refunds)} net receipts</b>.</p><div class="note">This is NOT a balance sheet or a full accrual ledger. Earlier completed orders without a completion timestamp use their original creation date as a legacy fallback. Stock valuation, liabilities, equity, and bank reconciliation are not yet included.</div></section>`;
}
function appearance(){return renderAppearancePanel({ui,palettes,templates:savedThemes,stickers:allStickerItems(),sharedNote,cloudEnabled:appearanceCloud,isOwner:isOwner()})}

function settings(){return appearance()+`<section class="panel"><h2>Store preferences</h2><div class="form-grid">${field('Store name','store-name','text',store)}${field('Currency','currency','text','THB')}</div><div style="margin-top:15px">${action('Save preferences','save-settings')}</div></section><section class="panel"><h2>Staff access</h2><p class="muted">User accounts are created in Supabase Authentication. Owner roles must be granted in SQL; do not allow public signup.</p>${table(['Email','Display name','Role'],cache.profiles.map(p=>`<tr><td>${esc(p.email)}</td><td>${esc(p.display_name)}</td><td>${esc(p.role)}</td></tr>`))}</section><section class="panel"><h2>Export</h2><p class="muted">Download a JSON backup of currently accessible store records.</p>${action('Export JSON','export')}</section>`}
function dialog(title,body,save='save',id=''){modal=`<div class="dialog-back"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><div class="dialog-heading"><h2 id="dialog-title">${esc(title)}</h2><button class="dialog-x" type="button" aria-label="Close dialog" data-action="close">&times;</button></div><form id="editor" data-kind="${save}" data-id="${esc(id)}"><div class="form-grid">${body}</div><div class="dialog-actions"><button type="button" class="btn secondary" data-action="close">${ui.lang==='th'?'ยกเลิก':'Cancel'}</button><button type="submit" class="btn">${ui.lang==='th'?'บันทึก':'Save'}</button></div></form></section></div>`;mountDialog()}
function edit(kind,id=''){const t=kind==='new'?'order':kind.replace('edit-','');const map={product:'products',customer:'customers',ingredient:'ingredients',batch:'production_batches',expense:'expenses',order:'orders'};let old=(cache[map[t]]||[]).find(x=>x.id===id)||{};let body='';switch(t){case'product':body=field('Name','name','text',old.name)+field('Category','category','text',old.category||'Yogurt')+field('Price (THB)','price','number',old.price||0)+field('Unit cost (THB)','unit_cost','number',old.unit_cost||0)+`<div class="field wide"><label>Optional unit cost breakdown (one per line: name | amount in THB)</label><textarea id="cost-breakdown" rows="5" placeholder="Yogurt | 15\nFruit | 12\nPackaging | 5">${esc((cache.product_cost_items||[]).filter(x=>x.product_id===id).map(x=>x.label+' | '+x.amount).join('\n'))}</textarea><small class="muted">If provided, these components determine the saved unit cost. Operating expenses are entered separately under Expenses.</small></div>`+field('Status','active','text',old.active===false?'false':'true',[['true','Active'],['false','Inactive']]);break;case'customer':body=field('Name','name','text',old.name)+field('Phone','phone','tel',old.phone)+field('Notes','notes','textarea',old.notes,null,true);break;case'ingredient':body=field('Name','name','text',old.name)+field('Unit (g, ml, pcs)','unit','text',old.unit||'g')+field('Reorder level','reorder_level','number',old.reorder_level||0)+field('Cost per unit','unit_cost','number',old.unit_cost||0);break;case'batch':body=field('Batch code','batch_code','text',old.batch_code||'B-'+today())+field('Product','product_id','text',old.product_id||'',options(cache.products,true))+field('Produced quantity','produced_qty','number',old.produced_qty||0)+field('Remaining quantity','remaining_qty','number',old.remaining_qty??old.produced_qty??0)+field('Unit','unit','text',old.unit||'g')+field('Produced on','produced_at','date',old.produced_at||today())+field('Expiry date','expires_at','date',old.expires_at)+field('Notes','notes','textarea',old.notes,null,true);break;case'expense':body=field('Date','expense_date','date',old.expense_date||today())+field('Category','category','text',old.category||'Supplies')+field('Description','description','text',old.description)+field('Amount','amount','number',old.amount||0);break;case'order':body=field('Customer','customer_id','text',old.customer_id||'',options(cache.customers.filter(c=>c.active!==false || c.id===old.customer_id),true))+field('Channel','channel','text',old.channel||'walk-in',['walk-in','preorder','delivery'].map(v=>[v,v]))+field('Status','status','text',old.status||'pending',['pending','preparing','ready','completed','cancelled'].map(v=>[v,v]))+field('Fulfillment time','fulfillment_at','datetime-local',old.fulfillment_at?new Date(old.fulfillment_at).toLocaleString('sv-SE').replace(' ','T').slice(0,16):'')+field('Discount (THB)','discount','number',old.discount||0)+field('Notes','notes','textarea',old.notes,null,true);if(!id)body+=field('Product','product_id','text','',options(cache.products.filter(p=>p.active)))+field('Quantity','quantity','number',1);else body+=`<div class="field wide"><label>Items (snapshot)</label><div class="note">${cache.order_items.filter(i=>i.order_id===id).map(i=>esc(i.product_name)+' × '+esc(i.quantity)).join(', ')||'No items'}</div></div><div class="field wide"><label>Order total ${money(total(old))} · Collected ${money(paid(old))} · Refunded ${money(refunded(old))}</label>${old.status!=='cancelled'?action('Record payment','payment',id):''} ${old.status!=='cancelled'&&old.status!=='completed'?action('Add item','add-item',id):''} ${paid(old)>refunded(old)&&isOwner()?action('Record refund','refund',id):''}</div>`;break}dialog((id?'Edit ':'New ')+t,body,t,id)}
async function save(e){
 e.preventDefault();const f=e.target,k=f.dataset.kind,id=f.dataset.id;
 const cols={product:['name','category','price','unit_cost','active'],customer:['name','phone','notes'],ingredient:['name','unit','reorder_level','unit_cost'],batch:['batch_code','product_id','produced_qty','remaining_qty','unit','produced_at','expires_at','notes'],expense:['expense_date','category','description','amount'],order:['customer_id','channel','status','fulfillment_at','discount','notes']};
 const table={product:'products',customer:'customers',ingredient:'ingredients',batch:'production_batches',expense:'expenses',order:'orders'}[k];let payload={};
 cols[k].forEach(x=>{let v=val(x);payload[x]=v===''?null:['price','unit_cost','reorder_level','produced_qty','remaining_qty','amount','discount'].includes(x)?Number(v):x==='active'?v==='true':x==='fulfillment_at'?new Date(v).toISOString():v});
 if(k==='product'){
  let breakdown=[];const raw=val('cost-breakdown');if(raw)breakdown=raw.split(/\n/).map(x=>x.trim()).filter(Boolean).map(line=>{let parts=line.split('|');let amount=Number(parts.pop()?.trim());let label=parts.join('|').trim();if(!label||!Number.isFinite(amount)||amount<0)throw Error('Cost breakdown lines must be: name | non-negative amount');return {label,amount}});
  const {error}=await db.rpc('save_store_product',{p_id:id||null,p_name:payload.name,p_category:payload.category,p_price:payload.price,p_unit_cost:payload.unit_cost,p_active:payload.active,p_cost_items:breakdown});if(error)throw error;
 }else if(k==='order'){
  const args={p_customer_id:payload.customer_id,p_channel:payload.channel,p_status:payload.status,p_fulfillment_at:payload.fulfillment_at,p_discount:payload.discount,p_notes:payload.notes};
  if(!id){Object.assign(args,{p_product_id:val('product_id'),p_quantity:Number(val('quantity'))});const {error}=await db.rpc('create_store_order',args);if(error)throw error}
  else{args.p_id=id;const {error}=await db.rpc('update_store_order',args);if(error)throw error}
 }else{
  if(k==='ingredient'&&!id)payload.quantity=0;
  const q=id?db.from(table).update(payload).eq('id',id).select().single():db.from(table).insert(payload).select().single();
  const {error}=await q;if(error)throw error;
 }
 await closeDialog();await refresh(updateGroups[k]||allTables);if(tab==='Reports')await fetchReport();toast('Saved successfully');
}
async function removeRecord(kind,id){
 if(!isOwner())throw Error('Only the owner can archive or void records');
 if(kind==='expense'){
  const reason=prompt('Reason for voiding this expense? It will remain in the audit history.');
  if(reason===null)return;if(!reason.trim())throw Error('Reason required');
  const {error}=await db.rpc('void_store_expense',{p_id:id,p_reason:reason.trim()});if(error)throw error;
 }else{
  if(!['product','ingredient','batch','customer'].includes(kind))throw Error('Unsupported operation');
  if(!confirm(`Archive ${kind}? Existing history will remain. This is not a permanent deletion.`))return;
  const {error}=await db.rpc('archive_store_record',{p_kind:kind,p_id:id});if(error)throw error;
 }
 await refresh(updateGroups[kind]||['expenses']);toast('Updated without deleting history');
}
async function special(cmd,id){if(cmd.startsWith('archive-')){await removeRecord(cmd.slice(8),id);return}if(cmd==='void-expense'){await removeRecord('expense',id);return}if(cmd==='cancel-order'||cmd==='restore-order'){const o=cache.orders.find(x=>x.id===id);if(!o)return;if(!confirm((cmd==='cancel-order'?'Cancel':'Restore')+' order #'+o.order_no+'? Payments are not refunded automatically.'))return;const {error}=await db.rpc('set_store_order_status',{p_id:id,p_status:cmd==='cancel-order'?'cancelled':'pending'});if(error)throw error;await refresh(['orders']);return}if(cmd==='save-appearance'){
 saveUI();await syncMyAppearance();toast(ui.lang==='th'?'บันทึกรูปลักษณ์แล้ว':'Appearance saved');return
 }if(cmd==='reset-appearance'){
 ui={...ui,palette:'pistachio',custom:null,font:'system',scale:100,mode:'light',density:'comfortable',radius:18,shadow:35,motion:100,decor:defaultDecor()};
 saveUI();render();return
 }if(cmd==='save-theme'){await saveTheme();return}
 if(cmd==='export-appearance'){exportAppearance();return}
 if(cmd==='save-shared-note'){await saveSharedNote();return}
if(cmd==='close'){await closeDialog();return}if(cmd==='toggle-menu'){showMobileMenu();return}if(cmd==='retry-load'){bootShell();try{await openStore()}catch(e){showBootError(e)}return}if(cmd==='logout'){await db.auth.signOut();session=null;profile=null;auth();return}if(cmd==='new'){await loadTables(['products','customers'],false);edit('new');return}if(cmd.startsWith('new-')){edit(cmd.replace('new-',''));return}if(cmd.startsWith('edit-')){if(cmd==='edit-order')await loadTables(['customers','products'],false);edit(cmd,id);return}if(cmd==='adjust'){let i=cache.ingredients.find(x=>x.id===id);dialog('Adjust '+i.name,field('Change (+ received / − used)','delta','number',0)+field('Reason','reason','text','Stock count'),'adjust',id);return}if(cmd==='payment'){dialog('Record payment',field('Amount (THB)','amount','number',Math.max(0,total(cache.orders.find(o=>o.id===id))-netPaid(cache.orders.find(o=>o.id===id))))+field('Method','method','text','cash',['cash','transfer','card','platform','other'].map(x=>[x,x])),'payment',id);return}if(cmd==='refund'){const o=cache.orders.find(x=>x.id===id);dialog('Record refund · #'+o.order_no,field('Amount (THB)','amount','number',Math.max(0,paid(o)-refunded(o)))+field('Method','method','text','cash',['cash','transfer','card','platform','other'].map(x=>[x,x]))+field('Reason','reason','text','Cancelled order'),'refund',id);return}if(cmd==='refresh-report'){await fetchReport();render();return}if(cmd==='load-older-orders'){await loadOlderOrders();return}if(cmd==='add-item'){dialog('Add item',field('Product','product_id','text','',options(cache.products.filter(p=>p.active)))+field('Quantity','quantity','number',1),'add-item',id);return}if(cmd==='save-settings'){const {error}=await db.from('store_settings').update({store_name:val('store-name')}).eq('id',1);if(error)throw error;await refresh(['store_settings']);toast('Saved');return}if(cmd==='export'){if(!confirm('This JSON export contains only records loaded in this browser session, including the recent order pages. It is NOT a complete database backup. Continue?'))return;await loadTables(allTables,false);const blob=new Blob([JSON.stringify(cache,null,2)],{type:'application/json'});let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yogurt-store-browser-snapshot-'+today()+'.json';a.click();URL.revokeObjectURL(url);return}}
const pendingRequestIds=new Map();
async function submitSpecial(e){
 e.preventDefault();let f=e.target,k=f.dataset.kind,id=f.dataset.id;
 if(['product','customer','ingredient','batch','expense','order'].includes(k)){await save(e);return}
 if(k==='adjust'){
  const {error}=await db.rpc('adjust_inventory',{p_ingredient_id:id,p_delta:Number(val('delta')),p_reason:val('reason')});if(error)throw error;
 }else if(k==='payment'){
  const amount=Number(val('amount'));
  if(!Number.isFinite(amount)||amount<=0)throw Error('Enter a positive payment amount');
  const requestKey='payment:'+id+':'+amount+':'+val('method');const reqId=pendingRequestIds.get(requestKey)||randomId();pendingRequestIds.set(requestKey,reqId);
  const {error}=await db.rpc('record_store_payment',{p_order_id:id,p_amount:amount,p_method:val('method'),p_request_id:reqId});if(error)throw error;
  pendingRequestIds.delete(requestKey);
 }else if(k==='refund'){
  const amount=Number(val('amount'));
  if(!Number.isFinite(amount)||amount<=0||!val('reason'))throw Error('Enter an amount and reason');
  const requestKey='refund:'+id+':'+amount+':'+val('method')+':'+val('reason');const reqId=pendingRequestIds.get(requestKey)||randomId();pendingRequestIds.set(requestKey,reqId);
  const {error}=await db.rpc('record_store_refund',{p_order_id:id,p_amount:amount,p_method:val('method'),p_reason:val('reason'),p_request_id:reqId});if(error)throw error;
  pendingRequestIds.delete(requestKey);
 }else if(k==='add-item'){
  const {error}=await db.rpc('add_store_order_item',{p_order_id:id,p_product_id:val('product_id'),p_quantity:Number(val('quantity'))});if(error)throw error;
 }
 await closeDialog();await refresh(k==='refund'?['refunds']:updateGroups[k]||allTables);toast('Saved successfully');
}
function getThemeConfig(){return {colors:themeColors(),font:ui.font,mode:ui.mode,scale:ui.scale,density:ui.density,radius:ui.radius,shadow:ui.shadow,motion:ui.motion}}
function updateAppearanceFromControls(target){
 const id=target.id,v=target.value;
 if(id.startsWith('ui-color-')){
  const index=Number(id.slice(9));if(!Number.isInteger(index)||index<0||index>5)return;
  ui.custom=themeColors();ui.custom[index]=v;
  target.closest('.color-setting')?.querySelector('small')?.replaceChildren(document.createTextNode(v));
 }else if(id==='ui-lang'){ui.lang=v;saveUI();render();return
 }else if(id==='ui-mode'){ui.mode=v
 }else if(id==='ui-font'){ui.font=v
 }else if(id==='ui-density'){ui.density=v
 }else if(id==='ui-scale'){ui.scale=Number(v)
 }else if(id==='ui-radius'){ui.radius=Number(v)
 }else if(id==='ui-shadow'){ui.shadow=Number(v)
 }else if(id==='ui-motion'){ui.motion=Number(v)
 }else if(id==='decor-visible'){ui.decor.visible=target.checked
 }else if(id==='decor-rotate'){ui.decor.rotate=target.checked
 }else if(id==='decor-arrange'){ui.decor.arrange=target.checked
 }else if(id==='decor-note'){ui.decor.showNote=target.checked
 }else if(id==='decor-size'){ui.decor.size=Number(v)
 }else if(id==='decor-opacity'){ui.decor.opacity=Number(v)
 }else if(id==='decor-interval'){ui.decor.interval=Number(v)
 }else return;
 const out=root.querySelector(`[data-output="${CSS.escape(id)}"]`);if(out)out.textContent=v;
 saveUI();
}
function renderAppearanceOnly(){
 if(tab==='Settings'&&!modal){const container=root.querySelector('#appearance-studio');if(container){const replacement=document.createElement('div');replacement.innerHTML=appearance();container.replaceWith(replacement.firstElementChild)}}
}
function loadTemplate(id){
 const t=savedThemes.find(x=>String(x.id)===String(id));if(!t)return;
 const c=t.config||{};
 if(!Array.isArray(c.colors)||c.colors.length<5||!c.colors.every(x=>/^#[0-9a-f]{6}$/i.test(x)))throw Error('Invalid theme colors');
 ui.custom=c.colors.slice(0,6);ui.palette='pistachio';
 for(const key of ['font','mode','scale','density','radius','shadow','motion'])if(c[key]!=null)ui[key]=c[key];
 saveUI();renderAppearanceOnly();toast('Theme applied');
}
async function saveTheme(){
 const name=val('theme-name');if(!name||name.length>48)throw Error('Enter a theme name of up to 48 characters');
 const item={id:randomId(),name,config:getThemeConfig(),local:!appearanceCloud||!isOwner()};
 if(appearanceCloud&&isOwner()){
  const {data,error}=await db.from('store_themes').insert({name,config:item.config,created_by:session.user.id}).select().single();if(error)throw error;
  item.id=data.id;item.local=false;
 }
 savedThemes.push(item);persistLocalThemes();renderAppearanceOnly();toast('Template saved');
}
function persistLocalThemes(){localStorage.setItem('yg_templates_v7',JSON.stringify(savedThemes.filter(x=>x.local)))}
async function renameTheme(id){
 const t=savedThemes.find(x=>String(x.id)===String(id));if(!t)return;
 if(!t.local&&!isOwner()){toast('Only the owner can edit shared templates');return}
 const name=prompt('Rename template',t.name);if(name===null)return;
 if(!name.trim()||name.trim().length>48)throw Error('Name must contain 1–48 characters');
 if(!t.local){const {error}=await db.from('store_themes').update({name:name.trim()}).eq('id',t.id);if(error)throw error}
 t.name=name.trim();persistLocalThemes();renderAppearanceOnly();
}
async function deleteTheme(id){
 const t=savedThemes.find(x=>String(x.id)===String(id));if(!t)return;
 if(!t.local&&!isOwner()){toast('Only the owner can delete shared templates');return}
 if(!confirm(`Delete template "${t.name}"?`))return;
 if(!t.local){const {error}=await db.from('store_themes').delete().eq('id',t.id);if(error)throw error}
 savedThemes=savedThemes.filter(x=>String(x.id)!==String(id));persistLocalThemes();renderAppearanceOnly();
}
function exportAppearance(){
 const obj={version:7,presets:savedThemes.map(x=>({name:x.name,config:x.config})),current:getThemeConfig()};
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yogurt-appearance-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importAppearance(file){
 if(!file)return;if(file.size>1024*1024)throw Error('Theme file is too large');
 let data=JSON.parse(await file.text()),themes=Array.isArray(data.presets)?data.presets:[];
 if(themes.length>30)throw Error('Maximum 30 templates per import');
 let imported=0;
 for(const item of themes){
  if(typeof item.name!=='string'||!Array.isArray(item.config?.colors)||!item.config.colors.every(x=>/^#[0-9a-f]{6}$/i.test(x)))continue;
  savedThemes.push({id:randomId(),name:item.name.slice(0,48),config:{...item.config,colors:item.config.colors.slice(0,6)},local:true});imported++;
 }
 persistLocalThemes();renderAppearanceOnly();toast('Imported '+imported+' templates to this browser');
}
async function syncMyAppearance(){
 if(!appearanceCloud||!session)return;
 const config={...ui};
 const {error}=await db.from('user_appearance').upsert({user_id:session.user.id,config,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error){console.info(error);toast('Saved on this device; cloud sync unavailable')}
}
async function loadAppearanceCloud(){
 if(!session||!profile)return;
 const results=await Promise.allSettled([
  db.from('user_appearance').select('config').eq('user_id',session.user.id).maybeSingle(),
  db.from('store_themes').select('id,name,config').order('created_at',{ascending:false}),
  db.from('store_stickers').select('id,name,storage_path').order('created_at',{ascending:false}),
  db.from('store_shared_note').select('message').eq('id',1).maybeSingle()
 ]);
 if(results.some(x=>x.status!=='fulfilled'||x.value.error)){
  appearanceCloud=false;
  console.info('Appearance cloud tables not available. Run sql/v7_appearance_migration.sql to sync themes and images.');
  return;
 }
 appearanceCloud=true;
 const [prefs,themes,stickers,note]=results.map(x=>x.value.data);
 if(prefs?.config&&typeof prefs.config==='object'){
  const oldDecor=ui.decor;
  ui={...ui,...prefs.config,decor:{...defaultDecor(),...oldDecor,...(prefs.config.decor||{})}};
  saveUI();
 }
 savedThemes=[...localTemplates().map(t=>({...t,local:true})),...(themes||[]).map(t=>({...t,local:false}))];
 sharedStickerItems=(stickers||[]).map(s=>({...s,cloud:true,image:db.storage.from('store-decor').getPublicUrl(s.storage_path).data.publicUrl}));
 sharedNote=note?.message||'';
 renderFloating();renderAppearanceOnly();
}
async function saveSharedNote(){
 const text=val('shared-note-text').slice(0,160);
 if(!appearanceCloud)throw Error('Run the V7 Supabase migration to use shared notes');
 const {error}=await db.from('store_shared_note').update({message:text,updated_at:new Date().toISOString()}).eq('id',1);
 if(error)throw error;sharedNote=text;renderFloating();toast('Shared note updated');
}
async function uploadSticker(file){
 if(!file)return;
 if(!appearanceCloud)throw Error('Run the V7 appearance SQL migration before uploading images');
 if(!isOwner())throw Error('Only the store owner can upload shared images');
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choose a PNG, JPG, WebP or GIF file');
 if(file.size>2*1024*1024)throw Error('Image must be 2 MB or smaller');
 const suffix={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[file.type],path=`${randomId()}.${suffix}`;
 const {error:uploadError}=await db.storage.from('store-decor').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
 const {data,error}=await db.from('store_stickers').insert({name:file.name.slice(0,64),storage_path:path,uploaded_by:session.user.id}).select().single();
 if(error){await db.storage.from('store-decor').remove([path]);throw error}
 sharedStickerItems.unshift({...data,cloud:true,image:db.storage.from('store-decor').getPublicUrl(path).data.publicUrl});
 renderAppearanceOnly();toast('Image uploaded');
}
async function deleteSticker(id){
 if(!isOwner())throw Error('Only the owner can remove shared images');
 const s=sharedStickerItems.find(x=>x.id===id);if(!s||!confirm('Delete '+s.name+' from the shared gallery?'))return;
 const {error}=await db.from('store_stickers').delete().eq('id',id);if(error)throw error;
 await db.storage.from('store-decor').remove([s.storage_path]);
 sharedStickerItems=sharedStickerItems.filter(x=>x.id!==id);renderFloating();renderAppearanceOnly();
}
function setupFloatingDrag(){
 const layer=document.getElementById('floating-layer');if(!layer)return;
 let drag=null;
 layer.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-float]');if(!el)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const rect=el.getBoundingClientRect();drag={id:el.dataset.float,el,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top};
  el.setPointerCapture(e.pointerId);el.classList.add('dragging');e.preventDefault();
 });
 layer.addEventListener('pointermove',e=>{
  if(!drag)return;
  const x=Math.max(1,Math.min(92,(e.clientX-drag.offsetX)/window.innerWidth*100));
  const y=Math.max(2,Math.min(88,(e.clientY-drag.offsetY)/window.innerHeight*100));
  drag.el.style.left=x+'%';drag.el.style.top=y+'%';ui.decor.positions[drag.id]={x,y};
 });
 const end=()=>{if(!drag)return;drag.el.classList.remove('dragging');drag=null;saveUI()};
 layer.addEventListener('pointerup',end);layer.addEventListener('pointercancel',end);
}
setupFloatingDrag();

root.addEventListener('click',async e=>{if(e.target.classList.contains('dialog-back')){await closeDialog();return}if(e.target.classList.contains('mobile-drawer-back')){closeMobileMenu();return}let b=e.target.closest('[data-action],[data-tab],[data-palette],[data-theme-load],[data-theme-delete],[data-theme-rename],[data-sticker-delete]');if(!b)return;try{if(b.dataset.themeLoad){loadTemplate(b.dataset.themeLoad);return}
 if(b.dataset.themeRename){await renameTheme(b.dataset.themeRename);return}
 if(b.dataset.themeDelete){await deleteTheme(b.dataset.themeDelete);return}
 if(b.dataset.stickerDelete){await deleteSticker(b.dataset.stickerDelete);return}
 if(b.dataset.palette){ui.palette=b.dataset.palette;ui.custom=null;saveUI();render();return}
 if(b.dataset.tab){await openTab(b.dataset.tab)}else await special(b.dataset.action,b.dataset.id)}catch(err){fail(err)}});
root.addEventListener('change',async e=>{
 if(e.target.id==='report-month'){reportMonth=e.target.value;try{await fetchReport()}catch(err){reportError=err.message;fail(err)}render();return}
 if(e.target.id==='import-appearance'){try{await importAppearance(e.target.files?.[0])}catch(err){fail(err)}return}
 if(e.target.id==='sticker-upload'){try{await uploadSticker(e.target.files?.[0])}catch(err){fail(err)}return}
 if(e.target.dataset.stickerToggle){
  const id=e.target.dataset.stickerToggle;
  ui.decor.hidden=e.target.checked?ui.decor.hidden.filter(x=>x!==id):[...new Set([...ui.decor.hidden,id])];saveUI();return;
 }
 if(e.target.matches('[data-live-appearance]'))updateAppearanceFromControls(e.target);
});
root.addEventListener('input',e=>{
 if(e.target.matches('[data-live-appearance]'))updateAppearanceFromControls(e.target);
});
root.addEventListener('submit',async e=>{if(e.target.id==='login'){e.preventDefault();let {data,error}=await db.auth.signInWithPassword({email:val('email'),password:val('password')});if(error){fail(error);return}session=data.session;bootShell();try{await openStore()}catch(err){showBootError(err)}return}if(e.target.id==='editor'){const submit=e.target.querySelector('button[type=submit]');if(submit?.disabled)return;const oldText=submit?.textContent;if(submit){submit.disabled=true;submit.classList.add('is-saving');submit.textContent='Saving';}try{await submitSpecial(e)}catch(err){fail(err)}finally{if(submit?.isConnected){submit.disabled=false;submit.classList.remove('is-saving');submit.textContent=oldText||'Save';}}}});
(async()=>{try{let {data:{session:s}}=await db.auth.getSession();session=s;if(session){bootShell();try{await openStore()}catch(err){showBootError(err)}}else auth();db.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'){session=null;profile=null;auth()}})}catch(e){showBootError(e)}})();

// V5: accessible keyboard dismissal for open editors.
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(modal){event.preventDefault();closeDialog();}else if(mobileMenuOpen){event.preventDefault();closeMobileMenu();}}});
document.addEventListener('keydown',event=>{if(event.key==='Tab'&&modal){const layer=root.querySelector('#overlay-root');const controls=[...layer.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===layer.querySelector('.dialog'))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===layer.querySelector('.dialog'))){event.preventDefault();first.focus()}}});

// When a phone rotates into desktop layout, dismiss the mobile drawer.
window.matchMedia('(min-width: 761px)').addEventListener('change',e=>{if(e.matches&&mobileMenuOpen)closeMobileMenu()});

window.addEventListener('resize',()=>{if(ui.decor.visible)renderFloating()},{passive:true});
