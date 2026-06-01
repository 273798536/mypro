import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Package,
  MapPin,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText
} from 'lucide-react';
import { useAppStore } from '../store';
import { getAbnormalityTypeLabel, getSeverityLabel, getSeverityColor } from '../utils/anomalyDetection';
import { cn } from '../lib/utils';

export default function Diagnosis() {
  const {
    getCurrentProject,
    getCurrentRecords,
    getCurrentAbnormalities,
    resolveAbnormality,
    currentProjectId
  } = useAppStore();

  const project = getCurrentProject();
  const records = getCurrentRecords();
  const abnormalities = getCurrentAbnormalities();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'resolved'>('all');

  const filteredAbnormalities = abnormalities.filter(a => {
    if (filterType === 'all') return true;
    return a.status === filterType;
  });

  const pendingCount = abnormalities.filter(a => a.status === 'pending').length;
  const resolvedCount = abnormalities.filter(a => a.status === 'resolved').length;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle size={40} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">请选择项目</h2>
        <p className="text-slate-500">点击顶部导航栏的项目选择器，选择一个项目查看异常诊断</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">异常诊断面板</h1>
          <p className="text-slate-500 mt-1">
            当前项目：<span className="font-medium text-slate-700">{project.name}</span>
            <span className="mx-2">|</span>
            共 {records.length} 条记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              filterType === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            全部 ({abnormalities.length})
          </button>
          <button
            onClick={() => setFilterType('pending')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              filterType === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            待处理 ({pendingCount})
          </button>
          <button
            onClick={() => setFilterType('resolved')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              filterType === 'resolved'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            已解决 ({resolvedCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">样本量不足</p>
              <p className="text-2xl font-bold text-slate-800">
                {abnormalities.filter(a => a.type === 'insufficient_sample').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">需合并类别</p>
              <p className="text-2xl font-bold text-slate-800">
                {abnormalities.filter(a => a.type === 'category_merged').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">批次混入</p>
              <p className="text-2xl font-bold text-slate-800">
                {abnormalities.filter(a => a.type === 'batch_mixed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">异常列表</h3>
        </div>
        
        {filteredAbnormalities.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-300" />
            <p className="font-medium text-slate-700">暂无{filterType === 'pending' ? '待处理的' : ''}异常</p>
            <p className="text-sm mt-1">
              {filterType === 'pending' 
                ? '所有异常都已处理完毕' 
                : '数据质量良好，未检测到异常情况'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAbnormalities.map((abnormality) => (
              <div key={abnormality.id} className="hover:bg-slate-50">
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === abnormality.id ? null : abnormality.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        abnormality.type === 'insufficient_sample' && 'bg-amber-100',
                        abnormality.type === 'category_merged' && 'bg-violet-100',
                        abnormality.type === 'batch_mixed' && 'bg-red-100'
                      )}>
                        {abnormality.type === 'insufficient_sample' && (
                          <AlertCircle size={20} className="text-amber-600" />
                        )}
                        {abnormality.type === 'category_merged' && (
                          <FileText size={20} className="text-violet-600" />
                        )}
                        {abnormality.type === 'batch_mixed' && (
                          <Package size={20} className="text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">
                            {getAbnormalityTypeLabel(abnormality.type)}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full border',
                            getSeverityColor(abnormality.severity)
                          )}>
                            {getSeverityLabel(abnormality.severity)} 风险
                          </span>
                          {abnormality.status === 'resolved' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              已解决
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          检测于 {new Date(abnormality.detectedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">触发材料</p>
                        <p className="text-sm text-slate-500">{abnormality.triggerMaterial}</p>
                      </div>
                      {expandedId === abnormality.id ? (
                        <ChevronUp size={20} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedId === abnormality.id && (
                  <div className="px-5 pb-5">
                    <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <MapPin size={16} className="text-slate-400" />
                            卡住位置
                          </div>
                          <p className="text-sm text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-200">
                            {abnormality.blockedPosition}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <Clock size={16} className="text-slate-400" />
                            检测时间
                          </div>
                          <p className="text-sm text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-200">
                            {new Date(abnormality.detectedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                          <Lightbulb size={16} className="text-amber-500" />
                          下一步建议
                        </div>
                        <p className="text-sm text-slate-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                          {abnormality.nextStep}
                        </p>
                      </div>

                      {abnormality.status === 'pending' && currentProjectId && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveAbnormality(currentProjectId, abnormality.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 size={16} />
                            标记为已解决
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <Lightbulb size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-800">异常追溯说明</h4>
            <p className="text-sm text-amber-700 mt-1">
              系统会自动检测数据中的异常情况，包括样本量不足、需要合并的类别、以及可能的批次混入问题。
              每条异常都会显示具体触发的材料来源、卡住的位置，以及下一步的处理建议。
              点击异常项可以查看详细信息并进行处理。
            </p>
            <div className="flex gap-6 mt-3">
              <div className="flex items-center gap-2">
                <ArrowRight size={14} className="text-amber-600" />
                <span className="text-xs text-amber-700">追溯到具体材料</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight size={14} className="text-amber-600" />
                <span className="text-xs text-amber-700">明确卡住位置</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight size={14} className="text-amber-600" />
                <span className="text-xs text-amber-700">给出下一步建议</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
