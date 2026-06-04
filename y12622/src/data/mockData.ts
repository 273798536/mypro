import type { Equipment, SourceImage, Processing, Anomaly, Opinion, Conclusion } from '../types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMicroscopeImageData(width: number = 400, height: number = 300): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
  gradient.addColorStop(0, '#1a365d');
  gradient.addColorStop(0.5, '#2c5282');
  gradient.addColorStop(1, '#1a365d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(72, 187, 120, 0.6)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 8 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(237, 137, 54, 0.7)';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 6 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(245, 101, 101, 0.8)';
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 10 + 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

const mockEquipment: Omit<Equipment, 'id' | 'created_at'>[] = [
  {
    name: '光学显微镜 A-1',
    model: 'Olympus BX53',
    sn: 'SN-2024-00156',
    location: '康复中心实验室 A区',
    status: 'active',
  },
  {
    name: '电子显微镜 B-2',
    model: 'Zeiss Sigma 300',
    sn: 'SN-2024-00278',
    location: '康复中心实验室 B区',
    status: 'active',
  },
  {
    name: '荧光显微镜 C-3',
    model: 'Nikon Eclipse Ti2',
    sn: 'SN-2024-00342',
    location: '康复中心实验室 C区',
    status: 'maintenance',
  },
  {
    name: '共聚焦显微镜 D-4',
    model: 'Leica TCS SP8',
    sn: 'SN-2024-00489',
    location: '康复中心实验室 D区',
    status: 'active',
  },
];

const imageData1 = generateMicroscopeImageData(500, 400);
const imageData2 = generateMicroscopeImageData(450, 350);
const imageData3 = generateMicroscopeImageData(480, 380);
const imageData4 = generateMicroscopeImageData(520, 420);
const imageData5 = generateMicroscopeImageData(400, 320);

const now = new Date();
const mockSourceImages: Omit<SourceImage, 'id' | 'import_time'>[] = [
  {
    equipment_id: 'eq_mock_001',
    image_hash: 'hash_001_microscope_sample_a',
    coordinates: '125.50, 78.25',
    batch_no: 'BATCH-2026-001',
    file_name: 'sample_a_001.png',
    file_size: 256000,
    file_data: imageData1,
    imported_by: '李康复师',
  },
  {
    equipment_id: 'eq_mock_001',
    image_hash: 'hash_002_microscope_sample_b',
    coordinates: '130.25, 82.50',
    batch_no: 'BATCH-2026-001',
    file_name: 'sample_a_002.png',
    file_size: 234000,
    file_data: imageData2,
    imported_by: '李康复师',
  },
  {
    equipment_id: 'eq_mock_002',
    image_hash: 'hash_003_microscope_sample_c',
    coordinates: '200.10, 150.75',
    batch_no: 'BATCH-2026-002',
    file_name: 'sample_b_001.png',
    file_size: 278000,
    file_data: imageData3,
    imported_by: '王康复师',
  },
  {
    equipment_id: 'eq_mock_002',
    image_hash: 'hash_004_microscope_sample_d',
    coordinates: '210.50, 160.25',
    batch_no: 'BATCH-2026-002',
    file_name: 'sample_b_002.png',
    file_size: 298000,
    file_data: imageData4,
    imported_by: '王康复师',
  },
  {
    equipment_id: 'eq_mock_004',
    image_hash: 'hash_005_microscope_sample_e',
    coordinates: '305.75, 205.50',
    batch_no: 'BATCH-2026-003',
    file_name: 'sample_d_001.png',
    file_size: 212000,
    file_data: imageData5,
    imported_by: '张康复师',
  },
];

const mockProcessings: Omit<Processing, 'id' | 'start_time' | 'last_modified_at'>[] = [
  {
    source_image_id: 'img_mock_001',
    zoom_level: 1.5,
    pan_offset: { x: 25, y: -15 },
    processed_by: '李康复师',
    mode: 'browse',
  },
  {
    source_image_id: 'img_mock_002',
    zoom_level: 2.0,
    pan_offset: { x: 40, y: 10 },
    processed_by: '李康复师',
    mode: 'browse',
  },
  {
    source_image_id: 'img_mock_003',
    zoom_level: 1.8,
    pan_offset: { x: -20, y: 30 },
    processed_by: '王康复师',
    mode: 'browse',
  },
  {
    source_image_id: 'img_mock_004',
    zoom_level: 2.5,
    pan_offset: { x: 50, y: -25 },
    processed_by: '王康复师',
    mode: 'browse',
  },
  {
    source_image_id: 'img_mock_005',
    zoom_level: 1.2,
    pan_offset: { x: 15, y: 20 },
    processed_by: '张康复师',
    mode: 'browse',
  },
];

const mockAnomalies: Omit<Anomaly, 'id' | 'created_at'>[] = [
  {
    processing_id: 'proc_mock_001',
    position_x: 150.25,
    position_y: 95.50,
    severity: 'high',
    color_code: '#dc2626',
    technical_reason: 'COLOR_CHANNEL_OUTLIER_R',
    human_reason: '红色通道数值超出正常范围',
  },
  {
    processing_id: 'proc_mock_001',
    position_x: 180.75,
    position_y: 110.25,
    severity: 'medium',
    color_code: '#ea580c',
    technical_reason: 'INTENSITY_ABOVE_THRESHOLD',
    human_reason: '亮度超过正常上限',
  },
  {
    processing_id: 'proc_mock_002',
    position_x: 145.50,
    position_y: 90.75,
    severity: 'low',
    color_code: '#d97706',
    technical_reason: 'TEXTURE_IRREGULARITY',
    human_reason: '纹理模式异常，与周围区域不一致',
  },
  {
    processing_id: 'proc_mock_003',
    position_x: 225.30,
    position_y: 165.80,
    severity: 'high',
    color_code: '#dc2626',
    technical_reason: 'COLOR_CHANNEL_OUTLIER_B',
    human_reason: '蓝色通道数值超出正常范围',
  },
  {
    processing_id: 'proc_mock_003',
    position_x: 210.45,
    position_y: 155.25,
    severity: 'medium',
    color_code: '#ea580c',
    technical_reason: 'EDGE_DETECTION_ANOMALY',
    human_reason: '边缘轮廓不清晰或不规则',
  },
  {
    processing_id: 'proc_mock_004',
    position_x: 235.60,
    position_y: 175.40,
    severity: 'critical',
    color_code: '#991b1b',
    technical_reason: 'COLOR_CHANNEL_OUTLIER_G',
    human_reason: '绿色通道数值超出正常范围',
  },
  {
    processing_id: 'proc_mock_004',
    position_x: 250.20,
    position_y: 190.10,
    severity: 'medium',
    color_code: '#ea580c',
    technical_reason: 'GRADIENT_ABNORMALITY',
    human_reason: '颜色过渡不自然，存在突变',
  },
  {
    processing_id: 'proc_mock_004',
    position_x: 240.75,
    position_y: 182.50,
    severity: 'low',
    color_code: '#d97706',
    technical_reason: 'NOISE_EXCESSIVE',
    human_reason: '图像噪点过多，影响观察',
  },
  {
    processing_id: 'proc_mock_005',
    position_x: 325.50,
    position_y: 220.75,
    severity: 'high',
    color_code: '#dc2626',
    technical_reason: 'INTENSITY_BELOW_THRESHOLD',
    human_reason: '亮度低于正常下限',
  },
  {
    processing_id: 'proc_mock_005',
    position_x: 310.25,
    position_y: 210.50,
    severity: 'low',
    color_code: '#d97706',
    technical_reason: 'BLUR_DETECTED',
    human_reason: '图像模糊，细节不清晰',
  },
];

const mockOpinions: Omit<Opinion, 'id' | 'created_at'>[] = [
  {
    processing_id: 'proc_mock_001',
    processing_opinion: '建议立即停用设备A-1，安排工程师进行光路校准检查。此异常可能影响检测结果的准确性。',
  },
  {
    processing_id: 'proc_mock_003',
    processing_opinion: '蓝色通道异常较为严重，需要对设备B-2进行全面的色彩校准。建议暂停使用该设备进行高敏感度检测。',
  },
  {
    processing_id: 'proc_mock_004',
    processing_opinion: '绿色通道异常与之前红色通道异常模式相似，提示可能存在系统性问题。建议对设备B-2进行全面检修。',
  },
];

const mockConclusions: Omit<Conclusion, 'id' | 'reviewed_at'>[] = [
  {
    processing_id: 'proc_mock_001',
    status: 'approved',
    conclusion_text: '确认设备A-1存在红色通道异常，已安排检修，暂停用于高精度检测。',
    processing_opinion: '建议立即停用设备A-1，安排工程师进行光路校准检查。此异常可能影响检测结果的准确性。',
    reviewed_by: '陈主任',
  },
  {
    processing_id: 'proc_mock_003',
    status: 'approved',
    conclusion_text: '设备B-2蓝色通道异常确认，需进行色彩校准，已通知维护团队。',
    processing_opinion: '蓝色通道异常较为严重，需要对设备B-2进行全面的色彩校准。建议暂停使用该设备进行高敏感度检测。',
    reviewed_by: '陈主任',
  },
];

interface StoreInterface {
  addEquipment: (eq: Omit<Equipment, 'id' | 'created_at'>) => string;
  importImages: (images: Omit<SourceImage, 'id' | 'import_time'>[]) => Promise<any>;
  saveProcessing: (p: Omit<Processing, 'id' | 'start_time' | 'last_modified_at'>) => string;
  addAnomaly: (a: Omit<Anomaly, 'id' | 'created_at'>) => string;
  addOpinion: (o: Omit<Opinion, 'id' | 'created_at'>) => string;
  saveConclusion: (c: Omit<Conclusion, 'id' | 'reviewed_at'>) => string;
  equipment: Equipment[];
  sourceImages: SourceImage[];
}

let _mockDataLoading = false;
let _mockDataLoaded = false;

export async function loadMockData(store: StoreInterface): Promise<void> {
  if (_mockDataLoading || _mockDataLoaded) return;
  if (store.equipment.length > 0 || store.sourceImages.length > 0) {
    _mockDataLoaded = true;
    return;
  }

  _mockDataLoading = true;

  const equipmentIdMap: Record<string, string> = {};
  for (let i = 0; i < mockEquipment.length; i++) {
    const newId = store.addEquipment(mockEquipment[i]);
    equipmentIdMap[`eq_mock_00${i + 1}`] = newId;
  }

  const imagesToImport = mockSourceImages.map((img, index) => ({
    ...img,
    equipment_id: equipmentIdMap[`eq_mock_00${index < 2 ? 1 : index < 4 ? 2 : 4}`],
  }));

  const importResult = await store.importImages(imagesToImport);
  const importedImageIds = importResult.imported?.map((img: SourceImage) => img.id) || [];

  const imageIdMap: Record<string, string> = {};
  for (let i = 0; i < 5; i++) {
    imageIdMap[`img_mock_00${i + 1}`] = importedImageIds[i] || '';
  }

  const processingIdMap: Record<string, string> = {};
  for (let i = 0; i < mockProcessings.length; i++) {
    const proc = mockProcessings[i];
    const newId = store.saveProcessing({
      ...proc,
      source_image_id: imageIdMap[`img_mock_00${i + 1}`],
    });
    processingIdMap[`proc_mock_00${i + 1}`] = newId;
  }

  for (let i = 0; i < mockAnomalies.length; i++) {
    const anom = mockAnomalies[i];
    const procKey = `proc_mock_00${i < 2 ? 1 : i < 3 ? 2 : i < 5 ? 3 : i < 8 ? 4 : 5}`;
    store.addAnomaly({
      ...anom,
      processing_id: processingIdMap[procKey],
    });
  }

  for (let i = 0; i < mockOpinions.length; i++) {
    const op = mockOpinions[i];
    const procKey = `proc_mock_00${i === 0 ? 1 : i === 1 ? 3 : 4}`;
    store.addOpinion({
      processing_id: processingIdMap[procKey],
      processing_opinion: op.processing_opinion,
    });
  }

  for (let i = 0; i < mockConclusions.length; i++) {
    const conc = mockConclusions[i];
    const procKey = `proc_mock_00${i === 0 ? 1 : 3}`;
    store.saveConclusion({
      ...conc,
      processing_id: processingIdMap[procKey],
    });
  }

  _mockDataLoading = false;
  _mockDataLoaded = true;
}
