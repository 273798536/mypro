import { useParkingData } from '../../hooks/useParkingData';
import { pressureToColor, pressureToHexColor, formatHour, getPressureLabel } from '../../utils/colorUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Brain, TrendingUp, ArrowRight, Lightbulb, AlertCircle, Clock, Building2, MapPin, Calendar } from 'lucide-react';

export function ExplanationPanel() {
  const { explanation, currentRecord, peakHour, peakPressure, averagePressure } = useParkingData();

  if (!explanation || !currentRecord) {
    return (
      <Card className="h-full">
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <Brain size={16} />
            智能分析
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex items-center justify-center h-60 text-slate-500">
          <div className="text-center">
            <Brain size={48} className="mx-auto mb-3 opacity-30" />
            <p>加载数据后自动生成可解释性分析</p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  const factors = explanation.contributingFactors || [];
  const causeChain = explanation.causeChain || [];

  const factorIcons: Record<string, React.ReactNode> = {
    '时段高峰': <Clock size={14} />,
    '楼层溢出': <Building2 size={14} />,
    '入口压力': <MapPin size={14} />,
    '活动影响': <Calendar size={14} />,
  };

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          <Brain size={16} />
          智能分析
        </Card.Title>
        <Badge 
          variant={
            explanation.overallPressure < 0.25 ? 'success' :
            explanation.overallPressure < 0.5 ? 'warning' :
            explanation.overallPressure < 0.75 ? 'danger' : 'critical'
          }
          pulse={explanation.overallPressure > 0.75}
        >
          主要原因：{explanation.primaryCause}
        </Badge>
      </Card.Header>
      <Card.Content className="space-y-4 overflow-y-auto max-h-[500px]">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-parking-border">
            <div className="text-xs text-slate-500 mb-1">当前压力</div>
            <div 
              className="text-2xl font-bold font-display"
              style={{ color: pressureToHexColor(explanation.overallPressure) }}
            >
              {Math.round(explanation.overallPressure * 100)}%
            </div>
            <div className="text-xs text-slate-400">{getPressureLabel(explanation.overallPressure)}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-parking-border">
            <div className="text-xs text-slate-500 mb-1">峰值压力</div>
            <div 
              className="text-2xl font-bold font-display"
              style={{ color: pressureToHexColor(peakPressure) }}
            >
              {Math.round(peakPressure * 100)}%
            </div>
            <div className="text-xs text-slate-400">{formatHour(peakHour)}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-parking-border">
            <div className="text-xs text-slate-500 mb-1">平均压力</div>
            <div 
              className="text-2xl font-bold font-display"
              style={{ color: pressureToHexColor(averagePressure) }}
            >
              {Math.round(averagePressure * 100)}%
            </div>
            <div className="text-xs text-slate-400">全天</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <TrendingUp size={14} />
            贡献因子分析
          </div>
          <div className="space-y-3">
            {factors.map((factor, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {factorIcons[factor.name] || <AlertCircle size={12} />}
                    </span>
                    <span className="text-slate-300">{factor.name}</span>
                    {index === 0 && (
                      <Badge variant="danger" size="sm">主导因素</Badge>
                    )}
                  </div>
                  <span 
                    className="font-mono font-bold"
                    style={{ color: pressureToHexColor(factor.value) }}
                  >
                    {Math.round(factor.value * 100)}%
                  </span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 relative"
                    style={{
                      width: `${factor.value * 100}%`,
                      backgroundColor: pressureToHexColor(factor.value),
                      boxShadow: `0 0 10px ${pressureToHexColor(factor.value)}80`,
                    }}
                  >
                    {index === 0 && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {causeChain.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
              <ArrowRight size={14} />
              因果链追踪
            </div>
            <div className="relative pl-4 border-l-2 border-cyan-500/30 space-y-3">
              {causeChain.map((step, index) => (
                <div key={index} className="relative">
                  <div 
                    className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-cyan-500 bg-slate-900"
                    style={{
                      boxShadow: index === causeChain.length - 1 
                        ? '0 0 10px #ef4444, 0 0 20px #ef444480' 
                        : '0 0 5px #00d4ff80',
                      backgroundColor: index === causeChain.length - 1 ? '#ef4444' : '#00d4ff',
                    }}
                  />
                  <div 
                    className={`text-sm px-3 py-2 rounded-lg ${
                      index === causeChain.length - 1 
                        ? 'bg-red-500/10 border border-red-500/30 text-red-300' 
                        : 'bg-slate-800/50 border border-slate-700 text-slate-300'
                    }`}
                  >
                    {step}
                  </div>
                  {index < causeChain.length - 1 && (
                    <div className="absolute -left-[18px] top-full w-0.5 h-3 bg-gradient-to-b from-cyan-500 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="text-sm font-medium text-cyan-300">
                AI 分析结论
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {explanation.naturalLanguageExplanation}
              </p>
            </div>
          </div>
        </div>

        {currentRecord.remarks && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-amber-400 mb-1">原始备注</div>
                <p className="text-xs text-amber-300/80">{currentRecord.remarks}</p>
              </div>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
