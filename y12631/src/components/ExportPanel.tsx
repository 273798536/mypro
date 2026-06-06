import { useState } from 'react';
import { ExportReport, ScoreDetail, Operation, ScoreSnapshot, MaterialRecord } from '../types';
import { materialRecords } from '../data/examples';

interface ExportPanelProps {
  mazeName: string;
  scoreDetails: ScoreDetail[];
  operations: Operation[];
  totalScore: number;
  scoreHistory: ScoreSnapshot[];
}

const getStatusLabel = (status: MaterialRecord['status']): string => {
  switch (status) {
    case 'available': return '正常可用';
    case 'missing': return '文件找不到了';
    case 'corrupted': return '文件损坏打不开';
    case 'outdated': return '版本太旧了';
    default: return '状态未知';
  }
};

const getTypeLabel = (type: MaterialRecord['type']): string => {
  switch (type) {
    case 'image': return '图片素材';
    case 'sound': return '音效素材';
    case 'sprite': return '角色精灵';
    default: return '其他素材';
  }
};

export const ExportPanel = ({ mazeName, scoreDetails, operations, totalScore, scoreHistory }: ExportPanelProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const generateReport = (): ExportReport => {
    const materialIssues = materialRecords.filter(m => m.status !== 'available');

    const getOpTypeLabel = (type: string) => {
      switch (type) {
        case 'import': return '导入样例';
        case 'edit': return '编辑格子';
        case 'correct': return '修正问题';
        case 'confirm': return '确认完成';
        case 'annotate': return '添加标注';
        case 'restore': return '恢复历史';
        default: return '操作';
      }
    };

    const changesSummary = operations.slice(-8).map(op => {
      const scoreChanged = op.scoreBefore !== undefined && op.scoreAfter !== undefined && op.scoreBefore !== op.scoreAfter;
      let humanReadable = op.annotation ? `标注内容：${op.annotation}` : op.description;
      if (scoreChanged) {
        const diff = (op.scoreAfter as number) - (op.scoreBefore as number);
        if (diff > 0) {
          humanReadable += ` — 这次修改让评分提高了 ${diff} 分`;
        } else {
          humanReadable += ` — 这次修改让评分降低了 ${Math.abs(diff)} 分（可能是误操作，可以用恢复功能撤销）`;
        }
      } else if (op.scoreBefore !== undefined && op.scoreAfter !== undefined) {
        humanReadable += ' — 评分没有变化，可能是修改的位置不影响评分';
      }
      return {
        field: getOpTypeLabel(op.type),
        before: op.scoreBefore !== undefined ? `${op.scoreBefore} 分` : '修改前',
        after: op.scoreAfter !== undefined ? `${op.scoreAfter} 分` : '修改后',
        reason: op.description,
        humanReadable,
      };
    });

    return {
      mazeName,
      totalScore,
      scoreDetails,
      operations,
      materialIssues,
      createdAt: Date.now(),
      changesSummary,
      scoreHistory,
    };
  };

  const handleExport = () => {
    setIsExporting(true);

    setTimeout(() => {
      const report = generateReport();

      const scoreComment =
        report.totalScore >= 80 ? '🏆 优秀！迷宫设计完成度很高，小朋友一定会喜欢！' :
        report.totalScore >= 60 ? '👍 良好！整体不错，再改改细节就更棒了！' :
        report.totalScore >= 40 ? '💪 需要改进，有些地方小朋友可能会卡住，加油！' :
        '🔄 需要重做，迷宫目前不太完整，跟着下面的提示一条条改吧！';

      const materialSection = report.materialIssues.length === 0
        ? '✅ 所有素材都正常，没有问题。'
        : `发现 ${report.materialIssues.length} 个素材问题，需要处理一下：

${report.materialIssues.map((issue, idx) => `### 素材问题 ${idx + 1}：${issue.name}
- 素材类型：${getTypeLabel(issue.type)}
- 当前状态：${getStatusLabel(issue.status)}
- 用大白话讲：${issue.humanReadableError || issue.errorMessage || '系统检测到这个素材有异常'}
${issue.fixSuggestion ? `- 怎么修好：${issue.fixSuggestion}` : ''}
${issue.note ? `- 备注：${issue.note}` : ''}
`).join('\n')}`;

      const scoreHistorySection = report.scoreHistory.length > 1
        ? `## 评分变化过程（每次操作后分数怎么变的）

| 时间 | 操作 | 分数 |
|------|------|------|
${report.scoreHistory.map(s => `| ${new Date(s.timestamp).toLocaleTimeString('zh-CN')} | ${s.operationDescription || '操作'} | ${s.totalScore} 分 |`).join('\n')}

> 可以看到每一次导入、修改、批改后，分数是怎么涨上去或掉下来的。`
        : '';

      const changesSection = report.changesSummary.length > 0
        ? `## 最近做了哪些修改

${report.changesSummary.map((change, idx) => `### 修改 ${idx + 1}
- 做了什么：${change.humanReadable || change.reason}
- 改之前：${change.before}
- 改之后：${change.after}
`).join('\n')}`
        : '';

      const reportContent = `
# 🎮 迷宫设计复盘报告

> 这份报告是给老师、家长、同学看的，没有技术术语，放心读。

---

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 迷宫名称 | ${report.mazeName} |
| 生成时间 | ${new Date(report.createdAt).toLocaleString('zh-CN')} |
| 最终得分 | ${report.totalScore} 分（满分 100 分） |

**总体评价：** ${scoreComment}

---

## 二、每一项得分详细说明

${report.scoreDetails.map(detail => {
  const icon = detail.issueType === 'error' ? '❌' : detail.issueType === 'warning' ? '⚠️' : '✅';
  const statusText = detail.issueType === 'error' ? '有问题需要改' : detail.issueType === 'warning' ? '还可以改进' : '做得很好';
  const layerNote = detail.affectedByLayer ? '（这一项受到图层遮挡影响）' : '';
  return `### ${icon} ${detail.category}：${detail.score}/${detail.maxScore} 分 — ${statusText}${layerNote}

**系统提示：** ${detail.reason}

**用大白话讲：** ${detail.humanReadableReason || detail.reason}
`;
}).join('\n')}

---

${scoreHistorySection}

---

${changesSection}

---

## 三、操作记录（最近 ${Math.min(report.operations.length, 15)} 条）

${report.operations.slice(-15).reverse().map((op, index) => {
  const icon = op.type === 'import' ? '📥' : op.type === 'edit' ? '✏️' : op.type === 'correct' ? '🔧' : op.type === 'confirm' ? '✅' : op.type === 'annotate' ? '📝' : '↩️';
  const typeText = op.type === 'import' ? '导入' : op.type === 'edit' ? '编辑' : op.type === 'correct' ? '修正' : op.type === 'confirm' ? '确认完成' : op.type === 'annotate' ? '添加批注' : '恢复到之前';
  const scoreDiff = op.scoreBefore !== undefined && op.scoreAfter !== undefined
    ? `（${op.scoreBefore}分 → ${op.scoreAfter}分${op.scoreAfter > op.scoreBefore ? '，涨了' + (op.scoreAfter - op.scoreBefore) + '分' : op.scoreAfter < op.scoreBefore ? '，掉了' + (op.scoreBefore - op.scoreAfter) + '分' : '，没变'}）`
    : '';
  return `${index + 1}. ${new Date(op.timestamp).toLocaleTimeString('zh-CN')} — ${icon} ${typeText}：${op.description}${scoreDiff}${op.annotation ? `「批注：${op.annotation}」` : ''}`;
}).join('\n')}

---

## 四、素材问题检查

${materialSection}

---

*报告生成时间：${new Date().toLocaleString('zh-CN')}*
*本报告由「儿童编程迷宫编辑器」自动生成，所有文字都已翻译成大白话，看不懂可以直接问老师。*
      `.trim();

      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `迷宫复盘报告_${mazeName}_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowReport(true);
      setIsExporting(false);

      setTimeout(() => setShowReport(false), 4000);
    }, 1200);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">📤 导出复盘</h3>

      <p className="text-xs text-gray-500 mb-3">
        导出的报告里没有技术术语，都是大白话，老师、家长、同学都能看懂。
      </p>

      <button
        className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>正在生成报告...</span>
          </>
        ) : (
          <>
            <span>📥</span>
            <span>导出复盘报告（大白话版）</span>
          </>
        )}
      </button>

      {showReport && (
        <div className="mt-3 p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2 border border-green-200">
          <span>✅</span>
          <div>
            <p className="font-medium text-sm">报告已导出成功！</p>
            <p className="text-xs text-green-500">里面有评分变化过程、素材问题说明、修改前后对比</p>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">📋 报告里有这些内容</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• 每一项得分的大白话解释（不用看字段名）</li>
          <li>• 每次操作后分数怎么变的（涨了还是掉了）</li>
          <li>• 素材问题说明（"文件找不到了"而不是"ENOENT"）</li>
          <li>• 最近修改了什么，改之前改之后对比</li>
          <li>• 操作历史时间线</li>
        </ul>
      </div>
    </div>
  );
};
