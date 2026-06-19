import db from '../db/database';
import { BoundaryCase, ConnectionPoolData } from '../../shared/types';
import diagnosisService from './DiagnosisService';
import auditService from './AuditService';

export class BoundaryCaseService {
  public getAll(): BoundaryCase[] {
    const rows = db.prepare(
      'SELECT * FROM boundary_case WHERE is_active = 1 ORDER BY id'
    ).all() as any[];
    
    return rows.map(r => ({
      ...r,
      testData: JSON.parse(r.test_data),
      expectedResult: JSON.parse(r.expected_result),
      isActive: r.is_active === 1
    }));
  }

  public getById(id: string): BoundaryCase | undefined {
    const row = db.prepare(
      'SELECT * FROM boundary_case WHERE id = ?'
    ).get(id) as any;
    
    if (!row) return undefined;
    
    return {
      ...row,
      testData: JSON.parse(row.test_data),
      expectedResult: JSON.parse(row.expected_result),
      isActive: row.is_active === 1
    };
  }

  public runCase(
    caseId: string,
    operatorId: string,
    operatorName: string
  ): {
    batch: any;
    results: any[];
    expected: any;
    match: boolean;
    details: string;
  } {
    const boundaryCase = this.getById(caseId);
    if (!boundaryCase) throw new Error('Boundary case not found');

    const batch = diagnosisService.importData(
      boundaryCase.testData,
      operatorId,
      operatorName
    );

    const results = diagnosisService.runDiagnosis(batch.id);

    const criticalResults = results.filter(r => r.severity !== 'normal');
    const hasMatchingIssue = criticalResults.some(
      r => r.issueType === boundaryCase.expectedResult.issueType
    );
    const hasMatchingSeverity = criticalResults.some(
      r => r.severity === boundaryCase.expectedResult.severity
    );
    const match = hasMatchingIssue && hasMatchingSeverity;

    const details = match 
      ? `测试通过：检测到预期的${boundaryCase.expectedResult.issueType}问题，级别为${boundaryCase.expectedResult.severity}`
      : `测试失败：预期${boundaryCase.expectedResult.severity}级别的${boundaryCase.expectedResult.issueType}，实际检测到${criticalResults.length}个问题`;

    auditService.logOperation('diagnose', operatorId, operatorName,
      `运行边界案例: ${boundaryCase.name}，结果${match ? '通过' : '失败'}`, {
      batchId: batch.id,
      reason: `边界案例测试 - ${boundaryCase.type}`
    });

    return {
      batch,
      results: criticalResults,
      expected: boundaryCase.expectedResult,
      match,
      details
    };
  }

  public runAllCases(operatorId: string, operatorName: string) {
    const cases = this.getAll();
    const results = cases.map(c => this.runCase(c.id, operatorId, operatorName));
    
    const passed = results.filter(r => r.match).length;
    const total = results.length;

    return {
      summary: {
        passed,
        total,
        passRate: ((passed / total) * 100).toFixed(1) + '%'
      },
      details: results
    };
  }

  public getCaseWithRealBadData(): BoundaryCase {
    const badDataCase = this.getAll().find(c => c.type === 'bad_data');
    if (!badDataCase) throw new Error('Bad data case not found');
    return badDataCase;
  }
}

export default new BoundaryCaseService();
