import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, FileSpreadsheet, Map, Download, Play } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { dataSourceTypeLabels } from '../data/mockData';
import { Button, Spin, message } from 'antd';

export default function ImportPage() {
  const { dataSources, isLoading, importData, loadMockData } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请先选择要导入的文件');
      return;
    }
    await importData(selectedFiles);
    setSelectedFiles([]);
    message.success('文件导入成功');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-card p-6">
        <h2 className="font-serif text-xl font-semibold text-ocean-text mb-2">数据导入</h2>
        <p className="text-sm text-ocean-textLight mb-6">
          支持导入颜色规则表、评分表、底图坐标等多口径材料，系统将自动统一处理并标记异常
        </p>

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-ocean-border hover:border-primary-300 hover:bg-ocean-surface'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-ocean-text font-medium mb-2">
              拖拽文件到此处，或
              <span className="text-primary-600 hover:underline"> 点击选择文件</span>
            </p>
            <p className="text-sm text-ocean-textLight">支持 .xlsx, .xls, .csv 格式</p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-ocean-text mb-3">待导入文件 ({selectedFiles.length})</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-ocean-surface rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-ocean-text">{file.name}</p>
                      <p className="text-xs text-ocean-textLight">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-ocean-textLight hover:text-red-500 transition-colors"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button type="primary" onClick={handleImport} loading={isLoading}>
                开始导入
              </Button>
              <Button onClick={() => setSelectedFiles([])}>清空</Button>
            </div>
          </div>
        )}
      </div>

      {dataSources.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-semibold text-ocean-text">已导入数据源</h2>
            <span className="text-sm text-ocean-textLight">共 {dataSources.length} 份材料</span>
          </div>
          <div className="space-y-3">
            {dataSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 border border-ocean-border rounded-lg hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    {source.type === 'color_rule' && <FileText className="w-5 h-5 text-primary-600" />}
                    {source.type === 'score_table' && <FileSpreadsheet className="w-5 h-5 text-primary-600" />}
                    {source.type === 'basemap_coords' && <Map className="w-5 h-5 text-primary-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-ocean-text">{source.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                        {dataSourceTypeLabels[source.type]}
                      </span>
                      <span className="text-xs text-ocean-textLight flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(source.uploadTime).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600">已导入</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif text-xl font-semibold text-ocean-text">样例数据预览</h2>
          </div>
          <span className="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
            包含常见数据问题
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-border">
                <th className="text-left py-3 px-4 font-medium text-ocean-textLight bg-ocean-surface">岸段名称</th>
                <th className="text-left py-3 px-4 font-medium text-ocean-textLight bg-ocean-surface">颜色规则</th>
                <th className="text-left py-3 px-4 font-medium text-ocean-textLight bg-ocean-surface">评分</th>
                <th className="text-left py-3 px-4 font-medium text-ocean-textLight bg-ocean-surface">单位</th>
                <th className="text-left py-3 px-4 font-medium text-ocean-textLight bg-ocean-surface">备注</th>
                <th className="text-left py-3 px-4 font-medium text-ocean-textLight bg-ocean-surface">数据状态</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ocean-border hover:bg-ocean-surface">
                <td className="py-3 px-4 text-ocean-text">渤海湾A段</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: '#FF5722' }}></span>
                    <span className="text-ocean-text">#FF5722</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-ocean-text">85</td>
                <td className="py-3 px-4 text-ocean-text">米</td>
                <td className="py-3 px-4 text-ocean-textLight">数据正常</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">正常</span>
                </td>
              </tr>
              <tr className="border-b border-ocean-border hover:bg-ocean-surface bg-amber-50">
                <td className="py-3 px-4 text-ocean-text">胶州湾北段</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: '#4CAF50' }}></span>
                    <span className="text-ocean-text">#4CAF50</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-ocean-text">92</td>
                <td className="py-3 px-4">
                  <span className="text-red-500 font-medium">（未填写）</span>
                </td>
                <td className="py-3 px-4 text-ocean-textLight italic">补录：2024年2月现场核查数据</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">缺失单位</span>
                </td>
              </tr>
              <tr className="border-b border-ocean-border hover:bg-ocean-surface bg-red-50">
                <td className="py-3 px-4 text-ocean-text">杭州湾南岸</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: '#FF5722' }}></span>
                    <span className="text-ocean-text text-line-through">#FF5722</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-red-600 font-bold">45</td>
                <td className="py-3 px-4 text-ocean-text">公里</td>
                <td className="py-3 px-4 text-ocean-textLight">旧表数据</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">异常</span>
                </td>
              </tr>
              <tr className="border-b border-ocean-border hover:bg-ocean-surface bg-amber-50">
                <td className="py-3 px-4 text-ocean-text">珠江口东侧</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: '#2196F3' }}></span>
                    <span className="text-ocean-text">#2196F3</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-ocean-text">78</td>
                <td className="py-3 px-4 text-ocean-text">米</td>
                <td className="py-3 px-4 text-ocean-textLight">-</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">坐标偏移</span>
                </td>
              </tr>
              <tr className="border-b border-ocean-border hover:bg-ocean-surface bg-red-50">
                <td className="py-3 px-4 text-ocean-text">长江口北支</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: '#9C27B0' }}></span>
                    <span className="text-ocean-text">#9C27B0</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-ocean-text">88</td>
                <td className="py-3 px-4 text-ocean-text">米</td>
                <td className="py-3 px-4 text-ocean-textLight">图层：2023年数据叠加</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">图层遮挡</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-ocean-textLight">
            以上为系统预置的样例数据，展示了日常工作中常见的数据问题类型
          </p>
          <div className="flex gap-2">
            <Button icon={<Download />}>下载样例</Button>
            <Button type="primary" icon={<Play />} onClick={() => loadMockData()}>
              加载样例数据
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
