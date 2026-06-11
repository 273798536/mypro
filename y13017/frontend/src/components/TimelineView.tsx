import React, { useState, useMemo } from 'react';
import { Tabs, Tag, Empty } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PaperClipOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { TimelineEvent, EVENT_TYPE_LABEL, STATUS_LABEL } from '../types';

interface Props {
  events: TimelineEvent[];
}

const eventColors: Record<string, string> = {
  import: '#52c41a',
  supplement: '#1677ff',
  late_attachment: '#722ed1',
  attachment: '#13c2c2',
  remark_update: '#fa8c16',
  status_change: '#eb2f96',
  duplicate_check: '#8c8c8c',
  extracted_data: '#2f54eb'
};

const sourceLabel = (t: string | null) => {
  if (t === 'email') return { text: '邮件', icon: <MailOutlined /> };
  if (t === 'attachment') return { text: '附件', icon: <PaperClipOutlined /> };
  if (t === 'manual') return { text: '人工', icon: <UserOutlined /> };
  return null;
};

const TimelineView: React.FC<Props> = ({ events }) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    if (activeTab === 'all') return events;
    return events.filter(e => e.dispute_status === activeTab);
  }, [events, activeTab]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const e of filteredEvents) {
      const date = e.created_at.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEvents]);

  const counts = useMemo(() => ({
    all: events.length,
    processed: events.filter(e => e.dispute_status === 'processed').length,
    pending_materials: events.filter(e => e.dispute_status === 'pending_materials').length,
    manual_review: events.filter(e => e.dispute_status === 'manual_review').length,
  }), [events]);

  const tabItems = [
    { key: 'all', label: `全部 (${counts.all})` },
    { key: 'processed', label: `已处理 (${counts.processed})` },
    { key: 'pending_materials', label: `待补材料 (${counts.pending_materials})` },
    { key: 'manual_review', label: `人工改判 (${counts.manual_review})` }
  ];

  return (
    <div className="section-card">
      <div className="section-title">
        <SwapOutlined /> 历史时间线 — 沟通用视图
      </div>
      <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 16, lineHeight: 1.6 }}>
        此时间线按案件状态分类，可直接用于与项目经理、清算运营沟通。每一条记录都保留了来源邮件、操作人和事件说明。
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="filter-tabs"
      />

      {filteredEvents.length === 0 ? (
        <Empty description="暂无时间线记录，请先导入审批邮件" />
      ) : (
        <div className="timeline-container">
          {groupedByDate.map(([date, items]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 13,
                color: '#8c8c8c',
                fontWeight: 600,
                paddingBottom: 8,
                borderBottom: '1px solid #f0f0f0',
                marginBottom: 8
              }}>
                {date}
              </div>
              {items.map(event => {
                const src = sourceLabel(event.source_type);
                const statusColor = event.dispute_status === 'processed' ? 'green'
                  : event.dispute_status === 'manual_review' ? 'red' : 'orange';

                return (
                  <div key={event.id} className="timeline-item">
                    <div
                      className="timeline-dot"
                      style={{
                        background: eventColors[event.event_type] || '#bfbfbf',
                        boxShadow: `0 0 0 2px ${eventColors[event.event_type] || '#bfbfbf'}40`
                      }}
                    />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="timeline-case">{event.case_no || '(未知案件)'}</span>
                          <Tag color={statusColor} style={{ margin: 0 }}>
                            {STATUS_LABEL[event.dispute_status] || event.dispute_status}
                          </Tag>
                          <Tag color="blue" style={{ margin: 0 }}>
                            {EVENT_TYPE_LABEL[event.event_type] || event.event_type}
                          </Tag>
                        </div>
                        <span className="timeline-time">{event.created_at.slice(11, 19)}</span>
                      </div>
                      <div className="timeline-text">
                        {event.event_text}
                      </div>
                      <div className="timeline-meta">
                        {src && (
                          <span>
                            {src.icon} 来源: {src.text}
                          </span>
                        )}
                        {event.operator && (
                          <span><UserOutlined /> 操作人: {event.operator}</span>
                        )}
                        {event.email_subject && (
                          <span><MailOutlined /> 邮件: {event.email_subject}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelineView;
