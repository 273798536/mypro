
import { useCallback } from 'react';
import type { PathNode, TransportPath, Anomaly } from '../types';
import { forbiddenZones } from '../data/sampleData';

const MIN_EXPECTED_LENGTH = 50;
const MAX_EXPECTED_LENGTH = 3000;

export function useAnomalyDetection() {
  const calculatePathLength = useCallback((nodes: PathNode[]): number => {
    let length = 0;
    for (let i = 1; i < nodes.length; i++) {
      const dx = nodes[i].x - nodes[i - 1].x;
      const dy = nodes[i].y - nodes[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }, []);

  const detectScaleMismatch = useCallback(
    (path: TransportPath): Anomaly | null => {
      const length = calculatePathLength(path.nodes);

      if (path.scale.unit === 'kilometer') {
        return {
          id: '',
          type: 'scale_mismatch',
          severity: 'high',
          description: '单位混淆：标注为千米，矿区路径通常以米为单位',
          sourceRef: path.source.name,
          beforeState: {
            unit: path.scale.unit,
            ratio: path.scale.ratio,
            pathLength: length.toFixed(1) + ' km',
          },
          afterState: {
            unit: 'meter',
            ratio: path.scale.expectedRatio || '1:5000',
            pathLength: length.toFixed(1) + ' m',
          },
          createdAt: new Date().toISOString(),
          isFixed: false,
        };
      }

      if (path.scale.unit === 'unknown') {
        return {
          id: '',
          type: 'unit_missing',
          severity: 'medium',
          description: '单位缺失：未标注坐标单位，使用默认值',
          sourceRef: path.source.name,
          beforeState: { unit: 'unknown', ratio: path.scale.ratio },
          afterState: { unit: 'meter', ratio: path.scale.expectedRatio || '1:5000' },
          createdAt: new Date().toISOString(),
          isFixed: false,
        };
      }

      if (length < MIN_EXPECTED_LENGTH || length > MAX_EXPECTED_LENGTH) {
        return {
          id: '',
          type: 'scale_mismatch',
          severity: 'high',
          description: `比例尺异常：路径长度${length.toFixed(1)}米超出合理范围(${MIN_EXPECTED_LENGTH}-${MAX_EXPECTED_LENGTH}米)`,
          sourceRef: path.source.name,
          beforeState: { ratio: path.scale.ratio, pathLength: length },
          afterState: { ratio: '1:5000', expectedLength: '正常范围' },
          createdAt: new Date().toISOString(),
          isFixed: false,
        };
      }

      return null;
    },
    [calculatePathLength]
  );

  const detectCoordinateFlip = useCallback((node: PathNode, nodeIndex: number): Anomaly | null => {
    if (node.x > 400 && node.y < 200) {
      return null;
    }

    for (const zone of forbiddenZones) {
      if (
        node.x >= zone.x &&
        node.x <= zone.x + zone.width &&
        node.y >= zone.y &&
        node.y <= zone.y + zone.height
      ) {
        return {
          id: '',
          type: 'coordinate_flip',
          severity: 'high',
          description: '坐标疑似翻转：路径经过禁行区域',
          sourceRef: '禁行区域检测',
          beforeState: { x: node.x, y: node.y, inForbiddenZone: true },
          afterState: { x: node.y, y: node.x, note: '建议交换X/Y坐标后重新检查' },
          createdAt: new Date().toISOString(),
          isFixed: false,
        };
      }
    }

    return null;
  }, []);

  const detectNodeAnomalies = useCallback(
    (nodes: PathNode[]): Map<string, Anomaly[]> => {
      const anomalyMap = new Map<string, Anomaly[]>();

      nodes.forEach((node, index) => {
        const anomalies: Anomaly[] = [...node.anomalies];

        const flipAnomaly = detectCoordinateFlip(node, index);
        if (flipAnomaly && !node.anomalies.some(a => a.type === 'coordinate_flip')) {
          anomalies.push(flipAnomaly);
        }

        if (anomalies.length > 0) {
          anomalyMap.set(node.id, anomalies);
        }
      });

      return anomalyMap;
    },
    [detectCoordinateFlip]
  );

  const getAllAnomalies = useCallback(
    (path: TransportPath): Anomaly[] => {
      const anomalies: Anomaly[] = [];

      const scaleAnomaly = detectScaleMismatch(path);
      if (scaleAnomaly) {
        anomalies.push(scaleAnomaly);
      }

      path.nodes.forEach((node) => {
        anomalies.push(...node.anomalies);
      });

      return anomalies;
    },
    [detectScaleMismatch]
  );

  return {
    detectScaleMismatch,
    detectCoordinateFlip,
    detectNodeAnomalies,
    getAllAnomalies,
    calculatePathLength,
  };
}
