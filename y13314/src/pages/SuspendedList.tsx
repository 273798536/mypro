import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { 
  FileWarning, Eye, PlayCircle, User, Calendar, Gauge, 
  AlertTriangle, Clock, ArrowLeft, CheckCircle2, XCircle 
} from 'lucide-react';

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const SuspendedList = () => {
  const navigate = useNavigate();
  const { suspendedSamples, confirmSuspendedSample, selectSample } = useAppStore();
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  const assignees = Array.from(new Set(suspendedSamples.map(s => s.assignedTo).filter(Boolean)));
  
  const filteredSamples = filterAssignee === 'all' 
    ? suspendedSamples 
    : suspendedSamples.filter(s => s.assignedTo === filterAssignee);

  const handleViewDetail = (sampleId: string) => {
    selectSample(sampleId);
    navigate(`/sample/${sampleId}`);
  };

  const handleConfirm = (sampleId: string) => {
    confirmSuspendedSample(sampleId);
  };

  const getStats = () => {
    const total = suspendedSamples.length;
    const withLateAttachment = suspendedSamples.filter(s => s.hasLateAttachment).length;
    const referenceMissing = suspendedSamples.filter(s => !s.referenceComplete).length;
    return { total, withLateAttachment, referenceMissing };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-navy-50">
      <div className="sticky top-0 z-30 bg-white border-b border-navy-200 shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-navy-600 hover:text-navy-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回看板</span>
              </button>
              <div className="w-px h-5 bg-navy-200" />
              <div>
                <div className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-sky-600" />
                  <h1 className="font-serif text-xl font-bold text-navy-800">
                    挂起管理
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700">
                    共 {suspendedSamples.length} 条
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy-500">接手人筛选：</span>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="input-field text-xs py-1.5 px-2 w-32"
              >
                <option value="all">全部</option>
                {assignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-sky-50 border border-sky-200">
                <FileWarning className="w-5 h-5 text-sky-600" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-sky-600">
              {stats.total}
            </div>
            <div className="text-sm font-medium text-navy-700">
              挂起样本总数
            </div>
            <div className="text-xs text-navy-500 mt-1">
              需要人工确认的样本
            </div>
          </div>

          <div className="card p-5 animate-fade-in animate-stagger-1">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-amber-600">
              {stats.withLateAttachment}
            </div>
            <div className="text-sm font-medium text-navy-700">
              含晚到附件
            </div>
            <div className="text-xs text-navy-500 mt-1">
              需补录并关联结论
            </div>
          </div>

          <div className="card p-5 animate-fade-in animate-stagger-2">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-rust-50 border border-rust-200">
                <AlertTriangle className="w-5 h-5 text-rust-600" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-rust-600">
              {stats.referenceMissing}
            </div>
            <div className="text-sm font-medium text-navy-700">
              引用缺失
            </div>
            <div className="text-xs text-navy-500 mt-1">
              需确认引用完整性
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 border border-dashed border-sky-300 bg-sky-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-sky-800 mb-1">挂起管理规则</p>
              <ul className="text-sky-700 space-y-1">
                <li>• 引用缺失的样本必须挂起，禁止输出假稳定结论</li>
                <li>• 晚到附件必须与最终结论关联后才可解除挂起</li>
                <li>• 解除挂起前请确认：所有附件已关联、引用关系完整</li>
                <li>• 点击「查看详情」可进入样本详情页进行完整处理</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-200 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-navy-800">
              挂起样本列表
            </h3>
            <div className="text-xs text-navy-500">
              显示 <span className="font-mono font-semibold text-navy-700">{filteredSamples.length}</span> 条记录
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
            {filteredSamples.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-moss-300 mx-auto mb-3" />
                <p className="text-navy-500 font-medium">暂无挂起样本</p>
                <p className="text-navy-400 text-sm mt-1">所有样本引用完整，可正常使用</p>
              </div>
            ) : (
              <table className="data-table">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th>样本ID</th>
                    <th>客户名称</th>
                    <th>客户分层</th>
                    <th>申请日期</th>
                    <th>最新评分</th>
                    <th>挂起原因</th>
                    <th>接手人</th>
                    <th>特殊标记</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSamples.map((sample, index) => (
                    <tr 
                      key={sample.id} 
                      className="suspended-row animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="font-mono text-sm text-navy-600">
                        {sample.id}
                      </td>
                      <td className="font-medium text-navy-800">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-navy-400" />
                          {sample.customerName}
                        </div>
                      </td>
                      <td>
                        <span className="tag">{sample.segmentName}</span>
                      </td>
                      <td className="font-mono text-navy-600">
                        {formatDate(sample.applyDate)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className={`font-mono font-bold ${
                            sample.latestResult === 'pass' ? 'text-moss-600' : 'text-rust-600'
                          }`}>
                            {sample.latestScore}
                          </span>
                          <span className={`text-xs ${
                            sample.latestResult === 'pass' ? 'text-moss-500' : 'text-rust-500'
                          }`}>
                            {sample.latestResult === 'pass' ? '通过' : '未通过'}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm text-navy-600 max-w-xs truncate" title={sample.suspendReason}>
                        {sample.suspendReason || '-'}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-sm text-navy-700">
                          <User className="w-3.5 h-3.5 text-navy-400" />
                          {sample.assignedTo || '-'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {sample.hasLateAttachment && (
                            <span className="tag tag-amber" title="包含晚到附件">
                              <Clock className="w-3 h-3 mr-1" />
                              晚到附件
                            </span>
                          )}
                          {!sample.referenceComplete && (
                            <span className="tag tag-rust" title="引用缺失">
                              <XCircle className="w-3 h-3 mr-1" />
                              引用缺失
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(sample.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-navy-600 border border-navy-300 hover:bg-navy-50 hover:border-navy-500 hover:text-navy-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看详情
                          </button>
                          <button
                            onClick={() => handleConfirm(sample.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-moss-600 border border-moss-300 hover:bg-moss-50 hover:border-moss-500 hover:text-moss-800 transition-colors"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            解除挂起
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-amber-500" />
              <h4 className="font-serif text-base font-semibold text-navy-800">
                引用缺失常见原因
              </h4>
            </div>
            <ul className="text-sm text-navy-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>结论中引用的附件尚未上传或关联</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>评分记录与结论版本不匹配</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>晚到附件未及时关联到最终结论</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>阈值变更后历史结论未重新评估</span>
              </li>
            </ul>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-5 h-5 text-amber-500" />
              <h4 className="font-serif text-base font-semibold text-navy-800">
                解除挂起检查清单
              </h4>
            </div>
            <ul className="text-sm text-navy-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-moss-500 mt-0.5 flex-shrink-0" />
                <span>所有附件已上传并与结论关联</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-moss-500 mt-0.5 flex-shrink-0" />
                <span>评分记录完整，阈值版本清晰</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-moss-500 mt-0.5 flex-shrink-0" />
                <span>接手同事已确认所有引用关系</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-moss-500 mt-0.5 flex-shrink-0" />
                <span>如有改判，模型对比解释清晰合理</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspendedList;
