import { useEffect, useState } from 'react';
import {
  Database,
  Upload,
  Terminal,
  Copy,
  Check,
  Play,
  FileText,
  FileSpreadsheet,
  Server,
  Table,
} from 'lucide-react';
import api from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import type { DatabaseStatus, BatchInfo } from '@/types';

export default function DataPage() {
  const { currentBatchId } = useAppStore();
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'scripts' | 'database'>('import');
  const [runningInspection, setRunningInspection] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, batchRes] = await Promise.all([
        api.getDatabaseStatus(),
        api.getBatches(),
      ]);
      setDbStatus(status);
      setBatches(batchRes.items);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileUpload = async (type: 'tide' | 'buoy' | 'equipment', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', file.name);

    try {
      let res;
      if (type === 'tide') {
        res = await api.importTide(formData);
      } else if (type === 'buoy') {
        res = await api.importBuoy(formData);
      } else {
        res = await api.importEquipment(formData);
      }
      alert(`导入成功，共 ${res.count} 条记录`);
      loadData();
    } catch (e) {
      alert('导入失败，请检查文件格式');
    }
  };

  const handleRunInspection = async () => {
    setRunningInspection(true);
    try {
      const res = await api.runInspection(currentBatchId);
      alert(`点检完成：检测到 ${res.conflictCount} 处冲突，${res.riskCount} 条风险记录`);
      loadData();
    } catch (e) {
      alert('点检运行失败');
    } finally {
      setRunningInspection(false);
    }
  };

  const curlExamples = [
    {
      key: 'health',
      title: '1. 健康检查',
      code: 'curl http://localhost:3001/api/health',
    },
    {
      key: 'import-tide',
      title: '2. 导入潮汐表数据',
      code: `curl -X POST http://localhost:3001/api/import/tide \\\n  -F "file=@tide_table.csv" \\\n  -F "source=tide_table_2026_06.csv" \\\n  -F "remark=6月潮汐预报数据"`,
    },
    {
      key: 'import-buoy',
      title: '3. 导入浮标数据',
      code: `curl -X POST http://localhost:3001/api/import/buoy \\\n  -F "file=@buoy_data.csv" \\\n  -F "source=buoy_station_01.csv"`,
    },
    {
      key: 'run-inspection',
      title: '4. 运行点检计算',
      code: `curl -X POST http://localhost:3001/api/import/run-inspection \\\n  -H "Content-Type: application/json" \\\n  -d '{"batchId": "batch_2026_06_12"}'`,
    },
    {
      key: 'get-conflicts',
      title: '5. 查询数据冲突',
      code: `curl "http://localhost:3001/api/conflicts?severity=high&pageSize=10`,
    },
    {
      key: 'get-risks',
      title: '6. 查询风险分层',
      code: `curl "http://localhost:3001/api/risks?level=high"`,
    },
    {
      key: 'db-status',
      title: '7. 查看数据库状态',
      code: 'curl http://localhost:3001/api/database/status',
    },
    {
      key: 'gen-report',
      title: '8. 生成报告',
      code: `curl -X POST http://localhost:3001/api/reports/generate \\\n  -H "Content-Type: application/json" \\\n  -d '{"batchId": "batch_2026_06_12", "format": "pdf"}'`,
    },
  ];

  const shellScript = String.raw`#!/bin/bash
# 离岸平台设备点检 - 一键跑批脚本
# 使用方法：./run_inspection.sh [潮汐表CSV] [浮标数据CSV]

set -e

API_BASE="http://localhost:3001/api"

echo "======================================"
echo "  离岸平台设备点检 - 批处理脚本"
echo "======================================"
echo ""

# 1. 导入潮汐表
if [ -f "$1" ]; then
  echo "[1/5] 导入潮汐表数据: $1"
  TIDE_RESULT=$(curl -s -X POST "$API_BASE/import/tide" \
    -F "file=@$1" \
    -F "source=$(basename "$1")")
  TIDE_COUNT=$(echo "$TIDE_RESULT" | grep -o '"count":[0-9]*' | cut -d: -f2)
  BATCH_ID=$(echo "$TIDE_RESULT" | grep -o '"batchId":"[^"]*"' | cut -d'"' -f4)
  echo "      导入记录: $TIDE_COUNT 条"
  echo "      批次ID: $BATCH_ID"
else
  echo "[1/5] 跳过潮汐表导入（使用示例数据）"
  BATCH_ID="batch_2026_06_12"
fi

echo ""

# 2. 导入浮标数据
if [ -f "$2" ]; then
  echo "[2/5] 导入浮标数据: $2"
  BUOY_RESULT=$(curl -s -X POST "$API_BASE/import/buoy" \
    -F "file=@$2" \
    -F "source=$(basename "$2")")
  BUOY_COUNT=$(echo "$BUOY_RESULT" | grep -o '"count":[0-9]*' | cut -d: -f2)
  echo "      导入记录: $BUOY_COUNT 条"
else
  echo "[2/5] 跳过浮标数据导入（使用示例数据）"
fi

echo ""

# 3. 运行点检计算
echo "[3/5] 运行点检计算..."
INSPECT_RESULT=$(curl -s -X POST "$API_BASE/import/run-inspection" \
  -H "Content-Type: application/json" \
  -d "{\"batchId\": \"$BATCH_ID\"}")

CONFLICT_COUNT=$(echo "$INSPECT_RESULT" | grep -o '"conflictCount":[0-9]*' | cut -d: -f2)
RISK_COUNT=$(echo "$INSPECT_RESULT" | grep -o '"riskCount":[0-9]*' | cut -d: -f2)
echo "      数据冲突: $CONFLICT_COUNT 处"
echo "      风险记录: $RISK_COUNT 条"

echo ""

# 4. 风险概览
echo "[4/5] 风险分层概览..."
RISK_OVERVIEW=$(curl -s "$API_BASE/risks/overview?batchId=$BATCH_ID")
HIGH=$(echo "$RISK_OVERVIEW" | grep -o '"high":[0-9]*' | cut -d: -f2)
MEDIUM=$(echo "$RISK_OVERVIEW" | grep -o '"medium":[0-9]*' | cut -d: -f2)
LOW=$(echo "$RISK_OVERVIEW" | grep -o '"low":[0-9]*' | cut -d: -f2)
echo "      高风险: $HIGH 台"
echo "      中风险: $MEDIUM 台"
echo "      低风险: $LOW 台"

echo ""

# 5. 生成报告
echo "[5/5] 生成点检报告..."
REPORT_RESULT=$(curl -s -X POST "$API_BASE/reports/generate" \
  -H "Content-Type: application/json" \
  -d "{\"batchId\": \"$BATCH_ID\", \"format\": \"pdf\"}")

REPORT_ID=$(echo "$REPORT_RESULT" | grep -o '"reportId":"[^"]*"' | cut -d'"' -f4)
REPORT_TITLE=$(echo "$REPORT_RESULT" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
echo "      报告ID: $REPORT_ID"
echo "      报告标题: $REPORT_TITLE"

echo ""
echo "======================================"
echo "  点检完成！"
echo "======================================"
echo ""
echo "  访问 http://localhost:5173 查看详情"
echo "  数据管理页: http://localhost:5173/data"
echo "  冲突中心: http://localhost:5173/conflicts"
echo ""
`;

  const csvExample = `设备ID,时间,潮位(m)
eq_001,2026-06-12 00:00:00,2.45
eq_001,2026-06-12 06:00:00,1.82
eq_001,2026-06-12 12:00:00,3.12
eq_001,2026-06-12 18:00:00,2.05
eq_002,2026-06-12 00:00:00,2.67
eq_002,2026-06-12 06:00:00,1.95
eq_002,2026-06-12 12:00:00,3.34
eq_002,2026-06-12 18:00:00,2.21
`;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Database className="w-7 h-7 text-teal-glow-400" />
            数据管理
          </h1>
          <p className="text-sm text-ocean-200/50 mt-1">
            数据导入、脚本示例、数据库状态
          </p>
        </div>
        <button
          onClick={handleRunInspection}
          disabled={runningInspection}
          className="btn-primary px-5 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {runningInspection ? '运行中...' : '运行点检计算'}
        </button>
      </div>

      <div className="flex rounded-lg bg-ocean-700/50 p-1 w-fit">
        {(['import', 'scripts', 'database'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              activeTab === tab
                ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                : 'text-ocean-200/60 hover:text-white'
            }`}
          >
            {tab === 'import' ? '数据导入' : tab === 'scripts' ? '脚本示例' : '数据库状态'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UploadCard
            icon={FileText}
            title="潮汐表数据"
            description="支持 CSV 格式，包含设备ID、时间、潮位"
            accept=".csv"
            onUpload={(file) => handleFileUpload('tide', file)}
          />
          <UploadCard
            icon={FileSpreadsheet}
            title="浮标数据"
            description="支持 CSV 格式，包含潮位、浪高、风速"
            accept=".csv"
            onUpload={(file) => handleFileUpload('buoy', file)}
          />
          <UploadCard
            icon={Server}
            title="设备清单"
            description="支持 CSV 格式，设备基础信息导入"
            accept=".csv"
            onUpload={(file) => handleFileUpload('equipment', file)}
          />
        </div>
      )}

      {activeTab === 'import' && (
        <div className="card-ocean rounded-lg p-5">
          <h3 className="text-base font-medium text-white mb-4">CSV 数据格式示例</h3>
          <div className="relative">
            <pre className="p-4 rounded bg-ocean-900/80 text-sm font-mono text-ocean-100/70 overflow-x-auto">
              {csvExample}
            </pre>
            <button
              onClick={() => copyText(csvExample, 'csv-example')}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-ocean-700 text-ocean-200/50 hover:text-white transition-colors"
              title="复制"
            >
              {copied === 'csv-example' ? <Check className="w-4 h-4 text-risk-low" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'scripts' && (
        <div className="space-y-4">
          <div className="card-ocean rounded-lg p-5">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-teal-glow-400" />
              curl 命令示例
            </h3>
            <div className="space-y-4">
              {curlExamples.map((example) => (
              <div key={example.key} className="relative">
              <div className="text-sm text-ocean-200/60 mb-2">{example.title}</div>
              <pre className="p-4 rounded bg-ocean-900/80 text-sm font-mono text-ocean-100/70 overflow-x-auto">
                {example.code}
              </pre>
              <button
                onClick={() => copyText(example.code, example.key)}
                className="absolute top-8 right-3 p-1.5 rounded hover:bg-ocean-700 text-ocean-200/50 hover:text-white transition-colors"
                title="复制"
              >
                {copied === example.key ? <Check className="w-4 h-4 text-risk-low" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
            </div>
          </div>

          <div className="card-ocean rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-teal-glow-400" />
                Shell 脚本（一键跑批）
              </h3>
              <button
                onClick={() => copyText(shellScript, 'shell-script')}
                className="text-sm text-teal-glow-400 hover:text-teal-glow-300 flex items-center gap-1"
              >
                {copied === 'shell-script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'shell-script' ? '已复制' : '复制脚本'}
              </button>
            </div>
            <pre className="p-4 rounded bg-ocean-900/80 text-sm font-mono text-ocean-100/70 overflow-x-auto max-h-96">
              {shellScript}
            </pre>
            <p className="text-xs text-ocean-200/40 mt-3">
              保存为 run_inspection.sh，添加执行权限后运行。从空目录一键跑通整个点检流程
            </p>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-ocean rounded-lg p-5">
              <div className="text-sm text-ocean-200/50">数据库文件</div>
              <div className="text-lg font-mono text-white mt-2">
                {dbStatus?.databasePath || '--'}
              </div>
            </div>
            <div className="card-ocean rounded-lg p-5">
              <div className="text-sm text-ocean-200/50">总记录数</div>
              <div className="text-2xl font-mono text-teal-glow-400 mt-1">
                {dbStatus?.totalRecords.toLocaleString() || 0}
              </div>
            </div>
            <div className="card-ocean rounded-lg p-5">
              <div className="text-sm text-ocean-200/50">最近批次</div>
              <div className="text-lg text-white mt-2 truncate">
                {dbStatus?.latestBatch || '--'}
              </div>
            </div>
          </div>

          <div className="card-ocean rounded-lg p-5">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Table className="w-5 h-5 text-teal-glow-400" />
              数据表统计
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dbStatus?.tables.map((table) => (
                <div
                  key={table.name}
                  className="p-4 rounded bg-ocean-700/30 border border-teal-glow-500/10"
                >
                  <div className="text-xs text-ocean-200/50">{table.name}</div>
                  <div className="text-xl font-mono text-white mt-1">
                    {table.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-ocean rounded-lg p-5">
            <h3 className="text-base font-medium text-white mb-4">最近批次</h3>
            <div className="space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className={`p-4 rounded border ${
                    batch.id === currentBatchId
                      ? 'border-teal-glow-500/30 bg-teal-glow-500/5'
                      : 'border-teal-glow-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{batch.name}</span>
                      <span className="text-xs text-ocean-200/40 ml-3 font-mono">
                        {batch.id}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      batch.status === 'completed'
                        ? 'bg-data-status-available/15 text-data-status-available'
                        : 'bg-data-status-pending/15 text-data-status-pending'
                    }`}>
                      {batch.status === 'completed' ? '已完成' : '处理中'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-ocean-200/40">
                      完整度 {(batch.dataCompleteness * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-ocean-200/30">
                      {batch.createdAt?.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadCard({
  icon: Icon,
  title,
  description,
  accept,
  onUpload,
}: {
  icon: any;
  title: string;
  description: string;
  accept: string;
  onUpload: (file: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`card-ocean rounded-lg p-6 text-center cursor-pointer transition-all ${
        dragOver ? 'border-teal-glow-500/50 bg-teal-glow-500/5' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-lg bg-teal-glow-500/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-teal-glow-400" />
      </div>
      <h3 className="text-white font-medium">{title}</h3>
      <p className="text-sm text-ocean-200/50 mt-1">{description}</p>

      <label className="mt-4 btn-secondary px-4 py-2 rounded text-sm inline-flex items-center gap-2 cursor-pointer">
        <Upload className="w-4 h-4" />
        选择文件
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      <p className="text-xs text-ocean-200/30 mt-3">
        拖拽文件到此处或点击上传
      </p>
    </div>
  );
}
