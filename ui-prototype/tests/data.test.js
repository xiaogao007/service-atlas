import test from 'node:test';
import assert from 'node:assert/strict';
import { services, products, operations, matchServices, filterOperations, assignServices, restartReason } from '../dist/data.js';

test('操作筛选保留未知结果，进行中只含尚未结束的阶段', () => {
  const records=['queued','executing','verifying','succeeded','failed','unknown'].map(status=>({status}));
  assert.deepEqual(filterOperations('in_progress',records).map(o=>o.status),['queued','executing','verifying']);
  assert.deepEqual(filterOperations('unknown',records).map(o=>o.status),['unknown']);
  assert.deepEqual(filterOperations('failed',records).map(o=>o.status),['failed']);
  assert.equal(filterOperations('',records),records);
  assert.equal(filterOperations('invalid',records),records);
});

test('端口查询跨服务器返回独立资源，并同时匹配容器端口', () => {
  const matches = matchServices('8080');
  assert.deepEqual(matches.map(s=>s.id), ['s-api','s-notes','s-store']);
  assert.equal(new Set(matches.map(s=>s.serverId)).size, 2);
  assert.equal(matchServices('3000')[0].id, 's-api');
  assert.equal(matchServices('80').some(s=>s.id==='s-api'), false);
  assert.equal(matchServices('ATLAS.EXAMPLE.COM').some(s=>s.id==='s-api'), true);
});
test('归属冲突时整批不修改，成功后保留人工归属', () => {
  const worker = services.find(s=>s.id==='s-worker');
  assert.throws(()=>assignServices(['s-worker','s-api'],products[0].id));
  assert.deepEqual(worker.productIds, []);
  assert.equal(assignServices(['s-worker'],'p-store'), 1);
  assert.deepEqual(worker.productIds, ['p-store']);
  worker.productIds = [];
});
test('离线、静态站点、共享 Nginx、未知结果和并发写动作均阻止重启', () => {
  const api=services.find(s=>s.id==='s-api');
  assert.equal(restartReason(api), '');
  for(const id of ['s-backup','s-nginx','s-web','s-preview']) assert.notEqual(restartReason(services.find(s=>s.id===id)), '');
  for(const status of ['queued','executing','verifying','unknown']) {
    const op={id:'test-op',serverId:api.serverId,status};operations.push(op);
    assert.notEqual(restartReason(api), '');
    op.unlocked=true;assert.equal(restartReason(api), '');
    operations.pop();
  }
});
