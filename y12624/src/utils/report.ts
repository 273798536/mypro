import { ArrowRecord, ExportReport, ProblemItem } from '@/types';
import { statusLabels } from '@/data/mockData';
import { getStatusExplanation } from './detection';

export function generateReport(records: ArrowRecord[]): ExportReport {
  const totalRecords = records.length;
  const flippedRecords = records.filter(r => r.status === 'flipped');
  const warningRecords = records.filter(r => r.status === 'warning');
  const pendingRecords = records.filter(r => r.status === 'pending');
  const normalRecords = records.filter(r => r.status === 'normal');

  const problemList: ProblemItem[] = [];

  records.forEach((record) => {
    if (record.status !== 'normal') {
      problemList.push({
        id: record.id,
        type: statusLabels[record.status],
        description: getStatusExplanation(record.status),
        remark: record.remark,
        isUsable: record.status !== 'flipped',
      });
    }
  });

  const summary = `本次共校验 ${totalRecords} 条疏散箭头记录，其中：
- 正常记录：${normalRecords.length} 条（${((normalRecords.length / totalRecords) * 100).toFixed(1)}%）
- 坐标翻转：${flippedRecords.length} 条（${((flippedRecords.length / totalRecords) * 100).toFixed(1)}%）
- 警告记录：${warningRecords.length} 条
- 待复核：${pendingRecords.length} 条`;

  const explanation = `各位同事好：

这份报告是消防疏散箭头数据的自动校验结果。我来简单说明一下重点：

1. 【坐标翻转】的数据一定不能用
   - 这些记录的方向和正常箭头差180度，就像人往前走突然变成往后走
   - 可能是传感器装反了，或者数据处理时坐标搞反了
   - 直接删掉或者重新采集就好，别拿来做分析

2. 【警告】的数据需要看看
   - 方向变化有点大，但还没到完全相反的程度
   - 可能是正常拐弯，也可能是数据飘了
   - 需要结合当时的实际情况判断

3. 【待复核】的还没检查
   - 这些是新补录或者系统拿不准的数据
   - 麻烦各位老师帮忙过一遍

4. 备注里的话我都原样保留了
   - 带"【人工】"标记的是之前老师写的备注
   - 我没改任何原话，大家放心看

如果有不清楚的地方随时问我。

祝好，
教研团队`;

  return {
    summary,
    explanation,
    problemList,
    exportTime: new Date().toLocaleString('zh-CN'),
  };
}

export function formatReportForCopy(report: ExportReport): string {
  let content = `【消防疏散箭头校验报告】
导出时间：${report.exportTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 数据汇总
${report.summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 说明（可直接复制发送）

${report.explanation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 问题记录清单

`;

  if (report.problemList.length === 0) {
    content += '暂无问题记录，所有数据均正常！\n';
  } else {
    report.problemList.forEach((item, index) => {
      content += `${index + 1}. 记录 #${item.id} - ${item.type}\n`;
      content += `   ${item.isUsable ? '✅ 可使用（需复核）' : '❌ 不可使用'}\n`;
      content += `   ${item.description}\n`;
      if (item.remark) {
        content += `   【人工备注】${item.remark}\n`;
      }
      content += '\n';
    });
  }

  return content;
}
