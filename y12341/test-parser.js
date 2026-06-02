const fs = require('fs');
const path = require('path');

// 模拟 csvParser.ts 的核心逻辑
function parseCSV(content, fileName) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { experiments: [], errors: ['CSV文件为空或数据不足'], totalRows: 0 };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const errors = [];

  const timeIdx = headers.findIndex(
    (h) => h.includes('time') || h.includes('时间') || h.includes('t(s)') || h === 't'
  );
  const tempIdx = headers.findIndex(
    (h) => h.includes('temp') || h.includes('温度') || h.includes('°c') || h === 'temp'
  );
  const materialIdx = headers.findIndex(
    (h) => h.includes('material') || h.includes('材料') || h.includes('id')
  );
  const thicknessIdx = headers.findIndex(
    (h) => h.includes('thick') || h.includes('厚度') || h.includes('d(')
  );
  const boundaryIdx = headers.findIndex(
    (h) => h.includes('boundary') || h.includes('边界') || h.includes('t_boundary')
  );
  const batchIdx = headers.findIndex(
    (h) => h.includes('batch') || h.includes('批次')
  );

  if (timeIdx === -1 || tempIdx === -1) {
    errors.push('CSV必须包含时间列和温度列');
    return { experiments: [], errors, totalRows: lines.length - 1 };
  }

  const dataRows = lines.slice(1).filter((line) => line.trim().length > 0);
  const experiments = [];
  const batchId = `batch-${Date.now()}`;

  const groupedByKey = new Map();
  const groupMetadata = new Map();

  dataRows.forEach((line) => {
    const values = line.split(',').map((v) => v.trim());

    const time = parseFloat(values[timeIdx]);
    const temp = parseFloat(values[tempIdx]);

    if (isNaN(time) || isNaN(temp)) {
      return;
    }

    const point = { time, temperature: temp };

    const materialId =
      materialIdx >= 0 && values[materialIdx]
        ? values[materialIdx].toString()
        : null;
    const thickness =
      thicknessIdx >= 0 && values[thicknessIdx]
        ? parseFloat(values[thicknessIdx])
        : null;
    const boundaryTemp =
      boundaryIdx >= 0 && values[boundaryIdx]
        ? parseFloat(values[boundaryIdx])
        : null;
    const batchNumber =
      batchIdx >= 0 && values[batchIdx]
        ? values[batchIdx].toString()
        : null;

    const keyParts = [];
    if (materialId) keyParts.push(materialId);
    if (batchNumber) keyParts.push(batchNumber);
    keyParts.push(fileName);

    const groupKey = keyParts.length > 1
      ? keyParts.join('::')
      : `__no_group__::${fileName}`;

    if (!groupedByKey.has(groupKey)) {
      groupedByKey.set(groupKey, []);
      groupMetadata.set(groupKey, {
        materialId,
        thickness,
        boundaryTemp,
        batchNumber,
      });
    } else {
      const existing = groupMetadata.get(groupKey);
      if (existing.thickness == null && thickness != null) {
        existing.thickness = thickness;
      }
      if (existing.boundaryTemp == null && boundaryTemp != null) {
        existing.boundaryTemp = boundaryTemp;
      }
      if (existing.batchNumber == null && batchNumber != null) {
        existing.batchNumber = batchNumber;
      }
    }

    groupedByKey.get(groupKey).push(point);
  });

  let groupIndex = 0;
  groupedByKey.forEach((points, groupKey) => {
    const metadata = groupMetadata.get(groupKey);
    const expId = `exp-${batchId}-${groupIndex}`;

    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    experiments.push({
      id: expId,
      materialId: metadata.materialId,
      thickness: metadata.thickness,
      boundaryTemp: metadata.boundaryTemp,
      batchNumber: metadata.batchNumber,
      temperaturePoints: sortedPoints,
      sourceFile: fileName,
      batchId,
      status: 'pending',
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    groupIndex++;
  });

  return { experiments, errors, totalRows: dataRows.length };
}

// 测试
const testCases = [
  'material_A_copper.csv',
  'multi_batch_copper.csv',
  'temp_only_later_fill.csv',
  'anomaly_boundary_jump.csv',
];

console.log('=== CSV 解析聚合逻辑测试 ===\n');

testCases.forEach((fileName) => {
  const filePath = path.join(__dirname, 'sample_data', fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${fileName}: 文件不存在`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parseCSV(content, fileName);

  console.log(`📄 ${fileName}`);
  console.log(`   总行数: ${result.totalRows}`);
  console.log(`   解析后实验数: ${result.experiments.length}`);
  
  if (result.errors.length > 0) {
    console.log(`   错误: ${result.errors.join(', ')}`);
  }

  result.experiments.forEach((exp, idx) => {
    console.log(`   实验 ${idx + 1}:`);
    console.log(`     材料: ${exp.materialId || '无'}`);
    console.log(`     批次: ${exp.batchNumber || '无'}`);
    console.log(`     温度点数: ${exp.temperaturePoints.length}`);
    console.log(`     厚度: ${exp.thickness ?? '无'}`);
    console.log(`     边界温度: ${exp.boundaryTemp ?? '无'}`);
    console.log(`     时间范围: ${exp.temperaturePoints[0]?.time}s - ${exp.temperaturePoints[exp.temperaturePoints.length - 1]?.time}s`);
    console.log(`     温度范围: ${exp.temperaturePoints[0]?.temperature}°C - ${exp.temperaturePoints[exp.temperaturePoints.length - 1]?.temperature}°C`);
  });
  console.log();
});

console.log('=== 测试完成 ===');
