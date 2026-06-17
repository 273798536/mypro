import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Dropdown,
  MenuProps,
  Typography,
  Tooltip,
  Spin,
  Empty,
  Modal,
  message,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  EyeOutlined,
  HistoryOutlined,
  DownOutlined,
  MusicOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { useAppStore } from '@/store';
import { trackApi, exportApi } from '@/api';
import { Track, TrackStatus, PaginatedResponse } from '@/types';
import {
  getStatusColor,
  getStatusText,
  truncateText,
  downloadBlob,
  debounce,
} from '@/utils';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const TracksPage: React.FC = () => {
  const navigate = useNavigate();
  const { tracks, filters, loading, setTracks, setFilters, setLoading } = useAppStore();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackStatus | undefined>();
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('csv');

  useEffect(() => {
    fetchTracks();
  }, [filters]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const response: PaginatedResponse<Track> = await trackApi.findAll({
        ...filters,
        status: statusFilter,
        keyword: searchText || undefined,
      });
      setTracks(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
      message.error('加载曲目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchText(value);
        setFilters({ page: 1 });
      }, 300),
    [setFilters]
  );

  const handleSearch = (value: string) => {
    debouncedSearch(value);
  };

  const handleStatusChange = (value: TrackStatus | undefined) => {
    setStatusFilter(value);
    setFilters({ page: 1 });
  };

  const handleTableChange: TableProps<Track>['onChange'] = (pagination) => {
    setFilters({
      page: pagination.current || 1,
      limit: pagination.pageSize || 20,
    });
  };

  const handleRowClick = (record: Track) => {
    navigate(`/tracks/${record.id}`);
  };

  const handleViewDetail = (record: Track) => {
    navigate(`/tracks/${record.id}`);
  };

  const handleViewHistory = (record: Track) => {
    navigate(`/tracks/${record.id}?tab=history`);
  };

  const handleBatchAction: MenuProps['onClick'] = ({ key }) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的曲目');
      return;
    }

    switch (key) {
      case 'approve':
        message.info(`批量通过 ${selectedRowKeys.length} 条曲目`);
        break;
      case 'suspend':
        message.info(`批量挂起 ${selectedRowKeys.length} 条曲目`);
        break;
      case 'reject':
        message.info(`批量拒绝 ${selectedRowKeys.length} 条曲目`);
        break;
      case 'export':
        setExportModalVisible(true);
        break;
      default:
        break;
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const blob = await exportApi.exportTracks(exportFormat);
      const filename = `tracks-export-${Date.now()}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      downloadBlob(blob, filename);
      message.success('导出成功');
      setExportModalVisible(false);
    } catch (error) {
      console.error('Failed to export:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const getTimecodeDeviationColor = (deviation?: number) => {
    if (deviation === undefined) return 'rgba(255,255,255,0.45)';
    const absDeviation = Math.abs(deviation) * 1000;
    if (absDeviation > 500) return '#ff4d4f';
    if (absDeviation > 300) return '#faad14';
    return '#52c41a';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#52c41a';
    if (confidence >= 0.7) return '#1677ff';
    if (confidence >= 0.5) return '#faad14';
    return '#ff4d4f';
  };

  const columns: ColumnsType<Track> = [
    {
      title: '曲目编号',
      dataIndex: 'trackNo',
      key: 'trackNo',
      width: 100,
      render: (trackNo: number) => (
        <Text strong style={{ color: 'rgba(255,255,255,0.85)' }}>
          #{trackNo}
        </Text>
      ),
    },
    {
      title: '曲目名称',
      dataIndex: 'title',
      key: 'title',
      minWidth: 150,
      ellipsis: true,
      render: (title: string) => (
        <Tooltip title={title}>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</Text>
        </Tooltip>
      ),
    },
    {
      title: '艺术家',
      dataIndex: 'artist',
      key: 'artist',
      minWidth: 120,
      ellipsis: true,
      render: (artist: string) => (
        <Tooltip title={artist}>
          <Text type="secondary">{artist}</Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '待处理', value: 'pending' },
        { text: '匹配中', value: 'matching' },
        { text: '已匹配', value: 'matched' },
        { text: '不匹配', value: 'mismatch' },
        { text: '复核中', value: 'reviewing' },
        { text: '已挂起', value: 'suspended' },
        { text: '已通过', value: 'approved' },
        { text: '已拒绝', value: 'rejected' },
      ],
      render: (status: TrackStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '文件名',
      dataIndex: ['materials', 0, 'fileName'],
      key: 'fileName',
      minWidth: 150,
      ellipsis: true,
      render: (fileName: string, record: Track) => {
        const activeMaterial = record.materials?.find((m) => m.isActive);
        const name = activeMaterial?.fileName || fileName || '-';
        return (
          <Tooltip title={name}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              {truncateText(name, 25)}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '匹配度',
      dataIndex: ['materials', 0, 'matchConfidence'],
      key: 'matchConfidence',
      width: 100,
      render: (confidence: number, record: Track) => {
        const activeMaterial = record.materials?.find((m) => m.isActive);
        const conf = activeMaterial?.matchConfidence ?? confidence;
        if (conf === undefined || conf === null) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Text style={{ color: getConfidenceColor(conf), fontWeight: 500 }}>
            {(conf * 100).toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: '时间码偏差',
      dataIndex: 'timecodeDeviation',
      key: 'timecodeDeviation',
      width: 120,
      render: (deviation: number | undefined) => {
        if (deviation === undefined) {
          return <Text type="secondary">-</Text>;
        }
        const deviationMs = deviation * 1000;
        return (
          <Text style={{ color: getTimecodeDeviationColor(deviation), fontWeight: 500 }}>
            {deviationMs > 0 ? '+' : ''}
            {deviationMs.toFixed(0)} ms
          </Text>
        );
      },
    },
    {
      title: '版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 80,
      render: (version: number) => (
        <Tag className="version-tag" color="blue">
          v{version}
        </Tag>
      ),
    },
    {
      title: '最新备注',
      dataIndex: 'latestNote',
      key: 'latestNote',
      minWidth: 150,
      ellipsis: true,
      render: (note: string | undefined) => {
        if (!note) return <Text type="secondary">-</Text>;
        return (
          <Tooltip title={note}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              {truncateText(note, 30)}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail(record);
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleViewHistory(record);
            }}
          >
            追溯
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const batchMenuItems: MenuProps['items'] = [
    { key: 'approve', label: '批量通过' },
    { key: 'suspend', label: '批量挂起' },
    { key: 'reject', label: '批量拒绝' },
    { type: 'divider' },
    { key: 'export', label: '批量导出' },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>
          曲目管理
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
          管理所有演出曲目及其处理状态
        </Text>
      </div>

      <Card className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size="middle">
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <Option value="pending">待处理</Option>
              <Option value="matching">匹配中</Option>
              <Option value="matched">已匹配</Option>
              <Option value="mismatch">不匹配</Option>
              <Option value="reviewing">复核中</Option>
              <Option value="suspended">已挂起</Option>
              <Option value="approved">已通过</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>

            <Dropdown menu={{ items: batchMenuItems, onClick: handleBatchAction }}>
              <Button icon={<FilterOutlined />}>
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>

            {selectedRowKeys.length > 0 && (
              <Tag color="blue">已选择 {selectedRowKeys.length} 项</Tag>
            )}
          </Space>

          <Space size="middle">
            <Search
              placeholder="搜索曲目名称、艺术家..."
              allowClear
              style={{ width: 280 }}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              导出
            </Button>
          </Space>
        </Space>
      </Card>

      <div className="table-container">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tracks}
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                image={<MusicOutlined style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />}
                description="暂无曲目数据"
              />
            ),
          }}
        />
      </div>

      <Modal
        title="导出曲目数据"
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}
        confirmLoading={loading}
        okText="确认导出"
        cancelText="取消"
      >
        <div style={{ marginBottom: '16px' }}>
          <Text style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.85)' }}>
            选择导出格式：
          </Text>
          <Select
            value={exportFormat}
            onChange={setExportFormat}
            style={{ width: '100%' }}
          >
            <Option value="csv">CSV 文件 (.csv)</Option>
            <Option value="excel">Excel 文件 (.xlsx)</Option>
            <Option value="json">JSON 文件 (.json)</Option>
          </Select>
        </div>
        <Text type="secondary">
          本次将导出 {selectedRowKeys.length > 0 ? selectedRowKeys.length : total} 条曲目数据
        </Text>
      </Modal>
    </div>
  );
};

export default TracksPage;
