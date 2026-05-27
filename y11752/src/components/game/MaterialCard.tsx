import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Receipt, Image, FileCheck, MessageSquare, ClipboardList, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Material, RiskType } from '@/types/game';
import { getMaterialTypeName, getRiskTypeName } from '@/utils/gameEngine';

interface MaterialCardProps {
  material: Material;
  isSelected: boolean;
  markedRisk: RiskType;
  onSelect: () => void;
  onMarkRisk: (riskType: RiskType) => void;
  onUnmarkRisk: () => void;
  showAnswer?: boolean;
  isCorrect?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  claim: <FileText className="w-6 h-6" />,
  invoice: <Receipt className="w-6 h-6" />,
  photo: <Image className="w-6 h-6" />,
  policy: <FileCheck className="w-6 h-6" />,
  emotion: <MessageSquare className="w-6 h-6" />,
  report: <ClipboardList className="w-6 h-6" />
};

const typeColors: Record<string, string> = {
  claim: 'bg-blue-100 text-blue-600',
  invoice: 'bg-green-100 text-green-600',
  photo: 'bg-purple-100 text-purple-600',
  policy: 'bg-amber-100 text-amber-600',
  emotion: 'bg-pink-100 text-pink-600',
  report: 'bg-slate-100 text-slate-600'
};

const riskColors: Record<string, string> = {
  duplicate: 'border-red-500 bg-red-50',
  exemption: 'border-orange-500 bg-orange-50',
  timeout: 'border-amber-500 bg-amber-50',
  missing: 'border-purple-500 bg-purple-50'
};

export const MaterialCard = ({
  material,
  isSelected,
  markedRisk,
  onSelect,
  onMarkRisk,
  onUnmarkRisk,
  showAnswer = false,
  isCorrect
}: MaterialCardProps) => {
  const [showDetail, setShowDetail] = useState(false);

  const riskTypeOptions: { value: RiskType; label: string }[] = [
    { value: 'duplicate', label: '票据重复' },
    { value: 'exemption', label: '保单免责' },
    { value: 'timeout', label: '补料超时' },
    { value: 'missing', label: '材料缺失' }
  ];

  return (
    <>
      <motion.div
        className={cn(
          'relative p-4 rounded-xl cursor-pointer transition-all duration-300 border-2',
          markedRisk ? riskColors[markedRisk] : 'border-transparent bg-white',
          isSelected ? 'ring-2 ring-amber-500 shadow-lg scale-105' : 'shadow-md hover:shadow-lg hover:scale-[1.02]',
          showAnswer && isCorrect === true && 'ring-2 ring-green-500',
          showAnswer && isCorrect === false && 'ring-2 ring-red-500'
        )}
        whileHover={{ y: -4 }}
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', typeColors[material.type])}>
            {typeIcons[material.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-500">
                {getMaterialTypeName(material.type)}
              </span>
              {!material.isComplete && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                  不完整
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 truncate">{material.title}</h3>
            <p className="text-xs text-slate-500 mt-1">来源: {material.source}</p>
          </div>
        </div>

        {markedRisk && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span>已标记: {getRiskTypeName(markedRisk)}</span>
          </div>
        )}

        {showAnswer && (
          <div className={cn(
            'mt-3 flex items-center gap-2 text-sm font-medium',
            isCorrect ? 'text-green-600' : 'text-red-600'
          )}>
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>判断正确</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>判断错误</span>
              </>
            )}
          </div>
        )}

        {material.relatedMaterialIds && material.relatedMaterialIds.length > 0 && (
          <div className="absolute top-2 right-2">
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
              关联材料
            </span>
          </div>
        )}
      </motion.div>

      {showDetail && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && setShowDetail(false)}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className={cn('p-6 border-b', typeColors[material.type])}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/80 rounded-lg">
                    {typeIcons[material.type]}
                  </div>
                  <div>
                    <span className="text-sm font-medium opacity-70">
                      {getMaterialTypeName(material.type)}
                    </span>
                    <h2 className="text-xl font-bold">{material.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="mb-4">
                <span className="text-sm font-medium text-slate-500">材料来源</span>
                <p className="text-slate-700">{material.source}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-500">材料内容</span>
                <div className="mt-2 p-4 bg-slate-50 rounded-lg font-mono text-sm whitespace-pre-wrap text-slate-700">
                  {material.content}
                </div>
              </div>
              {material.hasRisk && material.riskDescription && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>风险提示: {getRiskTypeName(material.riskType || null)}</span>
                  </div>
                  <p className="text-red-600 text-sm">{material.riskDescription}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50">
              {!showAnswer ? (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">标记风险类型:</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {riskTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (markedRisk === option.value) {
                            onUnmarkRisk();
                          } else {
                            onMarkRisk(option.value);
                          }
                        }}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          markedRisk === option.value
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-slate-700 border border-slate-300 hover:border-red-400 hover:text-red-600'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnmarkRisk();
                      }}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        !markedRisk
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-300 hover:border-green-400 hover:text-green-600'
                      )}
                    >
                      无风险
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className={cn(
                    'text-lg font-bold',
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  )}>
                    {isCorrect ? '✓ 您的判断正确!' : '✗ 您的判断有误'}
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
