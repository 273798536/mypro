import { useState } from 'react';
import { ArrowRight, Link, Unlink, Lock, Unlock, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card } from '@/components/common/Card';
import { FieldMapping } from '@/types/experiment';
import { TARGET_FIELDS } from '@/constants/fieldMapping';

interface FieldMappingEditorProps {
  mappings: FieldMapping[];
  headers?: string[];
  onUpdateMapping: (mappingId: string, targetField: string) => void;
  onLockMapping: (mappingId: string) => void;
  onAutoMatch?: () => void;
  sampleData?: Record<string, any>;
}

export const FieldMappingEditor = ({
  mappings,
  headers,
  onUpdateMapping,
  onLockMapping,
  onAutoMatch,
  sampleData,
}: FieldMappingEditorProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const getUsedTargets = () => {
    return new Set(mappings.filter(m => m.targetFieldName).map(m => m.targetFieldName));
  };
  
  const autoCount = mappings.filter(m => m.fieldSource === 'auto-detected').length;
  const manualCount = mappings.filter(m => m.fieldSource === 'manual-mapped').length;
  const pendingCount = mappings.filter(m => m.processStatus === 'pending').length;
  const highConfidence = mappings.filter(m => m.matchConfidence >= 0.8).length;
  
  return (
    <Card
      title="字段映射配置"
      subtitle="系统已自动识别字段映射，可手动调整"
      icon={<Link className="w-5 h-5" />}
      headerRight={
        <div className="flex items-center gap-2">
          <StatusBadge status="success" size="sm">
            自动匹配 {autoCount}/{mappings.length}
          </StatusBadge>
          {pendingCount > 0 && (
            <StatusBadge status="warning" size="sm">
              待配置 {pendingCount}
            </StatusBadge>
          )}
        </div>
      }
    >
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">智能字段识别</p>
            <p className="mt-0.5">
              已自动识别 {highConfidence} 个高置信度字段（置信度≥80%），
              {manualCount > 0 ? `其中 ${manualCount} 个为手动调整` : '全部自动匹配'}。
              点击字段行可展开修改映射关系。
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-2 mb-3 px-3 py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-500">
        <div className="col-span-4">原始字段（来源文件）</div>
        <div className="col-span-1 text-center">映射</div>
        <div className="col-span-4">目标字段（系统）</div>
        <div className="col-span-3 text-right">状态/操作</div>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        <AnimatePresence>
          {mappings.map((mapping) => {
            const isExpanded = expandedId === mapping.id;
            const usedTargets = getUsedTargets();
            const availableTargets = TARGET_FIELDS.filter(
              f => !usedTargets.has(f.key) || f.key === mapping.targetFieldName
            );
            const hasAnomaly = mapping.targetFieldName && 
              ['liftCoefficient', 'dragCoefficient', 'pressureCoefficient'].includes(mapping.targetFieldName);
            
            return (
              <motion.div
                key={mapping.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'border rounded-lg overflow-hidden transition-all',
                  mapping.processStatus === 'pending' ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200',
                  mapping.processStatus === 'locked' ? 'border-green-300 bg-green-50/30' : '',
                  isExpanded ? 'border-[#0F3460] ring-2 ring-[#0F3460]/20' : ''
                )}
              >
                <div
                  className="grid grid-cols-12 gap-2 px-3 py-3 items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : mapping.id)}
                >
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{mapping.sourceFieldName}</span>
                      {hasAnomaly && (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className={cn(
                      'w-4 h-4 transition-colors',
                      mapping.targetFieldName ? 'text-[#16C79A]' : 'text-gray-300'
                    )} />
                  </div>
                  
                  <div className="col-span-4">
                    {mapping.targetFieldName ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0F3460]">
                          {TARGET_FIELDS.find(f => f.key === mapping.targetFieldName)?.label || mapping.targetFieldName}
                        </span>
                        {TARGET_FIELDS.find(f => f.key === mapping.targetFieldName)?.required && (
                          <span className="text-xs text-red-500">*必填</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">未映射</span>
                    )}
                  </div>
                  
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <StatusBadge
                      status={mapping.matchConfidence >= 0.8 ? 'success' : mapping.matchConfidence >= 0.5 ? 'warning' : 'error'}
                      size="sm"
                    >
                      {(mapping.matchConfidence * 100).toFixed(0)}%
                    </StatusBadge>
                    <StatusBadge
                      status={mapping.fieldSource === 'auto-detected' ? 'info' : 'warning'}
                      size="sm"
                      showIcon={false}
                    >
                      {mapping.fieldSource === 'auto-detected' ? '自动' : '手动'}
                    </StatusBadge>
                    {mapping.processStatus === 'locked' ? (
                      <Lock className="w-4 h-4 text-green-500" />
                    ) : mapping.processStatus === 'pending' ? (
                      <Unlink className="w-4 h-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-100 px-3 py-4 bg-gray-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          目标字段
                        </label>
                        <select
                          value={mapping.targetFieldName}
                          onChange={(e) => onUpdateMapping(mapping.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none"
                        >
                          <option value="">-- 请选择目标字段 --</option>
                          {availableTargets.map(field => (
                            <option key={field.key} value={field.key}>
                              {field.label} {field.required ? '(必填)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          字段来源信息
                        </label>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-gray-500">来源：</span>
                            <span className="text-gray-900">{mapping.sourceFieldName}</span>
                          </p>
                          <p>
                            <span className="text-gray-500">匹配置信度：</span>
                            <span className={mapping.matchConfidence >= 0.8 ? 'text-green-600' : mapping.matchConfidence >= 0.5 ? 'text-amber-600' : 'text-red-600'}>
                              {(mapping.matchConfidence * 100).toFixed(1)}%
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500">映射方式：</span>
                            <span className="text-gray-900">
                              {mapping.fieldSource === 'auto-detected' ? '系统自动识别' : '手动配置'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateMapping(mapping.id, '')}
                        disabled={mapping.processStatus === 'locked'}
                      >
                        <Unlink className="w-4 h-4" />
                        清除映射
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onLockMapping(mapping.id);
                          setExpandedId(null);
                        }}
                        disabled={!mapping.targetFieldName}
                      >
                        {mapping.processStatus === 'locked' ? (
                          <><Unlock className="w-4 h-4" /> 解锁</>
                        ) : (
                          <><Lock className="w-4 h-4" /> 锁定映射</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
};
