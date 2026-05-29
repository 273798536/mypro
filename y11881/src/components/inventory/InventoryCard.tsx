import { motion } from 'framer-motion';
import { Edit3 } from 'lucide-react';
import { useState } from 'react';
import { Denomination, Inventory, InventoryStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface InventoryCardProps {
  denomination: Denomination;
  inventory: Inventory;
  onUpdate: (quantity: number) => void;
}

export function InventoryCard({ denomination, inventory, onUpdate }: InventoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(inventory.quantity.toString());

  const getStatus = (): InventoryStatus => {
    if (inventory.quantity <= denomination.criticalThreshold) return 'critical';
    if (inventory.quantity <= denomination.warningThreshold) return 'warning';
    return 'normal';
  };

  const status = getStatus();

  const getBadgeVariant = () => {
    switch (status) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getProgressVariant = () => {
    switch (status) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'critical':
        return '库存紧急';
      case 'warning':
        return '库存偏低';
      default:
        return '库存充足';
    }
  };

  const handleSave = () => {
    const newQty = parseInt(editValue, 10);
    if (!isNaN(newQty) && newQty >= 0) {
      onUpdate(newQty);
    }
    setIsEditing(false);
  };

  const healthPercentage = Math.min(
    100,
    (inventory.quantity / (denomination.warningThreshold * 2)) * 100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full">
        <Card.Body className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-slate-800">
                ¥{denomination.value}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                {denomination.name}
              </div>
            </div>
            <Badge variant={getBadgeVariant()} pulse={status === 'critical'}>
              {getStatusText()}
            </Badge>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                min="0"
                label="库存数量"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={handleSave} className="flex-1">
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditValue(inventory.quantity.toString());
                    setIsEditing(false);
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900 font-mono">
                  {inventory.quantity}
                </span>
                <span className="text-gray-500">张/枚</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="ml-auto p-2 text-gray-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <Progress
                value={healthPercentage}
                variant={getProgressVariant()}
                label="库存健康度"
                showLabel
              />

              <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-gray-500">预警线</div>
                  <div className="font-semibold text-amber-600">
                    {denomination.warningThreshold}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-gray-500">临界线</div>
                  <div className="font-semibold text-red-600">
                    {denomination.criticalThreshold}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </motion.div>
  );
}
