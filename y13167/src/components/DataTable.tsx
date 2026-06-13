import React, { useMemo } from 'react';
import { Table, Tag, Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ExclamationCircleOutlined, WarningOutlined, ThunderboltOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import type { MotorTorqueRecord } from '../types';
import dayjs from 'dayjs';

const DataTable: React.FC = () => {
  const { filteredRecords, dispatch, pageSummary } = useAppContext();

  const handleViewDetail = (record: MotorTorqueRecord) => {
    dispatch({ type: 'SELECT_RECORD', payload: record.id });
    dispatch({ type: 'TOGGLE_DETAIL_MODAL', payload: true });
  };

  const columns: ColumnsType<MotorTorqueRecord> = useMemo(() => [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'ascend'
    },
    {
      title: '设备编号',
      dataIndex: 'device_id',
      key: 'device_id',
      width: 100,
      render: (val: string, record) => (
        <Space>
          <span>{val}</span>
          {record.is_device_duplicate && (
            <Tooltip title={`设备编号重复，关联记录: ${record.duplicate_device_ids?.join(', ')}`}>
              <Tag color="red" icon={<ExclamationCircleOutlined />}>重复</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '设备名称',
      dataIndex: 'device_name',
      key: 'device_name',
      width: 120,
      ellipsis: true
    },
    {
      title: '扭矩值',
      dataIndex: 'torque_value',
      key: 'torque_value',
      width: 110,
      render: (val: number, record) => (
        <Space>
          <span style={{
            color: record.is_outlier ? '#faad14' : 'inherit',
            fontWeight: record.is_outlier ? 'bold' : 'normal'
          }}>
            {val.toFixed(2)}
          </span>
          <span style={{ color: '#999', fontSize: 12 }}>{record.torque_unit}</span>
          {record.is_outlier && (
            <Tooltip title={`${record.outlier_reason === 'extreme_high' ? '偏高' : '偏低'}异常值`}>
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
      sorter: (a, b) => a.torque_value - b.torque_value
    },
    {
      title: '转速',
      dataIndex: 'speed',
      key: 'speed',
      width: 80,
      render: (val: number) => `${val} rpm`,
      sorter: (a, b) => a.speed - b.speed
    },
    {
      title: '电流',
      dataIndex: 'current',
      key: 'current',
      width: 80,
      render: (val: number) => `${val.toFixed(1)} A`,
      sorter: (a, b) => a.current - b.current
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 80,
      render: (val: number) => `${val.toFixed(1)} °C`,
      sorter: (a, b) => a.temperature - b.temperature
    },
    {
      title: '维修备注',
      dataIndex: 'maintenance_note_raw',
      key: 'maintenance_note_raw',
      width: 200,
      ellipsis: true,
      render: (val: string, record) => (
        <Space>
          <span style={{
            color: record.is_data_dirty ? '#eb2f96' : 'inherit',
            fontStyle: record.is_data_dirty ? 'italic' : 'normal'
          }}>
            {val || '(空)'}
          </span>
          {record.is_data_dirty && (
            <Tooltip title={
              <div>
                <div>脏数据标记</div>
                {record.maintenance_note_cleaned && (
                  <div>清洗后: {record.maintenance_note_cleaned}</div>
                )}
              </div>
            }>
              <Tag color="magenta" icon={<FileTextOutlined />}>原始</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '标记',
      key: 'tags',
      width: 120,
      render: (_, record) => (
        <Space size={2} wrap>
          {record.is_outlier && (
            <Tag color="orange" icon={<WarningOutlined />}>异常</Tag>
          )}
          {record.is_device_duplicate && (
            <Tag color="red" icon={<ExclamationCircleOutlined />}>重复</Tag>
          )}
          {record.is_data_dirty && (
            <Tag color="magenta">脏数据</Tag>
          )}
          {pageSummary.jump_events.some(e => e.record_id === record.id) && (
            <Tag color="green" icon={<ThunderboltOutlined />}>跳变</Tag>
          )}
          {record.tags?.map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ], [pageSummary.jump_events]);

  return (
    <Table
      columns={columns}
      dataSource={filteredRecords}
      rowKey="id"
      size="small"
      scroll={{ x: 1200 }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条记录`
      }}
    />
  );
};

export default DataTable;
