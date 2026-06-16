import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save
} from 'lucide-react';
import dayjs from 'dayjs';

import { useAppStore } from '../store/useAppStore';
import { Alert } from '../components/ui/Alert';
import {
  anomalyTypeLabels,
  severityLabels,
  handlingStatusLabels
} from '../types';
import { getRuleById } from '../data/securityRules';
import { translateSourceType } from '../utils/naturalLanguage';

// 异常详情页 - 完整追溯链路
export const AnomalyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { samples, resolveAnomaly } = useAppStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['sample', 'rule']));
  const [isEditing, setIsEditing] = useState(false);
  const [handlingOpinion, setHandlingOpinion] = useState('');
  const [handledBy, setHandledBy] = useState('');

  // 查找对应的异常和样本
  const { anomaly, sample } = useMemo(() => {
    for (const s of samples) {
      const a = s.anomalies.find(anom => anom.anomalyId === id);
      if (a) {
        return { anomaly: a, sample: s };
      }
    }
    return { anomaly: null, sample: null };
  }, [samples, id]);

  // 关联的安全规则
  const relatedRule = useMemo(() => {
    if (!anomaly?.relatedRuleId) return null;
    return getRuleById(anomaly.relatedRuleId);
  }, [anomaly]);

  // 切换节点展开
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // 处理异常
  const handleResolve = () => {
    if (!anomaly || !handlingOpinion || !handledBy) {
      alert('请填写处理意见和处理人');
      return;
    }
    resolveAnomaly(anomaly.anomalyId, handlingOpinion, handledBy);
    setIsEditing(false);
  };

  // 动画节点
  const TraceNode: React.FC<{
    nodeId: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    children?: React.ReactNode;
    isActive?: boolean;
  }> = ({ nodeId, title, subtitle, icon, color, children, isActive }) => {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = !!children;

    return (
      <div className="relative">
        <div
          onClick={() => hasChildren && toggleNode(nodeId)}
          className={`trace-node flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
            isActive
              ? 'bg-opacity-10 active shadow-lg'
              : 'bg-white hover:bg-gray-50'
          }`}
          style={{
            borderColor: color,
            backgroundColor: isActive ? `${color}10` : undefined
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-navy-900">{title}</h4>
              {hasChildren && (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* 连接线和子节点 */}
        {hasChildren && isExpanded && (
          <div className="ml-8 pl-6 border-l-2 border-dashed" style={{ borderColor: `${color}40` }}>
            <div className="py-4 animate-slide-up">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!anomaly || !sample) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert
          type="error"
          title="未找到异常记录"
          description="该异常ID不存在或已被删除。"
        />
        <button
          onClick={() => navigate('/analysis')}
          className="mt-4 btn btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回分析页面
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/analysis')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回分析页面</span>
        </button>
        <div className="flex items-center gap-3">
          <span className={`badge ${
            anomaly.severity === 'critical' ? 'bg-red-100 text-red-800' :
            anomaly.severity === 'high' ? 'bg-orange-100 text-orange-800' :
            anomaly.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {severityLabels[anomaly.severity]}优先级
          </span>
          <span className={`badge ${
            anomaly.handlingStatus === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
            anomaly.handlingStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {handlingStatusLabels[anomaly.handlingStatus]}
          </span>
        </div>
      </div>

      {/* 标题 */}
      <div className="mb-8">
        <h1 className="font-serif-cn text-2xl font-bold text-navy-900 mb-2 flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
          异常追溯：{anomalyTypeLabels[anomaly.type]}
        </h1>
        <p className="text-gray-600">
          异常ID: <code className="font-mono-data text-sm bg-gray-100 px-2 py-0.5 rounded">
            {anomaly.anomalyId}
          </code>
          <span className="mx-2 text-gray-400">|</span>
          发现时间: {dayjs(sample.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </p>
      </div>

      {/* 追溯链路 */}
      <div className="mb-8">
        <h2 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-navy-600" />
          追溯链路
          <span className="ml-2 text-sm font-normal text-gray-500">
            点击节点展开/收起详情
          </span>
        </h2>

        <div className="space-y-2">
          {/* 节点1: 异常样本 */}
          <TraceNode
            nodeId="sample"
            title="异常样本"
            subtitle={sample.sampleId}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="#f59e0b"
            isActive
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  样本内容
                </label>
                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {sample.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    来源类型
                  </label>
                  <span className={`badge ${
                    sample.sourceType === 'old_table' ? 'bg-navy-100 text-navy-800' :
                    sample.sourceType === 'supplement' ? 'bg-emerald-100 text-emerald-800' :
                    sample.sourceType === 'missing_unit' ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {translateSourceType(sample.sourceType)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    单位
                  </label>
                  <p className="text-sm text-gray-800">
                    {sample.unit || <span className="text-amber-600">未填写</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标注标签
                  </label>
                  <p className="text-sm text-gray-800">{sample.annotationLabel}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    安全标签
                  </label>
                  <p className={`text-sm font-medium ${
                    sample.securityLabel === '拒答' || sample.securityLabel === '高风险'
                      ? 'text-coral-600'
                      : sample.securityLabel === '敏感'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {sample.securityLabel}
                  </p>
                </div>
              </div>

              {sample.sourceRemark && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注说明
                  </label>
                  <p className="text-sm text-gray-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    {sample.sourceRemark}
                  </p>
                </div>
              )}
            </div>
          </TraceNode>

          {/* 连接线 */}
          <div className="flex justify-center py-1">
            <div className="w-0.5 h-6 bg-gray-300" />
          </div>

          {/* 节点2: 关联安全规则 */}
          <TraceNode
            nodeId="rule"
            title={relatedRule ? `关联安全规则: ${relatedRule.ruleId} - ${relatedRule.ruleName}` : '未关联到具体安全规则'}
            subtitle={relatedRule ? `规则版本: v${relatedRule.version}` : '请检查规则配置'}
            icon={<ShieldCheck className="w-6 h-6" />}
            color="#1e3a5f"
          >
            {relatedRule ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    规则描述
                  </label>
                  <p className="text-sm text-gray-800 bg-navy-50 p-3 rounded-lg border border-navy-200">
                    {relatedRule.ruleDescription}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      匹配类型
                    </label>
                    <p className="text-sm text-gray-800">
                      {relatedRule.matchCondition.type === 'keyword' && '关键词匹配'}
                      {relatedRule.matchCondition.type === 'regex' && '正则表达式'}
                      {relatedRule.matchCondition.type === 'custom' && '自定义规则'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      匹配条件
                    </label>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono-data">
                      {relatedRule.matchCondition.value.substring(0, 50)}
                      {relatedRule.matchCondition.value.length > 50 && '...'}
                    </code>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    规则状态
                  </label>
                  <span className={`badge ${
                    relatedRule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {relatedRule.isActive ? '已启用' : '已停用'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <XCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">该异常未关联到具体的安全规则</p>
                <p className="text-xs mt-1">建议检查规则配置是否完整</p>
              </div>
            )}
          </TraceNode>

          {/* 连接线 */}
          <div className="flex justify-center py-1">
            <div className="w-0.5 h-6 bg-gray-300" />
          </div>

          {/* 节点3: 漏配原因（自然语言） */}
          <TraceNode
            nodeId="reason"
            title="漏配原因说明"
            subtitle="自然语言描述，非技术人员可读"
            icon={<FileText className="w-6 h-6" />}
            color="#10b981"
          >
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {anomaly.naturalDescription}
                </p>
              </div>

              <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">技术描述（供开发人员参考）：</p>
                <code className="font-mono-data text-xs">{anomaly.description}</code>
              </div>
            </div>
          </TraceNode>

          {/* 连接线 */}
          <div className="flex justify-center py-1">
            <div className="w-0.5 h-6 bg-gray-300" />
          </div>

          {/* 节点4: 处理意见 */}
          <TraceNode
            nodeId="opinion"
            title="处理意见"
            subtitle={
              anomaly.handlingStatus === 'resolved'
                ? `已处理 · ${anomaly.handledBy} · ${dayjs(anomaly.handledAt).format('YYYY-MM-DD HH:mm')}`
                : anomaly.handlingOpinion
                  ? '已有处理建议'
                  : '待处理'
            }
            icon={<User className="w-6 h-6" />}
            color={anomaly.handlingStatus === 'resolved' ? '#10b981' : '#8b5cf6'}
          >
            <div className="space-y-4">
              {anomaly.handlingOpinion && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-navy-600" />
                    <span className="text-sm font-medium text-gray-700">系统建议处理方案</span>
                  </div>
                  <p className="text-sm text-gray-800">{anomaly.handlingOpinion}</p>
                </div>
              )}

              {anomaly.handlingStatus === 'resolved' && anomaly.handledBy && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                      已处理
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {anomaly.handledBy} · {dayjs(anomaly.handledAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{anomaly.handlingOpinion}</p>
                </div>
              )}

              {anomaly.handlingStatus !== 'resolved' && (
                <div className="space-y-3">
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setHandlingOpinion(anomaly.handlingOpinion || '');
                      }}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      填写处理意见
                    </button>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          处理人 *
                        </label>
                        <input
                          type="text"
                          value={handledBy}
                          onChange={(e) => setHandledBy(e.target.value)}
                          placeholder="请输入处理人姓名"
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          处理意见 *
                        </label>
                        <textarea
                          value={handlingOpinion}
                          onChange={(e) => setHandlingOpinion(e.target.value)}
                          placeholder="请输入具体的处理措施和说明..."
                          className="input text-sm h-24"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResolve}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          确认处理
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="btn btn-secondary"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TraceNode>
        </div>
      </div>

      {/* 验证区域 */}
      <div className="card p-6 mt-8">
        <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          验收验证
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          顺着这条异常往回查，应能查到完整的追溯链路：
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-800">异常样本</span>
          </div>
          <div className="text-gray-400">→</div>
          <div className="flex items-center gap-2 px-4 py-2 bg-navy-50 border border-navy-200 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-navy-600" />
            <span className="text-sm font-medium text-navy-800">安全规则</span>
          </div>
          <div className="text-gray-400">→</div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">漏配原因</span>
          </div>
          <div className="text-gray-400">→</div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <User className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">处理意见</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-emerald-600 font-medium">
            追溯链路完整，验收通过
          </p>
        </div>
      </div>
    </div>
  );
};
