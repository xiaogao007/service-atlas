import { servers, products, services, operations, matchServices, filterOperations, assignServices, restartReason } from './data.js';

// shortcut: 状态仅保存在本次页面会话；接入真实后端时替换为产品文档中的 API 契约。
const $ = selector => document.querySelector(selector);
const state = { selected: new Set(), dirty: false, returnFocus: null, toastTimer: null, logTimer: null, scanPending: false, interval: '30 秒' };
const names = { products: '产品', unassigned: '待整理', servers: '服务器', operations: '操作历史', settings: '设置' };
const symbols = {
  map: ['M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2V5z','M9 3v16M15 5v16'],
  grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  list: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  inbox: ['M4 4h16l2 10v6H2v-6L4 4z','M2 14h6l2 3h4l2-3h6'],
  server: ['M3 3h18v7H3zM3 14h18v7H3zM6 6.5h.01M6 17.5h.01M10 6.5h8M10 17.5h8'],
  history: ['M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2'],
  settings: ['M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3z','M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0'],
  search: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 1 0 0-15M16 16l5 5'],
  plus: ['M12 5v14M5 12h14'], close: ['M6 6l12 12M6 18L18 6'],
  chevron: ['M9 5l7 7-7 7'], back: ['M15 5l-7 7 7 7'], refresh: ['M20 8a8 8 0 0 0-14-3L3 8M3 3v5h5M4 16a8 8 0 0 0 14 3l3-3M21 21v-5h-5'],
  book: ['M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3zM4 17h16M8 7h8M8 11h6'],
  bag: ['M4 7h16l1 14H3L4 7zM8 7V5a4 4 0 0 1 8 0v2M8 11h.01M16 11h.01'],
  layers: ['M12 3l10 6-10 6L2 9l10-6zM2 13l10 6 10-6M2 17l10 6 10-6'],
  globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20M2 12h20M12 2c5 5 5 15 0 20M12 2c-5 5-5 15 0 20'],
  check: ['M5 12l4 4L19 6'], clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 7v5l3 2'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20M12 11v6M12 7h.01'],
  alert: ['M12 3L2 21h20L12 3zM12 9v5M12 17h.01'], terminal: ['M3 4h18v16H3zM6 8l4 4-4 4M12 16h5'],
  box: ['M12 2l10 5v10l-10 5-10-5V7l10-5zM2 7l10 5 10-5M12 12v10M7 4.5l10 5'],
  copy: ['M8 8h13v13H8zM16 8V3H3v13h5'], arrow: ['M5 12h14M13 6l6 6-6 6'],
  link: ['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'],
  play: ['M7 3l14 9-14 9V3z'], pause: ['M7 4v16M17 4v16'], shield: ['M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4zM8 12l3 3 5-6'],
  edit: ['M15 4l5 5M3 21l5-1L21 7l-5-5L3 15v6z'], cloud: ['M5 18a5 5 0 0 1-1-10 8 8 0 0 1 15-1 5.5 5.5 0 0 1-1 11H5'],
};
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = value;
    else if (key === 'value' || key === 'checked') node[key] = value;
    else node.setAttribute(key === 'htmlFor' ? 'for' : key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) if (child != null && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  if ('value' in attrs) node.value = attrs.value;
  return node;
}
function replace(node, ...children) { node.replaceChildren(...children.flat().filter(child => child != null && child !== false)); }
function svg(tag, attrs, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value));
  for (const child of children.flat()) node.append(child);
  return node;
}
function icon(name, className = '') { return svg('svg',{viewBox:'0 0 24 24',class:`icon ${className}`,'aria-hidden':'true'},...(symbols[name]||symbols.box).map(d=>svg('path',{d}))); }
function button(text, onClick, kind = '', glyph, attrs = {}) { return h('button',{type:'button',class:`button ${kind}`,onClick,...attrs},glyph&&icon(glyph),text); }
function iconButton(label,onClick,glyph) { return h('button',{type:'button',class:'icon-button','aria-label':label,title:label,onClick},icon(glyph)); }
function badge(text, tone = '') { return h('span',{class:`badge ${tone}`},h('span',{class:'dot','aria-hidden':'true'}),text); }
function route() { const raw = location.hash.slice(1)||'/products'; const [path,query='']=raw.split('?'); return { path, section:path.split('/')[1], id:path.split('/')[2], params:new URLSearchParams(query) }; }
function href(path,params = {}) { const query=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==''&&v!=null)); return `#${path}${query.size?'?'+query:''}`; }
function navigate(path,params = {}) { location.hash=href(path,params).slice(1); }
function patchQuery(patch) { const r=route(); for(const [k,v] of Object.entries(patch)) v?r.params.set(k,v):r.params.delete(k); history.replaceState(null,'',href(r.path,Object.fromEntries(r.params))); }
function serviceHref(s,tab='summary') { const r=route(); return href(r.path,{...Object.fromEntries(r.params),service:s.id,tab}); }
function toast(text) { clearTimeout(state.toastTimer); $('#toast').textContent=text; $('#toast').hidden=false; state.toastTimer=setTimeout(()=>$('#toast').hidden=true,3500); }
function definition(items) { return h('dl',{class:'details'},items.flatMap(([key,value])=>[h('dt',{},key),h('dd',{},value)])); }
function serverFor(s) { return servers.find(x=>x.id===s.serverId); }
function statusFor(s) { return !serverFor(s).online ? badge('数据待更新','warn') : s.health==='not_ready'?badge('检查未通过','warn'):s.kind==='静态站点'?badge('站点可访问','good'):s.running==='running'?badge('运行中','good'):badge('未知'); }
function operationBadge(o) { const dictionary={succeeded:['核验完成','good'],failed:['核验失败','bad'],unknown:['结果未知','warn'],queued:['等待执行',''],executing:['执行中',''],verifying:['核验中','']}; const [text,tone]=dictionary[o.status]||['未知','']; return badge(text,tone); }
function pageIntro(title,description,action) { return h('div',{class:'page-intro'},h('div',{},h('h1',{},title),h('p',{},description)),action); }
function empty(title,text,action) { return h('div',{class:'empty-state'},icon('search'),h('h2',{},title),h('p',{},text),action); }
function footer() { return h('div',{class:'page-foot'},icon('shield'),'UI 交互原型 · 模拟数据与操作 · 当前会话有效'); }

function renderNavigation() {
  const r=route();
  $('#navigation').replaceChildren(h('a',{class:'brand',href:href('/products'),'aria-label':'服务地图首页'},icon('map')),
    h('nav',{class:'rail-nav','aria-label':'工作区域'},[['products','grid'],['unassigned','inbox'],['servers','server'],['operations','history']].map(([key,glyph])=>h('a',{class:'rail-link',href:href('/'+key),'aria-current':r.section===key?'page':null},h('span',{class:'icon-wrap'},icon(glyph)),h('span',{},names[key]),key==='unassigned'&&services.filter(s=>!s.productIds.length).length?h('span',{class:'nav-count','aria-label':`${services.filter(s=>!s.productIds.length).length} 项待整理`},services.filter(s=>!s.productIds.length).length):null))),
    h('div',{class:'rail-bottom'},h('a',{class:'rail-link',href:href('/settings'),'aria-current':r.section==='settings'?'page':null},h('span',{class:'icon-wrap'},icon('settings')),h('span',{},'设置')),h('span',{class:'avatar',title:'管理员 · 原型演示'},'管理')));
}
function renderToolbar() {
  const r=route();
  const tabs=r.section==='products'?[['产品台账','grid',''],['全部服务','layers','services'],['入口反查','search','endpoints']]:[[names[r.section]||'工作台',r.section==='unassigned'?'inbox':r.section==='servers'?'server':r.section==='settings'?'settings':'history','']];
  $('#toolbar').replaceChildren(h('nav',{class:'segmented','aria-label':'当前工作区'},tabs.map(([label,glyph,view])=>h('a',{href:href('/'+r.section,{view}),'aria-current':(r.params.get('view')||'')===view?'page':null},icon(glyph),label))),h('div',{class:'sync-indicator'},icon('clock'),'最近盘点 14:32',h('span',{class:'demo-label'},'原型')));
}
function searchControls(placeholder) {
  const r=route(),q=r.params.get('q')||'';
  const input=h('input',{id:'global-search',type:'search','aria-label':'搜索产品、服务、端口或域名',placeholder,value:q,onInput:e=>{if(!e.isComposing)commitSearch(e.target.value);},onCompositionEnd:e=>commitSearch(e.target.value),onKeyDown:e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();commitSearch(e.target.value);}}});
  const clear=iconButton('清除搜索',()=>{input.value='';commitSearch('');input.focus();},'close');clear.id='clear-search';clear.hidden=!q;
  const select=h('select',{class:'server-filter','aria-label':'按服务器筛选',value:r.params.get('server')||'',onChange:e=>{state.selected.clear();patchQuery({server:e.target.value});renderResults();}},h('option',{value:''},'全部服务器'),servers.map(s=>h('option',{value:s.id},s.name)));
  return h('div',{class:'search-row'},h('div',{class:'search'},icon('search'),input,clear),select);
}
function commitSearch(q) { patchQuery({q}); state.selected.clear();$('#clear-search').hidden=!q; renderResults(); }
function filterServices(items) { const p=route().params; return matchServices(p.get('q')||'',items).filter(s=>!p.get('server')||s.serverId===p.get('server')); }
function serviceTable(items,{selection=false}={}) {
  const headings=selection?['选择','服务 / 来源','服务器','入口','类型','操作']:['服务','服务器','入口','运行 / 健康','操作'];
  const header=h('thead',{},h('tr',{},headings.map((name,index)=>h('th',{scope:'col'},selection&&index===0?h('input',{type:'checkbox','aria-label':'选择当前全部记录',checked:items.length>0&&items.every(s=>state.selected.has(s.id)),onChange:e=>{items.forEach(s=>e.target.checked?state.selected.add(s.id):state.selected.delete(s.id));renderResults();}}):name))));
  const rows=items.map(s=>h('tr',{class:route().params.get('service')===s.id?'is-selected':''},selection&&h('td',{},h('input',{type:'checkbox','aria-label':`选择 ${s.name}`,checked:state.selected.has(s.id),onChange:e=>{e.target.checked?state.selected.add(s.id):state.selected.delete(s.id);renderResults();}})),
    h('td',{},h('a',{class:'name-link',href:serviceHref(s)},s.name),h('small',{},selection?s.directory:s.kind+(route().id&&s.productIds[0]!==route().id?' · 共享使用':''))),
    h('td',{},serverFor(s).name.replace(' · ',' / '),h('small',{class:'mono'},serverFor(s).address)),
    h('td',{class:'mono'},s.ports.length?s.ports.map(p=>String(p)).join(' / '):'无独立端口',h('small',{},s.endpoint?new URL(s.endpoint).hostname:'内部服务')),
    h('td',{},selection?h('span',{class:'badge'},s.kind):statusFor(s)),
    h('td',{},selection?button('关联',()=>openAssign([s.id]),'ghost tiny'):h('a',{class:'text-link',href:serviceHref(s),'aria-label':`查看 ${s.name} 详情`},'查看',icon('chevron')))));
  return h('div',{},h('div',{class:'table-shell'},h('table',{'aria-label':selection?'待整理资源':'服务清单'},header,h('tbody',{},rows))),h('div',{class:'table-footer'},`共 ${items.length} 条 · 当前展示全部匹配记录`,h('nav',{class:'pagination','aria-label':'分页'},button('上一页',null,'ghost tiny',null,{disabled:true}),h('span',{class:'page-number','aria-current':'page'},'1'),button('下一页',null,'ghost tiny',null,{disabled:true}))));
}
function productCard(p) {
  const related=services.filter(s=>s.productIds.includes(p.id)),hostCount=new Set(related.map(s=>s.serverId)).size,needs=related.some(s=>s.health==='not_ready'||!serverFor(s).online);
  return h('a',{class:'product-card',href:href('/products/'+p.id),'aria-label':`查看产品 ${p.name}`},h('div',{class:'product-top'},h('span',{class:`product-icon ${p.tone}`},icon(p.icon)),h('div',{},h('div',{class:'product-title'},p.name),h('div',{class:'product-sub'},`${related.length} 个关联服务 · ${hostCount} 台服务器`)),icon('chevron','chevron')),h('p',{class:'product-description'},p.description),h('span',{class:'product-domain'},icon('globe'),p.domain||'尚未配置入口'),h('div',{class:'product-footer'},h('span',{},p.id==='p-core'?'共享使用，归属清晰':'已确认产品归属'),needs?badge('需要关注','warn'):related.length?badge('暂无异常','good'):badge('尚无服务')));
}
function activities(limit=3) { return h('ul',{class:'activity-list'},operations.slice(0,limit).map(o=>h('li',{class:'activity-item'},h('span',{class:'activity-symbol'},icon(o.status==='succeeded'?'check':'history')),h('div',{class:'activity-copy'},h('button',{class:'text-link',type:'button',onClick:()=>openOperation(o)},`${o.name} · ${o.status==='succeeded'?'重启核验完成':o.status==='failed'?'健康检查未通过':'操作进度'}`),h('p',{},servers.find(s=>s.id===o.serverId).name,' · ',o.detail)),h('time',{},o.time)))); }
function operationFilters() {
  const options=[['all','全部记录'],['in_progress','进行中'],['succeeded','核验完成'],['failed','核验失败'],['unknown','结果未知']],requested=route().params.get('status'),status=options.some(([key])=>key===requested)?requested:'all';
  return h('div',{class:'record-filters','aria-label':'按操作结果筛选'},options.map(([key,label])=>h('button',{type:'button',id:'filter-'+key,class:'record-filter','aria-pressed':String(status===key),onClick:()=>{patchQuery({status:key==='all'?'':key});renderContent();renderContext();$('#filter-'+key)?.focus();}},label,h('span',{},filterOperations(key).length))));
}
function renderResults() {
  const target=$('#results');if(!target)return;
  const r=route(),q=r.params.get('q')||'',view=r.params.get('view')||'';
  if(r.section==='unassigned') {
    const items=filterServices(services.filter(s=>!s.productIds.length));
    replace(target,h('div',{class:'bulk-toolbar'},h('span',{'role':'status'},state.selected.size?`已选择 ${state.selected.size} 项，本次只整理产品归属`:`${items.length} 项等待确认用途与归属`),button('关联产品',()=>openAssign([...state.selected]),'primary', 'link',{disabled:!state.selected.size})),items.length?serviceTable(items,{selection:true}):empty('当前没有待整理记录','可以清除筛选，或回到产品查看已整理的服务。',button('清除筛选',clearFilters)),footer());return;
  }
  if(r.id||q||view) {
    const items=filterServices(services.filter(s=>!r.id||s.productIds.includes(r.id)));
    replace(target,h('div',{class:'section-head'},h('h2',{},q?'匹配服务':view==='endpoints'?'访问入口与监听':'关联服务'),h('span',{},`${items.length} 个服务`)),items.length?serviceTable(items):empty('没有匹配的服务','试试 8080、产品名称或域名；离线服务器的台账也会保留。',button('清除筛选',clearFilters)),footer());return;
  }
  const list=products.filter(p=>!r.params.get('server')||services.some(s=>s.productIds.includes(p.id)&&s.serverId===r.params.get('server')));
  replace(target,h('div',{class:'section-head'},h('h2',{},'我的产品'),h('span',{},`${list.length} 个产品 · 按名称整理`)),list.length?h('div',{class:'product-grid'},list.slice().sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')).map(productCard)):empty('尚未整理产品','新建一个产品，再关联发现的服务。',button('新建产品',()=>openProduct(),'primary','plus')),h('section',{class:'activity-section'},h('div',{class:'section-head'},h('h2',{},'最近操作'),h('a',{class:'text-link',href:href('/operations')},'全部记录',icon('chevron'))),activities()),footer());
}
function clearFilters() { patchQuery({q:'',server:''}); $('#global-search').value='';$('#clear-search').hidden=true;state.selected.clear();renderResults(); }
function renderContent() {
  const r=route(),main=$('#content'),p=products.find(x=>x.id===r.id);
  if(r.section==='products') {
    if(r.id&&!p) { replace(main,empty('产品不存在','这个原型会话中没有找到此产品。',h('a',{class:'button',href:href('/products')},'返回产品')));return; }
    const intro=p?h('div',{},h('div',{class:'crumb'},h('a',{href:href('/products')},'产品台账'),icon('chevron'),p.name),h('div',{class:'page-intro'},h('div',{class:'product-detail-head'},h('span',{class:`product-icon ${p.tone}`},icon(p.icon)),h('div',{},h('h1',{},p.name),h('p',{},p.description))),button('编辑产品',()=>openProduct(p),'','edit'))):pageIntro('你的产品，一目了然','从产品找到服务，也从端口找到用途。',button('新建产品',()=>openProduct(),'primary','plus'));
    replace(main,intro,!p&&h('div',{class:'notice'},icon('inbox'),h('div',{},h('strong',{},`${services.filter(s=>!s.productIds.length).length} 个服务等待整理`),h('span',{},'，给发现的资源一个清楚的归属。')),h('a',{class:'text-link',href:href('/unassigned')},'去整理',icon('arrow'))),searchControls(r.params.get('view')==='endpoints'?'输入端口或域名，例如 8080、atlas.example.com':'搜索产品、服务、端口或域名'),h('div',{id:'results'}));renderResults();
  } else if(r.section==='unassigned') {
    replace(main,pageIntro('给服务找到归属','扫描提供线索，你来确认产品关系。'),h('div',{class:'notice'},icon('info'),h('span',{},'整理只更新本地台账，不会修改或重启远端服务。')),searchControls('搜索资源名称、目录或端口'),h('div',{id:'results'}));renderResults();
  } else if(r.section==='servers') {
    replace(main,pageIntro('服务器','连接、采集覆盖与数据新鲜度，分别看清。',button('接入服务器',openServer,'primary','plus')),h('div',{class:'server-grid'},servers.map(s=>h('article',{class:'server-card'},h('div',{class:'server-card-head'},h('span',{class:`product-icon ${s.online?'blue':'lavender'}`},icon('server')),h('div',{},h('h3',{},s.name),h('p',{class:'muted mono'},s.address)),badge(s.online?'连接在线':'连接异常',s.online?'good':'warn')),h('div',{class:'server-metadata'},[['运行用户',s.user],['采集覆盖',s.coverage],['服务记录',`${services.filter(x=>x.serverId===s.id).length} 个`],['最后成功采集',s.observed]].map(([k,v])=>h('div',{},k,h('strong',{},v)))),!s.online&&h('p',{class:'server-warning'},'保留上次观察结果；服务器失联不代表服务已停止。'),s.coverage==='部分'&&h('p',{class:'server-warning'},'Nginx 部分路由未解析，已发现的记录继续保留。'),h('div',{class:'server-actions'},h('a',{class:'button tiny',href:href('/products',{view:'services',server:s.id})},'查看服务'),button('刷新盘点',()=>scanServer(s),'tiny','refresh'))))),footer());
  } else if(r.section==='operations') {
    const items=filterOperations(r.params.get('status'));
    replace(main,pageIntro('每一次操作，都有记录','执行结果与恢复核验分别记录，时间为 Asia/Shanghai。'),operationFilters(),h('div',{class:'section-head'},h('h2',{},'操作记录'),h('span',{role:'status'},`${items.length} 条匹配记录`)),items.length?h('div',{class:'table-shell'},h('table',{'aria-label':'操作历史'},h('thead',{},h('tr',{},['服务 / 时间','服务器','状态','操作'].map(t=>h('th',{scope:'col'},t)))),h('tbody',{},items.map(o=>h('tr',{},h('td',{},h('strong',{},o.name),h('small',{},o.time)),h('td',{},servers.find(s=>s.id===o.serverId).name),h('td',{},operationBadge(o)),h('td',{},button('查看记录',()=>openOperation(o),'ghost tiny'))))))):empty('当前没有此类记录','切换其他结果，或查看全部操作历史。',button('查看全部记录',()=>navigate('/operations'))),h('div',{class:'table-footer'},`台账中共有 ${operations.length} 条操作记录 · 筛选保存在地址中`),footer());
  } else if(r.section==='settings') {
    replace(main,pageIntro('设置','常用配置与管理边界。'),h('section',{class:'settings-section'},h('h2',{},'同步与日志'),setting('自动盘点间隔','界面演示；真实配置由管理端保存。',h('select',{'aria-label':'自动盘点间隔',value:state.interval,onChange:e=>{state.interval=e.target.value;toast('已更新本次原型会话的盘点间隔');}},h('option',{},'30 秒'),h('option',{},'60 秒'),h('option',{},'5 分钟'))),setting('日志默认行数','最近日志按需读取，不建立完整日志仓库。',h('span',{class:'badge'},'200 行')),setting('显示时区','操作与观察时间使用统一时区。',h('span',{class:'badge'},'Asia/Shanghai'))),h('section',{class:'settings-section'},h('h2',{},'数据与安全'),setting('导出台账','仅导出模拟产品与服务，不含凭据。',button('导出台账',exportLedger,'','arrow')),setting('完整备份与恢复','通过管理主机 CLI 完成，网页不下载含凭据数据库或主密钥。',h('span',{class:'badge'},'CLI 管理')),setting('原型会话','整理、新建和编辑仅在当前页面会话保留。',button('重置原型',()=>{state.dirty=false;location.reload();},'ghost','refresh'))),footer());
  } else replace(main,empty('页面不存在','返回产品台账继续查看。',h('a',{class:'button',href:href('/products')},'返回首页')));
}
function setting(title,description,control) { return h('div',{class:'setting-row'},h('div',{},h('h3',{},title),h('p',{},description)),control); }
function illustration() {
  return svg('svg',{viewBox:'0 0 240 170',class:'welcome-art','aria-hidden':'true'},svg('ellipse',{cx:122,cy:141,rx:73,ry:13,fill:'#f1f4f8'}),svg('path',{d:'M64 79C38 79 40 45 63 44C69 14 109 13 122 36C147 23 173 35 172 58C196 58 199 87 174 88H71',fill:'#f5f9fe',stroke:'#dbe7f4','stroke-width':1.5}),svg('path',{d:'M79 91H45V119H96M168 89H194V118H147',fill:'none',stroke:'#ccd7e8','stroke-width':1.5,'stroke-dasharray':'3 5'}),svg('rect',{x:90,y:60,width:66,height:77,rx:17,fill:'#edf1f8',stroke:'#d6e0ef'}),svg('rect',{x:82,y:53,width:66,height:77,rx:17,fill:'white',stroke:'#dce4f0','stroke-width':1.3}),svg('rect',{x:93,y:66,width:44,height:21,rx:7,fill:'#f2f5fa'}),svg('rect',{x:93,y:95,width:44,height:21,rx:7,fill:'#f2f5fa'}),svg('circle',{cx:103,cy:76,r:3,fill:'#94b5a0'}),svg('circle',{cx:103,cy:105,r:3,fill:'#94b5a0'}),svg('path',{d:'M115 76h13M115 105h13',stroke:'#afbfd5','stroke-width':2,'stroke-linecap':'round'}),svg('circle',{cx:45,cy:115,r:13,fill:'#f1edfa',stroke:'#e6ddf4'}),svg('path',{d:'M41 115l3 3 5-6',stroke:'#9a87bc',fill:'none','stroke-width':1.5}),svg('circle',{cx:192,cy:116,r:15,fill:'#eef6f1',stroke:'#ddeae1'}),svg('path',{d:'M187 116l3 3 6-7',stroke:'#7a9e88',fill:'none','stroke-width':1.5}),svg('path',{d:'M185 38v8M181 42h8M48 88v6M45 91h6',stroke:'#b6c8df','stroke-width':1.5,'stroke-linecap':'round'}));
}
function renderContext() {
  const r=route(),s=services.find(x=>x.id===r.params.get('service')),context=$('#context'); context.classList.toggle('has-detail',Boolean(s));
  if(!s) {
    if(renderTaskContext(r,context))return;
    replace(context,h('div',{class:'context-head'},h('span',{},'你的服务工作台'),h('span',{class:'demo-label'},'Service Atlas')),illustration(),h('div',{class:'welcome-copy'},h('h2',{},'部署有迹可循，',h('br'),'维护心中有数。'),h('p',{},'把散落在不同服务器上的产品和服务，',h('br'),'整理成一张清楚的地图。')),h('div',{class:'quick-stats'},[[servers.length,'台服务器'],[services.length,'个服务记录'],[products.length,'个产品']].map(([n,label])=>h('div',{class:'quick-stat'},h('strong',{},n),h('span',{},label)))),h('section',{class:'context-section'},h('h3',{},'服务器概况'),servers.map(s=>h('a',{class:'server-mini',href:href('/products',{view:'services',server:s.id})},icon('server'),h('div',{},s.name,h('small',{},s.address)),badge(s.online?'在线':'失联',s.online?'good':'warn')))),h('div',{class:'context-tip'},h('h3',{},'忘记一个端口的用途？'),h('p',{},'输入端口、域名或部署目录，从入口反查关联的产品与服务。'),h('div',{class:'example-searches'},['8080','443','atlas'].map(q=>h('button',{type:'button',onClick:()=>navigate('/products',{view:'endpoints',q})},q)))));return;
  }
  const tab=r.params.get('tab')||'summary',host=serverFor(s);
  const info=h('div',{class:'detail-stack'});
  if(tab==='summary') info.append(h('section',{},h('div',{class:'detail-section-title'},'独立状态'),[['运行',s.kind==='静态站点'?'无独立进程':s.running==='running'?'运行中':s.running==='stopped'?'已停止':'未知'],['监听',s.listening==='listening'?'正在监听':s.ports.length?'未知':'无独立监听'],['健康',s.health==='ready'?'已通过检查':s.health==='not_ready'?'检查未通过':s.health==='not_configured'?'未配置检查':'未知'],['新鲜度',host.online?'最新观察':'待更新']].map(([k,v])=>h('div',{class:'detail-state'},h('span',{class:'muted'},k),badge(v,v==='运行中'||v==='已通过检查'?'good':v==='检查未通过'||v==='待更新'?'warn':'')))),h('section',{},h('div',{class:'detail-section-title'},'服务台账'),definition([['所在服务器',host.name],['产品关系',s.productIds.length?s.productIds.map((id,index)=>products.find(p=>p.id===id)?.name+(index===0?'（主归属）':'（共享）')).join('、'):'尚未确认归属'],['管理来源',s.kind],['运行对象',s.binding],['部署目录',h('span',{class:'mono'},s.directory)],['最后观察',`${host.observed} · Asia/Shanghai`]])),h('div',{class:'detail-note'},s.notes));
  else if(tab==='endpoints') info.append(h('div',{class:'detail-note'},'监听、容器内部端口与公网入口分别登记。'),s.endpoint?h('article',{class:'endpoint-card'},h('strong',{},'已登记访问入口'),h('p',{},s.endpoint),button('复制完整地址',()=>copy(s.endpoint),'tiny','copy'),h('small',{class:'muted'},' · 示例域名')):h('p',{class:'muted small'},'此服务没有可打开的 HTTP/HTTPS 入口。'),s.ports.length?h('article',{class:'endpoint-card'},h('strong',{},'监听与端口映射'),h('p',{},s.id==='s-api'?'宿主机 TCP 0.0.0.0:8080 → 容器 TCP :3000':s.ports.map(p=>`TCP :${p}`).join(' / ')),h('p',{},host.address),button('复制端口信息',()=>copy(`${host.address} TCP ${s.ports.join('/')}`),'tiny','copy')):h('p',{class:'muted small'},'没有独立端口；这不代表服务已停止。'));
  else if(tab==='logs') info.append(h('div',{class:'detail-note'},s.log?'选择已登记来源，读取已有日志。':'尚未配置日志来源。'),s.log?h('pre',{class:'log-inline'},logLines(s).slice(0,5).join('\n')):h('p',{class:'muted small'},'先登记日志路径或管理器输出来源。'),button('展开日志阅读',()=>openLogs(s),'','terminal',{disabled:!s.log}));
  else info.append(h('div',{class:'detail-note'},'一次操作只针对本次预览中的明确实例。'),definition([['动作配置',s.restart?'重启当前管理器资源':'未启用'],['配置版本','v1'],['运行代次',String(s.generation)],['执行身份',host.user],['恢复核验',s.health==='not_configured'?'仅核验运行状态':'管理器状态 + 已配置探针']]),button('查看操作历史',()=>navigate('/operations'),'','history'));
  replace(context,h('div',{class:'context-head'},h('span',{},'服务详情'),iconButton('关闭服务详情',()=>{patchQuery({service:'',tab:''});renderContext();renderResults();$('#content').focus();},'close')),h('div',{class:'service-heading'},h('span',{class:'service-icon'},icon(s.kind==='静态站点'?'globe':s.kind==='Docker'?'box':'server')),h('div',{},h('h2',{},s.name),h('p',{},s.subtitle))),h('nav',{class:'detail-tabs','aria-label':'服务详情分区'},[['summary','概览'],['endpoints','入口'],['logs','日志'],['actions','操作']].map(([key,label])=>h('a',{href:serviceHref(s,key),class:tab===key?'active':'','aria-current':tab===key?'page':null},label))),info,h('div',{class:'detail-actions'},button('查看日志',()=>openLogs(s),'','terminal',{disabled:!s.log}),button('预览重启',()=>openRestart(s),'primary','refresh',{disabled:Boolean(restartReason(s))}),h('small',{},restartReason(s)||'本次操作只针对此实例；执行前会显示影响关系。')));
}
function renderTaskContext(r,context) {
  const configs={
    unassigned:{icon:'inbox',title:'先确认用途，\n再整理归属。',description:'发现结果提供线索，产品关系由你确认。',heading:'整理前核对',guides:[['核对来源','同名服务与相同端口在不同服务器上分别保留。'],['确认关系','没有主归属的服务可关联产品，共享关系单独标明。'],['保留运行事实','整理只更新台账，不改变进程、监听或动作权限。']],tip:'已整理的服务在哪里？',tipText:'产品台账保留服务、服务器和入口之间的关系。',link:'/products',action:'查看产品台账'},
    servers:{icon:'server',title:'连接与覆盖，\n分别看清。',description:'保留最后一次观察，避免把失联误读成停止。',heading:'三种信息，各有含义',guides:[['连接状态','表示管理端是否能连接这台服务器。'],['采集覆盖','部分采集成功时，已发现的记录继续保留。'],['数据新鲜度','连接失败后展示上次成功采集时间，等待重新观察。']],tip:'从服务器定位服务',tipText:'点击“查看服务”进入按该服务器筛选的服务台账。',link:'/products',params:{view:'services'},action:'查看全部服务'},
    operations:{icon:'history',title:'执行有记录，\n恢复有核验。',description:'从单次操作追踪目标、阶段与核验范围。',heading:'读懂操作结果',guides:[['核验完成','查看实际验证范围；未配置探针时不宣称应用健康。'],['核验失败','命令结束与应用恢复分别记录，日志帮助定位问题。'],['结果未知','先只读核验，不自动重发；明确处理后才解除目标锁。']],tip:'需要查看服务日志？',tipText:'从产品定位具体服务，再进入详情中的日志分区。',link:'/products',params:{view:'services'},action:'定位服务'},
    settings:{icon:'settings',title:'常用配置，\n清楚的边界。',description:'统一盘点、日志与时间的查看方式。',heading:'数据与管理',guides:[['轻量读取','按需读取已有日志，默认最近 200 行。'],['统一时间','观察时间和操作时间使用 Asia/Shanghai。'],['备份与恢复','完整备份通过管理主机 CLI 完成，主密钥独立备份。']],tip:'当前为交互原型',tipText:'配置和整理在本次页面会话中生效；刷新会恢复演示数据。',link:'/products',action:'返回产品台账'},
  };
  const config=configs[r.section];if(!config)return false;
  replace(context,h('div',{class:'context-head'},h('span',{},names[r.section]+' · 使用提示'),h('span',{class:'demo-label'},'Service Atlas')),h('div',{class:'context-route-icon'},icon(config.icon)),h('div',{class:'welcome-copy'},h('h2',{},config.title.split('\n').flatMap((line,index)=>index?[h('br'),line]:[line])),h('p',{},config.description)),h('section',{class:'context-section'},h('h3',{},config.heading),h('ul',{class:'context-guide'},config.guides.map(([title,copy])=>h('li',{},h('strong',{},title),h('p',{},copy))))),h('div',{class:'context-tip'},h('h3',{},config.tip),h('p',{},config.tipText),h('a',{class:'button',style:'margin-top:12px',href:href(config.link,config.params)},config.action,icon('arrow'))));return true;
}
function copy(text) { navigator.clipboard.writeText(text).then(()=>toast('已复制')).catch(()=>toast('浏览器未允许复制，请选中内容手动复制。')); }
function showModal(title,description,body,actions,{large=false,initialFocus}={}) {
  clearInterval(state.logTimer);state.logTimer=null;state.dirty=false;state.returnFocus=document.activeElement;
  const modal=$('#modal');modal.classList.toggle('large-dialog',large);
  replace(modal,h('div',{class:'dialog-head'},h('h2',{id:'modal-title'},title),iconButton('关闭对话框',requestClose,'close')),description&&h('p',{class:'dialog-description'},description),body,actions&&h('div',{class:'dialog-actions'},actions));
  if(!modal.open) modal.showModal();
  modal.querySelector(initialFocus || '.dialog-head button')?.focus();
}
function finishClose() { clearInterval(state.logTimer);state.logTimer=null;state.dirty=false;$('#modal').close(); if(state.returnFocus?.isConnected)state.returnFocus.focus();else $('#content').focus(); }
function requestClose() { if(state.dirty) $('#discard').showModal();else finishClose(); }
function field(label,id,control,errorText='') { return h('div',{class:'field'},h('label',{htmlFor:id},label),control,h('p',{class:'field-error',id:id+'-error',role:'alert'},errorText)); }
function openProduct(product) {
  const input=h('input',{id:'product-name',value:product?.name||'',maxlength:60,required:true,'aria-describedby':'product-name-error'}),desc=h('textarea',{id:'product-description',rows:3,value:product?.description||'',style:'resize: none'});
  const form=h('form',{novalidate:true,class:'form-fields',onInput:()=>state.dirty=true,onSubmit:e=>{e.preventDefault();const name=input.value.trim();if(!name||products.some(p=>p.name===name&&p.id!==product?.id)){input.setAttribute('aria-invalid','true');$('#product-name-error').textContent=!name?'请输入产品名称。':'这个产品名称已存在。';input.focus();return;}if(product){product.name=name;product.description=desc.value.trim();}else products.push({id:'p-'+Date.now(),name,description:desc.value.trim()||'尚未填写产品说明',tone:'blue',icon:'box',domain:''});state.dirty=false;finishClose();navigate('/products');render();toast(product?'产品修改已保存':'产品已创建，可以继续关联服务。');}},field('产品名称','product-name',input),field('说明（选填）','product-description',desc));
  showModal(product?'编辑产品':'新建产品','产品是业务分组，可以关联来自不同服务器的服务。',form,[button('取消',requestClose),button(product?'保存修改':'创建产品',()=>form.requestSubmit(),'primary')],{initialFocus:'#product-name'});
}
function openAssign(ids) {
  const selected=services.filter(s=>ids.includes(s.id));if(!selected.length){toast('请先选择待整理资源。');return;}
  const select=h('select',{id:'assign-product','aria-describedby':'assign-product-error',onChange:()=>state.dirty=true},h('option',{value:''},'选择一个产品'),products.map(p=>h('option',{value:p.id},p.name)));
  const form=h('form',{novalidate:true,class:'form-fields',onSubmit:e=>{e.preventDefault();try{const count=assignServices(ids,select.value);state.selected.clear();state.dirty=false;finishClose();render();toast(`已关联 ${count} 个服务，扫描将保留此次整理。`);}catch(error){select.setAttribute('aria-invalid','true');$('#assign-product-error').textContent=error.message;select.focus();}}},h('div',{class:'detail-note'},selected.map(s=>h('p',{},s.name,' · ',serverFor(s).name))),field('关联产品','assign-product',select),h('p',{class:'muted small'},'本次建立主归属。仅更新台账，不修改运行事实或启用重启。'));
  showModal(`关联 ${selected.length} 个服务`,'先核对选中的资源，再确认它们属于哪个产品。',form,[button('取消',requestClose),button('确认关联',()=>form.requestSubmit(),'primary')]);
}
function openServer() {
  const name=h('input',{id:'server-name',placeholder:'例如 华东 · 测试节点',required:true,'aria-describedby':'server-name-error'}),address=h('input',{id:'server-address',value:'192.0.2.41',required:true,'aria-describedby':'server-address-error'});
  const form=h('form',{novalidate:true,class:'form-fields',onInput:()=>state.dirty=true,onSubmit:e=>{e.preventDefault();if(!name.value.trim()){ $('#server-name-error').textContent='请输入服务器名称。';name.setAttribute('aria-invalid','true');name.focus();return;}if(!/^192\.0\.2\.\d{1,3}$/.test(address.value)||Number(address.value.split('.').pop())>254){$('#server-address-error').textContent='原型请使用 192.0.2.1–254 的示例地址。';address.setAttribute('aria-invalid','true');address.focus();return;}if(servers.some(s=>s.address===address.value)){ $('#server-address-error').textContent='此主机已接入，请使用已有服务器记录。';address.focus();return;}state.dirty=false;const candidate={id:'srv-'+Date.now(),name:name.value.trim(),address:address.value,user:'deploy',online:true,coverage:'尚未盘点',observed:'尚未采集'};showModal('核对服务器指纹','以下为模拟指纹。实际接入时必须通过独立渠道核对。',h('div',{class:'preview-target'},definition([['服务器',candidate.name],['地址',candidate.address],['算法','ED25519'],['指纹',h('span',{class:'mono'},'SHA256:DEMO-ONLY-NOT-A-REAL-HOST-KEY')]])),[button('取消接入',requestClose),button('核对并信任此指纹',()=>{servers.push(candidate);finishClose();render();toast('模拟服务器已接入，尚未开始首次盘点。');},'primary')]);}},field('服务器名称','server-name',name),field('服务器地址','server-address',address),h('div',{class:'detail-note'},'此原型不接收 SSH 凭据，也不会发起真实连接。'));
  showModal('接入服务器','先填写服务器信息，再核对主机指纹。',form,[button('取消',requestClose),button('模拟检查连接',()=>form.requestSubmit(),'primary')],{initialFocus:'#server-name'});
}
function scanServer(s) { if(state.scanPending)return;state.scanPending=true;toast('正在模拟盘点，已有记录继续保留。');setTimeout(()=>{state.scanPending=false;if(!s.online){toast('模拟连接失败：保留上次观察结果。');return;}s.observed='14:33:01';render();toast('模拟盘点完成，人工确认的归属已保留。');},900); }
function logLines(s) { return ['14:32:01.204  INFO  ['+s.name+'] process ready','14:32:02.182  INFO  configuration loaded','14:32:04.021  INFO  connected to redis-main','14:32:06.415  INFO  GET /api/health 200 3ms','14:32:08.530  INFO  server observation received',s.health==='not_ready'?'14:32:10.204  WARN  health probe: dependency timeout':'14:32:10.204  INFO  health probe passed','14:32:12.305  INFO  GET /api/products 200 12ms','14:32:14.940  INFO  request completed']; }
function openLogs(s) {
  if(!s.log)return;let lines=logLines(s),following=false,count=0;
  const output=h('pre',{class:'log-output',tabindex:0,'aria-label':`${s.name} 日志内容`},lines.join('\n'));
  const status=h('span',{class:'muted small',role:'status'},serverFor(s).online?'已读取最近日志':'已断开 · 保留已显示日志');
  const auto=h('input',{id:'auto-scroll',type:'checkbox',checked:true});
  const follow=button('开始跟随',()=>{following=!following;follow.replaceChildren(icon(following?'pause':'play'),following?'暂停跟随':'开始跟随');status.textContent=following?'跟随中 · 模拟日志流':'已暂停跟随';clearInterval(state.logTimer);if(following)state.logTimer=setInterval(()=>{count++;lines.push(`14:33:${String(count%60).padStart(2,'0')}.012  ${select.value==='stderr'?'WARN':'INFO'}  GET /api/services 200 ${8+count%12}ms`);lines=lines.slice(-200);output.textContent=lines.join('\n');if(auto.checked)output.scrollTop=output.scrollHeight;},1200);},'tiny','play',{disabled:!serverFor(s).online});
  const select=h('select',{'aria-label':'日志来源',onChange:()=>{following=false;clearInterval(state.logTimer);follow.replaceChildren(icon('play'),'开始跟随');lines=logLines(s).map(l=>l.replace('INFO',select.value==='stderr'?'WARN':'INFO'));output.textContent=lines.join('\n');status.textContent='已切换日志来源';}},h('option',{value:'stdout'},s.kind==='静态站点'?'Nginx 访问日志':'应用标准输出'),h('option',{value:'stderr'},'错误输出'));
  showModal(`${s.name} 的日志`,`${serverFor(s).name} · ${s.binding}`,h('div',{},h('div',{class:'log-toolbar'},select,h('label',{class:'check-line',style:'margin:0',htmlFor:'auto-scroll'},auto,'自动滚动'),follow,button('刷新',()=>{lines=logLines(s).map(l=>l.replace('INFO',select.value==='stderr'?'WARN':'INFO'));output.textContent=lines.join('\n');toast('最近日志已刷新（模拟）');},'tiny','refresh',{disabled:!serverFor(s).online})),output,h('div',{class:'log-source'},status,' · 最近 200 行 · 演示输出')),null,{large:true});
}
function openRestart(s) {
  const reason=restartReason(s);if(reason){toast(reason);return;}
  const target=h('div',{class:'preview-target'},h('h3',{},s.name),definition([['目标服务器',serverFor(s).name],['运行资源',s.binding],['运行代次',String(s.generation)],['配置版本','v1'],['执行身份',serverFor(s).user],['影响产品',s.productIds.map(id=>products.find(p=>p.id===id).name).join('、')],['验证方式',s.health==='not_configured'?'管理器运行状态；未验证应用健康':'运行状态 + 已配置健康检查']]));
  const scenarios=h('div',{},h('p',{class:'scenario-label'},'演示结果：用于预览不同操作状态'),h('div',{class:'scenario-options'},[['success','恢复成功'],['failed','检查失败'],['unknown','连接中断']].map(([value,label])=>h('label',{},h('input',{type:'radio',name:'scenario',value,checked:value==='success'}),label))));
  showModal('预览重启','本次操作只针对以下实例。提交后不会因关闭页面而重复执行。',h('div',{},target,h('div',{class:'risk-note'},'影响范围基于已登记的产品关系。共享服务可能影响多个产品；命令完成与应用恢复会分别核验。'),scenarios),[button('取消',requestClose),button('执行重启',()=>startRestart(s,$('#modal input[name="scenario"]:checked').value),'danger','refresh')],{initialFocus:'.dialog-actions .button'});
}
function startRestart(s,scenario) {
  const reason=restartReason(s);if(reason){toast(reason);return;}
  const op={id:'op-'+Date.now(),serviceId:s.id,name:s.name,serverId:s.serverId,status:'queued',time:'刚刚',detail:'模拟操作已提交，等待执行。'};operations.unshift(op);openOperation(op);
  const advance=(status,detail,delay)=>setTimeout(()=>{op.status=status;op.detail=detail;if(status==='succeeded'){s.generation++;s.running='running';if(s.health!=='not_configured')s.health='ready';}if(status==='failed'&&s.health!=='not_configured')s.health='not_ready';if($('#modal').open&&$('#operation-progress')?.dataset.id===op.id)updateOperation(op);if(route().section==='operations')renderContent();else renderResults();renderContext();},delay);
  advance('executing','模拟重启命令正在执行。',650);advance('verifying','命令已结束，正在核验运行状态与已配置检查。',1500);
  advance(scenario==='success'?'succeeded':scenario==='failed'?'failed':'unknown',scenario==='success'?(s.health==='not_configured'?'重启完成，已验证运行状态；未验证应用健康。':'重启完成，运行状态与已配置健康检查通过。'):scenario==='failed'?'命令已完成，但健康检查未通过，请查看应用日志。':'无法确认本次操作是否完成，目标已锁定，系统不会自动重发。',2600);
}
function progress(op) { const states=['queued','executing','verifying','succeeded'],index=states.indexOf(op.status);return h('div',{class:'steps'},['提交','执行','核验','结果'].map((label,i)=>h('div',{class:`step ${i===index||i===3&&['failed','unknown'].includes(op.status)?'current':i<index?'done':''}`},h('span',{class:'step-circle'},i<index?icon('check'):i+1),label))); }
function openOperation(op) {
  const body=h('div',{id:'operation-progress','data-id':op.id});showModal(`${op.name} 的操作记录`,'操作记录保留执行与核验范围，可关闭后从操作历史继续查看。',body,null);updateOperation(op);
}
function updateOperation(op) {
  const body=$('#operation-progress');if(!body)return;const previousFocus=body.contains(document.activeElement)?document.activeElement.textContent:null;const busy=['queued','executing','verifying'].includes(op.status);
  replace(body,progress(op),h('div',{class:'preview-target'},definition([['操作目标',op.name],['服务器',servers.find(s=>s.id===op.serverId).name],['时间',`${op.time} · Asia/Shanghai`],['当前状态',operationBadge(op)]])),h('div',{class:op.status==='failed'?'form-error':op.status==='unknown'?'risk-note':'detail-note',role:'status'},op.detail),op.status==='unknown'&&h('div',{class:'dialog-actions'},button('只读核验当前状态',()=>{op.detail='当前只读观察显示资源运行中，但无法归因于本次操作；旧操作仍为结果未知。';updateOperation(op);},'','search'),button(op.unlocked?'目标已解锁':'处理未知结果',()=>openUnlock(op),'',null,{disabled:Boolean(op.unlocked)})),op.status==='failed'&&h('div',{class:'dialog-actions'},button('查看日志',()=>openLogs(services.find(s=>s.id===op.serviceId)),'','terminal')),h('div',{class:'dialog-actions'},button(busy?'关闭并后台继续':'关闭',requestClose,'primary')));
  if(previousFocus){const buttons=Array.from(body.querySelectorAll('button'));(buttons.find(b=>b.textContent===previousFocus)||buttons.at(-1))?.focus();}
}
function openUnlock(op) {
  const check=h('input',{id:'unlock-ack',type:'checkbox',onChange:()=>submit.disabled=!check.checked});const submit=button('解锁目标',()=>{op.unlocked=true;op.detail='目标已解锁，此前操作结果仍未知；再次操作必须重新预览。';openOperation(op);renderContext();toast('目标已解锁（模拟），旧记录仍为结果未知。');},'danger',null,{disabled:true});
  showModal('处理未知结果','解锁只解除阻断，不发送远程命令，也不会把旧操作改为成功。',h('div',{},h('div',{class:'risk-note'},op.name,' · ',op.detail),h('label',{class:'check-line',htmlFor:'unlock-ack'},check,'我理解此前操作结果仍未知，解锁后再次操作可能重复重启。')),[button('取消',requestClose),submit]);
}
function exportLedger() { const blob=new Blob([JSON.stringify({products,services},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=h('a',{href:url,download:'service-atlas-demo.json'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast('模拟台账已导出'); }
function render() { const r=route();state.pageKey=r.path+'|'+(r.params.get('view')||'');document.title=`${r.params.get('service')?services.find(s=>s.id===r.params.get('service'))?.name||'服务详情':r.id?products.find(p=>p.id===r.id)?.name||'产品':names[r.section]||'页面不存在'} — 服务地图`;renderNavigation();renderToolbar();renderContent();renderContext(); }
$('.skip-link').addEventListener('click',event=>{event.preventDefault();$('#content').focus();});
$('#modal').addEventListener('cancel',event=>{event.preventDefault();requestClose();});
$('#keep-editing').addEventListener('click',()=>$('#discard').close());
$('#discard-editing').addEventListener('click',()=>{$('#discard').close();state.dirty=false;finishClose();});
window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('hashchange',()=>{const r=route(),pageChanged=state.pageKey!==r.path+'|'+(r.params.get('view')||'');state.selected.clear();render();$('#context').scrollTop=0;if(pageChanged){window.scrollTo({top:0,behavior:'instant'});$('#content').focus({preventScroll:true});}});
render();
