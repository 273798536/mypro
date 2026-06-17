import React from 'react';
import { Card, Row, Col, Select, Input, Slider, DatePicker, Checkbox, Button, Space, Tag } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import type { TorqueUnit } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Search } = Input;

const UNIT_OPTIONS: { label: string; value: TorqueUnit }[] = [
  { label: 'N·m', value: 'N·m' },
  { label: 'kg·m', value: 'kg·m' },
  { label: 'lb·ft', value: 'lb·ft' }
];

const FilterPanel: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { filterCriteria, allRecords } = state;

  const deviceOptions = React.useMemo(() => {
    const uniqueDevices = new Map<string, string>();
    allRecords.forEach(r => {
      uniqueDevices.set(r.device_id, r.device_name);
    });
    return Array.from(uniqueDevices.entries()).map(([id, name]) => ({
      label: `${id} - ${name}`,
      value: id
    }));
  }, [allRecords]);

  const torqueRange = React.useMemo(() => {
    const values = allRecords.map(r => r.torque_value).filter(v => !isNaN(v));
    if (values.length === 0) return [0, 500];
    return [Math.floor(Math.min(...values) - 10), Math.ceil(Math.max(...values) + 10)];
  }, [allRecords]);

  const handleDeviceChange = (value: string[]) => {
    dispatch({ type: 'SET_FILTER', payload: { device_ids: value } });
  };

  const handleTimeRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      dispatch({
        type: 'SET_FILTER',
        payload: {
          time_range: [
            dates[0].toISOString(),
            dates[1].toISOString()
          ]
        }
      });
    } else {
      dispatch({ type: 'SET_FILTER', payload: { time_range: null } });
    }
  };

  const handleTorqueRangeChange = (value: number | number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      dispatch({ type: 'SET_FILTER', payload: { torque_range: value as [number, number] } });
    }
  };

  const handleUnitChange = (value: TorqueUnit[]) => {
    dispatch({ type: 'SET_FILTER', payload: { units: value } });
  };

  const handleKeywordChange = (value: string) => {
    dispatch({ type: 'SET_FILTER', payload: { keyword: value } });
  };

  const handleCheckboxChange = (key: keyof typeof filterCriteria, checked: boolean) => {
    dispatch({ type: 'SET_FILTER', payload: { [key]: checked } });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_FILTER' });
  };

  const hasActiveFilters =
    filterCriteria.device_ids.length > 0 ||
    filterCriteria.time_range !== null ||
    filterCriteria.torque_range !== null ||
    filterCriteria.units.length > 0 ||
    filterCriteria.keyword !== '' ||
    filterCriteria.show_outliers_only ||
    filterCriteria.show_duplicates_only ||
    filterCriteria.show_dirty_data_only;

  return (
    <Card
      title={
        <span>
          <FilterOutlined style={{ marginRight: 8 }} />
          筛选条件
        </span>
      }
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Space>
          {hasActiveFilters && <Tag color="red">已筛选</Tag>}
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>设备编号</div>
          <Select
            mode="multiple"
            placeholder="选择设备"
            style={{ width: '100%' }}
            options={deviceOptions}
            value={filterCriteria.device_ids}
            onChange={handleDeviceChange}
            allowClear
            maxTagCount="responsive"
          />
        </Col>

        <Col xs={24} sm={12} md={8}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>时间范围</div>
          <RangePicker
            showTime
            style={{ width: '100%' }}
            value={filterCriteria.time_range
              ? [dayjs(filterCriteria.time_range[0]), dayjs(filterCriteria.time_range[1])]
              : null}
            onChange={handleTimeRangeChange}
          />
        </Col>

        <Col xs={24} sm={12} md={8}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>关键词搜索</div>
          <Search
            placeholder="搜索设备名、备注"
            allowClear
            value={filterCriteria.keyword}
            onChange={e => handleKeywordChange(e.target.value)}
          />
        </Col>

        <Col xs={24} sm={12} md={8}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>单位筛选</div>
          <Select
            mode="multiple"
            placeholder="选择单位"
            style={{ width: '100%' }}
            options={UNIT_OPTIONS}
            value={filterCriteria.units}
            onChange={handleUnitChange}
            allowClear
          />
        </Col>

        <Col xs={24} sm={12} md={8}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
            扭矩范围：{filterCriteria.torque_range
              ? `${filterCriteria.torque_range[0]} - ${filterCriteria.torque_range[1]}`
              : `${torqueRange[0]} - ${torqueRange[1]}`}
          </div>
          <Slider
            range
            min={torqueRange[0]}
            max={torqueRange[1]}
            value={filterCriteria.torque_range || torqueRange}
            onChange={handleTorqueRangeChange}
            style={{ marginTop: 8 }}
          />
        </Col>

        <Col xs={24} md={8}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>快速筛选</div>
          <Space wrap>
            <Checkbox
              checked={filterCriteria.show_outliers_only}
              onChange={e => handleCheckboxChange('show_outliers_only', e.target.checked)}
            >
              <Tag color="orange">仅异常值</Tag>
            </Checkbox>
            <Checkbox
              checked={filterCriteria.show_duplicates_only}
              onChange={e => handleCheckboxChange('show_duplicates_only', e.target.checked)}
            >
              <Tag color="red">仅重复设备</Tag>
            </Checkbox>
            <Checkbox
              checked={filterCriteria.show_dirty_data_only}
              onChange={e => handleCheckboxChange('show_dirty_data_only', e.target.checked)}
            >
              <Tag color="magenta">仅脏数据</Tag>
            </Checkbox>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default FilterPanel;
