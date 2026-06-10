import { v4 as uuidv4 } from 'uuid';
import {
  Barcode,
  SampleVersion,
  LineageRelation,
  TraceNode,
  LineageGraphData,
  TracePathResult,
  NodeType,
  RelationType,
} from '@/types';
import { versionControlEngine } from './versionControlEngine';

class LineageEngine {
  buildLineageGraph(barcode: Barcode): LineageRelation[] {
    const versions = versionControlEngine.getVersionHistory(barcode);
    const relations: LineageRelation[] = [];

    for (let i = 1; i < versions.length; i++) {
      const fromVersion = versions[i - 1];
      const toVersion = versions[i];

      const changedFields = this.getChangedFields(fromVersion, toVersion);
      const relationType = this.determineRelationType(fromVersion, toVersion);

      relations.push({
        fromVersionId: fromVersion.versionId,
        toVersionId: toVersion.versionId,
        relationType,
        changedFields,
      });
    }

    return relations;
  }

  buildFullGraphData(barcode: Barcode): LineageGraphData {
    const versions = versionControlEngine.getVersionHistory(barcode);
    const relations = this.buildLineageGraph(barcode);

    const nodes = versions.map((version) => ({
      id: version.versionId,
      type: 'version' as const,
      label: `v${version.versionNumber}`,
      data: version,
      status: version.status,
    }));

    const edges = relations.map((rel) => ({
      id: `${rel.fromVersionId}-${rel.toVersionId}`,
      source: rel.fromVersionId,
      target: rel.toVersionId,
      relationType: rel.relationType,
      label: this.getRelationLabel(rel.relationType),
    }));

    return { nodes, edges };
  }

  traceForward(versionId: string): TraceNode[] {
    const version = versionControlEngine.findVersionById(versionId);
    if (!version) return [];

    const versions = versionControlEngine.getVersionHistory(version.barcode);
    const startIndex = versions.findIndex((v) => v.versionId === versionId);

    if (startIndex === -1) return [];

    const tracePath: TraceNode[] = [];
    let previousNodeId: string | null = null;

    for (let i = startIndex; i < versions.length; i++) {
      const v = versions[i];
      const nodeId = uuidv4();

      const node: TraceNode = {
        nodeId,
        nodeType: this.getNodeType(v, i === startIndex),
        timestamp: v.createdAt,
        operatorId: v.createdBy,
        dataSnapshot: {
          versionId: v.versionId,
          barcode: v.barcode,
          sequencingResult: v.sequencingResult,
          groupIndicators: v.groupIndicators,
          manualCorrections: v.manualCorrections,
        },
        sourceOriginId: v.sourceOrigin.id,
        previousNodeId,
        nextNodeId: null,
      };

      if (previousNodeId && tracePath.length > 0) {
        tracePath[tracePath.length - 1].nextNodeId = nodeId;
      }

      tracePath.push(node);
      previousNodeId = nodeId;
    }

    return tracePath;
  }

  traceBackward(versionId: string): TraceNode[] {
    const version = versionControlEngine.findVersionById(versionId);
    if (!version) return [];

    const versions = versionControlEngine.getVersionHistory(version.barcode);
    const endIndex = versions.findIndex((v) => v.versionId === versionId);

    if (endIndex === -1) return [];

    const tracePath: TraceNode[] = [];
    let nextNodeId: string | null = null;

    for (let i = endIndex; i >= 0; i--) {
      const v = versions[i];
      const nodeId = uuidv4();

      const node: TraceNode = {
        nodeId,
        nodeType: this.getNodeType(v, i === endIndex),
        timestamp: v.createdAt,
        operatorId: v.createdBy,
        dataSnapshot: {
          versionId: v.versionId,
          barcode: v.barcode,
          sequencingResult: v.sequencingResult,
          groupIndicators: v.groupIndicators,
          manualCorrections: v.manualCorrections,
        },
        sourceOriginId: v.sourceOrigin.id,
        previousNodeId: null,
        nextNodeId,
      };

      if (nextNodeId && tracePath.length > 0) {
        tracePath[0].previousNodeId = nodeId;
      }

      tracePath.unshift(node);
      nextNodeId = nodeId;
    }

    return tracePath;
  }

  getFullTracePath(conclusionId: string, conclusion: any, versions: SampleVersion[]): TracePathResult {
    const conclusionVersion = versions.find(
      (v) => v.barcode === conclusion.barcode && v.status === 'confirmed'
    );

    if (!conclusionVersion) {
      return {
        conclusionId,
        barcode: conclusion.barcode,
        nodes: [],
        totalSteps: 0,
        timeSpan: { start: 0, end: 0 },
        operators: [],
      };
    }

    const allVersions = versionControlEngine.getVersionHistory(conclusion.barcode);
    const nodes = this.traceBackward(conclusionVersion.versionId);

    const finalNode: TraceNode = {
      nodeId: uuidv4(),
      nodeType: 'conclusion',
      timestamp: conclusion.confirmedAt,
      operatorId: conclusion.confirmedBy,
      dataSnapshot: {
        conclusionId: conclusion.conclusionId,
        finalResult: conclusion.finalResult,
        conclusion: conclusion.conclusion,
      },
      sourceOriginId: conclusionVersion.sourceOrigin.id,
      previousNodeId: nodes[nodes.length - 1]?.nodeId || null,
      nextNodeId: null,
      conclusionId: conclusion.conclusionId,
    };

    if (nodes.length > 0) {
      nodes[nodes.length - 1].nextNodeId = finalNode.nodeId;
    }

    nodes.push(finalNode);

    const timestamps = nodes.map((n) => n.timestamp);
    const operators = [...new Set(nodes.map((n) => n.operatorId))];

    return {
      conclusionId,
      barcode: conclusion.barcode,
      nodes,
      totalSteps: nodes.length,
      timeSpan: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
      },
      operators,
    };
  }

  private getChangedFields(from: SampleVersion, to: SampleVersion): string[] {
    const fields: string[] = [];

    if (from.sequencingResult.geneName !== to.sequencingResult.geneName) {
      fields.push('sequencingResult.geneName');
    }
    if (from.sequencingResult.variant !== to.sequencingResult.variant) {
      fields.push('sequencingResult.variant');
    }
    if (from.sequencingResult.interpretation !== to.sequencingResult.interpretation) {
      fields.push('sequencingResult.interpretation');
    }
    if (to.manualCorrections.length > from.manualCorrections.length) {
      fields.push('manualCorrections');
    }
    if (from.status !== to.status) {
      fields.push('status');
    }

    return fields;
  }

  private determineRelationType(from: SampleVersion, to: SampleVersion): RelationType {
    if (to.manualCorrections.length > from.manualCorrections.length) {
      return 'correction';
    }
    if (to.isDuplicate && !from.isDuplicate) {
      return 'merge';
    }
    if (to.changeReason?.includes('补录')) {
      return 'supplement';
    }
    if (to.sourceOrigin.importBatchId !== from.sourceOrigin.importBatchId) {
      return 'reimport';
    }
    return 'correction';
  }

  private getNodeType(version: SampleVersion, isStartingPoint: boolean): NodeType {
    if (isStartingPoint) {
      return 'import';
    }
    if (version.aiAnalysis) {
      return 'ai_analysis';
    }
    if (version.manualCorrections.length > 0) {
      return 'manual_correction';
    }
    if (version.status === 'reviewing') {
      return 'review';
    }
    return 'manual_correction';
  }

  private getRelationLabel(type: RelationType): string {
    const labels: Record<RelationType, string> = {
      correction: '修正',
      reimport: '重新导入',
      supplement: '补录',
      merge: '合并重复',
    };
    return labels[type];
  }
}

export const lineageEngine = new LineageEngine();
