import type { ItemListItem, Pagination } from '../../types/items';
import { GRADE_COLORS } from '../../types/items';
import './ItemsList.css';

interface ItemsListProps {
  items: ItemListItem[];
  loading: boolean;
  pagination: Pagination;
  onItemClick: (item: ItemListItem) => void;
  onPageChange: (page: number) => void;
}

const ItemsList = ({ items, loading, pagination, onItemClick, onPageChange }: ItemsListProps) => {
  // Generate page number list
  const getPageNumbers = () => {
    const { page, lastPage } = pagination;
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (lastPage <= maxVisible + 2) {
      for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
      pages.push(1);

      if (page > 3) pages.push('ellipsis');

      const start = Math.max(2, page - 1);
      const end = Math.min(lastPage - 1, page + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (page < lastPage - 2) pages.push('ellipsis');

      pages.push(lastPage);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="items-list items-list--loading">
        <div className="items-list__spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="items-list items-list--empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p>No matching items found</p>
      </div>
    );
  }

  return (
    <div className="items-list">
      {/* 物品网格 */}
      <div className="items-list__grid">
        {items.map(item => (
          <div
            key={item.id}
            className="item-card"
            style={{
              '--grade-color': GRADE_COLORS[item.grade] || '#9d9d9d',
            } as React.CSSProperties}
            onClick={() => onItemClick(item)}
          >
            <div className="item-card__image">
              <img src={item.image} alt={item.name_cn} loading="lazy" />
              {item.enchantable && (
                <span className="item-card__enchant-badge" title="Enchantable">
                  +{item.max_enchant_level}
                </span>
              )}
            </div>
            <div className="item-card__info">
              <h3 className="item-card__name">{item.name_cn}</h3>
              <div className="item-card__meta">
                <span className="item-card__grade">{item.grade_name_cn}</span>
                <span className="item-card__category">{item.category_name_cn}</span>
              </div>
              {item.classes_cn && item.classes_cn.length > 0 && (
                <div className="item-card__classes">
                  {item.classes_cn.slice(0, 3).join(' / ')}
                  {item.classes_cn.length > 3 && ` +${item.classes_cn.length - 3}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {pagination.lastPage > 1 && (
        <div className="items-list__pagination">
          <button
            className="items-list__page-btn"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            ‹
          </button>

          {getPageNumbers().map((pageNum, idx) =>
            pageNum === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="items-list__page-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                className={`items-list__page-btn ${pagination.page === pageNum ? 'items-list__page-btn--active' : ''}`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            )
          )}

          <button
            className="items-list__page-btn"
            disabled={pagination.page >= pagination.lastPage}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemsList;
