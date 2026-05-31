import { useState } from 'react';
import { FileText, MapPin, Ruler, Scale, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { GameSession } from '@/types';
import { generateReviewDetails } from '@/utils/export';
import { getErrorTypeLabel, getErrorCategoryLabel } from '@/utils/scoring';
import { cn } from '@/lib/utils';

interface ReviewDetailsProps {
  session: GameSession;
}

export function ReviewDetails({ session }: ReviewDetailsProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const reviewDetails = generateReviewDetails(session);

  const scoreColors: Record<string, string> = {
    survey: 'text-[#0F3460]',
    angle: 'text-[#16C79A]',
    path: 'text-[#b8860b]',
    unit: 'text-[#E94560]',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#0F3460]/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#0F3460]/10 rounded-lg">
          <FileText size={20} className="text-[#0F3460]" />
        </div>
        <div>
          <h3 className="font-bold text-[#0F3460] text-lg">复核详情</h3>
          <p className="text-sm text-[#2C3E50]/60">
            测绘点、角度尺和成绩的完整对应关系
          </p>
        </div>
      </div>

      {reviewDetails.length === 0 ? (
        <div className="text-center py-12 text-[#2C3E50]/50">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">暂无复核数据</p>
          <p className="text-sm">完成测绘任务后将显示详细复核信息</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F7FA]">
                <th className="text-left py-3 px-4 text-[#2C3E50]/60 font-medium rounded-tl-lg">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    测绘点
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-[#2C3E50]/60 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <Ruler size={14} />
                    角度尺
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-[#2C3E50]/60 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <Scale size={14} />
                    距离
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-mono text-[#0F3460] font-medium">sin</th>
                <th className="text-center py-3 px-4 font-mono text-[#16C79A] font-medium">cos</th>
                <th className="text-center py-3 px-4 font-mono text-[#E94560] font-medium">tan</th>
                <th className="text-center py-3 px-4 text-[#2C3E50]/60 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp size={14} />
                    得分
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-[#2C3E50]/60 font-medium rounded-tr-lg">
                  错误/规则
                </th>
              </tr>
            </thead>
            <tbody>
              {reviewDetails.map((row, index) => {
                const isSelected = selectedRowId === row.surveyPointId;
                const hasErrors = row.errors.length > 0;
                const isPerfect = row.score >= row.maxScore * 0.9;

                return (
                  <>
                    <tr
                      key={row.surveyPointId}
                      onClick={() => setSelectedRowId(isSelected ? null : row.surveyPointId)}
                      className={cn(
                        'border-b border-[#0F3460]/5 cursor-pointer transition-all duration-200',
                        isSelected && 'bg-[#0F3460]/5',
                        index % 2 === 0 && !isSelected && 'bg-white',
                        index % 2 === 1 && !isSelected && 'bg-[#F5F7FA]/30',
                        'hover:bg-[#0F3460]/5'
                      )}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                              isPerfect ? 'bg-[#16C79A]' : hasErrors ? 'bg-[#E94560]' : 'bg-[#0F3460]'
                            )}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-[#2C3E50]">{row.surveyPointName}</div>
                            <div className="text-xs text-[#2C3E50]/40 font-mono">{row.surveyPointId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-mono font-bold text-[#16C79A]">
                          {row.angleValue}
                          <span className="text-xs text-[#2C3E50]/40 ml-1">{row.angleUnit}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div
                          className={cn(
                            'font-mono font-bold',
                            row.distanceUnit === 'm' ? 'text-[#0F3460]' : 'text-[#E94560]'
                          )}
                        >
                          {row.distanceValue}
                          <span className="text-xs text-[#2C3E50]/40 ml-1">{row.distanceUnit}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-[#0F3460]">{row.sin.toFixed(4)}</td>
                      <td className="py-4 px-4 text-center font-mono text-[#16C79A]">{row.cos.toFixed(4)}</td>
                      <td className="py-4 px-4 text-center font-mono text-[#E94560]">{row.tan.toFixed(4)}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={cn(
                              'font-bold font-orbitron',
                              isPerfect ? 'text-[#16C79A]' : hasErrors ? 'text-[#E94560]' : 'text-[#0F3460]'
                            )}
                          >
                            {row.score.toFixed(1)}
                          </span>
                          <span className="text-xs text-[#2C3E50]/40">/ {row.maxScore.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {hasErrors ? (
                          <div className="flex items-center justify-center gap-1">
                            <AlertCircle size={14} className="text-[#E94560]" />
                            <span className="text-xs text-[#E94560] font-medium">
                              {row.errors.length} 项
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle size={14} className="text-[#16C79A]" />
                            <span className="text-xs text-[#16C79A] font-medium">无错误</span>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isSelected && hasErrors && (
                      <tr className="bg-[#E94560]/5">
                        <td colSpan={8} className="py-3 px-4">
                          <div className="space-y-2">
                            {row.errors.map((error, i) => {
                              const err = session.scoreReport?.scoreItems
                                .flatMap((item) => item.errors)
                                .find(
                                  (e) =>
                                    e.operationId &&
                                    session.operations.find(
                                      (op) =>
                                        op.id === e.operationId && op.surveyPointId === row.surveyPointId
                                    ) &&
                                    getErrorTypeLabel(e.type) === error
                                );

                              return (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 bg-white rounded-lg p-3 border border-[#E94560]/20"
                                >
                                  <AlertCircle size={14} className="text-[#E94560] mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-[#E94560]">
                                        {error}
                                      </span>
                                      <span className="text-xs bg-[#0F3460]/10 text-[#0F3460] px-2 py-0.5 rounded-full">
                                        {getErrorCategoryLabel(err?.category || 'triangle_calculation')}
                                      </span>
                                      {err?.ruleReference && (
                                        <span className="text-xs font-mono text-[#2C3E50]/50">
                                          规则: {err.ruleReference}
                                        </span>
                                      )}
                                    </div>
                                    {err?.ruleDescription && (
                                      <p className="text-xs text-[#2C3E50]/70">{err.ruleDescription}</p>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-[#E94560]">
                                    -{err?.pointsDeducted || 0}分
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    {isSelected && !hasErrors && (
                      <tr className="bg-[#16C79A]/5">
                        <td colSpan={8} className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2 text-[#16C79A]">
                            <CheckCircle size={16} />
                            <span className="font-medium">该测绘点所有操作均符合规则要求</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {session.scoreReport && (
        <div className="mt-6 pt-6 border-t border-[#0F3460]/10">
          <h4 className="font-semibold text-[#2C3E50] mb-4">评分规则参考</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {session.scoreReport.scoreItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#F5F7FA] rounded-lg p-3"
              >
                <div className={cn('text-xs font-medium mb-2', scoreColors[item.category])}>
                  {item.categoryName}
                </div>
                <div className="text-xs text-[#2C3E50]/60 space-y-1">
                  <div>满分: {item.maxScore}分</div>
                  <div className="font-mono">规则: {item.ruleReference}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
