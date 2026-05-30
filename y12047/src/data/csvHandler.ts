import type { Node, Member } from '../types';

export interface ImportResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  });
}

export function importNodesFromCSV(text: string): ImportResult<Node> {
  try {
    const rows = parseCSV(text);
    
    if (rows.length < 2) {
      return { success: false, error: 'CSV文件至少需要包含表头和一行数据' };
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const idIdx = headers.findIndex(h => h.includes('id') || h.includes('编号'));
    const xIdx = headers.findIndex(h => h === 'x' || h.includes('x坐标'));
    const yIdx = headers.findIndex(h => h === 'y' || h.includes('y坐标'));
    const constraintIdx = headers.findIndex(h => h.includes('约束') || h.includes('constraint'));
    const loadIdx = headers.findIndex(h => h.includes('载荷') || h.includes('load'));

    if (idIdx === -1 || xIdx === -1 || yIdx === -1) {
      return { success: false, error: 'CSV必须包含ID、X坐标、Y坐标列' };
    }

    const nodes: Node[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = row[idIdx] || `n${i}`;
      const x = parseFloat(row[xIdx]);
      const y = parseFloat(row[yIdx]);

      if (isNaN(x) || isNaN(y)) {
        return { success: false, error: `第${i + 1}行坐标格式错误` };
      }

      let constraintType: Node['constraintType'] = 'free';
      if (constraintIdx !== -1 && row[constraintIdx]) {
        const c = row[constraintIdx].toLowerCase();
        if (c.includes('固定') || c === 'fixed') constraintType = 'fixed';
        else if (c.includes('铰') || c === 'pin') constraintType = 'pin';
        else if (c.includes('滚动') || c === 'roller') constraintType = 'roller';
      }

      let isLoadPoint = false;
      if (loadIdx !== -1 && row[loadIdx]) {
        const l = row[loadIdx].toLowerCase();
        isLoadPoint = l === 'true' || l === '1' || l === '是' || l.includes('载荷');
      }

      nodes.push({ id, name: id, x, y, constraintType, constraintAngle: 0, isLoadPoint });
    }

    return { success: true, data: nodes };
  } catch (e) {
    return { success: false, error: `解析CSV失败: ${(e as Error).message}` };
  }
}

export function importMembersFromCSV(text: string): ImportResult<Member> {
  try {
    const rows = parseCSV(text);
    
    if (rows.length < 2) {
      return { success: false, error: 'CSV文件至少需要包含表头和一行数据' };
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const idIdx = headers.findIndex(h => h.includes('id') || h.includes('编号'));
    const startIdx = headers.findIndex(h => h.includes('start') || h.includes('起点'));
    const endIdx = headers.findIndex(h => h.includes('end') || h.includes('终点'));
    const areaIdx = headers.findIndex(h => h.includes('area') || h.includes('截面积'));
    const eIdx = headers.findIndex(h => h === 'e' || h.includes('弹性模量'));
    const yieldIdx = headers.findIndex(h => h.includes('yield') || h.includes('屈服强度'));
    const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('造价'));
    const materialIdx = headers.findIndex(h => h.includes('material') || h.includes('材料'));

    if (idIdx === -1 || startIdx === -1 || endIdx === -1) {
      return { success: false, error: 'CSV必须包含ID、起点、终点列' };
    }

    const members: Member[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = row[idIdx] || `m${i}`;
      const startNodeId = row[startIdx];
      const endNodeId = row[endIdx];

      if (!startNodeId || !endNodeId) {
        return { success: false, error: `第${i + 1}行缺少节点信息` };
      }

      const area = areaIdx !== -1 ? parseFloat(row[areaIdx]) : 20;
      const elasticModulus = eIdx !== -1 ? parseFloat(row[eIdx]) : 200;
      const yieldStrength = yieldIdx !== -1 ? parseFloat(row[yieldIdx]) : 235;
      const unitCost = costIdx !== -1 ? parseFloat(row[costIdx]) : 50;
      
      let material: Member['material'] = 'steel';
      if (materialIdx !== -1 && row[materialIdx]) {
        const m = row[materialIdx].toLowerCase();
        if (m.includes('铝') || m === 'aluminum') material = 'aluminum';
        else if (m.includes('木') || m === 'wood') material = 'wood';
      }

      if (isNaN(area) || isNaN(elasticModulus) || isNaN(yieldStrength) || isNaN(unitCost)) {
        return { success: false, error: `第${i + 1}行参数格式错误` };
      }

      members.push({
        id,
        name: id,
        startNodeId,
        endNodeId,
        crossSection: area,
        area,
        elasticModulus,
        yieldStrength,
        unitCost,
        material,
      });
    }

    return { success: true, data: members };
  } catch (e) {
    return { success: false, error: `解析CSV失败: ${(e as Error).message}` };
  }
}

export function exportNodesToCSV(nodes: Node[]): string {
  const lines = ['ID,X坐标,Y坐标,约束类型,载荷点'];
  
  for (const node of nodes) {
    const constraintMap: Record<string, string> = {
      free: '自由',
      pin: '铰支',
      roller: '滚动',
      fixed: '固定',
    };
    lines.push(
      `${node.id},${node.x},${node.y},` +
      `${constraintMap[node.constraintType] || node.constraintType},` +
      `${node.isLoadPoint ? '是' : '否'}`
    );
  }
  
  return lines.join('\n');
}

export function exportMembersToCSV(members: Member[]): string {
  const lines = ['ID,起点,终点,截面积(cm²),弹性模量(GPa),屈服强度(MPa),单位造价(¥/m),材料'];
  
  const materialMap: Record<string, string> = {
    steel: '钢材',
    aluminum: '铝合金',
    wood: '木材',
  };
  
  for (const member of members) {
    lines.push(
      `${member.id},${member.startNodeId},${member.endNodeId},` +
      `${member.area},${member.elasticModulus},${member.yieldStrength},` +
      `${member.unitCost},${materialMap[member.material] || member.material}`
    );
  }
  
  return lines.join('\n');
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export const csvHandler = {
  parseCSV,
  parseNodesCSV: (text: string) => importNodesFromCSV(text).data || [],
  parseMembersCSV: (text: string) => importMembersFromCSV(text).data || [],
  exportNodesCSV: exportNodesToCSV,
  exportMembersCSV: exportMembersToCSV,
  readFileAsText,
};
