import { useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock, FileText, Users, Armchair, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { ReviewResult, ReviewStatus } from '../types';
import { Card, SectionHeader, Badge, Alert, Button } from './ui';
import { getStatusLabel, explainConclusion } from '../services/reviewGenerator';

interface ReviewResultPanelProps {
  result: ReviewResult | null;
  onRegenerate?: () => void;
  onExport?: () => void;
}

const statusIcons: Record<ReviewStatus, React.ReactNode> = {
  pending: <Clock className="w-6 h-6" />,
  reviewing: <AlertCircle className="w-6 h-6" />,
  completed: <CheckCircle className="w-6 h-6" />,
  needs_manual: <XCircle className="w-6 h-6" />,
};

export function ReviewResultPanel({ result, onRegenerate, onExport }: ReviewResultPanelProps) {
  const [showExplanation, setShowExplanation] = useState(true);

  if (!result) {
    return (
      <Card className="p-6 border-2 border-dashed border-gray-300">
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无复核结果</h3>
          <p className="text-gray-500 mb-4">
            请先上传材料，然后点击"开始复核"生成结论
          </p>
          <p className="text-sm text-gray-400">
            系统将自动分析材料中的投诉记录、检测异常、追踪版本变更
          </p>
        </div>
      </Card>
    );
  }

  const hasIssues = result.anomalies.length > 0 || result.lateAttachmentImpacts.length > 0;
  const isSufficient = result.seatCapacity.verified >= result.seatCapacity.designed;

  return (
    <Card className={`p-6 ${hasIssues ? 'border-orange-300' : 'border-park-300'}`}>
      <SectionHeader
        title="复核结论"
        icon={
          <div className={
            result.status === 'needs_manual' ? 'text-red-500' :
            result.status === 'completed' ? 'text-green-500' :
            'text-yellow-500'
          }>
            {statusIcons[result.status]}
          </div>
        }
        description={`${result.parkName} · ${result.reviewTime.toLocaleString('zh-CN')}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge severity={
              result.status === 'needs_manual' ? 'error' :
              result.status === 'completed' ? 'success' : 'warning'
            }>
              {getStatusLabel(result.status)}
            </Badge>
            <Badge severity={isSufficient ? 'success' : 'error'}>
              {isSufficient ? '容量充足' : '容量不足'}
            </Badge>
          </div>
        }
        action={
          <div className="flex gap-2">
            {onRegenerate && (
              <Button variant="secondary" size="sm" onClick={onRegenerate}>
                重新复核
              </Button>
            )}
            {onExport && (
              <Button variant="primary" size="sm" onClick={onExport}>
                导出报告
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-700">材料数量</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{result.materials.length}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-purple-700">投诉记录</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{result.complaints.length}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">异常数量</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">{result.anomalies.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Armchair className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">核实容量</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{result.seatCapacity.verified}</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-park-600" />
            座椅容量分析
          </h4>
          <Badge severity={isSufficient ? 'success' : 'error'}>
            {isSufficient ? '✅ 容量充足' : '⚠️ 容量不足'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-1">申报数量</div>
            <div className="text-xl font-semibold text-gray-900">{result.seatCapacity.reported} 个</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">核实数量</div>
            <div className={`text-xl font-semibold ${
              result.seatCapacity.discrepancy !== 0 ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {result.seatCapacity.verified} 个
              {result.seatCapacity.discrepancy !== 0 && (
                <span className="text-sm ml-1">
                  ({result.seatCapacity.discrepancy > 0 ? '+' : ''}{result.seatCapacity.discrepancy})
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">建议容量</div>
            <div className="text-xl font-semibold text-gray-900">{result.seatCapacity.designed} 个</div>
            <div className="text-xs text-gray-400">（投诉量×1.5）</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">缺口</div>
            <div className={`text-xl font-semibold ${
              isSufficient ? 'text-green-600' : 'text-red-600'
            }`}>
              {isSufficient ? '无' : `${result.seatCapacity.designed - result.seatCapacity.verified} 个`}
            </div>
          </div>
        </div>
      </div>

      {hasIssues && (
        <div className="space-y-3 mb-4">
          {result.lateAttachmentImpacts.length > 0 && (
            <Alert severity="warning" title="晚到附件影响">
              {result.lateAttachmentImpacts.length}份晚到附件已纳入分析，可能改变原有结论。
              请查看"晚到附件影响分析"了解详细影响链。
            </Alert>
          )}
          {result.anomalies.length > 0 && (
            <Alert severity="error" title="数据异常提示">
              检测到{result.anomalies.length}个数据异常，
              其中{result.anomalies.filter(a => a.requiresManualReview).length}个需要人工确认。
              请在"异常检测"部分处理。
            </Alert>
          )}
          {result.mergeSuggestions.length > 0 && (
            <Alert severity="warning" title="重复投诉待处理">
              {result.mergeSuggestions.length}组疑似重复投诉需要确认是否合并。
              请在"重复投诉归并提示"部分处理。
            </Alert>
          )}
        </div>
      )}

      {result.requiresManualNote && result.status === 'needs_manual' && (
        <Alert severity="error" title="需要人工确认的事项" className="mb-4">
          <div className="whitespace-pre-line text-sm">{result.requiresManualNote}</div>
        </Alert>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-gray-900">结论解释</span>
          </div>
          {showExplanation ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
        {showExplanation && (
          <div className="p-4 bg-white">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {explainConclusion(result)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-park-50 rounded-lg border border-park-200">
        <h4 className="font-medium text-park-900 mb-2">📋 最终结论</h4>
        <pre className="text-sm text-park-800 whitespace-pre-wrap font-sans leading-relaxed">
          {result.conclusion}
        </pre>
      </div>
    </Card>
  );
}
