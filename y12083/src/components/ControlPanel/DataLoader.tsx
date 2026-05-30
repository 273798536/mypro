import { useRef, useState } from 'react';
import { Upload, FileJson, Database } from 'lucide-react';
import { useDataLoader } from '../../hooks/useDataLoader';

const SAMPLE_OPTIONS = [
  { id: 'normal', name: '正常数据', description: '标准姿态数据，无异常' },
  { id: 'gimbal-lock', name: '万向节锁数据', description: '包含万向节锁场景的演示数据' },
  { id: 'dirty', name: '脏数据', description: '包含缺字段、坐标轴晚到的不完美数据' },
  { id: 'axis-reverse', name: '坐标轴反向', description: '包含坐标轴反向问题的演示数据' },
] as const;

export const DataLoader = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadFromFileInput, loadSampleData } = useDataLoader();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading('file');
    setError(null);

    try {
      const success = await loadFromFileInput(file);
      if (!success) {
        setError('文件加载失败，请检查JSON格式');
      }
    } catch (err) {
      setError('文件读取失败');
    } finally {
      setLoading(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSampleLoad = async (sampleId: (typeof SAMPLE_OPTIONS)[number]['id']) => {
    setLoading(sampleId);
    setError(null);

    try {
      const success = await loadSampleData(sampleId);
      if (!success) {
        setError('样例数据加载失败');
      }
    } catch (err) {
      setError('样例数据加载失败');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Database size={18} style={{ color: '#1890ff' }} />
        <h3 className="text-sm font-bold" style={{ color: '#e8f4ff' }}>
          数据加载
        </h3>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded border-2 border-dashed transition-colors hover:bg-blue-500/10 disabled:opacity-50"
          style={{
            borderColor: '#1e3a5f',
            color: '#e8f4ff',
          }}
        >
          <Upload size={18} />
          <span className="text-sm">
            {loading === 'file' ? '加载中...' : '选择JSON数据文件'}
          </span>
        </button>
        <p className="text-xs mt-1 opacity-60" style={{ color: '#64748b' }}>
          支持本地JSON格式的姿态数据文件
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: '#1e3a5f' }} />
        </div>
        <div className="relative flex justify-center">
          <span className="px-2 text-xs" style={{ backgroundColor: '#0f172a', color: '#64748b' }}>
            或加载样例数据
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SAMPLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSampleLoad(option.id)}
            disabled={loading !== null}
            className="flex flex-col items-start gap-1 p-3 rounded border text-left transition-all hover:bg-blue-500/10 hover:border-blue-500/50 disabled:opacity-50"
            style={{
              borderColor: '#1e3a5f',
              backgroundColor: loading === option.id ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <FileJson size={14} style={{ color: '#1890ff' }} />
              <span className="text-xs font-medium" style={{ color: '#e8f4ff' }}>
                {option.name}
              </span>
            </div>
            <span className="text-xs opacity-60" style={{ color: '#64748b' }}>
              {option.description}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div
          className="p-2 rounded text-xs"
          style={{
            backgroundColor: 'rgba(255, 77, 79, 0.1)',
            border: '1px solid #ff4d4f',
            color: '#ff4d4f',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
