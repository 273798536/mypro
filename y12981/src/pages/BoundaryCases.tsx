import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import {
  TestTube,
  Play,
  CheckCircle2,
  AlertTriangle,
  Bug,
  Link2Off,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
  XCircle,
  Activity
} from 'lucide-react';
import { BoundaryCase, DiagnosisResult } from '../../shared/types';

const BoundaryCases: React.FC = () => {
  const {
    boundaryCases,
    loading,
    fetchBoundaryCases,
    runBoundaryCase,
    runAllBoundaryCases
  } = useStore();

  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentCaseResult, setCurrentCaseResult] = useState<{
    case: BoundaryCase;
    results: DiagnosisResult[];
    passed: boolean;
  } | null>(null);

  useEffect(() => {
    fetchBoundaryCases();
  }, []);

  const handleRunCase = async (caseItem: BoundaryCase) => {
    const result = await runBoundaryCase(caseItem.id);
    if (result) {
      setCurrentCaseResult({
        case: caseItem,
        results: result.results,
        passed: result.passed
      });
      setShowResultModal(true);
    }
  };

  const handleRunAll = async () => {
    const results = await runAllBoundaryCases();
    console.log('All boundary cases completed:', results);
  };

  const toggleExpand = (caseId: string) => {
    setExpandedCaseId(expandedCaseId === caseId ? null : caseId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'foreign_key':
      case 'timeout':
        return <Link2Off size={16} />;
      case 'leak':
        return <Activity size={16} />;
      case 'bad_data':
        return <Bug size={16} />;
      default:
        return <Database size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'foreign_key':
        return '外键断链';
      case 'leak':
        return '连接泄漏';
      case 'timeout':
        return '超时重置';
      case 'bad_data':
        return '坏数据';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'foreign_key':
        return 'bg-purple-500/20 text-purple-400';
      case 'leak':
        return 'bg-orange-500/20 text-orange-400';
      case 'timeout':
        return 'bg-red-500/20 text-red-400';
      case 'bad_data':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getSampleBadData = (type: string) => {
    if (type === 'bad_data') {
      return (
        <div className="space-y-2">
          <p className="text-xs text-navy-300 font-medium">真实坏数据样例：</p>
          <div className="bg-navy-900 rounded-lg p-3 font-mono text-xs space-y-1">
            <p className="text-red-400">// 负数连接数: activeConnections: <span className="text-red-400 font-bold">-5</span></p>
            <p className="text-yellow-400">// NaN值: errorRate: <span className="text-yellow-400 font-bold">NaN</span></p>
            <p className="text-orange-400">// 异常大值: waitingRequests: <span className="text-orange-400 font-bold">999999</span></p>
            <p className="text-purple-400">// 乱码字符: poolName: <span className="text-purple-400 font-bold">"ä¹±ç "</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">边界案例库</h1>
          <p className="text-navy-400 mt-1 text-sm">
            测试系统在边界场景下的诊断能力，每个案例都能真实改变诊断结果
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Play size={16} />}
          onClick={handleRunAll}
          loading={loading}
        >
          运行全部
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Link2Off size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {boundaryCases.filter(c => c.type === 'foreign_key').length}
              </p>
              <p className="text-sm text-navy-400">外键断链</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Activity size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {boundaryCases.filter(c => c.type === 'leak').length}
              </p>
              <p className="text-sm text-navy-400">连接泄漏</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Clock size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {boundaryCases.filter(c => c.type === 'timeout').length}
              </p>
              <p className="text-sm text-navy-400">超时重置</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Bug size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {boundaryCases.filter(c => c.type === 'bad_data').length}
              </p>
              <p className="text-sm text-navy-400">坏数据</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-400 font-medium">边界案例设计说明</p>
          <p className="text-sm text-navy-300 mt-1">
            每个案例都包含真实的测试数据，能够真实触发诊断规则并改变诊断结果。
            运行案例后，数据会被导入系统并执行诊断，可在诊断看板查看完整分析结果。
            坏数据样例包含负数、NaN、异常大值、乱码等真实场景中可能出现的问题数据。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {boundaryCases.map((caseItem) => (
          <div
            key={caseItem.id}
            className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden transition-all duration-200"
          >
            <div
              className="p-5 cursor-pointer hover:bg-navy-700/30"
              onClick={() => toggleExpand(caseItem.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${getTypeColor(caseItem.type)}`}>
                    {getTypeIcon(caseItem.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{caseItem.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(caseItem.type)}`}>
                        {getTypeLabel(caseItem.type)}
                      </span>
                      {caseItem.isActive ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                          已启用
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-navy-600/50 text-navy-400">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-navy-400 mt-1">{caseItem.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-xs text-navy-400">预期结果</p>
                    <div className="flex items-center gap-1 mt-1">
                      <StatusBadge status={caseItem.expectedResult.severity}>
                        {caseItem.expectedResult.severity === 'critical' ? '严重' :
                        caseItem.expectedResult.severity === 'warning' ? '警告' : '正常'}
                      </StatusBadge>
                      <span className="text-xs text-navy-300 font-mono ml-2">
                        {caseItem.expectedResult.issueType}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Play size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunCase(caseItem);
                    }}
                    loading={loading}
                    disabled={!caseItem.isActive}
                  >
                    运行
                  </Button>
                  {expandedCaseId === caseItem.id ? (
                    <ChevronUp size={20} className="text-navy-400" />
                  ) : (
                    <ChevronDown size={20} className="text-navy-400" />
                  )}
                </div>
              </div>
            </div>

            {expandedCaseId === caseItem.id && (
              <div className="border-t border-navy-700 p-5 bg-navy-900/50">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">测试数据预览</h4>
                    <div className="bg-navy-900 rounded-lg p-4 max-h-64 overflow-auto">
                      <pre className="text-xs font-mono text-navy-300 whitespace-pre-wrap">
                        {JSON.stringify(caseItem.testData.slice(0, 2), null, 2)}
                      </pre>
                      {caseItem.testData.length > 2 && (
                        <p className="text-xs text-navy-500 mt-2">
                          ... 还有 {caseItem.testData.length - 2} 条数据
                        </p>
                      )}
                    </div>
                    {getSampleBadData(caseItem.type)}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">诊断规则触发说明</h4>
                    <div className="space-y-2">
                      {caseItem.type === 'foreign_key' && (
                        <div className="bg-navy-800 rounded-lg p-4 space-y-2">
                          <p className="text-sm text-navy-300">
                            <span className="text-purple-400 font-medium">外键断链检测：</span>
                          </p>
                          <ul className="text-xs text-navy-400 space-y-1">
                            <li>• 检测连接ID格式是否存在断链记录</li>
                            <li>• 检查 host/port/database 字段一致性</li>
                            <li>• 识别异常断开的连接痕迹</li>
                            <li>• 触发"连接池异常断链"警告</li>
                          </ul>
                        </div>
                      )}
                      {caseItem.type === 'leak' && (
                        <div className="bg-navy-800 rounded-lg p-4 space-y-2">
                          <p className="text-sm text-navy-300">
                            <span className="text-orange-400 font-medium">连接泄漏检测：</span>
                          </p>
                          <ul className="text-xs text-navy-400 space-y-1">
                            <li>• 监控活跃连接持续增长</li>
                            <li>• 空闲连接持续下降</li>
                            <li>• 活跃/空闲比例超过阈值</li>
                            <li>• 触发"连接池泄漏风险"严重警告</li>
                          </ul>
                        </div>
                      )}
                      {caseItem.type === 'timeout' && (
                        <div className="bg-navy-800 rounded-lg p-4 space-y-2">
                          <p className="text-sm text-navy-300">
                            <span className="text-red-400 font-medium">超时重置检测：</span>
                          </p>
                          <ul className="text-xs text-navy-400 space-y-1">
                            <li>• 超时次数突然激增</li>
                            <li>• 平均等待时间超过阈值</li>
                            <li>• 等待队列持续堆积</li>
                            <li>• 触发"连接池超时严重"错误</li>
                          </ul>
                        </div>
                      )}
                      {caseItem.type === 'bad_data' && (
                        <div className="bg-navy-800 rounded-lg p-4 space-y-2">
                          <p className="text-sm text-navy-300">
                            <span className="text-yellow-400 font-medium">坏数据检测：</span>
                          </p>
                          <ul className="text-xs text-navy-400 space-y-1">
                            <li>• 检测负数连接数</li>
                            <li>• 识别 NaN/Infinity 异常值</li>
                            <li>• 过滤乱码和无效字符</li>
                            <li>• 标记异常大值/小值</li>
                            <li>• 触发"数据异常"警告</li>
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-xs text-blue-400">
                        <strong>预期诊断结果：</strong>
                        {caseItem.expectedResult.severity === 'critical' ? '严重' :
                         caseItem.expectedResult.severity === 'warning' ? '警告' : '正常'}
                        {' - '}
                        {caseItem.expectedResult.issueType}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          setCurrentCaseResult(null);
        }}
        title="案例运行结果"
        size="xl"
      >
        {currentCaseResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {currentCaseResult.case.name}
                </h3>
                <p className="text-sm text-navy-400">
                  {currentCaseResult.case.description}
                </p>
              </div>
              {currentCaseResult.passed ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-400" />
                  <span className="text-green-400 font-medium">诊断通过</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg">
                  <XCircle size={20} className="text-red-400" />
                  <span className="text-red-400 font-medium">诊断不匹配</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-navy-700/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {currentCaseResult.results.length}
                </p>
                <p className="text-sm text-navy-400">诊断结果数</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/30">
                <p className="text-2xl font-bold text-red-400">
                  {currentCaseResult.results.filter(r => r.severity === 'critical').length}
                </p>
                <p className="text-sm text-navy-400">严重问题</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-4 text-center border border-orange-500/30">
                <p className="text-2xl font-bold text-orange-400">
                  {currentCaseResult.results.filter(r => r.severity === 'warning').length}
                </p>
                <p className="text-sm text-navy-400">警告问题</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-3">诊断结果明细</h4>
              <div className="max-h-64 overflow-auto border border-navy-700 rounded-lg">
                <table className="w-full">
                  <thead className="bg-navy-700 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">级别</th>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">问题类型</th>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">连接池</th>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCaseResult.results.map((result) => (
                      <tr key={result.id} className="border-t border-navy-700 hover:bg-navy-700/30">
                        <td className="p-3">
                          <StatusBadge status={result.severity}>
                            {result.severity === 'critical' ? '严重' :
                             result.severity === 'warning' ? '警告' : '正常'}
                          </StatusBadge>
                        </td>
                        <td className="p-3 text-sm text-white font-mono">{result.issueType}</td>
                        <td className="p-3 text-sm text-navy-300">{result.poolName}</td>
                        <td className="p-3 text-sm text-navy-200">{result.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-navy-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">预期 vs 实际</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy-800 rounded-lg p-3">
                  <p className="text-xs text-navy-400 mb-1">预期结果</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={currentCaseResult.case.expectedResult.severity}>
                      {currentCaseResult.case.expectedResult.severity === 'critical' ? '严重' :
                       currentCaseResult.case.expectedResult.severity === 'warning' ? '警告' : '正常'}
                    </StatusBadge>
                    <span className="text-sm text-white font-mono">
                      {currentCaseResult.case.expectedResult.issueType}
                    </span>
                  </div>
                </div>
                <div className="bg-navy-800 rounded-lg p-3">
                  <p className="text-xs text-navy-400 mb-1">实际结果</p>
                  {currentCaseResult.results.length > 0 && (
                    <div className="flex items-center gap-2">
                      <StatusBadge status={currentCaseResult.results[0].severity}>
                        {currentCaseResult.results[0].severity === 'critical' ? '严重' :
                         currentCaseResult.results[0].severity === 'warning' ? '警告' : '正常'}
                      </StatusBadge>
                      <span className="text-sm text-white font-mono">
                        {currentCaseResult.results[0].issueType}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setShowResultModal(false);
                setCurrentCaseResult(null);
              }}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BoundaryCases;
