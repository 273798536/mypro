import { useState, useRef } from 'react';
import { Upload, FileJson, AlertTriangle, CheckCircle, X, RefreshCw, Copy, Layers } from 'lucide-react';
import { useAppStore } from '../store';
import type { Sticker, MergeStrategy } from '../types';

const ImportPage = () => {
  const { importStickers, resolveDuplicate, pendingDuplicates, stickers } = useAppStore();
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; duplicates: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('请上传 JSON 格式的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        let stickersToImport: Sticker[] = [];
        
        if (Array.isArray(data)) {
          stickersToImport = data;
        } else if (data.stickers && Array.isArray(data.stickers)) {
          stickersToImport = data.stickers;
        } else {
          throw new Error('无效的数据格式');
        }

        const duplicates = importStickers(stickersToImport);
        setImportResult({
          success: stickersToImport.length - duplicates.length,
          duplicates: duplicates.length
        });
      } catch (error) {
        alert('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleResolve = (existingId: string, strategy: MergeStrategy, newData: any) => {
    resolveDuplicate(existingId, strategy, newData);
  };

  const generateSampleData = () => {
    const sampleData: Sticker[] = [
      {
        id: 'sample-1',
        type: 'acid',
        label: '腐蚀性酸',
        color: '#F53F3F',
        x: 80,
        y: 80,
        flipped: false,
        originalX: 80,
        originalY: 80,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        verified: true
      },
      {
        id: 'sample-2',
        type: 'flammable',
        label: '易燃物',
        color: '#FF7D00',
        x: 200,
        y: 80,
        flipped: true,
        originalX: 200,
        originalY: 80,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        verified: false
      },
      {
        id: 'sample-3',
        type: 'toxic',
        label: '有毒物',
        color: '#722ED1',
        x: 320,
        y: 80,
        flipped: false,
        originalX: 320,
        originalY: 80,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        verified: true
      }
    ];

    const dataStr = JSON.stringify(sampleData, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
      alert('示例数据已复制到剪贴板');
    });
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-2">数据导入</h2>
        <p className="text-sm text-white/60 mb-6">导入贴纸数据并处理重复项</p>

        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-white/20 hover:border-white/40'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          
          <p className="text-white font-medium mb-2">拖拽 JSON 文件到此处</p>
          <p className="text-white/50 text-sm mb-4">或者点击下方按钮选择文件</p>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FileJson className="w-4 h-4" />
            选择文件
          </button>
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">没有数据文件？</p>
            <button
              onClick={generateSampleData}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary-light"
            >
              <Copy className="w-4 h-4" />
              复制示例数据
            </button>
          </div>
          <p className="text-xs text-white/50">
            您可以创建一个 JSON 文件，按照以下格式导入贴纸数据：
          </p>
          <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-white/60 overflow-auto">
{`[
  {
    "type": "acid",
    "label": "腐蚀性酸",
    "color": "#F53F3F",
    "x": 80,
    "y": 80,
    "flipped": false,
    "originalX": 80,
    "originalY": 80,
    "verified": true
  }
]`}
          </pre>
        </div>

        {importResult && (
          <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm font-medium text-success">导入完成</p>
                <p className="text-xs text-white/60 mt-1">
                  成功导入 {importResult.success} 条数据
                  {importResult.duplicates > 0 && `，发现 ${importResult.duplicates} 条重复数据`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">待处理重复项</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning">
              {pendingDuplicates.length} 条待处理
            </span>
          </div>

          {pendingDuplicates.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
              {pendingDuplicates.map((dup, index) => (
                <div key={index} className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warning">检测到重复数据</p>
                      <p className="text-xs text-white/60 mt-1">
                        现有ID: {dup.existingId.substring(0, 8)}...
                      </p>
                      
                      <div className="mt-2 p-2 bg-black/20 rounded">
                        <p className="text-xs text-white/50 mb-1">差异项:</p>
                        <ul className="text-xs text-white/70 space-y-0.5">
                          {dup.differences.map((diff, i) => (
                            <li key={i}>• {diff}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleResolve(dup.existingId, 'overwrite', dup.newData)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          覆盖现有
                        </button>
                        <button
                          onClick={() => handleResolve(dup.existingId, 'new_version', dup.newData)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 text-xs transition-colors"
                        >
                          <Layers className="w-3 h-3" />
                          新建版本
                        </button>
                        <button
                          onClick={() => handleResolve(dup.existingId, 'skip', dup.newData)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 text-xs transition-colors"
                        >
                          <X className="w-3 h-3" />
                          跳过
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-success/30 mb-3" />
              <p className="text-white/40">暂无待处理重复项</p>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">当前数据概览</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-white/60">贴纸总数</p>
              <p className="text-2xl font-bold text-white mt-1">{stickers.length}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-white/60">已验证</p>
              <p className="text-2xl font-bold text-success mt-1">
                {stickers.filter(s => s.verified).length}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-white/60">已翻转</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {stickers.filter(s => s.flipped).length}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-white/60">待确认</p>
              <p className="text-2xl font-bold text-warning mt-1">
                {stickers.filter(s => !s.verified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-3">导入说明</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              系统会根据「类型 + 原始坐标」检测重复数据
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              重复数据可选择「覆盖」「新建版本」或「跳过」
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              每条导入数据都会建立完整的追溯链条
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              支持直接从结算页面导出的 JSON 文件导入
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
