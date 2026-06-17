import { Material, ComplaintRecord, MaterialType } from '../types';
import { parseMaterialContent } from '../services/dataParser';
import { createVersion } from '../services/versionTracker';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  materials: Material[];
  complaints: ComplaintRecord[];
  expectedAnomalies: number;
  expectedLateImpacts: number;
  expectedMergeSuggestions: number;
}

function createScenario(
  id: string,
  name: string,
  description: string,
  parkName: string,
  materialsData: {
    type: MaterialType;
    title: string;
    content: string;
    isLateArrival?: boolean;
    versionNote?: string;
  }[]
): DemoScenario {
  const materials: Material[] = [];
  const complaints: ComplaintRecord[] = [];

  materialsData.forEach((md) => {
    const { material, parsedData } = parseMaterialContent(
      md.content,
      md.type,
      md.title,
      parkName,
      '测试人员'
    );

    if (md.isLateArrival) {
      const updatedMaterial = createVersion(
        material,
        material.versions[0].content,
        '测试人员',
        true,
        md.versionNote
      );
      materials.push(updatedMaterial);
      
      complaints.push(...parsedData.complaints.map(c => ({
        ...c,
        versionId: updatedMaterial.versions[1].id,
      })));
    } else {
      materials.push(material);
      complaints.push(...parsedData.complaints);
    }
  });

  return {
    id,
    name,
    description,
    materials,
    complaints,
    expectedAnomalies: 0,
    expectedLateImpacts: materials.filter(m => m.versions.some(v => v.isLateArrival)).length,
    expectedMergeSuggestions: 0,
  };
}

export const demoScenarios: DemoScenario[] = [
  createScenario(
    'normal_case',
    '正常复核案例',
    '材料完整、数据一致，无异常情况',
    '幸福小区口袋公园',
    [
      {
        type: 'resident_feedback',
        title: '居民反馈汇总',
        content: `街道：幸福路
路口：和平路口
类型：座椅不足
描述：傍晚锻炼的老人多，座椅不够用
座椅数量：6
时间：2026-06-10 18:00
投诉人：王阿姨

街道：幸福路
路口：民主路口
类型：座椅损坏
描述：1个座椅螺丝松动，摇晃不稳
座椅数量：1
时间：2026-06-10 09:30
投诉人：李师傅`,
      },
      {
        type: 'attachment',
        title: '现场勘察报告',
        content: `街道：幸福路
路口：和平路口
类型：座椅统计
描述：现场清点座椅共8个，完好可用
座椅数量：8
时间：2026-06-11 14:00
勘察人：张工`,
      },
    ]
  ),

  createScenario(
    'late_attachment',
    '晚到附件案例',
    '核心演示：晚到附件如何改变结论，影响链清晰可见',
    '阳光小区口袋公园',
    [
      {
        type: 'resident_feedback',
        title: '6月15日居民反馈',
        content: `街道：阳光路
路口：春风路口
类型：座椅不足
描述：下午5点后老人孩子多，座椅不够坐，需要增加
座椅数量：4
时间：2026-06-15 17:30
投诉人：张阿姨

街道：阳光路
路口：春风路口
类型：座椅不足
描述：傍晚遛弯的人多，找不到座位休息
座椅数量：4
时间：2026-06-15 18:00
投诉人：李婆婆

街道：阳光路
路口：夏雨路口
类型：座椅损坏
描述：有2个座椅木板断裂，无法使用
座椅数量：2
时间：2026-06-15 10:20
投诉人：李师傅

街道：阳光路
路口：夏雨路
类型：座椅不足
描述：晚饭后散步的人多，找不到座位
座椅数量：3
时间：2026-06-15 19:00
投诉人：王女士

街道：阳光路
路口：秋风路口
类型：座椅不足
描述：健身区旁边座椅太少，大家只能站着
座椅数量：5
时间：2026-06-14 08:30
投诉人：赵大爷`,
      },
      {
        type: 'attachment',
        title: '现场勘察补充报告',
        content: `街道：阳光路
路口：春风路口
类型：座椅统计
描述：现场实际清点为6个，之前统计遗漏了树荫下的2个
座椅数量：6
时间：2026-06-15 17:30
投诉人：张阿姨

街道：阳光路
路口：夏雨路口
类型：座椅损坏
描述：有2个座椅木板断裂，另外1个螺丝松动
座椅数量：3
时间：2026-06-15 10:20
投诉人：李师傅

街道：阳光路
路口：冬雪路口
类型：座椅不足
描述：儿童游乐区旁边座椅太少
座椅数量：4
时间：2026-06-15 16:00
投诉人：孙女士`,
        isLateArrival: true,
        versionNote: '现场勘察后补充的修正数据，比原定时间晚到48小时，修改了座椅数量统计',
      },
      {
        type: 'verbal_note',
        title: '阿宁的口头补充',
        content: `街道：阳光路
路口：春风路口
类型：口头说明
描述：现场实际清点座椅数量为8个，比之前上报的多2个，是因为之前统计遗漏了树荫下的2个座椅
座椅数量：8
时间：2026-06-16 09:00
说明人：阿宁`,
      },
    ]
  ),

  createScenario(
    'wrong_intersection',
    '相邻路口合错案例',
    '核心演示：相邻路口合并错误被识别为异常，不会伪装成正常通过',
    '和平社区口袋公园',
    [
      {
        type: 'resident_feedback',
        title: '居民反馈',
        content: `街道：和平大道
路口：中山路口
类型：座椅不足
描述：早高峰后很多老人休息，座椅不够
座椅数量：3
时间：2026-06-12 09:00
投诉人：刘阿姨

街道：和平大道
路口：中山路口东
类型：座椅不足
描述：公交站旁边座椅太少，等车的人只能站着
座椅数量：2
时间：2026-06-12 08:30
投诉人：陈先生

街道：和平大道
路口：人民路口
类型：座椅损坏
描述：2个座椅损坏无法使用
座椅数量：2
时间：2026-06-12 11:00
投诉人：周师傅`,
      },
    ]
  ),

  createScenario(
    'bad_data',
    '坏数据案例',
    '核心演示：坏数据被识别，指向原始行号，不会带偏结论',
    '建设小区口袋公园',
    [
      {
        type: 'resident_feedback',
        title: '居民反馈汇总',
        content: `街道：建设路
路口：胜利路口
类型：座椅不足
描述：座椅数量异常
座椅数量：999
时间：2026-06-13 10:00
投诉人：吴先生

街道：建设路
类型：座椅损坏
描述：
座椅数量：
时间：2026-06-13 11:00
投诉人：郑女士

街道：建设路
路口：红旗路口
类型：座椅不足
描述：是
座椅数量：5
时间：2026-06-13 15:00
投诉人：`,
      },
    ]
  ),

  createScenario(
    'duplicate_complaints',
    '重复投诉案例',
    '核心演示：同一街口两条投诉被提示归并，不会直接合并',
    '新华社区口袋公园',
    [
      {
        type: 'resident_feedback',
        title: '微信群反馈',
        content: `街道：新华路
路口：解放路口
类型：座椅不足
描述：晚上跳广场舞的人多，休息的座椅不够
座椅数量：4
时间：2026-06-14 20:00
投诉人：许阿姨

街道：新华路
路口：解放路口
类型：座椅不足
描述：夜间活动的居民反映座椅不够用
座椅数量：4
时间：2026-06-14 20:30
投诉人：何阿姨

街道：新华路
路口：自由路口
类型：座椅损坏
描述：1个座椅木板断裂
座椅数量：1
时间：2026-06-14 16:00
投诉人：吕师傅`,
      },
      {
        type: 'attachment',
        title: '12345热线转办',
        content: `街道：新华路
路口：解放路口
类型：座椅不足
描述：市民反映晚上健身后找不到座位休息
座椅数量：4
时间：2026-06-14 21:00
投诉人：匿名`,
      },
    ]
  ),

  createScenario(
    'version_conflict',
    '版本冲突案例',
    '核心演示：同一份材料改口径被追踪，能看出哪份材料改过',
    '民主小区口袋公园',
    [
      {
        type: 'resident_feedback',
        title: '第一次反馈',
        content: `街道：民主路
路口：科学路口
类型：座椅不足
描述：老人反映座椅太少，需要增加3个
座椅数量：5
时间：2026-06-10 10:00
投诉人：钱阿姨`,
      },
    ]
  ),
];

export function getScenarioById(id: string): DemoScenario | undefined {
  return demoScenarios.find(s => s.id === id);
}

export const testCases = [
  {
    name: '晚到附件影响链分析',
    scenarioId: 'late_attachment',
    assertions: [
      '应检测到1份晚到附件',
      '影响链应包含座椅数量从4改为6的变更',
      '应说明原结论与修正结论的差异',
      '应引用原始数据行号',
    ],
  },
  {
    name: '相邻路口合错检测',
    scenarioId: 'wrong_intersection',
    assertions: [
      '应检测到"中山路口"与"中山路口东"的相似性',
      '应标记为"相邻路口可能合并错误"异常',
      '处理结果不应显示为正常通过',
      '应给出人工确认建议',
    ],
  },
  {
    name: '重复投诉归并提示',
    scenarioId: 'duplicate_complaints',
    assertions: [
      '应检测到新华路解放路口的重复投诉',
      '应提示用户确认是否合并，不应自动合并',
      '应展示两条记录的详细对比',
      '合并后原始数据仍可追溯',
    ],
  },
  {
    name: '坏数据识别与溯源',
    scenarioId: 'bad_data',
    assertions: [
      '应识别座椅数量999为异常值',
      '应识别空描述、空投诉人等缺失字段',
      '每个异常应指向原始行号',
      '异常数据不应带偏容量计算',
    ],
  },
  {
    name: '版本变更追踪',
    scenarioId: 'version_conflict',
    assertions: [
      '应记录每份材料的所有版本',
      '应高亮显示口径变化的字段',
      '应评估变更对结论的影响程度',
      '晚到附件应特殊标记',
    ],
  },
];
