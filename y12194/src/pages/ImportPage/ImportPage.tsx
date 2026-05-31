import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Sparkles, FolderOpen, Eye } from 'lucide-react';
import { useChartStore } from '../../store/useChartStore';
import { sampleCharts, getAllSampleNames } from '../../mock/sampleCharts';
import { cn } from '../../utils';
import { ProjectSidebar } from '../../components/ProjectSidebar/ProjectSidebar';

const sampleLabels: Record<string, string> = {
  normal: '✅ 正常谱面',
  timingOffset: '⚠️ 音画偏移',
  withBadLines: '❌ 包含坏行',
  denseChord: '🎹 双押过密',
  holdMiss: '⏱️ 长按漏判',
};

export const ImportPage = () => {
  const navigate = useNavigate();
  const { createProject, setCurrentProject } = useChartStore();
  const [isDragging, setIsDragging] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const project = createProject(file.name.replace(/\.[^/.]+$/, ''), file.name, content);
        setCurrentProject(project.id);
      };
      reader.readAsText(file);
    });
  }, [createProject, setCurrentProject]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleSampleImport = (key: keyof typeof sampleCharts) => {
    const sample = sampleCharts[key];
    const project = createProject(sample.name, sample.fileName, sample.content);
    setCurrentProject(project.id);
  };

  const handleSamplePreview = (key: keyof typeof sampleCharts) => {
    const sample = sampleCharts[key];
    setPreviewContent(sample.content);
    setPreviewName(sample.name);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ProjectSidebar />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">谱面导入</h1>
            <p className="text-slate-400">上传谱面文件或选择内置样例开始质检流程</p>
          </div>

          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 mb-8',
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">拖拽谱面文件到这里</h3>
            <p className="text-slate-400 mb-6">支持 .txt, .osu, .sm, .bms 等格式</p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-colors">
              <FolderOpen className="w-5 h-5" />
              选择文件
              <input
                type="file"
                multiple
                accept=".txt,.osu,.sm,.bms"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </label>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">内置样例</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getAllSampleNames().map(key => (
                <div
                  key={key}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                      <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{sampleLabels[key]}</h4>
                      <p className="text-xs text-slate-500">{sampleCharts[key].fileName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSampleImport(key)}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                    >
                      导入
                    </button>
                    <button
                      onClick={() => handleSamplePreview(key)}
                      className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {previewContent && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300">预览: {previewName}</h3>
                <button
                  onClick={() => setPreviewContent(null)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  关闭
                </button>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                  {previewContent}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-2">💡 提示</h3>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• 选择"音画偏移"样例可以看到失败路径的高亮展示</li>
              <li>• 选择"包含坏行"样例可以测试坏行检测和人工修正功能</li>
              <li>• 所有操作痕迹都会被记录，支持完整流程追溯</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
