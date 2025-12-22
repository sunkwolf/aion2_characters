import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRoleName, gradeColors, classIcons } from '../data/memberTypes';
import type { CharacterInfo, CharacterEquipment, EquipmentItem, TitleItem } from '../data/memberTypes';
import EquipmentTooltip from '../components/EquipmentTooltip';
import EquipmentDetailModal from '../components/EquipmentDetailModal';
import { useEquipmentTooltip } from '../hooks/useEquipmentTooltip';
import './MemberDetailPage.css';

// 成员配置信息
interface MemberConfig {
  id: string;
  role: 'leader' | 'elite' | 'member';
  joinDate?: string;
}

// 称号分类映射
const titleCategoryNames: Record<string, string> = {
  'Attack': '攻擊系列',
  'Defense': '防禦系列',
  'Etc': '其他系列'
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
  const { id } = useParams<{ id: string }>();
  const [charInfo, setCharInfo] = useState<CharacterInfo | null>(null);
  const [charEquip, setCharEquip] = useState<CharacterEquipment | null>(null);
  const [memberConfig, setMemberConfig] = useState<MemberConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'equipment' | 'skills'>('equipment');

  // 装备悬浮提示和详情模态框
  const { tooltipState, modalState, handleMouseEnter, handleMouseMove, handleMouseLeave, handleClick, handleCloseModal } = useEquipmentTooltip(id || '');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // 加载成员配置
        const configRes = await fetch('/data/members.json');
        if (configRes.ok) {
          const configs: MemberConfig[] = await configRes.json();
          const config = configs.find(c => c.id === id);
          setMemberConfig(config || { id, role: 'member' });
        } else {
          setMemberConfig({ id, role: 'member' });
        }

        // 加载角色数据
        const [infoRes, equipRes] = await Promise.all([
          fetch(`/data/${id}/character_info.json`),
          fetch(`/data/${id}/character_equipment.json`)
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
  }, [id]);

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
          <h2>未找到该成员</h2>
          <Link to="/legion" className="member-detail__back-btn">返回军团页面</Link>
        </div>
      </div>
    );
  }

  const profile = charInfo.profile;
  const stats = charInfo.stat.statList;
  const rankings = charInfo.ranking.rankingList.filter(r => r.rank !== null);
  const equipment = charEquip?.equipment.equipmentList || [];
  const skins = charEquip?.equipment.skinList || [];
  const skills = charEquip?.skill.skillList.filter(s => s.acquired === 1) || [];
  const pet = charEquip?.petwing.pet;
  const wing = charEquip?.petwing.wing;

  // 基础属性（前6个）
  const baseStats = stats.slice(0, 6);
  // 主要能力值（神力属性）
  const divineStats = stats.slice(6, -1);
  // 装备等级
  const itemLevel = stats.find(s => s.type === 'ItemLevel')?.value || 0;

  // 当前装备的称号（从 titleList 第一个获取，因为它通常是装备中的）
  const equippedTitle = charInfo.title.titleList?.[0];

  // 称号按分类分组
  const titlesByCategory = charInfo.title.titleList.reduce((acc, title) => {
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
  const gearEquipment = equipment.filter(e => !e.slotPosName.startsWith('Arcana'));
  const arcanaEquipment = equipment.filter(e => e.slotPosName.startsWith('Arcana'));

  // 技能分类
  const activeSkills = skills.filter(s => s.category === 'Active');
  const passiveSkills = skills.filter(s => s.category === 'Passive');
  const brandSkills = skills.filter(s => s.category === 'Dp'); // 烙印技能（原DP技能）

  const renderEquipItem = (item: EquipmentItem) => (
    <div
      key={`${item.slotPos}-${item.id}`}
      className="equip-card"
      style={{ '--grade-color': gradeColors[item.grade] || '#9d9d9d', cursor: 'pointer' } as React.CSSProperties}
      onMouseEnter={(e) => handleMouseEnter(e, item.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => handleClick(item.id)}
    >
      <img src={item.icon} alt={item.name} className="equip-card__icon" />
      <div className="equip-card__info">
        <span className="equip-card__name" style={{ color: gradeColors[item.grade] || '#9d9d9d' }}>
          {item.name}
        </span>
        <span className="equip-card__level">
          +{item.enchantLevel}
          {item.exceedLevel > 0 && <span className="equip-card__exceed">突破{item.exceedLevel}</span>}
        </span>
      </div>
    </div>
  );

  return (
    <div className="member-detail">
      {/* 顶部横幅 */}
      <div className="member-hero">
        <div className="member-hero__bg"></div>
        <div className="member-hero__content">
          <Link to="/legion" className="member-hero__back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回军团
          </Link>

          <div className="member-hero__profile">
            <div className="member-hero__avatar">
              <img src={profile.profileImage} alt={profile.characterName} />
              {memberConfig && (
                <span className={`member-hero__role member-hero__role--${memberConfig.role}`}>
                  {getRoleName(memberConfig.role)}
                </span>
              )}
            </div>
            <div className="member-hero__info">
              <h1 className="member-hero__name">
                {profile.characterName}
                {equippedTitle && (
                  <span className={`member-hero__title member-hero__title--${equippedTitle.grade.toLowerCase()}`}>
                    「{equippedTitle.name}」
                  </span>
                )}
              </h1>
              <div className="member-hero__meta">
                <span className="member-hero__class">
                  {classIcons[profile.className] || '✨'} {profile.className}
                </span>
                <span className="member-hero__level">Lv.{profile.characterLevel}</span>
                <span className="member-hero__server">{profile.raceName} · {profile.serverName}</span>
              </div>
            </div>
            <div className="member-hero__item-level">
              <span className="member-hero__il-label">装备等级</span>
              <span className="member-hero__il-value">{itemLevel}</span>
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
              <span className="member-tabs__icon">⚔️</span>
              装备
            </button>
            <button
              className={`member-tabs__btn ${activeTab === 'skills' ? 'member-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              <span className="member-tabs__icon">✨</span>
              技能
            </button>
          </div>

          {/* 装备面板 */}
          {activeTab === 'equipment' && (
            <div className="equipment-panel">
              {/* 主装备 */}
              <section className="equip-section">
                <h4 className="equip-section__title">
                  <span className="equip-section__icon">🗡️</span>
                  装备
                </h4>
                <div className="equip-section__grid">
                  {gearEquipment.map(renderEquipItem)}
                </div>
              </section>

              {/* 阿尔卡那 */}
              {arcanaEquipment.length > 0 && (
                <section className="equip-section">
                  <h4 className="equip-section__title">
                    <span className="equip-section__icon">🔮</span>
                    阿尔卡那
                  </h4>
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
                    <div className="ranking-item__left">
                      {rank.gradeIcon && (
                        <img src={rank.gradeIcon} alt={rank.gradeName || ''} className="ranking-item__icon" />
                      )}
                      <div className="ranking-item__info">
                        <span className="ranking-item__name">{rank.rankingContentsName}</span>
                        <span className="ranking-item__grade">{rank.gradeName}</span>
                      </div>
                    </div>
                    <div className="ranking-item__rank">
                      #{rank.rank?.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 称号 */}
          {charInfo.title.titleList.length > 0 && (
            <div className="title-panel">
              <h3 className="title-panel__header">
                <span className="title-panel__title">称号</span>
                <span className="title-panel__count">{charInfo.title.ownedCount}/{charInfo.title.totalCount}</span>
              </h3>
              <div className="title-panel__categories">
                {['Attack', 'Defense', 'Etc'].map((category) => {
                  const title = titlesByCategory[category]?.[0];
                  if (!title) return null;
                  return (
                    <div key={category} className="title-category">
                      <div className="title-category__header">
                        <span className="title-category__name">{titleCategoryNames[category]}</span>
                        <span className="title-category__progress">{title.ownedCount}/{title.totalCount}</span>
                      </div>
                      <div className={`title-category__card title-category__card--${title.grade.toLowerCase()}`}>
                        <span className="title-category__title-name">{title.name}</span>
                        <div className="title-category__stats">
                          {title.equipStatList.map((stat, i) => (
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
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default MemberDetailPage;
