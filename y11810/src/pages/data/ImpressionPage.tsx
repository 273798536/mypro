import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import type { ImpressionLog } from '@/../../shared/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FileUpload } from '@/components/common/FileUpload';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Alert } from '@/components/common/Alert';
import { getImpressions, importImpressions } from '@/api/data';
import { getChannels } from '@/api/channel';
import type { Channel } from '@/../../shared/types';

export default function ImpressionPage() {
  const [impressions, setImpressions] = useState<ImpressionLog[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filters, setFilters] = useState({
    channelId: '',
    startDate: '',
    endDate: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getImpressions({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setImpressions(res.items);
      setPagination((prev) => ({ ...prev, total: res.total }));
    } catch (error) {
      console.error('Failed to load impressions:', error);
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
      await importImpressions(data);
      setImportDialogOpen(false);
      setSelectedFile(null);
      setAlert({ type: 'success', message: '导入成功' });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to import:', error);
      setAlert({ type: 'error', message: '导入失败，请检查文件格式' });
    } finally {
      setImporting(false);
    }
  };

  const columns: Column<ImpressionLog>[] = [
    {
      key: 'impressionTime',
      title: '时间',
      width: 180,
      render: (row) => new Date(row.impressionTime).toLocaleString(),
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
    { key: 'userAgent', title: 'UA' },
    {
      key: 'action',
      title: '操作',
      width: 100,
      render: () => (
        <button className="text-[13px] text-primary hover:text-primary/80">
          详情
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="曝光日志" description="查看和导入曝光记录数据">
        <button
          onClick={() => setImportDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          导入数据
        </button>
      </PageHeader>

      {alert && (
        <Alert
          type={alert.type}
          title={alert.type === 'success' ? '成功' : '错误'}
          description={alert.message}
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
        <button
          onClick={() => setFilters({ channelId: '', startDate: '', endDate: '' })}
          className="text-[13px] text-gray-500 hover:text-gray-700"
        >
          重置
        </button>
      </div>

      <DataTable
        columns={columns}
        data={impressions}
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) =>
          setPagination((prev) => ({ ...prev, current: page, pageSize }))
        }
      />

      <ConfirmDialog
        open={importDialogOpen}
        title="导入曝光数据"
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
              label="拖拽曝光数据文件到此处，或点击选择"
              description="支持 JSON 格式，大小不超过 10MB"
            />
          </div>
        }
      />
    </div>
  );
}
