import { CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';

const StatsCards = ({ stats, onCardClick }) => {
  const cards = [
    {
      label: '总记录数',
      value: stats.total,
      subtext: '全部检测记录',
      icon: FileText,
      className: 'total',
      color: '#3b82f6',
      status: 'all'
    },
    {
      label: '顺利通过',
      value: stats.success,
      subtext: '可直接使用',
      icon: CheckCircle,
      className: 'success',
      color: '#22c55e',
      status: 'success'
    },
    {
      label: '待确认',
      value: stats.pending,
      subtext: '需康复训练师复核',
      icon: Clock,
      className: 'pending',
      color: '#f59e0b',
      status: 'pending'
    },
    {
      label: '数据异常',
      value: stats.error,
      subtext: '不可用，需重新处理',
      icon: AlertTriangle,
      className: 'error',
      color: '#ef4444',
      status: 'error'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`stat-card ${card.className} ${onCardClick ? 'clickable' : ''}`}
            onClick={() => onCardClick && onCardClick(card.status)}
            title={onCardClick ? '点击跳转到检测明细' : ''}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="label">{card.label}</div>
                <div className="value" style={{ color: card.color }}>{card.value}</div>
                {card.subtext && (
                  <div className="subtext">{card.subtext}</div>
                )}
              </div>
              <div style={{ color: card.color, opacity: 0.8 }}>
                <Icon size={28} />
              </div>
            </div>
            {stats.passRate !== undefined && card.status === 'success' && (
              <div className="pass-rate">
                通过率 {stats.passRate}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
