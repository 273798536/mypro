import React, { useEffect, useState } from 'react';
import { Search, Plus, Upload, Filter, Edit, Trash2, X } from 'lucide-react';
import { useDishStore } from '../../store/dishStore';
import { Dish, DishCategory, CATEGORY_COLORS, ALLERGENS } from '../../types';
import { cn } from '@/lib/utils';

const categories: (DishCategory | 'all')[] = ['all', '主食', '荤菜', '素菜', '汤品', '水果', '奶制品'];

export const DishList: React.FC = () => {
  const {
    dishes,
    loadDishes,
    getFilteredDishes,
    searchQuery,
    categoryFilter,
    setSearchQuery,
    setCategoryFilter,
    selectedDish,
    setSelectedDish,
    deleteDish,
    addDish,
    updateDish,
  } = useDishStore();

  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [formData, setFormData] = useState<Partial<Dish>>({
    name: '',
    category: '主食',
    cost: 0,
    portion: 100,
    nutrition: {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      calcium: 0,
      iron: 0,
      vitaminA: 0,
      vitaminC: 0,
    },
    allergens: [],
    source: '学校食堂',
  });

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const filteredDishes = getFilteredDishes();

  const handleAdd = () => {
    setEditingDish(null);
    setFormData({
      name: '',
      category: '主食',
      cost: 0,
      portion: 100,
      nutrition: {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        calcium: 0,
        iron: 0,
        vitaminA: 0,
        vitaminC: 0,
      },
      allergens: [],
      source: '学校食堂',
    });
    setShowModal(true);
  };

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish);
    setFormData(dish);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.category) return;

    if (editingDish) {
      updateDish(editingDish.id, formData);
    } else {
      addDish(formData as Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>);
    }
    setShowModal(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            if (Array.isArray(data)) {
              useDishStore.getState().importDishes(data);
            }
          } catch (error) {
            console.error('Import failed:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">菜品库管理</h1>
          <p className="text-slate-500 mt-1">管理所有菜品信息、营养指标和成本数据</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入菜品
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加菜品
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索菜品名称或来源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filteredDishes.map((dish) => (
          <div
            key={dish.id}
            className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{dish.name}</h3>
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: CATEGORY_COLORS[dish.category] }}
                >
                  {dish.category}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(dish)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteDish(dish.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <p className="text-slate-400">成本</p>
                <p className="font-semibold text-slate-700">¥{dish.cost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400">分量</p>
                <p className="font-semibold text-slate-700">{dish.portion}g</p>
              </div>
              <div>
                <p className="text-slate-400">热量</p>
                <p className="font-semibold text-slate-700">{dish.nutrition.calories}kcal</p>
              </div>
              <div>
                <p className="text-slate-400">蛋白质</p>
                <p className="font-semibold text-slate-700">{dish.nutrition.protein}g</p>
              </div>
            </div>

            {dish.allergens.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {dish.allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded"
                  >
                    含{allergen}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              来源：{dish.source}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingDish ? '编辑菜品' : '添加菜品'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    菜品名称
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    菜品分类
                  </label>
                  <select
                    value={formData.category || '主食'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DishCategory })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.filter(c => c !== 'all').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    成本（元）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.cost || 0}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    分量（g）
                  </label>
                  <input
                    type="number"
                    value={formData.portion || 0}
                    onChange={(e) => setFormData({ ...formData, portion: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    来源
                  </label>
                  <input
                    type="text"
                    value={formData.source || ''}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  营养成分
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'calories', label: '热量(kcal)' },
                    { key: 'protein', label: '蛋白质(g)' },
                    { key: 'fat', label: '脂肪(g)' },
                    { key: 'carbs', label: '碳水(g)' },
                    { key: 'fiber', label: '纤维(g)' },
                    { key: 'calcium', label: '钙(mg)' },
                    { key: 'iron', label: '铁(mg)' },
                    { key: 'vitaminA', label: '维A(μg)' },
                    { key: 'vitaminC', label: '维C(mg)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <input
                        type="number"
                        value={formData.nutrition?.[key as keyof typeof formData.nutrition] || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nutrition: {
                              ...formData.nutrition!,
                              [key]: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  过敏原（可多选）
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((allergen) => (
                    <label
                      key={allergen}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors',
                        formData.allergens?.includes(allergen)
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.allergens?.includes(allergen) || false}
                        onChange={(e) => {
                          const current = formData.allergens || [];
                          setFormData({
                            ...formData,
                            allergens: e.target.checked
                              ? [...current, allergen]
                              : current.filter((a) => a !== allergen),
                          });
                        }}
                      />
                      {allergen}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
