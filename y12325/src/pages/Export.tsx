import { useState } from 'react';
import { useFractalStore } from '@/store/fractalStore';
import { exportExperiment } from '@/utils/export';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { Experiment, ExportFormat } from '@/types';
import { 
  Download, 
  FileJson, 
  Image as ImageIcon, 
  FileText,
  CheckCircle,
  Link,
  Eye,
  Layers
} from 'lucide-react';

export default function Export() {
  const { history, currentExperiment } = useFractalStore();
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(currentExperiment);
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>(['json', 'png']);
  const [exportSuccess, setExportSuccess] = useState(false);

  const toggleFormat = (format: ExportFormat) => {
    setExportFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleExport = () => {
    if (!selectedExperiment) return;
    
    const canvas = (window as any).getFractalCanvas?.();
    
    exportFormats.forEach((format) => {
      exportExperiment(format, selectedExperiment, canvas);
    });
    
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const formatConfig = {
    json: {
      label: 'JSON 数据',
      icon: FileJson,
      description: '导出完整的实验数据，包括配置、结果和错误信息',
    },
    png: {
      label: 'PNG 图片',
      icon: ImageIcon,
      description: '导出当前分形图形的高清图片',
    },
    pdf: {
      label: 'PDF 报告',
      icon: FileText,
      description: '导出包含图形、参数和备注的完整报告',
    },
  };

  return (
    <div className="space-y-6">
      <Alert type="info" title="导出说明">
        支持多种格式导出，包含完整的溯源信息：迭代规则、初始图形、分形维度和导出图片的对应关系都将被保留。
      </Alert>

      {exportSuccess && (
        <Alert type="success" title="导出成功">
          文件已开始下载，请检查浏览器下载栏。
        </Alert>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-6">
          <Card title="选择实验" subtitle="选择要导出的分形实验">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无历史实验</p>
                </div>
              ) : (
                history.slice(0, 10).map((experiment) => (
                  <div
                    key={experiment.id}
                    onClick={() => setSelectedExperiment(experiment)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedExperiment?.id === experiment.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{experiment.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(experiment.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      {experiment.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-accent-success" />
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          {experiment.errorType}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <code className="font-mono bg-gray-100 px-1 rounded">
                        {experiment.config.iterationRule}
                      </code>
                      <span>→</span>
                      <span>{experiment.config.initialShape}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-7 space-y-6">
          {selectedExperiment ? (
            <>
              <Card title="导出配置" subtitle="选择导出格式和内容">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    已选择: <span className="font-semibold">{selectedExperiment.name}</span>
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    {(Object.keys(formatConfig) as ExportFormat[]).map((format) => {
                      const config = formatConfig[format];
                      const Icon = config.icon;
                      const isSelected = exportFormats.includes(format);

                      return (
                        <div
                          key={format}
                          onClick={() => toggleFormat(format)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="font-medium">{config.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">{config.description}</p>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-6"
                    icon={<Download className="w-5 h-5" />}
                    onClick={handleExport}
                    disabled={exportFormats.length === 0}
                  >
                    导出 {exportFormats.length} 个文件
                  </Button>
                </div>
              </Card>

              <Card title="溯源详情" subtitle="迭代规则、初始图形与导出图片的对应关系">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-white rounded shadow-sm">
                      <Link className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-2">参数溯源链</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-white px-2 py-1 rounded shadow-sm">
                          <Eye className="w-4 h-4 inline mr-1" />
                          初始图形
                        </span>
                        <span className="text-gray-400">→</span>
                        <code className="bg-white px-2 py-1 rounded shadow-sm font-mono text-xs">
                          {selectedExperiment.config.initialShape}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <span className="bg-white px-2 py-1 rounded shadow-sm">
                          <Eye className="w-4 h-4 inline mr-1" />
                          迭代规则
                        </span>
                        <span className="text-gray-400">→</span>
                        <code className="bg-white px-2 py-1 rounded shadow-sm font-mono text-xs">
                          {selectedExperiment.config.iterationRule || '(空)'}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <span className="bg-white px-2 py-1 rounded shadow-sm">
                          <Eye className="w-4 h-4 inline mr-1" />
                          分形维度
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="bg-white px-2 py-1 rounded shadow-sm font-mono text-xs">
                          {selectedExperiment.fractalDimension?.toFixed(4) || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h5 className="text-sm font-medium mb-3">颜色方案</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">描边色</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border"
                              style={{ backgroundColor: selectedExperiment.config.colorScheme.stroke }}
                            />
                            <code className="font-mono text-xs">
                              {selectedExperiment.config.colorScheme.stroke}
                            </code>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">填充色</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border"
                              style={{ 
                                backgroundColor: selectedExperiment.config.colorScheme.fill.startsWith('#')
                                  ? selectedExperiment.config.colorScheme.fill
                                  : 'transparent'
                              }}
                            />
                            <code className="font-mono text-xs">
                              {selectedExperiment.config.colorScheme.fill}
                            </code>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">背景色</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border"
                              style={{ backgroundColor: selectedExperiment.config.colorScheme.background }}
                            />
                            <code className="font-mono text-xs">
                              {selectedExperiment.config.colorScheme.background}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h5 className="text-sm font-medium mb-3">实验统计</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">迭代次数</span>
                          <span className="font-mono">{selectedExperiment.results.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">创建时间</span>
                          <span className="text-xs">
                            {new Date(selectedExperiment.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">状态</span>
                          <span className={selectedExperiment.status === 'success' ? 'text-accent-success' : 'text-accent-danger'}>
                            {selectedExperiment.status === 'success' ? '成功' : '失败'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedExperiment.config.note && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h5 className="text-sm font-medium text-primary mb-2">课堂备注</h5>
                      <p className="text-sm text-gray-700 italic">
                        "{selectedExperiment.config.note}"
                      </p>
                    </div>
                  )}

                  {selectedExperiment.errorMessage && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h5 className="text-sm font-medium text-accent-danger mb-2">错误信息</h5>
                      <p className="text-sm text-red-700">
                        {selectedExperiment.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Download className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">请从左侧选择一个实验</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
