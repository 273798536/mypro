import React from 'react';
import { Row, Col, Card } from 'antd';

export default function StatsPanel({ stats }) {
  const cards = [
    { label: '曲目总数', num: stats.total, color: '#1677ff', bg: '#e6f4ff' },
    { label: '返场曲目', num: stats.encore, color: '#c41d7f', bg: '#fff0f6' },
    { label: '待处理', num: stats.pending, color: '#fa8c16', bg: '#fff7e6' },
    { label: '已确认', num: stats.confirmed, color: '#52c41a', bg: '#f6ffed' },
    { label: '异常提醒', num: stats.openAlerts, color: '#ff4d4f', bg: '#fff1f0' },
    { label: '别名冲突', num: stats.conflictCount, color: '#722ed1', bg: '#f9f0ff' },
  ];
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {cards.map(c => (
        <Col span={4} key={c.label}>
          <Card className="stat-card" style={{ background: c.bg, border: 'none' }}>
            <div className="num" style={{ color: c.color }}>{c.num}</div>
            <div className="label">{c.label}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
