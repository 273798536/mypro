import type { Panel, PanelProcessed, Roof, Obstacle } from './types';
import {
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_EFFICIENCY,
  DEFAULT_PANEL_MODEL,
} from './types';

export function processPanels(panels: Panel[]): PanelProcessed[] {
  return panels.map((panel) => {
    const isMissingFields =
      panel.width === undefined ||
      panel.height === undefined ||
      panel.efficiency === undefined ||
      panel.model === undefined;

    return {
      ...panel,
      width: panel.width ?? DEFAULT_PANEL_WIDTH,
      height: panel.height ?? DEFAULT_PANEL_HEIGHT,
      efficiency: panel.efficiency ?? DEFAULT_PANEL_EFFICIENCY,
      model: panel.model ?? DEFAULT_PANEL_MODEL,
      notes: panel.notes ?? null,
      isMissingFields,
    };
  });
}

export function panelHasNotes(panel: PanelProcessed): boolean {
  return panel.notes !== null && panel.notes.trim().length > 0;
}

export function roofHasNotes(roof: Roof): boolean {
  return roof.notes !== null && roof.notes.trim().length > 0;
}

export function obstacleHasNotes(obstacle: Obstacle): boolean {
  return obstacle.notes !== null && obstacle.notes.trim().length > 0;
}

export function getMissingFieldNames(panel: Panel): string[] {
  const missing: string[] = [];
  if (panel.width === undefined) missing.push('width');
  if (panel.height === undefined) missing.push('height');
  if (panel.efficiency === undefined) missing.push('efficiency');
  if (panel.model === undefined) missing.push('model');
  return missing;
}
