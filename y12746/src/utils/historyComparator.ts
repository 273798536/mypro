import { Batch, ConstraintResult, HistoryDiff } from "@/types";

export function compareBatches(oldBatch: Batch, newBatch: Batch): HistoryDiff[] {
  const oldConstraints = oldBatch.constraints ?? [];
  const newConstraints = newBatch.constraints ?? [];
  const diffs: HistoryDiff[] = [];

  const allNames = Array.from(new Set([
    ...oldConstraints.map((c) => c.constraintName),
    ...newConstraints.map((c) => c.constraintName),
  ]));

  for (const name of allNames) {
    const oldC = oldConstraints.find((c) => c.constraintName === name) as ConstraintResult | undefined;
    const newC = newConstraints.find((c) => c.constraintName === name) as ConstraintResult | undefined;
    diffs.push({
      constraintName: name,
      oldPassed: oldC?.passed ?? false,
      newPassed: newC?.passed ?? false,
      oldValue: oldC?.value ?? 0,
      newValue: newC?.value ?? 0,
      changed: (oldC?.passed ?? false) !== (newC?.passed ?? false),
    });
  }

  return diffs;
}
