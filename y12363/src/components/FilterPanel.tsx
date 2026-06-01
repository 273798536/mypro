import React from 'react';
import { DatePicker, Select, Checkbox, Button, Space, Card, Form } from 'antd';
import { Filter, RotateCcw, Search, Eye, EyeOff } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import { AnomalyType } from '../types';
import { ANOMALY_TYPE_LABELS } from '../constants';

const { RangePicker } = DatePicker;
const { Option } = Select;

const FilterPanel: React.FC = () => {
  const {
    filters,
    batches,
    setFilters,
    resetFilters,
    getSensorIds,
  } = useAppStore();

  const sensorIds = getSensorIds();
  const anomalyTypes = Object.values(AnomalyType);

  const handleApply = () => {
    setFilters(filters);
  };

  const handleReset = () => {
    resetFilters();
  };

  return (
    <Card
      className="bg-slate-800 border-slate-700"
      title={
        <span className="flex items-center gap-2 text-slate-100">
          <Filter size={16} className="text-blue-500" />
          筛选条件
        </span>
      }
      size="small"
    >
      <Form layout="vertical" className="space-y-3">
        <Form.Item label={<span className="text-slate-300 text-sm">时间范围</span>} className="mb-3">
          <RangePicker
            value={[
              filters.startTime ? dayjs(filters.startTime) : null,
              filters.endTime ? dayjs(filters.endTime) : null,
            ]}
            onChange={(dates) =>
              setFilters({
                startTime: dates?.[0]?.toDate() || null,
                endTime: dates?.[1]?.toDate() || null,
              })
            }
            showTime
            style={{ width: '100%' }}
            className="bg-slate-700"
          />
        </Form.Item>

        <Form.Item label={<span className="text-slate-300 text-sm">批次选择</span>} className="mb-3">
          <Select
            mode="multiple"
            placeholder="选择批次"
            value={filters.batchIds}
            onChange={(value) => setFilters({ batchIds: value })}
            style={{ width: '100%' }}
            className="bg-slate-700"
            maxTagCount="responsive"
          >
            {batches.map((batch) => (
              <Option key={batch.id} value={batch.id}>
                {batch.batchNo} - {batch.materialType}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={<span className="text-slate-300 text-sm">传感器</span>} className="mb-3">
          <Select
            mode="multiple"
            placeholder="选择传感器"
            value={filters.sensorIds}
            onChange={(value) => setFilters({ sensorIds: value })}
            style={{ width: '100%' }}
            className="bg-slate-700"
            maxTagCount="responsive"
          >
            {sensorIds.map((id) => (
              <Option key={id} value={id}>
                {id}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={<span className="text-slate-300 text-sm">异常类型</span>} className="mb-3">
          <Checkbox.Group
            value={filters.anomalyTypes}
            onChange={(value) => setFilters({ anomalyTypes: value as AnomalyType[] })}
            className="w-full"
          >
            <Space direction="vertical" className="w-full">
              {anomalyTypes.map((type) => (
                <Checkbox key={type} value={type} className="text-slate-300">
                  {ANOMALY_TYPE_LABELS[type]}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item className="mb-3">
          <Checkbox
            checked={filters.showIsolated}
            onChange={(e) => setFilters({ showIsolated: e.target.checked })}
            className="text-slate-300"
          >
            <span className="flex items-center gap-2">
              {filters.showIsolated ? <Eye size={14} /> : <EyeOff size={14} />}
              显示隔离数据
            </span>
          </Checkbox>
        </Form.Item>

        <Space className="w-full pt-2">
          <Button
            type="primary"
            icon={<Search size={14} />}
            onClick={handleApply}
            className="flex-1"
            style={{ backgroundColor: '#165DFF' }}
          >
            应用筛选
          </Button>
          <Button
            icon={<RotateCcw size={14} />}
            onClick={handleReset}
            className="flex-1"
          >
            重置
          </Button>
        </Space>
      </Form>
    </Card>
  );
};

export default FilterPanel;
