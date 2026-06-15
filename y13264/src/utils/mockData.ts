import { Complaint } from './types';

export const mockComplaints: Complaint[] = [
  {
    id: '1',
    street: '幸福路与阳光大道交叉口东南角',
    complainant: '张女士',
    complaintTime: '2026-06-10 09:30:00',
    description: '连续三天暴雨后，雨水口被落叶和淤泥堵塞，积水约30cm，影响行人通行。',
    status: 'processing',
    mergeStatus: 'none',
    mergedFrom: [],
    attachments: [
      {
        id: 'a1',
        complaintId: '1',
        name: '现场照片1.jpg',
        fileHash: 'abc123def456',
        size: 2048000,
        uploadTime: '2026-06-10 09:35:00',
        isDuplicate: false
      }
    ],
    meetingNotes: [
      {
        id: 'm1',
        complaintId: '1',
        meetingTime: '2026-06-11 14:00:00',
        attendees: '李主任、王工、赵队',
        content: '会议决定优先处理该路口，调配2名工人配合吸污车作业',
        impactDescription: '原计划本周六处理，改为明日上午处理，优先级从普通提升为紧急',
        operator: '阿宁',
        createdAt: '2026-06-11 16:30:00'
      }
    ],
    historyLogs: [
      {
        id: 'h1',
        complaintId: '1',
        action: '创建投诉',
        afterStatus: 'pending',
        operator: '阿宁',
        timestamp: '2026-06-10 09:30:00'
      },
      {
        id: 'h2',
        complaintId: '1',
        action: '状态变更',
        beforeStatus: 'pending',
        afterStatus: 'processing',
        reason: '已安排工人现场勘查',
        nextStep: '明日上午进行清淤作业',
        operator: '阿宁',
        timestamp: '2026-06-11 10:00:00'
      }
    ],
    createdAt: '2026-06-10 09:30:00',
    updatedAt: '2026-06-11 16:30:00'
  },
  {
    id: '2',
    street: '民生小区西门北侧',
    complainant: '刘先生',
    complaintTime: '2026-06-12 15:20:00',
    description: '雨后积水严重，雨水篦子被塑料袋堵住，水深约20cm，有异味。',
    status: 'for_publication',
    mergeStatus: 'same_street',
    sameStreetGroup: 'group-2',
    mergedFrom: [],
    attachments: [],
    meetingNotes: [],
    historyLogs: [
      {
        id: 'h3',
        complaintId: '2',
        action: '创建投诉',
        afterStatus: 'pending',
        operator: '阿宁',
        timestamp: '2026-06-12 15:20:00'
      }
    ],
    createdAt: '2026-06-12 15:20:00',
    updatedAt: '2026-06-12 15:20:00'
  },
  {
    id: '3',
    street: '民生小区西门北侧',
    complainant: '陈阿姨',
    complaintTime: '2026-06-12 16:45:00',
    description: '同一个地方又堵了，早上刚清完晚上又堵，建议增加防护网。',
    status: 'pending',
    mergeStatus: 'same_street',
    sameStreetGroup: 'group-2',
    mergedFrom: [],
    attachments: [],
    meetingNotes: [],
    historyLogs: [
      {
        id: 'h4',
        complaintId: '3',
        action: '创建投诉',
        afterStatus: 'pending',
        operator: '阿宁',
        timestamp: '2026-06-12 16:45:00'
      }
    ],
    createdAt: '2026-06-12 16:45:00',
    updatedAt: '2026-06-12 16:45:00'
  },
  {
    id: '4',
    street: '和平路23号门前',
    complainant: '王大爷',
    complaintTime: '2026-06-13 08:10:00',
    description: '雨水口积淤严重，散发臭味，蚊虫滋生。',
    status: 'publicized',
    mergeStatus: 'none',
    mergedFrom: [],
    attachments: [],
    meetingNotes: [
      {
        id: 'm2',
        complaintId: '4',
        meetingTime: '2026-06-14 09:00:00',
        attendees: '李主任、赵队',
        content: '已完成清淤，验收合格，同意公示',
        impactDescription: '原待公示状态确认通过，正式列入本周公示清单',
        operator: '阿宁',
        createdAt: '2026-06-14 10:00:00'
      }
    ],
    historyLogs: [
      {
        id: 'h5',
        complaintId: '4',
        action: '创建投诉',
        afterStatus: 'pending',
        operator: '阿宁',
        timestamp: '2026-06-13 08:10:00'
      },
      {
        id: 'h6',
        complaintId: '4',
        action: '状态变更',
        beforeStatus: 'pending',
        afterStatus: 'processing',
        reason: '已安排清淤',
        operator: '阿宁',
        timestamp: '2026-06-13 09:00:00'
      },
      {
        id: 'h7',
        complaintId: '4',
        action: '状态变更',
        beforeStatus: 'processing',
        afterStatus: 'for_publication',
        reason: '清淤完成，等待会议确认',
        operator: '阿宁',
        timestamp: '2026-06-13 15:30:00'
      },
      {
        id: 'h8',
        complaintId: '4',
        action: '状态变更',
        beforeStatus: 'for_publication',
        afterStatus: 'publicized',
        reason: '会议确认通过',
        nextStep: '列入本周公示清单',
        operator: '阿宁',
        timestamp: '2026-06-14 10:00:00'
      }
    ],
    createdAt: '2026-06-13 08:10:00',
    updatedAt: '2026-06-14 10:00:00'
  }
];
