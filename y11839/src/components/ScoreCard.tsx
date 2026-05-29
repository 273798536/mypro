import { Shield, Coins, Trophy, Truck, AlertTriangle, XCircle } from 'lucide-react';
import type { TestResult } from '@/types';

interface ScoreCardProps {
  testResult: TestResult;
}

function scoreColor(score: number): string {
  if (score > 80) return 'text-green-400';
  if (score > 50) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBarColor(score: number): string {
  if (score > 80) return 'bg-green-500';
  if (score > 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function starRating(score: number): string {
  const full = Math.round(score / 20);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export default function ScoreCard({ testResult }: ScoreCardProps) {
  const rows = [
    { label: '结构完整性', score: testResult.structuralIntegrityScore, icon: Shield },
    { label: '预算效率', score: testResult.budgetEfficiencyScore, icon: Coins },
    { label: '总评', score: testResult.totalScore, icon: Trophy },
  ];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-5 font-mono">
      <h3 className="mb-4 text-center text-base font-bold tracking-wider text-slate-200">
        测试评分
      </h3>

      <div className="space-y-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="rounded border border-slate-700 bg-slate-800/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{row.label}</span>
                </div>
                <span className={`text-2xl font-bold ${scoreColor(row.score)}`}>
                  {row.score}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(row.score)}`}
                    style={{ width: `${row.score}%` }}
                  />
                </div>
                <span className={`text-xs ${scoreColor(row.score)}`}>
                  {starRating(row.score)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2 rounded border border-slate-700 bg-slate-800/30 p-3 text-xs">
        <div className="flex items-center gap-2">
          {testResult.vehicleCompleted ? (
            <>
              <Truck className="h-4 w-4 text-green-400" />
              <span className="text-green-400">车辆已成功通过</span>
            </>
          ) : (
            <>
              <Truck className="h-4 w-4 text-red-400" />
              <span className="text-red-400">车辆未能通过</span>
            </>
          )}
        </div>

        {testResult.overloadedMemberIds.length > 0 && (
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <span className="text-yellow-300">
              过载杆件：{testResult.overloadedMemberIds.join(', ')}
            </span>
          </div>
        )}

        {testResult.failedMemberIds.length > 0 && (
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span className="text-red-300">
              断裂杆件：{testResult.failedMemberIds.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
