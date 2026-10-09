export const servers = [
  { id: 'srv-1', name: '华东 · 主节点', address: '192.0.2.11', region: '上海', user: 'deploy', online: true, coverage: '完整', observed: '14:32:08' },
  { id: 'srv-2', name: '华南 · 应用节点', address: '192.0.2.21', region: '广州', user: 'deploy', online: true, coverage: '部分', observed: '14:32:12' },
  { id: 'srv-3', name: '备份 · 实验节点', address: '192.0.2.31', region: '北京', user: 'ops', online: false, coverage: '待更新', observed: '13:48:06' },
];
export const products = [
  { id: 'p-atlas', name: '服务地图', description: '把产品、服务与入口连接在一起', tone: 'blue', icon: 'map', domain: 'atlas.example.com' },
  { id: 'p-notes', name: '拾光笔记', description: '记录想法，留住每一个灵感', tone: 'lavender', icon: 'book', domain: 'notes.example.com' },
  { id: 'p-store', name: '轻舟商城', description: '商品、订单与支付的应用服务', tone: 'peach', icon: 'bag', domain: 'shop.example.com' },
  { id: 'p-core', name: '共享基础设施', description: '多个产品共用的网关与数据服务', tone: 'sage', icon: 'layers', domain: '多个产品共享' },
];
export const services = [
  { id: 's-api', name: 'atlas-api', subtitle: '服务地图 API', serverId: 'srv-1', kind: 'Docker', productIds: ['p-atlas'], ports: [8080,3000], endpoint: 'https://atlas.example.com/api', directory: '/opt/service-atlas', binding: 'atlas-api · 7b2f9c', generation: 4, running: 'running', listening: 'listening', health: 'ready', restart: true, log: true, notes: '处理台账查询与服务器同步；宿主机 8080 映射容器 3000。' },
  { id: 's-web', name: 'atlas-web', subtitle: '服务地图前端', serverId: 'srv-1', kind: '静态站点', productIds: ['p-atlas'], ports: [], endpoint: 'https://atlas.example.com', directory: '/var/www/service-atlas', binding: 'Nginx 静态路由', generation: 1, running: 'unknown', listening: 'unknown', health: 'ready', restart: false, log: true, notes: '静态站点，由共享 Nginx 提供访问，没有独立运行进程。' },
  { id: 's-sync', name: 'atlas-sync', subtitle: '后台盘点任务', serverId: 'srv-2', kind: 'systemd', productIds: ['p-atlas'], ports: [], endpoint: '', directory: '/opt/service-atlas', binding: 'atlas-sync.service', generation: 2, running: 'running', listening: 'unknown', health: 'not_configured', restart: true, log: true, notes: '定时同步运行事实；后台任务没有监听端口。' },
  { id: 's-notes', name: 'notes-api', subtitle: '笔记后端', serverId: 'srv-2', kind: 'PM2', productIds: ['p-notes'], ports: [8080], endpoint: 'https://notes.example.com/api', directory: '/opt/notes-api', binding: 'deploy · PM2_HOME=/home/deploy/.pm2 · notes-api', generation: 3, running: 'running', listening: 'listening', health: 'ready', restart: true, log: true, notes: '相同的 8080 端口位于不同服务器，属于独立入口。' },
  { id: 's-notes-web', name: 'notes-web', subtitle: '笔记前端', serverId: 'srv-2', kind: '静态站点', productIds: ['p-notes'], ports: [], endpoint: 'https://notes.example.com', directory: '/var/www/notes', binding: 'Nginx 静态路由', generation: 1, running: 'unknown', listening: 'unknown', health: 'ready', restart: false, log: true, notes: '笔记应用的静态资源。' },
  { id: 's-store', name: 'store-api', subtitle: '商城 API', serverId: 'srv-1', kind: 'Docker', productIds: ['p-store'], ports: [9000,8080], endpoint: 'https://shop.example.com/api', directory: '/opt/store', binding: 'store-api · 9da31f', generation: 6, running: 'running', listening: 'listening', health: 'not_ready', restart: true, log: true, notes: '运行与监听正常，但已配置健康检查未通过，需要排查应用日志。' },
  { id: 's-store-web', name: 'store-web', subtitle: '商城前端', serverId: 'srv-1', kind: '静态站点', productIds: ['p-store'], ports: [], endpoint: 'https://shop.example.com', directory: '/var/www/store', binding: 'Nginx 静态路由', generation: 1, running: 'unknown', listening: 'unknown', health: 'ready', restart: false, log: true, notes: '商城静态网站。' },
  { id: 's-nginx', name: 'nginx-gateway', subtitle: '共享访问网关', serverId: 'srv-1', kind: 'Nginx', productIds: ['p-core','p-atlas','p-notes','p-store'], ports: [80,443], endpoint: '', directory: '/etc/nginx', binding: 'nginx.service', generation: 1, running: 'running', listening: 'listening', health: 'not_configured', restart: false, log: true, notes: '443 由多个产品共享。首版只读，不提供 Nginx 重启。' },
  { id: 's-redis', name: 'redis-main', subtitle: '共享缓存', serverId: 'srv-1', kind: 'Docker', productIds: ['p-core','p-atlas','p-store'], ports: [6379], endpoint: '', directory: '/opt/redis', binding: 'redis-main · 301fa2', generation: 2, running: 'running', listening: 'listening', health: 'not_configured', restart: true, log: true, notes: '此服务被多个产品使用；操作预览列出已登记影响关系。' },
  { id: 's-worker', name: 'image-worker', subtitle: '待确认用途', serverId: 'srv-2', kind: 'PM2', productIds: [], ports: [], endpoint: '', directory: '/opt/image-worker', binding: 'deploy · image-worker', generation: 1, running: 'running', listening: 'unknown', health: 'not_configured', restart: false, log: true, notes: '发现于 PM2，建议归属轻舟商城，等待人工确认。' },
  { id: 's-preview', name: 'preview-server', subtitle: '待整理服务', serverId: 'srv-2', kind: '未托管', productIds: [], ports: [5173], endpoint: '', directory: '/opt/preview', binding: '运行身份未确认', generation: 1, running: 'running', listening: 'listening', health: 'not_configured', restart: false, log: false, notes: '只有端口和目录线索，尚未登记可靠的重启方式。' },
  { id: 's-backup', name: 'backup-job', subtitle: '保留上次观察结果', serverId: 'srv-3', kind: 'systemd', productIds: [], ports: [], endpoint: '', directory: '/opt/backups', binding: 'backup-job.service', generation: 1, running: 'unknown', listening: 'unknown', health: 'unknown', restart: true, log: true, notes: '服务器暂时无法连接，不能把上次观测解释为已停止。' },
];
export const operations = [
  { id: 'op-1', serviceId: 's-api', name: 'atlas-api', serverId: 'srv-1', status: 'succeeded', time: '14:18:42', detail: '运行状态已恢复，已配置健康检查通过。' },
  { id: 'op-2', serviceId: 's-notes', name: 'notes-api', serverId: 'srv-2', status: 'succeeded', time: '昨天 18:06', detail: '已核验 PM2 运行状态与健康检查。' },
  { id: 'op-3', serviceId: 's-store', name: 'store-api', serverId: 'srv-1', status: 'failed', time: '昨天 16:32', detail: '命令已完成，但健康检查未通过。' },
];
export function filterOperations(status, items = operations) {
  if (status === 'in_progress') return items.filter(o=>['queued','executing','verifying'].includes(o.status));
  if (['succeeded','failed','unknown'].includes(status)) return items.filter(o=>o.status===status);
  return items;
}
export function matchServices(query, items = services) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(s => /^\d+$/.test(q) ? s.ports.includes(Number(q)) : [s.name,s.subtitle,s.endpoint,s.directory,servers.find(x=>x.id===s.serverId)?.name,...s.productIds.map(id=>products.find(p=>p.id===id)?.name)].join(' ').toLowerCase().includes(q));
}
export function assignServices(ids, productId) {
  if (!products.some(p=>p.id===productId)) throw new Error('请选择有效产品。');
  const targets = ids.map(id=>services.find(s=>s.id===id));
  if (!targets.length || targets.some(s=>!s || s.productIds.length)) throw new Error('选中记录已发生变化，请重新选择待整理资源。');
  for (const s of targets) s.productIds = [productId];
  return targets.length;
}
export function restartReason(service) {
  if (!service) return '服务不存在。';
  if (!servers.find(s=>s.id===service.serverId)?.online) return '服务器暂时无法连接，请先检查接入。';
  if (operations.some(o=>o.serverId===service.serverId && ['queued','executing','verifying','unknown'].includes(o.status) && !o.unlocked)) return '此服务器有活动操作或未知结果，新的写操作已暂停。';
  if (!service.restart) return service.kind==='静态站点'?'此站点没有独立运行进程，无需独立重启。':service.kind==='Nginx'?'共享 Nginx 首版只读。':'尚未登记可靠的重启方式。';
  return '';
}
