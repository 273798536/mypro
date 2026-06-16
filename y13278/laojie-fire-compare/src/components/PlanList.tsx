import { useApp } from '../state/AppContext';
import type { FirePlan } from '../types';

function statusBadge(status: FirePlan['status']) {
  const map: Record<FirePlan['status'], { label: string; className: string }> = {
    draft: { label: '草稿', className: 'badge badge-gray' },
    pending: { label: '待确认', className: 'badge badge-blue' },
    suspended: { label: '挂起待复核', className: 'badge badge-red' },
    confirmed: { label: '已归档', className: 'badge badge-green' },
  };
  return map[status];
}

interface PlanListProps {
  onCreateClick: () => void;
}

export function PlanList({ onCreateClick }: PlanListProps) {
  const { plans, currentView, selectPlan, loading } = useApp();

  return (
    <div className="panel plan-list">
      <div className="panel-header">
        <h3>老街消防方案比选</h3>
        <button className="btn btn-primary" onClick={onCreateClick} disabled={loading}>
          + 新建方案
        </button>
      </div>
      <div className="panel-body">
        {plans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">暂无方案</div>
            <div className="empty-desc">点击右上角「新建方案」开始创建</div>
          </div>
        ) : (
          <ul className="plan-items">
            {plans.map(plan => {
              const badge = statusBadge(plan.status);
              const unresolved = plan.conflicts.filter(c => !c.resolved).length;
              const isActive = currentView?.plan.id === plan.id;
              return (
                <li
                  key={plan.id}
                  className={`plan-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectPlan(plan.id)}
                >
                  <div className="plan-item-main">
                    <div className="plan-item-name">{plan.name}</div>
                    <div className="plan-item-meta">
                      <span className={badge.className}>{badge.label}</span>
                      {unresolved > 0 && (
                        <span className="badge badge-red pulse">{unresolved} 处待复核</span>
                      )}
                    </div>
                  </div>
                  <div className="plan-item-sub">
                    <span>版本 v{plan.version}</span>
                    <span>{new Date(plan.updatedAt).toLocaleDateString()}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
