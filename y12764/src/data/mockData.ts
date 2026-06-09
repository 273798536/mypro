import type { LabRecord } from "@/types";

export const mockRecords: LabRecord[] = [
  {
    id: "rec-001",
    batchNo: "TLC-2026-0601-01",
    date: "2026-06-01",
    status: "success",
    reactionTime: "45 min",
    solventRatio: "乙酸乙酯:石油醚 = 1:3",
    operator: "李实验员",
    temperature: "25℃",
    humidity: "45%",
    plateType: "硅胶 GF254",
    spotVolume: "5 μL",
    developmentDistance: "8.2 cm",
    components: [
      { name: "原料 A", rf: 0.18, color: "#1F2937", intensity: 3 },
      { name: "中间体 B", rf: 0.42, color: "#4B5563", intensity: 4 },
      { name: "目标产物 C", rf: 0.67, color: "#1E40AF", intensity: 5 },
      { name: "副产物 D", rf: 0.83, color: "#9CA3AF", intensity: 2 },
    ],
    notes: [],
    manualRemark: "",
    conclusion:
      "展开效果良好，各组分分离清晰，目标产物 C 占比最高，与预期 Rf 值偏差在 ±0.02 范围内，反应进行完全。",
    isDuplicate: false,
    duplicateWith: null,
  },
  {
    id: "rec-002",
    batchNo: "TLC-2026-0601-02",
    date: "2026-06-01",
    status: "pending",
    reactionTime: null,
    solventRatio: "乙酸乙酯:石油醚 = 1:3",
    operator: "王实验员",
    temperature: "25℃",
    humidity: "48%",
    plateType: "硅胶 GF254",
    spotVolume: "5 μL",
    developmentDistance: "8.0 cm",
    components: [
      { name: "原料 A", rf: 0.22, color: "#1F2937", intensity: 4 },
      { name: "中间体 B", rf: 0.48, color: "#4B5563", intensity: 3 },
      { name: "目标产物 C", rf: 0.62, color: "#1E40AF", intensity: 3 },
      { name: "未知杂质", rf: 0.75, color: "#D97706", intensity: 2 },
    ],
    notes: [
      {
        type: "missing_time",
        message: "反应时间未记录",
        explanation:
          "各位同事，本批记录 TLC-2026-0601-02 在录入时遗漏了反应时间这一关键参数。目前已退回补录，待反应时间确认后会同步更新谱图判读结论。在补录完成之前，请暂时不要引用该批次数据作为放行依据。",
      },
      {
        type: "irregular_band",
        message: "Rf 值整体偏低 0.05，且存在未知杂质",
        explanation:
          "本批次各组分 Rf 值较同日平行样（TLC-2026-0601-01）整体偏低约 0.05，同时在 Rf≈0.75 位置检出一条未预期的杂质条带。建议核对展开剂配制比例与点样操作，排除系统偏差后再行判读。",
      },
    ],
    manualRemark: "这条点样时手有点抖，后面那个杂质不知道是不是交叉污染的",
    conclusion:
      "反应时间缺失，暂无法判断反应转化率。Rf 值偏低且存在未知杂质，需补录反应时间并复查展开剂后再做结论。",
    isDuplicate: false,
    duplicateWith: null,
  },
  {
    id: "rec-003",
    batchNo: "TLC-2026-0601-01",
    date: "2026-06-01",
    status: "bad",
    reactionTime: "30 min",
    solventRatio: "乙酸乙酯:石油醚 = 1:3",
    operator: "赵实验员",
    temperature: "25℃",
    humidity: "50%",
    plateType: "硅胶 GF254",
    spotVolume: "5 μL",
    developmentDistance: "7.8 cm",
    components: [
      { name: "原料 A", rf: 0.15, color: "#1F2937", intensity: 5 },
      { name: "拖尾带", rf: 0.35, color: "#DC2626", intensity: 5 },
      { name: "模糊带", rf: 0.55, color: "#DC2626", intensity: 3 },
    ],
    notes: [
      {
        type: "duplicate",
        message: "批号 TLC-2026-0601-01 与 rec-001 重复",
        explanation:
          "各位同事，本批提交的记录批号为 TLC-2026-0601-01，系统中同日已存在一条相同批号的正式记录（操作人员：李实验员）。批号是实验追溯的唯一标识，重复录入会导致质检环节无法对应到唯一的实物样本，因此本记录已被系统拦截。请确认是录入错误（需要改正批号）还是存在两次独立实验（需要重新分配批号）后再提交。",
      },
      {
        type: "bad_data",
        message: "条带严重拖尾，无法准确定量",
        explanation:
          "本记录薄层色谱条带出现明显拖尾现象，组分边界模糊，Rf 值读取误差预计超过 ±0.1，不具备定量判读条件。建议重新点样并控制点样量后再进行展开。",
      },
    ],
    manualRemark: "主任这个我记得是我做的啊 怎么李工也有一条一样的批号 会不会他抄我的 反正条带是有点糊 当时赶时间吃饭就随便拍了",
    conclusion:
      "该记录存在批号重复问题，已被拦截；同时色谱条带严重拖尾，数据不可靠，建议作废并重新实验。",
    isDuplicate: true,
    duplicateWith: "rec-001",
  },
];
