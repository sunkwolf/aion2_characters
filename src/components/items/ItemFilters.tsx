import { useState } from 'react';
import type { FiltersResponse, ItemFiltersParams } from '../../types/items';
import { GRADE_COLORS } from '../../types/items';
import './ItemFilters.css';

interface ItemFiltersProps {
  filters: ItemFiltersParams;
  options: FiltersResponse;
  onChange: (filters: Partial<ItemFiltersParams>) => void;
}

const ItemFilters = ({ filters, options, onChange }: ItemFiltersProps) => {
  // 展开的父分类ID
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleReset = () => {
    onChange({
      grade: undefined,
      categoryId: undefined,
      classId: undefined,
      keyword: undefined,
      page: 1,
    });
    setExpandedCategory(null);
  };

  const hasActiveFilters =
    filters.grade || filters.categoryId || filters.classId || filters.keyword;

  // 点击父分类：选中并展开/收起子分类
  const handleParentClick = (parentId: string) => {
    onChange({ categoryId: parentId });
    setExpandedCategory(expandedCategory === parentId ? null : parentId);
  };

  // 检查当前选中的分类是否属于某个父分类
  const isChildOfParent = (parentId: string) => {
    const parent = options.categories.find(c => c.id === parentId);
    return parent?.children?.some(child => child.id === filters.categoryId);
  };

  return (
    <div className="item-filters">
      {/* 顶部行：搜索框和重置按钮 */}
      <div className="item-filters__top-row">
        <div className="item-filters__search">
          <input
            type="text"
            placeholder="搜索物品名称..."
            value={filters.keyword || ''}
            onChange={e => onChange({ keyword: e.target.value || undefined })}
            className="item-filters__search-input"
          />
          <svg className="item-filters__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        {hasActiveFilters && (
          <button className="item-filters__reset" onClick={handleReset}>
            清除筛选
          </button>
        )}
      </div>

      {/* 职业和品质筛选 */}
      <div className="item-filters__groups">
        <div className="item-filters__group">
          <span className="item-filters__label">职业</span>
          <div className="item-filters__chips">
            <button
              className={`item-filters__chip ${!filters.classId ? 'item-filters__chip--active' : ''}`}
              onClick={() => onChange({ classId: undefined })}
            >
              全部
            </button>
            {options.classes.map(cls => (
              <button
                key={cls.id}
                className={`item-filters__chip ${filters.classId === cls.name_cn ? 'item-filters__chip--active' : ''}`}
                onClick={() => onChange({ classId: cls.name_cn })}
              >
                {cls.name_cn}
              </button>
            ))}
          </div>
        </div>
        <div className="item-filters__divider" />
        <div className="item-filters__group">
          <span className="item-filters__label">品质</span>
          <div className="item-filters__chips">
            <button
              className={`item-filters__chip ${!filters.grade ? 'item-filters__chip--active' : ''}`}
              onClick={() => onChange({ grade: undefined })}
            >
              全部
            </button>
            {options.grades.map(grade => (
              <button
                key={grade.id}
                className={`item-filters__chip ${filters.grade === grade.id ? 'item-filters__chip--active' : ''}`}
                style={{
                  '--grade-color': GRADE_COLORS[grade.id] || '#9d9d9d',
                } as React.CSSProperties}
                onClick={() => onChange({ grade: grade.id })}
              >
                {grade.name_cn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="item-filters__categories-section">
        <div className="item-filters__group">
          <span className="item-filters__label">分类</span>
          <div className="item-filters__categories">
            <button
              className={`item-filters__chip ${!filters.categoryId ? 'item-filters__chip--active' : ''}`}
              onClick={() => { onChange({ categoryId: undefined }); setExpandedCategory(null); }}
            >
              全部
            </button>
            {options.categories.map(parent => (
              <button
                key={parent.id}
                className={`item-filters__chip item-filters__chip--parent ${
                  filters.categoryId === parent.id || isChildOfParent(parent.id)
                    ? 'item-filters__chip--active'
                    : ''
                } ${expandedCategory === parent.id ? 'item-filters__chip--expanded' : ''}`}
                onClick={() => handleParentClick(parent.id)}
              >
                {parent.name_cn}
                {parent.children && parent.children.length > 0 && (
                  <svg className="item-filters__expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 展开的子分类 */}
        {expandedCategory && (
          <div className="item-filters__row--children">
            <span className="item-filters__label item-filters__label--sub">子分类</span>
            <div className="item-filters__chips">
              {options.categories
                .find(c => c.id === expandedCategory)
                ?.children?.map(child => (
                  <button
                    key={child.id}
                    className={`item-filters__chip item-filters__chip--child ${
                      filters.categoryId === child.id ? 'item-filters__chip--active' : ''
                    }`}
                    onClick={() => onChange({ categoryId: child.id })}
                  >
                    {child.name_cn}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemFilters;
