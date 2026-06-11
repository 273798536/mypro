import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info,
  Edit3,
  Save,
  User,
  Clock,
  Target,
  Dna,
  Zap,
} from 'lucide-react';
import type { Mutation } from '../../types';
import { MUTATION_TYPE_LABELS, FUNCTIONAL_IMPACT_LABELS } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface MutationDetailPanelProps {
  mutation: Mutation | null;
  onClose: () => void;
  onAnnotate: (mutationId: string, annotation: string) => void;
}

const mutationTypeColors: Record<string, string> = {
  missense: 'bg-orange-100 text-orange-700 border-orange-200',
  nonsense: 'bg-red-100 text-red-700 border-red-200',
  synonymous: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  frameshift: 'bg-purple-100 text-purple-700 border-purple-200',
  splice: 'bg-blue-100 text-blue-700 border-blue-200',
};

const functionalImpactColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const mutationTypeShapes: Record<string, string> = {
  missense: '🔶 球体',
  nonsense: '🔴 八面体',
  synonymous: '🟩 立方体',
  frameshift: '🟣 星形',
  splice: '🔵 菱形',
};

export default function MutationDetailPanel({ mutation, onClose, onAnnotate }: MutationDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [annotation, setAnnotation] = useState(mutation?.annotation || '');

  if (!mutation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Dna className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-sm font-medium">请选择一个突变位点</p>
        <p className="text-xs text-gray-400 mt-1 text-center">
          点击3D视图中的彩色标记<br />或从下方列表中选择
        </p>
      </div>
    );
  }

  const handleSave = () => {
    onAnnotate(mutation.id, annotation);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-start justify-between p-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-xs text-gray-500">{mutation.id}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{mutation.gene}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mutation.exon} · 第{mutation.residueNumber}位残基
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-[2px] transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={`p-3 rounded-[2px] border ${mutationTypeColors[mutation.type]}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">突变类型</span>
            <Badge variant={mutation.type === 'nonsense' ? 'danger' : mutation.type === 'missense' ? 'warning' : 'success'} size="sm">
              {MUTATION_TYPE_LABELS[mutation.type]}
            </Badge>
          </div>
          <p className="text-sm font-medium">{mutationTypeShapes[mutation.type]}</p>
          <p className="text-xs mt-1 opacity-80">
            3D视图中以此形状标识该类突变，避免仅靠颜色区分
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-[2px] p-3">
            <p className="text-xs text-gray-500 mb-1">核苷酸变化</p>
            <p className="font-mono text-sm font-bold text-gray-900">{mutation.hgvsC}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">c.DNA水平</p>
          </div>
          <div className="bg-gray-50 rounded-[2px] p-3">
            <p className="text-xs text-gray-500 mb-1">氨基酸变化</p>
            <p className="font-mono text-sm font-bold text-gray-900">{mutation.hgvsP}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">蛋白质水平</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-900">功能影响预测</span>
          </div>
          <div className={`p-3 rounded-[2px] ${functionalImpactColors[mutation.functionalImpact]}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">影响等级</span>
              <span className="font-bold">{FUNCTIONAL_IMPACT_LABELS[mutation.functionalImpact]}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>置信度</span>
                <span>{(mutation.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mutation.confidence * 100}%` }}
                  className="h-full bg-current rounded-full"
                />
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-[2px] border border-blue-100">
            <Info className="w-3 h-3 inline mr-1 text-blue-500" />
            {mutation.functionalImpact === 'high' && (
              <span>该突变导致蛋白提前终止，极有可能造成功能丧失。建议优先验证。</span>
            )}
            {mutation.functionalImpact === 'medium' && (
              <span>该突变改变了氨基酸的理化性质，可能影响蛋白结构或功能。建议进行功能验证。</span>
            )}
            {mutation.functionalImpact === 'low' && (
              <span>该突变未改变氨基酸序列，通常不影响蛋白功能。但需注意是否影响剪接或表达。</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">文献证据</span>
          </div>
          <div className="space-y-2">
            {mutation.references.map((ref, index) => (
              <div key={index} className="bg-gray-50 rounded-[2px] p-3 text-xs">
                <p className="text-gray-700">{ref}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">标注备注</span>
            </div>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                编辑
              </Button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                placeholder="输入您的标注备注，如：该突变在F2代中与高蛋白表型共分离..."
                className="w-full h-24 p-3 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => { setIsEditing(false); setAnnotation(mutation.annotation || ''); }}>
                  取消
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-3 h-3 mr-1" />
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-[2px] p-3 min-h-[60px]">
              {mutation.annotation ? (
                <>
                  <p className="text-sm text-gray-700">{mutation.annotation}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {mutation.annotatedBy}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">暂无标注，点击编辑添加备注</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#0F2B4A] text-white rounded-[2px] p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">3D坐标信息</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-400">X</p>
              <p className="font-mono text-sm">{mutation.position3d.x.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Y</p>
              <p className="font-mono text-sm">{mutation.position3d.y.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Z</p>
              <p className="font-mono text-sm">{mutation.position3d.z.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
