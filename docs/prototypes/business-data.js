/* Fictional presentation fixtures, not manufacturer specifications or production records.
 * Kept local; see presentation-data.md before connecting any production service.
 */
window.HM_BUSINESS = {
  version: '2026.11.10',
  products: [
    { code: 'HM-ESS-8K', category: '储能逆变器', power: '8 kW', grid: '220 V · 单相 · 50 Hz', price: 6800 },
    { code: 'HM-ESS-12K', category: '储能逆变器', power: '12 kW', grid: '380 V · 三相 · 50 Hz', price: 9600 },
    { code: 'HM-BAT-5', category: '储能电池', capacity: '5 kWh', price: 5200 },
    { code: 'HM-MI-2K', category: '微型逆变器', power: '2 kW', price: 2400 },
    { code: 'HM-DTU-L', category: '通信网关', price: 800 },
    { code: 'HM-DTS-3', category: '电能计量设备', price: 650 },
    { code: 'HM-AIO-10', category: '光储一体机', power: '8 kW', capacity: '10 kWh', price: 18600 }
  ],
  documents: {
    product: { id: 'PD-2026-018', title: '户用光储产品参数与适用范围', version: 'V2.1', date: '2026-11-01', section: '第 2 节 · 产品参数', collection: '产品资料库', text: 'HM-ESS-8K：额定交流功率 8 kW，220 V 单相 50 Hz。HM-ESS-12K：额定交流功率 12 kW，380 V 三相 50 Hz。HM-BAT-5：单组标称容量 5 kWh。需求功率与设备额定功率分别核对，容量不替代功率。' },
    compatibility: { id: 'RULE-ESS-026', title: '户用光储配套与并网检查规则', version: 'V1.4', date: '2026-11-01', section: '第 3 节 · 电气及配套检查', collection: '选型规则库', text: 'HM-ESS-8K 适用 220 V 单相系统；HM-ESS-12K 适用 380 V 三相系统。HM-BAT-5 在指定连接方案下支持 1–2 组配置，须分别检查接口、数量与保护配合。旧汇流箱混接不在本规则覆盖内，应转技术确认。电压不符合时不得标记校验通过。' },
    price: { id: 'PL-EAST-2026Q4', title: '华东区产品及配套费用表', version: 'V1.2', date: '2026-11-01', section: '表 1 · 含税价格', collection: '商务资料库', text: '适用地区：华东；币种：人民币；有效期：2026-11-01 至 2026-12-31。HM-ESS-8K 含税单价 6,800 元，标准辅材包 400 元/套，单套合计 7,200 元。HM-BAT-5 含税单价 5,200 元/组。运输、安装、调试不包含在上述费用中，需另行确认。' },
    tender: { id: 'TB-2026-032', title: '园区光储项目招标要求', version: 'V1.0', date: '2026-11-02', section: '第 3 章 · 技术与商务响应', collection: '项目资料库', text: '3.1 设备须满足 8 kW、220 V 单相并网及保护配合要求。3.2 须提交适用华东地区且在投标有效期内有效的认证、厂家授权和同类项目材料。3.3 商务响应须与所引用报价版本一致。截止时间：2026-12-15 17:00（北京时间）。' },
    qualification: { id: 'MAT-2026-041', title: '投标资质与授权材料清单', version: 'V1.3', date: '2026-11-03', section: '清单 A · 有效性与范围', collection: '资质资料库', text: '产品合规材料 MAT-A01：适用 HM-ESS-8K，华东，有效至 2026-12-31。厂家授权材料 MAT-A02：适用园区光储项目，有效至 2026-12-31。同类项目材料 MAT-A03：覆盖户用光储项目。过期业绩材料 MAT-A00 已停用，不作为有效依据。' },
    contract: { id: 'CT-2026-018', title: '户用光储设备采购合同', version: 'V1.0', date: '2026-11-04', section: '第 2、4、6、8 条', collection: '合同资料库', text: '买方：张敏；项目：户用并网；地区：华东。第2条：HM-ESS-8K 1台，含标准辅材，含税总额7,200元，不含运输、安装及调试。第4条：预付款30%，验收后70%。第6条：生效后15日发货，到货后7日内验收。第8条：质保5年。商务核对依据：PL-EAST-2026Q4 V1.2；待审核文本，尚未签署。' },
    fault: { id: 'KB-SVC-017', title: '通信与运行告警排查指引', version: 'V2.0', date: '2026-11-01', section: '第 4 节 · 取证与原因确认', collection: '售后知识库', text: '设备离线及通信告警优先核实设备标识、告警时间、网关连接状态、固件版本与日志。告警现象不能单独证明硬件损坏。现场资料不足时形成阶段报告，明确证据缺口。设备恢复需新的状态证据；工单创建不等于人员接单。' },
    device: { id: 'DEV-2026-0118', title: '户用并网设备运行记录', version: '2026-11-09 09:40', date: '2026-11-09', section: '告警事件 EV-0118', collection: '设备记录库', text: '设备型号：HM-ESS-8K；所属项目：户用并网。09:40出现离线事件，网关最后一次上报时间为09:39。当前记录未包含固件版本及现场通信报文。尚无设备恢复证据，未取得人员接单回执。' }
  }
};
