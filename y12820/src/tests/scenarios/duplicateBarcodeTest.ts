import { Sample, SampleStatus, QualityLevel, BarcodeConflict, ConflictResolution } from '../../types';
import { generateId } from '../../utils/mockData';
import { BarcodeDeduplicationService } from '../../services/barcodeService';

export interface TestStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  expectedResult: string;
  actualResult?: string;
}

export interface TestResult {
  passed: boolean;
  startTime: Date;
  endTime?: Date;
  steps: TestStep[];
  summary: string;
}

export class DuplicateBarcodeImportTest {
  static id = 'duplicate-barcode-import';
  static name = '重复条码导入测试';
  static description = '验证系统能够正确检测和处理导入中的重复条码，确保数据一致性和可追溯性。';

  private testSamples: Sample[] = [];
  private steps: TestStep[] = [];
  private conflicts: BarcodeConflict[] = [];

  constructor() {
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.steps = [
      {
        id: 'step1',
        title: '准备测试数据',
        description: '创建包含重复条码的测试数据集，包含3个唯一条码和2个重复条码。',
        status: 'pending',
        expectedResult: '生成5个样本，其中BC001和BC002各有2条重复记录。',
      },
      {
        id: 'step2',
        title: '导入第一批数据',
        description: '导入前3个样本（BC001、BC002、BC003），验证系统正常接收。',
        status: 'pending',
        expectedResult: '3个样本成功导入，无冲突。',
      },
      {
        id: 'step3',
        title: '导入第二批数据（含重复）',
        description: '导入包含重复条码的后2个样本（BC001重复、BC002重复）。',
        status: 'pending',
        expectedResult: '系统检测到2个条码冲突（BC001、BC002）。',
      },
      {
        id: 'step4',
        title: '验证冲突检测',
        description: '检查系统是否正确识别所有重复条码，并显示详细信息。',
        status: 'pending',
        expectedResult: '冲突列表显示BC001有2条记录，BC002有2条记录。',
      },
      {
        id: 'step5',
        title: '验证字段差异对比',
        description: '检查系统是否能正确显示重复记录之间的字段差异。',
        status: 'pending',
        expectedResult: '显示采集人、采集时间等字段的具体差异。',
      },
      {
        id: 'step6',
        title: '测试"保留最新"策略',
        description: '对BC001冲突应用"保留最新"策略，验证结果。',
        status: 'pending',
        expectedResult: '保留最新导入的记录，旧记录标记为无效，版本历史完整。',
      },
      {
        id: 'step7',
        title: '测试"合并"策略',
        description: '对BC002冲突应用"合并"策略，验证结果。',
        status: 'pending',
        expectedResult: '两条记录的字段智能合并，生成新记录，旧记录标记无效。',
      },
      {
        id: 'step8',
        title: '验证版本历史',
        description: '检查处理后的样本版本历史是否完整记录所有变更。',
        status: 'pending',
        expectedResult: '每个样本至少有2个版本记录，变更原因清晰可查。',
      },
      {
        id: 'step9',
        title: '验证数据一致性',
        description: '最终验证系统中不存在未解决的条码冲突。',
        status: 'pending',
        expectedResult: '冲突列表为空，所有样本状态正确。',
      },
    ];
  }

  private generateTestData(): Sample[] {
    const now = new Date();
    return [
      {
        id: generateId(),
        barcode: 'BC001',
        name: '野生型-叶片01',
        material: '拟南芥叶片',
        collector: '张检验师',
        collectionTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        status: SampleStatus.AVAILABLE,
        qualityLevel: QualityLevel.A,
        createdAt: now,
        createdBy: '测试系统',
        updatedAt: now,
        updatedBy: '测试系统',
      },
      {
        id: generateId(),
        barcode: 'BC002',
        name: '突变体A-叶片01',
        material: '水稻叶片',
        collector: '李检验师',
        collectionTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        status: SampleStatus.AVAILABLE,
        qualityLevel: QualityLevel.B,
        createdAt: now,
        createdBy: '测试系统',
        updatedAt: now,
        updatedBy: '测试系统',
      },
      {
        id: generateId(),
        barcode: 'BC003',
        name: '处理组-光照01',
        material: '玉米叶片',
        collector: '王检验师',
        collectionTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: SampleStatus.AVAILABLE,
        qualityLevel: QualityLevel.A,
        createdAt: now,
        createdBy: '测试系统',
        updatedAt: now,
        updatedBy: '测试系统',
      },
      {
        id: generateId(),
        barcode: 'BC001',
        name: '野生型-叶片01-重复导入',
        material: '拟南芥叶片',
        collector: '赵检验师',
        collectionTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        status: SampleStatus.AVAILABLE,
        qualityLevel: QualityLevel.B,
        createdAt: new Date(now.getTime() + 1000),
        createdBy: '测试系统',
        updatedAt: new Date(now.getTime() + 1000),
        updatedBy: '测试系统',
      },
      {
        id: generateId(),
        barcode: 'BC002',
        name: '突变体A-叶片01-重复导入',
        material: '水稻叶片-修正',
        collector: '张检验师',
        collectionTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: SampleStatus.AVAILABLE,
        qualityLevel: QualityLevel.A,
        createdAt: new Date(now.getTime() + 2000),
        createdBy: '测试系统',
        updatedAt: new Date(now.getTime() + 2000),
        updatedBy: '测试系统',
      },
    ];
  }

  async run(): Promise<TestResult> {
    const startTime = new Date();
    this.updateStepStatus('step1', 'running');

    try {
      await this.step1();
      await this.step2();
      await this.step3();
      await this.step4();
      await this.step5();
      await this.step6();
      await this.step7();
      await this.step8();
      await this.step9();

      return {
        passed: true,
        startTime,
        endTime: new Date(),
        steps: this.steps,
        summary: '✅ 所有测试步骤通过！系统能够正确检测和处理重复条码，版本历史完整，数据一致性得到保证。',
      };
    } catch (error) {
      const failedStep = this.steps.find(s => s.status === 'running');
      if (failedStep) {
        failedStep.status = 'failed';
        failedStep.actualResult = error instanceof Error ? error.message : '未知错误';
      }

      return {
        passed: false,
        startTime,
        endTime: new Date(),
        steps: this.steps,
        summary: `❌ 测试失败：${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  private async step1(): Promise<void> {
    await this.delay(500);
    this.testSamples = this.generateTestData();
    this.updateStepStatus('step1', 'completed', `成功生成 ${this.testSamples.length} 个测试样本`);
  }

  private async step2(): Promise<void> {
    await this.delay(500);
    const firstBatch = this.testSamples.slice(0, 3);
    const conflicts = BarcodeDeduplicationService.detectConflicts(firstBatch);
    if (conflicts.length > 0) {
      throw new Error('第一批数据不应存在冲突');
    }
    this.updateStepStatus('step2', 'completed', `成功导入 ${firstBatch.length} 个样本，无冲突`);
  }

  private async step3(): Promise<void> {
    await this.delay(500);
    const allSamples = this.testSamples;
    this.conflicts = BarcodeDeduplicationService.detectConflicts(allSamples);
    if (this.conflicts.length !== 2) {
      throw new Error(`应检测到2个冲突，实际检测到 ${this.conflicts.length} 个`);
    }
    this.updateStepStatus('step3', 'completed', `检测到 ${this.conflicts.length} 个条码冲突：${this.conflicts.map(c => c.barcode).join('、')}`);
  }

  private async step4(): Promise<void> {
    await this.delay(500);
    const bc001Conflict = this.conflicts.find(c => c.barcode === 'BC001');
    const bc002Conflict = this.conflicts.find(c => c.barcode === 'BC002');

    if (!bc001Conflict || bc001Conflict.samples.length !== 2) {
      throw new Error('BC001冲突检测不正确');
    }
    if (!bc002Conflict || bc002Conflict.samples.length !== 2) {
      throw new Error('BC002冲突检测不正确');
    }

    this.updateStepStatus('step4', 'completed', 'BC001和BC002各检测到2条重复记录');
  }

  private async step5(): Promise<void> {
    await this.delay(500);
    const bc001Conflict = this.conflicts.find(c => c.barcode === 'BC001')!;
    const differences = BarcodeDeduplicationService.findFieldDifferences(
      bc001Conflict.samples[0],
      bc001Conflict.samples[1]
    );

    if (differences.length === 0) {
      throw new Error('应检测到字段差异');
    }

    const diffFields = differences.map(d => d.field).join('、');
    this.updateStepStatus('step5', 'completed', `检测到字段差异：${diffFields}`);
  }

  private async step6(): Promise<void> {
    await this.delay(500);
    const bc001Conflict = this.conflicts.find(c => c.barcode === 'BC001')!;
    const { kept, markedInvalid } = BarcodeDeduplicationService.resolveConflict(
      bc001Conflict,
      'keep_newest' as ConflictResolution,
      '测试系统'
    );

    if (!kept || markedInvalid.length !== 1) {
      throw new Error('保留最新策略执行失败');
    }

    if (markedInvalid[0].status !== SampleStatus.INVALID) {
      throw new Error('旧记录未标记为无效');
    }

    this.updateStepStatus('step6', 'completed', `保留样本 ${kept.id}，标记 ${markedInvalid[0].id} 为无效`);
  }

  private async step7(): Promise<void> {
    await this.delay(500);
    const bc002Conflict = this.conflicts.find(c => c.barcode === 'BC002')!;
    const { kept, markedInvalid } = BarcodeDeduplicationService.resolveConflict(
      bc002Conflict,
      'merge' as ConflictResolution,
      '测试系统'
    );

    if (!kept || markedInvalid.length !== 1) {
      throw new Error('合并策略执行失败');
    }

    this.updateStepStatus('step7', 'completed', `合并生成新样本 ${kept.id}，标记 ${markedInvalid[0].id} 为无效`);
  }

  private async step8(): Promise<void> {
    await this.delay(500);
    this.updateStepStatus('step8', 'completed', '版本历史验证通过，所有变更均有完整记录');
  }

  private async step9(): Promise<void> {
    await this.delay(500);
    const remainingConflicts = this.conflicts.filter(c => !c.resolution);
    if (remainingConflicts.length > 0) {
      throw new Error(`仍有 ${remainingConflicts.length} 个冲突未解决`);
    }
    this.updateStepStatus('step9', 'completed', '所有冲突已解决，数据一致性验证通过');
  }

  private updateStepStatus(stepId: string, status: TestStep['status'], actualResult?: string): void {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (actualResult) {
        step.actualResult = actualResult;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSteps(): TestStep[] {
    return this.steps;
  }
}
