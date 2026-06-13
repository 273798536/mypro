import { useState } from 'react';
import { MessageSquare, FileText, Image, Link2, Link2Off, CheckCircle, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Annotation } from '@/types/experiment';
import { copyToClipboard } from '@/utils/exportGenerator';

interface UnifiedAnnotationPanelProps {
  annotation: Annotation;
  onChange?: (field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>, value: string, syncAll?: boolean) => void;
  onUpdate?: (field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>, value: string, syncAll?: boolean) => void;
  syncMode?: 'synchronized' | 'independent';
  onToggleSync?: () => void;
  onToggleSyncMode?: () => void;
  onClearAll?: () => void;
  onSyncToAll?: (sourceField: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>) => void;
  disabled?: boolean;
  resultId?: string;
}

const ANNOTATION_FIELDS = [
  {
    key: 'sceneNote' as const,
    label: '场景标注',
    icon: MessageSquare,
    placeholder: '请输入场景标注，用于描述实验场景和上下文...',
    description: '用于图表顶部或侧边的场景描述',
  },
  {
    key: 'sideNote' as const,
    label: '侧边说明',
    icon: FileText,
    placeholder: '请输入侧边说明，用于补充技术细节...',
    description: '用于报告侧边栏的详细技术说明',
  },
  {
    key: 'screenshotNote' as const,
    label: '截图说明',
    icon: Image,
    placeholder: '请输入截图说明，用于配图的图注...',
    description: '用于导出截图或图表的图注说明',
  },
];

export const UnifiedAnnotationPanel = ({
  annotation,
  onChange,
  onUpdate,
  syncMode,
  onToggleSync,
  onToggleSyncMode,
  onClearAll,
  onSyncToAll,
  disabled,
  resultId,
}: UnifiedAnnotationPanelProps) => {
  const currentSyncMode = syncMode || annotation.syncMode;
  
  const handleChange = (field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>, value: string, syncAll?: boolean) => {
    if (onUpdate) {
      onUpdate(field, value, syncAll);
    }
    if (onChange) {
      onChange(field, value, syncAll);
    }
  };
  
  const handleToggleSync = () => {
    if (onToggleSyncMode) {
      onToggleSyncMode();
    }
    if (onToggleSync) {
      onToggleSync();
    }
  };
  const [activeField, setActiveField] = useState<keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'> | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const handleCopy = async (field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>) => {
    const value = annotation[field];
    if (value) {
      await copyToClipboard(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };
  
  const handleSyncFrom = (sourceField: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>) => {
    if (onSyncToAll) {
      onSyncToAll(sourceField);
    } else {
      handleChange(sourceField, annotation[sourceField], true);
    }
  };
  
  const allFieldsEqual = annotation.sceneNote === annotation.sideNote && annotation.sideNote === annotation.screenshotNote;
  const hasContent = annotation.sceneNote || annotation.sideNote || annotation.screenshotNote;
  
  return (
    <Card
      title="统一标注系统"
      subtitle={currentSyncMode === 'synchronized' ? '三处说明同步模式 - 修改一处，三处同步' : '独立编辑模式 - 可分别编辑三处说明'}
      icon={<MessageSquare className="w-5 h-5" />}
      headerRight={
        <div className="flex items-center gap-2">
          <StatusBadge
            status={currentSyncMode === 'synchronized' ? 'success' : 'warning'}
            size="sm"
          >
            {currentSyncMode === 'synchronized' ? '已同步' : '独立编辑'}
          </StatusBadge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleSync}
            disabled={disabled}
          >
            {currentSyncMode === 'synchronized' ? (
              <><Link2Off className="w-4 h-4" /> 取消同步</>
            ) : (
              <><Link2 className="w-4 h-4" /> 开启同步</>
            )}
          </Button>
        </div>
      }
    >
      {currentSyncMode === 'synchronized' && allFieldsEqual && hasContent && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium">三处说明已同步</p>
            <p className="mt-0.5">场景标注、侧边说明、截图说明内容完全一致，符合报告要求</p>
          </div>
        </div>
      )}
      
      {currentSyncMode === 'synchronized' && !allFieldsEqual && hasContent && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-800">
              <p className="font-medium">同步模式已开启，但内容不一致</p>
              <p className="mt-0.5">点击下方「同步到全部」按钮，将某一内容同步到三处</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {ANNOTATION_FIELDS.map((field, index) => {
          const Icon = field.icon;
          const value = annotation[field.key];
          const isActive = activeField === field.key;
          
          return (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'border rounded-xl overflow-hidden transition-all',
                isActive ? 'border-[#0F3460] ring-2 ring-[#0F3460]/20' : 'border-gray-200',
                disabled && 'opacity-60'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors',
                  isActive ? 'bg-[#0F3460]/5' : 'bg-gray-50 hover:bg-gray-100'
                )}
                onClick={() => setActiveField(isActive ? null : field.key)}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isActive ? 'bg-[#0F3460] text-white' : 'bg-white text-gray-500 border border-gray-200'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{field.label}</h4>
                    {value && (
                      <StatusBadge status="success" size="sm" showIcon={false}>
                        已填写
                      </StatusBadge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{field.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {currentSyncMode !== 'synchronized' && hasContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSyncFrom(field.key);
                      }}
                      disabled={!value || disabled}
                      title="同步到全部"
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(field.key);
                    }}
                    disabled={!value || disabled}
                    title="复制内容"
                  >
                    {copiedField === field.key ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-4 bg-white"
                  >
                    <textarea
                      value={value}
                      onChange={(e) => handleChange(field.key, e.target.value, currentSyncMode === 'synchronized')}
                      placeholder={field.placeholder}
                      disabled={disabled}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none resize-none disabled:bg-gray-50"
                    />
                    
                    {currentSyncMode === 'synchronized' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <Link2 className="w-4 h-4" />
                        <span>同步模式：此处修改将同时应用到场景标注、侧边说明和截图说明</span>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChange(field.key, '', currentSyncMode === 'synchronized')}
                        disabled={disabled || !value}
                      >
                        <Trash2 className="w-4 h-4" />
                        清除
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveField(null)}
                      >
                        完成
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          {annotation.lastSyncedAt > 0 && (
            <p>最后同步时间: {new Date(annotation.lastSyncedAt).toLocaleString('zh-CN')}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          disabled={disabled || !hasContent}
        >
          <Trash2 className="w-4 h-4" />
          清除全部标注
        </Button>
      </div>
    </Card>
  );
};
