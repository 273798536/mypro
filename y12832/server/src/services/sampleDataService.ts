import { AppDataSource } from '../data-source';
import { SystemConfig } from '../entities/SystemConfig';
import { importSamples } from './sampleService';
import { SampleImportData } from './sampleService';

const configRepository = AppDataSource.getRepository(SystemConfig);

export const SAMPLE_DATA_INITIALIZED_KEY = 'sample_data_initialized';

const mockSamples: SampleImportData[] = [
  {
    barcode: 'BAC-2026-0001',
    sampleName: '血液培养样本-01',
    bacteriaName: '金黄色葡萄球菌',
    resistanceProfile: '青霉素R;氨苄西林R;头孢唑啉S;万古霉素S',
    collectionTime: '2026-06-01 08:30:00',
    testTime: '2026-06-02 10:00:00',
    sequencingBatch: 'BATCH-2026-06-001',
    notes: '住院患者，发热待查',
  },
  {
    barcode: 'BAC-2026-0002',
    sampleName: '尿液样本-02',
    bacteriaName: '大肠埃希菌',
    resistanceProfile: '氨苄西林R;头孢他啶S;亚胺培南S;环丙沙星R',
    collectionTime: '2026-06-01 09:15:00',
    testTime: '2026-06-02 11:30:00',
    sequencingBatch: 'BATCH-2026-06-001',
    notes: '尿路感染患者',
  },
  {
    barcode: 'BAC-2026-0003',
    sampleName: '痰液样本-03',
    bacteriaName: '铜绿假单胞菌',
    resistanceProfile: '头孢他啶R;亚胺培南R;阿米卡星S;环丙沙星S',
    collectionTime: '2026-06-01 10:00:00',
    testTime: '2026-06-02 14:00:00',
    sequencingBatch: 'BATCH-2026-06-001',
    notes: 'ICU患者，肺部感染',
  },
  {
    barcode: 'BAC-2026-0004',
    sampleName: '脑脊液样本-04',
    bacteriaName: '肺炎链球菌',
    resistanceProfile: '青霉素S;头孢曲松S;万古霉素S',
    collectionTime: '2026-06-01 11:30:00',
    testTime: '2026-06-02 09:00:00',
    sequencingBatch: 'BATCH-2026-06-002',
    notes: '脑膜炎待查',
  },
  {
    barcode: 'BAC-2026-0001',
    sampleName: '血液培养样本-01-复查',
    bacteriaName: '金黄色葡萄球菌',
    resistanceProfile: '青霉素R;氨苄西林R;头孢唑啉S;万古霉素S',
    collectionTime: '2026-06-03 08:30:00',
    testTime: '',
    sequencingBatch: 'BATCH-2026-06-002',
    notes: '条码重复样本，用于教学演示',
  },
  {
    barcode: 'BAC-2026-0005',
    sampleName: '伤口分泌物-05',
    bacteriaName: '鲍曼不动杆菌',
    resistanceProfile: '头孢哌酮舒巴坦S;亚胺培南R;米诺环素S',
    collectionTime: '',
    testTime: '2026-06-03 16:00:00',
    sequencingBatch: 'BATCH-2026-06-002',
    notes: '时间点缺失，用于教学演示',
  },
  {
    barcode: 'BAC-2026-0006',
    sampleName: '粪便样本-06',
    bacteriaName: '沙门氏菌',
    resistanceProfile: '氨苄西林R;头孢曲松S;环丙沙星S',
    collectionTime: '2026-06-02 08:00:00',
    testTime: '2026-06-03 10:30:00',
    sequencingBatch: 'BATCH-2026-06-002',
    notes: '腹泻患者，食源性疾病监测',
  },
  {
    barcode: 'BAC-2026-0007',
    sampleName: '静脉导管尖端-07',
    bacteriaName: '表皮葡萄球菌',
    resistanceProfile: '青霉素R;苯唑西林R;万古霉素S;利奈唑胺S',
    collectionTime: '2026-06-02 14:00:00',
    testTime: '2026-06-03 15:00:00',
    sequencingBatch: 'BATCH-2026-06-003',
    notes: '导管相关性血流感染监测',
  },
];

export async function checkSampleDataInitialized(): Promise<boolean> {
  const config = await configRepository.findOne({
    where: { configKey: SAMPLE_DATA_INITIALIZED_KEY },
  });
  return config?.configValue === 'true';
}

export async function initializeSampleData(operator = 'system'): Promise<void> {
  const initialized = await checkSampleDataInitialized();
  if (initialized) {
    console.log('Sample data already initialized, skipping...');
    return;
  }

  console.log('Initializing sample data...');
  await importSamples(mockSamples, operator);

  await configRepository.save(
    configRepository.create({
      configKey: SAMPLE_DATA_INITIALIZED_KEY,
      configValue: 'true',
      description: '示例数据是否已初始化',
    })
  );

  console.log('Sample data initialized successfully');
}

export async function resetSampleData(operator = 'system'): Promise<void> {
  await configRepository.delete({ configKey: SAMPLE_DATA_INITIALIZED_KEY });
  await AppDataSource.query('DELETE FROM sample');
  await AppDataSource.query('DELETE FROM processing_record');
  await AppDataSource.query('DELETE FROM audit_log');
  await initializeSampleData(operator);
}
