import { NetworkNode, NetworkEdge, CustomerNode, PhoneNode, DeviceNode, GuarantorNode, LoanNode, InvestigationNode, RelationType } from '../types';

const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡'];
const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛'];
const carriers = ['中国移动', '中国联通', '中国电信'];
const deviceTypes = ['iPhone 15', '华为Mate 60', '小米14', 'OPPO Find', 'vivo X100', '三星Galaxy', 'MacBook Pro', 'ThinkPad'];
const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
const loanStatuses = ['审批中', '已通过', '已拒绝', '已放款', '已结清'];
const conclusions = ['无风险', '需关注', '高风险', '疑似欺诈'];
const investigators = ['李分析', '王风控', '张调查', '刘审核', '陈专员'];
const sources = ['核心系统', '征信系统', '反欺诈系统', '人工录入', '第三方数据'];

function randomItem<T extends readonly unknown[] | []>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomPhone(): string {
  const prefixes = ['138', '139', '158', '159', '188', '189', '136', '137', '150', '151'];
  return randomItem(prefixes) + Math.random().toString().substr(2, 8);
}

function randomIdCard(): string {
  return '110101' + Math.random().toString().substr(2, 12);
}

function randomIp(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomDate(daysBack: number = 365): string {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return past.toISOString();
}

export function generateMockData(): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  const customerCount = 15;
  const customers: CustomerNode[] = [];

  for (let i = 0; i < customerCount; i++) {
    const name = randomItem(surnames) + randomItem(names);
    const isBlacklist = Math.random() < 0.15;
    const riskLevel = isBlacklist ? randomItem(['high', 'critical'] as const) : randomItem(riskLevels);
    
    const customer: CustomerNode = {
      id: randomId('cust'),
      type: 'customer',
      label: name,
      riskLevel,
      isBlacklist,
      source: randomItem(sources),
      createdAt: randomDate(),
      idCard: randomIdCard(),
      phone: randomPhone(),
    };
    customers.push(customer);
    nodes.push(customer);
  }

  const phoneNumbers: PhoneNode[] = [];
  const usedPhones = new Set<string>();
  
  for (let i = 0; i < 20; i++) {
    let number = randomPhone();
    while (usedPhones.has(number)) {
      number = randomPhone();
    }
    usedPhones.add(number);
    
    const isShared = Math.random() < 0.3;
    const phone: PhoneNode = {
      id: randomId('phone'),
      type: 'phone',
      label: number.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      riskLevel: isShared ? 'medium' : 'low',
      isBlacklist: false,
      source: randomItem(sources),
      createdAt: randomDate(),
      number,
      carrier: randomItem(carriers),
    };
    phoneNumbers.push(phone);
    nodes.push(phone);

    const linkedCustomers = isShared 
      ? customers.filter(() => Math.random() < 0.2).slice(0, 3)
      : [customers[Math.floor(Math.random() * customers.length)]];
    
    linkedCustomers.forEach(customer => {
      edges.push({
        id: randomId('edge'),
        source: customer.id,
        target: phone.id,
        relationType: 'uses_phone',
        confidence: 0.9,
        dataSource: '核心系统',
        createdAt: randomDate(),
      });
    });
  }

  const devices: DeviceNode[] = [];
  for (let i = 0; i < 18; i++) {
    const isShared = Math.random() < 0.25;
    const device: DeviceNode = {
      id: randomId('device'),
      type: 'device',
      label: randomItem(deviceTypes),
      riskLevel: isShared ? 'medium' : 'low',
      isBlacklist: false,
      source: randomItem(sources),
      createdAt: randomDate(),
      deviceId: 'DEV_' + Math.random().toString(36).substr(2, 12).toUpperCase(),
      deviceType: randomItem(['mobile', 'desktop', 'tablet']),
      ipAddress: randomIp(),
    };
    devices.push(device);
    nodes.push(device);

    const linkedCustomers = isShared
      ? customers.filter(() => Math.random() < 0.2).slice(0, 4)
      : [customers[Math.floor(Math.random() * customers.length)]];
    
    linkedCustomers.forEach(customer => {
      edges.push({
        id: randomId('edge'),
        source: customer.id,
        target: device.id,
        relationType: 'uses_device',
        confidence: 0.85,
        dataSource: '设备指纹系统',
        createdAt: randomDate(),
      });
    });
  }

  const guarantors: GuarantorNode[] = [];
  for (let i = 0; i < 8; i++) {
    const name = randomItem(surnames) + randomItem(names);
    const guarantor: GuarantorNode = {
      id: randomId('guar'),
      type: 'guarantor',
      label: name,
      riskLevel: randomItem(riskLevels),
      isBlacklist: Math.random() < 0.1,
      source: randomItem(sources),
      createdAt: randomDate(),
      idCard: randomIdCard(),
      relation: randomItem(['配偶', '父母', '子女', '兄弟姐妹', '朋友', '同事']),
    };
    guarantors.push(guarantor);
    nodes.push(guarantor);

    const linkedCustomers = customers.filter(() => Math.random() < 0.2).slice(0, 2);
    linkedCustomers.forEach(customer => {
      edges.push({
        id: randomId('edge'),
        source: customer.id,
        target: guarantor.id,
        relationType: 'guarantees',
        confidence: 0.95,
        dataSource: '贷款系统',
        createdAt: randomDate(),
      });
    });
  }

  const loans: LoanNode[] = [];
  customers.forEach(customer => {
    if (Math.random() < 0.7) {
      const loanCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < loanCount; j++) {
        const loan: LoanNode = {
          id: randomId('loan'),
          type: 'loan',
          label: `贷款¥${(Math.random() * 50 + 5).toFixed(0)}万`,
          riskLevel: customer.riskLevel,
          isBlacklist: customer.isBlacklist,
          source: '贷款系统',
          createdAt: randomDate(),
          amount: Math.floor(Math.random() * 500000) + 50000,
          status: randomItem(loanStatuses),
          applyTime: randomDate(180),
        };
        loans.push(loan);
        nodes.push(loan);

        edges.push({
          id: randomId('edge'),
          source: customer.id,
          target: loan.id,
          relationType: 'applies_for',
          confidence: 1.0,
          dataSource: '贷款系统',
          createdAt: loan.applyTime,
        });
      }
    }
  });

  loans.forEach(loan => {
    if (Math.random() < 0.8) {
      const investigation: InvestigationNode = {
        id: randomId('inv'),
        type: 'investigation',
        label: randomItem(conclusions),
        riskLevel: loan.riskLevel,
        isBlacklist: loan.isBlacklist,
        source: '反欺诈系统',
        createdAt: randomDate(90),
        conclusion: randomItem(conclusions),
        investigator: randomItem(investigators),
      };
      nodes.push(investigation);

      edges.push({
        id: randomId('edge'),
        source: loan.id,
        target: investigation.id,
        relationType: 'generates',
        confidence: 0.9,
        dataSource: '调查系统',
        createdAt: investigation.createdAt,
      });
    }
  });

  for (let i = 0; i < 3; i++) {
    const idx1 = Math.floor(Math.random() * customers.length);
    const idx2 = Math.floor(Math.random() * customers.length);
    if (idx1 !== idx2) {
      edges.push({
        id: randomId('edge'),
        source: customers[idx1].id,
        target: customers[idx2].id,
        relationType: 'related_to',
        confidence: 0.7,
        dataSource: '关联图谱',
        createdAt: randomDate(),
      });
    }
  }

  if (Math.random() < 0.5) {
    const cust = customers[Math.floor(Math.random() * customers.length)];
    const phone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    edges.push({
      id: randomId('edge_dup'),
      source: cust.id,
      target: phone.id,
      relationType: 'uses_phone',
      confidence: 0.88,
      dataSource: '第三方数据',
      createdAt: randomDate(),
      isDuplicate: true,
    });
  }

  return { nodes, edges };
}
