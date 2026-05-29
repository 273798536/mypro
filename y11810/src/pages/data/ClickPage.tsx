import { useState, useEffect } from 'react';
import { Upload, Search } from 'lucide-react';
import type { ClickLog } from '@/../../shared/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FileUpload } from '@/components/common/FileUpload';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Alert } from '@/components/common/Alert';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getClicks, importClicks, checkClickMissing } from '@/api/data';
import { getChannels } from '@/api/channel';
import type { Channel } from '@/../../shared/types';

export default function ClickPage() {
  const [clicks, setClicks] = useState<ClickLog[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  } | null>(null);
  const [filters, setFilters] = useState({
    channelId: '',
    startDate: '',
    endDate: '',
    isAnomaly: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      };
      if (filters.isAnomaly !== '') {
        params.isAnomaly = filters.isAnomaly === 'true';
      }
      const res = await getClicks(params);
      setClicks(res.items);
      setPagination((prev) => ({ ...prev, total: res.total }));
    } catch (error) {
      console.error('Failed to load clicks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const res = await getChannels({ page: 1, pageSize: 100 });
      setChannels(res.items);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, filters]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      await importClicks(data);
      setImportDialogOpen(false);
      setSelectedFile(null);
      setAlert({ type: 'success', title: '导入成功' });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to import:', error);
      setAlert({ type: 'error', title: '导入失败', description: '请检查文件格式' });
    } finally {
      setImporting(false);
    }
  };

  const handleCheckMissing = async () => {
    if (!filters.channelId || !filters.startDate || !filters.endDate) {
      setAlert({
        type: 'warning',
        title: '请先选择筛选条件',
        description: '缺失检测需要指定渠道和日期范围',
      });
      return;
    }
    try {
      const res = await checkClickMissing(filters.channelId, filters.startDate, filters.endDate);
      const missingRate = ((res.missingCount / res.impressionCount) * 100).toFixed(2);
      let suggestion = '';
      if (res.missingCount === 0) {
        suggestion = '数据完整，无需处理';
      } else if (res.missingCount < 10) {
        suggestion = '缺失量较小，建议检查点击上报逻辑';
      } else {
        suggestion = '缺失量较大，建议立即排查埋点和网络问题';
      }
      setAlert({
        type: res.missingCount > 0 ? 'warning' : 'success',
        title: `缺失检测完成`,
        description: `曝光量: ${res.impressionCount}, 点击量: ${res.clickCount}, 缺失量: ${res.missingCount}, 缺失率: ${missingRate}%。建议: ${suggestion}`,
      });
    } catch (error) {
      console.error('Failed to check missing:', error);
      setAlert({ type: 'error', title: '检测失败', description: '请稍后重试' });
    }
  };

  const columns: Column<ClickLog>[] = [
    {
      key: 'clickTime',
      title: '时间',
      width: 180,
      render: (row) => new Date(row.clickTime).toLocaleString(),
    },
    {
      key: 'channelId',
      title: '渠道',
      width: 150,
      render: (row) => {
        const channel = channels.find((c) => c.id === row.channelId);
        return channel?.name || row.channelId;
      },
    },
    { key: 'requestId', title: 'RequestID', width: 200 },
    { key: 'ip', title: 'IP', width: 130 },
    {
      key: 'isAnomaly',
      title: '是否异常',
      width: 100,
      render: (row) => (
        <StatusBadge status={row.isAnomaly ? 'error' : 'success'}>
          {row.isAnomaly ? '是' : '否'}
        </StatusBadge>
      ),
    },
    { key: 'anomalyReason', title: '异常原因' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="点击日志" description="查看、导入点击记录和缺失检测">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckMissing}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            缺失检测
          </button>
          <button
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            导入数据
          </button>
        </div>
      </PageHeader>

      {alert && (
        <Alert
          type={alert.type}
          title={alert.title}
          description={alert.description}
          closable
        />
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-gray-600">渠道:</label>
          <select
            value={filters.channelId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, channelId: e.target.value }))
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">全部</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-gray-600">开始日期:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, startDate: e.target.value }))
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-gray-600">结束日期:</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-gray-600">是否异常:</label>
          <select
            value={filters.isAnomaly}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, isAnomaly: e.target.value }))
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">全部</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </div>
        <button
          onClick={() =>
            setFilters({ channelId: '', startDate: '', endDate: '', isAnomaly: '' })
          }
          className="text-[13px] text-gray-500 hover:text-gray-700"
        >
          重置
        </button>
      </div>

      <DataTable
        columns={columns}
        data={clicks}
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) =>
          setPagination((prev) => ({ ...prev, current: page, pageSize }))
        }
      />

      <ConfirmDialog
        open={importDialogOpen}
        title="导入点击数据"
        onConfirm={handleImport}
        onCancel={() => {
          setImportDialogOpen(false);
          setSelectedFile(null);
        }}
        confirmText={importing ? '导入中...' : '确认导入'}
        content={
          <div className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".json"
              label="拖拽点击数据文件到此处，或点击选择"
              description="支持 JSON 格式，大小不超过 10MB"
            />
          </div>
        }
      />
    </div>
  );
}
