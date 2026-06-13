import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp, User, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ResultStatusBadge } from '@/components/common/StatusBadge';
import { SuspendRecord, CalculationResult, ExperimentRecord } from '@/types/experiment';
import { correctDirectionSign } from '@/utils/directionCheck';

interface SuspendListProps {
  records: SuspendRecord[];
  results?: CalculationResult[];
  experiments?: ExperimentRecord[];
  onProcess?: (suspendId: string, action: 'approve' | 'reject' | 'correct', remark: string, correctedValue?: any) => void;
  getResultForSuspend?: (suspendId: string) => CalculationResult | undefined;
  getExperimentForResult?: (resultId: string) => ExperimentRecord | undefined;
  showActions?: boolean;
}

const reasonLabels: Record<string, string> = {
  direction_sign_reversed: '方向符号异常',
  boundary_anomaly: '边界值异常',
  manual_suspend: '手动挂起',
};

export const SuspendList = ({ 
  records, 
  results = [], 
  experiments = [], 
  onProcess,
  getResultForSuspend,
  getExperimentForResult,
  showActions = true,
}: SuspendListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [correctedValue, setCorrectedValue] = useState<string>('');
  
  const pendingRecords = records.filter(r => r.status === 'pending');
  const processedRecords = records.filter(r => r.status !== 'pending');
  
  const handleProcess = (suspendId: string, action: 'approve' | 'reject' | 'correct') => {
    if (!onProcess) return;
    const suspend = records.find(r => r.id === suspendId);
    if (!suspend) return;
    
    let corrected: any = undefined;
    if (action === 'correct') {
      if (suspend.reason === 'direction_sign_reversed' && typeof suspend.originalValue === 'number') {
        corrected = correctDirectionSign(suspend.originalValue);
      } else if (correctedValue) {
        corrected = parseFloat(correctedValue);
      }
    }
    
    onProcess(suspendId, action, remark || `项目经理${action === 'approve' ? '批准放行' : action === 'correct' ? '修正后确认' : '拒绝'}`, corrected);
    setProcessingId(null);
    setRemark('');
    setCorrectedValue('');
  };
  
  const getResult = (suspend: SuspendRecord) => {
    if (getResultForSuspend) {
      return getResultForSuspend(suspend.id);
    }
    return results.find(r => r.id === suspend.resultId);
  };
  
  const getExperiment = (result: CalculationResult | undefined) => {
    if (!result) return undefined;
    if (getExperimentForResult) {
      return getExperimentForResult(result.id);
    }
    return experiments.find(e => e.id === result.recordId);
  };
  
  const getRelatedInfo = (suspend: SuspendRecord) => {
    const result = getResult(suspend);
    const experiment = getExperiment(result);
    return { result, experiment };
  };
  
  const renderSuspendCard = (suspend: SuspendRecord) => {
    const { result, experiment } = getRelatedInfo(suspend);
    const isExpanded = expandedId === suspend.id;
    const isProcessing = processingId === suspend.id;
    
    return (
      <motion.div
        key={suspend.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'border rounded-xl overflow-hidden mb-4 transition-all',
          suspend.status === 'pending' ? 'border-[#E94560]/50 bg-[#E94560]/5' : 'border-gray-200 bg-white'
        )}
      >
        <div
          className="p-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : suspend.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                suspend.status === 'pending' ? 'bg-[#E94560]/10 text-[#E94560]' :
                suspend.status === 'approved' ? 'bg-green-100 text-green-600' :
                suspend.status === 'corrected' ? 'bg-blue-100 text-blue-600' :
                'bg-red-100 text-red-600'
              )}>
                {suspend.status === 'pending' ? <AlertTriangle className="w-5 h-5" /> :
                 suspend.status === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                 suspend.status === 'corrected' ? <RotateCcw className="w-5 h-5" /> :
                 <XCircle className="w-5 h-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge
                    status={suspend.status === 'pending' ? 'suspended' : suspend.status === 'rejected' ? 'error' : 'success'}
                    size="sm"
                  >
                    {reasonLabels[suspend.reason] || suspend.reason}
                  </StatusBadge>
                  {result && <ResultStatusBadge status={result.status} size="sm" />}
                </div>
                
                <p className="text-sm text-gray-900 font-medium">{suspend.description}</p>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {experiment?.sourceFileName || '未知文件'}
                  </span>
                  {result && (
                    <span>版本 v{result.version}</span>
                  )}
                </div>
                
                {suspend.status !== 'pending' && (
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {suspend.confirmUser}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {suspend.confirmTime ? format(suspend.confirmTime, 'yyyy-MM-dd HH:mm') : '-'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {suspend.status === 'pending' && (
                <StatusBadge status="warning" size="sm">待处理</StatusBadge>
              )}
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">原始值</p>
                    <p className="text-lg font-mono font-bold text-[#E94560]">
                      {JSON.stringify(suspend.originalValue)}
                    </p>
                  </div>
                  
                  {suspend.reason === 'direction_sign_reversed' && typeof suspend.originalValue === 'number' && (
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">建议修正值（取反）</p>
                      <p className="text-lg font-mono font-bold text-green-600">
                        {correctDirectionSign(suspend.originalValue)}
                      </p>
                    </div>
                  )}
                  
                  {suspend.suggestedValue !== undefined && (
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">确认修正值</p>
                      <p className="text-lg font-mono font-bold text-blue-600">
                        {JSON.stringify(suspend.suggestedValue)}
                      </p>
                    </div>
                  )}
                  
                  {suspend.confirmRemark && (
                    <div className="p-3 bg-white rounded-lg col-span-2">
                      <p className="text-xs text-gray-500 mb-1">处理意见</p>
                      <p className="text-sm text-gray-900">{suspend.confirmRemark}</p>
                    </div>
                  )}
                </div>
                
                {suspend.status === 'pending' && showActions && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        处理意见
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="请输入处理意见..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none resize-none"
                      />
                    </div>
                    
                    {suspend.reason !== 'direction_sign_reversed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          修正值（选择"修正后确认"时必填）
                        </label>
                        <input
                          type="number"
                          value={correctedValue}
                          onChange={(e) => setCorrectedValue(e.target.value)}
                          placeholder="请输入修正值..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpandedId(null);
                          setRemark('');
                          setCorrectedValue('');
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleProcess(suspend.id, 'reject')}
                      >
                        <XCircle className="w-4 h-4" />
                        拒绝
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleProcess(suspend.id, 'approve')}
                      >
                        <CheckCircle className="w-4 h-4" />
                        批准放行
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleProcess(suspend.id, 'correct')}
                      >
                        <RotateCcw className="w-4 h-4" />
                        修正后确认
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  return (
    <div>
      <Card
        title="待处理异常"
        subtitle={`共 ${pendingRecords.length} 条记录需要项目经理确认`}
        icon={<AlertTriangle className="w-5 h-5 text-[#E94560]" />}
        className="mb-6"
      >
        {pendingRecords.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">暂无待处理的异常记录</p>
            <p className="text-sm text-gray-400 mt-1">所有数据均已通过方向符号校验</p>
          </div>
        ) : (
          pendingRecords.map(renderSuspendCard)
        )}
      </Card>
      
      {processedRecords.length > 0 && (
        <Card
          title="已处理记录"
          subtitle={`共 ${processedRecords.length} 条历史处理记录`}
          icon={<FileText className="w-5 h-5" />}
        >
          {processedRecords.map(renderSuspendCard)}
        </Card>
      )}
    </div>
  );
};
