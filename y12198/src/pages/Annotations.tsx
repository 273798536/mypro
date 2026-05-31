import { useState } from 'react';
import { Plus, MessageSquare, User, Clock, FileText, Type, AlignLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';

const typeLabels: Record<string, string> = {
  bowing: '弓法',
  dynamics: '力度',
  page: '页码',
};

const typeColors: Record<string, string> = {
  bowing: 'bg-purple-100 text-purple-700',
  dynamics: 'bg-blue-100 text-blue-700',
  page: 'bg-orange-100 text-orange-700',
};

export default function Annotations() {
  const { annotations, scoreVersions } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(scoreVersions[scoreVersions.length - 1]?.id || '');

  const sortedAnnotations = [...annotations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-slate-800">批注管理</h2>
          <p className="text-sm text-slate-500 mt-1">记录指挥的弓法、力度和页码修改批注，留存来源与解释</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          新增批注
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">录入新批注</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">关联版本</label>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                {scoreVersions.map(v => (
                  <option key={v.id} value={v.id}>{v.name} - {v.version}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">页码</label>
              <input
                type="number"
                placeholder="输入页码"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">批注类型</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent">
                <option value="bowing">弓法</option>
                <option value="dynamics">力度</option>
                <option value="page">页码</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">来源</label>
              <input
                type="text"
                placeholder="如：指挥排练后讨论决定"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">批注内容</label>
              <input
                type="text"
                placeholder="简要描述修改内容"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">解释说明</label>
              <textarea
                placeholder="详细说明修改原因和意图"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              保存批注
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedAnnotations.map((annotation, index) => {
          const version = scoreVersions.find(v => v.id === annotation.scoreVersionId);
          return (
            <div
              key={annotation.id}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-white font-serif text-lg shadow-md flex-shrink-0">
                  {String.fromCharCode(65 + index % 26)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${typeColors[annotation.type] || 'bg-slate-100 text-slate-600'}`}>
                      {typeLabels[annotation.type] || annotation.type}
                    </span>
                    <span className="text-sm text-slate-500">第 {annotation.pageNumber} 页</span>
                    <span className="text-sm text-slate-400">·</span>
                    <span className="text-sm text-slate-500">{version?.version}</span>
                  </div>
                  
                  <h4 className="font-medium text-slate-800 mb-2">{annotation.content}</h4>
                  
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-600">{annotation.explanation}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{annotation.createdBy}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{new Date(annotation.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText size={12} />
                      <span>来源: {annotation.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
