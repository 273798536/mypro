import { filterObject, fieldVisibility, getFilteredFields } from '../middleware/fieldFilter.middleware';
import { UserRole } from '../entities';

const sampleDeclaration = {
  id: 'uuid-123',
  declarationNo: 'DECL-2024-000001',
  packageNo: 'PKG-SH-001',
  senderName: '上海贸易公司',
  senderAddress: '上海市浦东新区',
  receiverName: 'John Smith',
  receiverAddress: '123 Main St',
  declaredValue: 500,
  currency: 'USD',
  weight: 2.5,
  itemDescription: '智能手表',
  hsCode: '9102110000',
  hasAttachment: true,
  attachmentUrl: '/attachments/file.pdf',
  status: 'approved',
  tags: ['电子产品', '手表'],
  enteredBy: 'user-1',
  reviewedBy: 'user-2',
  approvedBy: 'user-3',
  reviewNotes: '资料齐全',
  secretField: '该字段对非主管用户不可见',
  internalNote: '内部备注，不应被普通用户看到',
  createdAt: new Date(),
  updatedAt: new Date()
};

const samplePagination = {
  page: 1,
  limit: 20,
  total: 100
};

const paginatedResponse = {
  data: [sampleDeclaration, { ...sampleDeclaration, id: 'uuid-456', declarationNo: 'DECL-2024-000002' }],
  pagination: samplePagination
};

const singleItemResponse = {
  data: sampleDeclaration
};

const arrayResponse = [sampleDeclaration, { ...sampleDeclaration, id: 'uuid-789' }];

function testRole(role: UserRole, entityType: string, response: any, description: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试: ${description}`);
  console.log(`角色: ${role} | 实体类型: ${entityType}`);
  console.log(`允许字段: ${getFilteredFields(role, entityType).join(', ')}`);
  console.log(`${'-'.repeat(60)}`);
  
  const fields = getFilteredFields(role, entityType);
  const result = filterObject(response, fields);
  
  console.log('原始响应结构:', Object.keys(response));
  console.log('过滤后响应结构:', Object.keys(result));
  
  if ('pagination' in result) {
    console.log('✅ pagination 字段保留');
  }
  
  if ('data' in result) {
    const dataItems = Array.isArray(result.data) ? result.data : [result.data];
    console.log(`✅ data 字段保留，包含 ${dataItems.length} 条记录`);
    
    dataItems.forEach((item: any, index: number) => {
      const itemKeys = Object.keys(item);
      console.log(`\n  记录 ${index + 1} 字段: ${itemKeys.join(', ')}`);
      
      const hasSecretField = 'secretField' in item || 'internalNote' in item;
      if (role !== UserRole.SUPERVISOR && hasSecretField) {
        console.log(`  ❌ 错误: 非主管角色看到了敏感字段!`);
      } else if (role !== UserRole.SUPERVISOR && !hasSecretField) {
        console.log(`  ✅ 敏感字段已正确过滤`);
      }
      
      const hasRequiredFields = itemKeys.length > 0;
      if (hasRequiredFields) {
        console.log(`  ✅ 保留了 ${itemKeys.length} 个可见字段`);
      } else {
        console.log(`  ❌ 错误: 所有字段都被过滤了!`);
      }
    });
  }
  
  const isEmpty = Object.keys(result).length === 0;
  if (isEmpty) {
    console.log('\n❌ 严重错误: 响应被过滤为空对象 {}');
  } else {
    console.log('\n✅ 过滤后响应不为空');
  }
}

function runTests(): void {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       字段过滤中间件测试 - 分页响应验证                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  console.log('\n📋 测试场景: 分页列表响应 { data: [], pagination }');
  testRole(UserRole.DATA_ENTRY, 'declaration', paginatedResponse, '录入员 - 申报单列表');
  testRole(UserRole.REVIEWER, 'declaration', paginatedResponse, '复核员 - 申报单列表');
  testRole(UserRole.READ_ONLY, 'declaration', paginatedResponse, '只读用户 - 申报单列表');
  testRole(UserRole.SUPERVISOR, 'declaration', paginatedResponse, '主管 - 申报单列表 (应该看到所有字段)');

  console.log('\n\n📋 测试场景: 单条记录响应 { data: {} }');
  testRole(UserRole.READ_ONLY, 'declaration', singleItemResponse, '只读用户 - 单条申报单');

  console.log('\n\n📋 测试场景: 数组响应 []');
  testRole(UserRole.REVIEWER, 'badData', arrayResponse, '复核员 - 坏数据列表');

  console.log('\n\n📋 测试场景: 对账结果分页');
  testRole(UserRole.READ_ONLY, 'reconciliation', paginatedResponse, '只读用户 - 对账结果列表');

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 测试总结');
  console.log(`${'='.repeat(60)}`);
  
  const allRoles = [UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.READ_ONLY];
  let allPassed = true;
  
  for (const role of allRoles) {
    const fields = getFilteredFields(role, 'declaration');
    const result = filterObject(paginatedResponse, fields);
    
    if (Object.keys(result).length === 0) {
      console.log(`❌ ${role}: 分页响应被错误地过滤为空`);
      allPassed = false;
    } else if (!('data' in result)) {
      console.log(`❌ ${role}: 分页响应缺少 data 字段`);
      allPassed = false;
    } else if (!('pagination' in result)) {
      console.log(`❌ ${role}: 分页响应缺少 pagination 字段`);
      allPassed = false;
    } else if (result.data && result.data.length > 0 && Object.keys(result.data[0]).length === 0) {
      console.log(`❌ ${role}: data 数组中的记录被过滤为空`);
      allPassed = false;
    } else {
      console.log(`✅ ${role}: 分页响应正常`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  if (allPassed) {
    console.log('🎉 所有测试通过! 分页响应字段过滤正常工作。');
  } else {
    console.log('⚠️  部分测试失败，请检查修复。');
    process.exit(1);
  }
  console.log(`${'='.repeat(60)}\n`);
}

if (require.main === module) {
  runTests();
}

export { filterObject, fieldVisibility, getFilteredFields };
