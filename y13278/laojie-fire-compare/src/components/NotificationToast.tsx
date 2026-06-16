import { useApp } from '../state/AppContext';

export function NotificationToast() {
  const { notifications, dismissNotification, error, dismissError } = useApp();

  return (
    <>
      <div className="toast-container">
        {notifications.map(n => (
          <div key={n.id} className={`toast toast-${n.type}`}>
            <span className="toast-icon">
              {n.type === 'success' && '✅'}
              {n.type === 'error' && '❌'}
              {n.type === 'warning' && '⚠️'}
              {n.type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{n.message}</span>
            <button className="toast-close" onClick={() => dismissNotification(n.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={dismissError}>
            关闭
          </button>
        </div>
      )}
    </>
  );
}
