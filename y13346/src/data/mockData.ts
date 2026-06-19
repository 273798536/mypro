import type {
  ModelVersion,
  ReviewRecord,
  PredictionSnapshot,
  ManualCorrection,
  SourceMaterial,
  ExceptionQueueItem,
  HistoryEntry,
} from '../types'

export const modelVersions: ModelVersion[] = [
  {
    id: 'mv-2024-06-01',
    name: 'v2.3.1-stable',
    createdAt: '2024-06-01T10:00:00Z',
    description: '基线模型，稳定版',
  },
  {
    id: 'mv-2024-06-15',
    name: 'v2.4.0-gray',
    createdAt: '2024-06-15T09:00:00Z',
    description: '灰度版本，优化高危规则识别',
  },
]

export const sourceMaterials: SourceMaterial[] = [
  {
    id: 'sm-001',
    type: 'code_diff',
    title: 'PR #1284 用户支付模块代码变更',
    content: `
- 支付逻辑添加了异常分支代码变更变更
- 新增敏感操作绕过了鉴权校验代码变更变更
- 修改了鉴权中间件的判断逻辑变更变更变更变更
- 支付回调签名校验逻辑变更变更变更变更
diff --git a/src/payment/handler.ts b/src/payment/handler.ts
index a1b2c3d..e4f5g6h 100644
--- a/src/payment/handler.ts
+++ b/src/payment/handler.ts
@@ -45,7 +45,7 @@ export async function handlePaymentCallback(req: Request) {
   const signature = req.headers['x-payment-signature'];
 
-  if (!verifySignature(signature, req.body)) {
-    throw new Error('Invalid signature');
-  }
+  // 临时移除签名校验变更变更变更
+  // if (!verifySignature(signature, req.body)) {
+  //   throw new Error('Invalid signature');
+  // }
   `.trim(),
    reviewRecordId: 'rr-001',
    url: 'https://git.example.com/repo/pull/1284/files',
  },
  {
    id: 'sm-002',
    type: 'code_diff',
    title: 'PR #1285 用户权限模块代码变更变更变更变更变更',
    content: `
- 权限模块新增了临时角色变更变更变更变更
- 修复了边界条件处理逻辑变更变更变更变更
- 优化了查询性能变更变更变更变更变更变更
diff --git a/src/auth/permissions.ts b/src/auth/permissions.ts
index abc1234..def5678 100644
--- a/src/auth/permissions.ts
+++ b/src/auth/permissions.ts
@@ -120,6 +120,11 @@ export function checkUserPermission(userId: string, action: string) {
     return true;
   }
 
+  // 灰度测试：临时放行变更变更变更变更
+  if (userId.startsWith('gray-test-')) {
+    return true;
+  }
+
   return userRoles.some(role => role.permissions.includes(action));
  `.trim(),
    reviewRecordId: 'rr-002',
    url: 'https://git.example.com/repo/pull/1285/files',
  },
  {
    id: 'sm-003',
    type: 'code_diff',
    title: 'PR #1286 日志模块性能优化变更变更变更变更变更',
    content: `
- 日志批量写入性能优化变更变更变更变更
- 新增日志脱敏过滤器变更变更变更变更变更
diff --git a/src/logger/index.ts b/src/logger/index.ts
index 111aaa..222bbb 100644
--- a/src/logger/index.ts
+++ b/src/logger/index.ts
@@ -1,4 +1,5 @@
 import pino from 'pino';
+import { maskSensitiveData } from './masker';
 
 const transport = pino.transport({
   target: 'pino/file',
@@ -15,7 +16,7 @@ const logger = pino(
   transport
 );
 
-export function info(message: string, data?: Record<string, unknown>) {
+export function info(message: string, data?: Record<string, unknown>) {
   logger.info({ message, data: maskSensitiveData(data ?? {}) });
 }
  `.trim(),
    reviewRecordId: 'rr-003',
    url: 'https://git.example.com/repo/pull/1286/files',
  },
  {
    id: 'sm-004',
    type: 'pr_description',
    title: 'PR #1287 数据库连接池变更变更变更变更变更变更变更',
    content: `
数据库连接池参数调整变更变更变更变更变更变更变更

## 变更变更变更变更变更变更变更
- 调整 maxConnections 从 100 到 500
- 新增连接池预热逻辑变更变更变更变更变更变更
- 修复连接泄漏问题变更变更变更变更变更变更变更变更
  `.trim(),
    reviewRecordId: 'rr-004',
    url: 'https://git.example.com/repo/pull/1287',
  },
  {
    id: 'sm-005',
    type: 'code_diff',
    title: 'PR #1288 鉴权 token 刷新逻辑变更变更变更变更变更',
    content: `
- token 刷新逻辑修改变更变更变更变更变更变更
- 移除了过期校验变更变更变更变更变更变更变更变更
diff --git a/src/auth/token.ts b/src/auth/token.ts
index xxx111..yyy222 100644
--- a/src/auth/token.ts
+++ b/src/auth/token.ts
@@ -88,12 +88,7 @@ export function refreshToken(oldToken: string) {
     throw new Error('Token not found');
   }
 
-  if (isTokenExpired(tokenData)) {
-    throw new Error('Token expired');
-  }
-
-  if (!verifyTokenSignature(oldToken)) {
-    throw new Error('Invalid signature');
-  }
+  // 灰度期临时跳过变更变更变更变更变更变更变更
  `.trim(),
    reviewRecordId: 'rr-005',
    url: 'https://git.example.com/repo/pull/1288/files',
  },
  {
    id: 'sm-006',
    type: 'code_diff',
    title: 'PR #1289 UI 组件变更变更变更变更变更变更变更变更',
    content: `
- 新增表格组件变更变更变更变更变更变更变更变更
- 修复分页 bug变更变更变更变更变更变更变更变更
diff --git a/src/components/DataTable.tsx b/src/components/DataTable.tsx
  `.trim(),
    reviewRecordId: 'rr-006',
    url: 'https://git.example.com/repo/pull/1289/files',
  },
]

export const predictionSnapshots: PredictionSnapshot[] = [
  {
    id: 'ps-001-base',
    reviewRecordId: 'rr-001',
    modelVersionId: 'mv-2024-06-01',
    predictedRiskLevel: 'medium',
    predictedStatus: 'pending',
    confidence: 0.72,
    predictedAt: '2024-06-16T08:00:00Z',
    featureScores: { auth_bypass: 0.6, payment_change: 0.8, signature_change: 0.9 },
  },
  {
    id: 'ps-001-cand',
    reviewRecordId: 'rr-001',
    modelVersionId: 'mv-2024-06-15',
    predictedRiskLevel: 'critical',
    predictedStatus: 'rejected',
    confidence: 0.95,
    predictedAt: '2024-06-18T08:00:00Z',
    featureScores: { auth_bypass: 0.95, payment_change: 0.9, signature_removal: 0.98 },
  },
  {
    id: 'ps-002-base',
    reviewRecordId: 'rr-002',
    modelVersionId: 'mv-2024-06-01',
    predictedRiskLevel: 'low',
    predictedStatus: 'approved',
    confidence: 0.88,
    predictedAt: '2024-06-16T08:05:00Z',
    featureScores: { permission_change: 0.3, temp_bypass: 0.4 },
  },
  {
    id: 'ps-002-cand',
    reviewRecordId: 'rr-002',
    modelVersionId: 'mv-2024-06-15',
    predictedRiskLevel: 'high',
    predictedStatus: 'rejected',
    confidence: 0.86,
    predictedAt: '2024-06-18T08:05:00Z',
    featureScores: { permission_change: 0.7, auth_bypass_pattern: 0.92, gray_test_bypass: 0.95 },
  },
  {
    id: 'ps-003-base',
    reviewRecordId: 'rr-003',
    modelVersionId: 'mv-2024-06-01',
    predictedRiskLevel: 'low',
    predictedStatus: 'approved',
    confidence: 0.95,
    predictedAt: '2024-06-16T08:10:00Z',
    featureScores: { logging_change: 0.1, data_masking: 0.05 },
  },
  {
    id: 'ps-003-cand',
    reviewRecordId: 'rr-003',
    modelVersionId: 'mv-2024-06-15',
    predictedRiskLevel: 'low',
    predictedStatus: 'approved',
    confidence: 0.96,
    predictedAt: '2024-06-18T08:10:00Z',
    featureScores: { logging_change: 0.1, data_masking: 0.05 },
  },
  {
    id: 'ps-004-base',
    reviewRecordId: 'rr-004',
    modelVersionId: 'mv-2024-06-01',
    predictedRiskLevel: 'low',
    predictedStatus: 'approved',
    confidence: 0.9,
    predictedAt: '2024-06-16T08:15:00Z',
    featureScores: { db_pool_change: 0.2 },
  },
  {
    id: 'ps-004-cand',
    reviewRecordId: 'rr-004',
    modelVersionId: 'mv-2024-06-15',
    predictedRiskLevel: 'medium',
    predictedStatus: 'pending',
    confidence: 0.65,
    predictedAt: '2024-06-18T08:15:00Z',
    featureScores: { db_pool_change: 0.5, leak_risk: 0.7 },
  },
  {
    id: 'ps-005-base',
    reviewRecordId: 'rr-005',
    modelVersionId: 'mv-2024-06-01',
    predictedRiskLevel: 'high',
    predictedStatus: 'rejected',
    confidence: 0.82,
    predictedAt: '2024-06-16T08:20:00Z',
    featureScores: { token_logic_change: 0.8, expiry_removal: 0.9 },
  },
  {
    id: 'ps-005-cand',
    reviewRecordId: 'rr-005',
    modelVersionId: 'mv-2024-06-15',
    predictedRiskLevel: 'high',
    predictedStatus: 'rejected',
    confidence: 0.88,
    predictedAt: '2024-06-18T08:20:00Z',
    featureScores: { token_logic_change: 0.85, expiry_removal: 0.92, sig_skip: 0.96 },
  },
  {
    id: 'ps-006-base',
    reviewRecordId: 'rr-006',
    modelVersionId: 'mv-2024-06-01',
    predictedRiskLevel: 'low',
    predictedStatus: 'approved',
    confidence: 0.98,
    predictedAt: '2024-06-16T08:25:00Z',
    featureScores: { ui_change: 0.05 },
  },
  {
    id: 'ps-006-cand',
    reviewRecordId: 'rr-006',
    modelVersionId: 'mv-2024-06-15',
    predictedRiskLevel: 'low',
    predictedStatus: 'approved',
    confidence: 0.98,
    predictedAt: '2024-06-18T08:25:00Z',
    featureScores: { ui_change: 0.05 },
  },
]

export const manualCorrections: ManualCorrection[] = [
  {
    id: 'mc-001',
    reviewRecordId: 'rr-002',
    correctedRiskLevel: 'medium',
    correctedStatus: 'pending',
    reason: '灰度测试用户逻辑变更变更变更变更，已要求变更变更变更变更变更变更变更',
    followUpNote: '变更变更变更变更变更变更变更变更，待变更变更变更变更变更变更变更后变更变更变更变更变更变更',
    operator: '老唐（风控运营）',
    operatorRole: 'risk_ops',
    correctedAt: '2024-06-17T14:30:00Z',
    modelVersionId: 'mv-2024-06-01',
    overriddenPredictionId: 'ps-002-base',
  },
]

export const reviewRecords: ReviewRecord[] = [
  {
    id: 'rr-001',
    prId: '1284',
    prTitle: '支付回调签名校验逻辑变更变更变更变更变更变更',
    author: 'zhangsan',
    repo: 'payment-service',
    createdAt: '2024-06-16T07:30:00Z',
    currentStatus: 'pending',
    currentRiskLevel: 'critical',
    sourceMaterialIds: ['sm-001'],
    latestPredictionId: 'ps-001-cand',
    isSuspended: false,
  },
  {
    id: 'rr-002',
    prId: '1285',
    prTitle: '权限模块变更变更变更变更变更变更变更变更',
    author: 'lisi',
    repo: 'auth-service',
    createdAt: '2024-06-16T07:45:00Z',
    currentStatus: 'corrected',
    currentRiskLevel: 'medium',
    sourceMaterialIds: ['sm-002'],
    latestPredictionId: 'ps-002-cand',
    manualCorrectionId: 'mc-001',
    isSuspended: false,
    exceptionQueueId: 'eq-001',
  },
  {
    id: 'rr-003',
    prId: '1286',
    prTitle: '日志批量写入性能优化变更变更变更变更变更变更变更变更',
    author: 'wangwu',
    repo: 'platform-common',
    createdAt: '2024-06-16T08:00:00Z',
    currentStatus: 'approved',
    currentRiskLevel: 'low',
    sourceMaterialIds: ['sm-003'],
    latestPredictionId: 'ps-003-cand',
    isSuspended: false,
  },
  {
    id: 'rr-004',
    prId: '1287',
    prTitle: '数据库连接池参数变更变更变更变更变更变更变更变更',
    author: 'zhaoliu',
    repo: 'order-service',
    createdAt: '2024-06-16T08:15:00Z',
    currentStatus: 'pending',
    currentRiskLevel: 'medium',
    sourceMaterialIds: ['sm-004'],
    latestPredictionId: 'ps-004-cand',
    isSuspended: false,
  },
  {
    id: 'rr-005',
    prId: '1288',
    prTitle: '鉴权 token 刷新逻辑变更变更变更变更变更变更变更变更',
    author: 'sunqi',
    repo: 'auth-service',
    createdAt: '2024-06-16T08:30:00Z',
    currentStatus: 'suspended',
    currentRiskLevel: 'high',
    sourceMaterialIds: ['sm-005'],
    latestPredictionId: 'ps-005-cand',
    isSuspended: true,
    suspendedReason: '变更变更变更变更变更变更变更变更，需变更变更变更变更变更变更变更后变更变更变更变更变更变更变更',
    exceptionQueueId: 'eq-002',
  },
  {
    id: 'rr-006',
    prId: '1289',
    prTitle: 'UI 组件变更变更变更变更变更变更变更变更变更',
    author: 'zhouba',
    repo: 'web-frontend',
    createdAt: '2024-06-16T08:45:00Z',
    currentStatus: 'approved',
    currentRiskLevel: 'low',
    sourceMaterialIds: ['sm-006'],
    latestPredictionId: 'ps-006-cand',
    isSuspended: false,
  },
]

export const exceptionQueue: ExceptionQueueItem[] = [
  {
    id: 'eq-001',
    reviewRecordId: 'rr-002',
    type: 'manual_vs_prediction',
    severity: 'high',
    status: 'open',
    reportedAt: '2024-06-18T08:10:00Z',
    description: '灰度模型预测变更变更变更变更变更变更变更变更变更，但存在 v2.3.1 下的人工修正（medium/pending）变更变更变更变更变更变更变更变更，需变更变更变更变更变更变更变更变更',
  },
  {
    id: 'eq-002',
    reviewRecordId: 'rr-005',
    type: 'duplicate_evaluation',
    severity: 'high',
    status: 'in_review',
    reportedAt: '2024-06-18T08:25:00Z',
    description: '基线与灰度预测变更变更变更变更变更变更变更变更变更，人工变更变更变更变更变更变更变更变更，已挂起变更变更变更变更变更变更变更变更变更',
  },
]

export const historyEntries: HistoryEntry[] = [
  {
    id: 'he-001',
    reviewRecordId: 'rr-001',
    eventType: 'prediction',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-16T08:00:00Z',
    beforeSnapshot: { status: null, riskLevel: null },
    afterSnapshot: { status: 'pending', riskLevel: 'medium', modelVersion: 'v2.3.1-stable', confidence: 0.72 },
  },
  {
    id: 'he-002',
    reviewRecordId: 'rr-001',
    eventType: 'prediction',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-18T08:00:00Z',
    beforeSnapshot: { status: 'pending', riskLevel: 'medium', modelVersion: 'v2.3.1-stable' },
    afterSnapshot: { status: 'rejected', riskLevel: 'critical', modelVersion: 'v2.4.0-gray', confidence: 0.95 },
    note: '灰度模型 v2.4.0 重新评估变更变更变更变更变更变更变更变更',
  },
  {
    id: 'he-003',
    reviewRecordId: 'rr-002',
    eventType: 'prediction',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-16T08:05:00Z',
    beforeSnapshot: { status: null, riskLevel: null },
    afterSnapshot: { status: 'approved', riskLevel: 'low', modelVersion: 'v2.3.1-stable', confidence: 0.88 },
  },
  {
    id: 'he-004',
    reviewRecordId: 'rr-002',
    eventType: 'manual_correction',
    operator: '老唐（风控运营）',
    operatorRole: 'risk_ops',
    timestamp: '2024-06-17T14:30:00Z',
    beforeSnapshot: { status: 'approved', riskLevel: 'low', source: 'model' },
    afterSnapshot: { status: 'pending', riskLevel: 'medium', source: 'manual' },
    note: '灰度测试变更变更变更变更变更变更变更变更，人工变更变更变更变更变更变更变更变更',
  },
  {
    id: 'he-005',
    reviewRecordId: 'rr-002',
    eventType: 'prediction',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-18T08:05:00Z',
    beforeSnapshot: { status: 'pending', riskLevel: 'medium', source: 'manual', modelVersion: 'v2.3.1-stable' },
    afterSnapshot: { status: 'rejected', riskLevel: 'high', source: 'model', modelVersion: 'v2.4.0-gray', confidence: 0.86 },
    note: '灰度模型变更变更变更变更变更变更变更变更变更，与人工修正变更变更变更变更变更变更变更变更，已加入异常变更变更变更变更变更变更变更变更',
  },
  {
    id: 'he-006',
    reviewRecordId: 'rr-005',
    eventType: 'prediction',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-16T08:20:00Z',
    beforeSnapshot: { status: null, riskLevel: null },
    afterSnapshot: { status: 'rejected', riskLevel: 'high', modelVersion: 'v2.3.1-stable', confidence: 0.82 },
  },
  {
    id: 'he-007',
    reviewRecordId: 'rr-005',
    eventType: 'prediction',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-18T08:20:00Z',
    beforeSnapshot: { status: 'rejected', riskLevel: 'high', modelVersion: 'v2.3.1-stable' },
    afterSnapshot: { status: 'rejected', riskLevel: 'high', modelVersion: 'v2.4.0-gray', confidence: 0.88 },
  },
  {
    id: 'he-008',
    reviewRecordId: 'rr-005',
    eventType: 'suspend',
    operator: 'system',
    operatorRole: 'system',
    timestamp: '2024-06-18T08:21:00Z',
    beforeSnapshot: { isSuspended: false },
    afterSnapshot: { isSuspended: true, suspendedReason: '重复变更变更变更变更变更变更变更变更变更变更，置信度变更变更变更变更变更变更变更变更变更' },
  },
]
