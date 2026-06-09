import { Link2, Hash, ImageIcon, FileText, ChevronRight } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';

export default function TraceabilityChain() {
  const { additiveItems, sourceRows, batchNumber, sourceNote, selectedProfileId, temperatureProfiles } = useVerificationStore();
  const profile = temperatureProfiles.find((p) => p.id === selectedProfileId);

  return (
    <div className="card p-4">
      <div className="section-title">
        <Link2 size={18} className="text-brand-700" />
        溯源信息链
        <span className="ml-auto text-xs text-slate-500 font-sans font-normal">
          行号/图片名/来源备注，真要追问能回到那张表
        </span>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex gap-2 items-center">
          <FileText size={14} className="text-brand-600" />
          <span className="text-slate-500 w-16">批次号</span>
          <span className="font-mono font-semibold text-brand-700">{batchNumber || '—'}</span>
        </div>
        <div className="flex gap-2 items-center">
          <ChevronRight size={14} className="text-brand-600" />
          <span className="text-slate-500 w-16">曲线版本</span>
          <span>{profile ? `${profile.version} · ${profile.name}` : '—'}</span>
        </div>
        <div className="flex gap-2 items-center">
          <ChevronRight size={14} className="text-brand-600" />
          <span className="text-slate-500 w-16">来源备注</span>
          <span className="text-slate-700">{sourceNote || '—'}</span>
        </div>
      </div>

      {additiveItems.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-6 border border-dashed rounded-md">
          暂无核验数据，无法生成溯源链
        </div>
      ) : (
        <div className="space-y-2">
          {additiveItems.map((it) => {
            const row = sourceRows.find((r) => r.rowNumber === it.sourceRowNumber);
            return (
              <div key={it.id} className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50 hover:bg-white hover:shadow-soft transition">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{it.name}</span>
                  <span className="chip bg-brand-50 text-brand-700">
                    <Hash size={11} />行 {it.sourceRowNumber || '未关联'}
                  </span>
                  {row && (
                    <>
                      <span className="chip bg-slate-100 text-slate-600">
                        <ImageIcon size={11} />
                        {row.imageName || '无图谱'}
                      </span>
                      {row.remark && (
                        <span className="text-xs text-slate-500">备注：{row.remark}</span>
                      )}
                    </>
                  )}
                  <span className="ml-auto text-xs text-slate-500">
                    {it.measuredValue} {it.measuredUnit} → {it.convertedMgPerKg} mg/kg（限量 {it.limitValue}）
                  </span>
                </div>
                {row && (
                  <div className="mt-1 text-[11px] font-mono text-slate-500 pl-1">
                    原始：{row.rawContent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
