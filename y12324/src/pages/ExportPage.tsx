import React, { useState } from 'react';
import { Download, FileJson, FileText, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';
import { getErrorTypeName } from '../engine/explanationGenerator';

export const ExportPage: React.FC = () => {
  const { puzzle, errors, report, steps } = usePuzzleStore();
  const [exportFormat, setExportFormat] = useState<'json' | 'text'>('json');
  const [includeTechnical, setIncludeTechnical] = useState(true);
  const [copied, setCopied] = useState(false);

  const generateJsonExport = () => {
    const data = {
      puzzle: {
        name: puzzle.name,
        difficulty: puzzle.difficulty,
        source: puzzle.source,
        board: puzzle.board,
        initialBoard: puzzle.initialBoard,
      },
      analysis: includeTechnical
        ? {
            errorCount: errors.length,
            errors: errors.map((e) => ({
              type: getErrorTypeName(e.errorType),
              severity: e.severity,
              triggerCell: `(${e.triggerCell.row + 1}, ${e.triggerCell.col + 1})`,
              description: e.description,
            })),
          }
        : {
            errorCount: errors.length,
            summary:
              errors.length === 0
                ? '未检测到错误'
                : `检测到 ${errors.length} 个问题需要注意`,
          },
      report: report
        ? {
            summary: report.humanReadableExplanation.summary,
            whatWentWrong: report.humanReadableExplanation.whatWentWrong,
            whyItMatters: report.humanReadableExplanation.whyItMatters,
            howToFix: report.humanReadableExplanation.howToFix,
            nextSuggestions: report.nextSuggestions.map((s) => ({
              cell: `(${s.cell.row + 1}, ${s.cell.col + 1})`,
              value: s.value,
              reasoning: s.reasoning,
            })),
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  };

  const generateTextExport = () => {
    let text = `═══════════════════════════════════════\n`;
    text += `       数独步骤纠错报告\n`;
    text += `═══════════════════════════════════════\n\n`;

    text += `【题目信息】\n`;
    text += `题目名称: ${puzzle.name}\n`;
    text += `材料来源: ${puzzle.source}\n`;
    text += `难度等级: ${puzzle.difficulty}\n`;
    text += `步骤数量: ${steps.length}\n\n`;

    text += `【检测结果】\n`;
    if (errors.length === 0) {
      text += `✓ 未检测到错误，解题过程规范！\n\n`;
    } else {
      text += `⚠ 共检测到 ${errors.length} 个问题\n\n`;
      errors.forEach((error, index) => {
        text += `${index + 1}. ${getErrorTypeName(error.errorType)}\n`;
        text += `   位置: 第${error.triggerCell.row + 1}行第${error.triggerCell.col + 1}列\n`;
        text += `   说明: ${error.description}\n\n`;
      });
    }

    if (report) {
      text += `【错因分析】\n`;
      text += `${report.humanReadableExplanation.summary}\n\n`;

      text += `【哪里出错了】\n`;
      text += `${report.humanReadableExplanation.whatWentWrong}\n\n`;

      text += `【为什么重要】\n`;
      text += `${report.humanReadableExplanation.whyItMatters}\n\n`;

      text += `【如何修复】\n`;
      text += `${report.humanReadableExplanation.howToFix}\n\n`;

      if (report.nextSuggestions.length > 0) {
        text += `【下一步建议】\n`;
        report.nextSuggestions.forEach((s, index) => {
          text += `${index + 1}. 第${s.cell.row + 1}行第${s.cell.col + 1}列 → ${s.value}\n`;
          text += `   ${s.reasoning}\n`;
        });
        text += `\n`;
      }
    }

    text += `【题盘状态】\n`;
    for (let row = 0; row < 9; row++) {
      if (row > 0 && row % 3 === 0) {
        text += `------+-------+------\n`;
      }
      const rowStr = puzzle.board[row]
        .map((cell, col) => {
          const sep = col > 0 && col % 3 === 0 ? '|' : ' ';
          return sep + (cell || '.');
        })
        .join('');
      text += `${rowStr}\n`;
    }
    text += `\n`;

    text += `═══════════════════════════════════════\n`;
    text += `报告生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    text += `═══════════════════════════════════════\n`;

    return text;
  };

  const exportContent =
    exportFormat === 'json' ? generateJsonExport() : generateTextExport();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportContent], {
      type: exportFormat === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `数独纠错报告_${puzzle.name}_${new Date().toISOString().slice(0, 10)}.${
      exportFormat === 'json' ? 'json' : 'txt'
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
          报告导出与分享
        </h1>
        <p className="text-gray-600">
          选择导出格式，生成可分享的纠错报告
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Download size={18} />
                <span>导出选项</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-500" />
                      <span className="text-green-600">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>复制</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-sudoku-primary text-white rounded-md hover:bg-sudoku-dark transition-colors"
                >
                  <Download size={14} />
                  <span>下载</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">格式:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      exportFormat === 'json'
                        ? 'bg-sudoku-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FileJson size={14} />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => setExportFormat('text')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      exportFormat === 'text'
                        ? 'bg-sudoku-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FileText size={14} />
                    <span>纯文本</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIncludeTechnical(!includeTechnical)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    includeTechnical
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {includeTechnical ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>包含技术细节</span>
                </button>
                <span className="text-xs text-gray-500">
                  {includeTechnical ? '适合技术同事查看' : '适合非技术人员阅读'}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预览
                </label>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                  {exportContent}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header flex items-center space-x-2">
              <FileText size={18} />
              <span>报告摘要</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">题目</span>
                <span className="font-medium">{puzzle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">来源</span>
                <span className="font-medium text-right text-xs">
                  {puzzle.source}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">错误数</span>
                <span
                  className={`font-medium ${
                    errors.length > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {errors.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">步骤数</span>
                <span className="font-medium">{steps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">格式</span>
                <span className="font-medium uppercase">
                  {exportFormat}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">技术细节</span>
                <span className="font-medium">
                  {includeTechnical ? '包含' : '不包含'}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center space-x-2">
              <Eye size={18} />
              <span>题盘预览</span>
            </div>
            <div className="flex justify-center">
              <div className="transform scale-75 origin-top">
                <SudokuGrid showLabels={false} />
              </div>
            </div>
          </div>

          <div className="card bg-sudoku-light border-sudoku-secondary">
            <div className="font-serif-sc font-bold text-sudoku-primary mb-2">
              📤 导出提示
            </div>
            <ul className="text-xs text-sudoku-dark space-y-1.5">
              <li>• 纯文本格式适合打印或邮件分享</li>
              <li>• JSON格式适合程序处理或存档</li>
              <li>• 关闭"技术细节"可获得更简洁的报告</li>
              <li>• 报告可直接转发给学生或家长</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
