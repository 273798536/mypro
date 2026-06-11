import type { InspectionRecord } from '@/types'

export const mockRecords: InspectionRecord[] = [
  {
    id: 'REC-001',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=museum%20display%20case%20interior%20with%20warm%20spotlight%20on%20porcelain%20vase%2C%20professional%20photography&image_size=landscape_4_3',
    floor: '2F',
    unit: 'A区',
    status: 'normal',
    timestamp: '2026-06-10T09:15:00',
    displayCaseId: 'DC-2A-01',
    lights: [
      { id: 'L001', position: { x: 150, y: 40 }, type: 'top', colorTemp: 3000, illuminance: 350, label: '顶部主灯-1', isAnomaly: false },
      { id: 'L002', position: { x: 350, y: 40 }, type: 'top', colorTemp: 3000, illuminance: 340, label: '顶部主灯-2', isAnomaly: false },
      { id: 'L003', position: { x: 250, y: 80 }, type: 'side', colorTemp: 4000, illuminance: 150, label: '侧面补光-左', isAnomaly: false },
      { id: 'L004', position: { x: 50, y: 200 }, type: 'bottom', colorTemp: 3500, illuminance: 80, label: '底部氛围灯', isAnomaly: false },
    ]
  },
  {
    id: 'REC-002',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=museum%20glass%20display%20case%20with%20cool%20LED%20lighting%20on%20bronze%20artifact%2C%20slightly%20dim&image_size=landscape_4_3',
    floor: '2F',
    unit: 'B区',
    status: 'anomaly',
    timestamp: '2026-06-10T10:30:00',
    displayCaseId: 'DC-2B-03',
    lights: [
      { id: 'L005', position: { x: 150, y: 40 }, type: 'top', colorTemp: 5000, illuminance: 200, label: '顶部主灯-1', isAnomaly: true, anomalyNote: '照度偏低，标准值≥300lux，当前仅200lux' },
      { id: 'L006', position: { x: 350, y: 40 }, type: 'top', colorTemp: 5000, illuminance: 310, label: '顶部主灯-2', isAnomaly: false },
      { id: 'L007', position: { x: 450, y: 80 }, type: 'side', colorTemp: 4000, illuminance: 180, label: '侧面补光-右', isAnomaly: true, anomalyNote: '色温偏高，青铜器推荐≤4000K' },
      { id: 'L008', position: { x: 250, y: 200 }, type: 'accent', colorTemp: 3000, illuminance: 120, label: '重点射灯', isAnomaly: false },
    ]
  },
  {
    id: 'REC-003',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=museum%20display%20cabinet%20with%20fiber%20optic%20lighting%20on%20jade%20ornaments%2C%20professional&image_size=landscape_4_3',
    floor: '3F-A区',
    unit: '',
    status: 'normal',
    timestamp: '2026-06-10T14:00:00',
    displayCaseId: 'DC-3A-02',
    lights: [
      { id: 'L009', position: { x: 200, y: 35 }, type: 'top', colorTemp: 3500, illuminance: 280, label: '顶部光纤-1', isAnomaly: false },
      { id: 'L010', position: { x: 300, y: 35 }, type: 'top', colorTemp: 3500, illuminance: 275, label: '顶部光纤-2', isAnomaly: false },
      { id: 'L011', position: { x: 100, y: 100 }, type: 'side', colorTemp: 3500, illuminance: 130, label: '侧面柔光', isAnomaly: false },
    ]
  },
  {
    id: 'REC-004',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=museum%20exhibition%20case%20with%20warm%20track%20lighting%20on%20calligraphy%20scroll%2C%20professional&image_size=landscape_4_3',
    floor: 'B1',
    unit: 'C区',
    status: 'revoked',
    revokeReason: '巡检时展柜正在维修，灯光数据不可用',
    timestamp: '2026-06-09T16:20:00',
    displayCaseId: 'DC-B1C-01',
    lights: [
      { id: 'L012', position: { x: 180, y: 40 }, type: 'top', colorTemp: 3000, illuminance: 0, label: '顶部轨道灯-1', isAnomaly: true, anomalyNote: '灯具已拆除，维修中' },
      { id: 'L013', position: { x: 320, y: 40 }, type: 'top', colorTemp: 3000, illuminance: 0, label: '顶部轨道灯-2', isAnomaly: true, anomalyNote: '灯具已拆除，维修中' },
    ]
  },
  {
    id: 'REC-005',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=museum%20wall%20display%20case%20with%20even%20LED%20panel%20lighting%20on%20textile%20artifact%2C%20museum%20photography&image_size=landscape_4_3',
    floor: '1F',
    unit: 'D区',
    status: 'normal',
    timestamp: '2026-06-11T08:45:00',
    displayCaseId: 'DC-1D-04',
    lights: [
      { id: 'L014', position: { x: 250, y: 30 }, type: 'top', colorTemp: 3500, illuminance: 300, label: '顶部面板灯', isAnomaly: false },
      { id: 'L015', position: { x: 80, y: 120 }, type: 'side', colorTemp: 3500, illuminance: 140, label: '左侧面板灯', isAnomaly: false },
      { id: 'L016', position: { x: 420, y: 120 }, type: 'side', colorTemp: 3500, illuminance: 145, label: '右侧面板灯', isAnomaly: false },
      { id: 'L017', position: { x: 250, y: 210 }, type: 'bottom', colorTemp: 3000, illuminance: 60, label: '底部灯带', isAnomaly: false },
    ]
  },
]
