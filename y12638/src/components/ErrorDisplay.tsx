import { ValidationError } from '../types';

interface Props {
  errors: ValidationError[];
  onDismiss: () => void;
}

export default function ErrorDisplay({ errors, onDismiss }: Props) {
  if (errors.length === 0) return null;

  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800 mb-3">
            导入失败，请检查以下问题
          </h3>
          <ul className="space-y-2">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2 text-red-700">
                <span className="text-red-500 mt-1">•</span>
                <div>
                  <span className="font-medium">[{error.field}]</span> {error.message}
                  <p className="text-sm text-red-600 mt-1">建议: {error.suggestion}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-red-400 hover:text-red-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}
