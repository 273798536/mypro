import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAnnotationStore } from '@/store/annotationStore';
import { MOCK_FRAMES_BEFORE, formatSeverity, formatOperationType } from '@/mock/data';
import type { CollisionPoint } from '@/types';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  FileText,
  ChevronRight,
  ChevronLeft,
  Layers,
  Target,
  TrendingUp,
  Award,
  Clock,
  User,
  Zap,
  ArrowLeftRight,
  Undo2,
  Redo2,
  Database,
  FileDown,
} from 'lucide-react';
import { Button, Modal, Form, Input, Radio, message } from 'antd';

const { TextArea } = Input;

type ReviewStep = 'boundary' | 'undo' | 'settlement';

const Review: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ReviewStep>('boundary');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedCollision, setSelectedCollision] = useState<CollisionPoint | null>(null);
  const [undoDemoActive, setUndoDemoActive] = useState(false);
  const [settlementForm] = Form.useForm();

  const {
    currentTask,
    frames,
    collisions,
    history,
    historyIndex,
    scoreSheet,
    layers,
    reviews,
    loadTask,
    undo,
    redo,
    confirmBoundary,
    reRunAnnotation,
    reopenTask,
    completeReview,
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
  const unconfirmedBoundary = boundaryCases.filter((c) => !c.confirmed);
  const confirmedBoundary = boundaryCases.filter((c) => c.confirmed);

  const steps: { id: ReviewStep; title: string; icon: React.ReactNode; description: string }[] = [
    { id: 'boundary', title: '关卡1: 边界失败案例', icon: <AlertTriangle size={20} />, description: '确认3个边界碰撞案例' },
    { id: 'undo', title: '关卡2: 撤销/重开操作', icon: <RotateCcw size={20} />, description: '体验撤销重做和重开功能' },
    { id: 'settlement', title: '关卡3: 结算报告', icon: <FileText size={20} />, description: '查看一页式结算报告' },
  ];

  const handleConfirmBoundary = (collision: CollisionPoint, approved: boolean) => {
    setSelectedCollision(collision);
    setConfirmModalVisible(true);
    settlementForm.setFieldsValue({ approved, comment: '' });
  };

  const handleConfirmSubmit = (values: { approved: boolean; comment: string }) => {
    if (selectedCollision) {
      confirmBoundary(selectedCollision.id, values.approved, values.comment);
      setConfirmModalVisible(false);
      setSelectedCollision(null);
      settlementForm.resetFields();
      message.success('确认已提交');
    }
  };

  const handleUndoDemo = () => {
    setUndoDemoActive(true);
    undo();
    setTimeout(() => {
      redo();
      setUndoDemoActive(false);
      message.success('撤销/重做演示完成');
    }, 1500);
  };

  const handleCompleteReview = (values: { approved: boolean; comment: string }) => {
    completeReview(values.approved, values.comment);
    message.success(values.approved ? '复核通过，任务已完成' : '复核驳回，任务已重开');
  };

  const totalNodes = frames.reduce((sum, f) => sum + f.nodes.length, 0);
  const avgConfidence = frames.reduce(
    (sum, f) => sum + f.nodes.reduce((s, n) => s + n.confidence, 0) / f.nodes.length,
    0
  ) / frames.length;
  const falsePositives = collisions.filter((c) => c.isFalsePositive && c.confirmed);

  const problemDistribution = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: [
        { value: collisions.filter((c) => c.severity === 'danger').length, name: '危险碰撞', itemStyle: { color: '#F53F3F' } },
        { value: boundaryCases.length, name: '边界案例', itemStyle: { color: '#FF7D00' } },
        { value: collisions.filter((c) => c.severity === 'warning').length, name: '警告', itemStyle: { color: '#FFAA00' } },
        { value: falsePositives.length, name: '误报', itemStyle: { color: '#165DFF' } },
      ],
    }],
  };

  const confidenceTrend = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: frames.map((_, i) => `帧${i + 1}`),
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0.5,
      max: 1,
      axisLabel: { fontSize: 10, formatter: '{value}' },
    },
    series: [{
      type: 'line',
      smooth: true,
      data: frames.map((f) => Math.round(f.nodes.reduce((s, n) => s + n.confidence, 0) / f.nodes.length * 100) / 100),
      lineStyle: { color: '#165DFF', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
        { offset: 0, color: 'rgba(22, 93, 255, 0.3)' },
        { offset: 1, color: 'rgba(22, 93, 255, 0.05)' },
      ]}},
      symbol: 'circle',
      symbolSize: 6,
    }],
  };

  const comparisonChart = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, itemWidth: 12, itemHeight: 12 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['碰撞数', '边界案例', '误报数', '平均置信度'],
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: '原始标注',
        type: 'bar',
        data: [8, 3, 0, 0.78],
        itemStyle: { color: '#86909C' },
        barWidth: 20,
      },
      {
        name: '人工调整后',
        type: 'bar',
        data: [5, 2, 2, 0.85],
        itemStyle: { color: '#165DFF' },
        barWidth: 20,
      },
    ],
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto scrollbar-thin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">复核关卡</h1>
        <p className="text-neutral-500">
          完成以下三个关卡，体验边界失败案例确认、撤销/重开操作，以及查看结算报告
        </p>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-sm transition-all ${
                  currentStep === step.id
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                  currentStep === step.id ? 'bg-white/20' : 'bg-neutral-100'
                }`}>
                  {step.icon}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className={`text-xs ${currentStep === step.id ? 'text-white/80' : 'text-neutral-400'}`}>
                    {step.description}
                  </p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="text-neutral-300" size={24} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {currentStep === 'boundary' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title mb-0">边界失败案例复核</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="badge badge-warning">待确认: {unconfirmedBoundary.length}</span>
                  <span className="badge badge-success">已确认: {confirmedBoundary.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {boundaryCases.map((collision) => (
                  <div
                    key={collision.id}
                    className={`p-4 rounded-sm border-2 transition-all ${
                      collision.confirmed
                        ? collision.isFalsePositive
                          ? 'bg-success-50 border-success-300'
                          : 'bg-danger-50 border-danger-300'
                        : 'bg-white border-warning-300 hover:border-warning-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-warning">边界案例</span>
                        <span className="font-mono text-xs text-neutral-500">{collision.id}</span>
                      </div>
                      {collision.confirmed && (
                        collision.isFalsePositive
                          ? <CheckCircle className="text-success-500" size={18} />
                          : <XCircle className="text-danger-500" size={18} />
                      )}
                    </div>

                    <h4 className="font-semibold text-neutral-800 mb-2">
                      {collision.nodes.join(' ↔ ')}
                    </h4>
                    <p className="text-sm text-neutral-600 mb-3">{collision.description}</p>

                    <div className="bg-neutral-50 p-3 rounded-sm mb-3">
                      <p className="text-xs text-neutral-500 mb-1">判定原因</p>
                      <p className="text-sm text-neutral-700 italic">{collision.reason}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div>
                        <span className="text-neutral-500">实际距离:</span>
                        <span className="font-mono font-semibold text-danger-600 ml-1">{collision.distance}cm</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">判定阈值:</span>
                        <span className="font-mono font-semibold text-neutral-600 ml-1">{collision.threshold}cm</span>
                      </div>
                    </div>

                    {collision.confirmed ? (
                      <div className={`p-2 rounded-sm text-xs ${
                        collision.isFalsePositive ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                      }`}>
                        <p className="font-medium mb-1">
                          {collision.isFalsePositive ? '✓ 已确认为误报' : '✗ 已确认真实碰撞'}
                        </p>
                        <p className="opacity-80">确认人: {collision.confirmedBy}</p>
                        <p className="opacity-80">确认意见: {collision.comment}</p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmBoundary(collision, true)}
                          className="flex-1 py-2 text-sm bg-danger-500 text-white rounded-sm hover:bg-danger-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle size={14} />
                          确认真实
                        </button>
                        <button
                          onClick={() => handleConfirmBoundary(collision, false)}
                          className="flex-1 py-2 text-sm bg-success-500 text-white rounded-sm hover:bg-success-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={14} />
                          标记误报
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-warning-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-warning-800 mb-1">复核要点提示</h4>
                    <ul className="text-sm text-warning-700 space-y-1">
                      <li>• <strong>COL-001 (左膝-地面):</strong> 距离1.2cm，阈值1.5cm，属于典型边界误判，实际未碰撞</li>
                      <li>• <strong>COL-003 (左腕-左髋):</strong> 距离1.8cm，阈值2.0cm，需结合动作上下文判断</li>
                      <li>• 边界案例不能直接丢弃，必须人工确认并记录意见</li>
                      <li>• 确认结果将计入最终报告，作为培训改进依据</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => navigate(`/annotate/${id}`)} icon={<ChevronLeft />}>
                返回标注工作台
              </Button>
              <Button type="primary" onClick={() => setCurrentStep('undo')} icon={<ChevronRight />}>
                进入下一关卡
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'undo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="section-title flex items-center gap-2">
                  <RotateCcw className="text-primary-500" size={18} />
                  撤销/重做操作演示
                </h3>

                <div className="mb-4">
                  <p className="text-sm text-neutral-600 mb-4">
                    点击下方按钮体验撤销和重做功能。系统会自动执行一次撤销，1.5秒后自动重做，
                    观察操作历史的变化。
                  </p>

                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={handleUndoDemo}
                      disabled={undoDemoActive}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                      {undoDemoActive ? (
                        <><RefreshCw className="animate-spin" size={16} /> 演示中...</>
                      ) : (
                        <><Zap size={16} /> 开始演示</>
                      )}
                    </button>
                    <button onClick={undo} className="btn-secondary flex items-center gap-2">
                      <Undo2 size={16} /> 手动撤销
                    </button>
                    <button onClick={redo} className="btn-secondary flex items-center gap-2">
                      <Redo2 size={16} /> 手动重做
                    </button>
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-neutral-700 text-sm">操作历史</h4>
                      <span className="text-xs text-neutral-500">
                        当前位置: {historyIndex + 1} / {history.length}
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto scrollbar-thin">
                      {history.map((record, index) => (
                        <div
                          key={record.id}
                          className={`timeline-item ${index <= historyIndex ? '' : 'opacity-40'}`}
                        >
                          <div className={`timeline-dot ${
                            record.type === 'annotate' ? 'bg-primary-500' :
                            record.type === 'undo' ? 'bg-neutral-500' :
                            record.type === 'confirm' ? 'bg-success-500' :
                            record.type === 'supplement' ? 'bg-warning-500' :
                            record.type === 'rerun' ? 'bg-danger-500' : 'bg-primary-500'
                          }`} />
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`badge ${
                                record.type === 'annotate' ? 'badge-primary' :
                                record.type === 'undo' ? 'badge-warning' :
                                record.type === 'confirm' ? 'badge-success' :
                                record.type === 'supplement' ? 'badge-warning' :
                                record.type === 'rerun' ? 'badge-danger' : 'badge-primary'
                              }`}>
                                {formatOperationType(record.type)}
                              </span>
                              <span className="text-neutral-400 font-mono text-[10px]">
                                {record.timestamp.split(' ')[1]}
                              </span>
                            </div>
                            <p className="text-neutral-600">{record.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="card">
                  <h3 className="section-title flex items-center gap-2">
                    <RefreshCw className="text-warning-500" size={18} />
                    重复运行功能
                  </h3>
                  <p className="text-sm text-neutral-600 mb-4">
                    因评分表更新或边界案例调整，有时需要重新运行碰撞检测算法。
                    当前任务已重复运行 <span className="font-bold text-warning-600">{currentTask.rerunCount}</span> 次。
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-neutral-50 rounded-sm text-center">
                      <p className="text-xs text-neutral-500 mb-1">重复运行前</p>
                      <p className="text-xl font-bold text-neutral-800">碰撞 8 处</p>
                      <p className="text-xs text-neutral-400">边界 3 处</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-sm text-center">
                      <p className="text-xs text-primary-600 mb-1">重复运行后</p>
                      <p className="text-xl font-bold text-primary-600">碰撞 5 处</p>
                      <p className="text-xs text-primary-400">边界 2 处</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { reRunAnnotation(); message.success('重复运行完成，碰撞检测已重新计算'); }}
                    className="w-full btn-warning flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    执行重复运行
                  </button>
                </div>

                <div className="card">
                  <h3 className="section-title flex items-center gap-2">
                    <ArrowLeftRight className="text-danger-500" size={18} />
                    重开任务功能
                  </h3>
                  <p className="text-sm text-neutral-600 mb-4">
                    如需重新开始标注，可以重开任务。重开后任务状态变为"已重开"，
                    操作历史会保留，便于追溯。
                  </p>
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 p-3 bg-neutral-50 rounded-sm">
                      <p className="text-xs text-neutral-500 mb-1">当前状态</p>
                      <span className="badge badge-warning">{currentTask.status === 'reviewing' ? '复核中' : currentTask.status}</span>
                    </div>
                    <div className="flex-1 p-3 bg-danger-50 rounded-sm">
                      <p className="text-xs text-danger-500 mb-1">重开后状态</p>
                      <span className="badge badge-danger">已重开</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { reopenTask(); message.success('任务已重开，可继续调整'); }}
                    className="w-full btn-danger flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    重开当前任务
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep('boundary')} icon={<ChevronLeft />}>
                返回上一关卡
              </Button>
              <Button type="primary" onClick={() => setCurrentStep('settlement')} icon={<ChevronRight />}>
                查看结算报告
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'settlement' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 rounded-sm shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">标注复核结算报告</h2>
                  <p className="opacity-90">
                    {currentTask.name} · {currentTask.taskId}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={32} />
                    <span className={`px-4 py-1 rounded-sm text-lg font-bold ${
                      reviews.some((r) => r.isApproved)
                        ? 'bg-success-400 text-white'
                        : 'bg-warning-400 text-white'
                    }`}>
                      {reviews.some((r) => r.isApproved) ? '复核通过' : '待复核'}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">
                    复核人: {reviews[0]?.reviewer || '未复核'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="card text-center">
                <p className="text-sm text-neutral-500 mb-1">总帧数</p>
                <p className="text-3xl font-bold text-neutral-800">{frames.length}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-neutral-500 mb-1">总节点数</p>
                <p className="text-3xl font-bold text-primary-600">{totalNodes}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-neutral-500 mb-1">平均置信度</p>
                <p className="text-3xl font-bold text-success-600">{(avgConfidence * 100).toFixed(1)}%</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-neutral-500 mb-1">重复运行次数</p>
                <p className="text-3xl font-bold text-warning-600">{currentTask.rerunCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="card">
                <h3 className="section-title">问题分布</h3>
                <ReactECharts option={problemDistribution} style={{ height: '250px' }} />
              </div>
              <div className="card">
                <h3 className="section-title">置信度趋势</h3>
                <ReactECharts option={confidenceTrend} style={{ height: '250px' }} />
              </div>
              <div className="card">
                <h3 className="section-title">前后对比</h3>
                <ReactECharts option={comparisonChart} style={{ height: '250px' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="section-title flex items-center gap-2">
                  <Target className="text-danger-500" size={18} />
                  边界案例详情
                </h3>
                <div className="space-y-3">
                  {boundaryCases.map((c) => (
                    <div key={c.id} className="p-3 bg-neutral-50 rounded-sm flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${
                        c.confirmed
                          ? c.isFalsePositive ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600'
                          : 'bg-warning-100 text-warning-600'
                      }`}>
                        {c.confirmed
                          ? c.isFalsePositive ? <CheckCircle size={20} /> : <XCircle size={20} />
                          : <AlertTriangle size={20} />
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-neutral-800 text-sm">{c.nodes.join(' ↔ ')}</span>
                          <span className={`text-[10px] px-1.5 rounded ${
                            c.confirmed
                              ? c.isFalsePositive ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600'
                              : 'bg-warning-100 text-warning-600'
                          }`}>
                            {c.confirmed ? (c.isFalsePositive ? '误报' : '真实碰撞') : '待确认'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 mb-1">{c.reason}</p>
                        {c.comment && (
                          <p className="text-xs text-neutral-500 italic">确认意见: {c.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="section-title flex items-center gap-2">
                  <FileText className="text-primary-500" size={18} />
                  评分表概览
                </h3>
                {scoreSheet && (
                  <div className="space-y-3">
                    {scoreSheet.scores.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-sm flex items-center justify-between ${
                          item.score === undefined || item.missingUnit
                            ? 'bg-warning-50 border border-warning-200'
                            : 'bg-neutral-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-800">{item.itemName}</span>
                            {item.isOldData && <span className="text-[10px] text-neutral-500 bg-neutral-200 px-1 rounded">旧表</span>}
                            {item.missingUnit && <span className="text-[10px] text-warning-600 bg-warning-100 px-1 rounded">缺单位</span>}
                            {item.score === undefined && <span className="text-[10px] text-danger-600 bg-danger-100 px-1 rounded">漏填</span>}
                          </div>
                          {item.remark && (
                            <p className="text-[10px] text-neutral-500 mt-0.5">{item.remark}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-neutral-800">
                            {item.score ?? '-'}
                          </span>
                          <span className="text-sm text-neutral-500">/{item.fullScore}</span>
                          {item.unit && <span className="text-sm text-neutral-500 ml-1">{item.unit}</span>}
                        </div>
                      </div>
                    ))}
                    {scoreSheet.supplementNote && (
                      <div className="p-3 bg-primary-50 border border-primary-200 rounded-sm text-xs text-primary-700">
                        📝 {scoreSheet.supplementNote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="section-title flex items-center gap-2">
                <TrendingUp className="text-success-500" size={18} />
                改进建议
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-danger-50 border-l-4 border-danger-500 rounded-r-sm">
                  <h4 className="font-semibold text-danger-800 mb-2">高风险问题</h4>
                  <ul className="text-sm text-danger-700 space-y-1">
                    <li>• 右腕-右膝碰撞需在培训中重点强调</li>
                    <li>• 头顶障碍物距离需保持5cm以上安全距离</li>
                    <li>• 边界案例确认流程需标准化</li>
                  </ul>
                </div>
                <div className="p-4 bg-warning-50 border-l-4 border-warning-500 rounded-r-sm">
                  <h4 className="font-semibold text-warning-800 mb-2">待改进项</h4>
                  <ul className="text-sm text-warning-700 space-y-1">
                    <li>• 评分表提交需及时，避免延迟</li>
                    <li>• 补录流程需明确责任人</li>
                    <li>• 单位填写需规范，避免遗漏</li>
                  </ul>
                </div>
                <div className="p-4 bg-success-50 border-l-4 border-success-500 rounded-r-sm">
                  <h4 className="font-semibold text-success-800 mb-2">做得好的方面</h4>
                  <ul className="text-sm text-success-700 space-y-1">
                    <li>• 边界案例未直接丢弃，保留了可追溯性</li>
                    <li>• 重复运行有效降低了误报率</li>
                    <li>• 操作历史完整，便于审计</li>
                  </ul>
                </div>
              </div>
            </div>

            {!reviews.some((r) => r.isApproved) && (
              <div className="card bg-gradient-to-r from-primary-50 to-white">
                <h3 className="section-title flex items-center gap-2">
                  <CheckCircle className="text-primary-500" size={18} />
                  完成最终复核
                </h3>
                <Form
                  form={settlementForm}
                  layout="vertical"
                  onFinish={handleCompleteReview}
                  className="max-w-2xl"
                >
                  <Form.Item
                    name="approved"
                    label="复核结论"
                    rules={[{ required: true, message: '请选择复核结论' }]}
                  >
                    <Radio.Group>
                      <Radio.Button value={true} className="h-auto py-3 px-6">
                        <CheckCircle className="inline mr-2 text-success-500" size={18} />
                        <span className="font-medium">复核通过</span>
                      </Radio.Button>
                      <Radio.Button value={false} className="h-auto py-3 px-6">
                        <XCircle className="inline mr-2 text-danger-500" size={18} />
                        <span className="font-medium">驳回重开</span>
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item
                    name="comment"
                    label="复核意见"
                    rules={[{ required: true, message: '请填写复核意见' }]}
                  >
                    <TextArea rows={3} placeholder="请填写详细的复核意见，说明通过或驳回的原因..." />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" size="large" htmlType="submit" icon={<CheckCircle />}>
                      提交复核结论
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep('undo')} icon={<ChevronLeft />}>
                返回上一关卡
              </Button>
              <div className="flex gap-3">
                <Button onClick={() => navigate(`/data`)} icon={<Database />}>
                  查看数据管理
                </Button>
                <Button type="primary" onClick={() => navigate(`/export/${id}`)} icon={<FileDown />}>
                  导出报告
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        title="边界案例确认"
        open={confirmModalVisible}
        onCancel={() => { setConfirmModalVisible(false); setSelectedCollision(null); settlementForm.resetFields(); }}
        footer={null}
      >
        {selectedCollision && (
          <div className="mb-4 p-4 bg-warning-50 border border-warning-200 rounded-sm">
            <p className="font-medium text-warning-800 mb-2">
              {selectedCollision.nodes.join(' ↔ ')}
            </p>
            <p className="text-sm text-warning-700">{selectedCollision.reason}</p>
            <p className="text-xs text-neutral-500 mt-2">
              距离: {selectedCollision.distance}cm / 阈值: {selectedCollision.threshold}cm
            </p>
          </div>
        )}
        <Form form={settlementForm} layout="vertical" onFinish={handleConfirmSubmit}>
          <Form.Item
            name="approved"
            label="确认结果"
            rules={[{ required: true, message: '请选择确认结果' }]}
          >
            <Radio.Group>
              <Radio.Button value={true} className="h-auto py-2 px-4">
                <XCircle className="inline mr-2 text-danger-500" size={16} />
                确认真实碰撞
              </Radio.Button>
              <Radio.Button value={false} className="h-auto py-2 px-4">
                <CheckCircle className="inline mr-2 text-success-500" size={16} />
                标记为误报
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="comment"
            label="确认意见"
            rules={[{ required: true, message: '请填写确认意见' }]}
          >
            <TextArea rows={3} placeholder="请填写确认意见，说明判断依据..." />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setConfirmModalVisible(false); setSelectedCollision(null); }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              提交确认
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Review;
