import type { VestingDetail } from '../../shared/types.js';

export class ExportService {
  public static toCSV(details: VestingDetail[]): string {
    const headers = [
      '员工姓名',
      '员工编号',
      '部门',
      '状态',
      '授予数量',
      '已归属',
      '待归属',
      '已作废',
      '已行权',
      '可行权',
      '归属计划',
      '协议版本',
      '授予日期',
      '是否有异常',
      '异常说明',
    ];

    const rows = details.map((d) => {
      const totalVested = d.schedules
        .filter((s) => s.status === 'vested' || s.status === 'accelerated')
        .reduce((sum, s) => sum + s.vestedShares, 0);
      const totalPending = d.schedules
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + s.vestedShares, 0);
      const totalForfeited = d.schedules
        .filter((s) => s.status === 'forfeited' || s.status === 'expired')
        .reduce((sum, s) => sum + s.vestedShares, 0);
      const totalExercised = d.exercises
        .filter((e) => e.status === 'completed')
        .reduce((sum, e) => sum + e.shares, 0);

      const hasException = d.schedules.some(
        (s) => s.isAccelerated || s.status === 'forfeited' || s.status === 'expired',
      ) || d.corrections.length > 0;

      let exceptionNote = '';
      if (d.schedules.some((s) => s.isAccelerated)) {
        exceptionNote += '离职加速';
      }
      if (d.schedules.some((s) => s.status === 'expired')) {
        exceptionNote += exceptionNote ? '、' : '';
        exceptionNote += '窗口过期';
      }
      if (d.schedules.some((s) => s.status === 'forfeited')) {
        exceptionNote += exceptionNote ? '、' : '';
        exceptionNote += '离职作废';
      }
      if (d.corrections.length > 0) {
        exceptionNote += exceptionNote ? '、' : '';
        exceptionNote += `授予修正(${d.corrections.length}次)`;
      }

      return [
        d.employee.name,
        d.employee.employeeNo,
        d.employee.department,
        this.getStatusText(d.employee.status),
        d.grant.totalShares,
        totalVested,
        totalPending,
        totalForfeited,
        totalExercised,
        totalVested - totalExercised,
        d.plan.name,
        d.grant.agreementVersion,
        d.grant.grantDate,
        hasException ? '是' : '否',
        exceptionNote,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  public static toDetailedCSV(detail: VestingDetail): string {
    const headers = [
      '归属日期',
      '归属数量',
      '累计归属',
      '状态',
      '计算说明',
      '是否加速',
      '加速原因',
      '行权截止日期',
    ];

    const rows = detail.schedules.map((s) => [
      s.vestDate,
      s.vestedShares,
      s.cumulativeShares,
      this.getVestingStatusText(s.status),
      `"${s.calculationNote.replace(/"/g, '""')}"`,
      s.isAccelerated ? '是' : '否',
      s.accelerationReason || '',
      s.exerciseDeadline || '',
    ].join(','));

    const summaryRows = [
      [],
      ['员工信息'],
      ['姓名', detail.employee.name],
      ['员工编号', detail.employee.employeeNo],
      ['部门', detail.employee.department],
      ['职位', detail.employee.position],
      ['入职日期', detail.employee.hireDate],
      ['离职日期', detail.employee.terminationDate || '-'],
      [],
      ['授予信息'],
      ['授予数量', detail.grant.totalShares],
      ['授予日期', detail.grant.grantDate],
      ['归属计划', detail.plan.name],
      ['协议版本', detail.grant.agreementVersion],
      ['加速条款', detail.plan.accelerationNote],
      [],
      ['历史修正'],
      ['修正时间', '字段', '原值', '新值', '原因', '操作人'],
      ...detail.corrections.map((c) => [
        c.timestamp,
        c.fieldName,
        c.oldValue,
        c.newValue,
        `"${c.reason.replace(/"/g, '""')}"`,
        c.operator,
      ].join(',')),
    ];

    return [
      '归属明细',
      headers.join(','),
      ...rows,
      ...summaryRows,
    ].join('\n');
  }

  private static getStatusText(status: string): string {
    const map: Record<string, string> = {
      active: '在职',
      terminated: '已离职',
      pending: '待入职',
    };
    return map[status] || status;
  }

  private static getVestingStatusText(status: string): string {
    const map: Record<string, string> = {
      vested: '已归属',
      pending: '待归属',
      accelerated: '加速归属',
      forfeited: '已作废',
      expired: '已过期',
    };
    return map[status] || status;
  }
}
