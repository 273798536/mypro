import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, RefreshCw, CheckCheck, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculationStore } from '../store/useCalculationStore';
import ConflictList from '../components/conflict/ConflictList';
import { formatDate } from '../utils/formatters';

export default function ConflictDetection() {
  const navigate = useNavigate();
  const { currentCalculation, detectAndSetConflicts, autoResolveAllConflicts } = useCalculationStore();

  if (!currentCalculation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">当前没有选中的项目</h3>
            <p className="text-slate-500">请先选择或创建一个分析项目</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unresolvedConflicts = currentCalculation.conflicts.filter(c => !c.resolved).length;
  const resolvedConflicts = currentCalculation.conflicts.filter(c => c.resolved).length;

  const handleDetectConflicts = () => {
    detectAndSetConflicts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">冲突检测</h1>
          <p className="text-slate-500 mt-1">
            项目：{currentCalculation.name} · 更新于 {formatDate(currentCalculation.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleDetectConflicts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重新检测
          </Button>
          <Button
            onClick={() => navigate('/validation')}
            disabled={unresolvedConflicts > 0}
          >
            下一步：数据校验
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700">待处理冲突</p>
              <p className="text-3xl font-bold text-amber-800">{unresolvedConflicts}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">已解决冲突</p>
              <p className="text-3xl font-bold text-emerald-800">{resolvedConflicts}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <Settings className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">冲突总数</p>
              <p className="text-3xl font-bold text-slate-800">{currentCalculation.conflicts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentCalculation.conflicts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCheck className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">数据一致，未检测到冲突</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              墙体构造数据与材料库数据完全一致，无需人工裁决。可以继续下一步进行数据校验。
            </p>
            <Button onClick={() => navigate('/validation')}>
              继续：数据校验
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  数据冲突列表
                </CardTitle>
                <CardDescription>
                  墙体构造与材料库数据存在差异，请人工裁决使用哪一方的数据
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  构造维护人：{currentCalculation.wallConstruction.maintainedBy}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  材料维护人：{currentCalculation.materialLibrary.maintainedBy}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => autoResolveAllConflicts('prefer_construction')}
                  className="ml-2"
                >
                  全部采用构造值
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => autoResolveAllConflicts('prefer_material')}
                >
                  全部采用材料值
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ConflictList
                conflicts={currentCalculation.conflicts}
                onResolve={(conflictId, choice, customValue) => {
                  useCalculationStore.getState().resolveDataConflict(conflictId, choice, customValue);
                }}
              />
            </CardContent>
          </Card>

          <Card className={unresolvedConflicts > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {unresolvedConflicts > 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">还有 {unresolvedConflicts} 个冲突待处理</p>
                      <p className="text-sm text-amber-700">请解决所有冲突后才能继续下一步</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-900">所有冲突已解决</p>
                      <p className="text-sm text-emerald-700">可以继续进行数据校验</p>
                    </div>
                  </>
                )}
              </div>
              <Button
                onClick={() => navigate('/validation')}
                disabled={unresolvedConflicts > 0}
                variant={unresolvedConflicts > 0 ? 'secondary' : 'success'}
              >
                下一步：数据校验
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
