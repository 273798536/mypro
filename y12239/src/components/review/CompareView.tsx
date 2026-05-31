import { ArrowRight, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { GameSession, ScoreReport, ScoreItem } from '@/types';
import { generateReviewDetails } from '@/utils/export';
import { calculateTrigonometry } from '@/utils/geometry';
import { cn } from '@/lib/utils';

interface CompareViewProps {
  session: GameSession;
  originalReport?: ScoreReport;
}

const gradeColors: Record<string, string> = {
  A: 'bg-[#16C79A]',
  B: 'bg-[#0F3460]',
  C: 'bg-[#FFD93D]',
  D: 'bg-[#f59e0b]',
  F: 'bg-[#E94560]',
};

function ScoreItemCompare({
  oldItem,
  newItem,
}: {
  oldItem: ScoreItem;
  newItem: ScoreItem;
}) {
  const hasChanged = oldItem.score !== newItem.score;
  const isImproved = newItem.score > oldItem.score;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-3 border-b border-[#0F3460]/5 last:border-b-0">
      <div
        className={cn(
          'p-3 rounded-lg transition-all',
          hasChanged ? 'bg-[#E94560]/5 border border-[#E94560]/20' : 'bg-[#F5F7FA]'
        )}
      >
        <div className="text-xs text-[#2C3E50]/50 mb-1">{oldItem.categoryName}</div>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-xl font-bold font-orbitron',
              hasChanged ? 'text-[#E94560] line-through' : 'text-[#2C3E50]'
            )}
          >
            {oldItem.score}
          </span>
          <span className="text-sm text-[#2C3E50]/40">/ {oldItem.maxScore}</span>
        </div>
        {oldItem.errors.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-[#E94560]">
            <XCircle size={12} />
            <span>{oldItem.errors.length} 处错误</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        <ArrowRight
          size={16}
          className={cn(
            hasChanged ? (isImproved ? 'text-[#16C79A]' : 'text-[#FFD93D]') : 'text-[#2C3E50]/20'
          )}
        />
        {hasChanged && (
          <span
            className={cn(
              'text-xs font-bold mt-1',
              isImproved ? 'text-[#16C79A]' : 'text-[#E94560]'
            )}
          >
            {isImproved ? '+' : ''}
            {newItem.score - oldItem.score}
          </span>
        )}
      </div>

      <div
        className={cn(
          'p-3 rounded-lg transition-all',
          hasChanged
            ? isImproved
              ? 'bg-[#16C79A]/10 border border-[#16C79A]/30'
              : 'bg-[#FFD93D]/10 border border-[#FFD93D]/30'
            : 'bg-[#F5F7FA]'
        )}
      >
        <div className="text-xs text-[#2C3E50]/50 mb-1">{newItem.categoryName}</div>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-xl font-bold font-orbitron',
              hasChanged ? (isImproved ? 'text-[#16C79A]' : 'text-[#b8860b]') : 'text-[#2C3E50]'
            )}
          >
            {newItem.score}
          </span>
          <span className="text-sm text-[#2C3E50]/40">/ {newItem.maxScore}</span>
        </div>
        {newItem.errors.length > 0 && (
          <div className="mt-1">
            {newItem.errors.every((e) => e.corrected) ? (
              <div className="flex items-center gap-1 text-xs text-[#16C79A]">
                <CheckCircle size={12} />
                <span>全部已修正</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-[#f59e0b]">
                <AlertTriangle size={12} />
                <span>{newItem.errors.filter((e) => !e.corrected).length} 处待修正</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CompareView({ session, originalReport }: CompareViewProps) {
  const currentReport = session.scoreReport;
  const reviewDetails = generateReviewDetails(session);

  if (!currentReport) return null;

  const hasCorrections = session.corrections.length > 0;
  const oldReport = originalReport || currentReport;
  const scoreChanged = hasCorrections && originalReport && originalReport.totalScore !== currentReport.totalScore;
  const isImproved = scoreChanged && currentReport.totalScore > (originalReport?.totalScore ?? 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#0F3460]/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#16C79A]/10 rounded-lg">
          <TrendingUp size={20} className="text-[#16C79A]" />
        </div>
        <div>
          <h3 className="font-bold text-[#0F3460] text-lg">新旧结果对比</h3>
          <p className="text-sm text-[#2C3E50]/60">
            修正前后的成绩变化一目了然
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 mb-6">
        <div className="bg-[#F5F7FA] rounded-xl p-4 border-2 border-[#2C3E50]/10">
          <div className="text-xs font-semibold text-[#2C3E50]/50 uppercase tracking-wider mb-3 text-center">
            修正前
          </div>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold font-orbitron',
                gradeColors[oldReport.grade]
              )}
              style={{ color: 'white' }}
            >
              {oldReport.grade}
            </div>
            <div className="mt-3 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold font-['Orbitron'] text-[#2C3E50]">
                  {oldReport.totalScore}
                </span>
                <span className="text-sm text-[#2C3E50]/40">/ {oldReport.maxScore}</span>
              </div>
              <div className="text-xs text-[#2C3E50]/50 mt-1">
                得分率: {((oldReport.totalScore / oldReport.maxScore) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <ArrowRight
            size={24}
            className={cn(
              scoreChanged ? (isImproved ? 'text-[#16C79A]' : 'text-[#FFD93D]') : 'text-[#2C3E50]/20'
            )}
          />
          {scoreChanged && (
            <div
              className={cn(
                'mt-2 px-3 py-1 rounded-full text-sm font-bold',
                isImproved
                  ? 'bg-[#16C79A]/10 text-[#16C79A]'
                  : 'bg-[#FFD93D]/10 text-[#b8860b]'
              )}
            >
              {isImproved ? '+' : ''}
              {currentReport.totalScore - (originalReport?.totalScore ?? 0)} 分
            </div>
          )}
        </div>

        <div
          className={cn(
            'rounded-xl p-4 border-2 transition-all',
            hasCorrections
              ? 'bg-[#FFD93D]/5 border-[#FFD93D] shadow-lg shadow-[#FFD93D]/10'
              : 'bg-[#F5F7FA] border-[#2C3E50]/10'
          )}
        >
          <div className="text-xs font-semibold text-[#2C3E50]/50 uppercase tracking-wider mb-3 text-center">
            修正后
          </div>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold font-orbitron shadow-lg',
                gradeColors[currentReport.grade]
              )}
              style={{ color: 'white' }}
            >
              {currentReport.grade}
            </div>
            <div className="mt-3 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className={cn(
                    'text-2xl font-bold font-orbitron',
                    scoreChanged ? (isImproved ? 'text-[#16C79A]' : 'text-[#b8860b]') : 'text-[#2C3E50]'
                  )}
                >
                  {currentReport.totalScore}
                </span>
                <span className="text-sm text-[#2C3E50]/40">/ {currentReport.maxScore}</span>
              </div>
              <div className="text-xs text-[#2C3E50]/50 mt-1">
                得分率: {((currentReport.totalScore / currentReport.maxScore) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-semibold text-[#2C3E50] mb-3">分项得分对比</h4>
        <div className="space-y-1">
          {currentReport.scoreItems.map((newItem) => {
            const oldItem = originalReport?.scoreItems.find(
              (o) => o.category === newItem.category
            ) || newItem;
            return (
              <ScoreItemCompare
                key={newItem.id}
                oldItem={oldItem}
                newItem={newItem}
              />
            );
          })}
        </div>
      </div>

      {session.corrections.length > 0 && (
        <div>
          <h4 className="font-semibold text-[#2C3E50] mb-3">修正记录</h4>
          <div className="space-y-3">
            {session.corrections.map((correction) => {
              const op = session.operations.find((o) => o.id === correction.operationId);
              const point = op?.surveyPointId
                ? session.surveyPoints.find((p) => p.id === op.surveyPointId)
                : null;

              return (
                <div
                  key={correction.id}
                  className="bg-[#FFD93D]/5 border border-[#FFD93D]/30 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2C3E50]">
                      {point?.name || '未知点'} - {correction.field === 'angle' ? '角度' : '单位'}修正
                    </span>
                    <span className="text-xs text-[#2C3E50]/50">
                      {new Date(correction.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[#E94560] line-through font-mono">
                      {correction.oldValue}
                      {correction.field === 'angle' ? '°' : ''}
                    </span>
                    <ArrowRight size={14} className="text-[#16C79A]" />
                    <span className="text-[#16C79A] font-bold font-mono">
                      {correction.newValue}
                      {correction.field === 'angle' ? '°' : ''}
                    </span>
                  </div>
                  {correction.remark && (
                    <div className="mt-2 text-xs text-[#2C3E50]/60 bg-white/50 rounded p-2">
                      备注: {correction.remark}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-[#2C3E50]/50">
                    修正老师: {correction.teacherName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reviewDetails.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-[#2C3E50] mb-3">三角函数计算对比</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#0F3460]/10">
                  <th className="text-left py-2 px-3 text-[#2C3E50]/60 font-medium">测绘点</th>
                  <th className="text-center py-2 px-3 text-[#2C3E50]/60 font-medium">角度</th>
                  <th className="text-center py-2 px-3 text-[#0F3460] font-medium">sin</th>
                  <th className="text-center py-2 px-3 text-[#16C79A] font-medium">cos</th>
                  <th className="text-center py-2 px-3 text-[#E94560] font-medium">tan</th>
                </tr>
              </thead>
              <tbody>
                {reviewDetails.map((row) => {
                  const hasCorrection = session.corrections.some(
                    (c) =>
                      c.operationId &&
                      session.operations.find(
                        (op) => op.id === c.operationId && op.surveyPointId === row.surveyPointId
                      )
                  );
                  const correction = hasCorrection
                    ? session.corrections.find(
                        (c) =>
                          c.operationId &&
                          session.operations.find(
                            (op) =>
                              op.id === c.operationId && op.surveyPointId === row.surveyPointId
                          )
                      )
                    : null;

                  const oldAngle = correction ? (correction.oldValue as number) : null;
                  const oldTrig = oldAngle !== null ? calculateTrigonometry(oldAngle) : null;
                  const angleChanged = oldTrig !== null && oldTrig.sin !== row.sin;

                  return (
                    <tr
                      key={row.surveyPointId}
                      className={cn(
                        'border-b border-[#0F3460]/5',
                        hasCorrection && 'bg-[#FFD93D]/5'
                      )}
                    >
                      <td className="py-2 px-3 font-medium text-[#2C3E50]">{row.surveyPointName}</td>
                      <td className="py-2 px-3 text-center">
                        {angleChanged ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-[#E94560] line-through text-xs">
                              {
                                session.corrections.find(
                                  (c) =>
                                    c.operationId &&
                                    session.operations.find(
                                      (op) =>
                                        op.id === c.operationId && op.surveyPointId === row.surveyPointId
                                    )
                                )?.oldValue
                              }
                              °
                            </span>
                            <span className="text-[#16C79A] font-bold">{row.angleValue}°</span>
                          </div>
                        ) : (
                          <span>{row.angleValue}°</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[#0F3460]">{row.sin.toFixed(4)}</td>
                      <td className="py-2 px-3 text-center font-mono text-[#16C79A]">{row.cos.toFixed(4)}</td>
                      <td className="py-2 px-3 text-center font-mono text-[#E94560]">{row.tan.toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
