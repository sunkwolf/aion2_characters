import { useState, useEffect, useCallback } from 'react';
import ItemFilters from '../components/items/ItemFilters';
import ItemsList from '../components/items/ItemsList';
import ItemDetailModal from '../components/items/ItemDetailModal';
import type { ItemListItem, FiltersResponse, ItemFiltersParams } from '../types/items';
import { fetchItemsList, fetchFilters } from '../services/itemsService';
import './ItemsPage.css';

const ItemsPage = () => {
  // 筛选状态
  const [filters, setFilters] = useState<ItemFiltersParams>({
    page: 1,
    size: 30,
  });

  // 筛选选项
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);

  // 物品列表
  const [items, setItems] = useState<ItemListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: 30, total: 0, lastPage: 1 });
  const [loading, setLoading] = useState(false);

  // 详情弹窗
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // 加载筛选选项
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await fetchFilters();
        setFilterOptions(data);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    loadFilters();
  }, []);

  // 加载物品列表
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchItemsList(filters);
      setItems(data.contents);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load items list:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 处理筛选变化
  const handleFilterChange = (newFilters: Partial<ItemFiltersParams>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1, // 筛选变化时重置页码
    }));
  };

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理物品点击
  const handleItemClick = (item: ItemListItem) => {
    setSelectedItemId(item.id);
  };

  return (
    <div className="items-page">
      {/* 背景图层 */}
      <div className="items-page__bg">
        <img src="/images/hero-bg.png" alt="" className="items-page__bg-image" />
        <div className="items-page__bg-overlay"></div>
      </div>

      <div className="items-page__container">
        {/* 页面标题 */}
        <div className="items-page__header">
          <div className="items-page__title-group">
            <h1 className="items-page__title">Item Database</h1>
            <p className="items-page__subtitle">
              Total {pagination.total.toLocaleString()} items
            </p>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="items-page__content">
          {/* 筛选面板 */}
          <div className="items-page__filters">
            {filterOptions && (
              <ItemFilters
                filters={filters}
                options={filterOptions}
                onChange={handleFilterChange}
              />
            )}
          </div>

          {/* 物品列表 */}
          <main className="items-page__main">
            <ItemsList
              items={items}
              loading={loading}
              pagination={pagination}
              onItemClick={handleItemClick}
              onPageChange={handlePageChange}
            />
          </main>
        </div>
      </div>

      {/* 物品详情弹窗 */}
      {selectedItemId && (
        <ItemDetailModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
};

export default ItemsPage;
