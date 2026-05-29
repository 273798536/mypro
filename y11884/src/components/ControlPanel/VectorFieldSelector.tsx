import React from 'react';
import { useAppStore, storeActions } from '../../store/appStore';
import { ChevronDown, Info } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const VectorFieldSelector: React.FC = () => {
  const vectorFields = useAppStore((state) => state.vectorFields);
  const activeFieldId = useAppStore((state) => state.activeFieldId);
  const [isOpen, setIsOpen] = React.useState(false);

  const activeField = vectorFields.find((f) => f.id === activeFieldId);

  const handleSelect = (fieldId: string) => {
    storeActions.setActiveField(fieldId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="text-lg">∇</span>
          向量场选择
        </h3>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-left flex items-center justify-between hover:border-blue-300 transition-colors"
        >
          <div>
            <div className="font-medium text-gray-800">
              {activeField?.name || '选择向量场'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {activeField?.formula}
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {vectorFields.map((field) => (
              <button
                key={field.id}
                onClick={() => handleSelect(field.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  field.id === activeFieldId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-medium text-gray-800">{field.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {field.formula}
                </div>
                <div className="text-xs mt-1">
                  {field.isConservative ? (
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      保守场
                    </span>
                  ) : (
                    <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      非保守场
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeField && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="mb-2">{activeField.description}</p>
              <div className="bg-white p-2 rounded border text-center overflow-x-auto">
                <BlockMath math={activeField.formulaLatex} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VectorFieldSelector;
