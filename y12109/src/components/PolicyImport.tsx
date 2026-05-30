import { useState, useRef } from 'react';
import { Upload, FileText, ClipboardPaste, Database } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';

export default function PolicyImport() {
  const { policies, loadSampleData, importCSV, setPolicies } = useSimulationStore();
  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState<'paste' | 'demo'>('demo');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePaste = () => {
    if (!csvText.trim()) return;
    importCSV(csvText);
    setCsvText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      importCSV(text);
    };
    reader.readAsText(file);
  };

  const totalClaims = policies.reduce((s, p) => s + p.claimAmounts.length, 0);
  const totalPremium = policies.reduce((s, p) => s + p.premium, 0);
  const sumInsuredRange = policies.length
    ? `${Math.min(...policies.map(p => p.sumInsured)).toLocaleString()} ~ ${Math.max(...policies.map(p => p.sumInsured)).toLocaleString()}`
    : '-';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">保单样本</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('demo')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'demo' ? 'bg-accent/15 text-accent' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Database className="w-3 h-3 inline mr-1" />
            示例数据
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'paste' ? 'bg-accent/15 text-accent' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ClipboardPaste className="w-3 h-3 inline mr-1" />
            粘贴/上传
          </button>
        </div>
      </div>

      {mode === 'demo' && (
        <button
          onClick={loadSampleData}
          className="w-full py-2.5 rounded-lg border border-surface-200 hover:border-accent/40 hover:bg-accent/5 text-gray-400 hover:text-accent text-sm font-medium transition-all"
        >
          加载 20 条示例保单
        </button>
      )}

      {mode === 'paste' && (
        <div className="space-y-2">
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="粘贴 CSV：id,premium,sumInsured,claimCount,claimAmounts,lineOfBusiness"
            className="w-full h-24 bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-accent/40 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePaste}
              className="flex-1 py-2 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-sm font-medium transition-colors"
            >
              解析导入
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-lg border border-surface-200 hover:border-accent/40 text-gray-400 hover:text-accent text-sm transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              上传文件
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {policies.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">保单数</div>
            <div className="text-lg font-mono font-semibold text-white data-glow">{policies.length}</div>
          </div>
          <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">赔付记录</div>
            <div className="text-lg font-mono font-semibold text-white">{totalClaims}</div>
          </div>
          <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">总保费</div>
            <div className="text-lg font-mono font-semibold text-accent">{(totalPremium / 10000).toFixed(1)}万</div>
          </div>
          <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">保额范围</div>
            <div className="text-sm font-mono font-semibold text-white truncate">{sumInsuredRange}</div>
          </div>
        </div>
      )}

      {policies.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-100">
              <tr className="text-gray-500">
                <th className="px-3 py-1.5 text-left font-medium">ID</th>
                <th className="px-3 py-1.5 text-left font-medium">险种</th>
                <th className="px-3 py-1.5 text-right font-medium">保费</th>
                <th className="px-3 py-1.5 text-right font-medium">保额</th>
                <th className="px-3 py-1.5 text-right font-medium">赔付次数</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-t border-surface-200/50 hover:bg-surface-100/50">
                  <td className="px-3 py-1 font-mono text-accent">{p.id}</td>
                  <td className="px-3 py-1 text-gray-400">{p.lineOfBusiness}</td>
                  <td className="px-3 py-1 text-right font-mono">{p.premium.toLocaleString()}</td>
                  <td className="px-3 py-1 text-right font-mono">{p.sumInsured.toLocaleString()}</td>
                  <td className="px-3 py-1 text-right font-mono">{p.claimCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
