import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react';
import dayjs from 'dayjs';

import { useAppStore } from '../store/useAppStore';
import { Alert } from '../components/ui/Alert';
import { versionManager } from '../services/versionManager';
import { downloadTemplate } from '../services/fileParser';
import { PromptVersion } from '../types';

// 数据导入页
export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { importSamples, bindPromptVersion, samples } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({
    versionNumber: '',
    content: '',
    remark: '',
    changes: ''
  });
  const [importResult, setImportResult] = useState<{
    total: number;
    issues: Array<{ type: string; count: number }>;
  } | null>(null);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileImport(files[0]);
    }
  }, []);

  // 处理文件导入
  const handleFileImport = async (file: File) => {
    if (!selectedVersion) {
      alert('请先选择或创建提示词版本');
      return;
    }

    try {
      const result = await importSamples(file);
      setImportResult(result);
    } catch (error) {
      console.error('导入失败:', error);
      alert(error instanceof Error ? error.message : '导入失败');
    }
  };

  // 创建新版本
  const handleCreateVersion = () => {
    if (!newVersion.versionNumber || !newVersion.content) {
      alert('请填写版本号和提示词内容');
      return;
    }

    const version: Omit<PromptVersion, 'versionId'> = {
      versionNumber: newVersion.versionNumber,
      releasedAt: dayjs().toISOString(),
      content: newVersion.content,
      remark: newVersion.remark,
      changes: newVersion.changes.split(/[,，\n]/).map(s => s.trim()).filter(Boolean)
    };

    bindPromptVersion(version);
    const versions = versionManager.getAllVersions();
    setSelectedVersion(versions[0].versionId);
    setShowNewVersion(false);
    setNewVersion({ versionNumber: '', content: '', remark: '', changes: '' });
  };

  const versions = versionManager.getAllVersions();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif-cn text-2xl font-bold text-navy-900 mb-2">
          数据导入
        </h1>
        <p className="text-gray-600">
          批量导入样本数据，绑定提示词版本，确保分析结果可追溯
        </p>
      </div>

      {samples.length > 0 && (
        <Alert
          type="info"
          title={`已加载 ${samples.length} 条数据`}
          description="可继续导入新数据，或前往分析页面查看结果。"
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：文件上传 */}
        <div className="col-span-2 space-y-6">
          {/* 文件上传区 */}
          <div className="card p-6">
            <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-navy-600" />
              上传数据文件
            </h3>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-300 hover:border-navy-400 hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-16 h-16 mx-auto mb-4 bg-navy-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-navy-600" />
                </div>
                <p className="text-lg font-medium text-navy-900 mb-2">
                  {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  或点击选择文件，支持 Excel (.xlsx, .xls) 和 CSV 格式
                </p>
                <span className="btn btn-secondary">
                  选择文件
                </span>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                建议使用标准模板格式，包含「内容、单位、标注标签、安全标签、备注」列
              </p>
              <button
                onClick={downloadTemplate}
                className="text-sm text-navy-600 hover:text-navy-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                下载导入模板
              </button>
            </div>

            {/* 导入结果 */}
            {importResult && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg animate-slide-up">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800">
                    导入成功，共 {importResult.total} 条数据
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {importResult.issues.map((issue) => (
                    <div key={issue.type} className="p-2 bg-white rounded text-center">
                      <div className="text-2xl font-bold text-amber-600">{issue.count}</div>
                      <div className="text-xs text-gray-600">{issue.type}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => navigate('/analysis')}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    前往分析
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 数据格式说明 */}
          <div className="card p-6">
            <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-navy-600" />
              数据格式说明
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>导入的文件应包含以下列（列名可灵活匹配）：</p>
              <table className="w-full mt-3 border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-200">列名</th>
                    <th className="text-left p-2 border border-gray-200">说明</th>
                    <th className="text-left p-2 border border-gray-200">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-200 font-mono-data text-xs">content</td>
                    <td className="p-2 border border-gray-200">样本内容（必填）</td>
                    <td className="p-2 border border-gray-200">用户询问如何办理信用卡...</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-200 font-mono-data text-xs">unit</td>
                    <td className="p-2 border border-gray-200">计量单位</td>
                    <td className="p-2 border border-gray-200">个、条、次、元</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-200 font-mono-data text-xs">annotation_label</td>
                    <td className="p-2 border border-gray-200">人工标注标签</td>
                    <td className="p-2 border border-gray-200">业务咨询、投诉建议</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-200 font-mono-data text-xs">security_label</td>
                    <td className="p-2 border border-gray-200">安全标签</td>
                    <td className="p-2 border border-gray-200">正常、敏感、拒答</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-200 font-mono-data text-xs">remark</td>
                    <td className="p-2 border border-gray-200">备注</td>
                    <td className="p-2 border border-gray-200">张三补录2024-01-15</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右侧：版本管理 */}
        <div className="space-y-6">
          {/* 提示词版本 */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-cn text-lg font-semibold text-navy-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-navy-600" />
                提示词版本
              </h3>
              <button
                onClick={() => setShowNewVersion(!showNewVersion)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 新建版本表单 */}
            {showNewVersion && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg animate-slide-up">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      版本号 *
                    </label>
                    <input
                      type="text"
                      value={newVersion.versionNumber}
                      onChange={(e) => setNewVersion({ ...newVersion, versionNumber: e.target.value })}
                      placeholder="例如: v1.3"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      提示词内容 *
                    </label>
                    <textarea
                      value={newVersion.content}
                      onChange={(e) => setNewVersion({ ...newVersion, content: e.target.value })}
                      placeholder="请输入提示词的主要内容..."
                      className="input text-sm h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      版本说明
                    </label>
                    <input
                      type="text"
                      value={newVersion.remark}
                      onChange={(e) => setNewVersion({ ...newVersion, remark: e.target.value })}
                      placeholder="简要说明此版本..."
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      变更内容（逗号分隔）
                    </label>
                    <input
                      type="text"
                      value={newVersion.changes}
                      onChange={(e) => setNewVersion({ ...newVersion, changes: e.target.value })}
                      placeholder="新增XX规则,调整XX阈值"
                      className="input text-sm"
                    />
                  </div>
                  <button
                    onClick={handleCreateVersion}
                    className="w-full btn btn-primary btn-sm"
                  >
                    创建版本
                  </button>
                </div>
              </div>
            )}

            {/* 版本列表 */}
            <div className="space-y-2">
              {versions.map((version) => {
                const isSelected = selectedVersion === version.versionId;
                const risks = versionManager.detectVersionRisks();
                const hasRisk = risks.some(r => r.versions.includes(version.versionId));

                return (
                  <div
                    key={version.versionId}
                    onClick={() => setSelectedVersion(version.versionId)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-navy-500 bg-navy-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono-data text-sm font-semibold text-navy-900">
                        {version.versionNumber}
                      </span>
                      {hasRisk && (
                        <AlertCircle className="w-4 h-4 text-coral-500" data-tip="存在版本时间线风险" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {dayjs(version.releasedAt).format('YYYY-MM-DD HH:mm')}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {version.content.substring(0, 50)}...
                    </p>
                    {version.changes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {version.changes.slice(0, 2).map((change, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {change}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!selectedVersion && (
              <Alert
                type="warning"
                title="请先选择版本"
                description="导入数据前需要绑定对应的提示词版本，确保结果可追溯。"
                className="mt-4"
              />
            )}

            {selectedVersion && samples.length === 0 && (
              <Alert
                type="info"
                title="版本已绑定"
                description="现在可以拖拽或上传数据文件进行导入。"
                className="mt-4"
              />
            )}
          </div>

          {/* 版本风险检测 */}
          <div className="card p-6">
            <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              版本风险检测
            </h3>
            <div className="space-y-3">
              {(() => {
                const risks = versionManager.detectVersionRisks();
                if (risks.length === 0) {
                  return (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p>版本时间线正常</p>
                    </div>
                  );
                }
                return risks.map((risk, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                      risk.severity === 'error'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <p className="font-medium mb-1">
                      {risk.type === 'late_arrival' && '⚠️ 版本晚到风险'}
                      {risk.type === 'gap' && '⏰ 版本间隔过长'}
                    </p>
                    <p className="text-xs opacity-80">{risk.message}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
