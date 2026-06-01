import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFractalStore } from '@/store/fractalStore';
import { sampleData } from '@/utils/samples';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { SampleData } from '@/types';
import { 
  Play, 
  AlertTriangle, 
  XCircle, 
  Zap,
  CheckCircle,
  Search,
  Filter
} from 'lucide-react';

const categoryConfig = {
  normal: {
    label: '正常样例',
    icon: CheckCircle,
    color: 'text-accent-success',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  explosion: {
    label: '迭代爆炸',
    icon: Zap,
    color: 'text-accent-danger',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  invalid_rule: {
    label: '规则非法',
    icon: XCircle,
    color: 'text-accent-danger',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  color_overlap: {
    label: '颜色重叠',
    icon: AlertTriangle,
    color: 'text-accent-warning',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

export default function Samples() {
  const navigate = useNavigate();
  const { createExperiment } = useFractalStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSamples = sampleData.filter((sample) => {
    const matchesCategory = selectedCategory === 'all' || sample.category === selectedCategory;
    const matchesSearch = 
      sample.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const loadSample = (sample: SampleData) => {
    createExperiment(sample.config, sample.name);
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <Alert type="info" title="样例库说明">
        这里提供了多种分形迭代样例，包括正常结果和各种错误场景。点击"加载样例"即可在工作台中查看详细配置和运行结果。
      </Alert>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索样例..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">全部类型</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSamples.map((sample) => {
          const config = categoryConfig[sample.category];
          const Icon = config.icon;

          return (
            <Card
              key={sample.id}
              className={`border-2 ${config.borderColor} hover:shadow-lg transition-shadow`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-dark">{sample.name}</h3>
                      <span className={`text-xs ${config.color} font-medium`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">{sample.description}</p>

                <div className={`${config.bgColor} rounded-lg p-3`}>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">迭代规则:</span>
                      <code className="font-mono bg-white px-2 py-0.5 rounded">
                        {sample.config.iterationRule || '(空)'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">初始图形:</span>
                      <span className="font-medium">{sample.config.initialShape}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">迭代次数:</span>
                      <span className="font-medium">{sample.config.maxIterations}</span>
                    </div>
                  </div>
                </div>

                {sample.expectedError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">预期错误:</span> {sample.expectedMessage}
                    </p>
                  </div>
                )}

                {sample.config.note && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 italic">
                      "{sample.config.note}"
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  variant={sample.category === 'normal' ? 'primary' : 'secondary'}
                  icon={<Play className="w-4 h-4" />}
                  onClick={() => loadSample(sample)}
                >
                  加载样例
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredSamples.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">没有找到匹配的样例</p>
        </div>
      )}
    </div>
  );
}
