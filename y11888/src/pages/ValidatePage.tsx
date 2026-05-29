import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, AlertCircle, Users, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { useAppStore, addAuditLog } from '@/store';
import { performTrafficChecks, performGroupValidations, generateSummary } from '@/lib/statistics';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatNumber, cn } from '@/lib/utils';
import { TrafficCheckStep } from '@/types';

interface ValidatePageProps {
  onNext: () => void;
  onBack: () => void;
}

export default function ValidatePage({ onNext, onBack }: ValidatePageProps) {
  const { config, sampleSizeResult, trafficChecks, setTrafficChecks, groupValidations, setGroupValidations, cleanedData, setCurrentReport } = useAppStore();
  const [expandedTraffic, setExpandedTraffic] = useState<string | null>(null);
  const [expandedValidation, setExpandedValidation] = useState<string | null>(null);
  
  useEffect(() => {
    if (sampleSizeResult) {
      const checks = performTrafficChecks(config, sampleSizeResult);
      setTrafficChecks(checks);
      
      const historicalConversions = cleanedData
        .filter(row => row.historicalConversion !== null)
        .map(row => row.historicalConversion as number);
      
      let validationsLength = 0;
      if (historicalConversions.length > 0) {
        const validations = performGroupValidations(config, sampleSizeResult, historicalConversions);
        setGroupValidations(validations);
        validationsLength = validations.length;
      }
      
      addAuditLog('validation', '执行流量和分组校验', null, { checks: checks.length, validations: validationsLength }, '');
    }
  }, [sampleSizeResult, config, cleanedData, setTrafficChecks, setGroupValidations]);
  
  const handleReviewItem = (type: 'traffic' | 'validation', id: string) => {
    if (type === 'traffic') {
      setTrafficChecks(trafficChecks.map(check => 
        check.id === id ? { ...check, status: 'pass' as const } : check
      ));
    } else {
      setGroupValidations(groupValidations.map(validation =>
        validation.id === id ? { ...validation, status: 'pass' as const } : validation
      ));
    }
    addAuditLog('validation', '分析师复核通过', { id, status: 'review' }, { id, status: 'pass' }, '');
  };
  
  const trafficPassCount = trafficChecks.filter(c => c.status === 'pass').length;
  const trafficFailCount = trafficChecks.filter(c => c.status === 'fail').length;
  const trafficReviewCount = trafficChecks.filter(c => c.status === 'review').length;
  
  const validationPassCount = groupValidations.filter(v => v.status === 'pass').length;
  const validationFailCount = groupValidations.filter(v => v.status === 'fail').length;
  const validationReviewCount = groupValidations.filter(v => v.status === 'review').length;
  
  const getStatusIcon = (status: TrafficCheckStep['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="w-5 h-5 text-success-green" />;
      case 'fail': return <AlertCircle className="w-5 h-5 text-error-red" />;
      case 'review': return <AlertTriangle className="w-5 h-5 text-warning-orange" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };
  
  return (
    <div className="space-y-6">
      {sampleSizeResult && (
        <Card title="校验概览">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <div className="p-2 bg-success-green bg-opacity-10 rounded">
                <BarChart3 className="w-5 h-5 text-success-green" />
              </div>
              <div>
                <p className="text-xs text-gray-500">流量检查</p>
                <p className="text-lg font-semibold">
                  {trafficPassCount}/{trafficChecks.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <div className="p-2 bg-success-green bg-opacity-10 rounded">
                <Users className="w-5 h-5 text-success-green" />
              </div>
              <div>
                <p className="text-xs text-gray-500">分组校验</p>
                <p className="text-lg font-semibold">
                  {validationPassCount}/{groupValidations.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <div className="p-2 bg-warning-orange bg-opacity-10 rounded">
                <AlertTriangle className="w-5 h-5 text-warning-orange" />
              </div>
              <div>
                <p className="text-xs text-gray-500">待复核项</p>
                <p className="text-lg font-semibold text-warning-orange">
                  {trafficReviewCount + validationReviewCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <div className="p-2 bg-error-red bg-opacity-10 rounded">
                <AlertCircle className="w-5 h-5 text-error-red" />
              </div>
              <div>
                <p className="text-xs text-gray-500">不通过项</p>
                <p className="text-lg font-semibold text-error-red">
                  {trafficFailCount + validationFailCount}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="流量充足性检查"
          subtitle="分步骤验证流量是否满足实验需求"
        >
          <div className="space-y-3">
            {trafficChecks.map((check, index) => (
              <div
                key={check.id}
                className="border border-gray-200 rounded-md overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTraffic(expandedTraffic === check.id ? null : check.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">{check.name}</p>
                      <p className="text-xs text-gray-500">{check.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={check.status} size="sm" />
                    {expandedTraffic === check.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {expandedTraffic === check.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">需求值</p>
                        <p className="text-lg font-mono font-semibold text-space-blue-700">
                          {formatNumber(check.required, 0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">可用值</p>
                        <p className={cn(
                          'text-lg font-mono font-semibold',
                          check.status === 'fail' ? 'text-error-red' : 'text-success-green'
                        )}>
                          {formatNumber(check.available, 0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">缺口</p>
                        <p className={cn(
                          'text-lg font-mono font-semibold',
                          check.gap > 0 ? 'text-error-red' : 'text-success-green'
                        )}>
                          {check.gap > 0 ? '+' : ''}{formatNumber(check.gap, 0)}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">{check.details}</p>
                    </div>
                    {check.status === 'review' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => handleReviewItem('traffic', check.id)}
                      >
                        标记为已复核
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
        
        <Card
          title="分组均匀性校验"
          subtitle="多维度验证分组是否均衡"
        >
          <div className="space-y-3">
            {groupValidations.map((validation) => (
              <div
                key={validation.id}
                className="border border-gray-200 rounded-md overflow-hidden"
              >
                <button
                  onClick={() => setExpandedValidation(expandedValidation === validation.id ? null : validation.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(validation.status)}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">{validation.name}</p>
                      <p className="text-xs text-gray-500">{validation.method}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={validation.status} size="sm" />
                    {expandedValidation === validation.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {expandedValidation === validation.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">统计量</p>
                        <p className="text-lg font-mono font-semibold text-space-blue-700">
                          {validation.statistic.toFixed(4)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">P值</p>
                        <p className={cn(
                          'text-lg font-mono font-semibold',
                          validation.pValue < validation.threshold ? 'text-error-red' : 'text-success-green'
                        )}>
                          {validation.pValue.toFixed(4)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">阈值</p>
                        <p className="text-lg font-mono font-semibold text-gray-600">
                          {validation.threshold}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">{validation.recommendation}</p>
                    </div>
                    {validation.status === 'review' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => handleReviewItem('validation', validation.id)}
                      >
                        标记为已复核
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      <Card title="分析总结与建议">
        {sampleSizeResult && (
          <div className="space-y-4">
            <div className="p-4 bg-space-blue-50 rounded-md">
              <p className="text-sm text-space-blue-800">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                {(() => {
                  const result = generateSummary(config, sampleSizeResult, trafficChecks, groupValidations);
                  return result.summary;
                })()}
              </p>
            </div>
            
            {(() => {
              const result = generateSummary(config, sampleSizeResult, trafficChecks, groupValidations);
              return (
                <>
                  {result.risks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning-orange" />
                        风险提示
                      </h4>
                      <ul className="space-y-1">
                        {result.risks.map((risk, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-warning-orange mt-0.5">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success-green" />
                        建议
                      </h4>
                      <ul className="space-y-1">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-success-green mt-0.5">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Card>
      
      <div className="flex justify-between">
        <Button
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          上一步：样本量计算
        </Button>
        <Button
          onClick={() => {
            if (sampleSizeResult) {
              const result = generateSummary(config, sampleSizeResult, trafficChecks, groupValidations);
              setCurrentReport({
                id: `report-${Date.now()}`,
                generatedAt: Date.now(),
                config,
                sampleSizeResult,
                trafficChecks,
                groupValidations,
                auditLogs: [],
                ...result,
              });
            }
            onNext();
          }}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          下一步：报告导出
        </Button>
      </div>
    </div>
  );
}
