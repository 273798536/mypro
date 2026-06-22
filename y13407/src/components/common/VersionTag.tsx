import { versionColorDot } from '../../utils/formatters';

interface VersionTagProps {
  version: string;
  notation?: string;
  showDot?: boolean;
}

export function VersionTag({ version, notation, showDot = true }: VersionTagProps) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-700">
      {showDot && <span className={`w-2 h-2 rounded-full ${versionColorDot(version)}`} />}
      <span className="font-semibold">{version}</span>
      {notation && (
        <span className="text-ink-500 text-[11px] px-1.5 py-px bg-ink-100 border border-ink-200">
          {notation}
        </span>
      )}
    </span>
  );
}
