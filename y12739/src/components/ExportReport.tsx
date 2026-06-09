import React from 'react';
import { Button, Space, message, Card } from 'antd';
import { useApp } from '../context/AppContext';

const ExportReport: React.FC = () => {
  const { state } = useApp();

  const buildReport = (): string => {
    const {
      student,
      transitionTable,
      conclusions,
      lateScorings,
      validationResult,
      latestExtrapolation,
      wrongQuestions,
    } = state;

    if (!student || !transitionTable) {
      return '请先加载样例数据或计算转移表后再导出报告。';
    }

    const lines: string[] = [];
    lines.push('='.repeat(60));
    lines.push('动态规划转移表 - 学生错题分析报告');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`学生：${student.name}（${student.grade}年级，层级 ${student.level}）`);
    lines.push(`报告生成时间：${new Date().toLocaleString()}`);
    lines.push(`转移表版本：v${transitionTable.version}`);
    lines.push('');

    lines.push('━'.repeat(40));
    lines.push('一、知识点掌握状态（与表格、图示一致）');
    lines.push('━'.repeat(40));
    transitionTable.states.forEach((s) => {
      lines.push(`  • ${s.knowledgePointName}：${s.value}（${s.label}），关联错题 ${s.sourceQuestionIds.length} 道`);
    });
    lines.push('');

    if (transitionTable.transitions.length > 0) {
      lines.push('━'.repeat(40));
      lines.push('二、近期状态转移');
      lines.push('━'.repeat(40));
      transitionTable.transitions.forEach((t) => {
        const arrow = t.transitionType === 'improve' ? '↑' : t.transitionType === 'decline' ? '↓' : '→';
        lines.push(`  ${arrow} ${t.description}（概率 ${(t.probability * 100).toFixed(0)}%）`);
      });
      lines.push('');
    }

    lines.push('━'.repeat(40));
    lines.push('三、分析结论');
    lines.push('━'.repeat(40));
    conclusions.forEach((c, idx) => {
      const mark = c.status === 'valid' ? '✅' : c.status === 'suspicious' ? '⚠️' : '❌';
      lines.push(`  ${idx + 1}. ${mark} [${c.status === 'valid' ? '有效' : c.status === 'suspicious' ? '存疑' : '失效'}] ${c.title}`);
      lines.push(`     ${c.content}`);
      if (c.status === 'suspicious' && c.invalidReason) {
        lines.push(`     ⚠ ${c.invalidReason}`);
      }
      lines.push('');
    });

    if (lateScorings.length > 0) {
      lines.push('━'.repeat(40));
      lines.push('四、晚到评分记录（影响结论有效性）');
      lines.push('━'.repeat(40));
      lateScorings.forEach((sr) => {
        const wq = wrongQuestions.find((q) => q.questionId === sr.questionId);
        lines.push(`  ⏰ ${wq?.questionTitle ?? sr.questionId}`);
        lines.push(`     晚到 ${sr.lateDays} 天，评分人：${sr.graderName || '待评分'}`);
        lines.push(`     评语：${sr.comment || '（无）'}`);
        lines.push(`     基于此评分的结论均已标记为"存疑"，请勿直接使用。`);
        lines.push('');
      });
    }

    if (latestExtrapolation && !latestExtrapolation.success) {
      lines.push('━'.repeat(40));
      lines.push('五、外推越界拦截说明');
      lines.push('━'.repeat(40));
      lines.push(`  拦截原因：${latestExtrapolation.blockedReason}`);
      lines.push(`  请求步数：${latestExtrapolation.actualSteps}`);
      lines.push(`  规则允许上限：${latestExtrapolation.maxAllowedSteps} 步`);
      lines.push('');
      lines.push('  【学生可理解的解释】');
      lines.push('  当前只允许向前预测 ' + latestExtrapolation.maxAllowedSteps + ' 步。超过这个范围后，');
      lines.push('  掌握度预测的可信度会快速下降，为了不让错误的预测误导你的学习计划，');
      lines.push('  系统自动拦下了这次超过范围的预测。你可以尝试缩小步数，或者补充更多练习数据后再试。');
      lines.push('');
    }

    if (validationResult && !validationResult.isValid) {
      lines.push('━'.repeat(40));
      lines.push('六、约束校验问题');
      lines.push('━'.repeat(40));
      lines.push(`  通过 ${validationResult.passedRules}/${validationResult.totalRules} 条规则`);
      validationResult.violations.forEach((v) => {
        const sev = v.severity === 'error' ? '❌' : v.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`  ${sev} [${v.ruleName}] ${v.message}`);
        lines.push(`     建议：${v.suggestedAction}`);
      });
      lines.push('');
    }

    lines.push('━'.repeat(40));
    lines.push('报告结束');
    lines.push('━'.repeat(40));
    return lines.join('\n');
  };

  const exportTxt = () => {
    const report = buildReport();
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DP转移表报告_${state.student?.name ?? '未命名'}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('报告已导出（txt）');
  };

  const copyReport = async () => {
    const report = buildReport();
    try {
      await navigator.clipboard.writeText(report);
      message.success('报告已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择文本复制');
    }
  };

  const preview = buildReport();

  return (
    <Card
      size="small"
      title="导出报告（学生只看报告也应明白外推越界为什么被拦）"
      extra={
        <Space>
          <Button onClick={copyReport}>复制到剪贴板</Button>
          <Button type="primary" onClick={exportTxt}>导出 TXT</Button>
        </Space>
      }
    >
      <pre
        style={{
          maxHeight: 400,
          overflow: 'auto',
          background: '#fafafa',
          padding: 12,
          fontSize: 12,
          border: '1px solid #eee',
          whiteSpace: 'pre-wrap',
          fontFamily: 'Menlo, Consolas, monospace',
        }}
      >
        {preview}
      </pre>
    </Card>
  );
};

export default ExportReport;
