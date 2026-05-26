import { useRef } from 'react';
import { Upload, Download, RefreshCw, BarChart3, Database, Zap, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNetworkStore } from '../../store/networkStore';

export const TopToolbar = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    loadMockData, 
    exportJSON, 
    importData, 
    resetFilters,
    setShowReport,
    getStats,
    isLoading,
  } = useNetworkStore();

  const stats = getStats();

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          importData(data);
        } catch (err) {
          console.error('Failed to parse JSON:', err);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="flex items-center justify-between bg-glass-bg backdrop-blur-xl rounded-2xl border border-glass-border px-6 py-3 shadow-neon-cyan">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-orbitron text-lg font-bold text-white tracking-wider">
                Web3 交易星图
              </h1>
              <p className="text-xs text-gray-400 font-mono">Transaction Network Analyzer</p>
            </div>
          </div>

          <div className="h-8 w-px bg-glass-border mx-4" />

          <div className="flex items-center gap-6">
            <StatBadge 
              label="节点" 
              value={stats.totalNodes} 
              color="text-neon-cyan" 
              icon={<Database className="w-4 h-4" />} 
            />
            <StatBadge 
              label="连接" 
              value={stats.totalEdges} 
              color="text-neon-purple" 
              icon={<Zap className="w-4 h-4" />} 
            />
            <StatBadge 
              label="异常" 
              value={stats.anomalies} 
              color="text-neon-red" 
              icon={<BarChart3 className="w-4 h-4" />} 
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <ToolbarButton
            icon={<Upload className="w-4 h-4" />}
            label="导入"
            onClick={() => fileInputRef.current?.click()}
          />
          <ToolbarButton
            icon={<Download className="w-4 h-4" />}
            label="导出JSON"
            onClick={handleExport}
          />
          <ToolbarButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="加载示例"
            onClick={loadMockData}
            loading={isLoading}
          />
          <ToolbarButton
            icon={<RotateCcw className="w-4 h-4" />}
            label="重置筛选"
            onClick={resetFilters}
          />
          
          <div className="h-8 w-px bg-glass-border mx-2" />
          
          <ToolbarButton
            icon={<BarChart3 className="w-4 h-4" />}
            label="分析报告"
            onClick={() => setShowReport(true)}
            variant="primary"
          />
        </div>
      </div>
    </motion.div>
  );
};

const StatBadge = ({ 
  label, 
  value, 
  color, 
  icon 
}: { 
  label: string; 
  value: number; 
  color: string; 
  icon: React.ReactNode 
}) => (
  <div className="flex items-center gap-2">
    <span className={color}>{icon}</span>
    <div className="text-left">
      <div className={`font-mono font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

const ToolbarButton = ({
  icon,
  label,
  onClick,
  loading = false,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: 'default' | 'primary';
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    disabled={loading}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm transition-all ${
      variant === 'primary'
        ? 'bg-gradient-to-r from-neon-cyan to-neon-purple text-white shadow-neon-cyan'
        : 'bg-space-blue/50 text-gray-300 hover:text-white hover:bg-space-blue border border-glass-border'
    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : icon}
    {label}
  </motion.button>
);
