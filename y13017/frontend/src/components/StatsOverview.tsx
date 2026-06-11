import React from 'react';
import { Dispute } from '../types';

interface Props {
  disputes: Dispute[];
}

const StatsOverview: React.FC<Props> = ({ disputes }) => {
  const total = disputes.length;
  const pending = disputes.filter(d => d.status === 'pending_materials').length;
  const processed = disputes.filter(d => d.status === 'processed').length;
  const manual = disputes.filter(d => d.status === 'manual_review').length;
  const late = disputes.filter(d => d.late_attachment_count > 0).length;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">争议款总数</div>
        <div className="stat-value">{total}</div>
      </div>
      <div className="stat-card pending">
        <div className="stat-label">待补材料</div>
        <div className="stat-value">{pending}</div>
      </div>
      <div className="stat-card processed">
        <div className="stat-label">已处理</div>
        <div className="stat-value">{processed}</div>
      </div>
      <div className="stat-card manual">
        <div className="stat-label">人工改判</div>
        <div className="stat-value">{manual}</div>
      </div>
      <div className="stat-card late">
        <div className="stat-label">涉及晚到凭证</div>
        <div className="stat-value">{late}</div>
      </div>
    </div>
  );
};

export default StatsOverview;
