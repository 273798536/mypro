import html2canvas from 'html2canvas';
import type { Scenario } from '../types';
import { exportToCSV } from './csvParser';

export async function exportChartAsPNG(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('找不到要导出的图表元素');
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function exportDataAsCSV(entries: any[], filename: string): void {
  const csv = exportToCSV(entries);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = `${filename}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportScenarioAsJSON(scenario: Scenario, filename: string): void {
  const json = JSON.stringify(scenario, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportAllScenariosAsJSON(scenarios: Scenario[], filename: string): void {
  const json = JSON.stringify(scenarios, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}