import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Sparkles, Database, PlayCircle, CheckCircle2, X } from 'lucide-react';

export default function FirstVisitGuide({ onDismiss }: { onDismiss: () => void }) {
  const loadSampleData = useAppStore((s) => s.loadSampleData);
  const setFirstVisitComplete = useAppStore((s) => s.setFirstVisitComplete);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleLoad = () => {
    setLoading(true);
    setTimeout(() => {
      loadSampleData();
      setLoading(false);
      setDone(true);
    }, 900);
  };

  const handleStart = () => {
    setFirstVisitComplete();
    onDismiss();
  };

  const handleSkip = () => {
    setFirstVisitComplete();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-gradient-to-r from-deep-ocean to-deep-ocean-light p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif-cn">欢迎使用 动植物样本冷链追踪系统</h2>
              <p className="text-slate-200 text-sm mt-1.5 leading-relaxed">
                专为育种专员设计。从今天起，测序结果、病理备注、最终结论可双向追溯，
                不用再翻表格找对应关系。
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Database, title: '8 个真实样例', desc: '覆盖水稻/小麦/猪/鸡' },
              { icon: PlayCircle, title: '完整流程演示', desc: '从采样→测序→结论' },
              { icon: CheckCircle2, title: '重复导入测试', desc: '校验不会越跑越乱' },
            ].map((f) => (
              <div key={f.title} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-9 h-9 mx-auto rounded-lg bg-deep-ocean/10 text-deep-ocean flex items-center justify-center mb-2">
                  <f.icon className="w-4.5 h-4.5" />
                </div>
                <div className="text-sm font-semibold text-slate-800">{f.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>

          {!done ? (
            <button
              onClick={handleLoad}
              disabled={loading}
              className="w-full btn-success !py-3 text-base flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  正在载入示例数据...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  一键载入育种样例数据
                </>
              )}
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-tundra-green/10 border border-tundra-green/30 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-tundra-green shrink-0" />
              <div>
                <div className="font-semibold text-tundra-green-dark">示例数据载入完成</div>
                <div className="text-sm text-tundra-green-dark/80 mt-0.5">
                  已加载样本列表、测序结果、病理备注、结论锚点及导入日志
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {done && (
              <button onClick={handleStart} className="flex-1 btn-primary !py-2.5">
                开始使用，进入谱系追踪 →
              </button>
            )}
            <button
              onClick={handleSkip}
              className={done ? 'btn-secondary !py-2.5' : 'flex-1 text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2'}
            >
              {done ? '暂不，先看看' : '先跳过，稍后手动载入数据'}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-500">💡 日常使用建议：</span>
            平时在「谱系追踪」处理工作，月底或备课时去「图像标注审核」对照讲解。
            每次导入数据前，可去「重复导入测试」跑一遍模拟流程，避免一件事出现两份结论。
          </div>
        </div>
      </div>
    </div>
  );
}
