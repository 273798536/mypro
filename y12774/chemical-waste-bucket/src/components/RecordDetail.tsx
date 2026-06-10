import type { ExperimentRecord } from '../types';
import { validateAllReagents, getValidationErrors } from '../utils/validation';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, FlaskConical, User, Calendar, Tag, MessageSquare, BarChart3, Calculator } from 'lucide-react';

interface Props {
  record: ExperimentRecord;
  onBack: () => void;
}

export default function RecordDetail({ record, onBack }: Props) {
  const errors = getValidationErrors(validateAllReagents(record.reagents));

  const statusConfig: Record<ExperimentRecord['status'], { bg: string; text: string; label: string }> = {
    '草稿': { bg: 'bg-gray-100', text: 'text-gray-700', label: '草稿' },
    '已提交': { bg: 'bg-blue-100', text: 'text-blue-700', label: '已提交' },
    '复核通过': { bg: 'bg-green-100', text: 'text-green-700', label: '复核通过' },
    '复核不通过': { bg: 'bg-red-100', text: 'text-red-700', label: '复核不通过' },
  };

  const hazardColors: Record<string, string> = {
    '低毒': 'bg-green-100 text-green-700',
    '中毒': 'bg-yellow-100 text-yellow-700',
    '高毒': 'bg-orange-100 text-orange-700',
    '剧毒': 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{record.experimentName}</h2>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[record.status].bg} ${statusConfig[record.status].text}`}>
          {statusConfig[record.status].label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar size={18} className="text-gray-500" />
          <span className="text-gray-500">实验日期：</span>
          <span>{record.experimentDate}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <User size={18} className="text-gray-500" />
          <span className="text-gray-500">实验人：</span>
          <span>{record.experimenter}</span>
        </div>
        {record.courseName && (
          <div className="flex items-center gap-2 text-gray-700">
            <FlaskConical size={18} className="text-gray-500" />
            <span className="text-gray-500">课程：</span>
            <span>{record.courseName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-700">
          <Tag size={18} className="text-gray-500" />
          <span className="text-gray-500">废液桶：</span>
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{record.bucketNumber}</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded">{record.wasteCategory}</span>
        </div>
      </div>

      {record.reviewedBy && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">复核人：</span>{record.reviewedBy}
            <span className="mx-2">|</span>
            <span className="font-medium">复核时间：</span>{record.reviewedAt?.split('T')[0]}
          </div>
          {record.reviewComment && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">复核意见：</span>{record.reviewComment}
            </div>
          )}
        </div>
      )}

      {record.hasAbnormalities && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h3 className="font-semibold text-red-800">异常记录留痕</h3>
            <span className="text-sm text-red-600">（共 {record.abnormalitySummary.length} 条）</span>
          </div>
          <ul className="space-y-1 ml-7">
            {record.abnormalitySummary.map((s, i) => (
              <li key={i} className="text-sm text-red-700 list-disc">{s}</li>
            ))}
          </ul>
          {errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <div className="text-sm font-medium text-red-800 mb-1">给学生的解释：</div>
              {errors.map((e, i) => (
                <div key={i} className="text-sm text-red-700 ml-4">
                  · {e.studentExplanation}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FlaskConical size={18} className="text-blue-600" />
          使用试剂
        </h3>
        <div className="space-y-3">
          {record.reagents.map(reagent => {
            const hasError = errors.some(e => e.reagentId === reagent.id);
            const reagentErrors = errors.filter(e => e.reagentId === reagent.id);
            return (
              <div key={reagent.id} className={`border rounded-lg p-4 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{reagent.name}</span>
                    <span className="text-gray-500 font-mono text-sm">{reagent.formula}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${hazardColors[reagent.hazardLevel]}`}>
                      {reagent.hazardLevel}
                    </span>
                    {hasError ? (
                      <span className="text-red-600 text-xs flex items-center gap-1">
                        <XCircle size={14} /> 浓度异常
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs flex items-center gap-1">
                        <CheckCircle size={14} /> 浓度正常
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700">
                    <span className="font-mono">{reagent.concentration}{reagent.concentrationUnit}</span>
                    <span className="mx-2 text-gray-400">×</span>
                    <span className="font-mono">{reagent.volume}{reagent.volumeUnit}</span>
                    {reagent.ph !== undefined && (
                      <>
                        <span className="mx-2 text-gray-400">|</span>
                        <span>pH {reagent.ph}</span>
                      </>
                    )}
                  </div>
                </div>
                {hasError && reagentErrors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-red-200 space-y-1">
                    {reagentErrors.map((e, i) => (
                      <div key={i} className="text-xs text-red-700">
                        <span className="font-medium">异常：</span>{e.message}
                      </div>
                    ))}
                    {reagentErrors.map((e, i) => (
                      <div key={`exp-${i}`} className="text-xs text-red-600 bg-red-100 rounded p-2 mt-1">
                        <span className="font-medium">解释：</span>{e.studentExplanation}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {record.balanceCalculations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Calculator size={18} className="text-purple-600" />
            化学方程式配平
          </h3>
          <div className="space-y-3">
            {record.balanceCalculations.map(bc => (
              <div key={bc.id} className={`border rounded-lg p-4 ${!bc.isBalanced ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{bc.equation}</code>
                  {bc.isBalanced ? (
                    <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={16} />已配平</span>
                  ) : (
                    <span className="text-orange-600 text-sm flex items-center gap-1"><AlertTriangle size={16} />未配平</span>
                  )}
                </div>
                {bc.note && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">备注（原话）：</span>{bc.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {record.spectrumData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart3 size={18} className="text-teal-600" />
            谱图数据
          </h3>
          <div className="space-y-3">
            {record.spectrumData.map(sd => (
              <div key={sd.id} className={`border rounded-lg p-4 ${sd.hasAbnormality ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{sd.dataType}</span>
                    {sd.isSupplement && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">补录数据</span>
                    )}
                    <span className="text-xs text-gray-500">{sd.measuredAt?.split('T')[0]}</span>
                  </div>
                  {sd.hasAbnormality ? (
                    <span className="text-orange-600 text-sm flex items-center gap-1"><AlertTriangle size={16} />存在异常</span>
                  ) : (
                    <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={16} />正常</span>
                  )}
                </div>
                {sd.hasAbnormality && sd.abnormalityNote && (
                  <div className="mt-2 text-sm text-orange-700 bg-orange-100 p-2 rounded">
                    <span className="font-medium">异常说明：</span>{sd.abnormalityNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {record.manualNotes.trim() && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquare size={18} className="text-amber-600" />
            人工备注
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-xs text-amber-700 mb-1">（原话保留，系统未做任何修改）</div>
            <p className="text-gray-800 whitespace-pre-wrap">{record.manualNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
