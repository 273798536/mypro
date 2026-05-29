import { useState, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import type { ConversionOrder } from '@/../../shared/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FileUpload } from '@/components/common/FileUpload';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Alert } from '@/components/common/Alert';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getConversions, createConversion, importConversions } from '@/api/data';
import { getChannels } from '@/api/channel';
import type { Channel } from '@/../../shared/types';

interface ConversionFormData {
  orderNo: string;
  channelId: string;
  amount: number;
  conversionTime: string;
  userId: string;
}

export default function ConversionPage() {
  const [conversions, setConversions] = useState<ConversionOrder[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  } | null>(null);
  const [filters, setFilters] = useState({
    channelId: '',
    startDate: '',
    endDate: '',
    isDuplicate: '',
  });
  const [formData, setFormData] = useState<ConversionFormData>({
    orderNo: '',
    channelId: '',
    amount: 0,
    conversionTime: '',
    userId: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      };
      if (filters.isDuplicate !== '') {
        params.isDuplicate = filters.isDuplicate === 'true';
      }
      const res = await getConversions(params);
      setConversions(res.items);
      setPagination((prev) => ({ ...prev, total: res.total }));
    } catch (error) {
      console.error('Failed to load conversions:', error);
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
    setSubmitting(true);
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      await importConversions(data);
      setImportDialogOpen(false);
      setSelectedFile(null);
      setAlert({ type: 'success', title: '导入成功' });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to import:', error);
      setAlert({ type: 'error', title: '导入失败', description: '请检查文件格式' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.orderNo || !formData.channelId || !formData.amount || !formData.conversionTime) {
      setAlert({ type: 'warning', title: '请填写完整信息' });
      return;
    }
    setSubmitting(true);
    try {
      await createConversion(formData);
      setCreateDialogOpen(false);
      setFormData({ orderNo: '', channelId: '', amount: 0, conversionTime: '', userId: '' });
      setAlert({ type: 'success', title: '创建成功' });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to create:', error);
      setAlert({ type: 'error', title: '创建失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<ConversionOrder>[] = [
    { key: 'orderNo', title: '订单号', width: 180 },
    {
      key: 'channelId',
      title: '渠道',
      width: 150,
      render: (row) => {
        const channel = channels.find((c) => c.id === row.channelId);
        return channel?.name || row.channelId;
      },
    },
    {
      key: 'amount',
      title: '金额',
      width: 120,
      render: (row) => <span className="font-medium">¥{row.amount.toFixed(2)}</span>,
    },
    {
      key: 'conversionTime',
      title: '转化时间',
      width: 180,
      render: (row) => new Date(row.conversionTime).toLocaleString(),
    },
    {
      key: 'isDuplicate',
      title: '是否重复',
      width: 100,
      render: (row) => (
        <StatusBadge status={row.isDuplicate ? 'warning' : 'success'}>
          {row.isDuplicate ? '是' : '否'}
        </StatusBadge>
      ),
    },
    { key: 'duplicateReason', title: '重复原因' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="转化单" description="管理转化订单数据">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormData({ orderNo: '', channelId: '', amount: 0, conversionTime: '', userId: '' });
              setCreateDialogOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            新增转化
          </button>
          <button
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            批量导入
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
          <label className="text-[13px] text-gray-600">是否重复:</label>
          <select
            value={filters.isDuplicate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, isDuplicate: e.target.value }))
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
            setFilters({ channelId: '', startDate: '', endDate: '', isDuplicate: '' })
          }
          className="text-[13px] text-gray-500 hover:text-gray-700"
        >
          重置
        </button>
      </div>

      <DataTable
        columns={columns}
        data={conversions}
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) =>
          setPagination((prev) => ({ ...prev, current: page, pageSize }))
        }
      />

      <ConfirmDialog
        open={createDialogOpen}
        title="新增转化单"
        onConfirm={handleCreate}
        onCancel={() => setCreateDialogOpen(false)}
        confirmText={submitting ? '提交中...' : '确认提交'}
        content={
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                订单号 *
              </label>
              <input
                type="text"
                value={formData.orderNo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, orderNo: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="请输入订单号"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                渠道 *
              </label>
              <select
                value={formData.channelId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, channelId: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">请选择渠道</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                金额 *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="请输入金额"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                转化时间 *
              </label>
              <input
                type="datetime-local"
                value={formData.conversionTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, conversionTime: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                用户ID
              </label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, userId: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="请输入用户ID"
              />
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={importDialogOpen}
        title="批量导入转化数据"
        onConfirm={handleImport}
        onCancel={() => {
          setImportDialogOpen(false);
          setSelectedFile(null);
        }}
        confirmText={submitting ? '导入中...' : '确认导入'}
        content={
          <div className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".json"
              label="拖拽转化数据文件到此处，或点击选择"
              description="支持 JSON 格式，大小不超过 10MB"
            />
          </div>
        }
      />
    </div>
  );
}
