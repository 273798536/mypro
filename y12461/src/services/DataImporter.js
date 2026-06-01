const fs = require('fs');
const path = require('path');
const DataStore = require('./DataStore');

class DataImporter {
  constructor(dataStore) {
    this.dataStore = dataStore || new DataStore();
  }

  parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return { headers: [], data: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }
    
    return { headers, data };
  }

  parseCSVLine(line) {
    const result = [];
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
    
    return result.map(v => v.replace(/^"|"$/g, ''));
  }

  importGuaranteesFromCSV(filePath) {
    return this.importFromCSV(filePath, 'guarantee');
  }

  importCluesFromCSV(filePath) {
    return this.importFromCSV(filePath, 'clue');
  }

  importCounterGuaranteesFromCSV(filePath) {
    return this.importFromCSV(filePath, 'counterGuarantee');
  }

  importFromCSV(filePath, type) {
    const result = {
      success: true,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { headers, data } = this.parseCSV(content);
      
      result.total = data.length;

      data.forEach((row, index) => {
        const lineNumber = index + 2;
        try {
          let importResult;
          
          switch (type) {
            case 'guarantee':
              importResult = this.importGuaranteeRow(row);
              break;
            case 'clue':
              importResult = this.importClueRow(row);
              break;
            case 'counterGuarantee':
              importResult = this.importCounterGuaranteeRow(row);
              break;
            default:
              throw new Error(`未知的导入类型: ${type}`);
          }

          if (importResult.success) {
            result.imported++;
            result.details.push({
              line: lineNumber,
              status: 'success',
              action: importResult.action,
              message: this.getImportSuccessMessage(type, importResult.data)
            });
          } else {
            result.skipped++;
            result.details.push({
              line: lineNumber,
              status: 'skipped',
              errors: importResult.errors,
              message: `跳过: ${importResult.errors.join('; ')}`
            });
          }
        } catch (error) {
          result.skipped++;
          result.details.push({
            line: lineNumber,
            status: 'error',
            message: `解析错误: ${error.message}`
          });
        }
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`文件读取失败: ${error.message}`);
    }

    return result;
  }

  getImportSuccessMessage(type, data) {
    switch (type) {
      case 'guarantee':
        return `保函 ${data.guaranteeNo} - ${data.applicant} → ${data.beneficiary} (${data.amount}${data.currency})`;
      case 'clue':
        return `线索 ${data.clueNo} - ${data.projectName} [${data.riskLevel}]`;
      case 'counterGuarantee':
        return `反担保 ${data.cgNo} - ${data.provider} (${data.amount}${data.currency})`;
      default:
        return '导入成功';
    }
  }

  importGuaranteeRow(row) {
    const guaranteeData = {
      guaranteeNo: row['保函编号'] || row['guaranteeNo'] || row['id'],
      applicant: row['申请人'] || row['applicant'],
      beneficiary: row['受益人'] || row['beneficiary'],
      guaranteeType: row['保函类型'] || row['guaranteeType'] || 'bid',
      currency: row['币种'] || row['currency'] || 'CNY',
      amount: row['金额'] || row['amount'],
      issueDate: row['开立日期'] || row['issueDate'],
      expiryDate: row['到期日期'] || row['expiryDate'],
      claimExpiryDate: row['索赔到期日'] || row['claimExpiryDate'],
      projectId: row['项目ID'] || row['projectId'],
      isExpiryMissed: (row['到期漏看'] || row['isExpiryMissed']) === '是' || 
                      (row['到期漏看'] || row['isExpiryMissed']) === 'true'
    };

    if (row['反担保编号'] || row['counterGuaranteeIds']) {
      guaranteeData.counterGuaranteeIds = (row['反担保编号'] || row['counterGuaranteeIds'] || '')
        .split(';').map(s => s.trim()).filter(Boolean);
    }

    if (row['备注'] || row['remarks']) {
      guaranteeData.remarks = [{
        content: row['备注'] || row['remarks'],
        timestamp: new Date().toISOString()
      }];
    }

    return this.dataStore.saveGuarantee(guaranteeData);
  }

  importClueRow(row) {
    const clueData = {
      clueNo: row['线索编号'] || row['clueNo'] || row['id'],
      projectId: row['项目ID'] || row['projectId'],
      projectName: row['项目名称'] || row['projectName'],
      clueType: row['线索类型'] || row['clueType'],
      description: row['描述'] || row['description'],
      riskLevel: row['风险等级'] || row['riskLevel'] || 'medium',
      discoveryDate: row['发现日期'] || row['discoveryDate'],
      impactAnalysis: row['影响分析'] || row['impactAnalysis'],
      handler: row['处理人'] || row['handler']
    };

    if (row['关联保函'] || row['relatedGuaranteeIds']) {
      clueData.relatedGuaranteeIds = (row['关联保函'] || row['relatedGuaranteeIds'] || '')
        .split(';').map(s => s.trim()).filter(Boolean);
    }

    if (row['关联反担保'] || row['relatedCounterGuaranteeIds']) {
      clueData.relatedCounterGuaranteeIds = (row['关联反担保'] || row['relatedCounterGuaranteeIds'] || '')
        .split(';').map(s => s.trim()).filter(Boolean);
    }

    return this.dataStore.saveClue(clueData);
  }

  importCounterGuaranteeRow(row) {
    const cgData = {
      cgNo: row['反担保编号'] || row['cgNo'] || row['id'],
      type: row['类型'] || row['type'],
      provider: row['提供方'] || row['provider'],
      currency: row['币种'] || row['currency'] || 'CNY',
      amount: row['金额'] || row['amount'],
      coverageRatio: row['覆盖比例'] || row['coverageRatio'] || 100,
      issueDate: row['开立日期'] || row['issueDate'],
      expiryDate: row['到期日期'] || row['expiryDate'],
      valuation: row['估值'] || row['valuation'] || row['amount']
    };

    if (row['关联保函'] || row['relatedGuaranteeIds']) {
      cgData.relatedGuaranteeIds = (row['关联保函'] || row['relatedGuaranteeIds'] || '')
        .split(';').map(s => s.trim()).filter(Boolean);
    }

    if (row['关联线索'] || row['relatedClueIds']) {
      cgData.relatedClueIds = (row['关联线索'] || row['relatedClueIds'] || '')
        .split(';').map(s => s.trim()).filter(Boolean);
    }

    return this.dataStore.saveCounterGuarantee(cgData);
  }

  formatImportReport(result) {
    const lines = [];
    lines.push('=' .repeat(60));
    lines.push('📊 数据导入报告');
    lines.push('=' .repeat(60));
    lines.push(`总计: ${result.total} 条`);
    lines.push(`✅ 成功: ${result.imported} 条`);
    lines.push(`⚠️  跳过: ${result.skipped} 条`);
    lines.push('');
    
    if (result.details.length > 0) {
      lines.push('📋 详细明细:');
      lines.push('-'.repeat(60));
      result.details.forEach(detail => {
        const statusIcon = detail.status === 'success' ? '✅' : detail.status === 'skipped' ? '⚠️' : '❌';
        lines.push(`第${detail.line}行 ${statusIcon} ${detail.message}`);
      });
    }
    
    if (result.errors.length > 0) {
      lines.push('');
      lines.push('❌ 错误信息:');
      result.errors.forEach(err => lines.push(`  - ${err}`));
    }
    
    lines.push('=' .repeat(60));
    return lines.join('\n');
  }

  importFromJSON(filePath) {
    const result = {
      success: true,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (Array.isArray(data.guarantees)) {
        data.guarantees.forEach(g => {
          const r = this.dataStore.saveGuarantee(g);
          if (r.success) result.imported++;
          else result.skipped++;
          result.total++;
        });
      }
      
      if (Array.isArray(data.clues)) {
        data.clues.forEach(c => {
          const r = this.dataStore.saveClue(c);
          if (r.success) result.imported++;
          else result.skipped++;
          result.total++;
        });
      }
      
      if (Array.isArray(data.counterGuarantees)) {
        data.counterGuarantees.forEach(cg => {
          const r = this.dataStore.saveCounterGuarantee(cg);
          if (r.success) result.imported++;
          else result.skipped++;
          result.total++;
        });
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`导入失败: ${error.message}`);
    }

    return result;
  }
}

module.exports = DataImporter;
