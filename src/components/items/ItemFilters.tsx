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
  // Expanded parent category ID
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

  // Click parent category: select and expand/collapse subcategories
  const handleParentClick = (parentId: string) => {
    onChange({ categoryId: parentId });
    setExpandedCategory(expandedCategory === parentId ? null : parentId);
  };

  // Check if the currently selected category belongs to a parent category
  const isChildOfParent = (parentId: string) => {
    const parent = options.categories.find(c => c.id === parentId);
    return parent?.children?.some(child => child.id === filters.categoryId);
  };

  return (
    <div className="item-filters">
      {/* Top row: search box and reset button */}
      <div className="item-filters__top-row">
        <div className="item-filters__search">
          <input
            type="text"
            placeholder="Search item name..."
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
            Clear Filters
          </button>
        )}
      </div>

      {/* Class and quality filters */}
      <div className="item-filters__groups">
        <div className="item-filters__group">
          <span className="item-filters__label">Class</span>
          <div className="item-filters__chips">
            <button
              className={`item-filters__chip ${!filters.classId ? 'item-filters__chip--active' : ''}`}
              onClick={() => onChange({ classId: undefined })}
            >
              All
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
          <span className="item-filters__label">Quality</span>
          <div className="item-filters__chips">
            <button
              className={`item-filters__chip ${!filters.grade ? 'item-filters__chip--active' : ''}`}
              onClick={() => onChange({ grade: undefined })}
            >
              All
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

      {/* Category filter */}
      <div className="item-filters__categories-section">
        <div className="item-filters__group">
          <span className="item-filters__label">Category</span>
          <div className="item-filters__categories">
            <button
              className={`item-filters__chip ${!filters.categoryId ? 'item-filters__chip--active' : ''}`}
              onClick={() => { onChange({ categoryId: undefined }); setExpandedCategory(null); }}
            >
              All
            </button>
            {options.categories.map(parent => (
              <button
                key={parent.id}
                className={`item-filters__chip item-filters__chip--parent ${filters.categoryId === parent.id || isChildOfParent(parent.id)
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

        {/* Expanded subcategories */}
        {expandedCategory && (
          <div className="item-filters__row--children">
            <span className="item-filters__label item-filters__label--sub">Subcategory</span>
            <div className="item-filters__chips">
              {options.categories
                .find(c => c.id === expandedCategory)
                ?.children?.map(child => (
                  <button
                    key={child.id}
                    className={`item-filters__chip item-filters__chip--child ${filters.categoryId === child.id ? 'item-filters__chip--active' : ''
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
