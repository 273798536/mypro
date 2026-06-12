import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Declaration } from '@/types';
import { useDeclarationStore } from '@/stores/useDeclarationStore';
import TopInfoBar from '@/components/declaration-detail/TopInfoBar';
import MultiSourcePanel from '@/components/declaration-detail/MultiSourcePanel';
import RiskLevelCompare from '@/components/declaration-detail/RiskLevelCompare';
import BoundaryIssueCards from '@/components/declaration-detail/BoundaryIssueCards';
import WeatherGapSection from '@/components/declaration-detail/WeatherGapSection';
import ReviewNoteTimeline from '@/components/declaration-detail/ReviewNoteTimeline';
import AnimatedStagger from '@/components/common/AnimatedStagger';
import { checkSalinityCompliance, getUnitLabel } from '@/utils/salinity';

export default function DeclarationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const declarations = useDeclarationStore(s => s.declarations);
  const declaration = declarations.find(d => d.id === id);

  if (!declaration) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-lg mb-2">未找到申报记录</p>
          <button onClick={() => navigate('/')} className="text-ocean-600 hover:underline text-sm">
            返回工作台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-ocean-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </button>
        </div>

        <AnimatedStagger delay={0}>
          <TopInfoBar declaration={declaration} />
        </AnimatedStagger>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <AnimatedStagger delay={100}>
              <MultiSourcePanel declaration={declaration} />
            </AnimatedStagger>

            <AnimatedStagger delay={200}>
              <BallastWaterTable declaration={declaration} />
            </AnimatedStagger>

            <AnimatedStagger delay={300}>
              <BoundaryIssueCards issues={declaration.boundaryIssues} />
            </AnimatedStagger>
          </div>

          <div className="space-y-4">
            <AnimatedStagger delay={150}>
              <RiskLevelCompare declaration={declaration} />
            </AnimatedStagger>

            <AnimatedStagger delay={250}>
              <WeatherGapSection declaration={declaration} />
            </AnimatedStagger>

            <AnimatedStagger delay={350}>
              <ReviewNoteTimeline declaration={declaration} />
            </AnimatedStagger>
          </div>
        </div>
      </div>
    </div>
  );
}

function BallastWaterTable({ declaration }: { declaration: Declaration }) {
  const SALINITY_THRESHOLD = 30;
  return (
    <div className="card-ocean overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-ocean-800 flex items-center gap-2">
          <span className="w-1 h-4 bg-aqua-400 rounded-full" />
          压载水数据
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-3 py-2 text-left font-medium">舱位</th>
              <th className="px-3 py-2 text-right font-medium">容量(m³)</th>
              <th className="px-3 py-2 text-right font-medium">盐度</th>
              <th className="px-3 py-2 text-left font-medium">单位</th>
              <th className="px-3 py-2 text-right font-medium">PSU换算</th>
              <th className="px-3 py-2 text-center font-medium">达标</th>
              <th className="px-3 py-2 text-left font-medium">交换方式</th>
              <th className="px-3 py-2 text-right font-medium">交换率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {declaration.ballastWater.map((bw) => {
              const compliance = checkSalinityCompliance(bw.salinity, bw.salinityUnit);
              const isOob = !compliance.compliant;
              return (
                <tr key={bw.id} className={`hover:bg-slate-50/50 ${isOob ? 'bg-red-50/30' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-700">{bw.tankId}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{bw.volume.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-mono font-medium ${isOob ? 'text-red-600' : 'text-slate-700'}`}>
                    {bw.salinity}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      bw.salinityUnit === 'unknown' ? 'bg-red-100 text-red-600' :
                      bw.salinityUnit === 'permil' || bw.salinityUnit === 'percent' ? 'bg-orange-100 text-orange-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {getUnitLabel(bw.salinityUnit)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${isOob ? 'text-red-600' : 'text-slate-600'}`}>
                    {compliance.psuValue}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isOob ? (
                      <span className="out-of-bounds inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-red-700 bg-red-50 border-red-300">
                        ❌ +{compliance.delta}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-green-700 bg-green-50">
                        ✅ {compliance.delta}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {bw.exchangeMethod === 'flow-through' ? '溢流法' : bw.exchangeMethod === 'dilution' ? '稀释法' : '未交换'}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${bw.exchangeRate < 95 ? 'text-orange-600' : 'text-slate-600'}`}>
                    {bw.exchangeMethod === 'none' ? '-' : `${bw.exchangeRate}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-[10px] text-slate-400 border-t border-gray-50">
        盐度排放阈值：{SALINITY_THRESHOLD} PSU · 交换率达标线：95%
      </div>
    </div>
  );
}
