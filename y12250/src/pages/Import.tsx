import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, FileJson, Play, Database } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { POSITIONS } from '../data/positions';
import type { Position } from '../engine/types';

export default function Import() {
  const navigate = useNavigate();
  const { saveCustomPosition, customPositions } = useGameStore();
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importedPosition, setImportedPosition] = useState<Position | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        validateAndImport(data);
      } catch (err) {
        setImportStatus('error');
        setErrorMessage('JSON格式解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const validateAndImport = (data: any) => {
    const requiredFields = ['id', 'source', 'version', 'debtAmount', 'debtAsset', 'collaterals', 'oracle'];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      setImportStatus('error');
      setErrorMessage(`缺少必填字段: ${missingFields.join(', ')}`);
      return;
    }

    if (!Array.isArray(data.collaterals) || data.collaterals.length === 0) {
      setImportStatus('error');
      setErrorMessage('collaterals 必须是非空数组');
      return;
    }

    if (!data.oracle || !data.oracle.price || !data.oracle.asset) {
      setImportStatus('error');
      setErrorMessage('oracle 数据不完整，需要 asset 和 price 字段');
      return;
    }

    const position: Position = {
      id: data.id,
      source: data.source,
      version: data.version,
      debtAmount: Number(data.debtAmount),
      debtAsset: data.debtAsset,
      collaterals: data.collaterals.map((c: any) => ({
        id: c.id || `col-${Date.now()}-${Math.random()}`,
        asset: c.asset,
        amount: Number(c.amount),
        source: c.source || data.source,
        version: c.version || data.version,
      })),
      oracle: {
        id: data.oracle.id || `oracle-${Date.now()}`,
        asset: data.oracle.asset,
        price: Number(data.oracle.price),
        source: data.oracle.source || 'Unknown',
        version: data.oracle.version || 'v1.0',
        volatility: Number(data.oracle.volatility) || 0.15,
      },
      createdAt: data.createdAt || Date.now(),
    };

    setImportedPosition(position);
    saveCustomPosition(position);
    setImportStatus('success');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          validateAndImport(data);
        } catch (err) {
          setImportStatus('error');
          setErrorMessage('JSON格式解析失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    }
  };

  const allPositions = [...POSITIONS, ...customPositions];

  return (
    <div className="min-h-screen bg-defi-bg">
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-defi-text mb-8 flex items-center gap-3">
          <Database className="text-defi-purple" size={32} />
          借贷仓位数据导入
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <div
              className="card border-2 border-dashed border-defi-border hover:border-defi-accent/50 transition-colors p-8 text-center cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileJson size={48} className="mx-auto text-defi-text-muted mb-4" />
              <p className="text-defi-text mb-2">拖放JSON文件到这里</p>
              <p className="text-defi-text-muted text-sm">或点击选择文件</p>
              <p className="text-defi-text-muted text-xs mt-4">
                支持标准借贷仓位JSON格式
              </p>
            </div>

            {importStatus === 'success' && importedPosition && (
              <div className="card border-defi-success/30 mt-4 animate-slide-up">
                <div className="flex items-center gap-2 text-defi-success mb-3">
                  <CheckCircle size={20} />
                  <span className="font-medium">导入成功</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-defi-text-muted">仓位ID</span>
                    <span className="font-mono">{importedPosition.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-defi-text-muted">来源</span>
                    <span className="font-mono">{importedPosition.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-defi-text-muted">债务</span>
                    <span className="font-mono">
                      {importedPosition.debtAmount} {importedPosition.debtAsset}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="card border-defi-danger/30 mt-4 animate-slide-up">
                <div className="flex items-center gap-2 text-defi-danger mb-2">
                  <AlertCircle size={20} />
                  <span className="font-medium">导入失败</span>
                </div>
                <p className="text-sm text-defi-text-muted">{errorMessage}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-medium text-defi-text mb-4">JSON格式示例</h3>
            <pre className="bg-defi-bg-light rounded-lg p-4 text-xs overflow-auto scrollbar-thin max-h-80 font-mono text-defi-accent">
{`{
  "id": "pos-custom-001",
  "source": "自定义导入",
  "version": "v1.0",
  "debtAmount": 10000,
  "debtAsset": "USDC",
  "collaterals": [
    {
      "id": "col-001",
      "asset": "ETH",
      "amount": 5,
      "source": "自定义",
      "version": "v1.0"
    }
  ],
  "oracle": {
    "id": "oracle-001",
    "asset": "ETH",
    "price": 3000,
    "source": "Chainlink",
    "version": "v0.8",
    "volatility": 0.15
  }
}`}
            </pre>
            <p className="text-xs text-defi-text-muted mt-4">
              提示：导入的数据将保留来源和版本信息，方便后续复核。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-defi-text mb-4">可用借贷仓位</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {allPositions.map((position) => {
              const initialCollateralValue = position.collaterals.reduce(
                (sum, c) => sum + c.amount * position.oracle.price,
                0
              );
              const initialRatio = (initialCollateralValue / position.debtAmount) * 100;

              return (
                <div key={position.id} className="card hover:border-defi-accent/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-defi-purple/20 text-defi-purple rounded text-xs">
                          {position.source}
                        </span>
                        <span className="text-xs text-defi-text-muted">
                          {position.version}
                        </span>
                      </div>
                      <h3 className="font-medium text-defi-text">{position.id}</h3>
                    </div>
                    <button
                      onClick={() => {
                        alert('自定义关卡功能开发中，请使用预设关卡体验游戏');
                      }}
                      className="flex items-center gap-1 btn-primary text-sm"
                    >
                      <Play size={14} fill="currentColor" />
                      使用
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div className="bg-defi-bg-light rounded p-2">
                      <div className="text-defi-text-muted text-xs">债务</div>
                      <div className="font-mono">
                        {position.debtAmount} {position.debtAsset}
                      </div>
                    </div>
                    <div className="bg-defi-bg-light rounded p-2">
                      <div className="text-defi-text-muted text-xs">初始抵押率</div>
                      <div className="font-mono text-defi-success">
                        {initialRatio.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-defi-text-muted border-t border-defi-border pt-3">
                    <div className="flex justify-between mb-1">
                      <span>抵押物</span>
                      <span className="font-mono">
                        {position.collaterals.map((c) => `${c.amount} ${c.asset}`).join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>预言机</span>
                      <span className="font-mono">
                        ${position.oracle.price} ({position.oracle.source})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
