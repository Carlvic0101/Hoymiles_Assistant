/* Presentation layer for the local fixtures in business-data.js. */
function businessSources(record) {
  if (record.emergency) return '';
  const keys = record.sourceKeys || { selection: ['product', 'compatibility'], quote: ['price'], bid: ['tender', 'qualification'], contract: ['contract', 'price'], diagnosis: ['device', 'fault'] }[record.type] || [];
  const documents = keys.map(key => HM_BUSINESS.documents[key]).filter(Boolean).concat(record.localSources || []);
  if (!documents.length) return '';
  const en = state.lang === 'en';
  const heading = en ? 'Sources & references' : '资料与依据';
  const entries = documents.map((doc, index) => {
    return '<details class="source-document"><summary><span class="source-number">' + (index + 1) + '</span><span><strong>' + esc(doc.title) + '</strong><small>' + esc(doc.id + ' · ' + doc.version + ' · ' + doc.section) + '</small></span><span class="source-open">' + (en ? 'View' : '查看') + '</span></summary><div class="source-body"><p class="source-meta">' + esc(doc.collection + ' · ' + doc.date) + '</p><p>' + esc(doc.text) + '</p></div></details>';
  }).join('');
  return '<section class="source-panel"><div class="source-heading"><h3>' + heading + '</h3><span>' + documents.length + (en ? ' documents' : ' 份资料') + '</span></div>' + entries + '</section>';
}

function businessFollowups(choices, id) {
  if (!choices || !choices.length) return '';
  return '<div class="business-followups"><span>继续处理</span>' + choices.map(text => '<button type="button" data-act="business-followup" data-id="' + esc(id || '') + '" data-text="' + esc(text) + '">' + esc(text) + '<span aria-hidden="true">↗</span></button>').join('') + '<small>选择后填入输入框，确认后发送</small></div>';
}

function businessTrace(steps, scope, shown) {
  if (scope === 'live') {
    const current = steps[Math.max(0, Math.min((shown || 1) - 1, steps.length - 1))];
    return '<section class="business-running" role="status" aria-live="polite"><span class="processing-dot" aria-hidden="true"></span><div><strong>处理中</strong><p>' + esc(current.title) + '</p></div></section>';
  }
  return '<details class="business-process"><summary><span>业务执行过程</span><small>' + steps.length + ' 个步骤 · 查看输入、检查及依据</small></summary><ol>' + steps.map(s => '<li><div class="process-title"><strong>' + esc(s.title) + '</strong><span class="process-outcome' + (/失败|待|未执行/.test(s.ok) ? ' needs-attention' : '') + '">' + esc(s.ok) + '</span></div><dl><dt>采用信息</dt><dd>' + esc(s.input || '—') + '</dd><dt>处理结果</dt><dd>' + esc(s.output || '—') + '</dd>' + (s.source ? '<dt>依据</dt><dd>' + esc(s.source) + '</dd>' : '') + '</dl></li>').join('') + '</ol></details>';
}

function businessResult(record, limit) {
  const p = record.presentation;
  if (limit === 0) return '<div class="business-running" role="status">正在整理结果</div>';
  const status = record.status;
  const summary = record.technicalConfirmed ? '已由技术人员确认配置适用性，可用于后续报价准备。' : p.summary;
  const head = '<header class="business-result-head"><div><p class="result-eyebrow">' + esc(TYPE_NAME[record.type]) + ' · ' + esc(record.id) + '</p><h2>' + esc(record.title) + '</h2></div><span class="badge ' + (status === '已通过' || status === '已发布' ? 'signal' : 'caution') + '">' + esc(status) + '</span></header>';
  const metadata = [['结果版本', record.version], ['客户 / 项目', record.archived ? (NAMES[record.ownerId] || record.customerName || '已归档') + ' / ' + record.project : '采纳时确认'], ['保存状态', record.archived ? '已归档' : '当前会话']];
  let content = '<div class="business-summary"><strong>本次结论</strong><p>' + esc(summary) + '</p></div>';
  content += '<dl class="business-meta">' + metadata.map(([k,v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v || '—') + '</dd></div>').join('') + '</dl>';
  if (limit === 1) return '<section class="business-result">' + head + content + '</section>';
  // Progress is live. Explanations must not keep claiming "waiting for review" after approval.
  const notices = p.notices.filter(n => !/结果先保留|内容已生成，尚未送审|等待审核/.test(n));
  if (record.archived) notices.push('已采纳并归档。归档不等于审核通过、对外发布或正式报修。');
  else notices.push(record.deliverable === false ? '当前仅为处理说明；补齐依据后再生成可采纳的结果。' : '采纳时再确认客户、地区和项目；当前尚未归档。');
  if (record.type === 'quote') notices.unshift(status === '已发布' ? '报价已发布；后续变更需保留原版本。' : status === '待发布' ? '审核已通过，仍需另行发布。' : status === '待审核' ? '当前待审核；通过后仍需另行发布。' : '报价内容仅供当前处理；尚未送审或对外发布。');
  content += '<aside class="business-notices" aria-label="边界与待办"><ul>' + notices.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></aside>';
  if (record.type === 'diagnosis') {
    const dimensions = [['任务交付','阶段报告已生成'],['原因确认','尚未确定'],['设备恢复','尚未验证'],['工单提交',record.formalTicket ? '已提交' : '草稿未提交'],['人员接单',record.accepted ? '已取得接单回执' : '未取得回执']];
    content += '<section class="diagnosis-state"><h3>分别跟踪处理结果</h3><div>' + dimensions.map(([k,v]) => '<article><span>' + k + '</span><strong>' + v + '</strong></article>').join('') + '</div><p class="muted">已用 ' + record.rounds + ' 轮 · ' + record.calls + ' 次资料处理' + (record.formalTicket ? ' · 工单号 ' + esc(record.formalTicket) + '（仅本助手内有效，不代表已派工）' : ' · 工单草稿 ' + esc(record.draftTicket) + '，尚无正式工单号') + '</p></section>';
  }
  content += p.sections.map((section, i) => {
    let body = section.headers ? businessTable(section.headers, section.rows) : section.chapters ? section.chapters.map(chapter => '<details class="business-chapter" open><summary>' + esc(chapter.title) + '</summary><p>' + esc(chapter.text) + '</p></details>').join('') : '<p class="business-copy">' + esc(section.text || '') + '</p>';
    if (section.title === '分项检查' && record.technicalConfirmed) body = businessTable(['检查项','结果','依据'], record.checks.map(c => [c.name,c.result,'人工技术确认']));
    return '<section class="business-section"><h3><span>' + String(i + 1).padStart(2,'0') + '</span>' + esc(section.title) + '</h3>' + body + '</section>';
  }).join('');
  const handling = [];
  if (record.businessApproved) handling.push('业务批准：已由 ' + (NAMES[record.businessApprovedBy] || '授权同事') + ' 完成。报价仍需独立审核和发布。');
  if (record.submissionArchived) handling.push('标书提交归档：' + (record.submissionKind || '已记录') + '；采纳状态以人工更新为准。');
  if (record.bidReviewed) handling.push('标书人工审核：已完成。');
  if (record.bidAdopted != null) handling.push('标书采纳：' + (record.bidAdopted ? '已采纳' : '未采纳'));
  if (record.signingStatus) handling.push('业务人员登记的签署状态：' + record.signingStatus);
  if (record.internalComment) handling.push('内部处理意见：' + record.internalComment);
  if (handling.length) content += '<section class="business-section"><h3>后续处理记录</h3><p class="business-copy">' + esc(handling.join('\n')) + '</p></section>';
  content += businessSources(record) + businessFollowups(p.next, record.id);
  return '<section class="business-result" data-result-id="' + esc(record.id) + '">' + head + content + '</section>';
}
function businessTable(headers, rows) {
  return '<div class="business-table-wrap" tabindex="0" role="region" aria-label="' + (state.lang === 'en' ? 'Business details' : '业务明细') + '"><table class="business-table"><thead><tr>' + headers.map(x => '<th scope="col">' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
function businessDetail(record) {
  if (record.emergency) return '';
  if (record.type === 'quote' && record.priceRows) {
    return businessTable(['费用项', '数量', '含税单价', '小计'], record.priceRows.map(r => [r.name, r.qty, '¥' + r.price.toLocaleString('en-US'), '¥' + (r.qty * r.price).toLocaleString('en-US')]));
  }
  if (record.type === 'selection' && record.models && record.models.length) {
    const rows = record.models.map(m => {
      const p = HM_BUSINESS.products.find(p => p.code === m.name);
      return [m.name, p ? p.category : '待确认', p ? (p.power || p.capacity || '—') : '待确认', p ? (p.grid || '—') : '待确认'];
    });
    return businessTable(['候选型号', '设备类别', '额定参数', '适用电网'], rows);
  }
  return '';
}
