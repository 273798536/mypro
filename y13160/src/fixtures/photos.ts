import type { Photo } from '@/types';

const encode = (s: string) => encodeURIComponent(s);

export const DEFAULT_PHOTOS: Photo[] = [
  {
    id: 'photo-1',
    url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encode(
      'ocean research buoy in stormy waves, technical field notebook with handwritten readings Hs=230 cm, engineer holding a ruler, dusk lighting, photo realistic, 4k'
    )}&image_size=landscape_4_3`,
    caption: '现场照片-1：波高读数板读数（单位cm）',
    takenAt: '2026-06-12 17:42',
    annotations: [
      {
        id: 'ann-1-1',
        photoId: 'photo-1',
        stepId: 'step-1',
        bbox: [0.12, 0.35, 0.38, 0.28],
        originalReading: '白色塑封读数板：Hs = 230（单位 cm，手写，有涂改痕，原为 2300 mm 被划去',
        processedNote: '复算时怀疑原始登记单位不一致：原始说法应为 230 cm ≈ 2.30 m；B组缺口来源处',
      },
      {
        id: 'ann-1-2',
        photoId: 'photo-1',
        stepId: 'step-2',
        bbox: [0.55, 0.55, 0.32, 0.25],
        originalReading: '笔记本：Tz = 8200 ms，墨水迹清晰，圆珠笔记录',
        processedNote: '换算到秒：8200 ms ÷ 1000 = 8.2 s，A组链路中已正确换算',
      },
    ],
  },
  {
    id: 'photo-2',
    url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encode(
      'close up of buoy accelerometer display showing wave spectrum chart in Hz, lab calibration sticker, measurement cables, photo realistic'
    )}&image_size=landscape_4_3`,
    caption: '现场照片-2：频谱采集仪显示',
    takenAt: '2026-06-12 17:45',
    annotations: [
      {
        id: 'ann-2-1',
        photoId: 'photo-2',
        stepId: 'step-3',
        bbox: [0.3, 0.2, 0.5, 0.5],
        originalReading: '谱图上：fp = 0.122 Hz，峰位在 0.12Hz 刻度，由 Tz=8.2s 倒数验证 1/8.2≈0.122',
        processedNote: '步骤3公式 fp=1/Tz=0.122 Hz，与现场谱峰位置吻合，无单位问题',
      },
      {
        id: 'ann-2-2',
        photoId: 'photo-2',
        stepId: 'step-6',
        bbox: [0.05, 0.1, 0.15, 0.8],
        originalReading: '屏幕边缘贴纸条：λ≈104.8 m，深水波长估算值',
        processedNote: '步骤6 λ=g·Tz²/(2π)≈9.81×67.24/6.28≈104.8m，与截图数值一致',
      },
    ],
  },
  {
    id: 'photo-3',
    url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encode(
      'underwater buoy accelerometer sensor, calibration sheet with cm per second squared written in chinese field notes, waterproof housing, photo realistic'
    )}&image_size=landscape_4_3`,
    caption: '现场照片-3：加速度计原始记录',
    takenAt: '2026-06-12 17:48',
    annotations: [
      {
        id: 'ann-3-1',
        photoId: 'photo-3',
        stepId: 'step-4',
        bbox: [0.2, 0.4, 0.55, 0.3],
        originalReading: '记录纸：a_max = 42 cm/s²，铅笔勾划，墨水 0.42 m/s² 复核',
        processedNote: '换算 42 cm/s² → 0.42 m/s²，结构安全阈值内',
      },
    ],
  },
  {
    id: 'photo-4',
    url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encode(
      'ocean depth sounding chart, bathymetry lines labeled 38m, ship GPS location marker, photo realistic field document'
    )}&image_size=landscape_4_3`,
    caption: '现场照片-4：测站水深图',
    takenAt: '2026-06-12 18:02',
    annotations: [
      {
        id: 'ann-4-1',
        photoId: 'photo-4',
        stepId: 'step-5',
        bbox: [0.3, 0.3, 0.45, 0.35],
        originalReading: '水深断面图标注 38 m，换算 0.038 km',
        processedNote: 'A组水深 38 m、B组水深 0.038 km，一致；d/λ 比值≈0.363，处于过渡水深区域',
      },
      {
        id: 'ann-4-2',
        photoId: 'photo-4',
        stepId: 'step-7',
        bbox: [0.05, 0.75, 0.25, 0.2],
        originalReading: '图边注：有效波功率 P ≈ 86 kW/m',
        processedNote: '复算链路第7步 P=⅛·ρ·g·Hs²·Tz≈86.2 kW/m，与截图手写估算一致',
      },
    ],
  },
];
