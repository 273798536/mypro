import { useEffect } from 'react';
import TopActionBar from '@/components/TopActionBar';
import UndoStack from '@/components/UndoStack';
import TransparentChain from '@/components/TransparentChain';
import ParamCompare from '@/components/ParamCompare';
import PhotoAnnotation from '@/components/PhotoAnnotation';
import { useMainStore } from '@/store/useMainStore';
import { Ship, Anchor, Compass } from 'lucide-react';

export default function MainBoard() {
  const { photos, loadSample } = useMainStore();
  const hasData = photos.length > 0;

  useEffect(() => {
    if (!hasData) {
      loadSample();
    }
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* 装饰背景元素 */}
      <DecorativeBg />

      <div className="relative z-10 max-w-[1800px] mx-auto px-3 md:px-5 py-3 md:py-4 flex flex-col gap-3 md:gap-4 min-h-screen">
        <TopActionBar />

        {hasData ? (
          <div className="flex-1 grid grid-cols-12 gap-3 md:gap-4 min-h-0">
            <div className="col-span-12 lg:col-span-2 xl:col-span-2 h-[72vh] lg:h-auto min-h-[420px]">
              <UndoStack />
            </div>

            <div className="col-span-12 lg:col-span-7 xl:col-span-7 h-[78vh] lg:h-auto min-h-[500px]">
              <TransparentChain />
            </div>

            <div className="col-span-12 lg:col-span-3 xl:col-span-3 h-[72vh] lg:h-auto min-h-[460px]">
              <ParamCompare />
            </div>
          </div>
        ) : (
          <EmptyState onLoad={loadSample} />
        )}

        <footer className="text-center text-[11px] text-slate-600 pb-2 select-none">
          海浪浮标实验复算 · 训练台 v1.0 · 深海科研工业风 · 单位混写/数量级变化透明化
        </footer>
      </div>

      <PhotoAnnotation />
    </div>
  );
}

function EmptyState({ onLoad }: { onLoad: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="glass-card max-w-2xl w-full p-8 text-center animate-stagger-fade">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-neon-cyan/20 via-neon-magenta/15 to-transparent border border-neon-cyan/30 flex items-center justify-center mb-5 shadow-neon-cyan animate-pulse-edge">
          <Anchor className="w-10 h-10 text-neon-cyan" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          海浪浮标实验复算 · 训练台
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed mb-6">
          面向训练教练老唐：现场照片 + 透明计算链路（公式·单位换算·边界值·数量级）+ 撤回历史栈 + A/B组参数对照。
          <br />
          负责人拿两组参数对照时，中间过程和单位换算不藏。
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6 text-left text-xs">
          <div className="rounded-xl p-3 bg-abyss-800/50 border border-neon-cyan/15">
            <div className="w-8 h-8 rounded-lg bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan flex items-center justify-center mb-2">
              <Ship className="w-4 h-4" />
            </div>
            <div className="text-slate-200 font-medium mb-1">① 放样例</div>
            <div className="text-slate-500 leading-relaxed">
              注入4张现场照片包 + B组缺口
            </div>
          </div>
          <div className="rounded-xl p-3 bg-abyss-800/50 border border-neon-amber/15">
            <div className="w-8 h-8 rounded-lg bg-neon-amber/15 border border-neon-amber/30 text-neon-amber flex items-center justify-center mb-2">
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-slate-200 font-medium mb-1">② 重跑</div>
            <div className="text-slate-500 leading-relaxed">
              修改两组参数，重新复算链路
            </div>
          </div>
          <div className="rounded-xl p-3 bg-abyss-800/50 border border-neon-magenta/15">
            <div className="w-8 h-8 rounded-lg bg-neon-magenta/15 border border-neon-magenta/30 text-neon-magenta flex items-center justify-center mb-2">
              <Anchor className="w-4 h-4" />
            </div>
            <div className="text-slate-200 font-medium mb-1">③ 截图说明</div>
            <div className="text-slate-500 leading-relaxed">
              照片↔链路双向跳转，追溯原始说法
            </div>
          </div>
        </div>
        <button
          onClick={onLoad}
          className="neon-btn neon-btn-primary text-base px-7 py-3"
        >
          ▶ 立即放样例开始
        </button>
      </div>
    </div>
  );
}

function DecorativeBg() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-neon-cyan/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-neon-magenta/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[280px] h-[280px] rounded-full bg-neon-amber/5 blur-3xl" />
      </div>
    </>
  );
}
