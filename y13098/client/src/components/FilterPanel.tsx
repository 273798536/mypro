import React from 'react';
import { Form, Select, DatePicker, Checkbox, Input, Button, Space, Divider } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { FilterCriteria, RouteCorridor, InspectionRecord } from '@shared/types';
import { RECORD_TYPE_LABELS, STATUS_LABELS } from '@shared/constants';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface FilterPanelProps {
  corridors: RouteCorridor[];
  filter: FilterCriteria;
  onFilterChange: (filter: Partial<FilterCriteria>) => void;
  onReset: () => void;
  onSearch: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  corridors,
  filter,
  onFilterChange,
  onReset,
  onSearch
}) => {
  const [form] = Form.useForm();

  const handleValuesChange = (_: any, allValues: any) => {
    const newFilter: Partial<FilterCriteria> = {};
    
    if (allValues.corridorId) newFilter.corridorId = allValues.corridorId;
    if (allValues.dateRange && allValues.dateRange.length === 2) {
      newFilter.startDate = allValues.dateRange[0].format('YYYY-MM-DD');
      newFilter.endDate = allValues.dateRange[1].format('YYYY-MM-DD');
    }
    if (allValues.recordType) newFilter.recordType = allValues.recordType;
    if (allValues.status) newFilter.status = allValues.status;
    if (allValues.isOverlapping !== undefined) newFilter.isOverlapping = allValues.isOverlapping;
    if (allValues.searchKeyword) newFilter.searchKeyword = allValues.searchKeyword;
    
    onFilterChange(newFilter);
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <div className="filter-panel">
      <h3 style={{ marginBottom: 16 }}>筛选条件</h3>
      
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          corridorId: filter.corridorId,
          recordType: filter.recordType,
          status: filter.status,
          isOverlapping: filter.isOverlapping,
          searchKeyword: filter.searchKeyword
        }}
      >
        <Form.Item label="航线走廊" name="corridorId">
          <Select placeholder="请选择航线走廊" allowClear>
            {corridors.map(c => (
              <Option key={c.id} value={c.id}>{c.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="记录日期" name="dateRange">
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="记录类型" name="recordType">
          <Select mode="multiple" placeholder="请选择记录类型" allowClear>
            {Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="状态" name="status">
          <Select mode="multiple" placeholder="请选择状态" allowClear>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="isOverlapping" valuePropName="checked">
          <Checkbox>仅显示对象重叠记录</Checkbox>
        </Form.Item>

        <Form.Item label="关键词搜索" name="searchKeyword">
          <Input placeholder="输入标题或描述关键词" prefix={<SearchOutlined />} />
        </Form.Item>

        <Divider />

        <Space>
          <Button type="primary" onClick={onSearch} icon={<SearchOutlined />}>
            搜索
          </Button>
          <Button onClick={handleReset} icon={<ReloadOutlined />}>
            重置
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default FilterPanel;
