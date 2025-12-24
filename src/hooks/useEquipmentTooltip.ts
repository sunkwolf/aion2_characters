// useEquipmentTooltip Hook - 支持点击查看详情

import { useState, useCallback, useRef, useEffect } from 'react';
import type { EquipmentDetail } from '../types/admin';
import { getEquipmentCache } from '../services/dataService';

interface TooltipState {
  position: { x: number; y: number };
  visible: boolean;
}

interface ModalState {
  equipmentDetail: EquipmentDetail | null;
  visible: boolean;
  loading: boolean;
}

interface UseEquipmentTooltipReturn {
  tooltipState: TooltipState;
  modalState: ModalState;
  handleMouseEnter: (event: React.MouseEvent, equipmentId: number) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleClick: (equipmentId: number, equipmentItem?: any, charId?: string, srvId?: number) => void;
  handleCloseModal: () => void;
}

interface UseEquipmentTooltipOptions {
  memberId?: string;
  equipmentDetails?: Record<number, EquipmentDetail>;
  characterId?: string;
  serverId?: number;
  equipmentList?: any[];
}

export function useEquipmentTooltip(options: UseEquipmentTooltipOptions | string): UseEquipmentTooltipReturn {
  // 兼容旧的调用方式（直接传 memberId 字符串）
  const { memberId, equipmentDetails, characterId, serverId, equipmentList } = typeof options === 'string'
    ? { memberId: options, equipmentDetails: undefined, characterId: undefined, serverId: undefined, equipmentList: undefined }
    : options;
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    position: { x: 0, y: 0 },
    visible: false,
  });

  const [modalState, setModalState] = useState<ModalState>({
    equipmentDetail: null,
    visible: false,
    loading: false,
  });

  const [equipmentCache, setEquipmentCache] = useState<Map<number, EquipmentDetail>>(new Map());
  const showTimeoutRef = useRef<number | null>(null);

  // 加载装备缓存
  useEffect(() => {
    // 如果直接传入了装备详情数据，直接使用
    if (equipmentDetails) {
      console.log('[useEquipmentTooltip] 使用传入的装备详情数据');
      const cacheMap = new Map<number, EquipmentDetail>();
      Object.entries(equipmentDetails).forEach(([id, detail]) => {
        cacheMap.set(Number(id), detail);
      });
      console.log('[useEquipmentTooltip] 装备详情 Map 大小:', cacheMap.size);
      console.log('[useEquipmentTooltip] 装备 ID 列表:', Array.from(cacheMap.keys()));
      setEquipmentCache(cacheMap);
      return;
    }

    // 如果 memberId 为空,跳过加载缓存(用于非军团成员的角色查询)
    if (!memberId) {
      console.log('[useEquipmentTooltip] memberId 为空且无装备详情,跳过加载装备缓存');
      return;
    }

    const loadCache = async () => {
      console.log('[useEquipmentTooltip] 开始加载成员装备缓存:', memberId);
      const cache = await getEquipmentCache(memberId);
      console.log('[useEquipmentTooltip] 装备缓存数据:', cache);

      if (cache && cache.details) {
        const cacheMap = new Map<number, EquipmentDetail>();
        cache.details.forEach(detail => {
          cacheMap.set(detail.id, detail);
        });
        console.log('[useEquipmentTooltip] 装备缓存 Map 大小:', cacheMap.size);
        console.log('[useEquipmentTooltip] 装备 ID 列表:', Array.from(cacheMap.keys()));
        setEquipmentCache(cacheMap);
      } else {
        console.warn('[useEquipmentTooltip] 装备缓存为空');
      }
    };

    loadCache();
  }, [memberId, equipmentDetails]);

  // 鼠标进入装备 - 显示简单提示
  const handleMouseEnter = useCallback((event: React.MouseEvent, _equipmentId: number) => {
    // 清除之前的延迟
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    // 保存当前元素的位置信息
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // 延迟 200ms 显示提示
    showTimeoutRef.current = window.setTimeout(() => {
      setTooltipState({
        position: {
          x: rect.right + 10,
          y: rect.top,
        },
        visible: true,
      });
    }, 200);
  }, []);

  // 鼠标移动时更新位置
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltipState(prev => {
      if (!prev.visible) return prev;

      return {
        ...prev,
        position: {
          x: event.clientX + 15,
          y: event.clientY + 15,
        },
      };
    });
  }, []);

  // 鼠标离开装备
  const handleMouseLeave = useCallback(() => {
    // 清除延迟
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    setTooltipState({
      position: { x: 0, y: 0 },
      visible: false,
    });
  }, []);

  // 点击装备 - 打开详情模态框
  const handleClick = useCallback(async (equipmentId: number, equipmentItem?: any, charId?: string, srvId?: number) => {
    console.log('[useEquipmentTooltip] handleClick 接收到的参数:', {
      equipmentId,
      equipmentItem,
      charId,
      srvId,
      'hook中的characterId': characterId,
      'hook中的serverId': serverId
    });

    // 先检查缓存中是否已有该装备详情
    let detail = equipmentCache.get(equipmentId);

    if (detail) {
      console.log('[useEquipmentTooltip] 从缓存获取装备详情, ID:', equipmentId);
    } else {
      // 显示加载状态
      setModalState({
        equipmentDetail: null,
        visible: true,
        loading: true,
      });

      // 如果没有 memberId，说明是角色BD查询，需要按需请求装备详情
      // 参数可以从函数参数传入，或者从 hook 配置中获取
      const actualCharId = charId || characterId;
      const actualSrvId = srvId || serverId;
      const actualEquipItem = equipmentItem || equipmentList?.find((item: any) => item.id === equipmentId);

      console.log('[useEquipmentTooltip] 实际使用的参数:', {
        actualCharId,
        actualSrvId,
        actualEquipItem,
        memberId
      });

      if (!memberId && actualCharId && actualSrvId && actualEquipItem) {
        console.log('[useEquipmentTooltip] 按需请求装备详情, ID:', equipmentId);
        console.log('[useEquipmentTooltip] 使用参数:', {
          characterId: actualCharId,
          serverId: actualSrvId,
          enchantLevel: actualEquipItem.enchantLevel,
          slotPos: actualEquipItem.slotPos
        });

        // 检查浏览器缓存
        const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4小时
        const cacheKey = `equipment_detail_${equipmentId}`;
        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();

        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            if (now - cachedData.timestamp < CACHE_DURATION) {
              console.log('[useEquipmentTooltip] 使用浏览器缓存的装备详情');
              detail = cachedData.data;
              // 更新到内存缓存
              setEquipmentCache(prev => {
                const newCache = new Map(prev);
                newCache.set(equipmentId, detail!);
                return newCache;
              });
            }
          } catch (e) {
            console.error('[useEquipmentTooltip] 解析装备详情缓存失败:', e);
          }
        }

        // 如果浏览器缓存也没有，从API请求
        if (!detail) {
          try {
            const url = `/api/character/equipment-detail?itemId=${equipmentId}&enchantLevel=${actualEquipItem.enchantLevel}&characterId=${encodeURIComponent(actualCharId)}&serverId=${actualSrvId}&slotPos=${actualEquipItem.slotPos}`;
            console.log('[useEquipmentTooltip] 请求装备详情:', url);

            const response = await fetch(url);
            if (response.ok) {
              detail = await response.json();
              console.log('[useEquipmentTooltip] 成功获取装备详情:', detail);

              // 保存到浏览器缓存
              localStorage.setItem(cacheKey, JSON.stringify({
                data: detail,
                timestamp: now
              }));

              // 更新到内存缓存
              setEquipmentCache(prev => {
                const newCache = new Map(prev);
                newCache.set(equipmentId, detail!);
                return newCache;
              });
            } else {
              console.error('[useEquipmentTooltip] 请求装备详情失败, status:', response.status);
            }
          } catch (e) {
            console.error('[useEquipmentTooltip] 请求装备详情异常:', e);
          }
        }
      } else {
        console.warn('[useEquipmentTooltip] 未找到装备详情, ID:', equipmentId);
        console.warn('[useEquipmentTooltip] 参数状态:', {
          memberId,
          characterId: actualCharId,
          serverId: actualSrvId,
          hasEquipItem: !!actualEquipItem
        });
      }
    }

    if (detail) {
      // 隐藏提示
      setTooltipState({ position: { x: 0, y: 0 }, visible: false });

      // 显示模态框(加载完成)
      setModalState({
        equipmentDetail: detail,
        visible: true,
        loading: false,
      });
    } else {
      console.warn('[useEquipmentTooltip] 无法获取装备详情, ID:', equipmentId);
      // 关闭加载状态
      setModalState({
        equipmentDetail: null,
        visible: false,
        loading: false,
      });
    }
  }, [equipmentCache, memberId, characterId, serverId, equipmentList]);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setModalState({
      equipmentDetail: null,
      visible: false,
      loading: false,
    });
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  return {
    tooltipState,
    modalState,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
    handleCloseModal,
  };
}
