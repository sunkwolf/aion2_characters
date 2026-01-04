import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { gradeColors, classIcons } from '../data/memberTypes';
import type { CharacterInfo, CharacterEquipment, EquipmentItem, TitleItem } from '../data/memberTypes';
import type { Rating } from '../types/admin';
import EquipmentTooltip from '../components/EquipmentTooltip';
import EquipmentDetailModal from '../components/EquipmentDetailModal';
import ExceedLevel from '../components/ExceedLevel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useEquipmentTooltip } from '../hooks/useEquipmentTooltip';
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
  const [activeTab, setActiveTab] = useState<'equipment' | 'skills'>('equipment');
  const [rating, setRating] = useState<Rating | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // 准备装备列表数据
  // 角色BD查询: 直接从 characterData 获取
  // 分享链接/军团成员: 从 state 获取
  const equipment = isFromCharacterBD
    ? (characterData?.equipment?.equipment?.equipmentList || [])
    : (charEquip?.equipment?.equipmentList || []);

  // 装备悬浮提示和详情模态框
  const { tooltipState, modalState, handleMouseEnter, handleMouseMove, handleMouseLeave, handleClick, handleCloseModal } = useEquipmentTooltip(
    isFromCharacterBD || isFromShare
      ? {
          characterId: isFromShare ? characterId : characterData?.info?.profile?.characterId,
          serverId: isFromShare ? Number(serverId) : characterData?.info?.profile?.serverId,
          equipmentList: equipment
        }
      : { memberId: id || '' }
  );

  useEffect(() => {
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

    // 如果是分享链接，从API加载数据（支持4小时缓存）
    if (isFromShare && serverId && characterId) {
      const loadSharedData = async () => {
        try {
          const cacheKey = `character_${serverId}_${characterId}`;
          const cached = localStorage.getItem(cacheKey);

          // 检查缓存是否有效（8小时内）
          if (cached) {
            try {
              const cacheData = JSON.parse(cached);
              const cacheTime = cacheData.timestamp || 0;
              const now = Date.now();
              const eightHours = 8 * 60 * 60 * 1000; // 8小时的毫秒数

              if (now - cacheTime < eightHours) {
                console.log('使用缓存的角色数据');
                setCharInfo(cacheData.info);
                setCharEquip(cacheData.equipment);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.log('缓存数据解析失败，重新加载');
            }
          }

          // 缓存失效或不存在，从API加载
          const infoUrl = `/api/character/info?characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`;
          const equipUrl = `/api/character/equipment?characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`;

          const [infoResponse, equipmentResponse] = await Promise.all([
            fetch(infoUrl),
            fetch(equipUrl)
          ]);

          const [infoData, equipmentData] = await Promise.all([
            infoResponse.json(),
            equipmentResponse.json()
          ]);

          setCharInfo(infoData);
          setCharEquip(equipmentData);

          // 保存到缓存
          const cacheData = {
            info: infoData,
            equipment: equipmentData,
            timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log('角色数据已缓存');
        } catch (e) {
          console.error('加载分享角色数据失败', e);
        }
        setLoading(false);
      };

      loadSharedData();
      return;
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
          setMemberConfig(config || { id, role: 'member' });
        } else {
          setMemberConfig({ id, role: 'member' });
        }

        // 加载角色数据 (添加时间戳防止缓存)
        const timestamp = Date.now();
        const [infoRes, equipRes] = await Promise.all([
          fetch(`/data/${id}/character_info.json?t=${timestamp}`),
          fetch(`/data/${id}/equipment_details.json?t=${timestamp}`)
        ]);

        if (infoRes.ok) {
          setCharInfo(await infoRes.json());
        }
        if (equipRes.ok) {
          setCharEquip(await equipRes.json());
        }
      } catch (e) {
        console.error('加载角色数据失败', e);
      }
      setLoading(false);
    };

    loadData();
  }, [id, serverId, characterId, isFromCharacterBD, isFromShare, characterData]);

  // 加载PVE评分数据
  useEffect(() => {
    const loadRating = async () => {
      if (!charInfo?.profile?.characterId || !charInfo?.profile?.serverId) {
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
              setRatingLoading(false);
              return;
            }
          } catch (error) {
            console.log('本地评分文件不存在,尝试从API获取');
          }
        }

        // 角色BD查询/分享链接: 使用缓存
        if (isFromCharacterBD || isFromShare) {
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

          // 保存到缓存(仅角色BD查询/分享链接)
          if (isFromCharacterBD || isFromShare) {
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
  }, [charInfo, id, isFromMember, isFromCharacterBD, isFromShare]);

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
          <Link to={isFromCharacterBD ? "/character-bd" : "/legion"} className="member-detail__back-btn">
            返回{isFromCharacterBD ? '角色BD查询' : '军团页面'}
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

  // 刷新角色数据（仅角色BD查询）
  const handleRefresh = async () => {
    // 仅角色BD查询和分享链接可以刷新
    if (!isFromCharacterBD && !isFromShare) {
      return;
    }

    // 检查冷却时间（10分钟）
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    if (lastRefreshTime && now - lastRefreshTime < tenMinutes) {
      const remainingSeconds = Math.ceil((tenMinutes - (now - lastRefreshTime)) / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      alert(`刷新冷却中，请等待 ${minutes}分${seconds}秒 后再试`);
      return;
    }

    // 开始刷新
    setRefreshing(true);
    setLastRefreshTime(now);

    try {
      // 获取角色ID和服务器ID
      const targetServerId = isFromShare ? Number(serverId) : characterData?.info?.profile?.serverId;
      const targetCharacterId = isFromShare ? characterId : characterData?.info?.profile?.characterId;

      if (!targetServerId || !targetCharacterId) {
        alert('无法获取角色信息');
        setRefreshing(false);
        return;
      }

      // 清除缓存
      const cacheKey = `character_${targetServerId}_${targetCharacterId}`;
      const ratingCacheKey = `rating_${targetServerId}_${targetCharacterId}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(ratingCacheKey);

      // 重新加载角色数据
      const infoUrl = `/api/character/info?characterId=${encodeURIComponent(targetCharacterId)}&serverId=${targetServerId}`;
      const equipUrl = `/api/character/equipment?characterId=${encodeURIComponent(targetCharacterId)}&serverId=${targetServerId}`;

      const [infoResponse, equipmentResponse] = await Promise.all([
        fetch(infoUrl),
        fetch(equipUrl)
      ]);

      const [infoData, equipmentData] = await Promise.all([
        infoResponse.json(),
        equipmentResponse.json()
      ]);

      setCharInfo(infoData);
      setCharEquip(equipmentData);

      // 重新缓存
      const cacheData = {
        info: infoData,
        equipment: equipmentData,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // 重新加载评分
      setRatingLoading(true);
      const ratingResponse = await fetch(
        `/api/character/rating?characterId=${encodeURIComponent(targetCharacterId)}&serverId=${targetServerId}`
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

      alert('数据已刷新！');
    } catch (error) {
      console.error('刷新失败:', error);
      alert('刷新失败，请稍后重试');
    } finally {
      setRefreshing(false);
    }
  };

  // 根据来源确定返回链接和文字
  const backLink = (isFromCharacterBD || isFromShare) ? "/character-bd" : "/legion";
  const backText = (isFromCharacterBD || isFromShare) ? "返回查询" : "返回军团";

  // 兼容旧数据格式(items对象)和新数据格式(equipment/skill/petwing结构)
  // equipment 已在前面定义
  const skins = charEquip?.equipment?.skinList || [];
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

    const handleEquipClick = () => {
      console.log('[MemberDetailPage] 装备点击事件:', {
        equipmentId: item.id,
        equipmentItem: item,
        characterId: charInfo?.profile?.characterId,
        serverId: charInfo?.profile?.serverId,
        charInfo: charInfo
      });
      handleClick(item.id, item, charInfo?.profile?.characterId, charInfo?.profile?.serverId);
    };

    return (
      <div
        key={`${item.slotPos}-${item.id}`}
        className="equip-card"
        style={{ '--grade-color': gradeColors[item.grade] || '#9d9d9d', cursor: 'pointer' } as React.CSSProperties}
        onMouseEnter={(e) => handleMouseEnter(e, item.id)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleEquipClick}
      >
        <img src={item.icon} alt={item.name} className="equip-card__icon" />
        <div className="equip-card__info">
          <span className="equip-card__name" style={{ color: gradeColors[item.grade] || '#9d9d9d' }}>
            {item.name}
          </span>
          <div className="equip-card__level">
            {/* 强化等级根据装备的maxEnchantLevel显示(金装15,红装20) */}
            +{Math.min(item.enchantLevel, item.maxEnchantLevel || 15)}
            {/* 超过maxEnchantLevel的部分作为突破等级显示 */}
            {item.enchantLevel > (item.maxEnchantLevel || 15) && (
              <ExceedLevel level={item.enchantLevel - (item.maxEnchantLevel || 15)} variant="compact" />
            )}
          </div>
        </div>
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
              {/* 刷新按钮（仅角色BD查询） */}
              {(isFromCharacterBD || isFromShare) && (
                <button
                  onClick={handleRefresh}
                  className="member-hero__refresh-btn"
                  disabled={refreshing}
                  title="刷新角色数据（10分钟冷却）"
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
                  <span>{refreshing ? '刷新中...' : '刷新数据'}</span>
                </button>
              )}
              {/* 分享按钮 */}
              <button onClick={handleShare} className="member-hero__share-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                <span>分享角色</span>
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
                      style={{ width: `${Math.min(stat.value, 100)}%` }}
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
              <h3 className="stat-panel__title">守护力</h3>
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
          {/* 标签切换 */}
          <div className="member-tabs">
            <button
              className={`member-tabs__btn ${activeTab === 'equipment' ? 'member-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('equipment')}
            >
              装备
            </button>
            <button
              className={`member-tabs__btn ${activeTab === 'skills' ? 'member-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              技能
            </button>
          </div>

          {/* 装备面板 */}
          {activeTab === 'equipment' && (
            <div className="equipment-panel">
              {/* 主装备 */}
              <section className="equip-section">
                <h4 className="equip-section__title">武器/防具/首饰</h4>
                <div className="equip-section__grid">
                  {gearEquipment.map(renderEquipItem)}
                </div>
              </section>

              {/* 阿尔卡那 */}
              {arcanaEquipment.length > 0 && (
                <section className="equip-section">
                  <h4 className="equip-section__title">阿尔卡那</h4>
                  <div className="equip-section__grid">
                    {arcanaEquipment.map(renderEquipItem)}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 技能面板 */}
          {activeTab === 'skills' && (
            <div className="skills-panel">
              {/* 主动技能 - 不显示装备中 */}
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

              {/* 烙印技能 - 显示装备中 */}
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
                        {skill.equip === 1 && <span className="skill-card__badge">装备中</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

        {/* 右侧边栏 - 排行榜 + 称号 + 宠物/翅膀 + 外观 */}
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
                      <div className="title-category__card" style={{ borderColor: titleColor }}>
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

          {/* 外观 */}
          {skins.length > 0 && (
            <div className="sidebar-panel">
              <h3 className="sidebar-panel__title">外观</h3>
              <div className="sidebar-panel__grid">
                {skins.map((item) => (
                  <div
                    key={`${item.slotPos}-${item.id}`}
                    className="sidebar-equip"
                    style={{ '--grade-color': gradeColors[item.grade] || '#9d9d9d' } as React.CSSProperties}
                  >
                    <img src={item.icon} alt={item.name} className="sidebar-equip__icon" />
                    <span className="sidebar-equip__name" style={{ color: gradeColors[item.grade] }}>
                      {item.name}
                    </span>
                  </div>
                ))}
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
        onClose={handleCloseModal}
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
    </div>
  );
};

export default MemberDetailPage;
