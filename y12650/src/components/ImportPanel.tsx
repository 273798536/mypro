import { useRef } from 'react';
import { useAppStore } from '../store';
import type { PipelineRecord, PipelineSegment, CoordinateSystem } from '../types';
import { generateId, parseCSV } from '../utils/helpers';

export default function ImportPanel() {
  const { addRecord, addAlert, initDemoData } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      if (file.name.toLowerCase().endsWith('.csv')) {
        importCSV(text, file.name);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          importJSON(data, file.name);
        } catch {
          addAlert('danger', 'JSON 解析失败');
        }
      } else {
        addAlert('warning', '仅支持 CSV / JSON 格式');
      }
    };
    reader.readAsText(file);
  };

  const importCSV = (text: string, fileName: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      addAlert('warning', 'CSV 内容为空或缺少数据');
      return;
    }
    let imported = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 8) continue;
      const [
        name,
        sx, sy, sz,
        ex, ey, ez,
        diameter,
        coordSys = 'world',
        remark = '',
      ] = row;
      try {
        const sys = (['world', 'local', 'geographic'].includes(coordSys) ? coordSys : 'world') as CoordinateSystem;
        const pipe: PipelineSegment = {
          id: generateId(),
          name: name || `导入-${i}`,
          diameter: parseFloat(diameter) || 0.5,
          start: {
            id: generateId(),
            position: { x: parseFloat(sx), y: parseFloat(sy), z: parseFloat(sz) },
            coordinateSystem: sys,
          },
          end: {
            id: generateId(),
            position: { x: parseFloat(ex), y: parseFloat(ey), z: parseFloat(ez) },
            coordinateSystem: sys,
          },
        };
        const rec: PipelineRecord = {
          id: generateId(),
          name: pipe.name,
          pipeline: pipe,
          coordinateSystem: sys,
          source: { fileName, rowNumber: i + 1, remark },
          status: 'ok',
          issues: [],
          createdAt: Date.now(),
        };
        addRecord(rec);
        imported++;
      } catch {
        addAlert('warning', `第 ${i + 1} 行解析失败，已跳过`);
      }
    }
    addAlert('info', `CSV 导入完成，共处理 ${imported} 条`);
  };

  const importJSON = (data: unknown, fileName: string) => {
    if (!Array.isArray(data)) {
      addAlert('danger', 'JSON 根节点必须是数组');
      return;
    }
    let imported = 0;
    data.forEach((item, idx) => {
      try {
        const sys = (['world', 'local', 'geographic'].includes(item.coordinateSystem)
          ? item.coordinateSystem
          : 'world') as CoordinateSystem;
        const pipe: PipelineSegment = {
          id: generateId(),
          name: item.name || `JSON-${idx + 1}`,
          diameter: item.diameter ?? 0.5,
          start: {
            id: generateId(),
            position: item.start,
            coordinateSystem: sys,
          },
          end: {
            id: generateId(),
            position: item.end,
            coordinateSystem: sys,
          },
        };
        const rec: PipelineRecord = {
          id: generateId(),
          name: pipe.name,
          pipeline: pipe,
          coordinateSystem: sys,
          source: {
            fileName,
            rowNumber: idx + 1,
            remark: item.remark || '',
          },
          status: 'ok',
          issues: [],
          createdAt: Date.now(),
        };
        addRecord(rec);
        imported++;
      } catch {
        addAlert('warning', `第 ${idx + 1} 条数据解析失败`);
      }
    });
    addAlert('info', `JSON 导入完成，共处理 ${imported} 条`);
  };

  const runDuplicateTest = () => {
    const basePipe: PipelineSegment = {
      id: generateId(),
      name: '测试管线-T01',
      diameter: 0.6,
      start: {
        id: generateId(),
        position: { x: -50, y: -2, z: -30 },
        coordinateSystem: 'world',
      },
      end: {
        id: generateId(),
        position: { x: 50, y: -1, z: 30 },
        coordinateSystem: 'world',
      },
    };
    const rec1: PipelineRecord = {
      id: generateId(),
      name: '测试管线-T01（原始）',
      pipeline: basePipe,
      coordinateSystem: 'world',
      source: { fileName: '测试-原始.xlsx', rowNumber: 5, remark: '首次导入' },
      status: 'ok',
      issues: [],
      createdAt: Date.now(),
    };
    addRecord(rec1);

    const dupPipe: PipelineSegment = {
      id: generateId(),
      name: '测试管线-T01',
      diameter: 0.6,
      start: {
        id: generateId(),
        position: { x: -50, y: -2, z: -30 },
        coordinateSystem: 'world',
      },
      end: {
        id: generateId(),
        position: { x: 50, y: -1, z: 30 },
        coordinateSystem: 'world',
      },
    };
    const rec2: PipelineRecord = {
      id: generateId(),
      name: '测试管线-T01（重复）',
      pipeline: dupPipe,
      coordinateSystem: 'world',
      source: { fileName: '测试-副本.xlsx', rowNumber: 5, remark: '二次导入，应被检测为重复' },
      status: 'ok',
      issues: [],
      createdAt: Date.now(),
    };
    addRecord(rec2);
    addAlert('info', '重复导入测试用例已生成');
  };

  const runCoordMixedTest = () => {
    const localPipe: PipelineSegment = {
      id: generateId(),
      name: '局部坐标系管线',
      diameter: 0.5,
      start: {
        id: generateId(),
        position: { x: -20, y: -2, z: 0 },
        coordinateSystem: 'local',
      },
      end: {
        id: generateId(),
        position: { x: 30, y: -2, z: 20 },
        coordinateSystem: 'local',
      },
    };
    const rec: PipelineRecord = {
      id: generateId(),
      name: '测试-局部坐标系记录',
      pipeline: localPipe,
      coordinateSystem: 'local',
      source: { fileName: '现场测量.csv', rowNumber: 18, remark: '施工队提交，未提供转换参数' },
      status: 'ok',
      issues: [],
      createdAt: Date.now(),
    };
    addRecord(rec);

    const geoPipe: PipelineSegment = {
      id: generateId(),
      name: '地理坐标系管线',
      diameter: 0.5,
      start: {
        id: generateId(),
        position: { x: 0.01, y: -5, z: 0.02 },
        coordinateSystem: 'geographic',
      },
      end: {
        id: generateId(),
        position: { x: 0.05, y: -5, z: 0.06 },
        coordinateSystem: 'geographic',
      },
    };
    const rec2: PipelineRecord = {
      id: generateId(),
      name: '测试-地理坐标系记录',
      pipeline: geoPipe,
      coordinateSystem: 'geographic',
      source: { fileName: 'GIS导出.json', rowNumber: 2, remark: '经纬度单位，需投影转换' },
      status: 'ok',
      issues: [],
      createdAt: Date.now(),
    };
    addRecord(rec2);
    addAlert('info', '坐标系混用测试用例已生成');
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-section-title">数据导入</div>
        <div
          className="import-area"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <p>
            点击或拖拽文件至此处<br />
            <strong>支持 CSV / JSON</strong>
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <div style={{ fontSize: 11, color: '#7a8ba6', marginTop: 8, lineHeight: 1.6 }}>
          CSV 列顺序：名称, 起点X, 起点Y, 起点Z, 终点X, 终点Y, 终点Z, 直径, 坐标系(world/local/geographic), 备注
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">测试场景</div>
        <p style={{ fontSize: 11, color: '#a8c5e8', marginBottom: 10, lineHeight: 1.6 }}>
          按工程评审员复核习惯，预置两类典型测试路径，避免"看上去能跑、越跑越乱"。
        </p>
        <div className="btn-group" style={{ marginBottom: 10 }}>
          <button className="btn btn-secondary" onClick={runDuplicateTest}>
            🧪 重复导入场景
          </button>
          <button className="btn btn-secondary" onClick={runCoordMixedTest}>
            🧪 坐标系混用场景
          </button>
        </div>
        <div className="btn-group">
          <button className="btn" onClick={initDemoData}>
            📦 加载完整演示数据
          </button>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">CSV 示例</div>
        <pre
          style={{
            background: '#0a1628',
            padding: 10,
            borderRadius: 4,
            fontSize: 10,
            color: '#a8c5e8',
            overflowX: 'auto',
            lineHeight: 1.6,
            border: '1px solid #1e3a5f',
          }}
        >
{`name,startX,startY,startZ,endX,endY,endZ,diameter,coordSys,remark
海管C-01,-60,-2,-40,40,-1,20,0.6,world,设计稿v2
海管C-02,-20,-3,30,50,-2,-10,0.4,local,现场测量未转换`}
        </pre>
      </div>
    </div>
  );
}
