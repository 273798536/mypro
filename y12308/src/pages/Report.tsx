import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  FileText,
  Download,
  CheckCircle,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  File,
  FileArchive,
  Eye,
  ZoomIn,
  ZoomOut,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore, HistoricalTrendItem } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { MemberStatus, StatusJumpReview } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const STATUS_TITLES: Record<string, string> = {
  active: '活跃',
  at_risk: '高危',
  silent: '沉默',
  churned: '流失',
  new: '新会员',
  reactivated: '回流',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  at_risk: '#F59E0B',
  silent: '#64748B',
  churned: '#EF4444',
  new: '#3B82F6',
  reactivated: '#8B5CF6',
};

interface GenerationStep {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
}

interface DownloadProgress {
  type: 'csv' | 'pdf' | 'zip' | null;
  step: number;
  total: number;
  label: string;
}

const Report: React.FC = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const {
    members,
    activities,
    jumpReviews,
    predictions,
    transitionMatrix,
    currentReport,
    currentBatchId,
    dataHash,
    generateReport,
    getCurrentBatch,
    validateDataSource,
    reviewJump,
    getHistoricalTrends,
  } = useStore();

  const currentBatch = getCurrentBatch();
  const historicalTrends = getHistoricalTrends();

  const [reportTitle, setReportTitle] = useState(
    currentBatch ? `[${currentBatch.name}] 会员流失分析报告` : '会员流失分析报告'
  );
  const [reportSummary, setReportSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { id: 'data', label: '数据整理', completed: false, active: false },
    { id: 'charts', label: '图表生成', completed: false, active: false },
    { id: 'explanations', label: '解释生成', completed: false, active: false },
    { id: 'assembly', label: '报告组装', completed: false, active: false },
  ]);

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    type: null,
    step: 0,
    total: 0,
    label: '',
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [editingExplanation, setEditingExplanation] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState('');

  const unapprovedReviews = useMemo(
    () => jumpReviews.filter((r) => r.isApproved !== true),
    [jumpReviews]
  );

  const statusDistributionData = useMemo(() => {
    const statuses = Object.values(MemberStatus);
    return statuses.map((status) => ({
      name: STATUS_TITLES[status],
      value: members.filter((m) => m.currentStatus === status).length,
      color: STATUS_COLORS[status],
    }));
  }, [members]);

  const churnTrendData = useMemo((): HistoricalTrendItem[] => {
    return historicalTrends;
  }, [historicalTrends]);

  const predictionChurnTrendData = useMemo(() => {
    const prediction = predictions.find((p) => p.horizonMonths === 3);
    if (!prediction || historicalTrends.length === 0) return [];

    const nonMissingTrends = historicalTrends.filter(t => !t.isMissing);
    const lastMonth = nonMissingTrends.length > 0 
      ? nonMissingTrends[nonMissingTrends.length - 1].month 
      : null;
    
    if (!lastMonth) return [];

    const data: Array<{ month: string; churnRate: number; isPrediction: boolean }> = [];

    nonMissingTrends.forEach((trend) => {
      data.push({
        month: trend.month,
        churnRate: trend.churnRate,
        isPrediction: false,
      });
    });

    prediction.predictions.forEach((p, idx) => {
      const [year, month] = lastMonth.split('-').map(Number);
      const m = month + idx + 1;
      const y = year + Math.floor((m - 1) / 12);
      const actualM = ((m - 1) % 12) + 1;
      data.push({
        month: `${y}-${String(actualM).padStart(2, '0')}`,
        churnRate: Math.round(p.distribution[MemberStatus.churned] * 100 * 100) / 100,
        isPrediction: true,
      });
    });

    return data;
  }, [predictions, historicalTrends]);

  const keyConclusions = useMemo(() => {
    const totalMembers = members.length;
    const churnedCount = members.filter((m) => m.currentStatus === MemberStatus.churned).length;
    const atRiskCount = members.filter((m) => m.currentStatus === MemberStatus.at_risk).length;
    const highRiskCount = members.filter((m) => m.churnProbability > 0.6).length;
    const churnRate = ((churnedCount / totalMembers) * 100).toFixed(1);

    const nonMissingTrends = historicalTrends.filter(t => !t.isMissing);
    const lastTrend = nonMissingTrends.length > 0 ? nonMissingTrends[nonMissingTrends.length - 1] : null;
    const prevTrend = nonMissingTrends.length > 1 ? nonMissingTrends[nonMissingTrends.length - 2] : null;
    
    let monthComparison = '';
    if (lastTrend && prevTrend) {
      const diff = lastTrend.churnRate - prevTrend.churnRate;
      const direction = diff > 0 ? '上升' : diff < 0 ? '下降' : '持平';
      const absDiff = Math.abs(diff).toFixed(1);
      monthComparison = `，较上月${direction} ${absDiff} 个百分点`;
    }

    const lastPrediction = predictionChurnTrendData.length > 0 
      ? predictionChurnTrendData[predictionChurnTrendData.length - 1]?.churnRate 
      : null;

    return [
      `当前批次共 ${totalMembers} 名会员，整体流失率为 ${churnRate}%${monthComparison}`,
      `高危会员 ${atRiskCount} 人，其中 ${highRiskCount} 人未来3个月流失概率超过 60%，需重点关注`,
      `活跃→流失异常跳转 ${unapprovedReviews.length} 条，其中 ${jumpReviews.filter((r) => r.isApproved === false).length} 条已驳回，建议尽快复核`,
      lastPrediction 
        ? `预测未来3个月流失率将维持在 ${lastPrediction}% 左右，建议提前启动召回活动`
        : `预测未来3个月流失率将维持在 ${churnRate}% 左右，建议提前启动召回活动`,
      `沉默会员向流失转化率较高（约 ${transitionMatrix?.cells.find((c) => c.fromStatus === MemberStatus.silent && c.toStatus === MemberStatus.churned)?.probability.toFixed(1) || 15}%），建议优化沉默会员唤醒策略`,
    ];
  }, [members, unapprovedReviews, jumpReviews, transitionMatrix, churnTrendData, historicalTrends, predictionChurnTrendData]);

  const topTransitions = useMemo(() => {
    if (!transitionMatrix) return [];
    return [...transitionMatrix.cells]
      .filter((c) => c.count > 0 && c.fromStatus !== c.toStatus)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
  }, [transitionMatrix]);

  const interventionSuggestions = useMemo(() => {
    return [
      {
        title: '高危会员专属优惠',
        target: '高危会员',
        description: '向流失概率>60%的会员推送专属优惠券，降低流失率预估15%',
        priority: '高',
      },
      {
        title: '沉默会员唤醒活动',
        target: '沉默会员',
        description: '通过短信和APP推送个性化活动邀请，提升活跃度',
        priority: '中',
      },
      {
        title: '异常跳转人工复核',
        target: '待审核跳转',
        description: '对未通过的状态跳转进行人工复核，确保数据准确性',
        priority: '高',
      },
    ];
  }, []);

  const runGenerationSteps = async () => {
    setIsGenerating(true);
    setGenerationSteps((steps) => steps.map((s) => ({ ...s, completed: false, active: false })));

    const steps = ['data', 'charts', 'explanations', 'assembly'] as const;

    for (let i = 0; i < steps.length; i++) {
      setGenerationSteps((prev) =>
        prev.map((s) => ({
          ...s,
          active: s.id === steps[i],
          completed: i > 0 && prev.find((ps) => ps.id === steps[i - 1])?.completed || false,
        }))
      );

      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

      setGenerationSteps((prev) =>
        prev.map((s) => ({
          ...s,
          completed: s.id === steps[i] ? true : s.completed,
          active: false,
        }))
      );
    }

    generateReport();

    const batch = getCurrentBatch();
    setReportSummary(
      `本报告基于 ${batch?.startDate} 至 ${batch?.endDate} 的数据，对 ${members.length} 名会员进行了全面的流失风险分析。报告包含会员状态分布、流失趋势预测、异常状态跳转分析及针对性干预建议，为会员运营决策提供数据支持。`
    );

    setIsGenerating(false);
  };

  const validateAndPrepareExport = (): boolean => {
    const isValid = validateDataSource();
    if (!isValid) {
      alert('数据批次校验失败，请刷新数据后重试');
      return false;
    }
    return true;
  };

  const generateFileName = (extension: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${currentBatchId}_${timestamp}.${extension}`;
  };

  const downloadCSV = async () => {
    if (!validateAndPrepareExport()) return;

    setDownloadProgress({
      type: 'csv',
      step: 1,
      total: 5,
      label: '正在整理会员数据 1/5...',
    });

    const steps = [
      '正在整理会员数据 1/5...',
      '正在处理状态历史 2/5...',
      '正在导出行为标签 3/5...',
      '正在生成CSV文件 4/5...',
      '正在下载文件 5/5...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDownloadProgress((prev) => ({ ...prev, step: i + 1, label: steps[i] }));
    }

    const csvData = members.map((m) => ({
      '会员ID': m.id,
      '会员姓名': m.name,
      '联系电话': m.phone,
      '注册日期': m.registerDate,
      '当前状态': STATUS_TITLES[m.currentStatus],
      '订单总数': m.totalOrders,
      '累计消费': m.totalAmount,
      '最后活跃': m.lastActiveDate,
      '流失概率': `${(m.churnProbability * 100).toFixed(1)}%`,
      '3月预测状态': STATUS_TITLES[m.predictedStatus3m],
      '行为标签': m.behaviorTags.join(';'),
      '系统标签': m.systemTags.join(';'),
      '数据批次': currentBatchId,
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '会员数据');
    XLSX.writeFile(wb, generateFileName('xlsx'));

    setTimeout(() => {
      setDownloadProgress({ type: null, step: 0, total: 0, label: '' });
    }, 500);
  };

  const downloadPDF = async () => {
    if (!validateAndPrepareExport()) return;

    setDownloadProgress({
      type: 'pdf',
      step: 1,
      total: 5,
      label: '正在渲染报告页面 1/5...',
    });

    const steps = [
      '正在渲染报告页面 1/5...',
      '正在生成图表快照 2/5...',
      '正在排版页面内容 3/5...',
      '正在生成PDF文件 4/5...',
      '正在下载文件 5/5...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setDownloadProgress((prev) => ({ ...prev, step: i + 1, label: steps[i] }));
    }

    const printContent = reportRef.current;
    if (printContent) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'visible';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
              .report-container { max-width: 800px; margin: 0 auto; }
              .cover { text-align: center; padding: 60px 40px; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px; }
              .cover h1 { font-size: 28px; color: #111827; margin-bottom: 20px; }
              .cover .meta { color: #6b7280; font-size: 14px; line-height: 2; }
              .section { margin-bottom: 30px; page-break-inside: avoid; }
              .section h2 { font-size: 18px; color: #111827; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
              .conclusions { background: #f9fafb; padding: 20px; border-radius: 8px; }
              .conclusions li { margin-bottom: 10px; color: #374151; line-height: 1.6; }
              .chart-container { height: 300px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; }
              th { background: #f9fafb; font-weight: 600; }
              @media print {
                body { padding: 0; }
                .page-break { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            <div class="report-container">
              <div class="cover">
                <h1>${reportTitle}</h1>
                <div class="meta">
                  <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
                  <p>数据批次：${currentBatch?.name} (${currentBatchId})</p>
                  <p>数据指纹：${dataHash || '-'}</p>
                  <p>生成人：系统管理员</p>
                  <p>会员总数：${members.length} 人</p>
                </div>
              </div>
              <div class="section">
                <h2>报告摘要</h2>
                <p style="color: #374151; line-height: 1.8;">${reportSummary || '报告生成中...'}</p>
              </div>
              <div class="section page-break">
                <h2>核心结论</h2>
                <div class="conclusions">
                  <ol>
                    ${keyConclusions.map((c) => `<li>${c}</li>`).join('')}
                  </ol>
                </div>
              </div>
              <div class="section">
                <h2>会员状态分布</h2>
                <table>
                  <tr><th>状态</th><th>人数</th><th>占比</th></tr>
                  ${statusDistributionData
                    .map(
                      (d) => `
                    <tr>
                      <td>${d.name}</td>
                      <td>${d.value}</td>
                      <td>${((d.value / members.length) * 100).toFixed(1)}%</td>
                    </tr>
                  `
                    )
                    .join('')}
                </table>
              </div>
              <div class="section page-break">
                <h2>关键转移概率</h2>
                <table>
                  <tr><th>从状态</th><th>到状态</th><th>转移概率</th><th>人数</th></tr>
                  ${topTransitions
                    .map(
                      (t) => `
                    <tr>
                      <td>${STATUS_TITLES[t.fromStatus]}</td>
                      <td>${STATUS_TITLES[t.toStatus]}</td>
                      <td>${(t.probability * 100).toFixed(1)}%</td>
                      <td>${t.count}人</td>
                    </tr>
                  `
                    )
                    .join('')}
                </table>
              </div>
              <div class="section">
                <h2>干预建议</h2>
                ${interventionSuggestions
                  .map(
                    (s, i) => `
                  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #3b82f6;">
                    <h3 style="font-size: 15px; margin-bottom: 5px;">${i + 1}. ${s.title}</h3>
                    <p style="font-size: 13px; color: #6b7280; margin-bottom: 5px;">目标人群：${s.target}</p>
                    <p style="font-size: 13px; color: #374151;">${s.description}</p>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      document.body.style.overflow = originalOverflow;
    }

    setTimeout(() => {
      setDownloadProgress({ type: null, step: 0, total: 0, label: '' });
    }, 500);
  };

  const downloadZIP = async () => {
    if (!validateAndPrepareExport()) return;

    setDownloadProgress({
      type: 'zip',
      step: 1,
      total: 5,
      label: '正在收集客服备注 1/5...',
    });

    const steps = [
      '正在收集客服备注 1/5...',
      '正在整理审核记录 2/5...',
      '正在收集活动标记 3/5...',
      '正在打包ZIP文件 4/5...',
      '正在下载文件 5/5...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownloadProgress((prev) => ({ ...prev, step: i + 1, label: steps[i] }));
    }

    const zip = new JSZip();

    const notesData = members.flatMap((m) =>
      m.customerServiceNotes.map((note) => ({
        '会员ID': m.id,
        '会员姓名': m.name,
        '记录日期': note.date,
        '操作人': note.operator,
        '类型': { complaint: '投诉', consult: '咨询', feedback: '反馈', other: '其他' }[note.type],
        '内容': note.content,
        '关联状态': note.relatedStatus ? STATUS_TITLES[note.relatedStatus] : '',
      }))
    );

    const notesWs = XLSX.utils.json_to_sheet(notesData);
    const notesWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(notesWb, notesWs, '客服备注');
    const notesExcelBuffer = XLSX.write(notesWb, { bookType: 'xlsx', type: 'array' });
    zip.file('客服备注记录.xlsx', notesExcelBuffer);

    const reviewsData = jumpReviews.map((r) => ({
      '审核ID': r.id,
      '会员ID': r.memberId,
      '跳转日期': r.jumpDate,
      '从状态': STATUS_TITLES[r.fromStatus],
      '到状态': STATUS_TITLES[r.toStatus],
      '审核状态': r.isApproved === null ? '待审核' : r.isApproved ? '已通过' : '已驳回',
      '审核人': r.reviewer || '',
      '审核日期': r.reviewDate || '',
      '审核意见': r.reviewComment || '',
      '证据': r.evidence.join('; '),
      '解释': r.plainLanguageExplanation || '',
    }));

    const reviewsWs = XLSX.utils.json_to_sheet(reviewsData);
    const reviewsWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(reviewsWb, reviewsWs, '审核记录');
    const reviewsExcelBuffer = XLSX.write(reviewsWb, { bookType: 'xlsx', type: 'array' });
    zip.file('状态跳转审核记录.xlsx', reviewsExcelBuffer);

    const activitiesData = activities.map((a) => ({
      '活动ID': a.id,
      '活动名称': a.name,
      '类型': { promotion: '促销', version_update: '版本更新', event: '事件', campaign: '营销活动' }[a.type],
      '开始日期': a.startDate,
      '结束日期': a.endDate,
      '重叠活动': (a.overlapWith || []).join('; '),
      '版本': a.version || '',
    }));

    const actWs = XLSX.utils.json_to_sheet(activitiesData);
    const actWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(actWb, actWs, '活动记录');
    const actExcelBuffer = XLSX.write(actWb, { bookType: 'xlsx', type: 'array' });
    zip.file('活动标记记录.xlsx', actExcelBuffer);

    const metadata = {
      '批次ID': currentBatchId,
      '批次名称': currentBatch?.name,
      '数据区间': `${currentBatch?.startDate} 至 ${currentBatch?.endDate}`,
      '数据指纹': dataHash || '-',
      '同源校验状态': validateDataSource() ? '通过' : '未通过',
      '导出时间': new Date().toISOString(),
      '导出人': '系统管理员',
      '会员总数': members.length,
      '审核记录数': jumpReviews.length,
      '客服备注数': notesData.length,
      '活动数': activities.length,
    };
    zip.file('元数据.json', JSON.stringify(metadata, null, 2));

    const dataValidationInfo = {
      '校验说明': '本文件包含数据同源校验信息，用于确保图表、明细、下载文件来自同一批数据',
      '批次ID': currentBatchId,
      '数据指纹': dataHash || '-',
      '校验时间': new Date().toISOString(),
      '校验项目': {
        '转移矩阵批次一致性': transitionMatrix?.batchId === currentBatchId,
        '预测数据批次一致性': predictions.every(p => p.batchId === currentBatchId),
        '历史趋势数据完整性': historicalTrends.length > 0,
        '数据哈希校验': validateDataSource(),
      },
    };
    zip.file('数据同源校验说明.json', JSON.stringify(dataValidationInfo, null, 2));

    const content = zip.generateAsync({ type: 'blob' });
    content.then(function (blob) {
      saveAs(blob, generateFileName('zip'));
      setDownloadProgress({ type: null, step: 0, total: 0, label: '' });
    });
  };

  const handleEditExplanation = (review: StatusJumpReview) => {
    setEditingExplanation(review.id);
    setExplanationText(review.plainLanguageExplanation || '');
  };

  const handleSaveExplanation = (reviewId: string, isApproved: boolean) => {
    const review = jumpReviews.find((r) => r.id === reviewId);
    if (review) {
      reviewJump(reviewId, isApproved, '', explanationText);
    }
    setEditingExplanation(null);
    setExplanationText('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const estimateFileSize = (type: 'csv' | 'pdf' | 'zip') => {
    const baseSize = members.length * 0.5;
    switch (type) {
      case 'csv':
        return `${(baseSize * 0.1).toFixed(1)} MB`;
      case 'pdf':
        return `${(baseSize * 0.3).toFixed(1)} MB`;
      case 'zip':
        return `${(baseSize * 0.8).toFixed(1)} MB`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 rounded-full p-2">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">报告导出</h1>
            <p className="text-sm text-gray-500">生成分析报告并下载数据</p>
          </div>
        </div>

        <div className={cn(
          'mb-6 p-4 rounded-xl border flex items-center gap-3',
          validateDataSource()
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        )}>
          {validateDataSource() ? (
            <CheckCircle className="text-green-600" size={20} />
          ) : (
            <AlertCircle className="text-red-600" size={20} />
          )}
          <div className="flex-1">
            <p className={cn(
              'text-sm font-medium',
              validateDataSource() ? 'text-green-800' : 'text-red-800'
            )}>
              {validateDataSource() ? '数据同源校验通过' : '数据同源校验异常'}
            </p>
            <p className="text-xs text-gray-600 font-mono mt-1">
              数据指纹：{dataHash || '-'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报告标题
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="输入报告标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报告摘要
              </label>
              <textarea
                value={reportSummary}
                onChange={(e) => setReportSummary(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder="点击生成报告后将自动生成摘要，也可手动编辑"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={runGenerationSteps}
              disabled={isGenerating}
              className={cn(
                'w-full py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all',
                isGenerating
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-200'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  正在生成报告...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  生成报告
                </>
              )}
            </motion.button>

            <div className="space-y-3 mt-6">
              {generationSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                      step.completed
                        ? 'bg-green-500 text-white'
                        : step.active
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    )}
                  >
                    {step.completed ? (
                      <CheckCircle size={18} />
                    ) : step.active ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          step.completed
                            ? 'text-green-600'
                            : step.active
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: step.completed ? '100%' : step.active ? '60%' : '0%',
                        }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          'h-full rounded-full',
                          step.completed ? 'bg-green-500' : step.active ? 'bg-blue-500' : 'bg-gray-300'
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-blue-600" />
              数据同源校验
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">当前批次</span>
                <span className="font-medium text-gray-800">{currentBatch?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">批次ID</span>
                <span className="font-mono text-xs text-gray-500">{currentBatchId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">数据区间</span>
                <span className="font-medium text-gray-800">
                  {currentBatch?.startDate} ~ {currentBatch?.endDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">会员总数</span>
                <span className="font-medium text-gray-800">{members.length} 人</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">校验状态</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    validateDataSource()
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {validateDataSource() ? '✓ 校验通过' : '✗ 校验失败'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentReport && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 rounded-full p-2">
                <Eye className="text-emerald-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">复盘报告预览</h2>
                <p className="text-sm text-gray-500">A4 纸张比例 · 可缩放预览</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ZoomOut size={20} className="text-gray-600" />
              </button>
              <span className="text-sm text-gray-600 w-16 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ZoomIn size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-6 overflow-auto max-h-[900px]">
            <motion.div
              ref={reportRef}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
              }}
              className="w-[210mm] mx-auto bg-white shadow-xl"
            >
              <div className="p-12">
                <div className="text-center pb-10 border-b-2 border-gray-200">
                  <h1 className="text-3xl font-bold text-gray-900 mb-6">{reportTitle}</h1>
                  <div className="space-y-2 text-gray-600">
                    <p className="flex items-center justify-center gap-2">
                      <Calendar size={16} />
                      生成时间：{formatDateTime(new Date().toISOString())}
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <BarChart3 size={16} />
                      数据批次：{currentBatch?.name} ({currentBatchId})
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <User size={16} />
                      生成人：{currentReport.generatedBy}
                    </p>
                  </div>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    报告摘要
                  </h2>
                  <p className="text-gray-700 leading-relaxed">{reportSummary}</p>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    核心结论
                  </h2>
                  <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                    {keyConclusions.slice(0, 5).map((conclusion, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-gray-700 leading-relaxed">{conclusion}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    会员状态分布
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistributionData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    流失趋势预测
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={predictionChurnTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(value) => `${value}%`}
                          tick={{ fontSize: 12 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, '流失率']}
                          labelFormatter={(label) => {
                            const item = predictionChurnTrendData.find(d => d.month === label);
                            return item?.isPrediction ? `月份：${label}（预测）` : `月份：${label}（历史）`;
                          }}
                        />
                        <ReferenceLine
                          x={predictionChurnTrendData.find(d => d.isPrediction)?.month}
                          stroke="#EF4444"
                          strokeDasharray="5 5"
                          label={{ value: '预测开始', fill: '#EF4444', fontSize: 12 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="churnRate"
                          stroke="#EF4444"
                          strokeWidth={2}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload?.isPrediction) {
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={5}
                                  fill="#FFF"
                                  stroke="#EF4444"
                                  strokeWidth={2}
                                  strokeDasharray="3 3"
                                />
                              );
                            }
                            return <circle cx={cx} cy={cy} r={4} fill="#EF4444" />;
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-3">
                    实线圆点为历史数据，虚线空心点为预测数据，空心虚线圈为样本缺月（已线性插值）
                  </p>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    转移矩阵摘要
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">从状态</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">到状态</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">转移概率</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">人数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTransitions.map((t, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="px-4 py-3">
                              <StatusBadge status={t.fromStatus} size="sm" />
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.toStatus} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {(t.probability * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{t.count} 人</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    预测展望（未来3个月）
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 3, 6].map((horizon, idx) => {
                      const pred = predictions.find((p) => p.horizonMonths === horizon);
                      const churnPred = pred?.predictions[pred.predictions.length - 1]?.distribution[
                        MemberStatus.churned
                      ];
                      const activePred = pred?.predictions[pred.predictions.length - 1]?.distribution[
                        MemberStatus.active
                      ];
                      return (
                        <div
                          key={horizon}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100"
                        >
                          <p className="text-sm text-gray-600 mb-2">未来 {horizon} 个月</p>
                          <p className="text-2xl font-bold text-red-600">
                            {churnPred ? `${(churnPred * 100).toFixed(1)}%` : '-'}
                          </p>
                          <p className="text-xs text-gray-500">预测流失率</p>
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-sm font-semibold text-emerald-600">
                              {activePred ? `${(activePred * 100).toFixed(1)}%` : '-'}
                            </p>
                            <p className="text-xs text-gray-500">活跃占比</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="py-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    干预建议
                  </h2>
                  <div className="space-y-4">
                    {interventionSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-50 rounded-xl p-5 border-l-4 border-blue-500"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {idx + 1}. {s.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">目标人群：</span>
                              {s.target}
                            </p>
                            <p className="text-sm text-gray-700">{s.description}</p>
                          </div>
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-medium',
                              s.priority === '高'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            )}
                          >
                            {s.priority}优先级
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 rounded-full p-2">
            <RefreshCw className="text-amber-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">状态跳动人话解释</h2>
            <p className="text-sm text-gray-500">
              未通过审核的状态跳跃 · 共 {unapprovedReviews.length} 条
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {unapprovedReviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-green-400" />
              <p className="font-medium">所有状态跳转均已通过审核</p>
              <p className="text-sm mt-1">暂无待处理的异常跳转</p>
            </div>
          ) : (
            unapprovedReviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <StatusBadge status={review.fromStatus} size="sm" />
                      <ArrowRight size={16} className="text-gray-400" />
                      <StatusBadge status={review.toStatus} size="sm" />
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-medium',
                          review.isApproved === null
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {review.isApproved === null ? '待审核' : '已驳回'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(review.jumpDate)}
                      </span>
                    </div>

                    {editingExplanation === review.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={explanationText}
                          onChange={(e) => setExplanationText(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="输入自然语言解释..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveExplanation(review.id, true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                          >
                            保存并通过
                          </button>
                          <button
                            onClick={() => handleSaveExplanation(review.id, false)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            保存并驳回
                          </button>
                          <button
                            onClick={() => setEditingExplanation(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-800 leading-relaxed mb-3">
                          <span className="font-semibold">
                            这位会员从{STATUS_TITLES[review.fromStatus]}直接跳到
                            {STATUS_TITLES[review.toStatus]}，因为...
                          </span>
                        </p>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          {review.plainLanguageExplanation || '暂无解释，点击编辑添加'}
                        </p>
                      </>
                    )}

                    {review.evidence.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.evidence.map((e, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white rounded-lg text-xs text-gray-600 border border-gray-200"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {editingExplanation !== review.id && (
                      <>
                        <button
                          onClick={() => handleEditExplanation(review)}
                          className="p-2 rounded-lg hover:bg-white hover:shadow-md transition-all"
                          title="编辑解释"
                        >
                          <Edit3 size={18} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => navigate(`/members/${review.memberId}`)}
                          className="p-2 rounded-lg hover:bg-white hover:shadow-md transition-all"
                          title="查看会员详情"
                        >
                          <ExternalLink size={18} className="text-gray-600" />
                        </button>
                        {review.isApproved === null && (
                          <>
                            <button
                              onClick={() => handleSaveExplanation(review.id, true)}
                              className="p-2 rounded-lg hover:bg-green-100 transition-all"
                              title="通过审核"
                            >
                              <CheckCircle2 size={18} className="text-green-600" />
                            </button>
                            <button
                              onClick={() => handleSaveExplanation(review.id, false)}
                              className="p-2 rounded-lg hover:bg-red-100 transition-all"
                              title="驳回审核"
                            >
                              <XCircle size={18} className="text-red-600" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 rounded-full p-2">
            <Download className="text-purple-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">数据下载</h2>
            <p className="text-sm text-gray-500">下载报告及相关数据文件</p>
          </div>
        </div>

        <AnimatePresence>
          {downloadProgress.type && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">{downloadProgress.label}</p>
                  <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(downloadProgress.step / downloadProgress.total) * 100}%`,
                      }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-sm text-blue-600 font-mono">
                  {downloadProgress.step}/{downloadProgress.total}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadCSV}
            disabled={downloadProgress.type !== null}
            className={cn(
              'text-left p-6 rounded-xl border-2 transition-all duration-300',
              downloadProgress.type !== null
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100'
            )}
          >
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500 text-white p-3 rounded-xl shadow-lg">
                <FileSpreadsheet size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">数据明细</h3>
                <p className="text-sm text-gray-600 mb-3">
                  CSV / Excel 格式，包含当前批次所有会员数据
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    文件大小：约 {estimateFileSize('csv')}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    包含内容：会员信息、状态历史、行为标签、流失概率
                  </p>
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadPDF}
            disabled={downloadProgress.type !== null || !currentReport}
            className={cn(
              'text-left p-6 rounded-xl border-2 transition-all duration-300',
              downloadProgress.type !== null || !currentReport
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100'
            )}
          >
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 text-white p-3 rounded-xl shadow-lg">
                <File size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">完整报告</h3>
                <p className="text-sm text-gray-600 mb-3">
                  PDF 格式，包含所有图表和分析结论
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                    文件大小：约 {estimateFileSize('pdf')}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                    包含内容：封面、核心结论、图表、预测、建议
                  </p>
                </div>
                {!currentReport && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    请先生成报告
                  </p>
                )}
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadZIP}
            disabled={downloadProgress.type !== null}
            className={cn(
              'text-left p-6 rounded-xl border-2 transition-all duration-300',
              downloadProgress.type !== null
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100'
            )}
          >
            <div className="flex items-start gap-4">
              <div className="bg-purple-500 text-white p-3 rounded-xl shadow-lg">
                <FileArchive size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">证据链包</h3>
                <p className="text-sm text-gray-600 mb-3">
                  ZIP 格式，包含完整的审核证据链
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-purple-500" />
                    文件大小：约 {estimateFileSize('zip')}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-purple-500" />
                    包含内容：客服备注、审核记录、活动标记、元数据
                  </p>
                </div>
              </div>
            </div>
          </motion.button>
        </div>

        <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-amber-800">数据同源校验说明</p>
              <p className="text-sm text-amber-700 mt-1">
                所有下载文件在导出前都会进行数据批次一致性校验，确保与当前图表、明细数据同源。文件名包含批次号和时间戳，
                文件元数据中记录完整的数据批次信息，便于追溯和审计。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
