import { useState, useEffect } from 'react';
import { Plus, Edit, History, X } from 'lucide-react';
import type { Channel, RateHistory } from '@/../shared/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getChannels, createChannel, updateChannel, getRateHistory } from '@/api/channel';

interface ChannelFormData {
  name: string;
  account: string;
  rate: number;
  status: 'active' | 'inactive';
}

export default function ChannelPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    account: '',
    rate: 0,
    status: 'active',
  });
  const [rateHistoryOpen, setRateHistoryOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const res = await getChannels({ page: pagination.current, pageSize: pagination.pageSize });
      setChannels(res.items);
      setPagination((prev) => ({ ...prev, total: res.total }));
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [pagination.current, pagination.pageSize]);

  const handleOpenDialog = (channel?: Channel) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        name: channel.name,
        account: channel.account,
        rate: channel.rate,
        status: channel.status,
      });
    } else {
      setEditingChannel(null);
      setFormData({ name: '', account: '', rate: 0, status: 'active' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingChannel) {
        await updateChannel(editingChannel.id, formData as Partial<Channel>);
      } else {
        await createChannel(formData as Partial<Channel>);
      }
      setDialogOpen(false);
      loadChannels();
    } catch (error) {
      console.error('Failed to save channel:', error);
    }
  };

  const handleViewHistory = async (channel: Channel) => {
    setSelectedChannel(channel);
    setRateHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const history = await getRateHistory(channel.id);
      setRateHistory(history);
    } catch (error) {
      console.error('Failed to load rate history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns: Column<Channel>[] = [
    { key: 'name', title: '渠道名称', width: 150 },
    { key: 'account', title: '账号', width: 150 },
    {
      key: 'rate',
      title: '当前费率',
      width: 120,
      render: (row) => <span className="font-medium text-primary">{row.rate}%</span>,
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row) => (
        <StatusBadge status={row.status === 'active' ? 'success' : 'info'}>
          {row.status === 'active' ? '启用' : '停用'}
        </StatusBadge>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: 180,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenDialog(row)}
            className="flex items-center gap-1 text-[13px] text-primary hover:text-primary/80"
          >
            <Edit className="h-4 w-4" />
            编辑
          </button>
          <button
            onClick={() => handleViewHistory(row)}
            className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-gray-900"
          >
            <History className="h-4 w-4" />
            费率历史
          </button>
        </div>
      ),
    },
  ];

  const historyColumns: Column<RateHistory>[] = [
    {
      key: 'effectiveDate',
      title: '生效日期',
      width: 120,
      render: (row) => new Date(row.effectiveDate).toLocaleDateString(),
    },
    {
      key: 'oldRate',
      title: '原费率',
      width: 100,
      render: (row) => <span className="text-gray-500">{row.oldRate}%</span>,
    },
    {
      key: 'newRate',
      title: '新费率',
      width: 100,
      render: (row) => <span className="font-medium text-primary">{row.newRate}%</span>,
    },
    { key: 'reason', title: '变更原因' },
    { key: 'operator', title: '操作人', width: 100 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="渠道管理" description="管理所有推广渠道信息">
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新增渠道
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={channels}
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) =>
          setPagination((prev) => ({ ...prev, current: page, pageSize }))
        }
      />

      <ConfirmDialog
        open={dialogOpen}
        title={editingChannel ? '编辑渠道' : '新增渠道'}
        onConfirm={handleSubmit}
        onCancel={() => setDialogOpen(false)}
        confirmText="保存"
        content={
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                渠道名称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="请输入渠道名称"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                账号
              </label>
              <input
                type="text"
                value={formData.account}
                onChange={(e) => setFormData((prev) => ({ ...prev, account: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="请输入账号"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                费率 (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.rate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="请输入费率"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as 'active' | 'inactive',
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </div>
          </div>
        }
      />

      {rateHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRateHistoryOpen(false)} />
          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-[18px] font-semibold text-gray-900">
                费率历史 - {selectedChannel?.name}
              </h3>
              <button
                onClick={() => setRateHistoryOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <DataTable
                columns={historyColumns}
                data={rateHistory}
                loading={historyLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
