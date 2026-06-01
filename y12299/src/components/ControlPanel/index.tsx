import { WindParams } from './WindParams';
import { ViewControls } from './ViewControls';

interface ControlPanelProps {
  className?: string;
}

export function ControlPanel({ className }: ControlPanelProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <WindParams />
      <ViewControls />
    </div>
  );
}
