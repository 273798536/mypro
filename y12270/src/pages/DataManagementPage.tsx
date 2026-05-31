import { useState, useRef } from 'react';
import { Upload, GitBranch, Clock, User, AlertTriangle, CheckCircle, XCircle, FileText, Trash2, ArrowLeftRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getIssueTypeLabel, getSeverityColor } from '../engine/QualityValidator';
import Papa from 'papaparse';
import type { BondHolding } from '../types';

export function DataManagementPage() {
  const { versions, currentVersion, holdings, qualityIssues, loadVersion, importHoldings, resolveIssue } = useAppStore();
  const [activeTab, setActiveTab] = useState<'versions' | 'quality' | 'import'>('versions');
  const [importSource, setImportSource] = useState('Wind资讯');
  const [importName, setImportName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsedHoldings: BondHolding[] = results.data
          .filter((row: any) => row.bondId || row['债券代码'])
          .map((row: any, index: number) => ({
            bondId: row.bondId || row['债券代码'] || `IMPORT-${String(index).padStart(6, '0')}`,
            bondName: row.bondName || row['债券名称'] || '未命名债券',
            industry: row.industry || row['行业'] || '未分类',
            duration: parseFloat(row.duration || row['久期']) || 0,
            yield: parseFloat(row.yield || row['收益率']) || 0,
            weight: row.weight || row['权重'] ? parseFloat(row.weight || row['权重']) : null,
            faceValue: parseFloat(row.faceValue || row['面值']) || 1000000,
            source: importSource,
            importTime: new Date()
          }));

        if (parsedHoldings.length > 0) {
          const versionName = importName || `导入_${new Date().toLocaleDateString()}`;
          importHoldings(parsedHoldings, importSource, versionName);
          alert(`成功导入 ${parsedHoldings.length} 只债券`);
          setImportName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          alert('未解析到有效数据，请检查文件格式');
        }
      },
      error: (error) => {
        alert(`解析失败: ${error.message}`);
      }
    });
  };

  const unresolvedIssues = qualityIssues.filter(i => !i.resolved);
  const resolvedIssues = qualityIssues.filter(i => i.resolved);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 bg-slate-900/80 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
        {[
          { key: 'versions', label: '版本管理', icon: GitBranch },
          { key: 'quality', label: '质量报告', icon: AlertTriangle },
          { key: 'import', label: '数据导入', icon: Upload }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.key === 'quality' && unresolvedIssues.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                  {unresolvedIssues.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'versions' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="text-xl font-semibold text-slate-100">版本历史</h2>
            
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />
              
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div
                    key={version.versionId}
                    className={`relative flex gap-4 p-4 rounded-xl border transition-all ${
                      currentVersion?.versionId === version.versionId
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="relative z-10 w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center flex-shrink-0">
                      <GitBranch size={18} className="text-slate-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-100">{version.name}</h3>
                            {currentVersion?.versionId === version.versionId && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                当前版本
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{version.description}</p>
                        </div>
                        
                        {currentVersion?.versionId !== version.versionId && (
                          <button
                            onClick={() => loadVersion(version.versionId)}
                            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <ArrowLeftRight size={12} />
                            切换
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          {version.holdingCount} 只债券
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {version.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(version.createdAt).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch size={12} />
                          {version.source}
                        </span>
                        {version.parentVersion && (
                          <span className="text-slate-600">
                            基于版本: {version.parentVersion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">数据质量报告</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2 text-red-400">
                  <XCircle size={14} />
                  未解决: {unresolvedIssues.length}
                </span>
                <span className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle size={14} />
                  已解决: {resolvedIssues.length}
                </span>
              </div>
            </div>

            {qualityIssues.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
                <p>数据质量良好，未发现问题</p>
              </div>
            ) : (
              <div className="space-y-3">
                {qualityIssues.map(issue => (
                  <div
                    key={issue.issueId}
                    className={`p-4 rounded-xl border transition-all ${
                      issue.resolved
                        ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getSeverityColor(issue.severity) }}
                          />
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {getIssueTypeLabel(issue.type)}
                          </span>
                          <span className="text-xs text-slate-500">
                            严重程度: {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                          </span>
                          {issue.resolved && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={12} />
                              已解决
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-200">{issue.description}</p>
                        
                        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                          <p className="text-xs text-amber-400/90 mb-2">
                            <AlertTriangle size={12} className="inline mr-1" />
                            影响说明: {issue.impact}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            受影响结果: {issue.affectedResults.join(' → ')}
                          </p>
                        </div>
                      </div>
                      
                      {!issue.resolved && (
                        <button
                          onClick={() => resolveIssue(issue.issueId)}
                          className="px-3 py-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          <CheckCircle size={12} />
                          标记解决
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-100 mb-6">导入债券持仓</h2>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  版本名称
                </label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="例如：2024年Q4持仓更新"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  数据来源
                </label>
                <select
                  value={importSource}
                  onChange={(e) => setImportSource(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Wind资讯">Wind资讯</option>
                  <option value="同花顺iFinD">同花顺iFinD</option>
                  <option value="东方财富Choice">东方财富Choice</option>
                  <option value="Bloomberg">Bloomberg</option>
                  <option value="路透">路透</option>
                  <option value="手动输入">手动输入</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  上传文件
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                >
                  <Upload size={32} className="mx-auto mb-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  <p className="text-sm text-slate-300 mb-1">点击选择CSV文件</p>
                  <p className="text-xs text-slate-500">支持债券代码、债券名称、久期、收益率、权重、面值等字段</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2 font-medium">CSV文件格式示例：</p>
                <pre className="text-[10px] text-slate-500 font-mono overflow-x-auto">
{`bondId,bondName,industry,duration,yield,weight,faceValue
000001,24国债01,国债,2.35,2.45,1.5,1000000
000002,24国开01,金融债,3.68,2.85,2.1,1000000`}
                </pre>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <FileText size={20} className="text-blue-400 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">数据来源和版本记录</p>
                  <p>导入的数据将自动创建新版本，保留完整的导入时间、来源和创建人信息，便于后续追溯和复核。</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">当前持仓概览</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-100 mb-1">{holdings.length}</div>
                  <div className="text-xs text-slate-400">债券总数</div>
                </div>
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {(holdings.reduce((s, h) => s + h.faceValue, 0) / 100000000).toFixed(2)}亿
                  </div>
                  <div className="text-xs text-slate-400">总面值</div>
                </div>
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">
                    {new Set(holdings.map(h => h.industry)).size}
                  </div>
                  <div className="text-xs text-slate-400">行业数</div>
                </div>
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                  <div className="text-2xl font-bold text-amber-400 mb-1">
                    {holdings.filter(h => h.weight === null).length}
                  </div>
                  <div className="text-xs text-slate-400">权重缺失</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
