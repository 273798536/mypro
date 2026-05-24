import { v4 as uuidv4 } from 'uuid';
import {
  User,
  UserRole,
  Declaration,
  DeclarationStatus,
  TrajectoryNode,
  NodeType,
  NodeStatus,
  TaxNotice,
  TaxNoticeStatus,
  SupervisorComment,
  CommentDecision
} from '../entities';
import { hashPassword } from '../config/auth';

export async function createSampleUsers(): Promise<User[]> {
  const users: User[] = [
    {
      id: uuidv4(),
      username: 'data_entry',
      password: await hashPassword('data_entry_123'),
      name: '张录入',
      role: UserRole.DATA_ENTRY,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'reviewer',
      password: await hashPassword('reviewer_123'),
      name: '李复核',
      role: UserRole.REVIEWER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'supervisor',
      password: await hashPassword('supervisor_123'),
      name: '王主管',
      role: UserRole.SUPERVISOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'readonly',
      password: await hashPassword('readonly_123'),
      name: '赵查看',
      role: UserRole.READ_ONLY,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  return users;
}

export function createDeclarations(users: User[]): Declaration[] {
  const dataEntryUser = users.find(u => u.role === UserRole.DATA_ENTRY);
  const reviewerUser = users.find(u => u.role === UserRole.REVIEWER);
  const supervisorUser = users.find(u => u.role === UserRole.SUPERVISOR);

  const declarations: Declaration[] = [
    {
      id: uuidv4(),
      declarationNo: 'DECL-2024-000001',
      packageNo: 'PKG-SH-20240115-0001',
      senderName: '上海贸易有限公司',
      senderAddress: '上海市浦东新区陆家嘴东路100号',
      receiverName: 'John Smith',
      receiverAddress: '123 Main St, New York, NY 10001, USA',
      declaredValue: 500,
      currency: 'USD',
      weight: 2.5,
      itemDescription: '智能手表 x 2',
      hsCode: '9102110000',
      hasAttachment: true,
      attachmentUrl: '/attachments/DECL-2024-000001.pdf',
      status: DeclarationStatus.APPROVED,
      tags: ['电子产品', '手表'],
      enteredBy: dataEntryUser?.id,
      reviewedBy: reviewerUser?.id,
      approvedBy: supervisorUser?.id,
      reviewNotes: '资料齐全，符合要求',
      trajectoryNodes: [],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-16')
    },
    {
      id: uuidv4(),
      declarationNo: 'DECL-2024-000002',
      packageNo: 'PKG-GZ-20240116-0002',
      senderName: '广州电子科技有限公司',
      senderAddress: '广州市天河区天河路385号',
      receiverName: 'Mike Johnson',
      receiverAddress: '456 Oak Ave, Los Angeles, CA 90001, USA',
      declaredValue: 1200,
      currency: 'USD',
      weight: 5.2,
      itemDescription: '蓝牙耳机 x 10',
      hsCode: '8517629000',
      hasAttachment: false,
      attachmentUrl: '',
      status: DeclarationStatus.NEEDS_SUPPLEMENT,
      tags: ['电子产品', '耳机', '缺附件'],
      enteredBy: dataEntryUser?.id,
      reviewedBy: reviewerUser?.id,
      approvedBy: null,
      reviewNotes: '缺少商业发票和装箱单附件',
      trajectoryNodes: [],
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-17')
    },
    {
      id: uuidv4(),
      declarationNo: 'DECL-2024-000003',
      packageNo: 'PKG-SZ-20240117-0003',
      senderName: '深圳服装有限公司',
      senderAddress: '深圳市南山区科技园路1号',
      receiverName: 'Sarah Williams',
      receiverAddress: '789 Pine St, Chicago, IL 60601, USA',
      declaredValue: 800,
      currency: 'USD',
      weight: 3.8,
      itemDescription: '棉质T恤 x 50',
      hsCode: '6109100000',
      hasAttachment: true,
      attachmentUrl: '/attachments/DECL-2024-000003.pdf',
      status: DeclarationStatus.UNDER_REVIEW,
      tags: ['服装', 'T恤'],
      enteredBy: dataEntryUser?.id,
      reviewedBy: null,
      approvedBy: null,
      reviewNotes: null,
      trajectoryNodes: [],
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17')
    },
    {
      id: uuidv4(),
      declarationNo: 'DECL-2024-000004',
      packageNo: 'PKG-HZ-20240118-0004',
      senderName: '杭州家居用品有限公司',
      senderAddress: '杭州市西湖区文三路478号',
      receiverName: 'David Brown',
      receiverAddress: '321 Elm Rd, Houston, TX 77001, USA',
      declaredValue: 350,
      currency: 'USD',
      weight: 8.5,
      itemDescription: '陶瓷餐具套装 x 2',
      hsCode: '6911100000',
      hasAttachment: true,
      attachmentUrl: '/attachments/DECL-2024-000004.pdf',
      status: DeclarationStatus.APPROVED,
      tags: ['家居', '餐具'],
      enteredBy: dataEntryUser?.id,
      reviewedBy: reviewerUser?.id,
      approvedBy: supervisorUser?.id,
      reviewNotes: '资料齐全，需注意包裹拆分问题',
      trajectoryNodes: [],
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-19')
    },
    {
      id: uuidv4(),
      declarationNo: 'DECL-2024-000005',
      packageNo: 'PKG-BJ-20240119-0005',
      senderName: '北京工艺品有限公司',
      senderAddress: '北京市朝阳区建国门外大街1号',
      receiverName: 'Emily Davis',
      receiverAddress: '567 Cedar Ln, Phoenix, AZ 85001, USA',
      declaredValue: 2000,
      currency: 'USD',
      weight: 1.2,
      itemDescription: '翡翠吊坠 x 1',
      hsCode: '7116200000',
      hasAttachment: true,
      attachmentUrl: '/attachments/DECL-2024-000005.pdf',
      status: DeclarationStatus.APPROVED,
      tags: ['珠宝', '工艺品', '高价值'],
      enteredBy: dataEntryUser?.id,
      reviewedBy: reviewerUser?.id,
      approvedBy: supervisorUser?.id,
      reviewNotes: '高价值物品，需重点关注',
      trajectoryNodes: [],
      createdAt: new Date('2024-01-19'),
      updatedAt: new Date('2024-01-20')
    }
  ];

  return declarations;
}

export function createTrajectoryNodes(declarations: Declaration[]): TrajectoryNode[] {
  const nodes: TrajectoryNode[] = [];

  declarations.forEach((declaration, index) => {
    const baseDate = new Date(declaration.createdAt);
    const nodeTemplates = [
      { nodeType: NodeType.CUSTOMS_DECLARATION, nodeName: '海关申报', status: NodeStatus.COMPLETED, days: 0 },
      { nodeType: NodeType.INSPECTION, nodeName: '检验检疫', status: NodeStatus.COMPLETED, days: 1 },
      { nodeType: NodeType.TAX_ASSESSMENT, nodeName: '税费核算', status: NodeStatus.COMPLETED, days: 2 },
      { nodeType: NodeType.TAX_PAYMENT, nodeName: '税费缴纳', status: NodeStatus.COMPLETED, days: 3 },
      { nodeType: NodeType.RELEASE, nodeName: '放行', status: NodeStatus.COMPLETED, days: 4 }
    ];

    if (declaration.declarationNo === 'DECL-2024-000004') {
      nodeTemplates.splice(3, 0, {
        nodeType: NodeType.SPLIT,
        nodeName: '包裹拆分',
        status: NodeStatus.COMPLETED,
        days: 2.5
      });
    }

    nodeTemplates.forEach((template, nodeIndex) => {
      const node: TrajectoryNode = {
        id: uuidv4(),
        declarationId: declaration.id,
        declaration: declaration,
        nodeType: template.nodeType,
        nodeName: template.nodeName,
        status: template.status,
        occurredAt: new Date(baseDate.getTime() + template.days * 24 * 60 * 60 * 1000),
        location: ['上海海关', '广州海关', '深圳海关', '杭州海关', '北京海关'][index % 5],
        description: `${template.nodeName}完成`,
        operator: `操作员${String.fromCharCode(65 + nodeIndex)}`,
        metadata: { nodeOrder: nodeIndex + 1 },
        isAbnormal: declaration.declarationNo === 'DECL-2024-000002' && nodeIndex === 1,
        abnormalReason: declaration.declarationNo === 'DECL-2024-000002' && nodeIndex === 1
          ? '缺少附件，需补充商业发票'
          : null,
        parentPackageNo: declaration.declarationNo === 'DECL-2024-000004' && nodeIndex === 3
          ? declaration.packageNo
          : null,
        splitFromNodeId: null,
        createdAt: new Date()
      };
      nodes.push(node);
    });
  });

  return nodes;
}

export function createTaxNotices(declarations: Declaration[]): TaxNotice[] {
  return declarations.map((declaration, index) => {
    const taxRate = 0.21;
    const baseTax = Number(declaration.declaredValue) * taxRate;
    const dutyAmount = Number(declaration.declaredValue) * 0.08;
    const vatAmount = (Number(declaration.declaredValue) + dutyAmount) * 0.13;

    return {
      id: uuidv4(),
      noticeNo: `TAX-NOTICE-2024-${String(index + 1).padStart(6, '0')}`,
      declarationId: declaration.id,
      packageNo: declaration.packageNo,
      taxAmount: Math.round(baseTax * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      dutyAmount: Math.round(dutyAmount * 100) / 100,
      lateFee: declaration.declarationNo === 'DECL-2024-000002' ? 15.5 : 0,
      taxCategory: '进口综合税',
      issueDate: new Date(declaration.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(declaration.createdAt.getTime() + 17 * 24 * 60 * 60 * 1000),
      paymentDate: declaration.declarationNo !== 'DECL-2024-000002'
        ? new Date(declaration.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000)
        : null,
      status: declaration.declarationNo === 'DECL-2024-000002'
        ? TaxNoticeStatus.OVERDUE
        : TaxNoticeStatus.PAID,
      paymentReference: declaration.declarationNo !== 'DECL-2024-000002'
        ? `PAY-${Date.now()}-${index}`
        : null,
      disputeReason: null,
      disputedBy: null,
      resolutionNotes: null,
      resolvedBy: null,
      originalPackageNo: declaration.declarationNo === 'DECL-2024-000004'
        ? declaration.packageNo
        : null,
      isSplitTax: declaration.declarationNo === 'DECL-2024-000004',
      splitFromNoticeId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as TaxNotice;
  });
}

export function createSupervisorComments(declarations: Declaration[], users: User[]): SupervisorComment[] {
  const supervisorUser = users.find(u => u.role === UserRole.SUPERVISOR);
  if (!supervisorUser) return [];

  const declarationWithMissingAttachment = declarations.find(d => !d.hasAttachment);
  const declarationWithSplit = declarations.find(d => d.declarationNo === 'DECL-2024-000004');
  const highValueDeclaration = declarations.find(d => d.declarationNo === 'DECL-2024-000005');

  const comments: SupervisorComment[] = [];

  if (declarationWithMissingAttachment) {
    comments.push({
      id: uuidv4(),
      declarationId: declarationWithMissingAttachment.id,
      taxNoticeId: null,
      trajectoryNodeId: null,
      supervisorId: supervisorUser.id,
      supervisorName: supervisorUser.name,
      decision: CommentDecision.REVISE,
      comment: '该申报单缺少必要附件，需在3个工作日内补充商业发票和装箱单，否则将影响通关时效。',
      previousState: { status: 'submitted', hasAttachment: false },
      newState: { status: 'needs_supplement', hasAttachment: false },
      isManualOverride: false,
      overrideReason: null,
      createdAt: new Date(declarationWithMissingAttachment.updatedAt)
    });
  }

  if (declarationWithSplit) {
    comments.push({
      id: uuidv4(),
      declarationId: declarationWithSplit.id,
      taxNoticeId: null,
      trajectoryNodeId: null,
      supervisorId: supervisorUser.id,
      supervisorName: supervisorUser.name,
      decision: CommentDecision.MANUAL_OVERRIDE,
      comment: '该包裹因重量超限进行拆分处理，原申报税费已按拆分比例重新核算。拆分后两包税费合计与原申报税费一致，准予通过。',
      previousState: { taxAmount: 73.5, isSplit: false },
      newState: { taxAmount: 73.5, isSplit: true, splitCount: 2 },
      isManualOverride: true,
      overrideReason: '包裹拆分导致税费归属错位，需人工干预调整',
      createdAt: new Date(declarationWithSplit.updatedAt)
    });
  }

  if (highValueDeclaration) {
    comments.push({
      id: uuidv4(),
      declarationId: highValueDeclaration.id,
      taxNoticeId: null,
      trajectoryNodeId: null,
      supervisorId: supervisorUser.id,
      supervisorName: supervisorUser.name,
      decision: CommentDecision.APPROVE,
      comment: '高价值珠宝类物品，已核实原产地证明和价值评估报告，资料齐全，准予通关。',
      previousState: { status: 'under_review', riskLevel: 'high' },
      newState: { status: 'approved', riskLevel: 'high', specialHandling: true },
      isManualOverride: false,
      overrideReason: null,
      createdAt: new Date(highValueDeclaration.updatedAt)
    });
  }

  return comments;
}

export const badDataExamples = {
  missingRequired: {
    declarationNo: 'DECL-BAD-001',
    packageNo: '',
    senderName: '测试公司',
    senderAddress: '',
    receiverName: '',
    receiverAddress: '123 Test St',
    declaredValue: 'invalid',
    weight: -5,
    hsCode: '123'
  },
  duplicate: {
    declarationNo: 'DECL-2024-000001',
    packageNo: 'PKG-DUPLICATE-001',
    senderName: '重复提交公司',
    senderAddress: '重复地址',
    receiverName: '重复收件人',
    receiverAddress: '123 Duplicate St',
    declaredValue: 100,
    currency: 'USD',
    weight: 1.0,
    itemDescription: '重复提交测试',
    hsCode: '8517121000'
  },
  invalidFormat: {
    declarationNo: 'DECL-BAD-002',
    packageNo: 'PKG-BAD-FORMAT',
    senderName: '格式测试公司',
    senderAddress: '测试地址',
    receiverName: '测试收件人',
    receiverAddress: '测试地址',
    declaredValue: 100,
    currency: 'USD',
    weight: 1.0,
    itemDescription: '格式测试',
    hsCode: 'INVALID-HS-CODE'
  }
};
