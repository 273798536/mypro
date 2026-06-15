export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${month}-${day} ${h}:${m}`;
}

export function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    rising: "涨潮",
    falling: "落潮",
    slack: "平潮",
    generating: "发电中",
    storing: "蓄水",
    idle: "待机",
    discarding: "弃水",
  };
  return map[phase] || phase;
}

export function phaseColor(phase: string): string {
  const map: Record<string, string> = {
    rising: "bg-ocean-400",
    falling: "bg-tide-green",
    slack: "bg-ocean-300",
    generating: "bg-tide-green",
    storing: "bg-ocean-400",
    idle: "bg-ocean-300",
    discarding: "bg-tide-danger",
  };
  return map[phase] || "bg-ocean-300";
}

export function alertColor(level: string): string {
  const map: Record<string, string> = {
    info: "border-ocean-400 bg-ocean-700/60 text-ocean-100",
    warning: "border-tide-warning bg-amber-900/50 text-amber-100",
    danger: "border-tide-danger bg-red-900/50 text-red-100",
    shutdown: "border-tide-shutdown bg-red-950/60 text-red-200",
  };
  return map[level] || map.info;
}

export function alertBadgeClass(level: string): string {
  const map: Record<string, string> = {
    info: "bg-ocean-500/30 text-ocean-200 border-ocean-400/40",
    warning: "bg-amber-600/30 text-amber-200 border-amber-400/40",
    danger: "bg-red-600/30 text-red-200 border-red-400/40",
    shutdown: "bg-red-700/40 text-red-100 border-red-500/50 animate-pulse-slow",
  };
  return map[level] || map.info;
}
