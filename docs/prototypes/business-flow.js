/* Local, fictional workflow fixtures for frontend presentation only. No service calls. */
(function () {
  const step = (title, input, output, source = '', ok = '成功', phase = '执行') => ({ title, input, output, source, ok, phase, kind: '业务处理', business: true });
  const table = (title, headers, rows) => ({ title, headers, rows });
  const textSection = (title, text) => ({ title, text });
  const money = n => '¥' + n.toLocaleString('en-US');
  const docs = () => HM_BUSINESS.documents;
  function prepare(kind, input, context = {}) {
    const amendments = input.split('\n补充：');
    const correctedModel = amendments.at(-1).match(/型号(?:为|更正为|改为)\s*(HM-[A-Z0-9-]+)/)?.[1];
    if (amendments.length > 1 && correctedModel) input = amendments.slice(0,-1).join('\n补充：').replace(/HM-[A-Z0-9-]+/g, correctedModel) + '\n补充：' + amendments.at(-1);
    const trace = [step('确认本次目标', input, kind + '；只处理当前请求，不扩大操作范围。'), step('核对资料范围与归属', context.selected ? context.selected.id + ' / ' + context.selected.version : '当前输入及明确引用的资料', context.selected ? '仅引用当前选定版本，不借用其他项目；本次新结果在采纳归档时确认客户与项目。' : '本次尚未绑定客户和项目，不阻止处理；生成结果后再确认归档归属。', '当前会话')];
    const plan = { kind, input, trace, record: null, blocked: false, choices: [] };
    const wait = (message, choices = []) => {
      plan.blocked = true; plan.message = message; plan.choices = choices;
      trace.push(step('补齐必要信息', input, message, '当前输入', '待补充'));
      trace.push(step('暂停依赖步骤', '前置条件尚未齐备', '未生成业务结果，也未送审。补充后继续当前任务。', '', '未执行'));
      return plan;
    };
    const hold = /不要送审|不送审|不生成正式报价文件|仅测算/.test(input);
    const base = (type, title, sourceKeys) => ({ type, title, input, ownerId: '', project: '', createdBy: context.userId, status: hold ? '处理中' : '待审核', holdReview: hold, version: 'V1', sourceKeys, presentation: { summary: '', notices: [], sections: [], next: [] } });
    const done = record => {
      plan.record = record;
      record.trace = trace;
      record.presentation.notices.push('结果先保留在当前会话；采纳并归档时再确认客户、地区和项目。');
      trace.push(step('核对结果并交付', record.version, record.presentation.summary + ' 未执行：批准、对外发布、签署、正式报修。', '本次结果'));
      return plan;
    };
    const unknown = input.match(/HM-[A-Z0-9-]+/g)?.find(code => !HM_BUSINESS.products.some(p => p.code === code));
    if (unknown) return wait('没有找到 ' + unknown + ' 的有效产品资料，请核对型号。', ['型号为 HM-ESS-8K']);
    const unknownDoc = input.match(/(?:CT|TB)-\d{4}-\d+/g)?.find(id => !['CT-2026-018', 'TB-2026-032'].includes(id));
    if (unknownDoc) return wait('无法匹配文件 ' + unknownDoc + '，请提供正文或确认正确版本。');

    if (kind === '产品选型') {
      const compare = /比较|对比/.test(input), change = /变更|改为/.test(input), check = /校验|兼容|混接/.test(input), analysis = /需求分析|整理需求/.test(input);
      const power = input.match(/(?:负荷|功率)?\s*(\d+(?:\.\d+)?)\s*kW(?!h)/i);
      const grid = /220\s*V|380\s*V/i.test(input);
      if (!analysis && (!power && !/HM-ESS-/.test(input) || !grid)) return wait('选型目标已明确，请补充目标功率或设备型号，以及电网电压、相数。', ['负荷约 8kW，电网 220V 单相 50Hz，地区华东，屋顶安装']);
      const r = base('selection', analysis ? '选型需求分析' : compare ? '候选方案对比' : change ? '配置变更与复核' : check ? '配置适用性检查' : '户用光储选型方案', ['product', 'compatibility']);
      r.status = '处理中'; r.quoteEligible = false; r.models = []; r.checks = [];
      const p = r.presentation;
      p.sections.push(table('需求与采用条件', ['条件', '本次采用值', '来源'], [['目标功率', power ? power[1] + ' kW' : '按指定设备核对', '本次输入'], ['电网', /380\s*V/.test(input) ? '380 V 三相' : grid ? '220 V 单相' : '待补充', '本次输入'], ['地区', /华东/.test(input) ? '华东' : '待确认', '本次输入'], ['客户 / 项目归属', '采纳并归档时确认', '尚未绑定']]));
      trace.push(step('整理需求与检查范围', input, analysis ? '整理需求与缺口，不生成候选。' : '区分目标功率、电网、容量及配套要求。', '当前输入'));
      if (analysis) { p.summary = '需求已整理；补齐功率与电网条件后可进入选型。'; p.notices = ['未执行型号推荐、数量计算和配置校验。']; p.next = ['请补充负荷约 8kW，电网 220V 单相 50Hz，地区华东，继续选型']; return done(r); }
      if (change && !/S-001|S-2001/.test(input)) return wait('配置变更需要唯一原版本，请明确配置编号和变更项。', ['基于 S-001，将电池容量从 5kWh 改为 10kWh，其他条件不变']);
      const unsupported = /海上平台|无法匹配/.test(input) || (power && Number(power[1]) > 12);
      if (unsupported) { r.deliverable = false; p.summary = '当前资料范围内没有可确认的候选方案。'; p.notices = ['未执行兼容与保护校验，没有生成可采购清单。']; p.next = ['补充技术条件后重新评估']; trace.push(step('匹配产品范围', input, p.summary, 'PD-2026-018', '待确认')); return done(r); }
      const model = /380\s*V/.test(input) && !/HM-ESS-8K/.test(input) ? 'HM-ESS-12K' : 'HM-ESS-8K';
      const voltageFail = /校验失败/.test(input) || (model === 'HM-ESS-8K' && /380\s*V/.test(input));
      const gap = /旧汇流箱|混接|缺兼容/.test(input);
      const capacity = /10\s*kWh/i.test(input) ? 10 : /5\s*kWh|电池/i.test(input) ? 5 : 0;
      r.quoteEligible = !voltageFail && !gap && !compare;
      r.status = gap && !compare ? '待技术确认' : '处理中';
      r.comparisonOnly = compare;
      r.models = [{ name: model, quantity: 1, reason: '按指定功率和电网条件核对', evidence: 'PD-2026-018 V2.1；RULE-ESS-026 V1.4' }];
      r.checks = [{ name: '电网适用性', result: voltageFail ? '不满足' : '通过' }, { name: '设备配套', result: gap ? '未执行' : '通过' }, { name: '保护与数量', result: voltageFail || gap ? '未执行' : '通过' }];
      if (compare) {
        r.models = [{ name: 'HM-ESS-8K', quantity: 1, reason: '方案 A，配 5 kWh 电池', evidence: 'PD-2026-018 V2.1' }, { name: 'HM-ESS-12K', quantity: 1, reason: '方案 B，配 10 kWh 电池', evidence: 'PD-2026-018 V2.1' }];
        r.checks = [{ name: '方案 A · 电网适用性', result: '通过', reason: '220 V 单相符合本次现场条件' }, { name: '方案 B · 电网适用性', result: '不满足', reason: '要求 380 V 三相，与本次现场条件不符' }, { name: '两套方案的配套与保护', result: '未执行', reason: '本次仅做对比，选定方案后另行完整校验' }];
      }
      p.summary = voltageFail ? '配置检查不通过：电网条件与设备要求不符。' : gap ? '候选已保留；旧设备混接依据不足，需技术确认。' : compare ? '对比已完成：方案 B 的三相要求与当前单相条件不符。' : '配置检查通过，可进入后续报价准备。';
      p.notices = [compare ? '对比不等于配置校验通过。请先选定方案，再完成配套与保护检查；当前不能正式报价。' : r.quoteEligible ? '技术检查通过不等于业务批准。尚未生成报价。' : '当前结果不可直接用于正式报价。'];
      if (!compare) {
        p.sections.push(table('配置清单', ['设备角色', '型号', '数量', '关键参数'], [['逆变器', model, '1 台', model === 'HM-ESS-8K' ? '8 kW' : '12 kW'], ...(capacity ? [['储能电池', 'HM-BAT-5', capacity / 5 + ' 组', capacity + ' kWh']] : [])]));
        p.sections.push(textSection('采用理由与依据', '依据 PD-2026-018 的功率及电网范围核对 ' + model + '；数量按本次负荷与储能容量计算，电气适用性以以下分项检查为准。' + (voltageFail ? '当前电网条件不满足，不能将候选当作可执行方案。' : '') ));
      }
      p.sections.push(table('分项检查', ['检查项', '结果', '依据 / 原因'], r.checks.map(c => [c.name, c.result, c.reason || (c.result === '未执行' ? '前置条件或兼容依据不足' : 'RULE-ESS-026 V1.4')])));
      p.sections.push(textSection('未执行项', (r.checks.filter(c => c.result === '未执行').map(c => c.name).join('、') || '本次列明的技术检查均已执行。') + '\n未执行业务批准、正式报价和自动替换配置。'));
      if (compare) p.sections.push(table('方案对比', ['维度', '方案 A', '方案 B'], [['逆变器', 'HM-ESS-8K', 'HM-ESS-12K'], ['功率 / 容量', '8 kW / 5 kWh', '12 kW / 10 kWh'], ['电网条件', '220 V 单相', '380 V 三相'], ['适用判断', '符合本次电网条件', '不符合本次电网条件']]));
      if (change) { r.version = 'S-001 / V2'; p.sections.push(table('变更影响', ['项目', '原版本 V1', '本版本 V2', '处理'], [['电池容量', '5 kWh', '10 kWh', '重新核对数量与配套'], ['电池数量', '1 组', '2 组', '按 5 kWh / 组计算'], ['历史方案', 'S-001 / V1', '保留原版本', '不覆盖旧版']])); }
      trace.push(step('读取产品与规则', compare ? 'HM-ESS-8K / HM-ESS-12K' : model, '取得额定参数、数量和配套条件。', 'PD-2026-018 V2.1；RULE-ESS-026 V1.4'));
      trace.push(compare ? step('分别整理两套方案', '用户给出的方案 A 与方案 B', '方案 A：HM-ESS-8K / 5 kWh；方案 B：HM-ESS-12K / 10 kWh。保持两套方案独立，不合并配置。', '本次输入') : step('形成配置清单', '需求及产品参数', '逆变器 1 台' + (capacity ? '；电池 ' + capacity / 5 + ' 组，共 ' + capacity + ' kWh。' : '。'), '本次配置'));
      trace.push(step('执行分项校验', model, r.checks.map(c => c.name + '：' + c.result).join('；'), 'RULE-ESS-026 V1.4', r.quoteEligible ? '成功' : '待确认'));
      if (compare || change) trace.push(step('整理版本差异', '明确方案与版本', compare ? '对比功率、容量与电网适用性；不自动选择方案。' : '保留 V1，输出 V2 和变更影响。', compare ? '本次方案 A / B' : 'S-001'));
      p.next = compare ? [] : r.quoteEligible ? ['基于当前配置，在华东测算费用，不送审'] : ['补充当前配置的兼容资料，继续校验'];
      return done(r);
    }

    if (kind === '方案报价') {
      const region = [...input.matchAll(/华东|华南|华北|欧洲|美洲/g)].at(-1)?.[0];
      if (!region) return wait('报价需要地区以匹配价表，请补充地区。', ['地区为华东']);
      const selected = context.selected;
      const distinctModels = [...new Set(input.match(/HM-[A-Z0-9-]+/g) || [])];
      const referenced = /当前配置|这套|组合|搭配|配套电池/.test(input) || distinctModels.length > 1;
      if (referenced && (!selected || selected.type !== 'selection' || selected.comparisonOnly || !selected.quoteEligible)) return wait('当前没有唯一且通过检查的配置，请先确认配置版本。');
      if (referenced && selected.adopted && !selected.businessApproved) return wait('该配置已采纳，正式用于报价前还需其他有权限的人员完成业务批准。');
      const code = input.match(/HM-[A-Z0-9-]+/)?.[0] || (referenced ? selected.models[0].name : /Q-001/.test(input) ? 'HM-ESS-8K' : '');
      if (!code) return wait('报价目标已明确，请指定产品及数量，或引用当前已检查配置。', ['产品为 HM-ESS-8K，数量 1 台']);
      const r = base('quote', /检查/.test(input) ? '报价完整性检查' : /变更/.test(input) ? '报价变更与差异' : '设备与配套报价', ['price']);
      const p = r.presentation;
      if (region !== '华东' || code !== 'HM-ESS-8K') { r.deliverable = false; r.status = '待商务确认'; p.summary = '未找到适用的完整价表，尚未生成金额。'; p.notices = ['不会采用其他地区或型号的价格替代。']; trace.push(step('匹配有效价表', region + ' / ' + code, p.summary, 'PL-EAST-2026Q4', '待确认')); return done(r); }
      const qtyMatches = [...input.matchAll(/(?:改为|数量为|数量)?\s*(\d+)\s*(?:台|套)/g)];
      const qty = Number(qtyMatches.at(-1)?.[1] || 1);
      if (!qty || qty > 1000) return wait('请确认有效的采购数量（1–1000）。');
      const rows = [{ name: 'HM-ESS-8K', qty, price: 6800 }, { name: '标准辅材包', qty, price: 400 }];
      if (referenced && selected.presentation.sections.some(s => s.title === '配置清单' && s.rows.some(row => row[1] === 'HM-BAT-5'))) {
        const battery = selected.presentation.sections.find(s => s.title === '配置清单').rows.find(row => row[1] === 'HM-BAT-5');
        rows.push({ name: 'HM-BAT-5', qty: parseInt(battery[2]), price: 5200 });
      }
      const total = rows.reduce((sum, x) => sum + x.qty * x.price, 0);
      r.priceRows = rows; r.version = /变更/.test(input) ? 'Q-001 / V2' : '报价 / V1';
      r.holdReview = hold || /测算|检查/.test(input); r.status = r.holdReview ? '处理中' : '待审核';
      r.published = { version: referenced ? selected.id + ' / ' + selected.version : code + ' / 指定产品', lines: rows.map(x => x.name + ' × ' + x.qty + '：' + money(x.qty * x.price)), conditions: '含税；运输、安装、调试不包含，待另行确认', validity: '2026-12-31', amount: money(total) };
      p.summary = '已核算含税金额 ' + money(total) + '；运输、安装和调试另行确认。';
      p.notices = [r.holdReview ? '内容已生成，尚未送审。' : '等待审核，审核通过后仍需另行发布。'];
      p.sections = [table('费用明细', ['项目', '数量', '含税单价', '小计'], rows.map(x => [x.name, x.qty, money(x.price), money(x.qty * x.price)])), table('商务条件与费用边界', ['事项', '当前条件', '下一步'], [['币种 / 税口径', '人民币 / 含税', 'PL-EAST-2026Q4 V1.2'], ['运输、安装、调试', '未包含，金额未核实', '补充服务范围与价格依据'], ['有效期', '2026-12-31', '到期后重新核价'], ['付款 / 交付', '尚未约定', '商务确认']])];
      if (/报价检查/.test(input)) {
        const supplied = input.match(/(?:金额|总额)\s*[¥￥]?\s*([\d,]+)/)?.[1];
        const value = supplied ? Number(supplied.replace(/,/g, '')) : null;
        p.sections.unshift(table('报价检查结论', ['检查项', '提供内容', '本次复核', '结果'], [['含税金额', value == null ? '未提供' : money(value), money(total), value == null ? '无法核实' : value === total ? '一致' : '不一致'], ['服务费用', '按本次说明核对', '运输、安装、调试未计价', '需明确范围']]));
        if (value != null && value !== total) { p.summary = '发现报价金额差异：提供 ' + money(value) + '，依据价表复核为 ' + money(total) + '。'; p.notices.unshift('金额核对不一致，需修正并重新核对。'); }
      }
      if (/变更/.test(input)) p.sections.push(table('新旧版本差异', ['字段', '原版本', '新版本'], [['采购数量', '1 台', qty + ' 台'], ['含税金额', '¥7,200', money(total)], ['有效期', '2026-11-30', '2026-12-31']]));
      trace.push(step('确认报价对象', code + ' × ' + qty, '绑定指定产品或配置版本，不借用其他项目。', r.published.version));
      trace.push(step('读取区域价表', region, '匹配有效期内含税价表。', 'PL-EAST-2026Q4 V1.2'));
      trace.push(step('核算费用', rows.map(x => x.qty + ' × ' + x.price).join(' + '), '含税合计 ' + money(total), '本次费用明细'));
      trace.push(step('检查费用边界', '产品、辅材、服务费用', '运输、安装、调试缺少报价依据，明确列为未包含。', 'PL-EAST-2026Q4 V1.2', '待确认'));
      p.next = ['请补充运输、安装和调试的服务范围，再检查报价'];
      return done(r);
    }

    if (kind === '标书管理') {
      if (!/TB-2026-032/.test(input)) return wait('请确认招标文件编号和版本，或补充完整要求正文。当前可引用 TB-2026-032 V1.0。', ['请读取 TB-2026-032 V1.0，生成响应矩阵和章节草稿']);
      const latest = input.split('\n补充：').at(-1);
      const expired = /过期|缺少必需|不适用/.test(input) && !/已补充有效厂家授权|未过期|没有过期/.test(latest);
      const analyze = /招标分析/.test(input), materialsOnly = /材料匹配/.test(input);
      const r = base('bid', analyze ? '园区招标要求分析' : materialsOnly ? '投标材料匹配清单' : /检查/.test(input) ? '标书一致性检查' : '园区光储项目响应草稿', ['tender', 'qualification', 'product', 'compatibility', 'price']);
      const p = r.presentation;
      r.version = 'TB-2026-032 / 响应 V1';
      if (/过期|已补充有效厂家授权/.test(input)) r.localSources = [{ id: 'INPUT-MATERIAL', title: '本次材料状态说明', version: '当前输入', section: '材料有效性补充', collection: '会话资料', date: '', text: input }];
      r.holdReview = hold || expired || analyze || materialsOnly; r.status = r.holdReview ? '处理中' : '待审核'; r.reviewBlocked = expired;
      p.summary = expired ? '已整理响应，但必需材料不可用，尚不能送审。' : analyze ? '已提取资格、技术和商务要求，明确截止时间及待确认项。' : materialsOnly ? '已匹配三项材料，逐项列出适用范围与有效期。' : '已生成条款响应与章节草稿，商务边界需审核确认。';
      p.notices = [expired ? '阻塞：厂家授权缺少有效版本，请补充材料后重新核对。' : '待确认：运输、安装及调试范围未计价，不能承诺包含。', '截止：2026-12-15 17:00（北京时间）。未执行对外提交或签章。'];
      p.sections.push(table('条款响应矩阵', ['条款 / 要求', '响应内容', '满足状态', '依据'], [['3.1 · 8 kW 单相并网', 'HM-ESS-8K，220 V 单相 50 Hz', '满足', 'PD-2026-018 §2'], ['3.1 · 保护配合', '按适用配套规则配置', '满足', 'RULE-ESS-026 §3'], ['3.2 · 有效资质与授权', expired ? '厂家授权版本不可用' : '认证及授权在有效期内', expired ? '不满足' : '满足', 'MAT-2026-041 清单A'], ['3.3 · 商务与费用边界', '设备及辅材 7,200 元；服务费用待确认', '待商务确认', 'PL-EAST-2026Q4 表1']]));
      p.sections.push(table('材料有效性', ['材料', '适用范围', '有效期', '可用性'], [['MAT-A01 · 产品材料', 'HM-ESS-8K / 华东', '2026-12-31', '可用'], ['MAT-A02 · 厂家授权', '园区光储项目', expired ? '已过期' : '2026-12-31', expired ? '不可用 · 阻塞送审' : '可用'], ['MAT-A03 · 同类项目材料', '户用光储项目', '本次材料版本', '需审核确认项目相似性']]));
      if (!analyze && !materialsOnly) p.sections.push({ title: '章节草稿', chapters: [{ title: '技术响应', text: '本项目拟采用 HM-ESS-8K，额定交流功率 8 kW，适用 220 V 单相 50 Hz。并网与保护配合按 RULE-ESS-026 V1.4 执行。' }, { title: '商务响应', text: '设备与标准辅材含税合计 7,200 元，有效期至 2026-12-31。运输、安装及调试费用未包含，具体服务范围与商务条件待确认。' }, { title: '材料与偏离说明', text: expired ? '厂家授权材料不可用，须替换有效文件，当前版本不送审。' : '按 MAT-2026-041 V1.3 附产品、授权及业绩材料；同类项目适用性与服务范围提交人工审核。' }] });
      r.customerText = p.summary;
      trace.push(step('读取招标版本', 'TB-2026-032 V1.0', '锁定第3章要求与提交截止时间。', 'TB-2026-032'));
      trace.push(step('拆分技术与商务要求', '第3章原文', '形成4条响应检查项，每条保留原文位置。', 'TB-2026-032 §3'));
      trace.push(step('匹配资质材料', '产品、地区、有效期', expired ? '厂家授权不可用，不能作为有效依据。' : '匹配产品与授权资料；业绩适用性仍需审核。', 'MAT-2026-041', expired ? '失败' : '待确认'));
      trace.push(step('核对配置与费用范围', '响应矩阵', '设备技术要求符合；服务费用未确定，明确标注。', 'PD-2026-018；PL-EAST-2026Q4', '待确认'));
      trace.push(step('形成交付并检查送审条件', r.version, r.holdReview ? '保留当前分析或草稿，未送审。' : '章节草稿已生成，带商务待确认项进入待审核。', '', expired ? '待补充' : '成功'));
      p.next = expired ? ['已补充有效厂家授权 MAT-A02，有效至 2026-12-31，请重新核对 TB-2026-032 的响应'] : ['检查 TB-2026-032 的响应、金额和材料有效期'];
      return done(r);
    }

    if (kind === '合同管理') {
      const ref = /CT-2026-018/.test(input);
      if (/起草|代签|盖章/.test(input)) return wait('当前可检查已有合同并提取履约事项；请提供合同正文。签署与盖章由业务人员办理。', ['检查合同 CT-2026-018']);
      if (!ref && !/合同正文.*(?:载明|约定|金额|付款|质保)/.test(input)) return wait('合同检查需要正文或唯一合同编号，尚未开始条款核对。', ['请检查合同 CT-2026-018']);
      const body = ref ? docs().contract.text : input;
      const extraction = /提取|整理.*事项/.test(input);
      const r = base('contract', extraction ? '合同履约事项清单' : /付款/.test(input) ? '合同付款条款检查' : /质保/.test(input) ? '合同验收与质保检查' : '合同一致性与条款检查', ref ? ['contract', 'price'] : []);
      const p = r.presentation;
      r.version = ref ? 'CT-2026-018 / V1.0' : '本次合同正文 / V1';
      if (!ref) r.localSources = [{ id: 'INPUT', title: '本次提供的合同正文', version: '当前输入', section: '用户提供内容', collection: '会话资料', date: '', text: body }];
      const amount = body.match(/(?:金额|总额|合计)\s*[¥￥]?\s*([\d,]+)/)?.[1];
      const amountText = amount ? money(Number(amount.replace(/,/g, ''))) : '正文未提供';
      const discrepancy = amount && Number(amount.replace(/,/g, '')) !== 7200;
      const hasModel = /HM-ESS-8K/.test(body);
      const evidence = ref || /PL-EAST-2026Q4/.test(input);
      if (evidence && !ref) r.sourceKeys.push('price');
      p.summary = extraction ? '已提取履约事项；时间按合同触发条件表达，未擅自生成日历日期。' : !evidence ? '已整理合同条款；缺少价格依据，金额无法核实。' : discrepancy ? '发现合同金额与价格依据不一致，需商务核对。' : '合同内容已核对；验收标准、质保起算条件仍需确认。';
      p.notices = ['检查结果不代表合同已签署。付款、验收及责任边界须由相应人员审核。'];
      if (!extraction) p.sections.push(table('业务字段核对', ['字段', '合同内容', '对照依据', '检查结果'], [['设备', hasModel ? 'HM-ESS-8K' : '未提供完整型号', evidence ? 'PL-EAST-2026Q4' : '未指定对照版本', hasModel && evidence ? '一致' : '无法核实'], ['含税金额', amountText, evidence ? '设备及辅材 ¥7,200' : '无价格依据', !evidence || !amount ? '无法核实' : discrepancy ? '不一致' : '一致'], ['运输 / 安装 / 调试', /不含运输/.test(body) ? '不包含' : '未明确', '服务边界需单独约定', '待确认']]));
      p.sections.push(table('条款偏离与待确认事项', ['位置', '发现', '影响', '建议'], [['验收条款', '缺少可量化验收标准', '验收和尾款触发存在歧义', '补充测试标准及验收凭证'], ['质保条款', '起算日期与例外未明确', '责任范围需进一步核对', '确认起算事件与服务范围'], ['付款条款', '付款条件需与验收凭证关联', '影响尾款核对', '由商务复核付款与凭证要求']]));
      p.sections.push(table('履约事项', ['事项', '时间 / 比例', '触发条件', '责任 / 凭证', '来源'], [['预付款', ref || /30%/.test(body) ? '30%' : '待补充', '合同约定生效条件', '商务 / 付款凭证', ref ? '第4条' : '本次正文'], ['发货', /15\s*日/.test(body) ? '15日内' : '待补充', '合同生效', '交付 / 发货单', ref ? '第6条' : '本次正文'], ['验收', /7\s*日/.test(body) ? '7日内' : '待补充', '设备到货', '项目人员 / 验收单', ref ? '第6条' : '本次正文'], ['尾款', ref || /70%/.test(body) ? '70%' : '待补充', '完成约定验收', '商务 / 付款凭证', ref ? '第4条' : '本次正文'], ['质保', /5\s*年/.test(body) ? '5年' : '待补充', '起算条件待确认', '售后 / 合同及起算凭证', ref ? '第8条' : '本次正文']]));
      r.customerText = p.summary; r.signingStatus = '';
      trace.push(step('读取合同正文', r.version, '取得合同原文，锁定本次检查范围。', ref ? 'CT-2026-018 V1.0' : '本次输入'));
      trace.push(step('核对商务依据', evidence ? 'PL-EAST-2026Q4 V1.2' : '未指定价格依据', evidence ? '读取设备及辅材价格，不替代正式批准。' : '金额无法核实，不判定一致。', evidence ? 'PL-EAST-2026Q4' : '', evidence ? '成功' : '待确认'));
      if (!extraction) trace.push(step('逐项检查设备与金额', body, !evidence ? '金额无法核实，未判定一致或不一致。' : discrepancy ? '发现价格差异。' : '已核对可比字段，未知字段保留为待确认。', r.version, !evidence || discrepancy ? '待确认' : '成功'));
      trace.push(step('识别条款缺口', '验收、付款、质保条款', '验收标准与质保起算条件需要补齐。', r.version, '待确认'));
      trace.push(step('提取履约事项', '原文中的时间及触发条件', '生成付款、发货、验收和质保事项，不更新履约状态。', r.version));
      p.next = ref ? ['提取合同 CT-2026-018 的付款、交付、验收和质保事项'] : [];
      return done(r);
    }

    if (kind === '故障诊断') {
      if (!/HM-ESS-8K|DEV-2026-0118/.test(input) || !/离线|通信|停机|功率|告警/.test(input) || !/\d{2}:\d{2}|DEV-2026-0118/.test(input)) return wait('请补充设备型号或编号、故障现象及发生时间，随后开始取证。', ['设备 HM-ESS-8K，2026-11-09 09:40 起离线，告警 E01']);
      const previous = context.selected && context.selected.type === 'diagnosis' ? context.selected : null;
      if (previous && previous.rounds >= 3 && /继续|补充|固件|日志/.test(input)) return wait('当前故障已达到排查上限。请回看阶段报告，或交由技术人员处理；不再自动追加诊断。');
      const scene = /功率受限|输出约/.test(input) ? '功率受限' : /通信告警|DTU/.test(input) ? '通信告警' : /停机/.test(input) ? '告警停机' : '设备离线';
      const r = base('diagnosis', 'HM-ESS-8K · ' + scene + '阶段报告', ['fault']);
      const p = r.presentation;
      r.version = '诊断报告 / V' + (previous ? 2 : 1); r.rounds = previous ? Math.min(3, (previous.rounds || 2) + 1) : 2; r.calls = previous ? (previous.calls || 2) + 1 : 2;
      r.formalTicket = ''; r.accepted = false; r.draftTicket = '待编号';
      const time = input.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)?.[0] || input.match(/\d{2}:\d{2}/)?.[0] || '2026-11-09 09:40';
      if (/DEV-2026-0118/.test(input)) r.sourceKeys.push('device');
      const fullFirmware = /固件[：:\s]*V?\d+\.\d+/i.test(input);
      const firmware = [...input.matchAll(/固件[：:\s]*(V?\d+\.\d+)/gi)].at(-1)?.[1];
      const symptoms = { '设备离线': ['采集或链路中断', '网关与设备日志缺失'], '通信告警': ['DTU与设备通信异常', '通信报文及链路状态缺失'], '功率受限': ['运行限制或保护降额', '负荷曲线与运行限制设置缺失'], '告警停机': ['保护动作关联停机', '保护事件前后日志缺失'] }[scene];
      p.summary = '已形成阶段报告；' + symptoms[0] + '为疑似原因，尚未确诊。';
      p.notices = ['停止原因：现有证据不足以支持进一步判断，需要补充现场资料。', '设备未验证恢复；工单草稿未正式提交；尚无人员接单回执。'];
      r.report = p.summary; r.nextStep = '补充证据，或由技术人员继续处理。';
      p.sections = [table('已知事实与来源', ['事实', '当前信息', '来源'], [['设备', 'HM-ESS-8K', '本次输入'], ['现象', scene, '用户反馈'], ['发生时间', time, '本次输入'], ['固件版本', fullFirmware ? firmware : '未知', fullFirmware ? '用户补充' : '尚未提供']]), table('原因分析与证据缺口', ['假设', '支持信息', '仍缺证据', '判断'], [[symptoms[0], scene + '现象', symptoms[1], '疑似'], ['设备硬件故障', '暂无直接证据', '专业检测与完整运行日志', '不能确定']]), table('下一步取证', ['需要补充', '用途', '负责人'], ...[ [[fullFirmware ? '现场运行日志' : '固件版本', '核对适用资料与事件顺序', '现场 / 售后'], [symptoms[1].replace('缺失', ''), '排除或支持故障假设', '售后技术'], ['设备当前状态', '核实是否恢复', '现场人员']] ])];
      p.sections.push(textSection('工单草稿', '设备：HM-ESS-8K\n现象：' + scene + '\n发生时间：' + time + '\n结论：原因未确定\n待补资料：' + symptoms[1] + '\n处理建议：由售后技术核对证据并继续处理。'));
      trace.push(step('确认设备与风险范围', input, '设备与现象已明确；当前描述未报告紧急风险。', '本次输入'));
      trace.push(step('第一轮 · 制定取证计划', scene, '先核对现象、时间与适用故障指引。', '', '成功', 'Plan'));
      trace.push(step('第一轮 · 检索取证要求', 'HM-ESS-8K / ' + scene, '取得日志、固件和链路状态的取证要求。', 'KB-SVC-017 V2.0', '成功', 'Execute'));
      trace.push(step('第一轮 · 收集与整理事实', input, '区分用户反馈与资料依据；未把告警直接认定为原因。', '本次输入', '成功', 'Observe'));
      trace.push(step('第一轮 · 形成初步判断', scene, '现象只能支持故障假设，不能据此确认硬件损坏。', 'KB-SVC-017 V2.0', '待确认', 'Reasoning'));
      trace.push(step('第一轮 · 检查证据充分性', '现象与取证要求', '原因尚不能确定，需要补充证据。', '', '待确认', 'Reflect'));
      trace.push(step('第二轮 · 制定缺口核对计划', '第一轮待确认项', '逐项核实固件、日志及设备恢复证据。', '', '成功', 'Plan'));
      trace.push(step('第二轮 · 核对现有资料', input, '整理已提供资料，不把缺失记录当成正常运行。', '本次输入', '成功', 'Execute'));
      trace.push(step('第二轮 · 核对证据缺口', '现有信息', symptoms[1] + (fullFirmware ? '；已补充固件版本。' : '；固件版本未知。'), '本次输入', '待确认', 'Observe'));
      trace.push(step('第二轮 · 形成阶段判断', '支持信息与缺口', symptoms[0] + '仅为假设，硬件损坏没有直接证据。', 'KB-SVC-017 V2.0', '待确认', 'Reasoning'));
      trace.push(step('停止取证并整理报告', '当前证据不足', '保留报告和工单草稿，等待资料；没有正式报修。', '', '成功', 'Reflect'));
      if (previous) {
        trace.splice(3);
        trace.push(step('第三轮 · 确定补充核对范围', input, '保留上一版报告，只核对新增证据。', previous.id, '成功', 'Plan'));
        trace.push(step('第三轮 · 读取补充资料', input, fullFirmware ? '取得固件版本；完整日志仍未提供。' : '补充信息尚未覆盖关键缺口。', '用户补充', '成功', 'Execute'));
        trace.push(step('第三轮 · 更新事实表', input, '新增事实与原有证据分别标注，不推断设备恢复。', previous.id, '成功', 'Observe'));
        trace.push(step('第三轮 · 复核原因假设', scene, '证据仍不足以确诊，保留疑似原因。', 'KB-SVC-017 V2.0', '待确认', 'Reasoning'));
        trace.push(step('第三轮 · 停止自动排查', '已达到排查上限', '保留阶段报告及工单草稿，需由技术人员继续核对。', '', '待确认', 'Reflect'));
        p.notices[0] = '停止原因：已达到自动排查上限。请交由技术人员核对剩余证据。';
      }
      p.next = previous ? [] : ['补充：固件 V1.4，暂无完整日志，请更新当前阶段报告'];
      return done(r);
    }
    return null;
  }
  window.HM_FLOW = { prepare };
})();
