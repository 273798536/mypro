import type {
  Scenario,
  TideDataResponse,
  CalcResult,
  CalculateRequest,
  Report,
  ProtectionRecord,
  GateOverrideRequest,
  GateOverrideResponse,
  GateStrategyPoint,
} from "../../shared/types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  listScenarios: () =>
    get<{ scenarios: Scenario[] }>("/api/scenarios").then((r) => r.scenarios),

  getTideData: (scenarioId: string, timezone?: string) => {
    const url = timezone
      ? `/api/scenarios/${scenarioId}/tides?timezone=${encodeURIComponent(timezone)}`
      : `/api/scenarios/${scenarioId}/tides`;
    return get<TideDataResponse>(url);
  },

  getGateStrategy: (scenarioId: string, type: "correct" | "wrong") =>
    get<GateStrategyPoint[]>(`/api/scenarios/${scenarioId}/strategy/${type}`),

  applyGateOverride: (scenarioId: string, body: GateOverrideRequest) =>
    post<GateOverrideResponse>(`/api/scenarios/${scenarioId}/gate-override`, body),

  getProtectionRecords: (scenarioId: string) =>
    get<{ records: ProtectionRecord[] }>(`/api/scenarios/${scenarioId}/protection-records`).then(
      (r) => r.records
    ),

  calculate: (body: CalculateRequest) => post<CalcResult>("/api/calculate", body),

  getReport: (body: CalculateRequest) => post<Report>("/api/report", body),
};
