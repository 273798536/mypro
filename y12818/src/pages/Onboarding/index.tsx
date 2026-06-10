/**
 * 首次启动引导页面
 * 包含欢迎页、加载示例数据动画、3步功能导览、完成进入仪表盘
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  ClipboardCheck,
  GitBranch,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  SkipForward,
  Loader2,
  FileSpreadsheet,
  Beaker,
  Database,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { useSampleStore } from '@/store/sampleStore';
import { useAnomalyStore } from '@/store/anomalyStore';
import { useUiStore } from '@/store/uiStore';

// ==================== 类型定义 ====================

/** 引导步骤枚举 */
type OnboardingStep =
  | 'welcome' // 欢迎页
  | 'loading' // 加载示例数据
  | 'tour-1' // 第1步：报告导出入口
  | 'tour-2' // 第2步：复核流程
  | 'tour-3' // 第3步：追溯操作
  | 'complete'; // 完成页

/** 功能导览步骤配置 */
interface TourStepConfig {
  /** 步骤标识 */
  step: OnboardingStep;
  /** 步骤序号（1-3） */
  stepNumber: 1 | 2 | 3;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description: string;
  /** 主图标组件 */
  mainIcon: typeof Download;
  /** 主图标渐变颜色类 */
  iconGradientClass: string;
  /** 功能亮点列表 */
  highlights: string[];
}

// ==================== 配置常量 ====================

/** 功能导览步骤配置列表 */
const TOUR_STEPS: TourStepConfig[] = [
  {
    step: 'tour-1',
    stepNumber: 1,
    title: '一键生成专业报告',
    description:
      '通过智能报告导出功能，将复杂的追溯数据一键转化为标准化的审计报告。支持PDF和Excel双格式导出，满足不同场景的合规审查需求。',
    mainIcon: Download,
    iconGradientClass: 'from-blue-500 to-indigo-600',
    highlights: [
      '完整追溯链路可视化呈现',
      '版本变更日志自动汇总',
      '异常与修正记录完整归档',
      '符合GMP审计标准格式',
    ],
  },
  {
    step: 'tour-2',
    stepNumber: 2,
    title: '标准化复核流程',
    description:
      '系统化的异常复核工作流，支持AI智能预筛、多人协同审核、修正痕迹追踪，确保每一条数据都经过严格的质量把关。',
    mainIcon: ClipboardCheck,
    iconGradientClass: 'from-emerald-500 to-green-600',
    highlights: [
      'AI智能识别物种同义冲突',
      '待办事项自动提醒通知',
      '审核意见完整记录',
      '修正操作可追溯可回滚',
    ],
  },
  {
    step: 'tour-3',
    stepNumber: 3,
    title: '全链路数据追溯',
    description:
      '从样本录入到最终结论的完整追溯链路，每一次修改、每一次审核都有迹可循，真正实现数据的全生命周期管理。',
    mainIcon: GitBranch,
    iconGradientClass: 'from-purple-500 to-violet-600',
    highlights: [
      '版本快照完整保存',
      '追溯图谱可视化展示',
      '操作人时间精确记录',
      '多维度快速定位查询',
    ],
  },
];

/** 总进度步数（用于计算进度条：loading + 3步导览） */
const TOTAL_PROGRESS_STEPS = 5;

// ==================== 子组件 ====================

/**
 * 顶部进度条组件
 */
function ProgressBar({ currentStep }: { currentStep: OnboardingStep }) {
  // 计算当前进度百分比
  const getProgressPercent = (): number => {
    switch (currentStep) {
      case 'welcome':
        return 0;
      case 'loading':
        return 10;
      case 'tour-1':
        return 35;
      case 'tour-2':
        return 60;
      case 'tour-3':
        return 85;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-50">
      <motion.div
        className="h-1 w-full bg-slate-100 dark:bg-slate-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${getProgressPercent()}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  );
}

/**
 * 跳过按钮组件
 */
function SkipButton({
  onSkip,
  visible,
}: {
  onSkip: () => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onSkip}
      className="fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <SkipForward className="h-4 w-4" />
      跳过引导
    </motion.button>
  );
}

/**
 * 欢迎页面组件
 */
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center"
    >
      {/* Logo图标区域 */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative mb-10"
      >
        {/* 背景光晕 */}
        <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-blue-400/20 via-indigo-400/20 to-purple-400/20 blur-3xl" />
        {/* 主图标 */}
        <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/30">
          <Beaker className="h-14 w-14 text-white" />
        </div>
        {/* 装饰角标 */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"
        >
          <Sparkles className="h-5 w-5" />
        </motion.div>
      </motion.div>

      {/* 标题区域 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          培养基批号
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            追溯工具
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-slate-500 dark:text-slate-400">
          智能化的微生物检测数据管理平台，
          <br className="hidden sm:block" />
          让数据追溯、异常复核、报告导出变得简单高效
        </p>
      </motion.div>

      {/* 功能特性标签 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        {[
          { icon: FileSpreadsheet, label: '智能数据导入' },
          { icon: ClipboardCheck, label: '标准化复核' },
          { icon: GitBranch, label: '全链路追溯' },
          { icon: Download, label: '一键报告' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
          >
            <item.icon className="h-4 w-4 text-blue-500" />
            {item.label}
          </motion.div>
        ))}
      </motion.div>

      {/* 开始按钮 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="mt-14"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="group relative overflow-hidden px-10 text-base"
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            开始使用
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Button>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          首次启动将加载示例数据，约需 3-5 秒
        </p>
      </motion.div>
    </motion.div>
  );
}

/**
 * 加载示例数据页面组件
 */
function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const sampleStore = useSampleStore();
  const [loadingTexts, setLoadingTexts] = useState<string[]>([
    '正在初始化数据引擎...',
  ]);
  const [progress, setProgress] = useState(0);

  // 加载阶段文案
  const loadingStages = [
    { progress: 15, text: '正在初始化数据引擎...' },
    { progress: 35, text: '正在生成培养基批号数据...' },
    { progress: 55, text: '正在导入样本检测记录...' },
    { progress: 75, text: '正在构建物种同义词库...' },
    { progress: 90, text: '正在预生成异常预警...' },
    { progress: 100, text: '数据加载完成！' },
  ];

  useEffect(() => {
    let currentStage = 0;
    let cancelled = false;

    const runLoading = async () => {
      // 实际执行数据初始化
      try {
        await sampleStore.resetData();
      } catch {
        // 忽略初始化错误，继续引导流程
      }

      // 模拟渐进式加载动画
      for (let i = 0; i < loadingStages.length; i++) {
        if (cancelled) return;
        const stage = loadingStages[i];
        currentStage = i;
        setLoadingTexts((prev) => [...prev.slice(-3), stage.text]);
        setProgress(stage.progress);
        // 每个阶段等待一段时间
        await new Promise((resolve) => setTimeout(resolve, i === 0 ? 600 : 500));
      }

      // 完成后短暂停留再跳转
      if (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onComplete();
      }
    };

    void runLoading();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center"
    >
      {/* 加载动画图标 */}
      <div className="relative mb-12">
        {/* 旋转外圈 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400"
          style={{ width: 120, height: 120, marginLeft: -60, marginTop: -60, left: '50%', top: '50%' }}
        />
        {/* 反向旋转中圈 */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="absolute rounded-full border-4 border-slate-100 border-t-indigo-500 dark:border-slate-800 dark:border-t-indigo-400"
          style={{ width: 90, height: 90, marginLeft: -45, marginTop: -45, left: '50%', top: '50%' }}
        />
        {/* 中心图标 */}
        <div className="relative flex h-[120px] w-[120px] items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <Database className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            <motion.span
              key={progress}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-slate-700 dark:text-slate-300"
            >
              {progress}%
            </motion.span>
          </div>
        </div>
      </div>

      {/* 加载文案区域 */}
      <div className="w-full max-w-md">
        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-2 text-2xl font-bold text-slate-900 dark:text-white"
        >
          正在配置示例数据
        </motion.h2>
        <p className="mb-8 text-slate-500 dark:text-slate-400">
          为了让您快速了解各项功能，我们正在准备示例数据
        </p>

        {/* 进度条 */}
        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* 加载步骤日志 */}
        <div className="space-y-2 text-left">
          {loadingTexts.map((text, index) => (
            <motion.div
              key={`${text}-${index}`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2 text-sm dark:bg-slate-800/50"
            >
              {index === loadingTexts.length - 1 ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              )}
              <span
                className={
                  index === loadingTexts.length - 1
                    ? 'font-medium text-slate-700 dark:text-slate-300'
                    : 'text-slate-500 dark:text-slate-400'
                }
              >
                {text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 功能导览步骤通用组件
 */
function TourStepScreen({
  config,
  isFirst,
  isLast,
  onPrev,
  onNext,
}: {
  config: TourStepConfig;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const MainIcon = config.mainIcon;

  return (
    <motion.div
      key={config.step}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5 }}
      className="flex w-full max-w-4xl flex-col items-center text-center"
    >
      {/* 步骤指示器 */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex items-center gap-3"
      >
        {TOUR_STEPS.map((s) => (
          <div key={s.step} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                s.stepNumber < config.stepNumber
                  ? 'bg-green-500 text-white dark:bg-green-600'
                  : s.stepNumber === config.stepNumber
                  ? 'bg-gradient-to-br ' + s.iconGradientClass + ' text-white shadow-lg'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {s.stepNumber < config.stepNumber ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                s.stepNumber
              )}
            </div>
            {s.stepNumber < 3 && (
              <div
                className={`h-0.5 w-12 transition-all duration-500 ${
                  s.stepNumber < config.stepNumber
                    ? 'bg-green-500 dark:bg-green-600'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </motion.div>

      {/* 主体内容 */}
      <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
        {/* 左侧：大图标预览 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="order-1 lg:order-1"
        >
          <div className="relative mx-auto aspect-square w-full max-w-sm">
            {/* 背景装饰光晕 */}
            <div
              className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${config.iconGradientClass} opacity-20 blur-3xl`}
            />
            {/* 卡片容器 */}
            <div className="relative h-full w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              {/* 顶部装饰条 */}
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${config.iconGradientClass}`}
              />
              {/* 大图标 */}
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br ${config.iconGradientClass} shadow-xl`}
                >
                  <MainIcon className="h-14 w-14 text-white" />
                </div>
                {/* 装饰性模拟界面元素 */}
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                    <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${config.iconGradientClass}`} />
                    <div className="h-2.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                    <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${config.iconGradientClass}`} />
                    <div className="h-2.5 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 右侧：说明文字 */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="order-2 flex flex-col items-start text-left lg:order-2"
        >
          <span
            className={`mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${config.iconGradientClass} px-4 py-1.5 text-xs font-semibold text-white shadow-sm`}
          >
            功能 {config.stepNumber} / 3
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {config.title}
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            {config.description}
          </p>

          {/* 功能亮点列表 */}
          <ul className="mb-10 w-full space-y-3">
            {config.highlights.map((highlight, i) => (
              <motion.li
                key={highlight}
                initial={{ x: -15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${config.iconGradientClass}`}
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">
                  {highlight}
                </span>
              </motion.li>
            ))}
          </ul>

          {/* 导航按钮 */}
          <div className="flex w-full items-center gap-4">
            {!isFirst && (
              <Button
                variant="secondary"
                onClick={onPrev}
              >
                上一步
              </Button>
            )}
            <Button
              size={isFirst ? 'md' : 'md'}
              onClick={onNext}
              className="ml-auto group"
            >
              <span className="inline-flex items-center gap-2">
                {isLast ? '开始使用' : '下一步'}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * 完成页面组件
 */
function CompleteScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center"
    >
      {/* 成功动画图标 */}
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="relative mb-10"
      >
        {/* 背景光晕 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute -inset-6 rounded-full bg-gradient-to-br from-green-400/30 via-emerald-400/30 to-teal-400/30 blur-2xl"
        />
        {/* 主图标 */}
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-2xl shadow-emerald-500/30">
          <CheckCircle2 className="h-16 w-16 text-white" />
        </div>
        {/* 散落的装饰粒子 */}
        {[
          { x: -60, y: -30, color: 'from-amber-400 to-orange-500', delay: 0.6 },
          { x: 60, y: -40, color: 'from-blue-400 to-indigo-500', delay: 0.7 },
          { x: -50, y: 50, color: 'from-purple-400 to-pink-500', delay: 0.8 },
          { x: 55, y: 45, color: 'from-cyan-400 to-blue-500', delay: 0.9 },
        ].map((p, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{ scale: 1, x: p.x, y: p.y }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 12,
              delay: p.delay,
            }}
            className={`absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-gradient-to-br ${p.color}`}
          />
        ))}
      </motion.div>

      {/* 标题文案 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          引导完成！
        </h1>
        <p className="mx-auto max-w-lg text-lg text-slate-500 dark:text-slate-400">
          您已了解平台的核心功能，现在可以进入工作台开始使用。
          <br className="hidden sm:block" />
          随时可以在设置中重新观看引导教程。
        </p>
      </motion.div>

      {/* 快速提示 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
          <Sparkles className="h-4 w-4" />
          示例数据已载入
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          引导状态已记录
        </div>
      </motion.div>

      {/* 进入按钮 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="mt-12"
      >
        <Button
          size="lg"
          onClick={onEnter}
          className="group relative overflow-hidden px-12 text-base shadow-lg shadow-blue-500/25"
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            进入工作台
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ==================== 主页面组件 ====================

/**
 * 首次启动引导页面主组件
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const uiStore = useUiStore();
  const anomalyStore = useAnomalyStore();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');

  /** 判断是否显示跳过按钮 */
  const showSkipButton =
    currentStep !== 'complete' && currentStep !== 'welcome';

  /** 完成引导并跳转 */
  const finishOnboarding = () => {
    // 标记引导为已完成
    try {
      uiStore.setAnimationEnabled(true);
      // 确保异常数据也已加载
      anomalyStore.loadRecords();
    } catch {
      // 忽略 UI store 操作错误
    }
    navigate('/dashboard');
  };

  /** 跳过引导 */
  const handleSkip = () => {
    finishOnboarding();
  };

  /** 进入下一步 */
  const handleNext = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('loading');
        break;
      case 'loading':
        setCurrentStep('tour-1');
        break;
      case 'tour-1':
        setCurrentStep('tour-2');
        break;
      case 'tour-2':
        setCurrentStep('tour-3');
        break;
      case 'tour-3':
        setCurrentStep('complete');
        break;
      case 'complete':
        finishOnboarding();
        break;
    }
  };

  /** 返回上一步 */
  const handlePrev = () => {
    switch (currentStep) {
      case 'tour-2':
        setCurrentStep('tour-1');
        break;
      case 'tour-3':
        setCurrentStep('tour-2');
        break;
    }
  };

  /** 获取当前导览步骤配置 */
  const getCurrentTourConfig = (): TourStepConfig | undefined => {
    return TOUR_STEPS.find((s) => s.step === currentStep);
  };

  /** 渲染当前步骤内容 */
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onNext={handleNext} />;
      case 'loading':
        return <LoadingScreen onComplete={handleNext} />;
      case 'complete':
        return <CompleteScreen onEnter={finishOnboarding} />;
      case 'tour-1':
      case 'tour-2':
      case 'tour-3': {
        const config = getCurrentTourConfig();
        if (!config) return null;
        const index = TOUR_STEPS.findIndex((s) => s.step === currentStep);
        return (
          <TourStepScreen
            config={config}
            isFirst={index === 0}
            isLast={index === TOUR_STEPS.length - 1}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 顶部左渐变 */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />
        {/* 底部右渐变 */}
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl dark:bg-purple-600/10" />
        {/* 中央渐变 */}
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/5 blur-3xl dark:bg-indigo-600/5" />
      </div>

      {/* 顶部进度条 */}
      <ProgressBar currentStep={currentStep} />

      {/* 跳过按钮 */}
      <AnimatePresence>
        {showSkipButton && (
          <SkipButton onSkip={handleSkip} visible={showSkipButton} />
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-20">
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
      </main>
    </div>
  );
}
