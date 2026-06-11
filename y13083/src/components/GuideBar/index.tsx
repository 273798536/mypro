import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const guides = [
  '样例在3D场景中，滚动缩放查看',
  '异常标红，重叠标黄，在左侧筛选可快速定位',
  '右上角导出 Markdown，报告与页面状态一致',
];

export default function GuideBar() {
  const { guideVisible, setGuideVisible } = useAppStore();

  if (!guideVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-5',
        'bg-slate-950/90 backdrop-blur',
        'border-t border-[#1e293b]',
      )}
    >
      <div className="flex items-center gap-6">
        {guides.map((text, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold',
                'bg-slate-800 text-cyan-400 border border-cyan-800',
              )}
            >
              {idx + 1}
            </span>
            <span className="text-sm text-slate-400">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setGuideVisible(false)}
        className={cn(
          'h-8 px-4 text-sm font-medium border-2 transition-colors',
          'border-cyan-700 text-cyan-400 hover:bg-cyan-950/60',
        )}
      >
        知道了
      </button>
    </div>
  );
}
