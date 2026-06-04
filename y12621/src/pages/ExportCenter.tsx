import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAnnotationStore } from '@/store/annotationStore';
import { formatSeverity, formatOperationType } from '@/mock/data';
import type { ExportFormat, ExportContent } from '@/types';
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  FileJson,
  Download,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  FileImage,
  Settings,
  Eye,
  Printer,
  Mail,
  Share2,
  Clock,
  User,
  Layers,
  Target,
  TrendingUp,
  Award,
  Zap,
  RefreshCw,
  Edit,
  CheckSquare,
} from 'lucide-react';
import { Button, Checkbox, Radio, Form, Input, Select, message, Spin, Card } from 'antd';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const { Option } = Select;
const { TextArea } = Input;
const { Group: CheckboxGroup } = Checkbox;

const ExportCenter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportContents, setExportContents] = useState<ExportContent[]>([
    'basicInfo', 'skeletonData', 'collisionResults', 'scoreSheet',
    'boundaryCases', 'operationHistory', 'repeatReasons', 'statistics',
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPreview, setExportPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const {
    currentTask,
    frames,
    collisions,
    scoreSheet,
    history,
    layers,
    reviews,
    loadTask,
    exportReport,
  } = useAnnotationStore();

  useEffect(() => {
    if (id && !currentTask) {
      loadTask(id);
    }
  }, [id, currentTask, loadTask]);

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-500">加载中...</p>
        </div>
      </div>
    );
  }

  const boundaryCases = collisions.filter((c) => c.severity === 'boundary');
  const totalNodes = frames.reduce((sum, f) => sum + f.nodes.length, 0);
  const avgConfidence = frames.reduce(
    (sum, f) => sum + f.nodes.reduce((s, n) => s + n.confidence, 0) / f.nodes.length,
    0
  ) / frames.length;

  const formatOptions = [
    { value: 'pdf', label: 'PDF文档', icon: <FileText size={20} />, desc: '适合打印和存档，图文并茂' },
    { value: 'excel', label: 'Excel表格', icon: <FileSpreadsheet size={20} />, desc: '适合数据处理和分析' },
    { value: 'csv', label: 'CSV文件', icon: <FileText size={20} />, desc: '纯文本格式，兼容性最好' },
    { value: 'json', label: 'JSON数据', icon: <FileJson size={20} />, desc: '适合程序读取和二次开发' },
  ];

  const contentOptions = [
    { value: 'basicInfo', label: '基本信息', desc: '任务名称、编号、时间、人员等' },
    { value: 'skeletonData', label: '骨架节点数据', desc: '各帧关节点坐标、置信度' },
    { value: 'collisionResults', label: '碰撞检测结果', desc: '所有碰撞点详情、严重程度' },
    { value: 'scoreSheet', label: '评分表数据', desc: '各项评分、补录记录、备注' },
    { value: 'boundaryCases', label: '边界案例详情', desc: '边界碰撞的人工确认记录' },
    { value: 'operationHistory', label: '操作历史记录', desc: '撤销、重做、补录等操作痕迹' },
    { value: 'repeatReasons', label: '重复标注原因', desc: '用自然语言说明重复原因' },
    { value: 'statistics', label: '统计分析图表', desc: '数据可视化图表' },
  ];

  const repeatReasons = [
    {
      id: 'reason-1',
      date: '2024-01-12 14:30',
      reason: '评分表晚到',
      description: '原评分表提交延迟，收到正式评分表后需要重新匹配评分项与骨架数据的对应关系，动作规范度项需重新计算。',
      operator: '李工',
    },
    {
      id: 'reason-2',
      date: '2024-01-12 15:15',
      reason: '边界案例调整',
      description: '左膝与地面的边界碰撞(COL-001)经人工复核确认为误报，需要重新运行碰撞检测算法以排除此类边界误判，提高检测准确率。',
      operator: '安全培训师-王',
    },
    {
      id: 'reason-3',
      date: '2024-01-12 16:00',
      reason: '补录数据完善',
      description: '张工补录了第3项"动作规范度"得分85分，同时补充了"肘关节活动范围"的单位说明(°)，需重新计算总分。',
      operator: '张工',
    },
  ];

  const handleExport = async () => {
    if (exportContents.length === 0) {
      message.warning('请至少选择一项导出内容');
      return;
    }

    setIsExporting(true);

    try {
      if (exportFormat === 'pdf' && previewRef.current) {
        const canvas = await html2canvas(previewRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`${currentTask.name}-标注报告.pdf`);

        message.success('PDF导出成功！');
      } else {
        exportReport(exportFormat, exportContents);
        message.success(`${exportFormat.toUpperCase()}导出成功！`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const problemDistribution = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}', fontSize: 10 },
      data: [
        { value: collisions.filter((c) => c.severity === 'danger').length, name: '危险碰撞', itemStyle: { color: '#F53F3F' } },
        { value: boundaryCases.length, name: '边界案例', itemStyle: { color: '#FF7D00' } },
        { value: collisions.filter((c) => c.severity === 'warning').length, name: '警告', itemStyle: { color: '#FFAA00' } },
        { value: collisions.filter((c) => c.isFalsePositive && c.confirmed).length, name: '误报', itemStyle: { color: '#165DFF' } },
      ],
    }],
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto scrollbar-thin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">导出中心</h1>
        <p className="text-neutral-500">
          导出标注报告，支持多种格式，内容易懂，方便分享给不懂代码的同事查看
        </p>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-6">
          <div className="card">
            <h3 className="section-title flex items-center gap-2">
              <Settings className="text-primary-500" size={18} />
              导出设置
            </h3>

            <div className="mb-6">
              <p className="text-sm font-medium text-neutral-700 mb-3">选择导出格式</p>
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExportFormat(option.value as ExportFormat)}
                    className={`p-4 rounded-sm border-2 transition-all text-left ${
                      exportFormat === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center mb-2 ${
                      exportFormat === option.value ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {option.icon}
                    </div>
                    <p className={`font-semibold text-sm ${
                      exportFormat === option.value ? 'text-primary-700' : 'text-neutral-700'
                    }`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-neutral-700 mb-3">选择导出内容</p>
              <div className="space-y-2">
                {contentOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-sm border transition-all cursor-pointer ${
                      exportContents.includes(option.value as ExportContent)
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Checkbox
                      checked={exportContents.includes(option.value as ExportContent)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportContents([...exportContents, option.value as ExportContent]);
                        } else {
                          setExportContents(exportContents.filter((c) => c !== option.value));
                        }
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{option.label}</p>
                      <p className="text-xs text-neutral-500">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-warning-50 border border-warning-200 rounded-sm mb-6">
              <div className="flex items-start gap-3">
                <Info className="text-warning-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-semibold text-warning-800 text-sm mb-1">导出说明</h4>
                  <ul className="text-xs text-warning-700 space-y-1">
                    <li>• 重复标注原因将使用自然语言描述，而非技术字段名</li>
                    <li>• 所有专业术语都会附带通俗解释</li>
                    <li>• 边界案例会明确标注处理结果和原因</li>
                    <li>• PDF格式包含完整的图文排版，适合打印</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setExportPreview(!exportPreview)}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Eye size={16} />
                {exportPreview ? '隐藏预览' : '预览报告'}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || exportContents.length === 0}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <><Spin size="small" /> 导出中...</>
                ) : (
                  <><Download size={16} /> 开始导出</>
                )}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title flex items-center gap-2">
              <FileText className="text-success-500" size={18} />
              导出历史
            </h3>
            <div className="space-y-3">
              {[
                { name: '2024-01-12_1530_标注报告.pdf', time: '2024-01-12 15:30', size: '2.4 MB', format: 'pdf' },
                { name: '2024-01-11_1020_骨架数据.xlsx', time: '2024-01-11 10:20', size: '1.1 MB', format: 'excel' },
                { name: '2024-01-10_1645_碰撞分析.csv', time: '2024-01-10 16:45', size: '456 KB', format: 'csv' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-sm transition-colors">
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                    item.format === 'pdf' ? 'bg-danger-100 text-danger-600' :
                    item.format === 'excel' ? 'bg-success-100 text-success-600' :
                    'bg-neutral-100 text-neutral-600'
                  }`}>
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700 truncate">{item.name}</p>
                    <p className="text-xs text-neutral-400">{item.time} · {item.size}</p>
                  </div>
                  <button className="p-1.5 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 rounded-sm transition-colors">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8">
          {exportPreview ? (
            <div className="card p-0 overflow-auto max-h-[calc(100vh-180px)]">
              <div ref={previewRef} className="p-8 bg-white" style={{ minWidth: '700px' }}>
                <div className="border-b-2 border-primary-500 pb-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-neutral-800 mb-1">运动姿态骨架标注报告</h1>
                      <p className="text-neutral-500">报告生成时间: {new Date().toLocaleString('zh-CN')}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 text-success-700 rounded-sm">
                        <Award size={20} />
                        <span className="font-bold">复核通过</span>
                      </div>
                    </div>
                  </div>
                </div>

                {exportContents.includes('basicInfo') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <Info size={18} className="text-primary-500" />
                      一、基本信息
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-neutral-50 rounded-sm">
                        <p className="text-xs text-neutral-500 mb-1">任务编号</p>
                        <p className="font-mono font-semibold text-neutral-800">{currentTask.taskId}</p>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-sm">
                        <p className="text-xs text-neutral-500 mb-1">任务名称</p>
                        <p className="font-semibold text-neutral-800">{currentTask.name}</p>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-sm">
                        <p className="text-xs text-neutral-500 mb-1">创建时间</p>
                        <p className="font-semibold text-neutral-800">{currentTask.createdAt}</p>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-sm">
                        <p className="text-xs text-neutral-500 mb-1">标注人</p>
                        <p className="font-semibold text-neutral-800">{currentTask.annotator}</p>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-sm">
                        <p className="text-xs text-neutral-500 mb-1">复核人</p>
                        <p className="font-semibold text-neutral-800">{reviews[0]?.reviewer || '安全培训师-王'}</p>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-sm">
                        <p className="text-xs text-neutral-500 mb-1">任务状态</p>
                        <span className="badge badge-success">已完成</span>
                      </div>
                    </div>
                  </div>
                )}

                {exportContents.includes('statistics') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <TrendingUp size={18} className="text-primary-500" />
                      二、数据概览
                    </h2>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="p-4 border border-neutral-200 rounded-sm text-center">
                        <p className="text-xs text-neutral-500 mb-1">总帧数</p>
                        <p className="text-2xl font-bold text-neutral-800">{frames.length}</p>
                      </div>
                      <div className="p-4 border border-neutral-200 rounded-sm text-center">
                        <p className="text-xs text-neutral-500 mb-1">关节节点总数</p>
                        <p className="text-2xl font-bold text-primary-600">{totalNodes}</p>
                      </div>
                      <div className="p-4 border border-neutral-200 rounded-sm text-center">
                        <p className="text-xs text-neutral-500 mb-1">平均置信度</p>
                        <p className="text-2xl font-bold text-success-600">{(avgConfidence * 100).toFixed(1)}%</p>
                      </div>
                      <div className="p-4 border border-neutral-200 rounded-sm text-center">
                        <p className="text-xs text-neutral-500 mb-1">重复运行次数</p>
                        <p className="text-2xl font-bold text-warning-600">{currentTask.rerunCount}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-700 mb-2">问题类型分布</h3>
                        <ReactECharts option={problemDistribution} style={{ height: '200px' }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-700 mb-2">关键指标说明</h3>
                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-danger-50 border-l-2 border-danger-500 rounded-r-sm">
                            <span className="font-medium text-danger-700">危险碰撞: </span>
                            <span className="text-danger-600">{collisions.filter((c) => c.severity === 'danger').length} 处</span>
                            <span className="text-neutral-500 text-xs"> - 距离小于阈值80%，确定有碰撞</span>
                          </div>
                          <div className="p-2 bg-warning-50 border-l-2 border-warning-500 rounded-r-sm">
                            <span className="font-medium text-warning-700">边界案例: </span>
                            <span className="text-warning-600">{boundaryCases.length} 处</span>
                            <span className="text-neutral-500 text-xs"> - 距离在阈值90%-110%之间，需人工确认</span>
                          </div>
                          <div className="p-2 bg-primary-50 border-l-2 border-primary-500 rounded-r-sm">
                            <span className="font-medium text-primary-700">已确认误报: </span>
                            <span className="text-primary-600">{collisions.filter((c) => c.isFalsePositive && c.confirmed).length} 处</span>
                            <span className="text-neutral-500 text-xs"> - 经人工核实为误判，不计入统计</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {exportContents.includes('collisionResults') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <Target size={18} className="text-danger-500" />
                      三、碰撞检测结果
                    </h2>
                    <p className="text-sm text-neutral-600 mb-3">
                      共检测到 <strong className="text-danger-600">{collisions.length}</strong> 处碰撞，其中：
                      危险碰撞 <strong className="text-danger-600">{collisions.filter((c) => c.severity === 'danger').length}</strong> 处，
                      边界案例 <strong className="text-warning-600">{boundaryCases.length}</strong> 处，
                      警告 <strong className="text-warning-600">{collisions.filter((c) => c.severity === 'warning').length}</strong> 处，
                      已确认为误报 <strong className="text-primary-600">{collisions.filter((c) => c.isFalsePositive && c.confirmed).length}</strong> 处。
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-neutral-100">
                            <th className="p-2 text-left border border-neutral-200">编号</th>
                            <th className="p-2 text-left border border-neutral-200">碰撞部位</th>
                            <th className="p-2 text-left border border-neutral-200">严重程度</th>
                            <th className="p-2 text-left border border-neutral-200">所在帧</th>
                            <th className="p-2 text-left border border-neutral-200">距离(cm)</th>
                            <th className="p-2 text-left border border-neutral-200">阈值(cm)</th>
                            <th className="p-2 text-left border border-neutral-200">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {collisions.map((c) => (
                            <tr key={c.id} className="hover:bg-neutral-50">
                              <td className="p-2 border border-neutral-200 font-mono">{c.id}</td>
                              <td className="p-2 border border-neutral-200">{c.nodes.join(' ↔ ')}</td>
                              <td className="p-2 border border-neutral-200">
                                <span className={`badge ${
                                  c.severity === 'danger' ? 'badge-danger' :
                                  c.severity === 'boundary' ? 'badge-warning' : 'badge-warning'
                                }`}>
                                  {formatSeverity(c.severity)}
                                </span>
                              </td>
                              <td className="p-2 border border-neutral-200 font-mono">第{c.frameIndex + 1}帧</td>
                              <td className="p-2 border border-neutral-200 font-mono">{c.distance}</td>
                              <td className="p-2 border border-neutral-200 font-mono">{c.threshold}</td>
                              <td className="p-2 border border-neutral-200">
                                {c.confirmed ? (
                                  c.isFalsePositive ? (
                                    <span className="text-success-600 text-xs">✓ 已确认为误报</span>
                                  ) : (
                                    <span className="text-danger-600 text-xs">✗ 已确认真实碰撞</span>
                                  )
                                ) : (
                                  <span className="text-warning-600 text-xs">待确认</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {exportContents.includes('boundaryCases') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-warning-500" />
                      四、边界案例详情
                    </h2>
                    <div className="p-3 bg-warning-50 border border-warning-200 rounded-sm mb-4">
                      <p className="text-sm text-warning-700">
                        <strong>什么是边界案例？</strong>
                        当两个节点的实际距离非常接近判定阈值（在阈值的90%-110%范围内）时，
                        算法无法给出确定结论，需要人工结合动作上下文进行判断。
                        这些案例<strong>不能直接丢弃</strong>，必须人工确认并记录意见。
                      </p>
                    </div>
                    <div className="space-y-3">
                      {boundaryCases.map((c) => (
                        <div key={c.id} className="p-4 border border-neutral-200 rounded-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="badge badge-warning mr-2">边界案例</span>
                              <span className="font-mono text-sm text-neutral-500">{c.id}</span>
                            </div>
                            {c.confirmed && (
                              c.isFalsePositive
                                ? <span className="badge badge-success">✓ 已确认为误报</span>
                                : <span className="badge badge-danger">✗ 已确认真实碰撞</span>
                            )}
                          </div>
                          <p className="font-semibold text-neutral-800 mb-1">{c.nodes.join(' ↔ ')}</p>
                          <p className="text-sm text-neutral-600 mb-2">{c.description}</p>
                          <p className="text-sm text-neutral-600 mb-2 italic">判定原因: {c.reason}</p>
                          <div className="flex items-center gap-4 text-sm mb-2">
                            <span>实际距离: <strong className="font-mono">{c.distance}cm</strong></span>
                            <span>判定阈值: <strong className="font-mono">{c.threshold}cm</strong></span>
                            <span>接近程度: <strong className={
                              c.distance < c.threshold ? 'text-danger-600' : 'text-success-600'
                            }>{c.distance < c.threshold ? '低于阈值' : '高于阈值'} {Math.abs(c.distance - c.threshold).toFixed(1)}cm</strong></span>
                          </div>
                          {c.confirmed && (
                            <div className="p-3 bg-neutral-50 rounded-sm mt-3">
                              <p className="text-sm">
                                <span className="font-medium text-neutral-700">确认人: </span>
                                {c.confirmedBy}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium text-neutral-700">确认时间: </span>
                                {c.confirmedAt}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium text-neutral-700">确认意见: </span>
                                {c.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exportContents.includes('scoreSheet') && scoreSheet && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <FileText size={18} className="text-primary-500" />
                      五、评分表数据
                    </h2>
                    {scoreSheet.supplementNote && (
                      <div className="p-3 bg-primary-50 border border-primary-200 rounded-sm mb-4">
                        <p className="text-sm text-primary-700">
                          <span className="font-semibold">📝 补录说明：</span>
                          {scoreSheet.supplementNote}
                        </p>
                      </div>
                    )}
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-neutral-100">
                          <th className="p-2 text-left border border-neutral-200">序号</th>
                          <th className="p-2 text-left border border-neutral-200">评分项</th>
                          <th className="p-2 text-left border border-neutral-200">得分</th>
                          <th className="p-2 text-left border border-neutral-200">满分</th>
                          <th className="p-2 text-left border border-neutral-200">单位</th>
                          <th className="p-2 text-left border border-neutral-200">备注</th>
                          <th className="p-2 text-left border border-neutral-200">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoreSheet.scores.map((item, index) => (
                          <tr key={index} className={`${
                            item.isOldData || item.missingUnit || item.score === undefined
                              ? 'bg-warning-50' : ''
                          }`}>
                            <td className="p-2 border border-neutral-200">{index + 1}</td>
                            <td className="p-2 border border-neutral-200">{item.itemName}</td>
                            <td className="p-2 border border-neutral-200 font-mono">
                              {item.score ?? <span className="text-danger-500">漏填</span>}
                            </td>
                            <td className="p-2 border border-neutral-200 font-mono">{item.fullScore}</td>
                            <td className="p-2 border border-neutral-200">
                              {item.unit ?? <span className="text-warning-500 text-xs">缺单位</span>}
                            </td>
                            <td className="p-2 border border-neutral-200 text-xs text-neutral-500">
                              {item.remark || '-'}
                            </td>
                            <td className="p-2 border border-neutral-200">
                              {item.isOldData && <span className="badge badge-neutral mr-1">旧表</span>}
                              {item.missingUnit && <span className="badge badge-warning mr-1">缺单位</span>}
                              {item.score === undefined && <span className="badge badge-danger">漏填</span>}
                              {!item.isOldData && !item.missingUnit && item.score !== undefined && (
                                <span className="badge badge-success">正常</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between p-3 bg-neutral-50 rounded-sm">
                      <span className="font-semibold text-neutral-700">总分</span>
                      <span className="text-2xl font-bold text-primary-600">
                        {scoreSheet.scores.reduce((sum, s) => sum + (s.score || 0), 0)}
                        <span className="text-lg text-neutral-500"> / {scoreSheet.scores.reduce((sum, s) => sum + s.fullScore, 0)}</span>
                      </span>
                    </div>
                  </div>
                )}

                {exportContents.includes('repeatReasons') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <RefreshCw size={18} className="text-warning-500" />
                      六、重复标注原因说明
                    </h2>
                    <div className="p-3 bg-warning-50 border border-warning-200 rounded-sm mb-4">
                      <p className="text-sm text-warning-700">
                        本任务共进行了 <strong>{currentTask.rerunCount}</strong> 次重复标注。
                        以下是每次重复标注的具体原因（使用自然语言描述，便于非技术人员理解）：
                      </p>
                    </div>
                    <div className="space-y-4">
                      {repeatReasons.map((reason, index) => (
                        <div key={reason.id} className="p-4 border border-neutral-200 rounded-sm relative">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="pl-6">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="badge badge-warning">{reason.reason}</span>
                              <span className="text-xs text-neutral-400 font-mono">{reason.date}</span>
                              <span className="text-xs text-neutral-400">操作人: {reason.operator}</span>
                            </div>
                            <p className="text-sm text-neutral-700 leading-relaxed">{reason.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exportContents.includes('operationHistory') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <Clock size={18} className="text-primary-500" />
                      七、操作历史记录
                    </h2>
                    <div className="space-y-2">
                      {history.map((record, index) => (
                        <div key={record.id} className="flex items-start gap-3 p-2 hover:bg-neutral-50 rounded-sm">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            record.type === 'annotate' ? 'bg-primary-500' :
                            record.type === 'undo' ? 'bg-neutral-500' :
                            record.type === 'confirm' ? 'bg-success-500' :
                            record.type === 'supplement' ? 'bg-warning-500' :
                            record.type === 'rerun' ? 'bg-danger-500' : 'bg-primary-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`badge ${
                                record.type === 'annotate' ? 'badge-primary' :
                                record.type === 'undo' ? 'badge-warning' :
                                record.type === 'confirm' ? 'badge-success' :
                                record.type === 'supplement' ? 'badge-warning' :
                                record.type === 'rerun' ? 'badge-danger' : 'badge-primary'
                              }`}>
                                {formatOperationType(record.type)}
                              </span>
                              <span className="text-xs text-neutral-400 font-mono">{record.timestamp}</span>
                              <span className="text-xs text-neutral-400">·</span>
                              <span className="text-xs text-neutral-500">{record.operator}</span>
                            </div>
                            <p className="text-sm text-neutral-700 mt-0.5">{record.description}</p>
                            {record.detail && (
                              <p className="text-xs text-neutral-500 mt-0.5">{record.detail}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exportContents.includes('skeletonData') && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-8000 mb-3 pb-2 border-b border-neutral-200 flex items-center gap-2">
                      <Layers size={18} className="text-primary-500" />
                      八、骨架节点数据（节选）
                    </h2>
                    <p className="text-sm text-neutral-600 mb-3">
                      以下展示前3帧的骨架节点数据。完整数据包含所有{frames.length}帧，共{totalNodes}个节点。
                      每个节点包含X坐标、Y坐标、置信度三个字段。
                    </p>
                    <div className="space-y-4">
                      {frames.slice(0, 3).map((frame, frameIndex) => (
                        <div key={frame.id} className="p-3 bg-neutral-50 rounded-sm">
                          <h4 className="text-sm font-semibold text-neutral-700 mb-2">第{frameIndex + 1}帧</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {frame.nodes.slice(0, 8).map((node) => (
                              <div key={node.id} className="p-2 bg-white border border-neutral-200 rounded-sm text-xs">
                                <p className="font-medium text-neutral-700 mb-0.5">{node.name}</p>
                                <p className="font-mono text-neutral-500">X: {node.x.toFixed(1)}</p>
                                <p className="font-mono text-neutral-500">Y: {node.y.toFixed(1)}</p>
                                <p className={`font-mono ${
                                  node.confidence > 0.7 ? 'text-success-600' :
                                  node.confidence > 0.5 ? 'text-warning-600' : 'text-danger-600'
                                }`}>
                                  置信: {(node.confidence * 100).toFixed(0)}%
                                </p>
                                {node.isBadData && (
                                  <span className="badge badge-danger text-[10px] mt-0.5">坏数据</span>
                                )}
                                {node.isBoundary && (
                                  <span className="badge badge-warning text-[10px] mt-0.5">边界点</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-400">
                  <p>本报告由运动姿态骨架标注系统自动生成</p>
                  <p className="mt-1">报告编号: RPT-{Date.now()} · 生成时间: {new Date().toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                <Eye className="text-primary-500" size={48} />
              </div>
              <h3 className="text-xl font-bold text-neutral-700 mb-2">预览区域</h3>
              <p className="text-neutral-500 mb-6 max-w-md text-center">
                点击左侧"预览报告"按钮查看完整的导出内容预览。
                您可以选择不同的导出格式和内容，生成适合不同用途的报告文件。
              </p>
              <div className="flex gap-4">
                <button onClick={() => setExportPreview(true)} className="btn-primary flex items-center gap-2">
                  <Eye size={16} />
                  查看预览
                </button>
                <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                  <Download size={16} />
                  直接导出
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;
