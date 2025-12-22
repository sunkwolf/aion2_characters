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
}

interface UseEquipmentTooltipReturn {
  tooltipState: TooltipState;
  modalState: ModalState;
  handleMouseEnter: (event: React.MouseEvent, equipmentId: number) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleClick: (equipmentId: number) => void;
  handleCloseModal: () => void;
}

export function useEquipmentTooltip(memberId: string): UseEquipmentTooltipReturn {
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    position: { x: 0, y: 0 },
    visible: false,
  });

  const [modalState, setModalState] = useState<ModalState>({
    equipmentDetail: null,
    visible: false,
  });

  const [equipmentCache, setEquipmentCache] = useState<Map<number, EquipmentDetail>>(new Map());
  const showTimeoutRef = useRef<number | null>(null);

  // 加载装备缓存
  useEffect(() => {
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
  }, [memberId]);

  // 鼠标进入装备 - 显示简单提示
  const handleMouseEnter = useCallback((event: React.MouseEvent, equipmentId: number) => {
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
  const handleClick = useCallback((equipmentId: number) => {
    const detail = equipmentCache.get(equipmentId);
    console.log('[useEquipmentTooltip] 点击装备, ID:', equipmentId, ', 结果:', detail);

    if (detail) {
      // 隐藏提示
      setTooltipState({ position: { x: 0, y: 0 }, visible: false });

      // 显示模态框
      setModalState({
        equipmentDetail: detail,
        visible: true,
      });
    } else {
      console.warn('[useEquipmentTooltip] 未找到装备详情, ID:', equipmentId);
    }
  }, [equipmentCache]);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setModalState({
      equipmentDetail: null,
      visible: false,
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
