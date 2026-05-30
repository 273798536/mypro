import MaterialTrace from '@/components/MaterialTrace';
import SensitivityPanel from '@/components/SensitivityPanel';

export default function Diagnostics() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <MaterialTrace />
      <SensitivityPanel />
    </div>
  );
}
