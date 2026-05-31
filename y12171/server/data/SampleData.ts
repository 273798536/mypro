import type {
  SamplePack,
  LicenseAgreement,
  TrackProject,
  SampleUsage
} from '../../shared/types'

export function generateSampleData(): {
  samplePacks: SamplePack[]
  licenses: LicenseAgreement[]
  tracks: TrackProject[]
  usages: SampleUsage[]
} {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  const samplePacks: SamplePack[] = [
    {
      id: 'pack-001',
      name: '嘻哈鼓点精选 Vol.1',
      vendor: 'DrumMaster Pro',
      purchaseDate: '2024-01-15',
      cost: 299,
      fileCount: 250,
      notes: '包含 250 个嘻哈鼓点采样，Trap 风格',
      tags: ['嘻哈', 'Trap', '鼓点'],
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    },
    {
      id: 'pack-002',
      name: '电子合成音色包',
      vendor: 'SynthWave Studio',
      purchaseDate: '2024-03-20',
      cost: 499,
      fileCount: 500,
      notes: 'EDM电子合成音色，包括Lead、Bass、Pad等',
      tags: ['电子', 'EDM', '合成器'],
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    },
    {
      id: 'pack-003',
      name: '嘻哈鼓点精选 Vol.1',
      vendor: 'BeatFactory',
      purchaseDate: '2024-06-10',
      cost: 199,
      fileCount: 180,
      notes: '同名采样包，来自不同供应商，价格更低',
      tags: ['嘻哈', '鼓点'],
      createdAt: sixtyDaysAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString()
    },
    {
      id: 'pack-004',
      name: 'Lo-Fi 氛围采样',
      vendor: 'ChillVibes',
      purchaseDate: '2024-08-05',
      cost: 0,
      fileCount: 100,
      notes: '免费非商用Lo-Fi采样包，需要署名',
      tags: ['Lo-Fi', '氛围'],
      createdAt: sixtyDaysAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString()
    },
    {
      id: 'pack-005',
      name: '影视配乐弦乐',
      vendor: 'OrchestraSounds',
      purchaseDate: '2023-11-20',
      cost: 899,
      fileCount: 1000,
      tags: ['影视', '弦乐', '古典'],
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    }
  ]

  const licenses: LicenseAgreement[] = [
    {
      id: 'lic-001',
      samplePackId: 'pack-001',
      licenseType: 'commercial',
      licenseName: '标准商业授权',
      validFrom: '2024-01-15',
      validUntil: thirtyDaysLater.toISOString().split('T')[0],
      isPerpetual: false,
      allowedUses: ['商业发行', '演出', '广告'],
      restrictions: ['不得单独转售采样'],
      attributionRequired: false,
      maxCopies: 100000,
      territories: ['全球'],
      notes: '年度授权，每年续期',
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    },
    {
      id: 'lic-002',
      samplePackId: 'pack-002',
      licenseType: 'royalty-free',
      licenseName: '永久免版税授权',
      validFrom: '2024-03-20',
      isPerpetual: true,
      allowedUses: ['商业发行', '演出', '影视配乐', '游戏'],
      restrictions: ['不得用于仇恨言论内容', '不得转售采样包本身'],
      attributionRequired: false,
      notes: '一次性购买，永久使用',
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    },
    {
      id: 'lic-003',
      samplePackId: 'pack-003',
      licenseType: 'commercial',
      licenseName: '基础商业授权',
      validFrom: '2024-06-10',
      validUntil: fifteenDaysLater.toISOString().split('T')[0],
      isPerpetual: false,
      allowedUses: ['流媒体发行'],
      restrictions: ['不得用于广告', '不得用于影视'],
      attributionRequired: false,
      maxCopies: 10000,
      createdAt: sixtyDaysAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString()
    },
    {
      id: 'lic-004',
      samplePackId: 'pack-004',
      licenseType: 'non-commercial',
      licenseName: '创作共享非商用授权',
      validFrom: '2024-08-05',
      isPerpetual: true,
      allowedUses: ['个人学习', '非商用演示'],
      restrictions: ['禁止商业发行', '禁止广告使用'],
      attributionRequired: true,
      notes: '免费授权，必须署名原作者',
      createdAt: sixtyDaysAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString()
    },
    {
      id: 'lic-005',
      samplePackId: 'pack-005',
      licenseType: 'commercial',
      licenseName: '影视商业授权',
      validFrom: '2023-11-20',
      validUntil: tenDaysAgo.toISOString().split('T')[0],
      isPerpetual: false,
      allowedUses: ['影视配乐', '广告'],
      restrictions: ['游戏使用需额外授权'],
      attributionRequired: false,
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    }
  ]

  const tracks: TrackProject[] = [
    {
      id: 'track-001',
      name: '午夜城市',
      artist: 'BeatMaker_X',
      album: '城市夜曲',
      releaseDate: '2024-05-20',
      status: 'released',
      createdAt: yearAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString()
    },
    {
      id: 'track-002',
      name: '电子狂想曲',
      artist: 'SynthMaster',
      status: 'in-progress',
      createdAt: sixtyDaysAgo.toISOString(),
      updatedAt: tenDaysAgo.toISOString()
    },
    {
      id: 'track-003',
      name: '慵懒午后',
      artist: 'ChillProducer',
      status: 'draft',
      notes: '使用了免费Lo-Fi采样，记得署名',
      createdAt: thirtyDaysLater.toISOString(),
      updatedAt: thirtyDaysLater.toISOString()
    },
    {
      id: 'track-004',
      name: '追逐梦想',
      artist: 'BeatMaker_X',
      album: '城市夜曲',
      releaseDate: '2024-06-15',
      status: 'released',
      createdAt: yearAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString()
    }
  ]

  const usages: SampleUsage[] = [
    {
      id: 'usage-001',
      trackProjectId: 'track-001',
      samplePackId: 'pack-001',
      sampleFileName: 'kick_01_trap.wav',
      usageDescription: '底鼓主节奏',
      duration: '0:05',
      isModified: true,
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    },
    {
      id: 'usage-002',
      trackProjectId: 'track-001',
      samplePackId: 'pack-001',
      sampleFileName: 'snare_05_hiphop.wav',
      usageDescription: '军鼓',
      duration: '0:02',
      isModified: false,
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    },
    {
      id: 'usage-003',
      trackProjectId: 'track-002',
      samplePackId: 'pack-002',
      sampleFileName: 'synth_lead_saw.wav',
      usageDescription: '主旋律音色',
      duration: '0:30',
      isModified: true,
      createdAt: sixtyDaysAgo.toISOString(),
      updatedAt: tenDaysAgo.toISOString()
    },
    {
      id: 'usage-004',
      trackProjectId: 'track-003',
      samplePackId: 'pack-004',
      sampleFileName: 'vinyl_crackle_02.wav',
      usageDescription: '背景噪音',
      duration: '全曲',
      isModified: false,
      createdAt: thirtyDaysLater.toISOString(),
      updatedAt: thirtyDaysLater.toISOString()
    },
    {
      id: 'usage-005',
      trackProjectId: 'track-004',
      samplePackId: 'pack-005',
      sampleFileName: 'strings_crescendo.wav',
      usageDescription: '弦乐渐强',
      duration: '0:15',
      isModified: false,
      createdAt: yearAgo.toISOString(),
      updatedAt: yearAgo.toISOString()
    }
  ]

  return { samplePacks, licenses, tracks, usages }
}
