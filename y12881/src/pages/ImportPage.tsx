import { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  ChevronRight,
  FileUp,
  RefreshCw,
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useReviewStore } from '@/store/useReviewStore';
import { INITIAL_SAMPLES } from '@/utils/mockData';
import { validateAll } from '@/utils/dataValidator';
import { INITIAL_WATER_QUALITIES } from '@/utils/mockData';

export default function ImportPage() {
  const { setSamples } = useSampleStore();
  const { addVersion } = useReviewStore();
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    simulateImport();
  };

  const simulateImport = () => {
    const result = validateAll(INITIAL_SAMPLES, INITIAL_WATER_QUALITIES);
    setValidation(result);
    setStep(2);

    console.log(
      `%c[数据导入] 校验完成：有效样本 ${result.validSamples.length} / ${INITIAL_SAMPLES.length}，问题 ${result.issues.length} 项`,
      'color: #5AD8FF; font-weight: bold',
    );
  };

  const handleConfirmImport = () => {
    setSamples(INITIAL_SAMPLES);
    const newVersion = {
      id: `v-${Math.random().toString(36).slice(2, 11)}`,
      action: 'import' as const,
      operator: '潜水教练',
      description: `导入 ${INITIAL_SAMPLES.length} 条浮游生物采样数据（${new Date().toLocaleDateString()}）`,
      snapshot: JSON.parse(JSON.stringify(INITIAL_SAMPLES)),
      diff: {},
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    addVersion(newVersion);
    setStep(3);
  };

  const errorCount = validation?.issues.filter((i: any) => i.type === 'error').length || 0;
  const warningCount = validation?.issues.filter((i: any) => i.type === 'warning').length || 0;
  const infoCount = validation?.issues.filter((i: any) => i.type === 'info').length || 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ocean-500/20 flex items-center justify-center">
            <Upload size={20} className="text-ocean-200" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-ocean-50">数据导入向导</h2>
            <p className="text-xs text-ocean-400 mt-0.5">支持 CSV、JSON 格式，批量导入浮游生物采样与水质数据</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s
                    ? 'bg-cyan-glow text-ocean-900 shadow-glow-cyan'
                    : 'bg-ocean-800 text-ocean-500 border border-ocean-700'
                }`}
              >
                {step > s ? <CheckCircle size={14} /> : s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-ocean-100 font-medium' : 'text-ocean-500'}`}>
                {s === 1 ? '上传文件' : s === 2 ? '数据校验' : '导入完成'}
              </span>
              {s < 3 && <ChevronRight size={16} className="text-ocean-600" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={simulateImport}
            className={`glass-panel p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-glow bg-cyan-glow/5 shadow-glow-cyan'
                : 'border-ocean-700 hover:border-ocean-500'
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                isDragging ? 'bg-cyan-glow/20' : 'bg-ocean-800'
              }`}
            >
              <FileUp size={32} className={isDragging ? 'text-cyan-glow' : 'text-ocean-400'} />
            </div>
            <h3 className="font-display font-semibold text-ocean-100 text-lg mb-2">
              拖拽文件到此处，或点击选择
            </h3>
            <p className="text-sm text-ocean-400 mb-4">
              支持 .csv / .json 格式，单文件最大 50MB
            </p>
            <button className="btn-glow inline-flex items-center gap-2">
              <Upload size={14} /> 模拟导入演示数据
            </button>
            <div className="mt-6 pt-6 border-t border-ocean-800 text-xs text-ocean-500 space-y-1">
              <p>演示数据包含：120 条采样记录 + 真实边界样例</p>
              <p>浮标离线 · 水质缺失 · 计数异常</p>
            </div>
          </div>
        )}

        {step === 2 && validation && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="glass-panel p-4 text-center">
                <div className="text-3xl font-display font-bold text-cyan-glow mb-1">
                  {validation.validSamples.length}
                </div>
                <div className="text-[11px] text-ocean-400 uppercase tracking-wider">有效样本</div>
              </div>
              <div className="glass-panel p-4 text-center">
                <div className="text-3xl font-display font-bold text-crimson-risk mb-1">{errorCount}</div>
                <div className="text-[11px] text-ocean-400 uppercase tracking-wider flex items-center justify-center gap-1">
                  <XCircle size={10} /> 错误
                </div>
              </div>
              <div className="glass-panel p-4 text-center">
                <div className="text-3xl font-display font-bold text-amber-risk mb-1">{warningCount}</div>
                <div className="text-[11px] text-ocean-400 uppercase tracking-wider flex items-center justify-center gap-1">
                  <AlertTriangle size={10} /> 警告
                </div>
              </div>
              <div className="glass-panel p-4 text-center">
                <div className="text-3xl font-display font-bold text-ocean-200 mb-1">{infoCount}</div>
                <div className="text-[11px] text-ocean-400 uppercase tracking-wider flex items-center justify-center gap-1">
                  <FileText size={10} /> 提示
                </div>
              </div>
            </div>

            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-cyan-glow" />
                  <span className="font-semibold text-ocean-100 text-sm">校验报告</span>
                </div>
                <span className="text-[11px] text-ocean-400">
                  共 {validation.issues.length} 项问题
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {validation.issues.slice(0, 30).map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 py-1.5 px-2.5 rounded-md bg-ocean-950/40 text-xs"
                  >
                    {issue.type === 'error' && <XCircle size={12} className="text-crimson-risk mt-0.5 flex-shrink-0" />}
                    {issue.type === 'warning' && (
                      <AlertTriangle size={12} className="text-amber-risk mt-0.5 flex-shrink-0" />
                    )}
                    {issue.type === 'info' && <FileText size={12} className="text-ocean-400 mt-0.5 flex-shrink-0" />}
                    <span className="text-ocean-300 font-mono text-[11px] min-w-[100px]">{issue.sampleId}</span>
                    <span className="text-ocean-400 text-[11px]">[{issue.field}]</span>
                    <span className="text-ocean-200">{issue.message}</span>
                  </div>
                ))}
                {validation.issues.length > 30 && (
                  <p className="text-center text-[11px] text-ocean-500 py-2">
                    ...还有 {validation.issues.length - 30} 项问题
                  </p>
                )}
                {validation.issues.length === 0 && (
                  <p className="text-center text-sm text-cyan-glow py-6 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> 所有数据校验通过
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-sm bg-ocean-800/50 text-ocean-300 hover:bg-ocean-800 border border-ocean-700 flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> 重新选择
              </button>
              <div className="flex gap-2">
                <span className="text-xs text-ocean-400 self-center">
                  警告类问题不会阻止导入，建议后续复核修正
                </span>
                <button onClick={handleConfirmImport} className="btn-glow px-5 py-2 text-sm">
                  确认导入（{validation.validSamples.length} 条）
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-cyan-glow/15 flex items-center justify-center">
              <CheckCircle size={40} className="text-cyan-glow" />
            </div>
            <h3 className="font-display font-bold text-2xl text-ocean-50 mb-2">导入成功！</h3>
            <p className="text-sm text-ocean-300 mb-6">
              已导入 {INITIAL_SAMPLES.length} 条样本数据，自动生成版本记录
            </p>
            <div className="max-w-md mx-auto bg-ocean-900/50 rounded-xl p-4 mb-6 text-left text-xs space-y-1.5 font-mono">
              <p>
                <span className="text-ocean-500">[系统]</span>{' '}
                <span className="text-ocean-300">数据校验完成</span>
              </p>
              <p>
                <span className="text-ocean-500">[系统]</span>{' '}
                <span className="text-cyan-glow">成功入库 {INITIAL_SAMPLES.length} 条记录</span>
              </p>
              <p>
                <span className="text-ocean-500">[系统]</span>{' '}
                <span className="text-amber-risk">生成 {warningCount + errorCount} 条待复核项</span>
              </p>
              <p>
                <span className="text-ocean-500">[系统]</span>{' '}
                <span className="text-ocean-300">已推送至复核中心与风险通报</span>
              </p>
              <p>
                <span className="text-ocean-500">[复核入口]</span>{' '}
                <span className="text-cyan-glow">可在导航栏或右侧面板进行修正</span>
              </p>
            </div>
            <p className="terminal-hint text-center mb-6">
              $ import --success · 已生成版本快照
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
