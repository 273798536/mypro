import type { InspectionPhoto } from '../types'

export const mockPhotos: InspectionPhoto[] = [
  {
    id: 'photo-001',
    url: 'https://picsum.photos/seed/infusion1/400/300',
    name: '1楼输液柜巡检照片',
    floorRaw: '1层',
    floorNormalized: '1层',
    coordinateX: 120,
    coordinateY: 180,
    coordinateSystem: 'A',
    materialNameOnPhoto: '输液器',
    takenAt: '2024-03-15 09:23:45'
  },
  {
    id: 'photo-002',
    url: 'https://picsum.photos/seed/gloves2/400/300',
    name: '2楼手套存放区照片',
    floorRaw: '2层',
    floorNormalized: '2层',
    coordinateX: 240,
    coordinateY: 310,
    coordinateSystem: 'A',
    materialNameOnPhoto: '手套',
    takenAt: '2024-03-15 10:15:32'
  },
  {
    id: 'photo-003',
    url: 'https://picsum.photos/seed/gauze3f/400/300',
    name: '3楼纱布存放点',
    floorRaw: '3F',
    floorNormalized: '3层',
    coordinateX: 180,
    coordinateY: 250,
    coordinateSystem: 'A',
    materialNameOnPhoto: '医用纱布',
    takenAt: '2024-03-15 11:42:18'
  },
  {
    id: 'photo-004',
    url: 'https://picsum.photos/seed/syringe1f/400/300',
    name: '1楼注射器巡检',
    floorRaw: '1F',
    floorNormalized: '1层',
    coordinateX: 300,
    coordinateY: 150,
    coordinateSystem: 'B',
    materialNameOnPhoto: '一次性注射器',
    takenAt: '2024-03-15 13:05:22'
  },
  {
    id: 'photo-005',
    url: 'https://picsum.photos/seed/mask2a/400/300',
    name: '2楼口罩存放区-A',
    floorRaw: '2层',
    floorNormalized: '2层',
    coordinateX: 150,
    coordinateY: 200,
    coordinateSystem: 'A',
    materialNameOnPhoto: '医用外科口罩',
    takenAt: '2024-03-15 14:30:10'
  },
  {
    id: 'photo-006',
    url: 'https://picsum.photos/seed/mask2b/400/300',
    name: '2楼口罩存放区-B',
    floorRaw: '2层',
    floorNormalized: '2层',
    coordinateX: 400,
    coordinateY: 180,
    coordinateSystem: 'B',
    materialNameOnPhoto: '医用外科口罩',
    takenAt: '2024-03-15 14:35:55'
  },
  {
    id: 'photo-007',
    url: 'https://picsum.photos/seed/cotton3/400/300',
    name: '3楼消毒棉片巡检',
    floorRaw: '3层',
    floorNormalized: '3层',
    coordinateX: 200,
    coordinateY: 280,
    coordinateSystem: 'A',
    materialNameOnPhoto: '消毒棉片',
    takenAt: '2024-03-15 15:22:40'
  },
  {
    id: 'photo-008',
    url: 'https://picsum.photos/seed/infusion1b/400/300',
    name: '1楼输液器二次巡检',
    floorRaw: '1层',
    floorNormalized: '1层',
    coordinateX: 125,
    coordinateY: 182,
    coordinateSystem: 'A',
    materialNameOnPhoto: '一次性输液器',
    takenAt: '2024-03-15 16:10:33'
  }
]
