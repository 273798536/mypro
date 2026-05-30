import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { UserX, Clock, AlertTriangle, AlertCircle, Lightbulb, ChevronDown, ChevronUp, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalyType, AnomalyRecord } from '@/types';

type TabType = 'noShow' | 'abnormalDuration' | 'temporaryClose';

const tabConfig: Record<TabType, {
  label: string;
  icon: typeof UserX;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  noShow: {
    label: '预约爽约',
    icon: UserX,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: '分析预约后未按时到访的情况及其影响'
  },
  abnormalDuration: {
    label: '服务时长异常',
    icon: Clock,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: '分析服务时长异常过长或过短的情况'
  },
  temporaryClose: {
    label: '窗口临停',
    icon: AlertTriangle,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: '分析窗口临时关闭对排队的影响'
  }
};

export default function AnomalyAnalysis() {
  const [activeTab, setActiveTab] = useState<TabType>('noShow');
  const { anomalies, visits, windows, experiments } = useStore();

  const filteredAnomalies = anomalies.filter(a => a.type === activeTab);

  const noShowCount = visits.filter(v => v.status === 'noShow').length;
  const noShowRate = visits.length > 0 ? (noShowCount / visits.length * 100).toFixed(1) : '0';

  const durations = visits.map(v => v.serviceDuration).filter(d => d > 0);
  const avgDuration = durations.length > 0 
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    : '0';
  const abnormalCount = anomalies.filter(a => a.type === 'abnormalDuration')
    .reduce((sum, a) => sum + a.impact.affectedCount, 0);

  const closedWindows = windows.filter(w => w.isTemporaryClosed).length;
  const totalWindows = new Set(windows.map(w => w.windowNo)).size;

  function getExperimentName(experimentId: string) {
    return experiments.find(e => e.id === experimentId)?.name || '未知实验';
  }

  const stats = {
    noShow: {
      count: noShowCount,
      rate: noShowRate,
      extraTime: anomalies.filter(a => a.type === 'noShow')
        .reduce((sum, a) => sum + a.impact.extraWaitTime, 0).toFixed(1)
    },
    abnormalDuration: {
      count: abnormalCount,
      rate: durations.length > 0 ? (abnormalCount / durations.length * 100).toFixed(1) : '0',
      extraTime: anomalies.filter(a => a.type === 'abnormalDuration')
        .reduce((sum, a) => sum + a.impact.extraWaitTime, 0).toFixed(1)
    },
    temporaryClose: {
      count: closedWindows,
      rate: totalWindows > 0 ? (closedWindows / totalWindows * 100).toFixed(0) : '0',
      extraTime: anomalies.filter(a => a.type === 'temporaryClose')
        .reduce((sum, a) => sum + a.impact.extraWaitTime, 0).toFixed(1)
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">异常场景分析</h2>
        <p className="text-sm text-slate-500 mt-1">深入分析预约爽约、服务时长异常、窗口临停等业务痛点</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(tabConfig) as TabType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all',
              activeTab === type
                ? cn(tabConfig[type].bgColor, tabConfig[type].borderColor, 'shadow-lg')
                : 'bg-white border-slate-200 hover:border-slate-300'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'p-3 rounded-xl',
                activeTab === type ? cn(tabConfig[type].bgColor, tabConfig[type].borderColor, 'border') : 'bg-slate-100'
              )}>
                {(() => {
                  const IconComponent = tabConfig[type].icon;
                  return <IconComponent className={cn(
                    'w-6 h-6',
                    activeTab === type ? tabConfig[type].color : 'text-slate-500'
                  )} />;
                })()}
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  'font-semibold',
                  activeTab === type ? tabConfig[type].color : 'text-slate-800'
                )}>
                  {tabConfig[type].label}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{tabConfig[type].description}</p>
                <div className="mt-3 flex items-end gap-3">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{stats[type].count}</div>
                    <div className="text-xs text-slate-500">异常数量</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-700">{stats[type].rate}%</div>
                    <div className="text-xs text-slate-500">占比</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-amber-600">+{stats[type].extraTime}分钟</div>
                    <div className="text-xs text-slate-500">额外等待</div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredAnomalies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无相关异常分析</h3>
              <p className="text-slate-500">请先运行实验方案以生成异常分析结果</p>
            </div>
          ) : (
            filteredAnomalies.map((anomaly, i) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={anomaly}
                index={i}
                experimentName={getExperimentName(anomaly.experimentId)}
                config={tabConfig[activeTab]}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className={cn(
            'rounded-xl border-2 p-5',
            tabConfig[activeTab].bgColor,
            tabConfig[activeTab].borderColor
          )}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className={cn('w-5 h-5', tabConfig[activeTab].color)} />
              <h3 className={cn('font-semibold', tabConfig[activeTab].color)}>
                {tabConfig[activeTab].label}说明
              </h3>
            </div>
            {activeTab === 'noShow' && (
              <div className="text-sm text-slate-600 space-y-2">
                <p>预约爽约是指用户成功预约后未按时到访，也未提前取消的情况。</p>
                <p>爽约会导致号源浪费，增加其他用户的等待时间，降低窗口利用率。</p>
                <p>建议通过短信提醒、爽约黑名单等机制减少爽约率。</p>
              </div>
            )}
            {activeTab === 'abnormalDuration' && (
              <div className="text-sm text-slate-600 space-y-2">
                <p>服务时长异常包括办理时间显著超过或低于平均水平的情况。</p>
                <p>时长过长可能由于材料不齐、业务复杂或人员不熟练导致。</p>
                <p>时长过短可能由于预审不通过、业务简单或记录误差导致。</p>
              </div>
            )}
            {activeTab === 'temporaryClose' && (
              <div className="text-sm text-slate-600 space-y-2">
                <p>窗口临时关闭指在服务时段内窗口暂停服务的情况。</p>
                <p>常见原因包括人员休息、设备故障、紧急会议或人员调配。</p>
                <p>临停会导致队列堆积，增加用户等待时间，影响服务体验。</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">相关数据概览</h3>
            </div>
            <div className="space-y-3">
              {activeTab === 'noShow' && visits.filter(v => v.status === 'noShow').map((visit, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{visit.visitorId}</div>
                    <div className="text-xs text-slate-500">
                      预约 {visit.appointmentTime?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-700 rounded-full">
                    爽约
                  </span>
                </div>
              ))}
              {activeTab === 'abnormalDuration' && visits.filter(v => v.notes?.includes('服务时长')).map((visit, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{visit.visitorId}</div>
                    <div className="text-xs text-slate-500">{visit.notes}</div>
                  </div>
                  <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    {visit.serviceDuration}分钟
                  </span>
                </div>
              ))}
              {activeTab === 'temporaryClose' && windows.filter(w => w.isTemporaryClosed).map((window, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-slate-800">窗口 {window.windowNo}</div>
                    <div className="text-xs text-slate-500">
                      {window.closeStartTime?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) || '-'}
                      {' - '}
                      {window.closeEndTime?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) || '-'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    临停
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnomalyCard({
  anomaly,
  index,
  experimentName,
  config
}: {
  anomaly: AnomalyRecord;
  index: number;
  experimentName: string;
  config: typeof tabConfig[keyof typeof tabConfig];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border overflow-hidden transition-all',
      expanded ? 'border-slate-300 shadow-md' : 'border-slate-200'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-start justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            config.bgColor,
            config.borderColor,
            'border'
          )}>
            <span className="text-lg font-bold text-slate-700">{index + 1}</span>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">{anomaly.description}</h4>
            <p className="text-sm text-slate-500 mt-1">关联实验：{experimentName}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-slate-600">
                  额外等待 <span className="font-semibold text-amber-600">{anomaly.impact.extraWaitTime} 分钟</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-slate-600">
                  影响 <span className="font-semibold text-blue-600">{anomaly.impact.affectedCount} 人</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-full',
            config.bgColor,
            config.color,
            config.borderColor,
            'border'
          )}>
            {config.label}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h5 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                可能原因
              </h5>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {anomaly.rootCause}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <h5 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-green-500" />
                应对建议
              </h5>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {anomaly.suggestion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
