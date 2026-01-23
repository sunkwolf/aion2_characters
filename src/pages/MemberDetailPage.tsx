import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { gradeColors, classIcons } from '../data/memberTypes';
import type { CharacterInfo, CharacterEquipment, EquipmentItem, TitleItem } from '../data/memberTypes';
import type { Rating } from '../types/admin';
import EquipmentTooltip from '../components/EquipmentTooltip';
import EquipmentDetailModal from '../components/EquipmentDetailModal';
import ExceedLevel from '../components/ExceedLevel';
import ConfirmDialog from '../components/ConfirmDialog';
import DaevanionModal from '../components/DaevanionModal';
import AttackPowerModal from '../components/AttackPowerModal';
import { useEquipmentTooltip } from '../hooks/useEquipmentTooltip';
import { loadMemberDaevanion, fetchDaevanionBoards, mergeDaevanionEffects, getClassIdByChineseName } from '../utils/daevanion';
import type { DaevanionBoards, AggregatedDaevanionEffects } from '../utils/daevanion';
import { calculateAttackPower, type AttackPowerResult } from '../utils/attackPowerCalculator';
import './MemberDetailPage.css';

// 成员配置信息
interface MemberConfig {
  id: string;
  role: 'leader' | 'elite' | 'member';
  title?: string;
}

// 称号分类映射
const titleCategoryNames: Record<string, string> = {
  'Attack': '攻擊系列',
  'Defense': '防禦系列',
  'Etc': '其他系列'
};

// 搜索历史记录常量和类型
const HISTORY_STORAGE_KEY = 'character_search_history';
const MAX_HISTORY_ITEMS = 5;

interface SearchHistory {
  characterId: string;
  characterName: string;
  serverId: number;
  serverLabel: string;
  level?: number;
  race?: number;
  profileImage?: string;
  timestamp: number;
}

// 称号分类图标
const titleCategoryIcons: Record<string, string> = {
  'Attack': 'https://assets.playnccdn.com/static-aion2/characters/img/info/title_icon_attack.png',
  'Defense': 'https://assets.playnccdn.com/static-aion2/characters/img/info/title_icon_defense.png',
  'Etc': 'https://assets.playnccdn.com/static-aion2/characters/img/info/title_icon_etc.png'
};

// 守护力颜色映射（基于ID）
const getDaevanionColor = (id: number): string => {
  // id 11-14: 蓝色，id 15: 金色，id 16: 紫色
  if (id >= 11 && id <= 14) return '#4fc3f7';
  if (id === 15) return '#ff9800';
  if (id === 16) return '#ab47bc';
  return '#4fc3f7'; // 默认蓝色
};

const MemberDetailPage = () => {
  const { id, serverId, characterId } = useParams<{ id?: string; serverId?: string; characterId?: string }>();
  const location = useLocation();

  // 从 location.state 获取角色数据（角色BD查询时使用）
  const characterData = location.state?.characterData;

  // 判断数据来源:
  // 1. 军团成员: id 存在
  // 2. 角色BD查询 (旧): characterData 存在
  // 3. 分享链接 (新): serverId 和 characterId 存在
  const isFromMember = !!id;
  const isFromCharacterBD = !!characterData;
  const isFromShare = !!serverId && !!characterId;

  const [charInfo, setCharInfo] = useState<CharacterInfo | null>(null);
  const [charEquip, setCharEquip] = useState<CharacterEquipment | null>(null);
  const [_memberConfig, setMemberConfig] = useState<MemberConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<Rating | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [refreshDialogMessage, setRefreshDialogMessage] = useState('');
  const [refreshDialogTitle, setRefreshDialogTitle] = useState('');

  // 守护力弹窗状态
  const [showDaevanionModal, setShowDaevanionModal] = useState(false);
  const [daevanionLoading, setDaevanionLoading] = useState(false);
  const [daevanionEffects, setDaevanionEffects] = useState<AggregatedDaevanionEffects | null>(null);

  // 攻击力相关状态
  const [attackPower, setAttackPower] = useState<AttackPowerResult | null>(null);
  const [attackPowerLoading, setAttackPowerLoading] = useState(false);
  const [showAttackPowerModal, setShowAttackPowerModal] = useState(false);

  // 标记阶段2是否完成(用于触发攻击力计算)
  const [stage2Complete, setStage2Complete] = useState(false);

  // 用于追踪评分是否已加载,避免重复加载
  const ratingLoadedRef = useRef(false);

  // 缓存的完整数据(用于守护力等数据,避免重复请求)
  const cachedCompleteDataRef = useRef<any>(null);

  // 准备装备列表数据
  // 角色BD查询: 直接从 characterData 获取
  // 分享链接/军团成员: 从 state 获取
  // 使用 useMemo 稳定化数组引用
  const equipment = useMemo(() => {
    if (isFromCharacterBD) {
      return characterData?.equipment?.equipment?.equipmentList || [];
    }
    return (charEquip as any)?.details || charEquip?.equipment?.equipmentList || [];
  }, [isFromCharacterBD, characterData, charEquip]);

  // 准备装备详情数据(用于悬浮提示和点击详情)
  // 将装备列表转换为 Map<equipmentId, EquipmentDetail> 格式
  // 使用 useMemo 避免每次渲染都重新创建对象
  const equipmentDetailsMap = useMemo(() => {
    return equipment.reduce((acc: Record<number, any>, item: any) => {
      // 装备详情已经在 equipment 数组中(完整数据API已获取)
      // 检查是否包含详细信息(stat表示有详细属性,或者有minPower/maxPower等字段)
      if (item.stat || item.minPower !== undefined || item.slotPosName) {
        acc[item.id] = item;
      }
      return acc;
    }, {});
  }, [equipment]);

  console.log('[MemberDetailPage] equipmentDetailsMap大小:', Object.keys(equipmentDetailsMap).length);
  console.log('[MemberDetailPage] equipment数量:', equipment.length);

  // 使用 useMemo 稳定化 useEquipmentTooltip 的配置对象,避免无限循环
  const equipmentTooltipConfig = useMemo(() => {
    if (isFromCharacterBD || isFromShare) {
      const config = {
        characterId: isFromShare ? characterId : characterData?.info?.profile?.characterId,
        serverId: isFromShare ? Number(serverId) : characterData?.info?.profile?.serverId,
        equipmentList: equipment,
        // 只有在阶段2完成后才传递equipmentDetails,避免使用不完整的数据
        equipmentDetails: (stage2Complete && Object.keys(equipmentDetailsMap).length > 0) ? equipmentDetailsMap : undefined
      };
      console.log('[MemberDetailPage] 传递给useEquipmentTooltip的配置:', {
        ...config,
        stage2Complete,
        equipmentDetailsKeys: Object.keys(equipmentDetailsMap),
        hasEquipmentDetails: !!config.equipmentDetails
      });
      return config;
    }
    return { memberId: id || '' };
  }, [isFromCharacterBD, isFromShare, characterId, serverId, characterData, equipment, stage2Complete, equipmentDetailsMap, id]);

  // 装备悬浮提示和详情模态框
  const { tooltipState, modalState, handleMouseEnter, handleMouseMove, handleMouseLeave, handleClick, handleCloseModal } = useEquipmentTooltip(equipmentTooltipConfig);

  // 检测是否为触摸设备（用于区分桌面端悬浮触发和移动端点击触发）
  // 注意：必须在所有早期返回之前定义，保持 hooks 调用顺序一致
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches;
  }, []);

  // 悬浮延迟定时器 ref
  const hoverTimerRef = useRef<number | null>(null);

  // 外观按 slotPosName 映射，用于在装备卡片中显示对应外观图标
  // 注意：必须在所有早期返回之前定义，保持 hooks 调用顺序一致
  const skinsBySlot = useMemo(() => {
    const skinList = charEquip?.equipment?.skinList || [];
    return skinList.reduce((acc, skin) => {
      acc[skin.slotPosName] = skin;
      return acc;
    }, {} as Record<string, typeof skinList[0]>);
  }, [charEquip]);

  useEffect(() => {
    let isMounted = true; // 防止组件卸载后的状态更新

    // 如果是从角色BD查询来的，直接使用传入的数据
    if (isFromCharacterBD) {
      if (characterData.info) {
        setCharInfo(characterData.info);
      }
      if (characterData.equipment) {
        setCharEquip(characterData.equipment);
      }
      setLoading(false);
      return;
    }

    // 如果是分享链接,从API加载完整数据(包括装备详情、评分、守护力)
    if (isFromShare && serverId && characterId) {
      const loadSharedData = async () => {
        try {
          // 确保 characterId 被解码,避免缓存键不匹配
          const decodedCharacterId = decodeURIComponent(characterId);
          const cacheKey = `character_complete_${serverId}_${decodedCharacterId}`; // v3: 完整数据缓存
          const cached = localStorage.getItem(cacheKey);

          // 检查缓存是否有效(8小时内)
          if (cached) {
            try {
              const cacheData = JSON.parse(cached);
              const cacheTime = cacheData.timestamp || 0;
              const now = Date.now();
              const eightHours = 8 * 60 * 60 * 1000; // 8小时的毫秒数

              if (now - cacheTime < eightHours) {
                console.log('[完整数据] 使用缓存的角色完整数据,缓存时间:', new Date(cacheTime).toLocaleString());
                if (!isMounted) return;
                setCharInfo(cacheData.characterInfo);
                setCharEquip(cacheData.equipmentData);
                if (cacheData.rating) {
                  setRating(cacheData.rating);
                }
                // 保存完整数据到 ref,用于守护力等功能
                cachedCompleteDataRef.current = cacheData;
                // 标记阶段2已完成(使用缓存也算完成)
                setStage2Complete(true);
                setLoading(false);
                return;
              } else {
                console.log('[完整数据] 缓存已过期,重新加载');
              }
            } catch (e) {
              console.log('[完整数据] 缓存数据解析失败,重新加载');
            }
          } else {
            console.log('[完整数据] 未找到缓存,重新加载');
          }

          // 缓存失效或不存在，分阶段加载数据
          console.log('[完整数据] 开始请求角色完整数据...');

          // 阶段1: 快速加载基础数据（角色信息+装备列表）
          console.log('[阶段1] 快速加载基础数据...');
          const basicInfoUrl = `/api/character/info?characterId=${characterId}&serverId=${serverId}`;
          const basicEquipUrl = `/api/character/equipment?characterId=${characterId}&serverId=${serverId}`;

          const [infoResponse, equipResponse] = await Promise.all([
            fetch(basicInfoUrl),
            fetch(basicEquipUrl)
          ]);

          const [basicCharInfo, basicEquipData] = await Promise.all([
            infoResponse.json(),
            equipResponse.json()
          ]);

          // 立即显示页面
          console.log('[阶段1] 基础数据加载完成,显示页面');
          if (!isMounted) return;
          setCharInfo(basicCharInfo);
          setCharEquip(basicEquipData);
          setLoading(false);

          // 阶段2: 后台加载完整数据（装备详情+评分+守护力）
          console.log('[阶段2] 后台加载完整数据...');
          const completeUrl = `/api/character/complete?characterId=${characterId}&serverId=${serverId}`;
          const response = await fetch(completeUrl);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || '获取角色完整数据失败');
          }

          const { characterInfo, equipmentData, rating: ratingData, daevanionBoards } = result.data;

          console.log('[阶段2] 完整数据获取成功,更新页面:', {
            hasCharInfo: !!characterInfo,
            hasEquipment: !!equipmentData,
            hasRating: !!ratingData,
            hasDaevanion: !!daevanionBoards,
            equipmentCount: equipmentData?.equipment?.equipmentList?.length || 0
          });

          // 更新为完整数据
          if (!isMounted) return;
          setCharInfo(characterInfo);
          setCharEquip(equipmentData);

          if (ratingData) {
            setRating(ratingData);
          }

          // 保存到缓存（包括完整数据和守护力）
          const cacheData = {
            characterInfo,
            equipmentData,
            rating: ratingData,
            daevanionBoards: daevanionBoards || null, // 保存守护力数据
            timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          // 同时保存到 ref,用于装备详情和攻击力计算等功能
          cachedCompleteDataRef.current = cacheData;
          // 标记阶段2已完成
          setStage2Complete(true);
          console.log('[阶段2] 角色完整数据已缓存(包括守护力)');
        } catch (e) {
          console.error('[完整数据] 加载分享角色数据失败', e);
        }
        // setLoading(false); // 移除这里的setLoading,因为已经在阶段1设置了
      };

      loadSharedData();
      return () => {
        isMounted = false; // 组件卸载时设置标记
      };
    }

    // 否则按原来的方式加载军团成员数据
    if (!id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // 加载成员配置 (添加时间戳防止缓存)
        const configRes = await fetch(`/data/members.json?t=${Date.now()}`);
        if (configRes.ok) {
          const configs: MemberConfig[] = await configRes.json();
          const config = configs.find(c => c.id === id);
          if (!isMounted) return;
          setMemberConfig(config || { id, role: 'member' });
        } else {
          if (!isMounted) return;
          setMemberConfig({ id, role: 'member' });
        }

        // 加载角色数据 (添加时间戳防止缓存)
        const timestamp = Date.now();
        const [infoRes, equipRes] = await Promise.all([
          fetch(`/data/${id}/character_info.json?t=${timestamp}`),
          fetch(`/data/${id}/equipment_details.json?t=${timestamp}`)
        ]);

        if (!isMounted) return;
        if (infoRes.ok) {
          setCharInfo(await infoRes.json());
        }
        if (equipRes.ok) {
          setCharEquip(await equipRes.json());
        }
      } catch (e) {
        console.error('加载角色数据失败', e);
      }
      if (!isMounted) return;
      setLoading(false);
    };

    loadData();
    return () => {
      isMounted = false; // 组件卸载时设置标记
    };
  }, [id, serverId, characterId, isFromCharacterBD, isFromShare, characterData]);

  // 加载PVE评分数据
  useEffect(() => {
    const loadRating = async () => {
      if (!charInfo?.profile?.characterId || !charInfo?.profile?.serverId) {
        return;
      }

      // 如果已经加载过评分,跳过
      if (ratingLoadedRef.current) {
        return;
      }

      // 如果是分享链接且已经有评分数据(从完整API获取),则跳过
      if (isFromShare && rating) {
        console.log('[评分] 已从完整数据API获取,跳过单独加载');
        ratingLoadedRef.current = true;
        return;
      }

      setRatingLoading(true);

      try {
        // 优先从本地文件读取评分数据(仅军团成员)
        if (isFromMember && id) {
          try {
            const timestamp = Date.now();
            const localResponse = await fetch(`/data/${id}/score.json?t=${timestamp}`);

            if (localResponse.ok) {
              const localRating = await localResponse.json();
              setRating(localRating);
              ratingLoadedRef.current = true;
              setRatingLoading(false);
              return;
            }
          } catch (error) {
            console.log('本地评分文件不存在,尝试从API获取');
          }
        }

        // 角色BD查询: 使用缓存
        if (isFromCharacterBD) {
          // 评分缓存键
          const ratingCacheKey = `rating_${charInfo.profile.serverId}_${charInfo.profile.characterId}`;
          const cached = localStorage.getItem(ratingCacheKey);

          // 检查缓存是否有效（8小时内）
          if (cached) {
            try {
              const cacheData = JSON.parse(cached);
              const now = Date.now();
              const eightHours = 8 * 60 * 60 * 1000;

              if (now - cacheData.timestamp < eightHours) {
                console.log('[评分缓存] 使用缓存数据');
                setRating(cacheData.rating);
                ratingLoadedRef.current = true;
                setRatingLoading(false);
                return;
              }
            } catch (e) {
              console.log('[评分缓存] 缓存解析失败');
            }
          }
        }

        // 本地文件不存在或缓存失效,从API获取
        const response = await fetch(
          `/api/character/rating?characterId=${encodeURIComponent(charInfo.profile.characterId)}&serverId=${charInfo.profile.serverId}`
        );
        const data = await response.json();

        if (data.success && data.rating) {
          setRating(data.rating);
          ratingLoadedRef.current = true;

          // 保存到缓存(仅角色BD查询)
          if (isFromCharacterBD) {
            const ratingCacheKey = `rating_${charInfo.profile.serverId}_${charInfo.profile.characterId}`;
            localStorage.setItem(ratingCacheKey, JSON.stringify({
              rating: data.rating,
              timestamp: Date.now()
            }));
            console.log('[评分缓存] 已缓存评分数据');
          }
        }
      } catch (error) {
        console.error('加载PVE评分失败:', error);
      } finally {
        setRatingLoading(false);
      }
    };

    loadRating();
  }, [charInfo, id, isFromMember, isFromCharacterBD, isFromShare, rating]);

  // 计算攻击力
  useEffect(() => {
    const calculatePower = async () => {
      if (!charInfo || !charEquip) {
        return;
      }

      // 分享链接/角色查询: 等待阶段2完成后再计算攻击力(确保守护力数据已加载)
      if ((isFromShare || isFromCharacterBD) && !stage2Complete) {
        console.log('[攻击力计算] 等待阶段2完整数据加载完成...');
        return;
      }

      setAttackPowerLoading(true);

      try {
        // 获取守护力数据(用于攻击力计算)
        let daevanionBoardsData = null;

        if (isFromMember && id) {
          // 军团成员: 从本地文件读取
          try {
            const timestamp = Date.now();
            const daevanionRes = await fetch(`/data/${id}/daevanion_boards.json?t=${timestamp}`);
            if (daevanionRes.ok) {
              daevanionBoardsData = await daevanionRes.json();
              console.log('[攻击力计算] 成功加载守护力数据,面板数量:', daevanionBoardsData?.length || 0);
            } else {
              console.log('[攻击力计算] 守护力文件不存在');
            }
          } catch (error) {
            console.log('[攻击力计算] 守护力数据读取失败:', error);
          }
        } else if (isFromShare) {
          // 分享链接: 从缓存的完整数据中获取守护力(已在阶段2加载)
          try {
            const decodedCharacterId = decodeURIComponent(characterId!);
            const cacheKey = `character_complete_${serverId}_${decodedCharacterId}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
              const cacheData = JSON.parse(cached);
              if (cacheData.daevanionBoards) {
                daevanionBoardsData = cacheData.daevanionBoards;
                console.log('[攻击力计算] 从缓存中获取守护力数据,面板数量:', daevanionBoardsData?.length || 0);
              } else {
                console.log('[攻击力计算] 缓存中没有守护力数据');
              }
            } else {
              console.log('[攻击力计算] 未找到缓存数据');
            }
          } catch (error) {
            console.log('[攻击力计算] 守护力数据获取失败:', error);
          }
        } else if (isFromCharacterBD) {
          // 角色BD查询: 从characterData中获取守护力数据
          try {
            if (characterData?.daevanionBoards) {
              daevanionBoardsData = characterData.daevanionBoards;
              console.log('[攻击力计算] 从characterData获取守护力数据,面板数量:', daevanionBoardsData?.length || 0);
            } else {
              console.log('[攻击力计算] characterData中没有守护力数据');
            }
          } catch (error) {
            console.log('[攻击力计算] 守护力数据获取失败:', error);
          }
        }

        console.log('[攻击力计算] 守护力数据:', daevanionBoardsData ? '已加载' : '未加载');
        console.log('[攻击力计算] 装备数量:', equipment.length);
        console.log('[攻击力计算] charInfo存在:', !!charInfo);

        // 准备计算数据 - 直接传入equipment数组
        const equipmentData = {
          equipment: {
            equipmentList: equipment
          }
        };

        // 计算攻击力
        const result = calculateAttackPower(equipmentData, charInfo, daevanionBoardsData);
        console.log('[攻击力计算] 计算结果:', result);
        setAttackPower(result);
      } catch (error) {
        console.error('攻击力计算失败:', error);
      }

      setAttackPowerLoading(false);
    };

    calculatePower();
  }, [charInfo, charEquip, equipment, isFromMember, isFromCharacterBD, isFromShare, id, serverId, characterId, characterData, stage2Complete]);

  // 保存到查询历史（仅角色BD查询/分享链接）
  useEffect(() => {
    if (!charInfo?.profile || (!isFromCharacterBD && !isFromShare)) {
      return;
    }

    // 保存到历史记录
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      const history: SearchHistory[] = stored ? JSON.parse(stored) : [];

      const newHistory: SearchHistory = {
        characterId: charInfo.profile.characterId,
        characterName: charInfo.profile.characterName,
        serverId: charInfo.profile.serverId,
        serverLabel: charInfo.profile.serverName,
        level: charInfo.profile.characterLevel,
        race: charInfo.profile.raceId,
        profileImage: charInfo.profile.profileImage,
        timestamp: Date.now()
      };

      // 去重并添加到历史记录最前面
      const filtered = history.filter(
        h => !(h.characterName === newHistory.characterName && h.serverId === newHistory.serverId)
      );
      const updated = [newHistory, ...filtered].slice(0, MAX_HISTORY_ITEMS);

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      console.log('[查询历史] 已保存角色到查询历史');
    } catch (error) {
      console.error('保存查询历史失败:', error);
    }
  }, [charInfo, isFromCharacterBD, isFromShare]);

  if (loading) {
    return (
      <div className="member-detail">
        <div className="member-detail__loading">
          <div className="member-detail__spinner"></div>
          <p>载入角色数据中...</p>
        </div>
      </div>
    );
  }

  if (!charInfo) {
    return (
      <div className="member-detail">
        <div className="member-detail__not-found">
          <h2>未找到该{isFromCharacterBD ? '角色' : '成员'}</h2>
          <Link to={isFromCharacterBD ? "/" : "/legion"} className="member-detail__back-btn">
            返回{isFromCharacterBD ? '首页' : '军团页面'}
          </Link>
        </div>
      </div>
    );
  }

  const profile = charInfo.profile;
  const stats = charInfo.stat?.statList || [];
  const rankings = charInfo.ranking?.rankingList?.filter(r => r.rank !== null) || [];

  // 分享功能
  const handleShare = () => {
    if (!profile.characterId || !profile.serverId) {
      alert('无法获取角色信息');
      return;
    }

    // 生成分享链接
    const url = isFromShare
      ? window.location.href
      : `${window.location.origin}${window.location.pathname}#/character/${profile.serverId}/${encodeURIComponent(profile.characterId)}`;

    setShareUrl(url);
    setShowShareDialog(true);
  };

  // 确认分享 - 复制到剪贴板
  const confirmShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowShareDialog(false);
      alert('分享链接已复制到剪贴板！');
    }).catch(() => {
      // 降级方案：显示链接让用户手动复制
      setShowShareDialog(false);
      prompt('复制以下链接分享:', shareUrl);
    });
  };

  // 刷新角色数据
  const handleRefresh = async () => {
    // 检查冷却时间（10分钟）
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    if (lastRefreshTime && now - lastRefreshTime < tenMinutes) {
      const remainingSeconds = Math.ceil((tenMinutes - (now - lastRefreshTime)) / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      setRefreshDialogTitle('刷新冷却中');
      setRefreshDialogMessage(`请等待 ${minutes}分${seconds}秒 后再试`);
      setShowRefreshDialog(true);
      return;
    }

    // 重置评分加载标记,允许重新加载评分
    ratingLoadedRef.current = false;

    // 开始刷新
    setRefreshing(true);
    setLastRefreshTime(now);

    try {
      // 获取角色ID和服务器ID
      let targetServerId: number | undefined;
      let targetCharacterId: string | undefined;

      if (isFromMember) {
        // 军团成员:从 charInfo 获取
        targetServerId = charInfo?.profile?.serverId;
        targetCharacterId = charInfo?.profile?.characterId;
      } else if (isFromShare) {
        // 分享链接:从 URL 参数获取,需要解码
        targetServerId = Number(serverId);
        targetCharacterId = decodeURIComponent(characterId!);
      } else if (isFromCharacterBD) {
        // 角色BD查询:从 characterData 获取
        targetServerId = characterData?.info?.profile?.serverId;
        targetCharacterId = characterData?.info?.profile?.characterId;
      }

      if (!targetServerId || !targetCharacterId) {
        setRefreshDialogTitle('刷新失败');
        setRefreshDialogMessage('无法获取角色信息');
        setShowRefreshDialog(true);
        setRefreshing(false);
        return;
      }

      // 清除缓存
      const cacheKey = `character_${targetServerId}_${targetCharacterId}`;
      const completeCacheKey = `character_complete_${targetServerId}_${targetCharacterId}`;
      const ratingCacheKey = `rating_${targetServerId}_${targetCharacterId}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(completeCacheKey);
      localStorage.removeItem(ratingCacheKey);

      // 根据来源执行不同的刷新逻辑
      if (isFromMember && id) {
        // 军团成员:调用后端API同步数据到文件
        console.log('军团成员刷新:调用同步API保存数据到文件...');

        const syncResponse = await fetch('/api/sync/member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,  // 成员ID,用于创建文件夹路径
            characterId: targetCharacterId,
            serverId: targetServerId,
            name: charInfo?.profile?.characterName || id
          })
        });

        const syncData = await syncResponse.json();

        if (!syncData.success) {
          throw new Error(syncData.error || '同步失败');
        }

        console.log('数据同步成功,重新从文件加载...');

        // 同步成功后,重新从文件加载数据
        const timestamp = Date.now();
        const [infoRes, equipRes] = await Promise.all([
          fetch(`/data/${id}/character_info.json?t=${timestamp}`),
          fetch(`/data/${id}/equipment_details.json?t=${timestamp}`)  // 修正:使用 equipment_details.json
        ]);

        const [infoData, equipmentData] = await Promise.all([
          infoRes.json(),
          equipRes.json()
        ]);

        setCharInfo(infoData);
        setCharEquip(equipmentData);

        // 重新加载评分（添加refresh=true强制刷新）
        setRatingLoading(true);
        const ratingResponse = await fetch(
          `/api/character/rating?characterId=${encodeURIComponent(targetCharacterId)}&serverId=${targetServerId}&refresh=true`
        );
        const ratingData = await ratingResponse.json();

        if (ratingData.success && ratingData.rating) {
          setRating(ratingData.rating);
          localStorage.setItem(ratingCacheKey, JSON.stringify({
            rating: ratingData.rating,
            timestamp: Date.now()
          }));
        }
        setRatingLoading(false);
      } else {
        // 角色查询/分享链接:使用完整数据API刷新
        console.log('[刷新] 角色查询刷新:使用完整数据API...');

        const completeUrl = `/api/character/complete?characterId=${targetCharacterId}&serverId=${targetServerId}`;
        const response = await fetch(completeUrl);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || '获取角色数据失败');
        }

        const { characterInfo, equipmentData, rating: ratingData, daevanionBoards } = result.data;

        setCharInfo(characterInfo);
        setCharEquip(equipmentData);

        if (ratingData) {
          setRating(ratingData);
        }

        // 重新缓存完整数据
        const cacheKey = `character_complete_${targetServerId}_${targetCharacterId}`;
        const cacheData = {
          characterInfo,
          equipmentData,
          rating: ratingData,
          daevanionBoards,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('[刷新] 完整数据已更新并重新缓存');
      }

      // 刷新成功提示
      setRefreshDialogTitle('刷新成功');
      setRefreshDialogMessage('角色数据已更新');
      setShowRefreshDialog(true);
    } catch (error) {
      console.error('刷新失败:', error);
      setRefreshDialogTitle('刷新失败');
      setRefreshDialogMessage(error instanceof Error ? error.message : '请稍后重试');
      setShowRefreshDialog(true);
    } finally {
      setRefreshing(false);
    }
  };

  // 打开守护力面板
  const handleShowDaevanion = async () => {
    setShowDaevanionModal(true);
    setDaevanionLoading(true);
    setDaevanionEffects(null);

    try {
      let boards: DaevanionBoards | null = null;

      if (isFromMember && id) {
        // 军团成员: 从本地文件加载
        boards = await loadMemberDaevanion(id);
      } else if (isFromShare || isFromCharacterBD) {
        // 分享链接/角色查询: 优先使用缓存的完整数据中的守护力
        if (cachedCompleteDataRef.current?.daevanionBoards) {
          console.log('[守护力] 使用缓存的守护力数据,无需重新请求');
          boards = cachedCompleteDataRef.current.daevanionBoards;
        } else if (charInfo?.profile?.characterId && charInfo?.profile?.serverId) {
          // 缓存中没有,才从API加载
          console.log('[守护力] 缓存中没有守护力数据,从API获取');
          const chineseClassName = charInfo.profile.className;

          if (chineseClassName) {
            const classId = await getClassIdByChineseName(chineseClassName);

            console.log('[守护力] 准备加载守护力数据:', {
              characterId: charInfo.profile.characterId,
              serverId: charInfo.profile.serverId,
              chineseClassName: chineseClassName,
              mappedClassId: classId,
              classIdType: typeof classId
            });

            if (classId) {
              boards = await fetchDaevanionBoards(
                charInfo.profile.characterId,
                charInfo.profile.serverId,
                classId
              );
              console.log('[守护力] fetchDaevanionBoards 返回结果:', boards);

              // 保存到缓存
              if (boards && cachedCompleteDataRef.current) {
                cachedCompleteDataRef.current.daevanionBoards = boards;
                console.log('[守护力] 守护力数据已保存到缓存');

                // 同时更新 localStorage 缓存
                if (isFromShare && serverId && characterId) {
                  const decodedCharacterId = decodeURIComponent(characterId);
                  const cacheKey = `character_complete_${serverId}_${decodedCharacterId}`;
                  const cached = localStorage.getItem(cacheKey);
                  if (cached) {
                    try {
                      const cacheData = JSON.parse(cached);
                      cacheData.daevanionBoards = boards;
                      cacheData.timestamp = Date.now();
                      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                      console.log('[守护力] 守护力数据已更新到 localStorage');
                    } catch (e) {
                      console.error('[守护力] 更新缓存失败:', e);
                    }
                  }
                }
              }
            } else {
              console.error(`[守护力] 无法映射职业名称 "${chineseClassName}" 到 classId`);
            }
          }
        }
      }

      if (boards) {
        const effects = mergeDaevanionEffects(boards);
        setDaevanionEffects(effects);
      }
    } catch (error) {
      console.error('加载守护力数据失败:', error);
    } finally {
      setDaevanionLoading(false);
    }
  };

  // 根据来源确定返回链接和文字
  const backLink = (isFromCharacterBD || isFromShare) ? "/" : "/legion";
  const backText = (isFromCharacterBD || isFromShare) ? "返回首页" : "返回军团";

  // 兼容旧数据格式(items对象)和新数据格式(equipment/skill/petwing结构)
  // equipment 已在前面定义
  const skills = charEquip?.skill?.skillList?.filter(s => s.acquired === 1) || [];
  const pet = charEquip?.petwing?.pet;
  const wing = charEquip?.petwing?.wing;

  // 基础属性（前6个）
  const baseStats = stats.slice(0, 6);
  // 主要能力值（神力属性）
  const divineStats = stats.slice(6, -1);
  // 装备等级
  const itemLevel = stats.find(s => s.type === 'ItemLevel')?.value || 0;

  // 称号按分类分组
  const titlesByCategory = (charInfo.title?.titleList || []).reduce((acc, title) => {
    const category = title.equipCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(title);
    return acc;
  }, {} as Record<string, TitleItem[]>);

  // 守护力数据
  const daevanionBoards = charInfo.daevanion?.boardList || [];

  // 装备分类
  const gearEquipment = equipment.filter((e: EquipmentItem) => e.slotPosName && !e.slotPosName.startsWith('Arcana'));
  const arcanaEquipment = equipment.filter((e: EquipmentItem) => e.slotPosName && e.slotPosName.startsWith('Arcana'));

  // 技能分类
  const activeSkills = skills.filter(s => s.category === 'Active');
  const passiveSkills = skills.filter(s => s.category === 'Passive');
  const brandSkills = skills.filter(s => s.category === 'Dp'); // 烙印技能（原DP技能）

  const renderEquipItem = (item: EquipmentItem) => {
    console.log('[MemberDetailPage] renderEquipItem 渲染装备:', item.id, '当前 charInfo:', charInfo?.profile);

    // 获取对应的外观
    const skin = skinsBySlot[item.slotPosName];

    const handleEquipClick = (e: React.MouseEvent) => {
      // 移动端：点击触发详情
      if (isTouchDevice) {
        console.log('[MemberDetailPage] 移动端点击事件:', {
          equipmentId: item.id,
          equipmentItem: item,
          characterId: charInfo?.profile?.characterId,
          serverId: charInfo?.profile?.serverId,
          charInfo: charInfo
        });
        handleClick(e, item.id, item, charInfo?.profile?.characterId, charInfo?.profile?.serverId);
      }
      // 桌面端：点击已由悬浮处理，这里不做额外操作
    };

    const handleEquipMouseEnter = (e: React.MouseEvent) => {
      handleMouseEnter(e, item.id);

      // 桌面端：悬浮 500ms 后触发详情
      if (!isTouchDevice) {
        // 清除之前的定时器
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }
        // 保存元素引用，因为 setTimeout 中事件对象会被回收，currentTarget 会变成 null
        const targetElement = e.currentTarget as HTMLElement;
        hoverTimerRef.current = window.setTimeout(() => {
          console.log('[MemberDetailPage] 桌面端悬浮触发详情:', {
            equipmentId: item.id,
            equipmentItem: item,
            characterId: charInfo?.profile?.characterId,
            serverId: charInfo?.profile?.serverId
          });
          // 创建一个模拟事件对象，包含保存的元素引用
          const syntheticEvent = { currentTarget: targetElement } as unknown as React.MouseEvent;
          handleClick(syntheticEvent, item.id, item, charInfo?.profile?.characterId, charInfo?.profile?.serverId);
        }, 150);
      }
    };

    const handleEquipMouseLeave = () => {
      handleMouseLeave();
      // 鼠标离开装备图标时，同时关闭详情弹窗
      handleCloseModal();

      // 清除悬浮定时器
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };

    return (
      <div
        key={`${item.slotPos}-${item.id}`}
        className="equip-card"
        style={{ '--grade-color': gradeColors[item.grade] || '#9d9d9d', cursor: 'pointer' } as React.CSSProperties}
        onMouseEnter={handleEquipMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleEquipMouseLeave}
        onClick={handleEquipClick}
      >
        <img src={item.icon} alt={item.name} className="equip-card__icon" />
        <div className="equip-card__info">
          <span className="equip-card__name" style={{ color: gradeColors[item.grade] || '#9d9d9d' }}>
            {item.name}
          </span>
          <div className="equip-card__level">
            {(() => {
              const maxEnchant = item.maxEnchantLevel || 15;
              const exceedLevel = item.exceedLevel !== undefined
                ? item.exceedLevel
                : Math.max(0, item.enchantLevel - maxEnchant);
              const baseLevel = item.enchantLevel - exceedLevel;

              return (
                <>
                  +{baseLevel}
                  {exceedLevel > 0 && (
                    <ExceedLevel level={exceedLevel} variant="compact" />
                  )}
                </>
              );
            })()}
          </div>
        </div>
        {/* 外观图标 - 如果该部位有外观则显示 */}
        {/* 阻止事件冒泡，让外观图标区域不触发装备详情弹窗，显示原生title提示 */}
        {skin && (
          <img
            src={skin.icon}
            alt={skin.name}
            className="equip-card__skin-icon"
            style={{ borderColor: `color-mix(in srgb, ${gradeColors[skin.grade] || '#9d9d9d'} 50%, transparent)` }}
            title={`外观: ${skin.name}`}
            onMouseEnter={(e) => {
              e.stopPropagation();
              // 清除装备详情的悬浮定时器
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
              }
              // 关闭装备详情弹窗
              handleCloseModal();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    );
  };

  return (
    <div className="member-detail">
      {/* 顶部横幅 */}
      <div className="member-hero">
        <div className="member-hero__bg"></div>
        <div className="member-hero__content">
          <div className="member-hero__top-bar">
            <Link to={backLink} className="member-hero__back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {backText}
            </Link>
            <div className="member-hero__actions">
              {/* 刷新按钮 */}
              <button
                onClick={handleRefresh}
                className="member-hero__refresh-btn"
                disabled={refreshing}
                title="刷新角色数据（10分钟冷却）"
                aria-label="刷新角色数据"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="18"
                  height="18"
                  className={refreshing ? 'spinning' : ''}
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
              </button>
              {/* 分享按钮 */}
              <button onClick={handleShare} className="member-hero__share-btn" aria-label="分享角色" title="分享角色">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="member-hero__profile">
            <div className="member-hero__avatar">
              <img src={profile.profileImage || '/default-avatar.png'} alt={profile.characterName} />
              <div className="member-hero__item-level">
                <span className="member-hero__il-label">装备等级</span>
                <span className="member-hero__il-value">{itemLevel}</span>
              </div>
            </div>
            <div className="member-hero__info">
              <div className="member-hero__name-row">
                <h1 className="member-hero__name">{profile.characterName}</h1>
                {profile.titleName && (
                  <span className={`member-hero__title member-hero__title--${profile.titleGrade?.toLowerCase() || 'normal'}`}>
                    「{profile.titleName}」
                  </span>
                )}
              </div>
              <div className="member-hero__meta">
                <span className="member-hero__level">Lv.{profile.characterLevel}</span>
                <span className="member-hero__divider">|</span>
                <span className="member-hero__race">{profile.raceName}</span>
                <span className="member-hero__divider">|</span>
                <span className="member-hero__server">{profile.serverName}</span>
                {profile.regionName && (
                  <>
                    <span className="member-hero__divider">|</span>
                    <span className="member-hero__region">{profile.regionName}</span>
                  </>
                )}
              </div>

              {/* 评分和攻击力容器 */}
              <div className="member-hero__stats-row">
                {/* PVE评分显示 */}
                {ratingLoading ? (
                  <div className="member-hero__rating-loading">
                    <span className="member-hero__rating-spinner"></span>
                    <span>评分计算中...</span>
                  </div>
                ) : rating ? (
                  <div className="member-hero__rating">
                    <span className="member-hero__rating-label">PVE评分:</span>
                    <span className="member-hero__rating-value">{Math.floor(rating.scores.score)}</span>
                  </div>
                ) : null}

                {/* 攻击力显示 */}
                {attackPowerLoading ? (
                  <div className="member-hero__attack-loading">
                    <span className="member-hero__attack-label">攻击力:</span>
                    <span className="member-hero__attack-spinner"></span>
                    <span>计算中,请耐心等待</span>
                  </div>
                ) : attackPower ? (
                  <div className="member-hero__attack">
                    <span className="member-hero__attack-label">攻击力:</span>
                    <span className="member-hero__attack-value">{attackPower.finalPower}</span>
                    <button
                      className="member-hero__attack-info"
                      onClick={() => setShowAttackPowerModal(true)}
                      title="查看攻击力来源统计"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.5 12h-1v-1h1v1zm0-2h-1V4h1v6z"/>
                      </svg>
                    </button>
                  </div>
                ) : (isFromShare || isFromCharacterBD) ? (
                  <div className="member-hero__attack-loading">
                    <span className="member-hero__attack-label">攻击力:</span>
                    <span className="member-hero__attack-spinner"></span>
                    <span>计算中,请耐心等待</span>
                  </div>
                ) : null}
              </div>

              {/* 提示信息 */}
              {attackPower && (
                <div className="member-hero__attack-note">
                  基于算法计算可能存在误差,仅供参考,缺少:宠物加成、服装、翅膀、被动技能
                </div>
              )}
            </div>
            <div className="member-hero__class-wrapper">
              <img
                src={classIcons[profile.className] || classIcons['劍星']}
                alt={profile.className}
                className="member-hero__class-icon"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 - 三栏布局 */}
      <div className="member-content">
        {/* 左侧边栏 - 属性 + 阿尔卡那 */}
        <aside className="member-sidebar member-sidebar--left">
          <div className="stat-panel">
            <h3 className="stat-panel__title">基础属性</h3>
            <div className="stat-panel__grid">
              {baseStats.map((stat, idx) => (
                <div
                  key={idx}
                  className="stat-item"
                  title={stat.statSecondList?.join('\n') || ''}
                >
                  <span className="stat-item__name">{stat.name}</span>
                  <span className="stat-item__value">{stat.value}</span>
                  {stat.statSecondList && stat.statSecondList.length > 0 && (
                    <div className="stat-item__tooltip">
                      {stat.statSecondList.map((desc, i) => (
                        <div key={i}>{desc}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="stat-panel">
            <h3 className="stat-panel__title">主要能力值</h3>
            <div className="stat-panel__list">
              {divineStats.map((stat, idx) => (
                <div key={idx} className="divine-stat">
                  <div className="divine-stat__header">
                    <span className="divine-stat__name">{stat.name}</span>
                    <span className="divine-stat__value">{stat.value}</span>
                  </div>
                  <div className="divine-stat__bar">
                    <div
                      className="divine-stat__fill"
                      style={{ width: `${Math.min((stat.value / 200) * 100, 100)}%` }}
                    ></div>
                  </div>
                  {stat.statSecondList && stat.statSecondList.length > 0 && (
                    <div className="divine-stat__desc">
                      {stat.statSecondList.map((desc, i) => (
                        <span key={i}>{desc}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 守护力 */}
          {daevanionBoards.length > 0 && (
            <div className="stat-panel">
              <div className="stat-panel__header">
                <h3 className="stat-panel__title">守护力</h3>
                <button
                  className="stat-panel__action-btn"
                  onClick={handleShowDaevanion}
                  title="查看面板效果"
                >
                  查看面板效果
                </button>
              </div>
              <div className="daevanion-list">
                {daevanionBoards.map((board) => {
                  const boardColor = getDaevanionColor(board.id);
                  return (
                    <div key={board.id} className="daevanion-item">
                      <img src={board.icon} alt={board.name} className="daevanion-item__icon" />
                      <div className="daevanion-item__info">
                        <span className="daevanion-item__name" style={{ color: boardColor }}>{board.name}</span>
                        <span className="daevanion-item__progress" style={{ color: boardColor }}>
                          {board.openNodeCount}/{board.totalNodeCount}
                        </span>
                      </div>
                      <div className="daevanion-item__bar">
                        <div
                          className="daevanion-item__fill"
                          style={{
                            width: `${(board.openNodeCount / board.totalNodeCount) * 100}%`,
                            background: `linear-gradient(90deg, ${boardColor}80, ${boardColor})`
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* 中间主区域 */}
        <main className="member-main">
          {/* 装备面板 - 直接展示 */}
          <div className="equipment-panel">
            {/* 主装备 */}
            <section className="equip-section">
              <h4 className="equip-section__title">武器/防具/首饰</h4>
              <div className="equip-section__grid">
                {gearEquipment.map(renderEquipItem)}
              </div>
            </section>
          </div>

          {/* 技能面板 - 直接展示 */}
          <div className="skills-panel">
            {/* 主动技能 */}
            {activeSkills.length > 0 && (
              <section className="skill-section">
                <h4 className="skill-section__title">主动技能</h4>
                <div className="skill-section__grid">
                  {activeSkills.map((skill, idx) => (
                    <div key={idx} className="skill-card">
                      <img src={skill.icon} alt={skill.name} className="skill-card__icon" />
                      <div className="skill-card__info">
                        <span className="skill-card__name">{skill.name}</span>
                        <span className="skill-card__level">Lv.{skill.skillLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 被动技能 */}
            {passiveSkills.length > 0 && (
              <section className="skill-section">
                <h4 className="skill-section__title">被动技能</h4>
                <div className="skill-section__grid">
                  {passiveSkills.map((skill, idx) => (
                    <div key={idx} className="skill-card skill-card--passive">
                      <img src={skill.icon} alt={skill.name} className="skill-card__icon" />
                      <div className="skill-card__info">
                        <span className="skill-card__name">{skill.name}</span>
                        <span className="skill-card__level">Lv.{skill.skillLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 烙印技能 */}
            {brandSkills.length > 0 && (
              <section className="skill-section">
                <h4 className="skill-section__title">烙印技能</h4>
                <div className="skill-section__grid">
                  {brandSkills.map((skill, idx) => (
                    <div
                      key={idx}
                      className={`skill-card skill-card--brand ${skill.equip ? 'skill-card--equipped' : ''}`}
                    >
                      <img src={skill.icon} alt={skill.name} className="skill-card__icon" />
                      <div className="skill-card__info">
                        <span className="skill-card__name">{skill.name}</span>
                        <span className="skill-card__level">Lv.{skill.skillLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 阿尔卡那 - 放在烙印技能下面 */}
            {arcanaEquipment.length > 0 && (
              <section className="equip-section">
                <h4 className="equip-section__title">阿尔卡那</h4>
                <div className="equip-section__grid">
                  {arcanaEquipment.map(renderEquipItem)}
                </div>
              </section>
            )}
          </div>
        </main>

        {/* 右侧边栏 - 排行榜 + 称号 + 宠物/翅膀 */}
        <aside className="member-sidebar member-sidebar--right">
          {rankings.length > 0 && (
            <div className="ranking-panel">
              <h3 className="ranking-panel__title">排行榜</h3>
              <div className="ranking-panel__list">
                {rankings.map((rank, idx) => (
                  <div key={idx} className="ranking-item">
                    {rank.gradeIcon && (
                      <img src={rank.gradeIcon} alt={rank.gradeName || ''} className="ranking-item__icon" />
                    )}
                    <div className="ranking-item__info">
                      <span className="ranking-item__name">{rank.rankingContentsName}</span>
                      <span className="ranking-item__grade">{rank.gradeName}</span>
                    </div>
                    <div className="ranking-item__stats">
                      <div className="ranking-item__rank">
                        第{rank.rank?.toLocaleString() || '-'}名
                        {/* 名次变化提示 */}
                        {rank.rankChange !== null && rank.rankChange !== undefined && rank.rankChange !== 0 && (
                          <span className={`ranking-item__change ${rank.rankChange < 0 ? 'ranking-item__change--up' : 'ranking-item__change--down'}`}>
                            {rank.rankChange < 0 ? '↑' : '↓'}
                            {Math.abs(rank.rankChange)}
                          </span>
                        )}
                      </div>
                      {rank.point !== null && rank.point !== undefined && (
                        <div className="ranking-item__point">
                          {rank.point.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 称号 */}
          {charInfo.title?.titleList && charInfo.title.titleList.length > 0 && (
            <div className="title-panel">
              <h3 className="title-panel__header">
                <span className="title-panel__title">称号</span>
                <span className="title-panel__count">{charInfo.title.ownedCount}/{charInfo.title.totalCount}</span>
              </h3>
              <div className="title-panel__categories">
                {['Attack', 'Defense', 'Etc'].map((category) => {
                  const title = titlesByCategory[category]?.[0];
                  if (!title) return null;
                  const titleColor = gradeColors[title.grade] || '#9d9d9d';
                  return (
                    <div key={category} className="title-category">
                      <div className="title-category__header">
                        <div className="title-category__header-left">
                          <img
                            src={titleCategoryIcons[category]}
                            alt={titleCategoryNames[category]}
                            className="title-category__icon"
                          />
                          <span className="title-category__name">{titleCategoryNames[category]}</span>
                        </div>
                        <span className="title-category__progress">{title.ownedCount}/{title.totalCount}</span>
                      </div>
                      <div className="title-category__card" style={{ '--title-color': titleColor } as React.CSSProperties}>
                        <span className="title-category__title-name" style={{ color: titleColor }}>{title.name}</span>
                        <div className="title-category__stats">
                          {(title.equipStatList || []).map((stat, i) => (
                            <span key={i} className="title-category__stat">{stat.desc}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 宠物/翅膀 */}
          {(pet || wing) && (
            <div className="sidebar-panel">
              <h3 className="sidebar-panel__title">宠物 / 翅膀</h3>
              <div className="sidebar-panel__content">
                {pet && (
                  <div className="sidebar-petwing">
                    <img src={pet.icon} alt={pet.name} className="sidebar-petwing__icon" />
                    <div className="sidebar-petwing__info">
                      <span className="sidebar-petwing__type">宠物</span>
                      <span className="sidebar-petwing__name">{pet.name}</span>
                      <span className="sidebar-petwing__level">Lv.{pet.level}</span>
                    </div>
                  </div>
                )}
                {wing && (
                  <div className="sidebar-petwing" style={{ '--grade-color': gradeColors[wing.grade] || '#9d9d9d' } as React.CSSProperties}>
                    <img src={wing.icon} alt={wing.name} className="sidebar-petwing__icon" />
                    <div className="sidebar-petwing__info">
                      <span className="sidebar-petwing__type">翅膀</span>
                      <span className="sidebar-petwing__name" style={{ color: gradeColors[wing.grade] }}>
                        {wing.name}
                      </span>
                      <span className="sidebar-petwing__level">+{wing.enchantLevel}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </aside>
      </div>

      {/* 装备悬浮提示 */}
      <EquipmentTooltip
        position={tooltipState.position}
        visible={tooltipState.visible}
      />

      {/* 装备详情模态框 */}
      <EquipmentDetailModal
        equipmentDetail={modalState.equipmentDetail}
        visible={modalState.visible}
        loading={modalState.loading}
        position={modalState.position}
      />

      {/* 分享确认框 */}
      <ConfirmDialog
        visible={showShareDialog}
        title="分享角色"
        message="确认复制分享链接到剪贴板？"
        confirmText="复制链接"
        cancelText="取消"
        onConfirm={confirmShare}
        onCancel={() => setShowShareDialog(false)}
      />

      {/* 刷新提示框 */}
      <ConfirmDialog
        visible={showRefreshDialog}
        title={refreshDialogTitle}
        message={refreshDialogMessage}
        confirmText="确定"
        onConfirm={() => setShowRefreshDialog(false)}
        onCancel={() => setShowRefreshDialog(false)}
      />

      {/* 守护力面板弹窗 */}
      <DaevanionModal
        visible={showDaevanionModal}
        loading={daevanionLoading}
        effects={daevanionEffects}
        onClose={() => setShowDaevanionModal(false)}
      />

      {/* 攻击力来源统计弹窗 */}
      <AttackPowerModal
        isOpen={showAttackPowerModal}
        onClose={() => setShowAttackPowerModal(false)}
        attackPowerData={attackPower}
      />
    </div>
  );
};

export default MemberDetailPage;
