import type { Sandbox, SandboxRun, SandboxDiff, SandboxResult, PresetVersion, PresetParameter } from '../types';
import { db } from '../db';
import { generateId, calculateObjectHash } from '../utils/hashUtils';

export async function getAllSandboxes(): Promise<Sandbox[]> {
  return (await db.sandboxes.toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSandboxById(id: string): Promise<Sandbox | undefined> {
  return db.sandboxes.get(id);
}

export async function createSandbox(name: string, path?: string): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const sandbox: Sandbox = {
    id,
    name,
    createdAt: now,
    path: path || `/sandboxes/${id}`,
    status: 'ready',
    runs: [],
  };
  await db.sandboxes.add(sandbox);
  return id;
}

export async function getSandboxRuns(sandboxId: string): Promise<SandboxRun[]> {
  return (await db.sandboxRuns.where('sandboxId').equals(sandboxId).toArray()).sort((a, b) => b.runNumber - a.runNumber);
}

export async function runSandboxTest(
  sandboxId: string,
  inputFiles: File[],
  presetVersions: PresetVersion[]
): Promise<SandboxRun> {
  const now = Date.now();
  const runs = await getSandboxRuns(sandboxId);
  const runNumber = runs.length + 1;
  const id = generateId();

  const inputFileNames = inputFiles.map(f => f.name);
  const outputFiles = inputFiles.map(f => `output_${f.name}`);

  const parameters: PresetParameter[] = [];
  for (const pv of presetVersions) {
    parameters.push(...pv.parameters);
  }

  const outputHash = calculateObjectHash({ parameters, inputFiles: inputFileNames });

  const results: SandboxResult = {
    id: generateId(),
    presetVersionId: presetVersions[0]?.id || '',
    parameters,
    outputHash,
    anomalies: [],
  };

  const run: SandboxRun = {
    id,
    sandboxId,
    runNumber,
    startTime: now,
    endTime: now + Math.random() * 5000,
    inputFiles: inputFileNames,
    outputFiles,
    results,
  };

  const previousRun = runs[runs.length - 1];
  if (previousRun) {
    run.isIdempotent = checkIdempotency(run, previousRun);
    if (!run.isIdempotent) {
      run.diffFromPrevious = calculateRunDiff(run, previousRun);
    }
  }

  await db.sandboxRuns.add(run);
  await db.sandboxes.update(sandboxId, { runs: [...runs, run] });

  return run;
}

export function checkIdempotency(currentRun: SandboxRun, previousRun: SandboxRun | undefined): boolean {
  if (!previousRun) return true;
  return currentRun.results.outputHash === previousRun.results.outputHash;
}

export function calculateRunDiff(currentRun: SandboxRun, previousRun: SandboxRun): SandboxDiff[] {
  const diffs: SandboxDiff[] = [];

  if (currentRun.results.outputHash !== previousRun.results.outputHash) {
    diffs.push({
      type: 'output_hash',
      name: '输出哈希',
      expected: previousRun.results.outputHash,
      actual: currentRun.results.outputHash,
    });
  }

  const currentParams = currentRun.results.parameters;
  const previousParams = previousRun.results.parameters;

  for (let i = 0; i < Math.max(currentParams.length, previousParams.length); i++) {
    const curr = currentParams[i];
    const prev = previousParams[i];

    if (curr && prev && curr.value !== prev.value) {
      diffs.push({
        type: 'parameter',
        name: curr.name,
        expected: prev.value.toString(),
        actual: curr.value.toString(),
      });
    }
  }

  return diffs;
}
