const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const box = { window: null }; box.window = box;
vm.createContext(box);
for (const file of ['business-data.js', 'business-flow.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), box);
const flow = (kind, text, selected) => box.HM_FLOW.prepare(kind, text, { userId: 'sales', selected });
const examples = vm.runInContext('(' + html.match(/const EXAMPLES = ([\s\S]*?);\s*const PROGRESS/)[1] + ')', box);
for (const name of ['detectKind', 'resolveKind']) vm.runInContext(html.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n    }'))[0], box);

test('all inline and external JavaScript parses', () => {
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  new vm.Script(fs.readFileSync(path.join(root, 'business-view.js'), 'utf8'));
});
for (const [kind, rows] of Object.entries(examples)) {
  for (const row of rows) test(`${kind} / ${row.intent}: coherent trace and deliverable`, () => {
    assert.equal(box.resolveKind(row.text, kind), kind);
    const p = flow(kind, row.text);
    assert.ok(p.record, p.message);
    assert.equal(p.record.trace, p.trace);
    assert.ok(p.record.presentation.sections.length);
    assert.equal(p.record.ownerId, '');
    assert.equal(p.record.project, '');
    assert.ok(['处理中','待审核','待技术确认','待商务确认'].includes(p.record.status));
    for (const key of p.record.sourceKeys) assert.ok(box.HM_BUSINESS.documents[key]);
    assert.doesNotMatch(JSON.stringify(p), /演示|模拟|种子/);
  });
}
test('missing facts stop without a record, then resume the same request', () => {
  const first = '报价生成：HM-ESS-8K 2 台';
  assert.equal(flow('方案报价', first).record, null);
  const r = flow('方案报价', first + '\n补充：地区华东').record;
  assert.equal(r.published.amount, '¥14,400');
  assert.equal(r.status, '待审核');
});
test('negative instruction retains a visible draft without review', () => {
  assert.equal(flow('方案报价', '华东 HM-ESS-8K 1 台，不送审').record.status, '处理中');
});
test('missing contract body and unknown document cannot produce checks', () => {
  assert.equal(flow('合同管理', '检查合同').record, null);
  assert.equal(flow('合同管理', '检查 CT-2026-999').record, null);
  const r = flow('合同管理', '合同正文载明 HM-ESS-8K，总额 8,000 元，付款 30%').record;
  assert.match(r.presentation.summary, /无法核实/);
  assert.equal(r.sourceKeys.length, 0);
  assert.ok(r.localSources[0].text.includes('8,000'));
});
test('expired mandatory material blocks review and replacement clears the blocker', () => {
  const input = '标书检查 TB-2026-032，厂家授权已过期';
  const r = flow('标书管理', input).record;
  assert.equal(r.reviewBlocked, true);
  assert.equal(r.status, '处理中');
  const updated = flow('标书管理', input + '\n补充：已补充有效厂家授权 MAT-A02，有效至 2026-12-31').record;
  assert.equal(updated.reviewBlocked, false);
  assert.equal(updated.status, '待审核');
});
test('configuration quotation requires the exact checked configuration', () => {
  assert.equal(flow('方案报价', '华东，当前配置报价').record, null);
  const selected = flow('产品选型', '负荷8kW，220V单相，华东').record;
  selected.id = 'S-test';
  assert.ok(flow('方案报价', '华东，当前配置报价', selected).record.published);
  selected.quoteEligible = false;
  assert.equal(flow('方案报价', '华东，当前配置报价', selected).record, null);
});
test('diagnostic observations follow execution, and continued reports stop at the cap', () => {
  const input = examples['故障诊断'][0].text;
  const r = flow('故障诊断', input).record;
  assert.equal(r.formalTicket, '');
  assert.equal(r.accepted, false);
  assert.equal(r.rounds, 2);
  const phases = r.trace.filter(s => ['Plan','Execute','Observe','Reasoning','Reflect'].includes(s.phase)).map(s=>s.phase);
  assert.equal(phases.join(','), 'Plan,Execute,Observe,Reasoning,Reflect,Plan,Execute,Observe,Reasoning,Reflect');
  r.id = 'D-test';
  const r2 = flow('故障诊断', input + '\n补充：固件 V1.4，暂无完整日志', r).record;
  assert.equal(r2.rounds, 3);
  assert.equal(r2.calls, 3);
  assert.equal(flow('故障诊断', input + '\n补充：继续诊断', r2).record, null);
  assert.equal(flow('故障诊断', 'HM-ESS-8K 离线').record, null);
});
test('emergency risk overrides the selected intent', () => {
  assert.equal(box.resolveKind('设备冒烟，帮我报价', '方案报价'), '紧急风险');
});
test('unavailable price and unsupported selection are not counted as deliverables', () => {
  assert.equal(flow('方案报价', '欧洲 HM-ESS-8K 1 台').record.deliverable, false);
  assert.equal(flow('产品选型', '海上平台 8kW，220V单相').record.deliverable, false);
});
test('checking a supplied quotation detects amount mismatch without sending it for review', () => {
  const r = flow('方案报价', '报价检查：华东 HM-ESS-8K 2 台，金额 7,200').record;
  assert.match(r.presentation.summary, /差异/);
  assert.equal(r.status, '处理中');
  assert.equal(r.published.amount, '¥14,400');
});
test('multiple devices cannot bypass configuration checks by naming each product', () => {
  assert.equal(flow('方案报价', '华东，HM-ESS-8K 1 台，HM-BAT-5 1 组，请报价').record, null);
});
test('explicit model and region corrections take precedence over previous input', () => {
  assert.ok(flow('方案报价', '华东 HM-UNKNOWN 1 台\n补充：型号为 HM-ESS-8K').record.published);
  assert.ok(flow('方案报价', '欧洲 HM-ESS-8K 1 台\n补充：地区更正为华东').record.published);
});
