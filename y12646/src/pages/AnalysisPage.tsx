import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  Download,
  FileText,
  FileSpreadsheet,
  BarChart3,
  Table2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { Anomaly } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function severityBadge(s: string) {
  if (s === 'high') return 'badge-danger';
  if (s === 'medium') return 'badge-warning';
  return 'badge-info';
}
const typeLabel: Record<string, string> = {
  collision: '碰撞边界',
  position_error: '定位偏差',
  missing_data: '数据缺失',
  unit_error: '单位错误',
};
const severityLabel: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export default function AnalysisPage() {
  const { batch, accuracyTrend, acupointHeatmap } = useAppStore();

  const lineData = useMemo(
    () => ({
      labels: accuracyTrend.map((d) => d.date),
      datasets: [
        {
          label: '准确率',
          data: accuracyTrend.map((d) => d.score),
          borderColor: '#0c8ee8',
          backgroundColor: 'rgba(12, 142, 232, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#0c8ee8',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5,
        },
      ],
    }),
    [accuracyTrend]
  );

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0b416e',
        titleFont: { size: 12, family: 'Noto Sans SC' },
        bodyFont: { size: 12, family: 'Noto Sans SC' },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `准确率 ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#616571' },
        border: { display: false },
      },
      y: {
        min: 60,
        max: 100,
        grid: { color: 'rgba(7, 41, 73, 0.06)' },
        ticks: { font: { size: 11 }, color: '#616571', callback: (v: any) => `${v}%` },
        border: { display: false },
      },
    },
  };

  const barData = useMemo(
    () => ({
      labels: acupointHeatmap.map((d) => d.acupoint),
      datasets: [
        {
          label: '准确率',
          data: acupointHeatmap.map((d) => d.accuracy),
          backgroundColor: acupointHeatmap.map((d) =>
            d.accuracy >= 85
              ? 'rgba(80, 145, 107, 0.75)'
              : d.accuracy >= 70
              ? 'rgba(214, 118, 55, 0.75)'
              : 'rgba(239, 68, 68, 0.75)'
          ),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }),
    [acupointHeatmap]
  );

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0b416e',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#616571' },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(7, 41, 73, 0.06)' },
        ticks: { font: { size: 11 }, color: '#616571', callback: (v: any) => `${v}%` },
        border: { display: false },
      },
    },
  };

  const changedCount = batch.anomalies.filter((a) => a.changedResult).length;
  const unchangedCount = batch.anomalies.length - changedCount;

  const donutData = {
    labels: ['改变判定结论', '未改变结论'],
    datasets: [
      {
        data: [changedCount, unchangedCount],
        backgroundColor: ['#ef4444', '#c5c7cd'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 11 },
          color: '#4d505a',
          padding: 14,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#0b416e',
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const trajWs = XLSX.utils.json_to_sheet(
      batch.trajectories.map((t) => ({
        轨迹编号: t.id,
        穴位: t.acupointName,
        操作人: t.operator,
        准确率: `${Math.round(t.accuracy * 100)}%`,
        持续时长: `${(t.durationMs / 1000).toFixed(1)}秒`,
        轨迹点数: t.points.length,
      }))
    );
    const anomWs = XLSX.utils.json_to_sheet(
      batch.anomalies.map((a) => ({
        异常编号: a.id,
        类型: typeLabel[a.type],
        严重程度: severityLabel[a.severity],
        描述: a.description,
        材料来源: a.materialSource,
        是否改变结论: a.changedResult ? '是' : '否',
        备注: a.notes || '',
      }))
    );
    XLSX.utils.book_append_sheet(wb, trajWs, '训练轨迹');
    XLSX.utils.book_append_sheet(wb, anomWs, '异常记录');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf]), `${batch.id}-复盘数据.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(12, 142, 232);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('穴位训练复盘报告', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(batch.id, pageWidth - 14, 14, { align: 'right' });

    doc.setTextColor(31, 32, 36);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('批次概况', 14, 34);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const info = [
      `批次名称：${batch.name}`,
      `学员：${batch.trainee}  训练师：${batch.trainer}`,
      `轨迹数量：${batch.trajectories.length}  异常记录：${batch.anomalies.length}`,
      `改变结论项：${changedCount}`,
    ];
    info.forEach((line, i) => doc.text(line, 14, 42 + i * 5));

    let y = 72;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('异常记录明细', 14, y);
    y += 6;

    batch.anomalies.forEach((a, i) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${typeLabel[a.type]} - ${severityLabel[a.severity]}${a.changedResult ? ' [已改变结论]' : ''}`, 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(a.description, pageWidth - 28);
      doc.text(lines, 18, y);
      y += lines.length * 4;
      doc.setTextColor(97, 101, 113);
      doc.text(`材料来源：${a.materialSource}`, 18, y);
      y += 5;
      doc.setTextColor(31, 32, 36);
    });

    doc.save(`${batch.id}-复盘报告.pdf`);
  }

  const avgAccuracy =
    batch.trajectories.length > 0
      ? Math.round(
          batch.trajectories.reduce((s, t) => s + t.accuracy, 0) /
            batch.trajectories.length *
            100
        )
      : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">复盘分析</h2>
          <p className="section-subtitle">图表、明细与下载均来自同一份批次数据</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            <span>导出 Excel</span>
          </button>
          <button onClick={exportPDF} className="btn-primary">
            <FileText className="w-4 h-4" />
            <span>生成 PDF 报告</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPI
          icon={Target}
          label="综合准确率"
          value={`${avgAccuracy}%`}
          trend="+4%"
          tone="medical"
        />
        <KPI
          icon={TrendingUp}
          label="训练次数"
          value={batch.trajectories.length}
          trend="本批次"
          tone="sage"
        />
        <KPI
          icon={AlertTriangle}
          label="异常记录"
          value={batch.anomalies.length}
          trend={`${changedCount} 项影响结论`}
          tone="warm"
        />
        <KPI
          icon={Layers}
          label="图层版本"
          value={batch.layers.length}
          trend="已复核"
          tone="ink"
        />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <section className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-ink-900">准确率趋势</h3>
              <p className="text-xs text-ink-500 mt-0.5">近 7 日训练准确率变化</p>
            </div>
            <span className="badge-info">
              <BarChart3 className="w-3 h-3" />
              折线图
            </span>
          </div>
          <div className="h-64">
            <Line data={lineData} options={lineOptions as any} />
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-ink-900">异常影响分布</h3>
            <p className="text-xs text-ink-500 mt-0.5">是否改变判定结论</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center relative">
              <Doughnut data={donutData} options={donutOptions as any} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12">
                <div className="text-center">
                  <div className="font-display text-2xl font-bold text-ink-900">{changedCount}</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">改变结论</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-ink-900">各穴位准确率</h3>
            <p className="text-xs text-ink-500 mt-0.5">按训练次数汇总，颜色代表等级</p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <LegendDot color="#50916b" label="≥85% 优秀" />
            <LegendDot color="#d67637" label="70~85% 良好" />
            <LegendDot color="#ef4444" label="<70% 待改进" />
          </div>
        </div>
        <div className="h-56">
          <Bar data={barData} options={barOptions as any} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-5 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-medical-600" />
            <h3 className="font-display font-semibold text-ink-900">异常记录明细</h3>
            <span className="text-xs text-ink-400">
              {batch.anomalies.length} 条
            </span>
          </div>
          <span className="text-[11px] text-ink-400">
            评审老师可追溯每项异常的具体材料来源
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50/60 text-xs text-ink-500">
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">编号</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">类型</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">严重程度</th>
                <th className="text-left font-medium px-5 py-3">描述</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">改变结论</th>
                <th className="text-left font-medium px-5 py-3">材料来源</th>
                <th className="text-right font-medium px-5 py-3 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {batch.anomalies.map((a) => (
                <Row key={a.id} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ a }: { a: Anomaly }) {
  return (
    <tr className="hover:bg-medical-50/40 transition-colors">
      <td className="px-5 py-3.5 font-mono text-xs text-ink-500">{a.id}</td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-ink-800">{typeLabel[a.type]}</span>
      </td>
      <td className="px-5 py-3.5">
        <span className={severityBadge(a.severity)}>{severityLabel[a.severity]}</span>
      </td>
      <td className="px-5 py-3.5 text-sm text-ink-700 max-w-md">
        <div className="leading-relaxed">{a.description}</div>
        {a.notes && (
          <div className="mt-1 text-[11px] text-ink-400 italic">备注：{a.notes}</div>
        )}
      </td>
      <td className="px-5 py-3.5">
        {a.changedResult ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-warm-700 bg-warm-50 px-2 py-1 rounded-md">
            <AlertTriangle className="w-3 h-3" />
            已改变
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-ink-400">
            未改变
          </span>
        )}
      </td>
      <td className="px-5 py-3.5 text-xs text-ink-500 max-w-xs">
        <div className="truncate" title={a.materialSource}>
          {a.materialSource}
        </div>
      </td>
      <td className="px-5 py-3.5 text-right">
        <button className="text-xs text-medical-600 font-medium hover:text-medical-800 inline-flex items-center gap-1">
          查看来源
          <ChevronRight className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-500">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend: string;
  tone: 'medical' | 'sage' | 'warm' | 'ink';
}) {
  const tones: Record<string, string> = {
    medical: 'from-medical-50 to-white border-medical-100 text-medical-700',
    sage: 'from-sage-50 to-white border-sage-100 text-sage-700',
    warm: 'from-warm-50 to-white border-warm-100 text-warm-700',
    ink: 'from-ink-50 to-white border-ink-100 text-ink-700',
  };
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${tones[tone]} border shadow-soft`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{label}</span>
        <Icon className="w-4 h-4 opacity-70" strokeWidth={1.8} />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-ink-900">{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{trend}</div>
    </div>
  );
}
