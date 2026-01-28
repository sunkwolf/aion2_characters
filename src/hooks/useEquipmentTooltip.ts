// useEquipmentTooltip Hook - supports click to view details

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
  position: { x: number; y: number };
}

interface UseEquipmentTooltipReturn {
  tooltipState: TooltipState;
  modalState: ModalState;
  handleMouseEnter: (event: React.MouseEvent, equipmentId: number) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleClick: (event: React.MouseEvent, equipmentId: number, equipmentItem?: any, charId?: string, srvId?: number) => void;
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
  // Compatible with old calling method (directly passing memberId string)
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
    position: { x: 0, y: 0 },
  });

  const [equipmentCache, setEquipmentCache] = useState<Map<string, EquipmentDetail>>(new Map());
  const showTimeoutRef = useRef<number | null>(null);

  // Load equipment cache
  useEffect(() => {
    // If equipment details data is passed directly, use it
    if (equipmentDetails) {
      console.log('[useEquipmentTooltip] Using passed equipment details data');
      const cacheMap = new Map<string, EquipmentDetail>();
      Object.entries(equipmentDetails).forEach(([_id, detail]) => {
        // Use slotPos as unique key because same equipment ID may have different attributes in different slotPos
        const cacheKey = detail.slotPos ? `${detail.id}_${detail.slotPos}` : String(detail.id);
        cacheMap.set(cacheKey, detail);
      });
      console.log('[useEquipmentTooltip] Equipment details Map size:', cacheMap.size);
      console.log('[useEquipmentTooltip] Equipment cache keys:', Array.from(cacheMap.keys()));
      setEquipmentCache(cacheMap);
      return;
    }

    // If memberId is empty, skip loading cache (for non-legion member character queries)
    if (!memberId) {
      console.log('[useEquipmentTooltip] memberId empty and no equipment details, skipping equipment cache load');
      return;
    }

    const loadCache = async () => {
      console.log('[useEquipmentTooltip] Starting to load member equipment cache:', memberId);
      const cache = await getEquipmentCache(memberId);
      console.log('[useEquipmentTooltip] Equipment cache data:', cache);

      if (cache && cache.details) {
        const cacheMap = new Map<string, EquipmentDetail>();
        cache.details.forEach(detail => {
          // Use slotPos as unique key to ensure Ring1/Ring2, Earring1/Earring2 etc. can be distinguished
          const cacheKey = detail.slotPos ? `${detail.id}_${detail.slotPos}` : String(detail.id);
          cacheMap.set(cacheKey, detail);
        });
        console.log('[useEquipmentTooltip] Equipment cache Map size:', cacheMap.size);
        console.log('[useEquipmentTooltip] Equipment cache keys:', Array.from(cacheMap.keys()));
        setEquipmentCache(cacheMap);
      } else {
        console.warn('[useEquipmentTooltip] Equipment cache is empty');
      }
    };

    loadCache();
  }, [memberId, equipmentDetails]);

  // Mouse enter equipment - show simple tooltip
  const handleMouseEnter = useCallback((event: React.MouseEvent, _equipmentId: number) => {
    // Clear previous delay
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    // Save current element position info
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Delay 200ms to show tooltip
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

  // Update position on mouse move
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

  // Mouse leave equipment
  const handleMouseLeave = useCallback(() => {
    // Clear delay
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    setTooltipState({
      position: { x: 0, y: 0 },
      visible: false,
    });
  }, []);

  // Click equipment - open details modal
  const handleClick = useCallback(async (event: React.MouseEvent, equipmentId: number, equipmentItem?: any, charId?: string, srvId?: number) => {
    // Get clicked element position info - pass full rect for smart positioning
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Pass equipment element's full position info for modal component to smartly choose display direction
    const clickPosition = {
      x: rect.right + 10,
      y: rect.top,
      // Extra equipment element boundary info
      equipRect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }
    };
    console.log('[useEquipmentTooltip] handleClick received params:', {
      equipmentId,
      equipmentItem,
      charId,
      srvId,
      'hook characterId': characterId,
      'hook serverId': serverId
    });

    // First check if cache already has this equipment detail
    // For equipment with slotPos (Ring1/Ring2 etc), use composite key: id_slotPos
    const actualEquipItem = equipmentItem || equipmentList?.find((item: any) => item.id === equipmentId);
    const cacheKeyForMemory = actualEquipItem?.slotPos
      ? `${equipmentId}_${actualEquipItem.slotPos}`
      : String(equipmentId);
    let detail = equipmentCache.get(cacheKeyForMemory);

    if (detail) {
      console.log('[useEquipmentTooltip] Got equipment detail from cache, ID:', equipmentId);
    } else {
      // Show loading state
      setModalState({
        equipmentDetail: null,
        visible: true,
        loading: true,
        position: clickPosition,
      });

      // If no memberId, this is character BD query, need to request equipment detail on demand
      // Parameters can be passed from function args or from hook config
      const actualCharId = charId || characterId;
      const actualSrvId = srvId || serverId;
      const actualEquipItem = equipmentItem || equipmentList?.find((item: any) => item.id === equipmentId);

      console.log('[useEquipmentTooltip] Actual params used:', {
        actualCharId,
        actualSrvId,
        actualEquipItem,
        memberId
      });

      if (!memberId && actualCharId && actualSrvId && actualEquipItem) {
        console.log('[useEquipmentTooltip] On-demand request equipment detail, ID:', equipmentId);
        console.log('[useEquipmentTooltip] Using params:', {
          characterId: actualCharId,
          serverId: actualSrvId,
          enchantLevel: actualEquipItem.enchantLevel,
          slotPos: actualEquipItem.slotPos
        });

        // Check browser cache - use key with slotPos
        const CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours
        const cacheKey = actualEquipItem.slotPos
          ? `equipment_detail_${equipmentId}_${actualEquipItem.slotPos}`
          : `equipment_detail_${equipmentId}`;
        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();

        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            if (now - cachedData.timestamp < CACHE_DURATION) {
              console.log('[useEquipmentTooltip] Using browser cached equipment detail');
              detail = cachedData.data;
              // Update to memory cache
              setEquipmentCache(prev => {
                const newCache = new Map(prev);
                newCache.set(cacheKeyForMemory, detail!);
                return newCache;
              });
            }
          } catch (e) {
            console.error('[useEquipmentTooltip] Failed to parse equipment detail cache:', e);
          }
        }

        // If browser cache also empty, request from API
        if (!detail) {
          try {
            const url = `/api/character/equipment-detail?itemId=${equipmentId}&enchantLevel=${actualEquipItem.enchantLevel}&characterId=${encodeURIComponent(actualCharId)}&serverId=${actualSrvId}&slotPos=${actualEquipItem.slotPos}`;
            console.log('[useEquipmentTooltip] Requesting equipment detail:', url);

            const response = await fetch(url);
            if (response.ok) {
              detail = await response.json();
              console.log('[useEquipmentTooltip] Successfully got equipment detail:', detail);

              // Save to browser cache
              localStorage.setItem(cacheKey, JSON.stringify({
                data: detail,
                timestamp: now
              }));

              // Update to memory cache
              setEquipmentCache(prev => {
                const newCache = new Map(prev);
                newCache.set(cacheKeyForMemory, detail!);
                return newCache;
              });
            } else {
              console.error('[useEquipmentTooltip] Request equipment detail failed, status:', response.status);
            }
          } catch (e) {
            console.error('[useEquipmentTooltip] Request equipment detail exception:', e);
          }
        }
      } else {
        console.warn('[useEquipmentTooltip] Equipment detail not found, ID:', equipmentId);
        console.warn('[useEquipmentTooltip] Param status:', {
          memberId,
          characterId: actualCharId,
          serverId: actualSrvId,
          hasEquipItem: !!actualEquipItem
        });
      }
    }

    if (detail) {
      // Hide tooltip
      setTooltipState({ position: { x: 0, y: 0 }, visible: false });

      // Show modal (loading complete)
      setModalState({
        equipmentDetail: detail,
        visible: true,
        loading: false,
        position: clickPosition,
      });
    } else {
      console.warn('[useEquipmentTooltip] Cannot get equipment detail, ID:', equipmentId);
      // Close loading state
      setModalState({
        equipmentDetail: null,
        visible: false,
        loading: false,
        position: { x: 0, y: 0 },
      });
    }
  }, [equipmentCache, memberId, characterId, serverId, equipmentList]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setModalState({
      equipmentDetail: null,
      visible: false,
      loading: false,
      position: { x: 0, y: 0 },
    });
  }, []);

  // Cleanup
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
