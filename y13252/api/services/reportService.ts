import type { Complaint, Photo, ChangeRecord } from '../../shared/types.js';
import { calculateDistance, formatOffsetInfo } from './coordinateService.js';
import { formatNameMismatchInfo } from './nameCheckService.js';

export function generateMarkdownReport(complaint: Complaint, reportVersion: number): string {
  const now = new Date().toLocaleString('zh-CN');
  const nameMismatchPhotos = complaint.photos.filter(p => p.isNameMismatch);
  const offsetPhotos = complaint.photos.filter(p => {
    const dist = calculateDistance(complaint.latitude, complaint.longitude, p.latitude, p.longitude);
    return dist > 50;
  });

  let report = `# 夜市外摆投诉处理报告

**报告编号**: ${complaint.id}  
**报告版本**: v${reportVersion}  
**生成时间**: ${now}  
**投诉标题**: ${complaint.title}  
**投诉地址**: ${complaint.address}  
**当前状态**: ${getStatusText(complaint.status)}  
**坐标偏移**: ${complaint.hasCoordinateOffset ? `是（最大偏移${complaint.offsetDistance}米）` : '否'}  

---

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 投诉编号 | ${complaint.id} |
| 投诉地址 | ${complaint.address} |
| 投诉坐标 | (${complaint.latitude.toFixed(6)}, ${complaint.longitude.toFixed(6)}) |
| 创建时间 | ${new Date(complaint.createdAt).toLocaleString('zh-CN')} |
| 更新时间 | ${new Date(complaint.updatedAt).toLocaleString('zh-CN')} |
| 巡检照片数 | ${complaint.photos.length}张 |

---

## 二、巡检照片清单

${complaint.photos.map((photo, index) => renderPhotoItem(photo, index + 1, complaint)).join('\n\n')}

---

## 三、问题检测结果

### 3.1 名称不一致检测

${nameMismatchPhotos.length > 0 ? `**检测到 ${nameMismatchPhotos.length} 张照片名称不一致：**

${nameMismatchPhotos.map(p => `- ${formatNameMismatchInfo(p)}`).join('\n')}
` : '✅ 所有照片名称一致，未检测到异常。'}

### 3.2 坐标偏移检测

${offsetPhotos.length > 0 ? `**检测到 ${offsetPhotos.length} 张照片坐标偏移：**

${offsetPhotos.map(p => {
  const dist = calculateDistance(complaint.latitude, complaint.longitude, p.latitude, p.longitude);
  return `- ${formatOffsetInfo(p, complaint.address, dist)}`;
}).join('\n')}
` : '✅ 所有照片坐标在合理范围内，未检测到异常。'}

---

## 四、变更历史记录

${complaint.changeHistory.length > 0 ? `
| 序号 | 时间 | 操作类型 | 变更说明 | 修改前 | 修改后 |
|------|------|----------|----------|--------|--------|
${complaint.changeHistory.map((record, index) => `| ${index + 1} | ${new Date(record.timestamp).toLocaleString('zh-CN')} | ${getChangeTypeText(record.type)} | ${record.description} | ${record.beforeValue || '-'} | ${record.afterValue || '-'} |`).join('\n')}
` : '暂无变更记录。'}

---

## 五、处理建议

${renderRecommendations(complaint)}

---

*报告由夜市外摆投诉回放系统自动生成*
`;

  return report;
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已完成'
  };
  return map[status] || status;
}

function getChangeTypeText(type: string): string {
  const map: Record<string, string> = {
    photo_add: '补录照片',
    coordinate_fix: '坐标修正',
    status_update: '状态更新',
    rerun: '重跑校验'
  };
  return map[type] || type;
}

function renderPhotoItem(photo: Photo, index: number, complaint: Complaint): string {
  const distance = calculateDistance(complaint.latitude, complaint.longitude, photo.latitude, photo.longitude);
  const hasOffset = distance > 50;
  
  let tags = '';
  if (photo.isNameMismatch) {
    tags += '🔴 **名称不一致** ';
  }
  if (hasOffset) {
    tags += '🟠 **坐标偏移** ';
  }

  return `### 照片 ${index} ${tags}

- **原始文件名**: \`${photo.originalName}\`
- **系统重命名**: \`${photo.systemName}\`
- **拍摄地址**: ${photo.address}
- **拍摄坐标**: (${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)})
- **拍摄时间**: ${new Date(photo.takenAt).toLocaleString('zh-CN')}
- **与投诉点距离**: ${Math.round(distance)}米 ${hasOffset ? '(⚠️ 超出合理范围)' : ''}
- **数据来源**: ${photo.source}

${photo.isNameMismatch ? `> ⚠️ ${formatNameMismatchInfo(photo)}` : ''}
${hasOffset ? `> ⚠️ ${formatOffsetInfo(photo, complaint.address, distance)}` : ''}`;
}

function renderRecommendations(complaint: Complaint): string {
  const recommendations: string[] = [];
  const nameMismatchCount = complaint.photos.filter(p => p.isNameMismatch).length;
  const offsetCount = complaint.photos.filter(p => {
    const dist = calculateDistance(complaint.latitude, complaint.longitude, p.latitude, p.longitude);
    return dist > 50;
  }).length;

  if (nameMismatchCount > 0) {
    recommendations.push(`1. 针对 ${nameMismatchCount} 张名称不一致的照片，建议核实原始拍摄地点，统一早晚高峰巡检口径。`);
  }
  if (offsetCount > 0) {
    recommendations.push(`2. 针对 ${offsetCount} 张坐标偏移的照片，建议重新拍摄或修正坐标信息，确保定位准确。`);
  }
  if (complaint.status === 'pending') {
    recommendations.push('3. 建议尽快安排人员现场核实，更新处理状态。');
  }
  if (complaint.changeHistory.length > 0) {
    const lastChange = complaint.changeHistory[complaint.changeHistory.length - 1];
    recommendations.push(`4. 最近一次变更：${lastChange.description}（${new Date(lastChange.timestamp).toLocaleString('zh-CN')}）`);
  }

  if (recommendations.length === 0) {
    recommendations.push('1. 投诉处理完毕，所有数据校验通过，可归档。');
  }

  return recommendations.join('\n\n');
}
