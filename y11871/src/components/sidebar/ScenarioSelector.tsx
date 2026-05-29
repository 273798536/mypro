import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Database, AlertTriangle, Building2, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { useParkingData } from '../../hooks/useParkingData';
import { getDemoScenarios } from '../../data/scenarios';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DemoScenario, ScenarioType } from '../../types/parking';

const scenarioIcons: Record<ScenarioType, React.ReactNode> = {
  smooth: <CheckCircle2 size={16} />,
  blocked: <AlertTriangle size={16} />,
  full: <Building2 size={16} />,
  event: <CalendarCheck size={16} />,
};

const scenarioColors: Record<ScenarioType, string> = {
  smooth: 'border-emerald-500/40 hover:border-emerald-400',
  blocked: 'border-red-500/40 hover:border-red-400',
  full: 'border-amber-500/40 hover:border-amber-400',
  event: 'border-purple-500/40 hover:border-purple-400',
};

const scenarioBadgeVariants: Record<ScenarioType, 'success' | 'danger' | 'warning' | 'info'> = {
  smooth: 'success',
  blocked: 'danger',
  full: 'warning',
  event: 'info',
};

const scenarioLabels: Record<ScenarioType, string> = {
  smooth: '顺利运行',
  blocked: '入口回堵',
  full: '楼层满位',
  event: '活动日',
};

interface ScenarioCardProps {
  scenario: DemoScenario;
  isActive: boolean;
  onLoad: () => void;
}

function ScenarioCard({ scenario, isActive, onLoad }: ScenarioCardProps) {
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 ${
        scenarioColors[scenario.type]
      } ${
        isActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''
      }`}
      onClick={onLoad}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`${
            scenario.type === 'smooth' ? 'text-emerald-400' :
            scenario.type === 'blocked' ? 'text-red-400' :
            scenario.type === 'full' ? 'text-amber-400' :
            'text-purple-400'
          }`}>
            {scenarioIcons[scenario.type]}
          </span>
          <span className="font-semibold text-slate-200">{scenario.name}</span>
        </div>
        <Badge variant={scenarioBadgeVariants[scenario.type]} size="sm">
          {scenarioLabels[scenario.type]}
        </Badge>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">
        {scenario.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Database size={12} />
          <span>{scenario.data.length} 条时序数据</span>
        </div>
        <Button size="sm" variant={isActive ? 'primary' : 'secondary'}>
          <Play size={12} />
          {isActive ? '当前场景' : '加载场景'}
        </Button>
      </div>
    </div>
  );
}

export function ScenarioSelector() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentScenario, loadScenario } = useParkingData();
  const scenarios = getDemoScenarios();

  return (
    <Card>
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Database size={16} className="text-cyan-400" />
          <span className="font-semibold text-cyan-300">演示场景</span>
          <Badge variant="info" size="sm">
            {scenarios.length} 个场景
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="text-xs text-slate-500 mb-2">
            选择一个预设场景开始分析。所有场景均包含脏数据以测试系统容错能力。
          </div>
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isActive={currentScenario?.id === scenario.id}
              onLoad={() => loadScenario(scenario)}
            />
          ))}
          
          <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400">
                <p className="font-medium text-cyan-300 mb-1">交付说明</p>
                <p>已为您准备好演示小数据：</p>
                <p className="mt-1">• <span className="text-emerald-400">顺利运行样例</span> - 正常工作日车流</p>
                <p>• <span className="text-red-400">入口回堵样例</span> - 东入口晚高峰回堵</p>
                <p className="mt-1 text-slate-500">点击卡片即可加载并查看智能解释。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
