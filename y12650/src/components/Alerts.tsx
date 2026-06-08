import { useAppStore } from '../store';

export default function Alerts() {
  const { alerts, removeAlert } = useAppStore();

  return (
    <div className="alert-overlay">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`alert-item ${a.type}`}
          onClick={() => removeAlert(a.id)}
        >
          <span>
            {a.type === 'danger' && '🚨'}
            {a.type === 'warning' && '⚠️'}
            {a.type === 'info' && 'ℹ️'}
          </span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}
