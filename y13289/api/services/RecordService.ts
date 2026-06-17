import { RecordRepository } from '../repositories/RecordRepository';
import { HistoryRepository } from '../repositories/HistoryRepository';
import type { DeliveryRecord, FilterCriteria, DataIssue } from '@shared/types';

export class RecordService {
  private recordRepo = new RecordRepository();
  private historyRepo = new HistoryRepository();
  private operator = '交通工程师';

  async getAllRecords(filters: FilterCriteria = {}): Promise<DeliveryRecord[]> {
    return this.recordRepo.findAll(filters);
  }

  async getRecordById(id: string): Promise<DeliveryRecord | null> {
    const record = this.recordRepo.findById(id);
    if (record) {
      const mergeEvidence = this.historyRepo.getMergeEvidence(id);
      if (mergeEvidence) {
        record.mergeEvidence = mergeEvidence;
      }
    }
    return record;
  }

  async createRecord(data: Omit<DeliveryRecord, 'id' | 'createdAt' | 'updatedAt' | 'issues'>): Promise<string> {
    const id = this.recordRepo.create(data);
    this.detectAndAddIssues(id);
    return id;
  }

  async updateRecord(id: string, updates: Partial<DeliveryRecord>, note?: string): Promise<void> {
    const oldRecord = this.recordRepo.findById(id);
    if (!oldRecord) return;

    const fieldLabels: Record<string, string> = {
      marketName: '菜场名称',
      location: '卸货地点',
      coordinates: '坐标',
      deliveryTime: '卸货时间',
      truckNumber: '车牌号',
      goodsType: '货物类型',
      status: '状态',
    };

    for (const [key, value] of Object.entries(updates)) {
      let oldValue = '';
      let newValue = '';

      if (key === 'coordinates') {
        const newCoord = value as { lat: number; lng: number };
        oldValue = `${oldRecord.coordinates.lat}, ${oldRecord.coordinates.lng}`;
        newValue = `${newCoord.lat}, ${newCoord.lng}`;
      } else if (key in oldRecord) {
        oldValue = String((oldRecord as any)[key] || '');
        newValue = String(value || '');
      }

      if (oldValue !== newValue && fieldLabels[key]) {
        this.historyRepo.addHistory(
          id,
          fieldLabels[key],
          oldValue,
          newValue,
          this.operator,
          note
        );
      }
    }

    this.recordRepo.update(id, updates);
    this.detectAndAddIssues(id);
  }

  async deleteRecord(id: string): Promise<void> {
    this.recordRepo.delete(id);
  }

  async resolveIssue(issueId: string): Promise<void> {
    this.recordRepo.resolveIssue(issueId);
  }

  async validateCoordinates(id: string): Promise<{ valid: boolean; offset: number; suggestion: string } | null> {
    const record = this.recordRepo.findById(id);
    if (!record) return null;

    const raw = record.coordinatesRaw;
    const current = record.coordinates;
    const offset = this.calculateDistance(raw.lat, raw.lng, current.lat, current.lng);

    const threshold = 500;
    const valid = offset <= threshold;

    let suggestion = '';
    if (!valid) {
      suggestion = `坐标偏移约${Math.round(offset)}米，可能已到隔壁街道。建议：1. 核对地址"${record.location}"对应的正确坐标；2. 使用地图工具搜索该地址获取准确经纬度；3. 确认是否存在同名地点。`;
    }

    return { valid, offset, suggestion };
  }

  async findSimilarLocations(): Promise<Array<{ records: DeliveryRecord[]; similarity: number; suggestion: string }>> {
    const records = this.recordRepo.findAll();
    const groups: Array<{ records: DeliveryRecord[]; similarity: number; suggestion: string }> = [];

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const r1 = records[i];
        const r2 = records[j];

        const nameSimilarity = this.calculateNameSimilarity(r1.marketName, r2.marketName);
        const distance = this.calculateDistance(
          r1.coordinates.lat, r1.coordinates.lng,
          r2.coordinates.lat, r2.coordinates.lng
        );

        if (nameSimilarity > 0.7 || distance < 100) {
          groups.push({
            records: [r1, r2],
            similarity: Math.max(nameSimilarity, 1 - distance / 1000),
            suggestion: `检测到"${r1.marketName}"和"${r2.marketName}"可能是同一地点。名称相似度${Math.round(nameSimilarity * 100)}%，距离约${Math.round(distance)}米。请确认是否归并。`,
          });
        }
      }
    }

    return groups;
  }

  async mergeLocations(targetId: string, sourceIds: string[], reason: string): Promise<void> {
    const target = this.recordRepo.findById(targetId);
    if (!target) return;

    const sourceNames: string[] = [];
    for (const sid of sourceIds) {
      const source = this.recordRepo.findById(sid);
      if (source) {
        sourceNames.push(source.marketName);
        this.historyRepo.addHistory(
          targetId,
          '地点归并',
          '',
          `归并了 ${source.marketName}`,
          this.operator,
          reason
        );
        this.recordRepo.delete(sid);
      }
    }

    this.historyRepo.addMergeEvidence(
      targetId,
      sourceIds,
      sourceNames,
      this.operator,
      reason
    );

    this.recordRepo.update(targetId, { status: 'merged' });
  }

  private detectAndAddIssues(recordId: string): void {
    const record = this.recordRepo.findById(recordId);
    if (!record) return;

    const existingIssues = this.recordRepo.getIssues(recordId);

    const coordOffset = this.calculateDistance(
      record.coordinatesRaw.lat, record.coordinatesRaw.lng,
      record.coordinates.lat, record.coordinates.lng
    );

    if (coordOffset > 500) {
      const hasIssue = existingIssues.some(i => i.type === 'coordinate_offset' && !i.resolved);
      if (!hasIssue) {
        this.recordRepo.addIssue(recordId, {
          type: 'coordinate_offset',
          severity: 'error',
          description: `坐标偏移约${Math.round(coordOffset)}米，可能已到隔壁街道。原始坐标(${record.coordinatesRaw.lat}, ${record.coordinatesRaw.lng})，当前坐标(${record.coordinates.lat}, ${record.coordinates.lng})`,
          suggestion: '请核对地址对应的正确坐标，建议使用地图工具查询准确经纬度后修正。修正后请标记此问题为已解决。',
        });
      }
    }

    const time = record.deliveryTime;
    if (time) {
      const hour = parseInt(time.split(' ')[1]?.split(':')[0] || '0');
      if (hour < 6) {
        const hasIssue = existingIssues.some(i => i.type === 'time_conflict' && !i.resolved);
        if (!hasIssue) {
          this.recordRepo.addIssue(recordId, {
            type: 'time_conflict',
            severity: 'warning',
            description: `卸货时间${time}早于该路段允许卸货时间（6:00开始）`,
            suggestion: '请确认卸货时间是否正确，或申请该时段的特殊卸货许可。如已确认无误请标记此问题为已解决。',
          });
        }
      }
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateNameSimilarity(a: string, b: string): number {
    const s1 = a.replace(/[菜市场]/g, '');
    const s2 = b.replace(/[菜市场]/g, '');
    if (s1 === s2) return 1;

    let matches = 0;
    for (const char of s1) {
      if (s2.includes(char)) matches++;
    }
    return matches / Math.max(s1.length, s2.length);
  }
}
