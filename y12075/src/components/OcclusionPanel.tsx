import { useAppStore } from '../store/appStore';
import { EyeOff } from 'lucide-react';

export default function OcclusionPanel() {
  const { occlusionResults, sections, activeSections } = useAppStore();

  const activeResults = occlusionResults.filter(
    (o) => activeSections.has(o.sourceSectionId) && activeSections.has(o.blockedSectionId)
  );

  if (activeResults.length === 0) {
    return (
      <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
        <h3 className="text-sm font-semibold text-[#F5F0E8] mb-2 font-['DM_Sans'] flex items-center gap-2">
          <EyeOff size={14} className="text-[#D4A843]" />
          声部遮挡分析
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">未检测到明显遮挡</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
      <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans'] flex items-center gap-2">
        <EyeOff size={14} className="text-[#D4A843]" />
        声部遮挡分析
      </h3>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {activeResults.map((result, idx) => {
          const sourceSection = sections.find((s) => s.id === result.sourceSectionId);
          const blockedSection = sections.find((s) => s.id === result.blockedSectionId);

          return (
            <div key={idx} className="p-2 bg-[#1a2d4a] rounded">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span style={{ color: sourceSection?.color }}>{sourceSection?.name}</span>
                <span className="text-gray-500">→</span>
                <span style={{ color: blockedSection?.color }}>{blockedSection?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">遮挡座位:</span>
                  <span className="text-[#F5F0E8] ml-1">{result.blockedSeatIds.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">占比:</span>
                  <span className="text-[#F5F0E8] ml-1">{(result.blockedRatio * 100).toFixed(1)}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">平均衰减:</span>
                  <span className="text-red-400 ml-1">-{result.avgOcclusionLoss} dB</span>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500 truncate">
                受影响: {result.blockedSeatIds.slice(0, 5).join(', ')}
                {result.blockedSeatIds.length > 5 && '...'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
