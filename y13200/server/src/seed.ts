import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().split('-')[0]}`;
}

async function main() {
  console.log('🌱 开始初始化数据...');

  await prisma.auditLog.deleteMany();
  await prisma.versionHistory.deleteMany();
  await prisma.trackNote.deleteMany();
  await prisma.reviewRecord.deleteMany();
  await prisma.audioMaterial.deleteMany();
  await prisma.file.deleteMany();
  await prisma.track.deleteMany();
  await prisma.show.deleteMany();
  await prisma.tour.deleteMany();

  console.log('🗑️  已清理现有数据');

  const tourId = 'tour-001';
  const showId = 'show-001';

  await prisma.tour.create({
    data: {
      id: tourId,
      name: '2026周杰伦嘉年华世界巡回演唱会',
      description: '北京首演',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-06-20'),
      status: 'active',
    },
  });
  console.log('✅ 已创建巡演数据');

  await prisma.show.create({
    data: {
      id: showId,
      tourId,
      showDate: new Date('2026-06-20'),
      city: '北京',
      venue: '国家体育场（鸟巢）',
    },
  });
  console.log('✅ 已创建场次数据');

  const mockTracks = [
    { trackNo: 1, title: '夜曲', artist: '周杰伦', expectedDuration: 225, expectedTimecode: '00:03:45.000', status: 'suspended' },
    { trackNo: 2, title: '七里香', artist: '周杰伦', expectedDuration: 299, expectedTimecode: '00:04:59.000', status: 'approved' },
    { trackNo: 3, title: '青花瓷', artist: '周杰伦', expectedDuration: 239, expectedTimecode: '00:03:59.000', status: 'mismatch' },
    { trackNo: 4, title: '东风破', artist: '周杰伦', expectedDuration: 313, expectedTimecode: '00:05:13.000', status: 'pending' },
    { trackNo: 5, title: '发如雪', artist: '周杰伦', expectedDuration: 295, expectedTimecode: '00:04:55.000', status: 'reviewing' },
    { trackNo: 6, title: '霍元甲', artist: '周杰伦', expectedDuration: 215, expectedTimecode: '00:03:35.000', status: 'approved' },
    { trackNo: 7, title: '双截棍', artist: '周杰伦', expectedDuration: 198, expectedTimecode: '00:03:18.000', status: 'suspended' },
    { trackNo: 8, title: '龙拳', artist: '周杰伦', expectedDuration: 230, expectedTimecode: '00:03:50.000', status: 'matched' },
    { trackNo: 9, title: '本草纲目', artist: '周杰伦', expectedDuration: 245, expectedTimecode: '00:04:05.000', status: 'approved' },
    { trackNo: 10, title: '公公偏头痛', artist: '周杰伦', expectedDuration: 252, expectedTimecode: '00:04:12.000', status: 'pending' },
    { trackNo: 11, title: '晴天', artist: '周杰伦', expectedDuration: 269, expectedTimecode: '00:04:29.000', status: 'reviewing' },
    { trackNo: 12, title: '稻香', artist: '周杰伦', expectedDuration: 223, expectedTimecode: '00:03:43.000', status: 'approved' },
    { trackNo: 13, title: '听妈妈的话', artist: '周杰伦', expectedDuration: 264, expectedTimecode: '00:04:24.000', status: 'matched' },
    { trackNo: 14, title: '以父之名', artist: '周杰伦', expectedDuration: 342, expectedTimecode: '00:05:42.000', status: 'suspended' },
    { trackNo: 15, title: '止战之殇', artist: '周杰伦', expectedDuration: 285, expectedTimecode: '00:04:45.000', status: 'pending' },
    { trackNo: 16, title: '七里香', artist: '周杰伦', expectedDuration: 299, expectedTimecode: '00:04:59.000', status: 'approved' },
    { trackNo: 17, title: '千里之外', artist: '周杰伦', expectedDuration: 258, expectedTimecode: '00:04:18.000', status: 'reviewing' },
    { trackNo: 18, title: '菊花台', artist: '周杰伦', expectedDuration: 273, expectedTimecode: '00:04:33.000', status: 'matched' },
    { trackNo: 19, title: '烟花易冷', artist: '周杰伦', expectedDuration: 294, expectedTimecode: '00:04:54.000', status: 'approved' },
    { trackNo: 20, title: '不能说的秘密', artist: '周杰伦', expectedDuration: 266, expectedTimecode: '00:04:26.000', status: 'pending' },
  ];

  const trackIds: Record<number, string> = {};
  for (const track of mockTracks) {
    const trackId = generateId('track');
    trackIds[track.trackNo] = trackId;
    await prisma.track.create({
      data: {
        id: trackId,
        showId,
        ...track,
      },
    });
  }
  console.log(`✅ 已创建 ${mockTracks.length} 首曲目数据`);

  const mockMaterials = [
    { trackNo: 1, fileName: '01_夜曲_立体声_v3.wav', duration: 225.3, timecode: '00:03:45.620', timecodeDeviation: 620, version: 3, isActive: true, matchStatus: 'auto', matchConfidence: 95.5, submittedBy: '小孟', sourceBatch: 'BATCH-20260618-03' },
    { trackNo: 1, fileName: '01_夜曲_立体声_v2.wav', duration: 225.1, timecode: '00:03:45.150', timecodeDeviation: 150, version: 2, isActive: false, matchStatus: 'auto', matchConfidence: 95.5, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-02' },
    { trackNo: 2, fileName: '02_七里香_立体声.wav', duration: 299.0, timecode: '00:04:59.050', timecodeDeviation: 50, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 98.2, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-01' },
    { trackNo: 3, fileName: '青花瓷_现场版.wav', duration: 238.5, timecode: '00:03:58.800', timecodeDeviation: -200, version: 1, isActive: true, matchStatus: 'mismatch', matchConfidence: 62.3, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-01' },
    { trackNo: 5, fileName: '05_发如雪_立体声.wav', duration: 294.8, timecode: '00:04:55.200', timecodeDeviation: 200, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 96.0, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-02' },
    { trackNo: 6, fileName: '06_霍元甲_立体声.wav', duration: 215.2, timecode: '00:03:35.100', timecodeDeviation: 100, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 97.5, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-01' },
    { trackNo: 7, fileName: '07_双截棍_remix_v2.wav', duration: 198.4, timecode: '00:03:18.750', timecodeDeviation: 750, version: 2, isActive: true, matchStatus: 'auto', matchConfidence: 94.8, submittedBy: '小孟', sourceBatch: 'BATCH-20260618-01' },
    { trackNo: 8, fileName: '08_龙拳_立体声.wav', duration: 230.1, timecode: '00:03:50.080', timecodeDeviation: 80, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 96.8, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-02' },
    { trackNo: 9, fileName: '09_本草纲目_立体声.wav', duration: 245.3, timecode: '00:04:05.120', timecodeDeviation: 120, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 97.2, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-01' },
    { trackNo: 11, fileName: '11_晴天_立体声_v2.wav', duration: 269.2, timecode: '00:04:29.300', timecodeDeviation: 300, version: 2, isActive: true, matchStatus: 'auto', matchConfidence: 95.0, submittedBy: '小孟', sourceBatch: 'BATCH-20260618-02' },
    { trackNo: 12, fileName: '12_稻香_立体声.wav', duration: 223.0, timecode: '00:03:43.030', timecodeDeviation: 30, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 98.5, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-01' },
    { trackNo: 13, fileName: '13_听妈妈的话_立体声.wav', duration: 264.2, timecode: '00:04:24.150', timecodeDeviation: 150, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 97.8, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-02' },
    { trackNo: 14, fileName: '14_以父之名_立体声_v3.wav', duration: 342.5, timecode: '00:05:42.800', timecodeDeviation: 800, version: 3, isActive: true, matchStatus: 'auto', matchConfidence: 96.2, submittedBy: '小孟', sourceBatch: 'BATCH-20260618-03' },
    { trackNo: 16, fileName: '16_七里香_en remix.wav', duration: 299.4, timecode: '00:04:59.200', timecodeDeviation: 200, version: 1, isActive: true, matchStatus: 'manual', matchConfidence: 88.5, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-02' },
    { trackNo: 17, fileName: '17_千里之外_feat费玉清.wav', duration: 258.3, timecode: '00:04:18.250', timecodeDeviation: 250, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 92.0, submittedBy: '小孟', sourceBatch: 'BATCH-20260618-01' },
    { trackNo: 18, fileName: '18_菊花台_立体声.wav', duration: 273.1, timecode: '00:04:33.100', timecodeDeviation: 100, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 97.0, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-02' },
    { trackNo: 19, fileName: '19_烟花易冷_立体声.wav', duration: 294.2, timecode: '00:04:54.150', timecodeDeviation: 150, version: 1, isActive: true, matchStatus: 'auto', matchConfidence: 96.5, submittedBy: '小孟', sourceBatch: 'BATCH-20260614-01' },
  ];

  for (const material of mockMaterials) {
    const trackId = trackIds[material.trackNo];
    if (!trackId) continue;

    const fileId = generateId('file');
    await prisma.file.create({
      data: {
        id: fileId,
        originalName: material.fileName,
        storedName: `${Date.now()}_${material.fileName}`,
        mimeType: 'audio/wav',
        size: Math.floor(material.duration * 176400),
        path: `./uploads/${Date.now()}_${material.fileName}`,
      },
    });

    const parsedTrackNoMatch = material.fileName.match(/^(\d+)[_\-.\s]+/);
    const parsedTrackNo = parsedTrackNoMatch ? parseInt(parsedTrackNoMatch[1], 10) : null;

    const materialId = generateId('material');
    await prisma.audioMaterial.create({
      data: {
        id: materialId,
        trackId,
        fileId,
        fileName: material.fileName,
        parsedTrackNo,
        parsedTitle: material.fileName.replace(/\.[^/.]+$/, '').split(/[_\-.\s]+/).slice(1, 2).join('') || null,
        duration: material.duration,
        timecode: material.timecode,
        timecodeDeviation: material.timecodeDeviation,
        version: material.version,
        isActive: material.isActive,
        matchStatus: material.matchStatus,
        matchConfidence: material.matchConfidence,
        submittedBy: material.submittedBy,
        sourceBatch: material.sourceBatch,
      },
    });
  }
  console.log(`✅ 已创建 ${mockMaterials.length} 条材料数据`);

  const mockReviews = [
    { trackNo: 2, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'final', decision: 'approve', comment: '时码准确，音质良好，通过。' },
    { trackNo: 6, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'final', decision: 'approve', comment: '确认通过。' },
    { trackNo: 9, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'final', decision: 'approve', comment: '通过。' },
    { trackNo: 12, reviewerId: 'teacher-002', reviewerName: '李老师', reviewType: 'final', decision: 'approve', comment: '时码准确，通过。' },
    { trackNo: 16, reviewerId: 'teacher-002', reviewerName: '李老师', reviewType: 'final', decision: 'approve', comment: '英文版确认可用。' },
    { trackNo: 18, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'final', decision: 'approve', comment: '通过。' },
    { trackNo: 19, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'final', decision: 'approve', comment: '通过。' },
    { trackNo: 1, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'timecode', decision: 'suspend', comment: '时码偏半拍，待现场确认。', evidenceMissing: ['现场老师复核意见'] },
    { trackNo: 7, reviewerId: 'teacher-002', reviewerName: '李老师', reviewType: 'timecode', decision: 'suspend', comment: '偏差较大，请现场老师确认。', evidenceMissing: ['现场老师复核意见'] },
    { trackNo: 14, reviewerId: 'teacher-001', reviewerName: '张老师', reviewType: 'timecode', decision: 'suspend', comment: '时码偏差800ms，需要现场确认。', evidenceMissing: ['现场老师复核意见'] },
  ];

  for (const review of mockReviews) {
    const trackId = trackIds[review.trackNo];
    if (!trackId) continue;

    await prisma.reviewRecord.create({
      data: {
        id: generateId('review'),
        trackId,
        reviewerId: review.reviewerId,
        reviewerName: review.reviewerName,
        reviewType: review.reviewType,
        decision: review.decision,
        comment: review.comment,
        evidenceMissing: review.evidenceMissing ? JSON.stringify(review.evidenceMissing) : null,
      },
    });
  }
  console.log(`✅ 已创建 ${mockReviews.length} 条复核记录`);

  const mockNotes = [
    { trackNo: 1, content: '初版提交，时码正常', createdBy: 'operator-001', createdByName: '小孟', isActive: false },
    { trackNo: 1, content: 'v2版本，时码微调+150ms', createdBy: 'operator-001', createdByName: '小孟', isActive: false },
    { trackNo: 1, content: '时码偏半拍，待现场老师确认', createdBy: 'teacher-001', createdByName: '张老师', isActive: true },
    { trackNo: 3, content: '文件名缺少序号，待重新命名', createdBy: 'operator-001', createdByName: '小孟', isActive: true },
    { trackNo: 7, content: 'remix版本，时码偏差较大，挂起待确认', createdBy: 'teacher-002', createdByName: '李老师', isActive: true },
    { trackNo: 14, content: 'v3版本，导演要求加长前奏，时码偏移', createdBy: 'operator-001', createdByName: '小孟', isActive: false },
    { trackNo: 14, content: '时码偏差800ms，需要现场乐队确认', createdBy: 'teacher-001', createdByName: '张老师', isActive: true },
  ];

  const previousNoteIds: Record<number, string | null> = {};

  for (const note of mockNotes) {
    const trackId = trackIds[note.trackNo];
    if (!trackId) continue;

    const noteId = generateId('note');
    await prisma.trackNote.create({
      data: {
        id: noteId,
        trackId,
        content: note.content,
        createdBy: note.createdBy,
        createdByName: note.createdByName,
        isActive: note.isActive,
        previousNoteId: previousNoteIds[note.trackNo] || null,
      },
    });
    previousNoteIds[note.trackNo] = noteId;
  }
  console.log(`✅ 已创建 ${mockNotes.length} 条备注记录`);

  console.log('🎉 数据初始化完成！');
  console.log(`
  📊 数据统计:
  - 巡演: 1
  - 场次: 1
  - 曲目: ${mockTracks.length}
  - 材料: ${mockMaterials.length}
  - 复核记录: ${mockReviews.length}
  - 备注: ${mockNotes.length}
  `);
}

main()
  .catch((e) => {
    console.error('❌ 数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
