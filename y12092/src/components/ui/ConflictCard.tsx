import { useNavigate } from 'react-router-dom';
import { ChevronRight, Camera, MapPin, Eye, AlertTriangle } from 'lucide-react';
import type { Conflict, Camera as CameraType } from '@/types';
import { useAppStore } from '@/store';
import StatusBadge from './StatusBadge';

interface ConflictCardProps {
  conflict: Conflict;
  cameras: CameraType[];
}

export default function ConflictCard({ conflict, cameras }: ConflictCardProps) {
  const navigate = useNavigate();
  const setSelectedConflict = useAppStore(state => state.setSelectedConflict);
  
  const cameraA = cameras.find(c => c.id === conflict.cameraAId);
  const cameraB = conflict.cameraBId ? cameras.find(c => c.id === conflict.cameraBId) : undefined;
  
  const severityColor = {
    critical: 'border-l-red-500 hover:bg-red-950/30',
    warning: 'border-l-orange-500 hover:bg-orange-950/30',
    info: 'border-l-yellow-500 hover:bg-yellow-950/30',
  };
  
  const typeIcon = {
    position: <MapPin className="w-4 h-4" />,
    occlusion: <Eye className="w-4 h-4" />,
    boundary: <AlertTriangle className="w-4 h-4" />,
  };
  
  const handleClick = () => {
    setSelectedConflict(conflict.id);
    navigate(`/conflict/${conflict.id}`);
  };
  
  return (
    <div
      onClick={handleClick}
      className={`
        p-3 rounded-lg border-l-4 bg-gray-800/50 border border-gray-700
        cursor-pointer transition-all duration-200
        ${severityColor[conflict.severity]}
        ${conflict.status === 'resolved' ? 'opacity-60' : ''}
        ${conflict.status === 'accepted' ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge type="conflictType" value={conflict.type} size="sm" />
            <StatusBadge type="severity" value={conflict.severity} size="sm" />
            <StatusBadge type="status" value={conflict.status} size="sm" />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-1.5">
            {typeIcon[conflict.type]}
            <span className="font-medium">
              {cameraA?.number && `${cameraA.number}号`}
              {cameraB?.number && ` ↔ ${cameraB.number}号`}
              <span className="text-gray-500 ml-1">
                {cameraA?.name}
                {cameraB?.name && ` / ${cameraB.name}`}
              </span>
            </span>
          </div>
          
          <p className="text-xs text-gray-400 line-clamp-2">
            {conflict.humanDescription}
          </p>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {cameraA?.operator && (
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {cameraA.operator}
                {cameraB?.operator && ` / ${cameraB.operator}`}
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
