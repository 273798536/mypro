import { Track, ImportResult, Point } from '../types';
import { generateId, detectFlipped, flipCoordinates } from '../utils/coordinate';
import { findDuplicateTracks } from '../utils/deduplicate';

export async function parseFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseContent(content, file.name);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          errors: [{
            type: 'parse_error',
            message: '文件解析失败',
            actionableHint: '请检查文件格式是否正确'
          }]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        errors: [{
          type: 'parse_error',
          message: '文件读取失败',
          actionableHint: '请检查文件是否损坏'
        }]
      });
    };
    
    reader.readAsText(file);
  });
}

function parseContent(content: string, fileName: string): ImportResult {
  const errors: ImportResult['errors'] = [];
  const warnings: ImportResult['warnings'] = [];
  let tracks: Track[] = [];
  
  try {
    const data = JSON.parse(content);
    
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        errors: [{
          type: 'invalid_format',
          message: '文件格式无效',
          actionableHint: '请确保上传有效的 JSON 格式文件'
        }]
      };
    }
    
    if (data.scorecard === undefined || data.scorecard === null) {
      errors?.push({
        type: 'missing_scorecard',
        message: '缺少评分表数据',
        actionableHint: '请补充评分表信息后重新上传'
      });
    }
    
    if (data.tracks && Array.isArray(data.tracks)) {
      const parsedTracks = data.tracks.map((trackData: any, index: number) => {
        let points: Point[] = trackData.points || [];
        const isFlipped = detectFlipped(points);
        
        if (isFlipped) {
          points = flipCoordinates(points);
          warnings?.push({
            type: 'flipped_coordinates',
            message: `轨迹 ${index + 1} 坐标已自动翻转`,
            autoFixed: true
          });
        }
        
        return {
          id: generateId(),
          name: trackData.name || `轨迹 ${index + 1}`,
          points,
          color: trackData.color || getRandomColor(index),
          visible: true,
          batchId: trackData.batchId || data.batchId || `batch_${Date.now()}`,
          isFlipped,
          createdAt: new Date()
        };
      });
      
      tracks = parsedTracks;
    } else if (data.points && Array.isArray(data.points)) {
      let points: Point[] = data.points;
      const isFlipped = detectFlipped(points);
      
      if (isFlipped) {
        points = flipCoordinates(points);
        warnings?.push({
          type: 'flipped_coordinates',
          message: '轨迹坐标已自动翻转',
          autoFixed: true
        });
      }
      
      tracks = [{
        id: generateId(),
        name: data.name || fileName.replace(/\.[^/.]+$/, ''),
        points,
        color: data.color || '#165DFF',
        visible: true,
        batchId: data.batchId || `batch_${Date.now()}`,
        isFlipped,
        createdAt: new Date()
      }];
    } else {
      return {
        success: false,
        errors: [{
          type: 'invalid_format',
          message: '未找到有效的轨迹数据',
          actionableHint: '请确保文件包含 tracks 数组或 points 数组'
        }]
      };
    }
    
    return {
      success: errors?.length === 0,
      tracks,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        type: 'parse_error',
        message: 'JSON 解析失败',
        actionableHint: '请检查文件格式是否正确'
      }]
    };
  }
}

export function checkForDuplicates(newTracks: Track[], existingTracks: Track[]): {
  duplicates: { newTrack: Track; existingTrack: Track }[];
  uniqueTracks: Track[];
} {
  const duplicates: { newTrack: Track; existingTrack: Track }[] = [];
  const uniqueTracks: Track[] = [];
  
  for (const newTrack of newTracks) {
    const existingDuplicate = findDuplicateTracks(newTrack, existingTracks);
    if (existingDuplicate) {
      duplicates.push({ newTrack, existingTrack: existingDuplicate });
    } else {
      uniqueTracks.push(newTrack);
    }
  }
  
  return { duplicates, uniqueTracks };
}

function getRandomColor(index: number): string {
  const colors = [
    '#165DFF', '#00B42A', '#FF7D00', '#F53F3F', 
    '#722ED1', '#13C2C2', '#FFC53D', '#86909C'
  ];
  return colors[index % colors.length];
}
