import React, { useState } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RoundRecord, GameEvent } from '@/types/game';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { cn } from '@/lib/utils';

interface TimelineProps {
  history: RoundRecord[];
}

const EventItem: React.FC<{ event: GameEvent }> = ({ event }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border text-sm',
        getSeverityStyle(event.severity)
      )}
    >
      {getSeverityIcon(event.severity)}
      <span>{event.message}</span>
    </div>
  );
};

const RoundItem: React.FC<{ record: RoundRecord; isLast: boolean }> = ({ record, isLast }) => {
  const [expanded, setExpanded] = useState(isLast);

  const hasWarnings = record.events.some(e => e.severity !== 'info');

  return (
    <div className="relative">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
              hasWarnings ? 'bg-amber-500' : 'bg-blue-500'
            )}
          >
            {record.round}
          </div>
          {!isLast && <div className="w-0.5 h-full bg-slate-200 mt-2" />}
        </div>

        <div className="flex-1 pb-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-900">第 {record.round} 回合</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  record.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {record.netProfit >= 0 ? '+' : ''}¥{record.netProfit.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 pl-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500">汇率</span>
                  <p className="font-medium">{record.exchangeRate.toFixed(4)}</p>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500">期末现金</span>
                  <p className="font-medium">
                    ¥{record.endingCash.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {record.events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">关键事件</p>
                  {record.events.map((event, idx) => (
                    <EventItem key={idx} event={event} />
                  ))}
                </div>
              )}

              {record.cashFlow.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">现金流</p>
                  <div className="space-y-1">
                    {record.cashFlow.map((cf, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm p-2 bg-white rounded border border-slate-200"
                      >
                        <span className="text-slate-600">{cf.description}</span>
                        <span
                          className={cn(
                            'font-medium',
                            cf.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {cf.amount >= 0 ? '+' : ''}¥{cf.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ history }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          经营时间线 - 错因回放
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((record, index) => (
            <RoundItem
              key={record.round}
              record={record}
              isLast={index === history.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
