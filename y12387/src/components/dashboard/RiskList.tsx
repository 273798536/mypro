import { RiskAlert } from '@/types';
import { RiskAlertCard } from '../common/RiskAlertCard';
import { useNavigate } from 'react-router-dom';

interface RiskListProps {
  alerts: RiskAlert[];
  onDismiss: (id: string) => void;
}

export const RiskList = ({ alerts, onDismiss }: RiskListProps) => {
  const navigate = useNavigate();

  const handleAlertClick = (alert: RiskAlert) => {
    if (alert.relatedObjectType === 'license') {
      navigate(`/licenses/${alert.relatedObjectId}`);
    } else if (alert.relatedObjectType === 'sample') {
      navigate(`/samples/${alert.relatedObjectId}`);
    } else if (alert.relatedObjectType === 'track') {
      navigate(`/tracks/${alert.relatedObjectId}`);
    }
  };

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">暂无风险预警，一切正常！</p>
        </div>
      ) : (
        alerts.map((alert) => (
          <RiskAlertCard
            key={alert.id}
            alert={alert}
            onDismiss={() => onDismiss(alert.id)}
            onClick={() => handleAlertClick(alert)}
          />
        ))
      )}
    </div>
  );
};
