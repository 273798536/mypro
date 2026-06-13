import React from 'react';
import { Card, Row, Col, Statistic, Tag, Alert } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, DatabaseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import dayjs from 'dayjs';

const SummaryPanel: React.FC = () => {
  const { pageSummary } = useAppContext();

  return (
    <Card
      title={
        <span>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          页面摘要（与导出文件完全一致）
        </span>
      }
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Tag color="blue" title="筛选口径将同步导出">
          筛选口径已同步
        </Tag>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="总记录数"
            value={pageSummary.total_records}
            suffix="条"
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="筛选后"
            value={pageSummary.filtered_records}
            suffix="条"
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="设备数"
            value={pageSummary.device_count}
            suffix="台"
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={<span><WarningOutlined style={{ color: '#faad14' }} /> 异常值</span>}
            value={pageSummary.outlier_count}
            suffix="个"
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={<span><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> 重复设备</span>}
            value={pageSummary.duplicate_count}
            suffix="条"
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={<span><ThunderboltOutlined style={{ color: '#a0d911' }} /> 跳变事件</span>}
            value={pageSummary.jump_events.length}
            suffix="次"
            valueStyle={{ color: '#a0d911' }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={12} sm={8} md={6}>
          <Statistic
            title="最大扭矩"
            value={pageSummary.max_torque}
            suffix="N·m"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Statistic
            title="最小扭矩"
            value={pageSummary.min_torque}
            suffix="N·m"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Statistic
            title="平均扭矩"
            value={pageSummary.avg_torque}
            suffix="N·m"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Statistic
            title={<span style={{ color: '#eb2f96' }}>脏数据</span>}
            value={pageSummary.dirty_data_count}
            suffix="条"
            valueStyle={{ color: '#eb2f96' }}
          />
        </Col>
      </Row>

      {pageSummary.time_span && (
        <div style={{ marginTop: 12 }}>
          <Alert
            type="info"
            showIcon
            message={`时间范围：${dayjs(pageSummary.time_span[0]).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs(pageSummary.time_span[1]).format('YYYY-MM-DD HH:mm:ss')}`}
          />
        </div>
      )}

      {pageSummary.jump_events.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Alert
            type="warning"
            showIcon
            message={`检测到 ${pageSummary.jump_events.length} 次跳变事件，请查看跳变诊断面板`}
          />
        </div>
      )}
    </Card>
  );
};

export default SummaryPanel;
