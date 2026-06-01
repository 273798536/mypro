import React, { useState, useMemo } from 'react';
import { Table, Tag, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { Clock, Edit3, AlertCircle, CheckCircle } from 'lucide-react';
import { EstimationResult, RadiationReading, MaterialBatch, AnomalyRecord, AnomalyType } from '../types';
import { COLORS, ANOMALY_TYPE_LABELS } from '../constants';
import dayjs from 'dayjs';

interface TableDataItem {
  result: EstimationResult;
  reading: RadiationReading;
  batch: MaterialBatch | undefined;
  anomaly: AnomalyRecord | undefined;
}

interface DataTableProps {
  data: TableDataItem[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const columns: TableProps<TableDataItem>['columns'] = [
    {
      title: '时间',
      dataIndex: ['reading', 'readingTime'],
      key: 'readingTime',
      sorter: (a, b) =>
        new Date(a.reading.readingTime).getTime() - new Date(b.reading.readingTime).getTime(),
      render: (text: Date, record) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-200">
            {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
          </span>
          {record.reading.isLateSupplement && (
            <Tooltip title="晚补数据">
              <Tag color="orange" icon={<Clock size={12} />} className="ml-1">
                晚补
              </Tag>
            </Tooltip>
          )}
        </div>
      ),
      width: 180,
    },
    {
      title: '传感器',
      dataIndex: ['reading', 'sensorId'],
      key: 'sensorId',
      sorter: (a, b) => a.reading.sensorId.localeCompare(b.reading.sensorId),
      render: (text: string) => <span className="text-slate-200">{text}</span>,
      width: 120,
    },
    {
      title: '批次',
      key: 'batchNo',
      sorter: (a, b) => (a.batch?.batchNo || '').localeCompare(b.batch?.batchNo || ''),
      render: (_, record) => (
        <span className="text-slate-200">{record.batch?.batchNo || '-'}</span>
      ),
      width: 120,
    },
    {
      title: '材料类型',
      key: 'materialType',
      sorter: (a, b) => (a.batch?.materialType || '').localeCompare(b.batch?.materialType || ''),
      render: (_, record) => (
        <span className="text-slate-200">{record.batch?.materialType || '-'}</span>
      ),
      width: 120,
    },
    {
      title: '辐射强度',
      dataIndex: ['reading', 'radiationValue'],
      key: 'radiationValue',
      sorter: (a, b) => a.reading.radiationValue - b.reading.radiationValue,
      render: (text: number) => (
        <span className="text-slate-200">{text.toFixed(2)} W/m²</span>
      ),
      width: 130,
    },
    {
      title: '发射率',
      dataIndex: ['reading', 'emissivity'],
      key: 'emissivity',
      sorter: (a, b) => (a.reading.emissivity || 0) - (b.reading.emissivity || 0),
      render: (text: number | null) => (
        <span className={text ? 'text-slate-200' : 'text-orange-400'}>
          {text !== null ? text.toFixed(4) : '缺失'}
        </span>
      ),
      width: 100,
    },
    {
      title: '环境温度',
      dataIndex: ['reading', 'ambientTemp'],
      key: 'ambientTemp',
      sorter: (a, b) => a.reading.ambientTemp - b.reading.ambientTemp,
      render: (text: number) => <span className="text-slate-200">{text.toFixed(1)}°C</span>,
      width: 110,
    },
    {
      title: '估算温度',
      dataIndex: ['result', 'estimatedTemp'],
      key: 'estimatedTemp',
      sorter: (a, b) => a.result.estimatedTemp - b.result.estimatedTemp,
      render: (text: number, record) => (
        <span
          className={`font-semibold ${
            record.result.isIsolated ? 'text-slate-400' : 'text-blue-400'
          }`}
        >
          {text.toFixed(2)}°C
        </span>
      ),
      width: 120,
    },
    {
      title: '异常类型',
      key: 'anomalyType',
      sorter: (a, b) => {
        const aType = a.anomaly?.type || '';
        const bType = b.anomaly?.type || '';
        return aType.localeCompare(bType);
      },
      render: (_, record) => {
        const type = record.result.anomalyType;
        if (!type) return <span className="text-slate-400">-</span>;
        const typeColors: Record<AnomalyType, string> = {
          [AnomalyType.SENSOR_DRIFT]: 'red',
          [AnomalyType.EMISSIVITY_MISSING]: 'orange',
          [AnomalyType.BATCH_MISMATCH]: 'gold',
          [AnomalyType.FIELD_MISSING]: 'default',
        };
        return (
          <Tag color={typeColors[type]} className="font-medium">
            {ANOMALY_TYPE_LABELS[type]}
          </Tag>
        );
      },
      width: 120,
    },
    {
      title: '状态',
      key: 'status',
      sorter: (a, b) => (a.result.isIsolated ? 1 : 0) - (b.result.isIsolated ? 1 : 0),
      render: (_, record) => (
        <div className="flex items-center gap-1">
          {record.result.isIsolated ? (
            <>
              <AlertCircle size={14} className="text-slate-400" />
              <span className="text-slate-400">已隔离</span>
            </>
          ) : (
            <>
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-green-400">正常</span>
            </>
          )}
        </div>
      ),
      width: 100,
    },
    {
      title: '备注',
      key: 'remark',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-300 truncate max-w-32" title={record.reading.remark}>
            {record.reading.remark || '-'}
          </span>
          {record.reading.remarkModifiedAt && (
            <Tooltip title={`最后修改: ${dayjs(record.reading.remarkModifiedAt).format('YYYY-MM-DD HH:mm:ss')}`}>
              <Edit3 size={12} className="text-yellow-400" />
            </Tooltip>
          )}
        </div>
      ),
      width: 180,
    },
  ];

  const rowClassName = (record: TableDataItem) => {
    if (record.anomaly) {
      return 'bg-red-900/20 hover:bg-red-900/30';
    }
    if (record.result.isIsolated) {
      return 'bg-slate-700/30 hover:bg-slate-700/50';
    }
    return 'hover:bg-slate-700/30';
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-slate-100 font-semibold text-lg">数据明细</h3>
        <p className="text-slate-400 text-sm mt-1">共 {data.length} 条记录</p>
      </div>
      <Table<TableDataItem>
        columns={columns}
        dataSource={data}
        rowKey={(record) => record.result.id}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (current, pageSize) => setPagination({ current, pageSize }),
        }}
        rowClassName={rowClassName}
        scroll={{ x: 1500, y: 500 }}
        size="middle"
        style={{
          '--ant-table-bg': 'transparent',
          '--ant-table-row-hover-bg': 'rgba(51, 65, 85, 0.3)',
          '--ant-table-thead-bg': 'rgba(30, 41, 59, 0.5)',
          '--ant-table-header-bg': 'rgba(30, 41, 59, 0.5)',
          '--ant-table-border-color': COLORS.border,
          '--ant-table-cell-color': COLORS.text,
        } as React.CSSProperties}
      />
    </div>
  );
};

export default DataTable;
