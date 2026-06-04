import { Point, Annotation, ImportError, ImportWarning } from '../types';
import { detectFlipped } from './coordinate';

export function validateTrackData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['数据格式无效'] };
  }
  
  const trackData = data as Record<string, unknown>;
  
  if (!trackData.points || !Array.isArray(trackData.points)) {
    errors.push('缺少轨迹点数据');
  } else {
    (trackData.points as unknown[]).forEach((point, index) => {
      if (!point || typeof point !== 'object') {
        errors.push(`第 ${index + 1} 个点格式无效`);
        return;
      }
      const p = point as Record<string, unknown>;
      if (typeof p.x !== 'number' || typeof p.y !== 'number') {
        errors.push(`第 ${index + 1} 个点缺少坐标数据`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateImportFile(content: string): { valid: boolean; errors: ImportError[]; warnings: ImportWarning[] } {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  
  try {
    const data = JSON.parse(content);
    
    if (!data || typeof data !== 'object') {
      errors.push({
        type: 'invalid_format',
        message: '文件格式无效',
        actionableHint: '请确保上传有效的 JSON 格式文件'
      });
      return { valid: false, errors, warnings };
    }
    
    if (!data.tracks || !Array.isArray(data.tracks)) {
      errors.push({
        type: 'invalid_format',
        message: '缺少轨迹数据',
        actionableHint: '请确保文件包含 tracks 数组'
      });
      return { valid: false, errors, warnings };
    }
    
    if (data.scorecard === undefined || data.scorecard === null) {
      errors.push({
        type: 'missing_scorecard',
        message: '缺少评分表数据',
        actionableHint: '请补充评分表信息后重新上传'
      });
    }
    
    (data.tracks as unknown[]).forEach((track, index) => {
      if (track && typeof track === 'object' && 'points' in track) {
        const t = track as Record<string, unknown>;
        if (Array.isArray(t.points)) {
          if (detectFlipped(t.points as Point[])) {
            warnings.push({
              type: 'flipped_coordinates',
              message: `轨迹 ${index + 1} 坐标可能翻转`,
              autoFixed: true
            });
          }
        }
      }
    });
    
    return { valid: errors.length === 0, errors, warnings };
  } catch (e) {
    errors.push({
      type: 'parse_error',
      message: '文件解析失败',
      actionableHint: '请检查文件格式是否正确'
    });
    return { valid: false, errors, warnings };
  }
}

export function validateAnnotation(annotation: Partial<Annotation>): boolean {
  return (
    typeof annotation.x === 'number' &&
    typeof annotation.y === 'number' &&
    annotation.x >= 0 && annotation.x <= 1 &&
    annotation.y >= 0 && annotation.y <= 1
  );
}
