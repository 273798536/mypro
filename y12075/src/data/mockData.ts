import type { Musician, Section, InstrumentSPL, Seat } from '../types';

export const sections: Section[] = [
  { id: 'strings', name: '弦乐', color: '#D4A843', instrumentTypes: ['小提琴', '中提琴', '大提琴', '低音提琴'] },
  { id: 'woodwinds', name: '木管', color: '#5BA88C', instrumentTypes: ['长笛', '双簧管', '单簧管', '巴松管'] },
  { id: 'brass', name: '铜管', color: '#C75B4A', instrumentTypes: ['圆号', '小号', '长号', '大号'] },
  { id: 'percussion', name: '打击乐', color: '#8B6BB5', instrumentTypes: ['定音鼓', '小军鼓', '大鼓', '镲'] },
];

export const musicians: Musician[] = [
  { id: 'm1', name: '张明', sectionId: 'strings', instrument: '小提琴', position: { x: -3, y: 0, z: -8 }, remark: '首席' },
  { id: 'm2', name: '李芳', sectionId: 'strings', instrument: '小提琴', position: { x: -1.5, y: 0, z: -8 } },
  { id: 'm3', name: '王磊', sectionId: 'strings', instrument: '小提琴', position: { x: 0, y: 0, z: -8 } },
  { id: 'm4', name: '赵燕', sectionId: 'strings', instrument: '小提琴', position: { x: 1.5, y: 0, z: -8 } },
  { id: 'm5', name: '陈刚', sectionId: 'strings', instrument: '中提琴', position: { x: -3, y: 0, z: -6 } },
  { id: 'm6', name: '刘洋', sectionId: 'strings', instrument: '中提琴', position: { x: -1.5, y: 0, z: -6 } },
  { id: 'm7', name: '周洁', sectionId: 'strings', instrument: '大提琴', position: { x: 0, y: 0, z: -6 } },
  { id: 'm8', name: '吴强', sectionId: 'strings', instrument: '大提琴', position: { x: 1.5, y: 0, z: -6 } },
  { id: 'm9', name: '孙涛', sectionId: 'strings', instrument: '低音提琴', position: { x: 3, y: 0, z: -6 } },
  { id: 'm10', name: '郑华', sectionId: 'strings', instrument: '低音提琴', position: { x: 4, y: 0, z: -6 }, remark: '位置待确认' },

  { id: 'm11', name: '黄丽', sectionId: 'woodwinds', instrument: '长笛', position: { x: -5, y: 0, z: -4 } },
  { id: 'm12', name: '林娜', sectionId: 'woodwinds', instrument: '长笛', position: { x: -3.8, y: 0, z: -4 } },
  { id: 'm13', name: '徐峰', sectionId: 'woodwinds', instrument: '双簧管', position: { x: -2.6, y: 0, z: -4 } },
  { id: 'm14', name: '马俊', sectionId: 'woodwinds', instrument: '单簧管', position: { x: -1.4, y: 0, z: -4 } },
  { id: 'm15', name: '杨柳', sectionId: 'woodwinds', instrument: '巴松管', position: { x: -0.2, y: 0, z: -4 } },

  { id: 'm16', name: '何伟', sectionId: 'brass', instrument: '圆号', position: { x: 3, y: 0, z: -4 } },
  { id: 'm17', name: '罗敏', sectionId: 'brass', instrument: '圆号', position: { x: 4.2, y: 0, z: -4 } },
  { id: 'm18', name: '谢军', sectionId: 'brass', instrument: '小号', position: { x: 5.4, y: 0, z: -4 } },
  { id: 'm19', name: '韩冰', sectionId: 'brass', instrument: '长号', position: { x: 3, y: 0, z: -2 } },
  { id: 'm20', name: '唐飞', sectionId: 'brass', instrument: '大号', position: null, remark: '位置待定，可能调整至后排' },

  { id: 'm21', name: '冯雷', sectionId: 'percussion', instrument: '定音鼓', position: { x: 6, y: 0, z: -2 } },
  { id: 'm22', name: '曹阳', sectionId: 'percussion', instrument: '小军鼓', position: { x: 7.5, y: 0, z: -2 } },
  { id: 'm23', name: '邓超', sectionId: 'percussion', instrument: '大鼓', position: { x: 6, y: 0, z: 0 } },
  { id: 'm24', name: '彭亮', sectionId: 'percussion', instrument: '镲', position: { x: 7.5, y: 0, z: 0 } },
];

export const instrumentSPLs: InstrumentSPL[] = [
  { musicianId: 'm1', spl: 89, frequency: 1000, isEstimated: false },
  { musicianId: 'm2', spl: 86, frequency: 1000, isEstimated: false },
  { musicianId: 'm3', spl: 87, frequency: 1000, isEstimated: false },
  { musicianId: 'm4', spl: 85, frequency: 1000, isEstimated: false },
  { musicianId: 'm5', spl: 84, frequency: 500, isEstimated: false },
  { musicianId: 'm6', spl: 83, frequency: 500, isEstimated: false },
  { musicianId: 'm7', spl: 86, frequency: 250, isEstimated: false },
  { musicianId: 'm8', spl: 85, frequency: 250, isEstimated: false },
  { musicianId: 'm9', spl: 88, frequency: 125, isEstimated: false },
  { musicianId: 'm10', spl: null, frequency: 125, isEstimated: true },
  { musicianId: 'm11', spl: 85, frequency: 2000, isEstimated: false },
  { musicianId: 'm12', spl: 83, frequency: 2000, isEstimated: false },
  { musicianId: 'm13', spl: 84, frequency: 1000, isEstimated: false },
  { musicianId: 'm14', spl: 86, frequency: 1000, isEstimated: false },
  { musicianId: 'm15', spl: 82, frequency: 500, isEstimated: false },
  { musicianId: 'm16', spl: 92, frequency: 500, isEstimated: false },
  { musicianId: 'm17', spl: 90, frequency: 500, isEstimated: false },
  { musicianId: 'm18', spl: 94, frequency: 1000, isEstimated: false },
  { musicianId: 'm19', spl: 93, frequency: 500, isEstimated: false },
  { musicianId: 'm20', spl: null, frequency: 250, isEstimated: true },
  { musicianId: 'm21', spl: 95, frequency: 250, isEstimated: false },
  { musicianId: 'm22', spl: 91, frequency: 1000, isEstimated: false },
  { musicianId: 'm23', spl: 96, frequency: 125, isEstimated: false },
  { musicianId: 'm24', spl: null, frequency: 1000, isEstimated: true },
];

export function generateSeats(): Seat[] {
  const seats: Seat[] = [];
  const rows = 12;
  const cols = 16;
  const startX = -7;
  const startZ = 3;
  const spacingX = 1;
  const spacingZ = 1.2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        id: `seat_${r}_${c}`,
        row: r + 1,
        col: c + 1,
        position: {
          x: startX + c * spacingX,
          y: r * 0.15,
          z: startZ + r * spacingZ,
        },
      });
    }
  }
  return seats;
}
