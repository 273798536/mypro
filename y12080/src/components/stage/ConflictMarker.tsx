import { Html } from '@react-three/drei';
import { DetectionResult } from '../../types';
import { useStageStore } from '../../store/useStageStore';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ConflictMarkerProps {
  result: DetectionResult;
}

export function ConflictMarker({ result }: ConflictMarkerProps) {
  const { selectedResultId, setSelectedResult } = useStageStore();
  const isSelected = selectedResultId === result.id;
  
  if (!result.position) return null;
  
  const typeConfig = {
    light_conflict: {
      color: '#e94560',
      icon: AlertTriangle,
      label: '灯位冲突',
    },
    route_occlusion: {
      color: '#f5d042',
      icon: AlertTriangle,
      label: '路线遮挡',
    },
    paragraph_mismatch: {
      color: '#9932cc',
      icon: Clock,
      label: '段落错位',
    },
  };
  
  const statusIcons = {
    pending: Clock,
    confirmed: CheckCircle,
    resolved: XCircle,
  };
  
  const config = typeConfig[result.type];
  const StatusIcon = statusIcons[result.status];
  const TypeIcon = config.icon;
  
  return (
    <group
      position={[result.position[0], result.position[1] + 0.5, result.position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedResult(isSelected ? null : result.id);
      }}
    >
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshBasicMaterial
          color={config.color}
          wireframe
          transparent
          opacity={isSelected ? 1 : 0.6}
        />
      </mesh>
      
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.5, 0.02, 1.5]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={isSelected ? 0.3 : 0.1}
        />
      </mesh>
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[1.5, 0.02, 1.5]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={isSelected ? 0.3 : 0.1}
        />
      </mesh>
      
      <Html
        position={[0, 1.2, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none', zIndex: 100 }}
      >
        <div
          className={`
            px-3 py-2 rounded-lg text-xs whitespace-nowrap max-w-xs
            ${isSelected 
              ? 'shadow-lg scale-110' 
              : ''
            }
          `}
          style={{
            backgroundColor: result.severity === 'error' 
              ? 'rgba(233, 69, 96, 0.95)' 
              : result.type === 'paragraph_mismatch'
                ? 'rgba(153, 50, 204, 0.95)'
                : 'rgba(245, 208, 66, 0.95)',
            color: result.type === 'route_occlusion' ? '#000' : '#fff',
          }}
        >
          <div className="flex items-center gap-1 font-bold mb-1">
            <TypeIcon size={12} />
            <span>{config.label}</span>
            {result.severity === 'error' && <span className="ml-1">严重</span>}
          </div>
          <div className="text-[10px] opacity-90 mb-1">
            {result.description}
          </div>
          <div className="flex items-center gap-1 text-[10px] opacity-80">
            <StatusIcon size={10} />
            <span>待确认 · 找{result.assignee || '相关负责人'}核</span>
          </div>
        </div>
      </Html>
    </group>
  );
}
