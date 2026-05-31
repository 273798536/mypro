import { useNavigate } from 'react-router-dom';
import { CheckSquare, ArrowRight, RefreshCw, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculationStore } from '../store/useCalculationStore';
import ValidationIssueList from '../components/validation/ValidationIssueList';
import { formatDate } from '../utils/formatters';
import { hasBlockingIssues } from '../utils/dataValidator';

export default function DataValidation() {
  const navigate = useNavigate();
  const { currentCalculation, validateAndSetIssues } = useCalculationStore();

  if (!currentCalculation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">当前没有选中的项目</h3>
            <p className="text-slate-500">请先选择或创建一个分析项目</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const issues = currentCalculation.validationIssues;
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;
  const hasBlocking = hasBlockingIssues(issues);

  const handleValidate = () => {
    validateAndSetIssues();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-emerald-50 border-emerald-200';
    }
  };

  const getSeverityIconBg = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100';
      case 'warning':
        return 'bg-amber-100';
      case 'info':
        return 'bg-blue-100';
      default:
        return 'bg-emerald-100';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-amber-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据校验</h1>
          <p className="text-slate-500 mt-1">
            项目：{currentCalculation.name} · 更新于 {formatDate(currentCalculation.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleValidate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重新校验
          </Button>
          <Button
            onClick={() => navigate('/calculation')}
            disabled={hasBlocking}
          >
            下一步：计算中心
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`${getSeverityBg('error')} border`}>
          <CardContent className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${getSeverityIconBg('error')}`}>
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className={`text-sm ${getSeverityText('error')}`}>错误</p>
              <p className={`text-3xl font-bold ${getSeverityText('error')}`}>{errors}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${getSeverityBg('warning')} border`}>
          <CardContent className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${getSeverityIconBg('warning')}`}>
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className={`text-sm ${getSeverityText('warning')}`}>警告</p>
              <p className={`text-3xl font-bold ${getSeverityText('warning')}`}>{warnings}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${getSeverityBg('info')} border`}>
          <CardContent className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${getSeverityIconBg('info')}`}>
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className={`text-sm ${getSeverityText('info')}`}>提示</p>
              <p className={`text-3xl font-bold ${getSeverityText('info')}`}>{infos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckSquare className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">校验状态</p>
              <p className={`text-xl font-bold ${hasBlocking ? 'text-red-700' : 'text-emerald-800'}`}>
                {hasBlocking ? '未通过' : '通过'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">数据校验通过</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              所有数据参数完整、格式正确、逻辑一致。可以继续进行热桥损耗计算。
            </p>
            <Button onClick={() => navigate('/calculation')} variant="success">
              继续：计算中心
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
                  <CheckSquare className="w-5 h-5" />
                  校验问题列表
                </CardTitle>
                <CardDescription>
                  请修复所有标记为"错误"的问题后才能继续计算
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-700">
                  {errors} 个错误
                </Badge>
                <Badge className="bg-amber-100 text-amber-700">
                  {warnings} 个警告
                </Badge>
                <Badge className="bg-blue-100 text-blue-700">
                  {infos} 个提示
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ValidationIssueList issues={issues} />
            </CardContent>
          </Card>

          <Card className={hasBlocking ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasBlocking ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900">存在 {errors} 个错误需要修复</p>
                      <p className="text-sm text-red-700">请修复所有错误后才能继续计算</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-900">校验通过</p>
                      <p className="text-sm text-emerald-700">
                        {warnings > 0 && `存在 ${warnings} 个警告，但不影响计算`}
                        {warnings === 0 && '数据质量良好，可以开始计算'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => navigate('/data-input')}>
                  返回修改数据
                </Button>
                <Button
                  onClick={() => navigate('/calculation')}
                  disabled={hasBlocking}
                  variant={hasBlocking ? 'secondary' : 'success'}
                >
                  下一步：计算中心
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
