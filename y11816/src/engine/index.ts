import type {
  RedemptionRecord,
  TicketCode,
  ChannelContract,
  DeduplicationResult,
  DuplicateRecord,
  AnomalyRecord,
  AnomalyDetectionResult,
  ChannelAllocation,
  AllocationResult,
  ChangeTrackingResult,
  AffectedRecord,
  DeduplicationReview,
  ConsistencyCheckResult,
  InconsistencyRecord,
  InconsistencyTrace,
  TraceStep,
} from "@/types";
import { generateId, formatAnomalyType, formatAnomalyStatus } from "@/utils/helpers";

export class DeduplicationEngine {
  static run(records: RedemptionRecord[]): DeduplicationResult {
    const codeMap = new Map<string, RedemptionRecord[]>();

    records.forEach((record) => {
      const existing = codeMap.get(record.ticketCode) || [];
      existing.push(record);
      codeMap.set(record.ticketCode, existing);
    });

    const duplicates: DuplicateRecord[] = [];
    let uniqueCount = 0;

    codeMap.forEach((recordList, code) => {
      if (recordList.length > 1) {
        const sorted = [...recordList].sort((a, b) => a.redemptionTime - b.redemptionTime);
        const keptRecord = sorted[0];
        const discardedRecords = sorted.slice(1);

        duplicates.push({
          ticketCode: code,
          records: sorted,
          keptRecord,
          discardedRecords,
          reason: `同一券码共核销 ${recordList.length} 次，保留最早核销记录`,
        });
      } else {
        uniqueCount++;
      }
    });

    return {
      totalCodes: records.length,
      uniqueCodes: uniqueCount + duplicates.length,
      duplicateCount: duplicates.length,
      duplicates,
    };
  }

  static getReview(ticketCode: string, records: RedemptionRecord[]): DeduplicationReview | null {
    const codeRecords = records.filter((r) => r.ticketCode === ticketCode);
    if (codeRecords.length < 2) return null;

    const sorted = [...codeRecords].sort((a, b) => a.redemptionTime - b.redemptionTime);

    return {
      ticketCode,
      allRedemptions: sorted,
      dedupDecision: `共 ${sorted.length} 条核销记录，保留最早一条（${new Date(sorted[0].redemptionTime).toLocaleString()}），其余 ${sorted.length - 1} 条标记为重复`,
      keptRecord: sorted[0],
      discardedRecords: sorted.slice(1),
      decisionTime: Date.now(),
    };
  }
}

export class AnomalyDetectionEngine {
  static run(
    records: RedemptionRecord[],
    ticketCodes: TicketCode[],
    contracts: ChannelContract[],
    batchId: string
  ): AnomalyDetectionResult {
    const anomalies: AnomalyRecord[] = [];

    anomalies.push(...this.detectDuplicateRedemption(records, batchId));
    anomalies.push(...this.detectCrossCinema(records, ticketCodes, batchId));
    anomalies.push(...this.detectFeeVersionMismatch(records, contracts, batchId));

    const byType = {
      duplicate_redemption: anomalies.filter((a) => a.type === "duplicate_redemption").length,
      cross_cinema: anomalies.filter((a) => a.type === "cross_cinema").length,
      fee_version_mismatch: anomalies.filter((a) => a.type === "fee_version_mismatch").length,
    };

    return {
      anomalies,
      byType,
      totalCount: anomalies.length,
      pendingCount: anomalies.filter((a) => a.status === "pending").length,
    };
  }

  private static detectDuplicateRedemption(records: RedemptionRecord[], batchId: string): AnomalyRecord[] {
    const codeMap = new Map<string, RedemptionRecord[]>();

    records.forEach((record) => {
      const existing = codeMap.get(record.ticketCode) || [];
      existing.push(record);
      codeMap.set(record.ticketCode, existing);
    });

    const anomalies: AnomalyRecord[] = [];

    codeMap.forEach((recordList, code) => {
      if (recordList.length > 1) {
        const sorted = [...recordList].sort((a, b) => a.redemptionTime - b.redemptionTime);
        const first = sorted[0];
        const times = sorted.map((r) => new Date(r.redemptionTime).toLocaleString()).join("、");

        anomalies.push({
          id: generateId("ANOM-"),
          batchId,
          type: "duplicate_redemption",
          typeLabel: formatAnomalyType("duplicate_redemption"),
          ticketCode: code,
          cinemaId: first.cinemaId,
          cinemaName: first.cinemaName,
          details: `同一券码在 ${new Date(first.redemptionTime).toLocaleDateString()} 内核销 ${recordList.length} 次，核销时间：${times}`,
          severity: "high",
          status: "pending",
          statusLabel: formatAnomalyStatus("pending"),
          channelId: first.channelId,
          channelName: first.channelName,
          redemptionIds: sorted.map((r) => r.id),
        });
      }
    });

    return anomalies;
  }

  private static detectCrossCinema(
    records: RedemptionRecord[],
    ticketCodes: TicketCode[],
    batchId: string
  ): AnomalyRecord[] {
    const ticketMap = new Map(ticketCodes.map((t) => [t.code, t]));
    const anomalies: AnomalyRecord[] = [];

    records.forEach((record) => {
      const ticket = ticketMap.get(record.ticketCode);
      if (ticket && ticket.cinemaId !== record.cinemaId) {
        anomalies.push({
          id: generateId("ANOM-"),
          batchId,
          type: "cross_cinema",
          typeLabel: formatAnomalyType("cross_cinema"),
          ticketCode: record.ticketCode,
          cinemaId: record.cinemaId,
          cinemaName: record.cinemaName,
          details: `券码所属影院为 ${ticket.cinemaName}（${ticket.cinemaId}），但实际在 ${record.cinemaName}（${record.cinemaId}）核销`,
          severity: "high",
          status: "pending",
          statusLabel: formatAnomalyStatus("pending"),
          channelId: record.channelId,
          channelName: record.channelName,
          redemptionIds: [record.id],
        });
      }
    });

    return anomalies;
  }

  private static detectFeeVersionMismatch(
    records: RedemptionRecord[],
    contracts: ChannelContract[],
    batchId: string
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];

    records.forEach((record) => {
      const channelContracts = contracts
        .filter((c) => c.channelId === record.channelId)
        .sort((a, b) => b.validFrom - a.validFrom);

      if (channelContracts.length === 0) return;

      const applicableContract = channelContracts.find(
        (c) => record.redemptionTime >= c.validFrom && record.redemptionTime <= c.validTo
      );

      const latestContract = channelContracts[0];

      if (applicableContract && applicableContract.feeVersion !== latestContract.feeVersion) {
        if (record.redemptionTime >= latestContract.validFrom) {
          anomalies.push({
            id: generateId("ANOM-"),
            batchId,
            type: "fee_version_mismatch",
            typeLabel: formatAnomalyType("fee_version_mismatch"),
            ticketCode: record.ticketCode,
            cinemaId: record.cinemaId,
            cinemaName: record.cinemaName,
            details: `核销时间（${new Date(record.redemptionTime).toLocaleDateString()}）在新版合同（${latestContract.feeVersion}，费率 ${(latestContract.serviceFeeRate * 100).toFixed(1)}%）生效后，但可能误用旧版（${applicableContract.feeVersion}，费率 ${(applicableContract.serviceFeeRate * 100).toFixed(1)}%）`,
            severity: "medium",
            status: "pending",
            statusLabel: formatAnomalyStatus("pending"),
            channelId: record.channelId,
            channelName: record.channelName,
            redemptionIds: [record.id],
            expectedFeeVersion: latestContract.feeVersion,
            actualFeeVersion: applicableContract.feeVersion,
          });
        }
      }
    });

    return anomalies;
  }
}

export class AllocationEngine {
  static run(
    records: RedemptionRecord[],
    contracts: ChannelContract[],
    anomalies: AnomalyRecord[],
    batchId: string
  ): AllocationResult {
    const confirmedAnomalyIds = new Set(
      anomalies.filter((a) => a.status === "confirmed").flatMap((a) => a.redemptionIds || [])
    );

    const validRecords = records.filter((r) => !confirmedAnomalyIds.has(r.id));

    const channelMap = new Map<string, { records: RedemptionRecord[]; contract: ChannelContract | null }>();

    validRecords.forEach((record) => {
      const existing = channelMap.get(record.channelId) || { records: [], contract: null };
      existing.records.push(record);
      channelMap.set(record.channelId, existing);
    });

    contracts.forEach((contract) => {
      const existing = channelMap.get(contract.channelId);
      if (existing) {
        if (!existing.contract || contract.validFrom > existing.contract.validFrom) {
          existing.contract = contract;
        }
      }
    });

    const allocations: ChannelAllocation[] = [];
    let totalAmount = 0;
    let totalServiceFee = 0;
    let totalNetAmount = 0;
    let totalTicketCount = 0;

    channelMap.forEach(({ records: channelRecords, contract }, channelId) => {
      const channelAmount = channelRecords.reduce((sum, r) => sum + r.amount, 0);
      const feeRate = contract?.serviceFeeRate || 0;
      const serviceFee = Math.round(channelAmount * feeRate * 100) / 100;
      const netAmount = Math.round((channelAmount - serviceFee) * 100) / 100;

      allocations.push({
        id: generateId("ALLOC-"),
        batchId,
        channelId,
        channelName: channelRecords[0]?.channelName || contract?.channelName || channelId,
        totalAmount: channelAmount,
        serviceFeeRate: feeRate,
        serviceFee,
        netAmount,
        feeVersion: contract?.feeVersion || "未知",
        ticketCount: channelRecords.length,
        calculationFormula: `总金额 ${channelAmount} × 费率 ${(feeRate * 100).toFixed(1)}% = 服务费 ${serviceFee}`,
      });

      totalAmount += channelAmount;
      totalServiceFee += serviceFee;
      totalNetAmount += netAmount;
      totalTicketCount += channelRecords.length;
    });

    return {
      channelAllocations: allocations,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalServiceFee: Math.round(totalServiceFee * 100) / 100,
      totalNetAmount: Math.round(totalNetAmount * 100) / 100,
      totalTicketCount,
    };
  }

  static checkConsistency(
    allocationResult: AllocationResult,
    contracts: ChannelContract[],
    records: RedemptionRecord[],
    batchId: string
  ): ConsistencyCheckResult {
    const inconsistencies: InconsistencyRecord[] = [];

    allocationResult.channelAllocations.forEach((allocation) => {
      const channelRecords = records.filter((r) => r.channelId === allocation.channelId);
      const channelContracts = contracts
        .filter((c) => c.channelId === allocation.channelId)
        .sort((a, b) => b.validFrom - a.validFrom);

      if (channelContracts.length === 0) return;

      let expectedTotalFee = 0;
      channelRecords.forEach((record) => {
        const applicableContract = channelContracts.find(
          (c) => record.redemptionTime >= c.validFrom && record.redemptionTime <= c.validTo
        );
        if (applicableContract) {
          expectedTotalFee += record.amount * applicableContract.serviceFeeRate;
        }
      });

      expectedTotalFee = Math.round(expectedTotalFee * 100) / 100;
      const difference = Math.round((allocation.serviceFee - expectedTotalFee) * 100) / 100;

      if (Math.abs(difference) > 0.01) {
        inconsistencies.push({
          id: generateId("INCONS-"),
          batchId,
          type: "fee_mismatch",
          channelId: allocation.channelId,
          channelName: allocation.channelName,
          allocationValue: allocation.serviceFee,
          reportValue: expectedTotalFee,
          difference,
          rootCause: `合同版本差异：当前分摊使用 ${allocation.feeVersion} 版本费率 ${(allocation.serviceFeeRate * 100).toFixed(1)}%，但逐笔匹配合同后应结算 ${expectedTotalFee.toFixed(2)}，差额 ${difference.toFixed(2)}`,
        });
      }
    });

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      checkTime: Date.now(),
    };
  }

  static traceInconsistency(
    inconsistency: InconsistencyRecord,
    records: RedemptionRecord[],
    contracts: ChannelContract[]
  ): InconsistencyTrace {
    const channelRecords = records.filter((r) => r.channelId === inconsistency.channelId);
    const channelContracts = contracts
      .filter((c) => c.channelId === inconsistency.channelId)
      .sort((a, b) => b.validFrom - a.validFrom);

    const chain: TraceStep[] = [];

    channelRecords.forEach((record, index) => {
      const applicableContract = channelContracts.find(
        (c) => record.redemptionTime >= c.validFrom && record.redemptionTime <= c.validTo
      );

      const usedContract = channelContracts[0];

      if (applicableContract && usedContract && applicableContract.id !== usedContract.id) {
        const expectedFee = record.amount * applicableContract.serviceFeeRate;
        const actualFee = record.amount * usedContract.serviceFeeRate;

        chain.push({
          step: `第 ${index + 1} 笔：券码 ${record.ticketCode}`,
          value: Math.round(actualFee * 100) / 100,
          expected: Math.round(expectedFee * 100) / 100,
          source: `核销时间 ${new Date(record.redemptionTime).toLocaleDateString()}，适用合同 ${applicableContract.feeVersion}（${(applicableContract.serviceFeeRate * 100).toFixed(1)}%），实际使用 ${usedContract.feeVersion}（${(usedContract.serviceFeeRate * 100).toFixed(1)}%）`,
          timestamp: record.redemptionTime,
        });
      }
    });

    return {
      recordId: inconsistency.id,
      chain,
      rootCause: inconsistency.rootCause,
      affectedContracts: channelContracts.map((c) => c.id),
    };
  }
}

export class ChangeTrackingEngine {
  static compare(
    oldRecords: RedemptionRecord[],
    newRecords: RedemptionRecord[],
    oldAllocations: ChannelAllocation[] | null,
    newAllocations: ChannelAllocation[] | null
  ): ChangeTrackingResult {
    const oldMap = new Map(oldRecords.map((r) => [r.id, r]));
    const newMap = new Map(newRecords.map((r) => [r.id, r]));

    const affectedRecords: AffectedRecord[] = [];

    oldRecords.forEach((oldRecord) => {
      const newRecord = newMap.get(oldRecord.id);
      if (!newRecord) {
        affectedRecords.push({
          id: oldRecord.id,
          ticketCode: oldRecord.ticketCode,
          changeType: "removed",
          changedFields: ["*"],
          oldValues: { ...oldRecord },
          newValues: {},
          impact: `记录已删除，影响渠道 ${oldRecord.channelName} 结算金额 ${oldRecord.amount}`,
        });
      }
    });

    newRecords.forEach((newRecord) => {
      const oldRecord = oldMap.get(newRecord.id);
      if (!oldRecord) {
        affectedRecords.push({
          id: newRecord.id,
          ticketCode: newRecord.ticketCode,
          changeType: "added",
          changedFields: ["*"],
          oldValues: {},
          newValues: { ...newRecord },
          impact: `新增记录，影响渠道 ${newRecord.channelName} 结算金额 ${newRecord.amount}`,
        });
      } else {
        const changedFields: string[] = [];
        const oldValues: Record<string, unknown> = {};
        const newValues: Record<string, unknown> = {};

        (Object.keys(newRecord) as Array<keyof RedemptionRecord>).forEach((key) => {
          if (oldRecord[key] !== newRecord[key]) {
            changedFields.push(key);
            oldValues[key] = oldRecord[key];
            newValues[key] = newRecord[key];
          }
        });

        if (changedFields.length > 0) {
          let impact = `字段变更：${changedFields.join("、")}`;
          if (changedFields.includes("amount") || changedFields.includes("channelId")) {
            impact += `，可能影响结算金额`;
          }
          if (changedFields.includes("cinemaId")) {
            impact += `，可能触发跨影院异常`;
          }
          affectedRecords.push({
            id: newRecord.id,
            ticketCode: newRecord.ticketCode,
            changeType: "modified",
            changedFields,
            oldValues,
            newValues,
            impact,
          });
        }
      }
    });

    if (oldAllocations && newAllocations) {
      const oldAllocMap = new Map(oldAllocations.map((a) => [a.channelId, a]));
      newAllocations.forEach((newAlloc) => {
        const oldAlloc = oldAllocMap.get(newAlloc.channelId);
        if (oldAlloc && Math.abs(oldAlloc.serviceFee - newAlloc.serviceFee) > 0.01) {
          const relevantRecords = affectedRecords.filter((r) => {
            const rec = r.changeType === "removed" ? (r.oldValues as unknown as RedemptionRecord) : (r.newValues as unknown as RedemptionRecord);
            return rec.channelId === newAlloc.channelId;
          });

          if (relevantRecords.length > 0) {
            relevantRecords.forEach((r) => {
              r.impact += `；导致 ${newAlloc.channelName} 服务费从 ${oldAlloc.serviceFee} 变为 ${newAlloc.serviceFee}（差额 ${(newAlloc.serviceFee - oldAlloc.serviceFee).toFixed(2)}）`;
            });
          }
        }
      });
    }

    return {
      affectedRecords,
      summary: {
        added: affectedRecords.filter((r) => r.changeType === "added").length,
        removed: affectedRecords.filter((r) => r.changeType === "removed").length,
        modified: affectedRecords.filter((r) => r.changeType === "modified").length,
      },
      totalImpact: affectedRecords.length,
    };
  }
}
